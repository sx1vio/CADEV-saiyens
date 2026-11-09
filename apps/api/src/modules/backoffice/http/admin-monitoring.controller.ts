import { monitorEventLoopDelay } from 'node:perf_hooks';
import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { AdminMonitoringView } from '@devhub/contracts';
import { ENV } from '../../../infrastructure/config/config.module';
import type { Env } from '../../../infrastructure/config/env';
import { httpMetrics } from '../../../infrastructure/http/http-metrics';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { AdminSessionGuard } from './admin-session.guard';

const DAY = 24 * 60 * 60 * 1000;
/** Le worker relance son planificateur toutes les 30 s environ ; 3 min sans signe = arrêté. */
const WORKER_SILENCE_MS = 3 * 60 * 1000;

// Retard de la boucle d'événements, mesuré en continu (résolution 20 ms).
const loopDelay = monitorEventLoopDelay({ resolution: 20 });
loopDelay.enable();

const mb = (bytes: number) => Math.round((bytes / 1024 / 1024) * 10) / 10;
const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

type Config = AdminMonitoringView['config'][number];

/** Réglages de production : on dit seulement s'ils sont présents, jamais leur valeur. */
export function configChecks(env: Env): Config[] {
  const prod = env.NODE_ENV === 'production';
  const has = (v: unknown) => v !== undefined && v !== null && v !== '';
  const item = (key: string, label: string, ok: boolean, hint: string, danger = false): Config => ({
    key,
    label,
    state: ok ? 'ok' : danger ? 'danger' : 'missing',
    hint,
  });
  return [
    item(
      'AUTH_FAKE_PROVIDER',
      'Connexion de test désactivée',
      !env.AUTH_FAKE_PROVIDER,
      'Le faux fournisseur GitHub ne doit jamais être actif en ligne.',
      true,
    ),
    item(
      'GITHUB_CLIENT_ID',
      'Connexion GitHub (OAuth)',
      has(env.GITHUB_CLIENT_ID) && has(env.GITHUB_CLIENT_SECRET),
      'Application OAuth GitHub de production : GITHUB_CLIENT_ID et GITHUB_CLIENT_SECRET.',
      prod,
    ),
    item(
      'SMTP_HOST',
      'E-mails (SMTP)',
      has(env.SMTP_HOST),
      'Récapitulatifs, notifications et messages des entreprises.',
    ),
    item(
      'LLM_API_KEY',
      'Piste IA',
      has(env.LLM_API_KEY),
      'Sans clé, la piste IA et la traduction utilisent le modèle de secours.',
    ),
    item(
      'PAGESPEED_API_KEY',
      'Lighthouse du pré-vol',
      has(env.PAGESPEED_API_KEY),
      'Clé PageSpeed Insights : sans elle, le pré-vol saute la mesure Lighthouse.',
    ),
    item(
      'PREFLIGHT_GITHUB_TOKEN',
      'Analyse des dépôts du pré-vol',
      has(env.PREFLIGHT_GITHUB_TOKEN),
      'Jeton GitHub en lecture seule : plus de dépôts analysés par heure.',
    ),
    item(
      'BACKUP_STATUS_URL',
      'Suivi des sauvegardes',
      has(env.BACKUP_STATUS_URL),
      'Fichier d’état écrit par infra/scripts/backup.sh.',
    ),
    item(
      'BUSINESS_URL',
      'Portail entreprise',
      has(env.BUSINESS_URL),
      'Adresse du portail des recruteurs (sous-domaine business.).',
    ),
    item(
      'ADMIN_ALLOWED_IPS',
      'Administration limitée à des IP',
      env.ADMIN_ALLOWED_IPS.length > 0,
      'Facultatif : plages CIDR autorisées à ouvrir l’administration.',
    ),
  ];
}

// Supervision technique pour l'administration : API, base, worker, services, réglages, accès.
@ApiExcludeController()
@Controller('api/v1/admin')
@UseGuards(AdminSessionGuard)
export class AdminMonitoringController {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
  ) {}

  private async database(): Promise<AdminMonitoringView['database']> {
    const start = process.hrtime.bigint();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const latencyMs = Number((process.hrtime.bigint() - start) / 1_000_000n);
      const [size, conns, migrations, tables] = await Promise.all([
        this.prisma.$queryRaw<{ bytes: bigint }[]>`
          SELECT pg_database_size(current_database()) AS bytes`,
        this.prisma.$queryRaw<{ n: bigint }[]>`
          SELECT count(*) AS n FROM pg_stat_activity WHERE datname = current_database()`,
        this.prisma.$queryRaw<{ n: bigint; last: string | null }[]>`
          SELECT count(*) AS n,
                 (SELECT migration_name FROM _prisma_migrations
                   WHERE finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1) AS last
            FROM _prisma_migrations WHERE finished_at IS NOT NULL`,
        this.prisma.$queryRaw<{ table: string; rows: bigint }[]>`
          SELECT relname AS "table", n_live_tup AS rows FROM pg_stat_user_tables
           WHERE schemaname = 'public' ORDER BY n_live_tup DESC LIMIT 8`,
      ]);
      return {
        ok: true,
        latencyMs,
        sizeMb: mb(Number(size[0]?.bytes ?? 0)),
        connections: Number(conns[0]?.n ?? 0),
        migrations: Number(migrations[0]?.n ?? 0),
        lastMigration: migrations[0]?.last ?? null,
        largestTables: tables.map((t) => ({ table: t.table, rows: Number(t.rows) })),
      };
    } catch {
      return {
        ok: false,
        latencyMs: null,
        sizeMb: null,
        connections: null,
        migrations: null,
        lastMigration: null,
        largestTables: [],
      };
    }
  }

  /** File pg-boss : le worker est vivant si son planificateur a tourné récemment. */
  private async worker(now: Date): Promise<AdminMonitoringView['worker']> {
    try {
      const since = new Date(now.getTime() - DAY);
      const [beat, counts, last, schedules, failures] = await Promise.all([
        this.prisma.$queryRaw<
          { at: Date | null }[]
        >`SELECT cron_on AS at FROM pgboss.version LIMIT 1`,
        this.prisma.$queryRaw<{ name: string; state: string; n: bigint }[]>`
          SELECT name, state::text AS state, count(*) AS n FROM pgboss.job
           WHERE left(name, 2) <> '__' AND (state IN ('created', 'retry', 'active') OR created_on >= ${since})
           GROUP BY name, state`,
        this.prisma.$queryRaw<{ name: string; at: Date }[]>`
          SELECT name, max(completed_on) AS at FROM pgboss.job
           WHERE state = 'completed' AND left(name, 2) <> '__' GROUP BY name`,
        this.prisma.$queryRaw<
          { name: string; cron: string }[]
        >`SELECT name, cron FROM pgboss.schedule`,
        this.prisma.$queryRaw<{ name: string; at: Date | null; output: unknown }[]>`
          SELECT name, completed_on AS at, output FROM pgboss.job
           WHERE state = 'failed' AND left(name, 2) <> '__'
           ORDER BY completed_on DESC NULLS LAST LIMIT 10`,
      ]);
      const lastBeat = beat[0]?.at ?? null;
      const names = new Set([
        ...counts.map((c) => c.name),
        ...last.map((l) => l.name),
        ...schedules.map((s) => s.name),
      ]);
      const count = (name: string, states: string[]) =>
        counts
          .filter((c) => c.name === name && states.includes(c.state))
          .reduce((n, c) => n + Number(c.n), 0);
      const message = (output: unknown) => {
        if (output && typeof output === 'object' && 'message' in output)
          return String((output as { message: unknown }).message).slice(0, 300);
        return output ? JSON.stringify(output).slice(0, 300) : 'Échec sans message';
      };
      return {
        alive: !!lastBeat && now.getTime() - lastBeat.getTime() < WORKER_SILENCE_MS,
        lastBeatAt: iso(lastBeat),
        queues: [...names].sort().map((name) => ({
          name,
          cron: schedules.find((s) => s.name === name)?.cron ?? null,
          waiting: count(name, ['created', 'retry']),
          active: count(name, ['active']),
          completed24h: count(name, ['completed']),
          failed24h: count(name, ['failed']),
          lastCompletedAt: iso(last.find((l) => l.name === name)?.at),
        })),
        recentFailures: failures.map((f) => ({
          queue: f.name,
          at: iso(f.at),
          message: message(f.output),
        })),
      };
    } catch {
      // Schéma pg-boss absent (base neuve) : pas de worker démarré.
      return { alive: false, lastBeatAt: null, queues: [], recentFailures: [] };
    }
  }

  @Get('monitoring')
  async monitoring(): Promise<AdminMonitoringView> {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - DAY);
    const [database, worker, services, security] = await Promise.all([
      this.database(),
      this.worker(now),
      // Dernier résultat de chaque sonde Systalink (job status.check, toutes les 5 min).
      this.prisma.$queryRaw<
        {
          service: string;
          ok: boolean;
          latency_ms: number | null;
          checked_at: Date;
          detail: { configured?: boolean } | null;
        }[]
      >`SELECT DISTINCT ON (service) service, ok, latency_ms, checked_at, detail FROM status_checks
         ORDER BY service, checked_at DESC`,
      Promise.all([
        this.prisma.adminSession.count({ where: { expiresAt: { gt: now } } }),
        this.prisma.adminAction.count({
          where: { action: 'admin_sign_in', createdAt: { gte: dayAgo } },
        }),
        this.prisma.session.count({
          where: { lastUsedAt: { gte: dayAgo }, expiresAt: { gt: now } },
        }),
        this.prisma.user.count({ where: { suspendedAt: { not: null }, deletedAt: null } }),
        this.prisma.report.count({ where: { status: 'open' } }),
      ]),
    ]);
    const memory = process.memoryUsage();
    const delay = loopDelay.percentile(99) / 1e6;
    loopDelay.reset();
    const snapshot = httpMetrics.snapshot(now.getTime());
    return {
      checkedAt: now.toISOString(),
      api: {
        startedAt: httpMetrics.startedAt.toISOString(),
        uptimeSeconds: Math.round(process.uptime()),
        nodeVersion: process.version,
        environment: this.env.NODE_ENV,
        release: this.env.APP_RELEASE ?? null,
        memoryMb: { rss: mb(memory.rss), heapUsed: mb(memory.heapUsed) },
        eventLoopDelayMs: Number.isFinite(delay) && delay > 0 ? Math.round(delay * 10) / 10 : null,
      },
      http: snapshot,
      database,
      worker,
      services: services.map((s) => ({
        service: s.service,
        ok: s.ok,
        configured: s.detail?.configured !== false,
        latencyMs: s.latency_ms,
        checkedAt: s.checked_at.toISOString(),
      })),
      config: configChecks(this.env),
      security: {
        activeAdminSessions: security[0],
        adminSignIns24h: security[1],
        memberSessions24h: security[2],
        suspendedUsers: security[3],
        openReports: security[4],
      },
    };
  }
}
