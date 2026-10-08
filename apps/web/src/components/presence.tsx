import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useQuery } from '@/lib/query';
import { cn } from '@/lib/utils';
import type { AvailabilityStatus, DevCard, UserSummary } from '@/services';
import { api } from '@/services';
import { preload } from './domain';
import { Avatar, Skeleton } from './ui/primitives';

const DOT: Record<AvailabilityStatus, string> = {
  now: 'bg-success',
  today: 'bg-warning',
  busy: 'bg-subtle',
};

/** Avatar + pastille de présence (comme Discord). */
export function PresenceAvatar({
  user,
  status,
  size = 32,
  ring = 'ring-surface-1',
}: {
  user: Pick<UserSummary, 'displayName' | 'avatarUrl'>;
  status?: AvailabilityStatus;
  size?: number;
  ring?: string;
}) {
  const dot = Math.max(10, Math.round(size * 0.32));
  return (
    <span className="relative inline-flex shrink-0">
      <Avatar name={user.displayName} src={user.avatarUrl} size={size} />
      {status && (
        <span
          aria-hidden
          className={cn(
            'absolute -right-0.5 -bottom-0.5 rounded-full ring-[3px]',
            ring,
            DOT[status],
          )}
          style={{ width: dot, height: dot }}
        />
      )}
    </span>
  );
}

/**
 * Liste des membres façon Discord : groupés par disponibilité, avec une ligne d'activité
 * (stack principale + intention). Sert de 4e colonne sur le QG.
 */
export function MembersPanel({ className, limit = 14 }: { className?: string; limit?: number }) {
  const { t } = useTranslation();
  const { data } = useQuery('devs:presence', () => api.discoverDevs({}));
  const groups: { key: AvailabilityStatus; label: string; devs: DevCard[] }[] = (
    ['now', 'today', 'busy'] as AvailabilityStatus[]
  ).map((k) => ({
    key: k,
    label: t(`presence.${k}`),
    devs: (data ?? []).filter((d) => d.availability.status === k),
  }));
  return (
    <section aria-label={t('presence.title')} className={cn('flex flex-col gap-5', className)}>
      {!data && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="h-3.5 flex-1" />
            </div>
          ))}
        </div>
      )}
      {data &&
        groups
          .filter((g) => g.devs.length)
          .map((g) => (
            <div key={g.key}>
              <h3 className="label-caps mb-1.5 px-2">
                {g.label} — {g.devs.length}
              </h3>
              <ul className="flex flex-col">
                {g.devs.slice(0, g.key === 'now' ? limit : Math.ceil(limit / 2)).map((d) => (
                  <li key={d.id}>
                    <Link
                      to={`/u/${d.handle}`}
                      onMouseEnter={() => preload.passport(d.handle)}
                      className={cn(
                        'group flex items-center gap-3 rounded-[10px] px-2 py-1.5 transition-colors hover:bg-surface-2',
                        g.key === 'busy' && 'opacity-60 hover:opacity-100',
                      )}
                    >
                      <PresenceAvatar user={d} status={d.availability.status} size={32} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-semibold text-fg">
                          {d.displayName}
                        </span>
                        <span className="block truncate text-[11.5px] text-subtle">
                          {d.topSkills[0]
                            ? `${d.topSkills[0].tag.label} · ${d.topSkills[0].score}`
                            : d.city}
                          {d.lookingFor.includes('helping') && ` · ${t('presence.helps')}`}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
    </section>
  );
}
