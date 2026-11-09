import type { AdminMonitoringView } from '@devhub/contracts';
import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { api } from '../api';
import { Badge, Empty, PageHeader, ago, when } from '../ui/kit';

const REFRESH_MS = 15_000;

const QUEUE_LABEL: Record<string, string> = {
  'news.ingest': 'Actualités et vidéos',
  'news.ingest-github': 'Dépôts GitHub',
  'news.ingest-jobs': 'Offres à distance',
  'news.ingest-certs': 'Certifications officielles',
  'news.ingest-skills': 'Skills et plugins IA',
  'rooms.deployment-check': 'Disponibilité des apps déployées',
  'status.check': 'Sondes des services',
  'notifications.email': 'E-mails de notification',
  'github.import-profile': 'Import des profils GitHub',
};
const SERVICE_LABEL: Record<string, string> = {
  vps: 'Serveur (VPS)',
  database: 'Base de données',
  backup: 'Sauvegarde',
  mail: 'E-mail',
  object_storage: 'Stockage d’objets',
};

const duration = (s: number) => {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d ? `${d} j ${h} h` : h ? `${h} h ${m} min` : `${m} min`;
};
const ms = (v: number | null) => (v === null ? '—' : `${Math.round(v)} ms`);
const n = (v: number | null) => (v === null ? '—' : v.toLocaleString('fr-FR'));

function Card({
  title,
  state,
  children,
}: {
  title: string;
  state?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-panel p-4">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {state}
      </header>
      {children}
    </section>
  );
}

function Rows({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[14px]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted">{k}</dt>
          <dd className="text-right font-medium tabular-nums">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Supervision technique : l'API, la base, le worker, les services et les réglages de production. */
export function Monitoring({ onError }: { onError: (e: unknown) => void }) {
  const [data, setData] = useState<AdminMonitoringView | null>(null);
  const [loading, setLoading] = useState(false);
  const load = useCallback(() => {
    setLoading(true);
    api
      .monitoring()
      .then(setData, onError)
      .finally(() => setLoading(false));
  }, [onError]);

  useEffect(() => {
    load();
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  if (!data) return <p className="text-[14px] text-muted">Chargement…</p>;
  const { api: a, http, database: db, worker, config, security } = data;
  const errorRate = http.lastHour.requests
    ? (http.lastHour.serverErrors / http.lastHour.requests) * 100
    : 0;
  const problems =
    (db.ok ? 0 : 1) +
    (worker.alive ? 0 : 1) +
    data.services.filter((s) => !s.ok && s.configured).length +
    config.filter((c) => c.state === 'danger').length +
    (errorRate >= 1 ? 1 : 0);

  return (
    <section>
      <PageHeader title="Supervision">
        Santé technique de la plateforme, actualisée toutes les 15 secondes : API, base de données,
        tâches de fond, services et réglages de production.
      </PageHeader>

      <div
        className={`mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 text-[14px] ${
          problems ? 'bg-bad-soft text-bad' : 'bg-good-soft text-good'
        }`}
        role="status"
      >
        <span className="font-semibold">
          {problems
            ? `${problems} point${problems > 1 ? 's' : ''} à regarder`
            : 'Tout fonctionne normalement'}
        </span>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink"
        >
          <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          Vérifié {ago(data.checkedAt)}
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Card title="API" state={<Badge tone="good">En ligne</Badge>}>
          <Rows
            rows={[
              ['Démarrée', `il y a ${duration(a.uptimeSeconds)}`],
              ['Version', a.release ? a.release.slice(0, 12) : 'non renseignée'],
              ['Environnement', a.environment],
              ['Node.js', a.nodeVersion],
              ['Mémoire', `${a.memoryMb.rss} Mo (tas ${a.memoryMb.heapUsed} Mo)`],
              ['Retard de la boucle (p99)', ms(a.eventLoopDelayMs)],
            ]}
          />
        </Card>

        <Card
          title="Trafic HTTP"
          state={
            <Badge tone={errorRate >= 1 ? 'bad' : http.lastHour.serverErrors ? 'warn' : 'good'}>
              {errorRate.toFixed(errorRate < 1 ? 2 : 1)} % d’erreurs
            </Badge>
          }
        >
          <Rows
            rows={[
              ['Requêtes (5 min)', n(http.last5m.requests)],
              ['Requêtes (1 h)', n(http.lastHour.requests)],
              ['Erreurs serveur (1 h)', n(http.lastHour.serverErrors)],
              ['Refus et introuvables (1 h)', n(http.lastHour.clientErrors)],
              ['Latence médiane', ms(http.lastHour.p50Ms)],
              ['Latence p95', ms(http.lastHour.p95Ms)],
            ]}
          />
          <p className="mt-3 text-[12px] text-muted">
            Compté depuis le dernier démarrage de l’API ({when(a.startedAt)}).
          </p>
        </Card>

        <Card
          title="Base de données"
          state={<Badge tone={db.ok ? 'good' : 'bad'}>{db.ok ? 'Répond' : 'Injoignable'}</Badge>}
        >
          <Rows
            rows={[
              ['Temps de réponse', ms(db.latencyMs)],
              ['Taille', db.sizeMb === null ? '—' : `${db.sizeMb} Mo`],
              ['Connexions ouvertes', n(db.connections)],
              ['Migrations appliquées', n(db.migrations)],
              ['Dernière migration', db.lastMigration?.replace(/^\d{14}_/, '') ?? '—'],
            ]}
          />
          {db.largestTables.length > 0 && (
            <details className="mt-3 text-[13px]">
              <summary className="cursor-pointer text-muted">Tables les plus remplies</summary>
              <ul className="mt-2 space-y-1">
                {db.largestTables.map((t) => (
                  <li key={t.table} className="flex justify-between font-mono text-[12px]">
                    <span>{t.table}</span>
                    <span className="tabular-nums">{n(t.rows)}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </Card>

        <Card
          title="Services Systalink"
          state={
            data.services.length ? (
              <Badge tone={data.services.every((s) => s.ok || !s.configured) ? 'good' : 'bad'}>
                {data.services.filter((s) => s.ok).length}/{data.services.length} en forme
              </Badge>
            ) : undefined
          }
        >
          {data.services.length ? (
            <ul className="space-y-2 text-[14px]">
              {data.services.map((s) => (
                <li key={s.service} className="flex items-center justify-between gap-2">
                  <span>{SERVICE_LABEL[s.service] ?? s.service}</span>
                  <span className="flex items-center gap-2 text-[13px] text-muted">
                    {ms(s.latencyMs)} · {ago(s.checkedAt)}
                    <Badge tone={s.ok ? 'good' : s.configured ? 'bad' : 'muted'}>
                      {s.ok ? 'OK' : s.configured ? 'En panne' : 'Non configuré'}
                    </Badge>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[14px] text-muted">
              Aucune sonde encore : le worker les lance toutes les 5 minutes.
            </p>
          )}
        </Card>

        <Card
          title="Accès et sécurité"
          state={
            security.openReports ? (
              <Badge tone="warn">{security.openReports} signalement(s)</Badge>
            ) : undefined
          }
        >
          <Rows
            rows={[
              ['Sessions admin actives', n(security.activeAdminSessions)],
              ['Connexions admin (24 h)', n(security.adminSignIns24h)],
              ['Membres actifs (24 h)', n(security.memberSessions24h)],
              ['Comptes suspendus', n(security.suspendedUsers)],
              ['Signalements ouverts', n(security.openReports)],
            ]}
          />
        </Card>

        <Card
          title="Réglages de production"
          state={
            <Badge
              tone={
                config.some((c) => c.state === 'danger')
                  ? 'bad'
                  : config.some((c) => c.state === 'missing')
                    ? 'warn'
                    : 'good'
              }
            >
              {config.filter((c) => c.state === 'ok').length}/{config.length}
            </Badge>
          }
        >
          <ul className="space-y-2">
            {config.map((c) => (
              <li key={c.key} className="text-[14px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{c.label}</span>
                  <Badge tone={c.state === 'ok' ? 'good' : c.state === 'danger' ? 'bad' : 'muted'}>
                    {c.state === 'ok' ? 'OK' : c.state === 'danger' ? 'À corriger' : 'Absent'}
                  </Badge>
                </div>
                {c.state !== 'ok' && <p className="text-[12px] text-muted">{c.hint}</p>}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card
          title="Tâches de fond (worker)"
          state={
            <Badge tone={worker.alive ? 'good' : 'bad'}>
              {worker.alive
                ? 'Actif'
                : worker.lastBeatAt
                  ? `Arrêté (${ago(worker.lastBeatAt)})`
                  : 'Jamais démarré'}
            </Badge>
          }
        >
          {worker.queues.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="text-muted">
                  <tr>
                    <th className="py-1.5 pr-3 font-medium">Tâche</th>
                    <th className="py-1.5 pr-3 text-right font-medium">En attente</th>
                    <th className="py-1.5 pr-3 text-right font-medium">Faites (24 h)</th>
                    <th className="py-1.5 pr-3 text-right font-medium">Échecs (24 h)</th>
                    <th className="py-1.5 font-medium">Dernier passage</th>
                  </tr>
                </thead>
                <tbody>
                  {worker.queues.map((q) => (
                    <tr key={q.name} className="border-t border-line">
                      <td className="py-1.5 pr-3">
                        {QUEUE_LABEL[q.name] ?? q.name}
                        {q.cron && (
                          <span className="block font-mono text-[11px] text-muted">{q.cron}</span>
                        )}
                      </td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">
                        {q.waiting + q.active}
                      </td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{q.completed24h}</td>
                      <td
                        className={`py-1.5 pr-3 text-right tabular-nums ${q.failed24h ? 'font-semibold text-bad' : ''}`}
                      >
                        {q.failed24h}
                      </td>
                      <td className="py-1.5 text-muted">
                        {q.lastCompletedAt ? ago(q.lastCompletedAt) : 'jamais'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>Aucune tâche enregistrée : le worker n’a pas encore démarré.</Empty>
          )}
          {worker.recentFailures.length > 0 && (
            <details className="mt-3 text-[13px]">
              <summary className="cursor-pointer text-muted">
                Derniers échecs ({worker.recentFailures.length})
              </summary>
              <ul className="mt-2 space-y-2">
                {worker.recentFailures.map((f, i) => (
                  <li key={i} className="rounded-lg bg-page p-2">
                    <p className="font-medium">
                      {QUEUE_LABEL[f.queue] ?? f.queue}
                      <span className="ml-2 font-normal text-muted">{f.at ? ago(f.at) : ''}</span>
                    </p>
                    <p className="font-mono text-[12px] break-words text-muted">{f.message}</p>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </Card>

        <Card
          title="Dernières erreurs serveur"
          state={
            <Badge tone={http.recentErrors.length ? 'bad' : 'good'}>
              {http.recentErrors.length ? `${http.recentErrors.length}` : 'Aucune'}
            </Badge>
          }
        >
          {http.recentErrors.length ? (
            <ul className="space-y-2 text-[13px]">
              {http.recentErrors.map((e, i) => (
                <li key={i} className="rounded-lg bg-page p-2">
                  <p className="font-mono text-[12px]">
                    {e.method} {e.path}
                  </p>
                  <p className="break-words">{e.message}</p>
                  <p className="text-[12px] text-muted">
                    {ago(e.at)}
                    {e.requestId && ` · ${e.requestId}`}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[14px] text-muted">
              Aucune erreur 500 depuis le démarrage de l’API.
            </p>
          )}
          {http.slowestRoutes.length > 0 && (
            <details className="mt-3 text-[13px]">
              <summary className="cursor-pointer text-muted">Routes les plus lentes (1 h)</summary>
              <ul className="mt-2 space-y-1">
                {http.slowestRoutes.map((r) => (
                  <li key={r.route} className="flex justify-between gap-3">
                    <span className="truncate font-mono text-[12px]">{r.route}</span>
                    <span className="shrink-0 tabular-nums text-muted">
                      p95 {ms(r.p95Ms)} · {r.requests} req.
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </Card>
      </div>
    </section>
  );
}
