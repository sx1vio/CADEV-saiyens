import { readFile } from 'node:fs/promises';
import { connect } from 'node:net';
import { Inject, Injectable } from '@nestjs/common';
import { ENV } from '../../../infrastructure/config/config.module';
import type { Env } from '../../../infrastructure/config/env';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { Probe } from '../domain/ports';
import { type ProbeResult, backupIsFresh } from '../domain/status';

// Sondes réelles des services Systalink (Y1). Chacune a 5 s au plus et ne lève jamais.
const TIMEOUT_MS = 5_000;

const elapsed = (start: bigint) => Number((process.hrtime.bigint() - start) / 1_000_000n);
const failure = (service: ProbeResult['service'], err: unknown): ProbeResult => ({
  service,
  ok: false,
  latencyMs: null,
  detail: { error: err instanceof Error ? err.message : String(err) },
});

/** VPS : l'API répond derrière Caddy, à son adresse publique. */
@Injectable()
export class VpsProbe implements Probe {
  readonly service = 'vps' as const;
  constructor(@Inject(ENV) private readonly env: Env) {}

  async probe(): Promise<ProbeResult> {
    const start = process.hrtime.bigint();
    try {
      const res = await fetch(new URL('/api/v1/healthz', this.env.API_URL), {
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      return { service: this.service, ok: res.ok, latencyMs: elapsed(start), detail: null };
    } catch (err) {
      return failure(this.service, err);
    }
  }
}

/** Base de données Systalink : aller-retour d'une requête minimale. */
@Injectable()
export class DatabaseProbe implements Probe {
  readonly service = 'database' as const;
  constructor(private readonly prisma: PrismaService) {}

  async probe(): Promise<ProbeResult> {
    const start = process.hrtime.bigint();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { service: this.service, ok: true, latencyMs: elapsed(start), detail: null };
    } catch (err) {
      return failure(this.service, err);
    }
  }
}

/** Sauvegarde cloud : fichier d'état écrit par infra/scripts/backup.sh (ou URL qui le sert). */
@Injectable()
export class BackupProbe implements Probe {
  readonly service = 'backup' as const;
  constructor(@Inject(ENV) private readonly env: Env) {}

  async probe(): Promise<ProbeResult> {
    const source = this.env.BACKUP_STATUS_URL;
    if (!source)
      return { service: this.service, ok: false, latencyMs: null, detail: { configured: false } };
    const start = process.hrtime.bigint();
    try {
      const raw = /^https?:\/\//.test(source)
        ? await (await fetch(source, { signal: AbortSignal.timeout(TIMEOUT_MS) })).text()
        : await readFile(source, 'utf8');
      const { lastBackupAt } = JSON.parse(raw) as { lastBackupAt?: unknown };
      const at = typeof lastBackupAt === 'string' ? lastBackupAt : undefined;
      return {
        service: this.service,
        ok: backupIsFresh(at, new Date()),
        latencyMs: elapsed(start),
        detail: at ? { lastBackupAt: at } : { error: 'lastBackupAt absent' },
      };
    } catch (err) {
      return failure(this.service, err);
    }
  }
}

/** Messagerie pro : le serveur SMTP accepte une connexion TCP. */
@Injectable()
export class MailProbe implements Probe {
  readonly service = 'mail' as const;
  constructor(@Inject(ENV) private readonly env: Env) {}

  async probe(): Promise<ProbeResult> {
    const host = this.env.SMTP_HOST;
    if (!host)
      return { service: this.service, ok: false, latencyMs: null, detail: { configured: false } };
    const start = process.hrtime.bigint();
    try {
      await new Promise<void>((resolve, reject) => {
        const socket = connect({ host, port: this.env.SMTP_PORT, timeout: TIMEOUT_MS });
        socket.once('connect', () => {
          socket.destroy();
          resolve();
        });
        socket.once('timeout', () => {
          socket.destroy();
          reject(new Error('délai SMTP dépassé'));
        });
        socket.on('error', reject); // après resolve, une erreur tardive est ignorée
      });
      return { service: this.service, ok: true, latencyMs: elapsed(start), detail: null };
    } catch (err) {
      return failure(this.service, err);
    }
  }
}
