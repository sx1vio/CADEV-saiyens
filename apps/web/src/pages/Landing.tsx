import {
  ArrowRight,
  Bookmark,
  ExternalLink,
  LifeBuoy,
  Newspaper,
  Share2,
  BadgeCheck,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { errorText } from '@/components/domain';
import { Button, ButtonLink } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/primitives';
import { invalidate, useQuery } from '@/lib/query';
import { api } from '@/services';
import { useSession } from '@/stores/app';
import { BrandLogo } from '@/platform/logos';
import { fetchHome, img, type HomeNews } from '@/platform/news';
import { SourceMark } from '@/platform/newsui';
import { Ago } from '@/platform/ui';

/** Ce que la plateforme fait, en trois idées (pas neuf). */
const PILLARS = [
  {
    icon: Newspaper,
    title: 'Reste à jour',
    text: 'Un seul fil pour l’actu IA, tech et dev, tirée de plus de 70 sources, en français et en anglais.',
  },
  {
    icon: LifeBuoy,
    title: 'Débloque-toi',
    text: 'Une piste en quelques secondes, puis l’aide d’un dev qui a déjà résolu le même problème.',
  },
  {
    icon: BadgeCheck,
    title: 'Prouve ce que tu sais',
    text: 'Ton profil se remplit depuis GitHub, tes certifications et ton aide. Les recruteurs le voient.',
  },
];

/** Page publique : une promesse, une preuve (un vrai article du fil), un bouton. */
export default function Landing() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const setUser = useSession((s) => s.setUser);
  const [busy, setBusy] = useState(false);
  const { data: news } = useQuery<HomeNews>('news:home:all', () => fetchHome('all'));

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
          <h1 className="text-[40px] leading-[1.08] font-bold tracking-[-0.035em] text-fg sm:text-[56px]">
            Le fil des développeurs.
          </h1>
          <p className="mt-5 max-w-md text-[17px] leading-relaxed text-muted">
            L’actualité tech qui compte, de l’aide quand tu bloques, et un profil qui prouve ce que
            tu sais faire.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink to="/inscription" variant="primary" size="lg">
              <BrandLogo name="GitHub" size={18} mono />
              Créer un compte
            </ButtonLink>
            <Button variant="secondary" size="lg" loading={busy} onClick={tryDemo}>
              Visiter sans compte
              <ArrowRight />
            </Button>
          </div>
          <p className="mt-4 text-[13px] text-subtle">Gratuit, sans publicité.</p>
        </div>

        {/* Preuve : un vrai article du fil, tel qu'il apparaît dans la plateforme */}
        <div className="relative mx-auto w-full max-w-[460px]">
          <div
            aria-hidden
            className="dh-glow absolute -top-4 right-0 left-10 h-[85%] rotate-[3deg] rounded-[28px] opacity-90 sm:-top-5 sm:-right-4"
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
                  <ExternalLink className="size-4" /> Lire
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Bookmark className="size-4" /> Enregistrer
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Share2 className="size-4" /> Partager
                </span>
              </footer>
            </article>
          ) : (
            <Skeleton className="relative h-[400px] rounded-[20px]" />
          )}
        </div>
      </section>

      {/* Trois idées */}
      <section className="grid gap-4 sm:grid-cols-3">
        {PILLARS.map((p) => (
          <div key={p.title} className="dh-card p-6">
            <span className="grid size-11 place-items-center rounded-[14px] bg-accent-soft text-accent-text">
              <p.icon className="size-5" />
            </span>
            <h2 className="mt-5 text-[17px] font-bold tracking-[-0.02em] text-fg">{p.title}</h2>
            <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{p.text}</p>
          </div>
        ))}
      </section>

      {/* Appel final */}
      <section className="dh-ink mt-16 flex flex-col items-start gap-6 rounded-[28px] p-8 sm:flex-row sm:items-center sm:p-10">
        <div className="flex-1">
          <h2 className="text-[26px] leading-tight font-bold tracking-[-0.03em] sm:text-[32px]">
            Rejoins la communauté.
          </h2>
          <p className="mt-2 max-w-lg text-[15px] text-white/65">
            Connecte GitHub : ton profil est prêt en une minute.
          </p>
        </div>
        <ButtonLink to="/inscription" variant="secondary" size="lg">
          Créer un compte
          <ArrowRight />
        </ButtonLink>
      </section>
    </div>
  );
}
