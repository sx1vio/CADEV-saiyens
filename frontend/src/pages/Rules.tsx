import { Calculator, ShieldCheck, Shuffle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/domain'
import { ScoreBar } from '@/components/ui/data'
import { Card, CardHeader } from '@/components/ui/primitives'
import { Page } from './_layout'

/** X5 : page publique « Comment marchent les Proof XP ». */
export default function Rules() {
  const { t } = useTranslation()
  const rows = t('rules.rows', { returnObjects: true }) as Record<string, [string, string, string]>
  const guards = t('rules.guards', { returnObjects: true }) as string[]
  return (
    <Page className="max-w-4xl">
      <PageHeader title={t('rules.title')} subtitle={t('rules.subtitle')} />
      <Card className="mt-6 overflow-hidden">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{t('rules.scale')}</caption>
          <thead className="border-b border-line bg-surface-1 text-xs text-subtle">
            <tr>
              <th className="px-4 py-3 font-medium">{t('rules.action')}</th>
              <th className="px-2 py-3 text-right font-medium">{t('rules.points')}</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">{t('rules.note')}</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(rows).map(([k, [action, pts, note]]) => (
              <tr key={k} className="border-b border-line last:border-0">
                <td className="px-4 py-3 text-fg">
                  {action}
                  <span className="mt-0.5 block text-xs text-subtle sm:hidden">{note}</span>
                </td>
                <td className="px-2 py-3 text-right font-semibold tabular text-success">{pts}</td>
                <td className="hidden px-4 py-3 text-muted sm:table-cell">{note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <CardHeader icon={<Calculator />} title={t('rules.scoreTitle')} />
          <p className="mt-3 text-sm leading-relaxed text-fg">{t('rules.scoreText')}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">{t('rules.repoRule')}</p>
          <ScoreBar g={30} p={42} className="mt-4" height={10} />
          <p className="mt-2 text-xs text-subtle">G 30 + P 42 = 72 · {t('passport.level.advanced')}</p>
          <p className="mt-3 text-xs text-muted">{t('rules.levels')}</p>
        </Card>
        <Card className="p-5">
          <CardHeader icon={<ShieldCheck />} title={t('rules.guardsTitle')} />
          <ul className="mt-3 flex flex-col gap-2">
            {guards.map((g) => (
              <li key={g} className="flex gap-2 text-sm text-fg">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                {g}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-5 md:col-span-2">
          <CardHeader icon={<Shuffle />} title={t('rules.matchTitle')} />
          <p className="mt-3 text-sm leading-relaxed text-fg">{t('rules.matchText')}</p>
        </Card>
      </div>
    </Page>
  )
}
