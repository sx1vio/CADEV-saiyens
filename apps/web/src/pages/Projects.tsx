import { FolderPlus, Search } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { EmptyState, ErrorState } from '@/components/djeli';
import { PageHeader, RoomCard } from '@/components/domain';
import { ButtonLink } from '@/components/ui/button';
import { Input, Skeleton } from '@/components/ui/primitives';
import { Segmented } from '@/components/ui/segmented';
import { useQuery } from '@/lib/query';
import { api } from '@/services';
import { useSession } from '@/stores/app';
import { Page } from './_layout';

export default function Projects() {
  const { t } = useTranslation();
  const me = useSession((s) => s.user);
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'mine' && me ? 'mine' : 'all';
  const [q, setQ] = useState('');
  const { data, error, refresh } = useQuery(`rooms:${tab}:${me?.id ?? ''}`, () =>
    api.listRooms({ mine: tab === 'mine' }),
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
        {me && (
          <Segmented
            label={t('projects.title')}
            value={tab}
            onChange={(v) => setParams(v === 'mine' ? { tab: 'mine' } : {}, { replace: true })}
            glow
            items={[
              { value: 'all', label: t('projects.tabs.all') },
              { value: 'mine', label: t('projects.tabs.mine') },
            ]}
          />
        )}
        <div className="relative flex-1 sm:max-w-sm">
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
        {error ? (
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
