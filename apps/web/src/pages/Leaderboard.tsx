import { ChevronRight, Info, MoreHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { ErrorState } from '@/components/djeli';
import { PageHeader } from '@/components/domain';
import { CUBE, StatCard } from '@/platform/ui';
import { Avatar, Skeleton } from '@/components/ui/primitives';
import { formatNumber, useLang } from '@/i18n';
import { countryName } from '@/lib/geo';
import { useQuery } from '@/lib/query';
import { api } from '@/services';
import { Page } from './_layout';

/** D2 : classement par pays, calcul transparent relié au journal des XP. */
export default function Leaderboard() {
  const { t } = useTranslation();
  const lang = useLang();
  const { data, error, refresh } = useQuery('leaderboard', () => api.leaderboard());

  return (
    <Page>
      <PageHeader title={t('leaderboard.title')} subtitle={t('leaderboard.subtitle')} />
      <Link
        to="/regles"
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-accent-text hover:underline"
      >
        <Info className="size-4" />
        {t('leaderboard.how')}
      </Link>

      {error ? (
        <ErrorState error={error} onRetry={refresh} className="mt-6" />
      ) : !data ? (
        <div className="mt-6 flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-[16px]" />
          ))}
        </div>
      ) : (
        <>
          {/* Podium en cartes d'indicateurs */}
          <div className="mt-7 grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
            {data.slice(0, 1).map((r) => (
              <StatCard
                key={r.country}
                dark
                label={`1er · ${countryName(r.country, lang).toLowerCase()}`}
                value={formatNumber(r.xp, lang)}
                spark={[2, 3, 3, 5, 4, 6, 7, 7, 9, 10]}
                delta={`${r.devs}`}
                note={`${t('leaderboard.devs').toLowerCase()} · Proof XP`}
              />
            ))}
            {data.slice(1, 4).map((r, i) => (
              <StatCard
                key={r.country}
                label={`${i + 2}e · ${countryName(r.country, lang).toLowerCase()}`}
                value={formatNumber(r.xp, lang)}
                cube={[CUBE.orange, CUBE.purple, CUBE.green][i]}
                delta={`${r.resolved}`}
                note="questions résolues"
              />
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <h2 className="text-[17px] font-bold tracking-[-0.02em] text-fg">Pays</h2>
            <span className="rounded-full bg-fg px-4 py-2 text-[13px] font-medium text-canvas">
              Proof XP
            </span>
          </div>

          {/* Rangées façon liste « Drivers » */}
          <ul className="mt-4 flex flex-col gap-2">
            {data.map((r, i) => (
              <li key={r.country}>
                <div className="grid grid-cols-[20px_minmax(0,1fr)_auto_36px] items-center gap-3 rounded-[16px] bg-surface-1 py-2.5 pr-2 pl-4 transition-colors hover:bg-surface-2 sm:grid-cols-[20px_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto_36px]">
                  <ChevronRight className="size-4 text-fg" />
                  <span className="flex min-w-0 items-center gap-3">
                    {r.topDev ? (
                      <Avatar name={r.topDev.displayName} src={r.topDev.avatarUrl} size={32} />
                    ) : (
                      <span className="size-8 rounded-full bg-surface-3" />
                    )}
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-semibold text-fg">
                        <span className="mr-1.5 text-subtle tabular">{i + 1}.</span>
                        {countryName(r.country, lang)}
                      </span>
                      {r.topDev && (
                        <Link
                          to={`/u/${r.topDev.handle}`}
                          className="block truncate text-[12px] text-muted hover:underline"
                        >
                          {t('leaderboard.top')} : {r.topDev.displayName}
                        </Link>
                      )}
                    </span>
                  </span>
                  <span className="hidden text-[13px] sm:block">
                    <b className="font-semibold text-fg tabular">{r.devs}</b>{' '}
                    <span className="text-subtle">{t('leaderboard.devs').toLowerCase()}</span>
                  </span>
                  <span className="hidden text-[13px] sm:block">
                    <b className="font-semibold text-fg tabular">{r.resolved}</b>{' '}
                    <span className="text-subtle">résolues</span>
                  </span>
                  <span className="text-right text-[13px]">
                    <b className="font-semibold text-fg tabular">{formatNumber(r.xp, lang)}</b>{' '}
                    <span className="text-subtle">Proof XP</span>
                  </span>
                  <Link
                    to="/regles"
                    aria-label="Détail du calcul"
                    className="grid size-9 place-items-center rounded-full text-fg hover:bg-canvas"
                  >
                    <MoreHorizontal className="size-5" />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Page>
  );
}
