import { Bell, Clock, Maximize, Pause, Play, PlaySquare, Share2, ThumbsDown, ThumbsUp, Volume2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { VIDEOS, VIDEO_CATEGORIES } from '@/platform/data/videos'
import { person } from '@/platform/data/people'
import { usePlatform } from '@/platform/store'
import type { Video } from '@/platform/types'
import { Ago, Chips, DemoTag, PersonAvatar, SERVICE_COLORS, ServiceHeader, VideoThumb, compact } from '@/platform/ui'
import { cn } from '@/lib/utils'
import NotFound from './NotFound'

const SUBSCRIBERS: Record<string, number> = { 'moussa-diop': 12400, 'grace-uwase': 48100, 'ousmane-sow': 6900, 'je-hounkpatin': 3100, 'nadia-benali': 15200, 'kwame-dev': 21800, 'amina-bello': 4200, 'thandi-d': 9800, 'koffi-ag': 3600, 'esi-owusu': 27500 }

/** Vidéos : tutoriels, lives et démos de projets (façon YouTube). */
export default function Videos() {
  const [params, setParams] = useSearchParams()
  const cat = params.get('cat') ?? 'Tout'
  const subs = usePlatform((s) => s.subscriptions)
  const list = useMemo(() => VIDEOS.filter((v) => cat === 'Tout' || (cat === 'Lives' ? v.live : v.category === cat)), [cat])
  return (
    <div className="dh-page mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6">
      <ServiceHeader icon={PlaySquare} color={SERVICE_COLORS.videos} title="Vidéos" subtitle="Tutoriels, lives de code et démos de projets, par des devs de la communauté." />
      <Chips className="sticky top-14 z-10 -mx-4 mt-5 bg-canvas px-4 py-2 sm:-mx-6 sm:px-6" items={VIDEO_CATEGORIES.map((c) => ({ id: c, label: c }))} value={cat} onChange={(v) => setParams(v === 'Tout' ? {} : { cat: v }, { replace: true })} />
      {subs.length > 0 && cat === 'Tout' && (
        <div className="no-scrollbar mt-4 flex gap-5 overflow-x-auto pb-1">
          {subs.map((h) => (
            <Link key={h} to={`/u/${h}`} className="flex w-20 shrink-0 flex-col items-center gap-1.5 text-center">
              <span className="relative">
                <PersonAvatar handle={h} size={56} />
                {VIDEOS.some((v) => v.channel === h && v.live) && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-[3px] bg-[#e5333b] px-1 text-[9px] font-semibold text-white">LIVE</span>}
              </span>
              <span className="line-clamp-1 text-[12px] font-medium text-muted">{person(h).name.split(' ')[0]}</span>
            </Link>
          ))}
        </div>
      )}
      <div className="mt-5 grid gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {list.map((v) => (
          <VideoCard key={v.id} video={v} />
        ))}
      </div>
    </div>
  )
}

function VideoCard({ video }: { video: Video }) {
  const ch = person(video.channel)
  return (
    <Link to={`/videos/${video.id}`} className="group flex flex-col gap-3">
      <VideoThumb video={video} className="transition-[border-radius] duration-200 group-hover:rounded-[6px]" />
      <div className="flex gap-3">
        <PersonAvatar handle={video.channel} size={36} />
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-[14px] leading-snug font-semibold text-fg">{video.title}</h3>
          <p className="mt-1 text-[13px] text-subtle">{ch.name}</p>
          <p className="text-[13px] text-subtle">
            {video.live ? (
              <span className="font-semibold text-[#e5333b]">{compact(video.views)} spectateurs</span>
            ) : (
              <>
                {compact(video.views)} vues · <Ago iso={video.publishedAt} />
              </>
            )}
          </p>
        </div>
      </div>
    </Link>
  )
}

const toSec = (t: string) => t.split(':').reduce((s, p) => s * 60 + Number(p), 0)
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

/** Page de lecture : lecteur, chaîne, description, chapitres, à suivre. */
export function Watch() {
  const { id = '' } = useParams()
  // Une clé par vidéo : le lecteur repart de zéro à chaque changement de vidéo.
  return <WatchView key={id} id={id} />
}

function WatchView({ id }: { id: string }) {
  const video = VIDEOS.find((v) => v.id === id)
  const liked = usePlatform((s) => s.likedVideos.includes(id))
  const subscribed = usePlatform((s) => (video ? s.subscriptions.includes(video.channel) : false))
  const later = usePlatform((s) => s.watchLater.includes(id))
  const toggle = usePlatform((s) => s.toggle)
  const [expanded, setExpanded] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [t, setT] = useState(0)
  const total = video && !video.live ? toSec(video.duration) : 0

  useEffect(() => {
    if (!playing || !total) return
    const iv = setInterval(() => setT((x) => (x + 1 >= total ? (setPlaying(false), total) : x + 1)), 1000)
    return () => clearInterval(iv)
  }, [playing, total])

  if (!video) return <NotFound />
  const ch = person(video.channel)
  const next = VIDEOS.filter((v) => v.id !== video.id)

  return (
    <div className="dh-page mx-auto flex w-full max-w-[1700px] flex-col gap-6 px-0 py-0 sm:px-6 sm:py-6 xl:flex-row">
      <div className="min-w-0 flex-1">
        {/* Lecteur (aperçu : les vidéos de démonstration ne sont pas hébergées) */}
        <div className="group relative overflow-hidden bg-black sm:rounded-[12px]">
          <VideoThumb video={video} big className="rounded-none" />
          {!playing && (
            <button type="button" onClick={() => setPlaying(true)} aria-label="Lire" className="absolute inset-0 grid place-items-center bg-black/20 transition-colors hover:bg-black/10">
              <span className="grid size-16 place-items-center rounded-full bg-black/70 text-white">
                <Play className="ml-1 size-7" fill="currentColor" />
              </span>
            </button>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pt-10 pb-3 text-white">
            {total > 0 && (
              <div
                className="relative h-1 cursor-pointer rounded-full bg-white/30"
                role="slider"
                aria-label="Position de lecture"
                aria-valuemin={0}
                aria-valuemax={total}
                aria-valuenow={t}
                tabIndex={0}
                onClick={(e) => {
                  const r = e.currentTarget.getBoundingClientRect()
                  setT(Math.round(((e.clientX - r.left) / r.width) * total))
                }}
              >
                <div className="h-full rounded-full bg-[#e5333b]" style={{ width: `${(t / total) * 100}%` }} />
                {video.chapters.map((c) => (
                  <span key={c.at} className="absolute top-0 h-1 w-0.5 bg-black/60" style={{ left: `${(toSec(c.at) / total) * 100}%` }} />
                ))}
              </div>
            )}
            <div className="mt-2 flex items-center gap-3 text-[13px]">
              <button type="button" onClick={() => setPlaying(!playing)} aria-label={playing ? 'Pause' : 'Lire'} className="grid size-8 place-items-center rounded-full hover:bg-white/15">
                {playing ? <Pause className="size-5" fill="currentColor" /> : <Play className="size-5" fill="currentColor" />}
              </button>
              <Volume2 className="size-5 opacity-80" />
              <span className="tabular">{video.live ? 'EN DIRECT' : `${fmt(t)} / ${video.duration}`}</span>
              <span className="ml-auto hidden rounded-[4px] bg-white/15 px-1.5 py-0.5 text-[11px] sm:inline">Aperçu de démonstration, sans vidéo hébergée</span>
              <span className="ml-auto sm:hidden" />
              <Maximize className="size-5 opacity-80" />
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-0">
          <h1 className="mt-3 text-[18px] leading-snug font-semibold text-fg">{video.title}</h1>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <PersonAvatar handle={video.channel} size={40} />
              <div className="min-w-0">
                <Link to={`/u/${ch.handle}`} className="block truncate text-[14px] font-semibold text-fg hover:underline">
                  {ch.name}
                </Link>
                <p className="text-[12.5px] text-subtle">{compact((SUBSCRIBERS[ch.handle] ?? 1000) + (subscribed ? 1 : 0))} abonnés</p>
              </div>
              <button type="button" onClick={() => toggle('subscriptions', video.channel)} className={cn('ml-2 inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold', subscribed ? 'bg-surface-2 text-fg' : 'bg-fg text-canvas')}>
                {subscribed && <Bell className="size-4" />}
                {subscribed ? 'Abonné' : 'S’abonner'}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
              <div className="flex h-9 items-center overflow-hidden rounded-full bg-surface-2 text-[14px] font-semibold">
                <button type="button" aria-pressed={liked} onClick={() => toggle('likedVideos', video.id)} className="flex h-full items-center gap-2 pr-3 pl-4 hover:bg-surface-3">
                  <ThumbsUp className="size-[18px]" fill={liked ? 'currentColor' : 'none'} />
                  {compact(video.likes + (liked ? 1 : 0))}
                </button>
                <span className="h-5 w-px bg-line-strong" />
                <button type="button" aria-label="Je n’aime pas" className="flex h-full items-center px-3.5 hover:bg-surface-3">
                  <ThumbsDown className="size-[18px]" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => void navigator.clipboard?.writeText(location.href).then(() => toast.success('Lien copié'))}
                className="inline-flex h-9 items-center gap-2 rounded-full bg-surface-2 px-4 text-[14px] font-semibold hover:bg-surface-3"
              >
                <Share2 className="size-[18px]" />
                Partager
              </button>
              <button type="button" aria-pressed={later} onClick={() => toggle('watchLater', video.id)} className={cn('inline-flex h-9 items-center gap-2 rounded-full bg-surface-2 px-4 text-[14px] font-semibold hover:bg-surface-3', later && 'text-accent-text')}>
                <Clock className="size-[18px]" />
                {later ? 'Enregistrée' : 'Plus tard'}
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-[12px] bg-surface-1 p-3.5 text-[14px]">
            <p className="flex flex-wrap items-center gap-2 font-semibold text-fg">
              {video.live ? `${compact(video.views)} spectateurs` : `${compact(video.views)} vues`}
              <span className="text-subtle">·</span>
              <Ago iso={video.publishedAt} />
              {video.tags.map((tg) => (
                <span key={tg} className="text-accent-text">
                  #{tg.replace(/\s+/g, '')}
                </span>
              ))}
              <DemoTag />
            </p>
            <p className={cn('mt-1.5 whitespace-pre-line text-fg', !expanded && 'line-clamp-2')}>{video.description}</p>
            {expanded && video.chapters.length > 0 && (
              <div className="mt-4">
                <h2 className="text-[14px] font-semibold text-fg">Chapitres</h2>
                <ul className="mt-2 flex flex-col">
                  {video.chapters.map((c) => (
                    <li key={c.at}>
                      <button
                        type="button"
                        onClick={() => {
                          setT(toSec(c.at))
                          setPlaying(true)
                        }}
                        className="flex w-full items-center gap-3 rounded-[8px] px-2 py-2 text-left hover:bg-surface-2"
                      >
                        <span className="w-12 font-semibold text-accent-text tabular">{c.at}</span>
                        <span className="text-fg">{c.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <button type="button" onClick={() => setExpanded(!expanded)} className="mt-1 font-semibold text-fg hover:underline">
              {expanded ? 'Moins' : '…plus'}
            </button>
          </div>
        </div>
      </div>

      <aside className="flex w-full shrink-0 flex-col gap-2 px-4 pb-6 sm:px-0 xl:w-[400px]">
        <h2 className="mb-1 text-[14px] font-semibold text-fg">À suivre</h2>
        {next.map((v) => (
          <Link key={v.id} to={`/videos/${v.id}`} className="group flex gap-2.5">
            <VideoThumb video={v} className="w-[168px] shrink-0 rounded-[8px]" />
            <span className="min-w-0 py-0.5">
              <span className="line-clamp-2 text-[14px] leading-snug font-semibold text-fg">{v.title}</span>
              <span className="mt-1 block truncate text-[12.5px] text-subtle">{person(v.channel).name}</span>
              <span className="block text-[12.5px] text-subtle">{v.live ? 'En direct' : `${compact(v.views)} vues`}</span>
            </span>
          </Link>
        ))}
      </aside>
    </div>
  )
}
