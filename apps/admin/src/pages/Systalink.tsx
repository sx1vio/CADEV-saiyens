import type { AdminSystalinkView } from '@devhub/contracts';
import { ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SITE_URL, api } from '../api';
import { Badge, Empty, PageHeader } from '../ui/kit';

const TARGET: Record<string, string> = {
  deploy: 'Serverless',
  orion: 'Orion (site créé par IA)',
  server: 'Serveur cloud',
};
const SOURCE: Record<string, string> = {
  room: 'Salle de projet',
  templates: 'Templates (ancien)',
  build: 'Guide IA (ancien)',
  systalink: 'Page Systalink',
  help: 'Aide Systalink',
};

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <p className="text-[13px] text-muted">{label}</p>
      <p className="mt-1 text-[26px] font-bold tabular-nums">
        {typeof value === 'number' ? value.toLocaleString('fr-FR') : value}
      </p>
      {hint && <p className="text-[12px] text-muted">{hint}</p>}
    </div>
  );
}

/**
 * Ce que DevHub apporte à Systalink (idées A, B, C et pré-vol), à montrer au partenaire :
 * uniquement des mesures réelles, rien d'estimé.
 */
export function Systalink({ onError }: { onError: (e: unknown) => void }) {
  const [data, setData] = useState<AdminSystalinkView | null>(null);
  useEffect(() => {
    api.systalink().then(setData, onError);
  }, [onError]);
  if (!data) return <p className="text-[14px] text-muted">Chargement…</p>;
  const max = Math.max(1, ...data.referrals.days.map((d) => d.n));
  return (
    <section>
      <PageHeader title="Systalink">
        Ce que DevHub apporte à Systalink, mesuré : clics vers ses offres, applications vérifiées en
        production sur son réseau, pré-vols et disponibilité.
      </PageHeader>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label="Clics « Déployer sur Systalink »"
          value={data.referrals.total}
          hint={`${data.referrals.last30d} sur 30 jours`}
        />
        <Stat
          label="Applications en production chez Systalink"
          value={data.deployments.onSystalink}
          hint={`${data.deployments.verified} déploiements vérifiés au total`}
        />
        <Stat
          label="Disponibilité mesurée"
          value={data.deployments.uptime === null ? '—' : `${data.deployments.uptime} %`}
          hint="vérifiée toutes les 30 min"
        />
        <Stat
          label="Pré-vols"
          value={data.preflight.reports}
          hint={`${data.preflight.onSystalink} site${data.preflight.onSystalink > 1 ? 's' : ''} déjà chez Systalink · ${data.preflight.last30d} sur 30 jours`}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-xl border border-line bg-panel p-4">
          <p className="text-[14px] font-semibold">Clics vers Systalink, 30 derniers jours</p>
          <div className="mt-4 flex h-32 items-end gap-1" role="img" aria-label="Clics par jour">
            {data.referrals.days.map((d) => (
              <div
                key={d.date}
                title={`${d.date} : ${d.n}`}
                className="flex-1 rounded-t bg-brand"
                style={{ height: `${Math.max(2, (d.n / max) * 100)}%`, opacity: d.n ? 1 : 0.2 }}
              />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-muted">
            <span>{data.referrals.days[0]?.date}</span>
            <span>{data.referrals.days.at(-1)?.date}</span>
          </div>
        </div>
        <div className="rounded-xl border border-line bg-panel p-4 text-[14px]">
          <p className="font-semibold">Offres visées</p>
          <ul className="mt-2 flex flex-col gap-1">
            {data.referrals.byTarget.map((t) => (
              <li key={t.key} className="flex justify-between">
                <span>{TARGET[t.key] ?? t.key}</span>
                <b className="tabular-nums">{t.n}</b>
              </li>
            ))}
            {!data.referrals.byTarget.length && <li className="text-muted">Aucun clic.</li>}
          </ul>
          <p className="mt-4 font-semibold">D’où viennent les clics</p>
          <ul className="mt-2 flex flex-col gap-1">
            {data.referrals.bySource.map((t) => (
              <li key={t.key} className="flex justify-between">
                <span>{SOURCE[t.key] ?? t.key}</span>
                <b className="tabular-nums">{t.n}</b>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Demandes au Banc d’essai" value={data.bench.requests} />
        <Stat label="Rapports de test" value={data.bench.reports} />
        <Stat label="Rapports confirmés" value={data.bench.confirmed} />
        <Stat label="Certificats délivrés" value={data.certificates} />
      </div>

      <h2 className="mt-8 text-[16px] font-semibold">Applications vérifiées en production</h2>
      {data.deployments.items.length === 0 ? (
        <Empty>Aucune application vérifiée pour l’instant.</Empty>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-panel">
          <table className="w-full text-left text-[14px]">
            <thead className="text-[12px] text-muted">
              <tr>
                <th className="px-4 py-2">Projet</th>
                <th className="px-4 py-2">Hébergement</th>
                <th className="px-4 py-2">Dernière mesure</th>
                <th className="px-4 py-2">Disponibilité</th>
              </tr>
            </thead>
            <tbody>
              {data.deployments.items.map((d) => (
                <tr key={d.code} className="border-t border-line">
                  <td className="px-4 py-2">
                    <a
                      href={`${SITE_URL}/p/${d.code}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-semibold hover:underline"
                    >
                      {d.room}
                      <ExternalLink className="size-3.5" />
                    </a>
                    <p className="text-[12px] text-muted">{d.url}</p>
                  </td>
                  <td className="px-4 py-2">
                    {d.hostedOnSystalink ? (
                      <Badge tone="good">Systalink</Badge>
                    ) : (
                      <Badge>Ailleurs</Badge>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {d.lastUp === null ? (
                      '—'
                    ) : d.lastUp ? (
                      <Badge tone="good">En ligne · {d.lastLatencyMs} ms</Badge>
                    ) : (
                      <Badge tone="bad">Hors ligne</Badge>
                    )}
                  </td>
                  <td className="px-4 py-2 tabular-nums">
                    {d.uptime === null ? '—' : `${d.uptime} %`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
