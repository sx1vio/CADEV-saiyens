import { Users } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { Button, ButtonLink } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/primitives';
import { useQuery } from '@/lib/query';
import { cn } from '@/lib/utils';
import { PostCard, communityApi } from '@/platform/community';
import { COMMUNITIES } from '@/platform/data/feed';
import { usePlatform } from '@/platform/store';
import { CommunityIcon, SERVICE_COLORS, ServiceHeader, SideCard, communityOf } from '@/platform/ui';
import NotFound from './NotFound';

/** Annuaire des communautés, avec leur activité réelle. */
export function CommunityList() {
  const joined = usePlatform((s) => s.joined);
  const toggle = usePlatform((s) => s.toggle);
  const { data } = useQuery('communities', () => communityApi.communities());
  const stats = (slug: string) => data?.data.find((c) => c.slug === slug);
  return (
    <div className="dh-page mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6">
      <ServiceHeader
        icon={Users}
        color={SERVICE_COLORS.communities}
        title="Communautés"
        subtitle="Des espaces par sujet. Rejoins ceux qui t’intéressent pour personnaliser ton fil, et publie quand tu as quelque chose à partager."
      />
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {COMMUNITIES.map((c) => {
          const isIn = joined.includes(c.slug);
          const s = stats(c.slug);
          return (
            <div key={c.slug} className="flex gap-3 rounded-[10px] bg-surface-1 p-4">
              <CommunityIcon slug={c.slug} size={48} />
              <div className="min-w-0 flex-1">
                <Link
                  to={`/c/${c.slug}`}
                  className="text-[15px] font-semibold text-fg hover:underline"
                >
                  c/{c.slug}
                </Link>
                <p className="text-[12.5px] text-subtle">
                  {c.name}
                  {s && (
                    <>
                      {' '}
                      · {s.posts} publication{s.posts > 1 ? 's' : ''}
                      {s.posts7d > 0 && ` · ${s.posts7d} cette semaine`}
                    </>
                  )}
                </p>
                <p className="mt-1.5 line-clamp-2 text-[13px] text-muted">{c.description}</p>
              </div>
              <Button
                variant={isIn ? 'secondary' : 'primary'}
                size="sm"
                className="shrink-0 rounded-full"
                onClick={() => toggle('joined', c.slug)}
              >
                {isIn ? 'Membre' : 'Rejoindre'}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Page d'une communauté : bannière, fil réel, règles. */
export default function CommunityPage() {
  const { slug = '' } = useParams();
  const joined = usePlatform((s) => s.joined);
  const toggle = usePlatform((s) => s.toggle);
  const [sort, setSort] = useState<'recent' | 'top'>('recent');
  const known = COMMUNITIES.some((c) => c.slug === slug);
  const { data, error } = useQuery(known ? `posts:c:${slug}:${sort}` : null, () =>
    communityApi.list({ community: slug, sort }),
  );
  const { data: all } = useQuery(known ? 'communities' : null, () => communityApi.communities());
  if (!known) return <NotFound />;
  const c = communityOf(slug);
  const s = all?.data.find((x) => x.slug === slug);
  const isIn = joined.includes(slug);
  return (
    <div className="dh-page">
      <div
        className="h-28 sm:h-36"
        style={{
          background: `linear-gradient(120deg, ${c.color}, color-mix(in oklab, ${c.color}, #000 55%))`,
        }}
      />
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
            <Button
              variant={isIn ? 'secondary' : 'primary'}
              className="rounded-full"
              onClick={() => toggle('joined', slug)}
            >
              {isIn ? 'Membre' : 'Rejoindre'}
            </Button>
          </div>
        </div>
        <div className="mt-6 flex gap-6 pb-6">
          <div className="flex min-w-0 flex-1 flex-col gap-2.5">
            <div className="flex gap-2" role="group" aria-label="Tri">
              {(
                [
                  ['recent', 'Récents'],
                  ['top', 'Populaires'],
                ] as const
              ).map(([k, l]) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={sort === k}
                  onClick={() => setSort(k)}
                  className={cn(
                    'h-8 rounded-full px-3.5 text-[13px] font-medium',
                    sort === k ? 'lg-tint' : 'lg-clear text-fg',
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
            {!data && !error && <Skeleton className="h-32 rounded-[10px]" />}
            {!!error && !data && (
              <p className="rounded-[10px] bg-surface-1 p-6 text-center text-muted">
                Impossible de charger les publications. Réessaie dans un instant.
              </p>
            )}
            {data?.data.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
            {data && data.data.length === 0 && (
              <div className="rounded-[10px] bg-surface-1 p-8 text-center">
                <p className="font-semibold text-fg">Pas encore de publication dans c/{slug}.</p>
                <p className="mt-1 text-[14px] text-muted">Lance la première discussion.</p>
                <ButtonLink
                  to={`/publier?c=${slug}`}
                  variant="primary"
                  className="mt-4 rounded-full"
                >
                  Publier dans c/{slug}
                </ButtonLink>
              </div>
            )}
          </div>
          <aside className="hidden w-[316px] shrink-0 flex-col gap-4 lg:flex">
            <SideCard title="À propos">
              <p className="text-[14px] text-muted">{c.description}</p>
              {s && (
                <div className="mt-3 flex gap-6 text-[13px]">
                  <span>
                    <b className="block text-fg">{s.posts}</b>
                    <span className="text-subtle">publications</span>
                  </span>
                  <span>
                    <b className="block text-fg">{s.authors}</b>
                    <span className="text-subtle">auteurs</span>
                  </span>
                  <span>
                    <b className="block text-fg">{s.posts7d}</b>
                    <span className="text-subtle">cette semaine</span>
                  </span>
                </div>
              )}
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
  );
}
