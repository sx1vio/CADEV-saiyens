import { Crown, Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { ErrorState } from '@/components/djeli'
import { DemoBadge, PageHeader } from '@/components/domain'
import { Avatar, Card, Skeleton } from '@/components/ui/primitives'
import { formatNumber, useLang } from '@/i18n'
import { countryName } from '@/lib/geo'
import { useQuery } from '@/lib/query'
import { cn } from '@/lib/utils'
import { api } from '@/services'
import { Page } from './_layout'

/** D2 : classement par pays, calcul transparent relié au journal des XP. */
export default function Leaderboard() {
  const { t } = useTranslation()
  const lang = useLang()
  const { data, error, refresh } = useQuery('leaderboard', () => api.leaderboard())
  const max = Math.max(1, ...(data ?? []).map((r) => r.xp))

  return (
    <Page>
      <PageHeader title={t('leaderboard.title')} subtitle={t('leaderboard.subtitle')} />
      <Link to="/regles" className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-accent-text hover:underline">
        <Info className="size-4" />
        {t('leaderboard.how')}
      </Link>

      {error ? (
        <ErrorState error={error} onRetry={refresh} className="mt-6" />
      ) : !data ? (
        <div className="mt-6 flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-[16px]" />
          ))}
        </div>
      ) : (
        <>
          {/* Podium */}
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {data.slice(0, 3).map((r, i) => (
              <Card key={r.country} className={cn('relative overflow-hidden p-5', i === 0 && 'glow-border bg-surface-1')}>
                <div className="flex items-center justify-between">
                  <span className={cn('grid size-9 place-items-center rounded-full text-sm font-bold', i === 0 ? 'bg-amber text-pastel-fg' : i === 1 ? 'bg-lavender text-pastel-fg' : 'bg-rose text-pastel-fg')}>{i === 0 ? <Crown className="size-4" /> : i + 1}</span>
                  <span className="font-mono text-xs text-subtle">{r.country}</span>
                </div>
                <p className="mt-4 text-lg font-bold text-fg">{countryName(r.country, lang)}</p>
                <p className="text-[28px] font-bold leading-none tracking-tight tabular text-fg">{formatNumber(r.xp, lang)}</p>
                <p className="mt-1 text-xs text-muted">
                  Proof XP · {r.devs} {t('leaderboard.devs').toLowerCase()}
                </p>
              </Card>
            ))}
          </div>

          <div className="mt-4 overflow-hidden rounded-[20px] border border-line bg-surface-2">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-1 text-xs text-subtle">
                <tr>
                  <th className="w-12 px-4 py-3 font-medium">#</th>
                  <th className="px-2 py-3 font-medium">{t('leaderboard.country')}</th>
                  <th className="hidden px-2 py-3 font-medium md:table-cell">{t('leaderboard.top')}</th>
                  <th className="hidden px-2 py-3 text-right font-medium sm:table-cell">{t('leaderboard.devs')}</th>
                  <th className="hidden px-2 py-3 text-right font-medium sm:table-cell">{t('leaderboard.resolved')}</th>
                  <th className="px-4 py-3 text-right font-medium">{t('leaderboard.xp')}</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r, i) => (
                  <tr key={r.country} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-semibold tabular text-subtle">{i + 1}</td>
                    <td className="px-2 py-3">
                      <p className="font-semibold text-fg">{countryName(r.country, lang)}</p>
                      <div className="mt-1.5 h-1 w-full max-w-40 overflow-hidden rounded-full bg-surface-3">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${(r.xp / max) * 100}%` }} />
                      </div>
                    </td>
                    <td className="hidden px-2 py-3 md:table-cell">
                      {r.topDev && (
                        <Link to={`/u/${r.topDev.handle}`} className="inline-flex items-center gap-2 hover:underline">
                          <Avatar name={r.topDev.displayName} src={r.topDev.avatarUrl} size={24} />
                          <span className="text-fg">{r.topDev.displayName}</span>
                          {r.topDev.isDemo && <DemoBadge />}
                        </Link>
                      )}
                    </td>
                    <td className="hidden px-2 py-3 text-right tabular text-muted sm:table-cell">{r.devs}</td>
                    <td className="hidden px-2 py-3 text-right tabular text-muted sm:table-cell">{r.resolved}</td>
                    <td className="px-4 py-3 text-right font-bold tabular text-fg">{formatNumber(r.xp, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Page>
  )
}
