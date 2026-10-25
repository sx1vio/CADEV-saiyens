import { ArrowUpRight, Rss } from 'lucide-react'
import { useState } from 'react'
import { Skeleton } from '@/components/ui/primitives'
import { useQuery } from '@/lib/query'
import { cn } from '@/lib/utils'
import { CUBE, Chips, ServiceHeader, StatCard, Ago } from '@/platform/ui'

interface Source {
  id: string
  name: string
  kind: 'rss' | 'youtube' | 'api'
  category: string
  lang: string
  homepage: string
  items: number
  last: string | null
}

const KIND_LABEL = { rss: 'Flux RSS', youtube: 'Chaîne YouTube', api: 'API' } as const

/** Transparence : toutes les sources suivies par DevHub, leur volume et leur fraîcheur. */
export default function Sources() {
  const [kind, setKind] = useState<'all' | Source['kind']>('all')
  const { data, error } = useQuery<{ sources: Source[] }>('news:sources', async () => {
    const res = await fetch('/api/news/sources')
    if (!res.ok) throw new Error(String(res.status))
    return res.json()
  })
  const list = (data?.sources ?? []).filter((s) => kind === 'all' || s.kind === kind)
  const total = (data?.sources ?? []).reduce((n, s) => n + s.items, 0)
  return (
    <div className="dh-page mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-8 sm:py-8">
      <ServiceHeader title="Sources" subtitle="D’où viennent les actualités de DevHub. On reprend le titre, un court extrait et le lien : l’article complet reste chez son éditeur." />
      {data && (
        <div className="mt-7 grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
          <StatCard dark label="éléments indexés" value={total} spark={[3, 4, 4, 6, 7, 7, 8, 9, 9, 10]} note="sur les 45 derniers jours" />
          <StatCard label="flux rss" value={data.sources.filter((s) => s.kind === 'rss').length} cube={CUBE.orange} note="médias tech, IA, mobile, dev" />
          <StatCard label="chaînes youtube" value={data.sources.filter((s) => s.kind === 'youtube').length} cube={CUBE.navy} note="en français et en anglais" />
          <StatCard label="api" value={data.sources.filter((s) => s.kind === 'api').length} cube={CUBE.green} note="Hacker News, DEV, GitHub" />
        </div>
      )}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <h2 className="text-[19px] font-bold tracking-[-0.03em] text-fg">Toutes les sources</h2>
        <Chips
          items={[
            { id: 'all', label: 'Toutes' },
            { id: 'rss', label: 'Flux RSS' },
            { id: 'youtube', label: 'YouTube' },
            { id: 'api', label: 'API' },
          ]}
          value={kind}
          onChange={setKind}
        />
      </div>
      {error && !data ? (
        <p className="mt-4 rounded-[20px] bg-surface-1 p-5 text-[14px] text-muted">Serveur injoignable.</p>
      ) : !data ? (
        <div className="mt-4 flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-[16px]" />
          ))}
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {list.map((s) => (
            <li key={s.id}>
              <a href={s.homepage} target="_blank" rel="noopener noreferrer" className="grid grid-cols-[32px_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-[16px] bg-surface-1 py-2.5 pr-3 pl-3 transition-colors hover:bg-surface-2 sm:grid-cols-[32px_minmax(0,1.3fr)_minmax(0,1fr)_auto_auto]">
                <span className="grid size-8 place-items-center rounded-[10px] bg-canvas text-muted shadow-sm">
                  <Rss className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-semibold text-fg">{s.name}</span>
                  <span className="block truncate text-[12px] text-muted">
                    {KIND_LABEL[s.kind]} · {s.category} · {s.lang.toUpperCase()}
                  </span>
                </span>
                <span className="hidden text-[13px] text-subtle sm:block">{s.last ? <>dernier : <Ago iso={s.last} /></> : 'aucun élément'}</span>
                <span className={cn('text-[13px]', s.items ? 'text-fg' : 'text-subtle')}>
                  <b className="font-semibold tabular">{s.items}</b> <span className="text-subtle">éléments</span>
                </span>
                <ArrowUpRight className="size-4 text-subtle" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
