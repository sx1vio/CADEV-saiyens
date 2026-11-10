import { Briefcase, Clock, ExternalLink, Globe2, Info, MapPin, Share2, Wallet } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/primitives';
import { useQuery } from '@/lib/query';
import { cn } from '@/lib/utils';
import { fetchNewsItem, img, type NewsItem } from '@/platform/news';
import { Ago } from '@/platform/ui';

/**
 * Offre d'emploi collectée en direct (Remotive, Jobicy, Himalayas, pages carrières…), lue sur
 * DevHub sans quitter le site (demande de Sylvio, 10/11/2026). La candidature se fait chez
 * l'éditeur de l'offre, toujours cité : c'est la condition d'utilisation de ces sources.
 */
export default function JobDirect() {
  const { id = '' } = useParams();
  const { data: job, error } = useQuery<NewsItem>(`news:item:${id}`, () => fetchNewsItem(id));

  if (error && !job) {
    return (
      <div className="dh-page mx-auto w-full max-w-[880px] px-4 py-10 sm:px-6">
        <div className="surface-card p-8 text-center">
          <h1 className="text-[22px] font-bold text-fg">Cette offre n’est plus en ligne</h1>
          <p className="mt-2 text-[15px] text-muted">
            Elle a été pourvue ou retirée par l’entreprise. Les offres du moment t’attendent.
          </p>
          <Link
            to="/emplois"
            className="lg-tint mt-6 inline-flex h-11 items-center rounded-full px-5 text-[15px] font-semibold"
          >
            Voir les offres
          </Link>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="dh-page mx-auto w-full max-w-[880px] space-y-4 px-4 py-6 sm:px-6">
        <Skeleton className="h-40" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const x = job.extra;
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  const description = str(x.description);
  const facts = [
    { icon: MapPin, label: 'Lieu', value: str(x.location) },
    { icon: Clock, label: 'Contrat', value: str(x.jobType)?.replace(/_/g, '-') ?? null },
    { icon: Briefcase, label: 'Niveau', value: str(x.level) },
    { icon: Wallet, label: 'Salaire', value: str(x.salary) },
    { icon: Globe2, label: 'Télétravail', value: str(x.workplace) },
  ].filter((f): f is { icon: typeof MapPin; label: string; value: string } => !!f.value);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: job.title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success('Lien copié');
      }
    } catch {
      /* partage annulé */
    }
  };

  return (
    <div className="dh-page mx-auto w-full max-w-[1120px] px-4 py-6 sm:px-6">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article className="min-w-0">
          <header className="surface-card p-5 sm:p-7">
            <div className="flex items-start gap-4">
              {job.image ? (
                <img
                  src={img(job.image, 128) ?? ''}
                  alt=""
                  className="size-16 shrink-0 rounded-[14px] bg-white object-contain p-1.5 ring-1 ring-line"
                />
              ) : (
                <span className="grid size-16 shrink-0 place-items-center rounded-[14px] bg-accent-soft text-accent-text">
                  <Briefcase className="size-7" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <h1 className="text-[24px] leading-tight font-bold tracking-[-0.02em] text-fg sm:text-[30px]">
                  {job.title}
                </h1>
                {job.author && (
                  <p className="mt-1 text-[16px] font-medium text-fg/80">{job.author}</p>
                )}
                <p className="mt-1 text-[13.5px] text-subtle">
                  Publiée <Ago iso={job.publishedAt} /> · via {job.sourceName}
                </p>
              </div>
            </div>

            {facts.length > 0 && (
              <dl className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {facts.map((f) => (
                  <div
                    key={f.label}
                    className="flex items-center gap-3 rounded-[12px] bg-surface-2 px-3.5 py-2.5"
                  >
                    <f.icon className="size-4 shrink-0 text-accent-text" aria-hidden />
                    <dt className="sr-only">{f.label}</dt>
                    <dd className="min-w-0 text-[14px] font-medium break-words text-fg">
                      {f.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="lg-tint lp-press inline-flex h-11 items-center gap-2 rounded-full px-5 text-[15px] font-semibold"
              >
                Postuler sur {job.sourceName}
                <ExternalLink className="size-4" />
              </a>
              <button
                type="button"
                onClick={share}
                className="lg-clear inline-flex h-11 items-center gap-2 rounded-full px-4 text-[15px] font-semibold text-fg"
              >
                <Share2 className="size-4" />
                Partager
              </button>
            </div>
          </header>

          <section aria-label="Description du poste" className="surface-card mt-4 p-5 sm:p-7">
            <h2 className="text-[18px] font-semibold text-fg">Le poste</h2>
            {description ? (
              <JobText text={description} />
            ) : (
              <p className="mt-3 text-[15px] leading-relaxed text-fg/85">
                {job.summary || 'L’éditeur n’a pas fourni de description.'}
              </p>
            )}
            {job.lang === 'en' && (
              <p className="mt-6 flex items-start gap-2 rounded-[12px] bg-surface-2 px-3.5 py-3 text-[13.5px] text-muted">
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
                Offre rédigée en anglais par l’entreprise : l’entretien se passera sans doute en
                anglais.
              </p>
            )}
          </section>
        </article>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
          <div className="surface-card p-5">
            <h2 className="text-[15px] font-semibold text-fg">Avant de postuler</h2>
            <ul className="mt-3 flex flex-col gap-2.5 text-[14px] text-fg/85">
              <li>
                <Link to="/reglages" className="font-semibold text-accent-text hover:underline">
                  Complète ton profil
                </Link>{' '}
                : compétences, GitHub et disponibilité.
              </li>
              <li>
                <Link
                  to="/certifications"
                  className="font-semibold text-accent-text hover:underline"
                >
                  Passe une certification
                </Link>{' '}
                : un code que le recruteur peut vérifier.
              </li>
              <li>Mets le lien de ton profil DevHub dans ta candidature.</li>
            </ul>
          </div>
          <p className="px-1 text-[12.5px] leading-relaxed text-subtle">
            Offre collectée chez {job.sourceName}, qui en reste l’éditeur. DevHub la relaie telle
            quelle ; la candidature se fait sur son site.
          </p>
        </aside>
      </div>
    </div>
  );
}

/** Texte de l'offre : paragraphes, puces et intertitres (lignes courtes sans point final). */
function JobText({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className="mt-3 flex flex-col gap-3 text-[15px] leading-relaxed text-fg/85">
      {blocks.map((block, i) => {
        const lines = block.split('\n').filter((l) => l.trim());
        if (lines.length === 0) return null;
        if (lines.every((l) => l.startsWith('• ')))
          return (
            <ul key={i} className="flex list-disc flex-col gap-1.5 pl-5 marker:text-accent-text">
              {lines.map((l, j) => (
                <li key={j}>{l.slice(2)}</li>
              ))}
            </ul>
          );
        const heading =
          lines.length === 1 && lines[0]!.length <= 70 && !/[.!?;,]$/.test(lines[0]!.trim());
        return heading ? (
          <h3 key={i} className={cn('pt-2 text-[16px] font-semibold text-fg')}>
            {lines[0]}
          </h3>
        ) : (
          <p key={i} className="whitespace-pre-line">
            {lines.join('\n')}
          </p>
        );
      })}
    </div>
  );
}
