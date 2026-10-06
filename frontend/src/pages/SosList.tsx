import { CheckCircle2, Inbox, Layers, Search, Sparkles, UserRound, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { EmptyState, ErrorState } from '@/components/djeli'
import { PageHeader, QuestionCard } from '@/components/domain'
import { useTags } from '@/components/TagPicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/primitives'
import { Segmented } from '@/components/ui/segmented'
import { useQuery } from '@/lib/query'
import { api, type QuestionTab } from '@/services'
import { useSession, useUI } from '@/stores/app'
import { ListSkeleton } from './_skeleton'
import { Page } from './_layout'

/** SOS Dev : liste des questions, filtres dans l'URL (règle n°7), base de connaissance (onglet Résolues). */
export default function SosList() {
  const { t } = useTranslation()
  const me = useSession((s) => s.user)
  const setAsk = useUI((s) => s.setAsk)
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as QuestionTab) || (me ? 'for-me' : 'all')
  const tag = params.get('tag') ?? ''
  const [q, setQ] = useState(params.get('q') ?? '')
  const { data: tags = [] } = useTags()

  useEffect(() => {
    const id = setTimeout(() => {
      const next = new URLSearchParams(params)
      if (q) next.set('q', q)
      else next.delete('q')
      if (next.toString() !== params.toString()) setParams(next, { replace: true })
    }, 250)
    return () => clearTimeout(id)
  }, [q]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params)
    if (v) next.set(k, v)
    else next.delete(k)
    setParams(next, { replace: true })
  }

  const key = `questions:${tab}:${tag}:${params.get('q') ?? ''}`
  const { data, error, refresh } = useQuery(key, () => api.listQuestions(tab, { tag: tag || undefined, q: params.get('q') || undefined }))

  const tabs = [
    ...(me ? [{ value: 'for-me' as const, label: t('sos.tabs.for-me'), icon: <Sparkles /> }] : []),
    { value: 'unanswered' as const, label: t('sos.tabs.unanswered'), icon: <Inbox /> },
    { value: 'resolved' as const, label: t('sos.tabs.resolved'), icon: <CheckCircle2 /> },
    { value: 'all' as const, label: t('sos.tabs.all'), icon: <Layers /> },
    ...(me ? [{ value: 'mine' as const, label: t('sos.tabs.mine'), icon: <UserRound /> }] : []),
  ]

  const popular = ['docker', 'nodejs', 'react', 'python', 'mobile-money', 'laravel', 'flutter', 'postgresql']

  return (
    <Page>
      <PageHeader
        title={t('sos.title')}
        subtitle={t('sos.subtitle')}
        actions={
          me && (
            <Button variant="primary" icon={<Zap />} onClick={() => setAsk(true)}>
              {t('nav.ask')}
            </Button>
          )
        }
      />

      <div className="mt-6 flex flex-col gap-3">
        <Segmented label={t('sos.title')} value={tab} onChange={(v) => set('tab', v)} items={tabs} glow className="self-start" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('sos.searchPlaceholder')} className="pl-10" type="search" aria-label={t('common.search')} />
          </div>
          <select
            value={tag}
            onChange={(e) => set('tag', e.target.value)}
            aria-label={t('sos.filterTag')}
            className="h-11 rounded-[12px] border border-line bg-inset px-3 text-sm text-fg shadow-inset sm:h-10 sm:w-52"
          >
            <option value="">{t('sos.allTags')}</option>
            {tags.map((x) => (
              <option key={x.id} value={x.slug}>
                {x.label}
              </option>
            ))}
          </select>
        </div>
        <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          {popular.map((slug) => {
            const tg = tags.find((x) => x.slug === slug)
            if (!tg) return null
            const on = tag === slug
            return (
              <button
                key={slug}
                type="button"
                onClick={() => set('tag', on ? '' : slug)}
                aria-pressed={on}
                className={on ? 'h-8 shrink-0 rounded-full bg-accent-strong px-3 font-mono text-xs font-medium text-on-accent' : 'h-8 shrink-0 rounded-full border border-line bg-surface-2 px-3 font-mono text-xs font-medium text-muted transition-colors hover:text-fg'}
              >
                {tg.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-6">
        {error ? (
          <ErrorState error={error} onRetry={refresh} />
        ) : !data ? (
          <ListSkeleton rows={5} />
        ) : data.length === 0 ? (
          <EmptyState
            pose="laptop"
            title={params.get('q') ? t('sos.emptySearch', { q: params.get('q') }) : t('sos.empty')}
            action={
              me && (
                <Button variant="primary" icon={<Zap />} onClick={() => setAsk(true)}>
                  {t('sos.emptyCta')}
                </Button>
              )
            }
          />
        ) : (
          <div className="dh-stagger flex flex-col gap-2.5">
            {data.map((x) => (
              <QuestionCard key={x.id} q={x} showBlocked={tab === 'unanswered'} />
            ))}
          </div>
        )}
      </div>
    </Page>
  )
}
