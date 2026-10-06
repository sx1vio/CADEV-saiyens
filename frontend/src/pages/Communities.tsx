import { Users } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { Button, ButtonLink } from '@/components/ui/button'
import { COMMUNITIES, POSTS } from '@/platform/data/feed'
import { usePlatform } from '@/platform/store'
import { CommunityIcon, PostCard, SERVICE_COLORS, ServiceHeader, SideCard, communityOf, compact } from '@/platform/ui'
import NotFound from './NotFound'

/** Annuaire des communautés (façon Reddit). */
export function CommunityList() {
  const joined = usePlatform((s) => s.joined)
  const toggle = usePlatform((s) => s.toggle)
  return (
    <div className="dh-page mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6">
      <ServiceHeader icon={Users} color={SERVICE_COLORS.communities} title="Communautés" subtitle="Des espaces par sujet, animés par des devs. Rejoins-en pour personnaliser ton fil." />
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {COMMUNITIES.map((c) => {
          const isIn = joined.includes(c.slug)
          return (
            <div key={c.slug} className="flex gap-3 rounded-[20px] bg-surface-1 p-4 transition-colors ">
              <CommunityIcon slug={c.slug} size={48} />
              <div className="min-w-0 flex-1">
                <Link to={`/c/${c.slug}`} className="text-[15px] font-semibold text-fg hover:underline">
                  c/{c.slug}
                </Link>
                <p className="text-[12.5px] text-subtle">
                  {c.name} · {compact(c.members)} membres · {c.online} en ligne
                </p>
                <p className="mt-1.5 line-clamp-2 text-[13px] text-muted">{c.description}</p>
              </div>
              <Button variant={isIn ? 'secondary' : 'primary'} size="sm" className="shrink-0 rounded-full" onClick={() => toggle('joined', c.slug)}>
                {isIn ? 'Membre' : 'Rejoindre'}
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Page d'une communauté : bannière, fil, règles. */
export default function CommunityPage() {
  const { slug = '' } = useParams()
  const joined = usePlatform((s) => s.joined)
  const toggle = usePlatform((s) => s.toggle)
  const myPosts = usePlatform((s) => s.myPosts)
  if (!COMMUNITIES.some((c) => c.slug === slug)) return <NotFound />
  const c = communityOf(slug)
  const posts = [...myPosts, ...POSTS].filter((p) => p.community === slug)
  const isIn = joined.includes(slug)
  return (
    <div className="dh-page">
      <div className="h-28 sm:h-36" style={{ background: `linear-gradient(120deg, ${c.color}, color-mix(in oklab, ${c.color}, #000 55%))` }} />
      <div className="mx-auto w-full max-w-[1180px] px-4 sm:px-6">
        <div className="-mt-8 flex flex-col gap-3 sm:flex-row sm:items-end">
          <CommunityIcon slug={slug} size={84} className="ring-4 ring-canvas" />
          <div className="min-w-0 flex-1 pb-1">
            <h1 className="text-[22px] leading-tight font-semibold text-fg">c/{slug}</h1>
            <p className="text-[14px] text-subtle">{c.name}</p>
          </div>
          <div className="flex gap-2 pb-1">
            <ButtonLink to={`/publier?c=${slug}`} variant="secondary" className="rounded-full">
              Publier
            </ButtonLink>
            <Button variant={isIn ? 'secondary' : 'primary'} className="rounded-full" onClick={() => toggle('joined', slug)}>
              {isIn ? 'Membre' : 'Rejoindre'}
            </Button>
          </div>
        </div>
        <div className="mt-6 flex gap-6 pb-6">
          <div className="flex min-w-0 flex-1 flex-col gap-2.5">
            {posts.length ? posts.map((p) => <PostCard key={p.id} post={p} />) : <p className="rounded-[20px] bg-surface-1 p-8 text-center text-muted">Pas encore de post ici. Sois le premier.</p>}
          </div>
          <aside className="hidden w-[316px] shrink-0 flex-col gap-4 lg:flex">
            <SideCard title="À propos">
              <p className="text-[14px] text-muted">{c.description}</p>
              <div className="mt-3 flex gap-6 text-[13px]">
                <span>
                  <b className="block text-fg">{compact(c.members)}</b>
                  <span className="text-subtle">membres</span>
                </span>
                <span>
                  <b className="flex items-center gap-1.5 text-fg">
                    <span className="size-2 rounded-full bg-success" />
                    {c.online}
                  </b>
                  <span className="text-subtle">en ligne</span>
                </span>
              </div>
            </SideCard>
            <SideCard title="Règles">
              <ol className="flex list-decimal flex-col gap-2 pl-4 text-[13px] text-muted">
                {c.rules.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ol>
            </SideCard>
          </aside>
        </div>
      </div>
    </div>
  )
}
