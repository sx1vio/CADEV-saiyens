import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Command } from 'cmdk';
import {
  Award,
  Briefcase,
  FileCode2,
  FolderPlus,
  GraduationCap,
  Languages,
  LifeBuoy,
  Map,
  Moon,
  Newspaper,
  PenSquare,
  PlaySquare,
  Search,
  Sun,
  UserRound,
  WifiOff,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { setLanguage, useLang } from '@/i18n';
import { useQuery } from '@/lib/query';
import { useNetwork } from '@/offline/network';
import { api } from '@/services';
import { useSession, useUI } from '@/stores/app';
import { RoomMark } from '../domain';
import { Sheet } from '../ui/overlay';
import { Avatar, Kbd } from '../ui/primitives';
import { ALL_NAV } from './nav';
import { POSTS } from '@/platform/data/feed';
import { JOBS } from '@/platform/data/jobs';
import { SKILLS } from '@/platform/data/skills';
import { VIDEOS } from '@/platform/data/videos';
import { PATHS } from '@/platform/data/learn';
import { PLATFORM_CERTS } from '@/platform/data/certs';
import { fetchNews, type NewsItem } from '@/platform/news';

/**
 * Palette Ctrl/Cmd+K (T5) : recherche globale (questions, salles, devs) + actions + navigation.
 * Raccourcis globaux : G puis H/S/P/D, N (je suis bloqué), [ (replier la barre), ? (aide).
 */
export function CommandPalette() {
  const { t } = useTranslation();
  const lang = useLang();
  const nav = useNavigate();
  const open = useUI((s) => s.paletteOpen);
  const setOpen = useUI((s) => s.setPalette);
  const { setAsk, theme, setTheme, startTour } = useUI();
  const me = useSession((s) => s.user);
  const setSim = useNetwork((s) => s.setSim);
  const sim = useNetwork((s) => s.sim);
  const [q, setQ] = useState('');

  const { data: questions } = useQuery(open ? 'palette:questions' : null, () =>
    api.listQuestions('all'),
  );
  const { data: rooms } = useQuery(open ? 'palette:rooms' : null, () => api.listRooms());
  const { data: devs } = useQuery(open ? 'palette:devs' : null, () => api.discoverDevs({}));
  // Recherche dans les actualités réelles (serveur), avec un léger délai pour ne pas surcharger
  const [newsQ, setNewsQ] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setNewsQ(q.trim().length > 2 ? q.trim() : ''), 250);
    return () => clearTimeout(id);
  }, [q]);
  const { data: news } = useQuery<NewsItem[]>(open && newsQ ? `palette:news:${newsQ}` : null, () =>
    fetchNews({ q: newsQ, limit: 8 }),
  );

  useEffect(() => {
    if (!open) setQ('');
  }, [open]);

  const go = (to: string) => {
    setOpen(false);
    nav(to);
  };
  const run = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  const pages = useMemo(
    () => [
      ...ALL_NAV.filter((e) => e.to !== '/admin' || me?.isAdmin),
      ...(me ? [{ to: `/u/${me.handle}`, icon: UserRound, label: t('nav.myPassport') }] : []),
    ],
    [t, me],
  );

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="dh-instant fixed inset-0 z-50 bg-[var(--scrim)] backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="dh-instant fixed top-[12dvh] left-1/2 z-50 w-[calc(100%-24px)] max-w-[640px] -translate-x-1/2 overflow-hidden rounded-[14px] bg-surface-1 shadow-lg focus:outline-none"
        >
          <DialogPrimitive.Title className="sr-only">
            {t('nav.searchPlaceholder')}
          </DialogPrimitive.Title>
          <Command label={t('nav.searchPlaceholder')} loop>
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search className="size-[18px] text-subtle" />
              <Command.Input
                value={q}
                onValueChange={setQ}
                autoFocus
                placeholder={t('nav.searchPlaceholder')}
                className="h-14 flex-1 bg-transparent text-[15px] text-fg placeholder:text-subtle focus:outline-none"
              />
              <Kbd>Esc</Kbd>
            </div>
            <Command.List className="max-h-[min(60dvh,460px)] overflow-y-auto p-2">
              <Command.Empty>{t('sos.emptySearch', { q })}</Command.Empty>

              <Command.Group heading={t('nav.actions')}>
                <Command.Item
                  value="ask je suis bloqué stuck"
                  onSelect={() => run(() => setAsk(true))}
                >
                  <Zap className="text-accent-text" />
                  {t('nav.ask')}
                  <Kbd className="ml-auto">N</Kbd>
                </Command.Item>
                <Command.Item value="publier post publish" onSelect={() => go('/publier')}>
                  <PenSquare />
                  Publier un post
                </Command.Item>
                <Command.Item
                  value="offre emploi publier job"
                  onSelect={() => go('/emplois/publier')}
                >
                  <Briefcase />
                  Publier une offre d’emploi
                </Command.Item>
                <Command.Item
                  value="new room nouvelle salle"
                  onSelect={() => go('/projets/nouvelle')}
                >
                  <FolderPlus />
                  {t('nav.newRoom')}
                </Command.Item>
                <Command.Item
                  value="theme thème dark light"
                  onSelect={() => run(() => setTheme(theme === 'dark' ? 'light' : 'dark'))}
                >
                  {theme === 'dark' ? <Sun /> : <Moon />}
                  {theme === 'dark' ? t('nav.themeLight') : t('nav.themeDark')}
                </Command.Item>
                <Command.Item
                  value="language langue english français"
                  onSelect={() => run(() => setLanguage(lang === 'fr' ? 'en' : 'fr'))}
                >
                  <Languages />
                  {lang === 'fr' ? 'English' : 'Français'}
                </Command.Item>
                <Command.Item
                  value="offline hors ligne simulateur network"
                  onSelect={() => run(() => setSim(sim === 'offline' ? 'off' : 'offline'))}
                >
                  <WifiOff />
                  {t('network.simulator')} ·{' '}
                  {sim === 'offline' ? t('network.simOff') : t('network.simOffline')}
                </Command.Item>
                {me && (
                  <Command.Item
                    value="tour visite djeli"
                    onSelect={() =>
                      run(() => {
                        nav('/');
                        startTour();
                      })
                    }
                  >
                    <Map />
                    {t('nav.tour')}
                  </Command.Item>
                )}
              </Command.Group>

              <Command.Group heading={t('nav.goTo')}>
                {pages.map((p) => (
                  <Command.Item key={p.to} value={`page ${p.label}`} onSelect={() => go(p.to)}>
                    <p.icon />
                    {p.label}
                  </Command.Item>
                ))}
              </Command.Group>

              {q.length > 1 && (
                <>
                  {!!news?.length && (
                    <Command.Group heading="Actualités">
                      {news.map((x) => (
                        <Command.Item
                          key={x.id}
                          value={`actu ${q} ${x.title}`}
                          onSelect={() =>
                            x.kind === 'video'
                              ? go(`/videos/yt/${x.extra.videoId as string}`)
                              : run(() => window.open(x.url, '_blank', 'noopener'))
                          }
                        >
                          {x.kind === 'video' ? <PlaySquare /> : <Newspaper />}
                          <span className="truncate">
                            {x.title} <span className="text-subtle">· {x.sourceName}</span>
                          </span>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  )}
                  <Command.Group heading="Fil">
                    {POSTS.map((x) => (
                      <Command.Item
                        key={x.id}
                        value={`p ${x.title} ${x.tags.join(' ')}`}
                        onSelect={() => go(`/post/${x.id}`)}
                      >
                        <Newspaper />
                        <span className="truncate">{x.title}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                  <Command.Group heading="Emplois">
                    {JOBS.map((x) => (
                      <Command.Item
                        key={x.id}
                        value={`j ${x.title} ${x.stack.join(' ')} ${x.city}`}
                        onSelect={() => go(`/emplois/${x.id}`)}
                      >
                        <Briefcase />
                        <span className="truncate">
                          {x.title} <span className="text-subtle">· {x.city}</span>
                        </span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                  <Command.Group heading="Skills & plugins">
                    {SKILLS.map((x) => (
                      <Command.Item
                        key={x.id}
                        value={`s ${x.name} ${x.summary} ${x.category}`}
                        onSelect={() => go(`/skills/${x.id}`)}
                      >
                        <FileCode2 />
                        <span className="truncate font-mono">{x.name}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                  <Command.Group heading="Vidéos">
                    {VIDEOS.map((x) => (
                      <Command.Item
                        key={x.id}
                        value={`v ${x.title} ${x.tags.join(' ')}`}
                        onSelect={() => go(`/videos/${x.id}`)}
                      >
                        <PlaySquare />
                        <span className="truncate">{x.title}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                  <Command.Group heading="Apprendre et certifications">
                    {PATHS.map((x) => (
                      <Command.Item
                        key={x.id}
                        value={`l ${x.title} ${x.tagline}`}
                        onSelect={() => go(`/apprendre/${x.id}`)}
                      >
                        <GraduationCap />
                        <span className="truncate">{x.title}</span>
                      </Command.Item>
                    ))}
                    {PLATFORM_CERTS.map((x) => (
                      <Command.Item
                        key={x.id}
                        value={`c certification ${x.title}`}
                        onSelect={() => go(`/certifications/${x.id}`)}
                      >
                        <Award />
                        <span className="truncate">{x.title}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                  <Command.Group heading={t('nav.sos')}>
                    {questions?.slice(0, 40).map((x) => (
                      <Command.Item
                        key={x.id}
                        value={`q ${x.title} ${x.tags.map((tg) => tg.label).join(' ')}`}
                        onSelect={() => go(`/sos/${x.id}`)}
                      >
                        <LifeBuoy
                          className={x.status === 'resolved' ? 'text-success' : 'text-accent-text'}
                        />
                        <span className="truncate">{x.title}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                  <Command.Group heading={t('nav.projects')}>
                    {rooms?.map((r) => (
                      <Command.Item
                        key={r.id}
                        value={`r ${r.name} ${r.tagline}`}
                        onSelect={() => go(`/p/${r.inviteCode}`)}
                      >
                        <RoomMark name={r.name} size={22} />
                        <span className="truncate">
                          {r.name} <span className="text-subtle">· {r.tagline}</span>
                        </span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                  <Command.Group heading={t('nav.discover')}>
                    {devs?.map((d) => (
                      <Command.Item
                        key={d.id}
                        value={`d ${d.displayName} ${d.handle} ${d.city} ${d.topSkills.map((s) => s.tag.label).join(' ')}`}
                        onSelect={() => go(`/u/${d.handle}`)}
                      >
                        <Avatar name={d.displayName} src={d.avatarUrl} size={22} />
                        <span className="truncate">
                          {d.displayName}{' '}
                          <span className="text-subtle">
                            ·{' '}
                            {d.topSkills
                              .slice(0, 2)
                              .map((s) => s.tag.label)
                              .join(', ')}
                          </span>
                        </span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                </>
              )}
            </Command.List>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function ShortcutsDialog() {
  const { t } = useTranslation();
  const open = useUI((s) => s.shortcutsOpen);
  const setOpen = useUI((s) => s.setShortcuts);
  const rows: [string[], string][] = [
    [['Ctrl', 'K'], t('nav.searchPlaceholder')],
    [['/'], t('common.search')],
    [['N'], t('nav.ask')],
    [['G', 'H'], t('nav.home')],
    [['G', 'S'], t('nav.sos')],
    [['G', 'P'], t('nav.projects')],
    [['G', 'D'], t('nav.discover')],
    [['G', 'C'], t('nav.leaderboard')],
    [['['], t('nav.collapse')],
    [['?'], t('nav.shortcuts')],
  ];
  return (
    <Sheet open={open} onOpenChange={setOpen} title={t('nav.shortcuts')} size="sm">
      <ul className="flex flex-col divide-y divide-line">
        {rows.map(([keys, label]) => (
          <li
            key={label}
            className="flex items-center justify-between gap-4 py-2.5 text-sm text-muted"
          >
            {label}
            <span className="flex gap-1">
              {keys.map((k) => (
                <Kbd key={k}>{k}</Kbd>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
