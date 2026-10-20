import { FolderPlus, Search } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { EmptyState, ErrorState } from '@/components/djeli';
import { FeedbackRow } from '@/components/FeedbackRequests';
import { PageHeader, RoomCard } from '@/components/domain';
import { ButtonLink } from '@/components/ui/button';
import { Input, Skeleton } from '@/components/ui/primitives';
import { Segmented } from '@/components/ui/segmented';
import { useQuery } from '@/lib/query';
import { api } from '@/services';
import { cn } from '@/lib/utils';
import { useSession } from '@/stores/app';
import { Page } from './_layout';

export default function Projects() {
  const { t } = useTranslation();
  const me = useSession((s) => s.user);
  const [params, setParams] = useSearchParams();
  const tab =
    params.get('tab') === 'reviews'
      ? 'reviews'
      : params.get('tab') === 'mine' && me
        ? 'mine'
        : 'all';
  const [q, setQ] = useState('');
  const { data, error, refresh } = useQuery(
    tab === 'reviews' ? null : `rooms:${tab}:${me?.id ?? ''}`,
    () => api.listRooms({ mine: tab === 'mine' }),
  );
  const list = (data ?? []).filter(
    (r) =>
      !q ||
      `${r.name} ${r.tagline} ${r.tags.map((x) => x.label).join(' ')}`
        .toLowerCase()
        .includes(q.toLowerCase()),
  );

  return (
    <Page wide>
      <PageHeader
        title={t('projects.title')}
        subtitle={t('projects.subtitle')}
        actions={
          me && (
            <ButtonLink to="/projets/nouvelle" variant="primary" icon={<FolderPlus />}>
              {t('projects.new')}
            </ButtonLink>
          )
        }
      />
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Segmented
          label={t('projects.title')}
          value={tab}
          onChange={(v) => setParams(v === 'all' ? {} : { tab: v }, { replace: true })}
          glow
          items={[
            { value: 'all', label: t('projects.tabs.all') },
            ...(me ? [{ value: 'mine' as const, label: t('projects.tabs.mine') }] : []),
            { value: 'reviews', label: t('projects.tabs.reviews') },
          ]}
        />
        <div className={cn('relative flex-1 sm:max-w-sm', tab === 'reviews' && 'hidden')}>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle" />
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('projects.searchPlaceholder')}
            className="pl-10"
            aria-label={t('common.search')}
          />
        </div>
      </div>
      <div className="mt-6">
        {tab === 'reviews' ? (
          <ReviewFeed />
        ) : error ? (
          <ErrorState error={error} onRetry={refresh} />
        ) : !data ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-56 rounded-[10px]" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            pose="point"
            title={tab === 'mine' ? t('projects.emptyMine') : t('projects.empty')}
            action={
              me && (
                <ButtonLink to="/projets/nouvelle" variant="primary" icon={<FolderPlus />}>
                  {t('projects.emptyCta')}
                </ButtonLink>
              )
            }
          />
        ) : (
          <div className="dh-stagger grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {list.map((r) => (
              <RoomCard key={r.id} room={r} />
            ))}
          </div>
        )}
      </div>
    </Page>
  );
}

/** R6 : flux de la stack, demandes de retour et de revue ouvertes. */
function ReviewFeed() {
  const { t } = useTranslation();
  const me = useSession((s) => s.user);
  const tags = useQuery('tags', () => api.listTags());
  const mySlugs = (tags.data ?? [])
    .filter((x) => me?.canHelpWith.includes(x.id))
    .map((x) => x.slug);
  const [scope, setScope] = useState<'stack' | 'all'>('stack');
  const filtered = scope === 'stack' && mySlugs.length > 0;
  const { data, error, refresh } = useQuery(
    me && !tags.data ? null : `feedback:${filtered ? mySlugs.join(',') : 'all'}`,
    () => api.listFeedbackRequests({ tags: filtered ? mySlugs : undefined }),
  );
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">{t('feedback.feedHint')}</p>
      {mySlugs.length > 0 && (
        <Segmented
          size="sm"
          label={t('projects.tabs.reviews')}
          value={scope}
          onChange={setScope}
          items={[
            { value: 'stack', label: t('feedback.myStack') },
            { value: 'all', label: t('feedback.allStacks') },
          ]}
        />
      )}
      {error ? (
        <ErrorState error={error} onRetry={refresh} />
      ) : !data ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-[10px]" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState pose="point" title={t('feedback.feedEmpty')} />
      ) : (
        <ul className="dh-stagger grid gap-3 md:grid-cols-2">
          {data.map((f) => (
            <FeedbackRow key={f.id} item={f} showRoom />
          ))}
        </ul>
      )}
    </div>
  );
}
