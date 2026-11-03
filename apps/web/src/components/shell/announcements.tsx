import type { ActiveAnnouncementsResponse } from '@devhub/contracts';
import { Info, PartyPopper, TriangleAlert, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@/lib/query';
import { cn } from '@/lib/utils';

type Item = ActiveAnnouncementsResponse['data'][number];
const KEY = 'dh-announcements-closed';

const readClosed = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
};

const fetchAnnouncements = async (): Promise<Item[]> => {
  const res = await fetch('/api/v1/announcements', { headers: { Accept: 'application/json' } });
  if (!res.ok) return [];
  return ((await res.json()) as ActiveAnnouncementsResponse).data;
};

const TONE = {
  info: { cls: 'bg-accent-soft text-accent-text', Icon: Info },
  warning: { cls: 'bg-warning-soft text-warning', Icon: TriangleAlert },
  success: { cls: 'bg-success-soft text-success', Icon: PartyPopper },
} as const;

/** Annonces publiées depuis l'administration (maintenance, événement), refermables. */
export function AnnouncementBar() {
  const { data } = useQuery('announcements', fetchAnnouncements);
  const [closed, setClosed] = useState(readClosed);
  const shown = (data ?? []).filter((a) => !closed.includes(a.id));
  if (!shown.length) return null;
  const close = (id: string) => {
    const next = [...closed, id].slice(-30);
    setClosed(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* stockage indisponible : fermé pour cette visite seulement */
    }
  };
  return (
    <div className="flex flex-col gap-2 px-4 pt-3 sm:px-6">
      {shown.map((a) => {
        const { cls, Icon } = TONE[a.level];
        return (
          <div
            key={a.id}
            role="status"
            className={cn('flex items-start gap-2.5 rounded-[12px] px-4 py-2.5 text-[14px]', cls)}
          >
            <Icon className="mt-0.5 size-4 shrink-0" />
            <p className="min-w-0 flex-1 font-medium">
              {a.message}
              {a.linkUrl &&
                (a.linkUrl.startsWith('/') ? (
                  <Link to={a.linkUrl} className="ml-2 font-semibold underline underline-offset-2">
                    {a.linkLabel ?? 'En savoir plus'}
                  </Link>
                ) : (
                  <a
                    href={a.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 font-semibold underline underline-offset-2"
                  >
                    {a.linkLabel ?? 'En savoir plus'}
                  </a>
                ))}
            </p>
            <button
              type="button"
              onClick={() => close(a.id)}
              aria-label="Fermer l’annonce"
              className="-m-1 rounded-full p-1 opacity-70 hover:opacity-100"
            >
              <X className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
