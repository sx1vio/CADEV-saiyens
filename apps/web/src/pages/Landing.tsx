import {
  ArrowRight,
  Bookmark,
  CircleCheck,
  CircleHelp,
  ExternalLink,
  LifeBuoy,
  Newspaper,
  Share2,
  BadgeCheck,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { errorText } from '@/components/domain';
import { Button, ButtonLink } from '@/components/ui/button';
import { Avatar, Skeleton } from '@/components/ui/primitives';
import { countryName } from '@/lib/geo';
import { invalidate, useQuery } from '@/lib/query';
import { api } from '@/services';
import type { PublicLanding } from '@/services/types';
import { useSession } from '@/stores/app';
import { BrandLogo } from '@/platform/logos';
import { fetchHome, img, type HomeNews } from '@/platform/news';
import { SourceMark } from '@/platform/newsui';
import { Ago } from '@/platform/ui';

/** Ce que la plateforme fait, en trois idées (pas neuf). */
const PILLARS = [
  {
    icon: Newspaper,
    title: 'pub.pillarNewsTitle',
    text: 'pub.pillarNewsText',
  },
  {
    icon: LifeBuoy,
    title: 'pub.pillarHelpTitle',
    text: 'pub.pillarHelpText',
  },
  {
    icon: BadgeCheck,
    title: 'pub.pillarProveTitle',
    text: 'pub.pillarProveText',
  },
];

/** Page publique : une promesse, une preuve (un vrai article du fil), un bouton. */
export default function Landing() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const setUser = useSession((s) => s.setUser);
  const [busy, setBusy] = useState(false);
  const { data: news, loading: newsLoading } = useQuery<HomeNews>('news:home:all', () =>
    fetchHome('all'),
  );

  const tryDemo = async () => {
    setBusy(true);
    try {
      const u = await api.loginDemo('awa-kone');
      setUser(u);
      invalidate('');
      nav('/');
    } catch (e) {
      toast.error(errorText(t, e));
    } finally {
      setBusy(false);
    }
  };

  const story = news?.hero.find((h) => h.image) ?? news?.hero[0];

  return (
    <div className="dh-page mx-auto flex max-w-6xl flex-col overflow-x-clip px-4 sm:px-6">
      {/* Promesse */}
      <section className="grid items-center gap-12 pt-10 pb-16 sm:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pt-20">
        <div>
          <h1 className="text-[40px] leading-[1.08] font-bold tracking-[-0.02em] text-fg sm:text-[56px]">
            {t('pub.brandLine')}
          </h1>
          <p className="mt-5 max-w-md text-[17px] leading-relaxed text-muted">
            {t('pub.heroText')}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink to="/inscription" variant="primary" size="lg">
              <BrandLogo name="GitHub" size={18} mono />
              {t('pub.createAccount')}
            </ButtonLink>
            {/* Les comptes de démonstration n'existent qu'avec le serveur simulé (ADR-0016). */}
            {api.mode === 'local' && (
              <Button variant="secondary" size="lg" loading={busy} onClick={tryDemo}>
                {t('pub.visit')}
                <ArrowRight />
              </Button>
            )}
          </div>
          <p className="mt-4 text-[13px] text-subtle">{t('pub.free')}</p>
        </div>

        {/* Preuve : un vrai article du fil, tel qu'il apparaît dans la plateforme (masqué sans actualité) */}
        {(story || newsLoading) && (
          <div className="relative mx-auto w-full max-w-[460px]">
            <div
              aria-hidden
              className="dh-glow absolute -top-4 right-0 left-10 h-[85%] rotate-[3deg] rounded-[10px] opacity-90 sm:-top-5 sm:-right-4"
            />
            {story ? (
              <article className="dh-card relative overflow-hidden">
                <header className="flex items-center gap-3 px-5 pt-4">
                  <SourceMark item={story} size={36} />
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-fg">{story.sourceName}</p>
                    <p className="text-[12px] text-subtle">
                      <Ago iso={story.publishedAt} />
                    </p>
                  </div>
                </header>
                <p className="line-clamp-3 px-5 pt-3 pb-4 text-[16px] leading-snug font-semibold text-fg">
                  {story.title}
                </p>
                {story.image && (
                  <img
                    src={img(story.image, 960) ?? ''}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="aspect-[16/9] w-full bg-surface-2 object-cover"
                  />
                )}
                <footer className="flex items-center justify-around px-2 py-2.5 text-[13px] font-semibold text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <ExternalLink className="size-4" /> {t('pub.read')}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Bookmark className="size-4" /> {t('pub.save')}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Share2 className="size-4" /> {t('pub.share')}
                  </span>
                </footer>
              </article>
            ) : (
              <Skeleton className="relative h-[400px] rounded-[10px]" />
            )}
          </div>
        )}
      </section>

      <LiveSection />

      {/* Trois idées */}
      <section className="grid gap-4 sm:grid-cols-3">
        {PILLARS.map((p) => (
          <div key={p.title} className="dh-card p-6">
            <span className="grid size-11 place-items-center rounded-[10px] bg-accent-soft text-accent-text">
              <p.icon className="size-5" />
            </span>
            <h2 className="mt-5 text-[17px] font-bold tracking-[-0.02em] text-fg">{t(p.title)}</h2>
            <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{t(p.text)}</p>
          </div>
        ))}
      </section>

      {/* Appel final */}
      <section className="dh-ink mt-16 flex flex-col items-start gap-6 rounded-[10px] p-8 sm:flex-row sm:items-center sm:p-10">
        <div className="flex-1">
          <h2 className="text-[26px] leading-tight font-bold tracking-[-0.02em] sm:text-[32px]">
            {t('pub.ctaTitle')}
          </h2>
          <p className="mt-2 max-w-lg text-[15px] text-white/65">{t('pub.ctaText')}</p>
        </div>
        <ButtonLink to="/inscription" variant="secondary" size="lg">
          {t('pub.createAccount')}
          <ArrowRight />
        </ButtonLink>
      </section>
    </div>
  );
}

/** Le flux « en direct » se rafraîchit seul tant que la page est visible. */
const LIVE_REFRESH_MS = 30_000;

/**
 * T1 : ce qui se passe vraiment sur DevHub, sans compte. Compteurs de l'écran d'impact,
 * questions récentes (anonymes) et trois Passports. Rien n'est inventé : sans données,
 * la page le dit.
 */
function LiveSection() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith('en') ? 'en' : 'fr';
  const { data, error, refresh } = useQuery<PublicLanding>('landing:live', () => api.getLanding());

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh().catch(() => {});
    }, LIVE_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  const stats = [
    { label: t('pub.liveDevs'), value: data?.stats.devs },
    { label: t('pub.liveResolved'), value: data?.stats.questionsResolved },
    { label: t('pub.liveCountries'), value: data?.stats.countries },
  ];

  return (
    <section aria-labelledby="live-title" className="mb-16">
      <div className="flex items-center gap-2">
        <span aria-hidden className="relative flex size-2.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60 motion-reduce:hidden" />
          <span className="relative inline-flex size-2.5 rounded-full bg-success" />
        </span>
        <h2 id="live-title" className="text-[20px] font-bold tracking-[-0.02em] text-fg">
          {t('pub.liveTitle')}
        </h2>
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="dh-card px-4 py-4 sm:px-6">
            <dt className="text-[13px] text-muted">{s.label}</dt>
            <dd className="mt-1 text-[26px] font-bold tracking-[-0.02em] text-fg tabular-nums sm:text-[32px]">
              {s.value === undefined ? error ? '—' : <Skeleton className="h-8 w-14" /> : s.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="dh-card p-5">
          <h3 className="text-[15px] font-semibold text-fg">{t('pub.liveFeed')}</h3>
          {!data && !error ? (
            <div className="mt-4 space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : !data?.live.length ? (
            <p className="mt-3 text-[14px] leading-relaxed text-muted">
              {error ? t('pub.liveUnavailable') : t('pub.liveEmpty')}
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-line" aria-live="polite">
              {data.live.map((a) => (
                <li key={a.id} className="flex items-start gap-3 py-2.5">
                  {a.kind === 'resolved' ? (
                    <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
                  ) : (
                    <CircleHelp aria-hidden className="mt-0.5 size-4 shrink-0 text-accent-text" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-muted">
                      {a.kind === 'resolved'
                        ? t('pub.liveResolvedIn', { count: Number(a.detail) || 1 })
                        : t('pub.liveAsked')}
                      {' · '}
                      <Ago iso={a.createdAt} />
                    </p>
                    <Link
                      to={a.targetHref}
                      className="line-clamp-1 text-[14px] font-medium text-fg hover:underline"
                    >
                      {a.targetLabel}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="dh-card p-5">
          <h3 className="text-[15px] font-semibold text-fg">{t('pub.liveFeatured')}</h3>
          {data && !data.featured.length ? (
            <p className="mt-3 text-[14px] leading-relaxed text-muted">{t('pub.liveNoDevs')}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {(data?.featured ?? []).map((d) => (
                <li key={d.handle}>
                  <Link
                    to={`/u/${d.handle}`}
                    className="flex items-center gap-3 rounded-[8px] p-2 hover:bg-surface-1"
                  >
                    <Avatar name={d.displayName} src={d.avatarUrl ?? undefined} size={36} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold text-fg">
                        {d.displayName}
                      </span>
                      <span className="block truncate text-[12px] text-subtle">
                        {[countryName(d.country, lang), `${d.totalXp} Proof XP`]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
