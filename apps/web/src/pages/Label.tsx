import type { PreflightLabel } from '@devhub/contracts';
import { BadgeCheck, Clock, ExternalLink, FileSearch, ShieldAlert } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { ButtonLink } from '@/components/ui/button';
import { Avatar, Skeleton } from '@/components/ui/primitives';
import { useQuery } from '@/lib/query';
import { cn } from '@/lib/utils';
import { labelsApi } from '@/platform/labels-api';
import { Page } from './_layout';

/* Label « DevHub Ready » : page publique d'un domaine (lien du badge dans un README). */

const STATUS: Record<
  PreflightLabel['status'],
  { title: (d: string) => string; text: string; tone: string; icon: typeof BadgeCheck }
> = {
  ready: {
    title: (d) => `${d} est DevHub Ready`,
    text: 'Le dernier pré-vol de son propriétaire rend un verdict de recette GO : sécurité, accessibilité, performance en 3G, réseau et vie privée vérifiés de l’extérieur.',
    tone: 'bg-success text-white',
    icon: BadgeCheck,
  },
  expired: {
    title: (d) => `Label de ${d} expiré`,
    text: 'Le dernier pré-vol GO date de plus de 30 jours. Le label revient dès que le propriétaire relance un pré-vol qui passe.',
    tone: 'bg-surface-3 text-muted',
    icon: Clock,
  },
  not_ready: {
    title: (d) => `${d} n’est pas encore DevHub Ready`,
    text: 'Le dernier pré-vol relève des points à corriger avant la mise en production. Le propriétaire a reçu les correctifs dans son rapport.',
    tone: 'bg-warning-soft text-warning',
    icon: ShieldAlert,
  },
};

const fmt = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { dateStyle: 'long' });

export default function Label() {
  const { domain = '' } = useParams();
  const { data, error } = useQuery(`labels:${domain}`, () => labelsApi.get(domain));

  return (
    <Page className="max-w-[720px]">
      <p className="text-[14px] font-medium text-muted">Label DevHub Ready</p>
      {error ? (
        <div className="surface-card mt-4 flex flex-col items-center gap-3 p-8 text-center">
          <FileSearch className="size-8 text-muted" />
          <h1 className="text-[22px] font-bold text-fg">Aucun label pour {domain}</h1>
          <p className="max-w-md text-[14px] text-muted">
            Ce domaine n’a pas encore été vérifié par son propriétaire. Le label se gagne au pré-vol
            : sécurité, accessibilité, chargement en 3G et vie privée, vérifiés de l’extérieur.
          </p>
          <ButtonLink to="/prevol" variant="primary">
            Lancer un pré-vol
          </ButtonLink>
        </div>
      ) : !data ? (
        <Skeleton className="mt-4 h-80 rounded-[14px]" />
      ) : (
        <LabelView label={data} />
      )}
    </Page>
  );
}

function LabelView({ label }: { label: PreflightLabel }) {
  const s = STATUS[label.status];
  const Icon = s.icon;
  return (
    <div className="surface-card mt-4 overflow-hidden">
      <div className="flex flex-col items-center gap-3 px-6 pt-8 pb-6 text-center">
        <span
          className={cn('grid size-20 place-items-center rounded-full [&_svg]:size-10', s.tone)}
        >
          <Icon />
        </span>
        <h1 className="text-[24px] leading-tight font-bold text-fg">{s.title(label.domain)}</h1>
        <p className="max-w-lg text-[14.5px] text-muted">{s.text}</p>
        <img
          src={labelsApi.badgeUrl(label.domain)}
          alt={`Badge DevHub : ${label.domain}`}
          className="mt-1 h-5"
        />
        <a
          href={`https://${label.domain}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-[14px] font-medium text-blue-text hover:underline [&_svg]:size-3.5"
        >
          {label.domain} <ExternalLink />
        </a>
      </div>

      <dl className="grid grid-cols-2 gap-px border-y border-line bg-line sm:grid-cols-4">
        {[
          ['Score de recette', `${label.recetteScore}/100`],
          ['Score du pré-vol', `${label.score}/100`],
          ['Vérifié le', fmt(label.checkedAt)],
          [
            label.status === 'ready' ? 'Valable jusqu’au' : 'Depuis',
            label.status === 'ready' && label.expiresAt
              ? fmt(label.expiresAt)
              : label.readySince
                ? fmt(label.readySince)
                : '–',
          ],
        ].map(([k, v]) => (
          <div key={k} className="bg-surface-1 px-4 py-3">
            <dt className="text-[12.5px] text-muted">{k}</dt>
            <dd className="mt-0.5 text-[16px] font-semibold tabular text-fg">{v}</dd>
          </div>
        ))}
      </dl>

      {label.sections.length > 0 && (
        <div className="px-6 py-5">
          <p className="mb-3 text-[13px] font-medium text-fg">Par section</p>
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {label.sections.map((sec) => (
              <li key={sec.key} className="flex items-center gap-3">
                <span className="w-36 shrink-0 text-[13.5px] text-muted">{sec.label}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
                  <span
                    className={cn(
                      'block h-full rounded-full',
                      sec.score === null
                        ? 'bg-transparent'
                        : sec.score >= 85
                          ? 'bg-success'
                          : sec.score >= 70
                            ? 'bg-warning'
                            : 'bg-danger',
                    )}
                    style={{ width: `${sec.score ?? 0}%` }}
                  />
                </span>
                <span className="w-8 text-right text-[13px] font-semibold tabular text-fg">
                  {sec.score ?? '–'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-line px-6 py-4">
        <Link
          to={`/u/${label.owner.handle}`}
          className="inline-flex items-center gap-2 text-[14px] font-semibold text-fg hover:underline"
        >
          <Avatar name={label.owner.displayName} src={label.owner.avatarUrl} size={28} />
          {label.owner.displayName}
        </Link>
        <span className="text-[13px] text-muted">propriétaire prouvé du domaine</span>
        <ButtonLink to={`/prevol/${label.reportId}`} className="ml-auto">
          Rapport complet
        </ButtonLink>
      </div>
      <p className="border-t border-line bg-surface-1 px-6 py-3 text-xs text-subtle">
        Vérification faite de l’extérieur par le pré-vol DevHub Africa ; le cloisonnement entre
        comptes (IDOR) et les parcours connectés se testent à la main. Le label suit le dernier
        pré-vol du propriétaire et expire 30 jours après le dernier GO.
      </p>
    </div>
  );
}
