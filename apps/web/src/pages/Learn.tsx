import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  Code2,
  FlaskConical,
  GraduationCap,
  ListChecks,
  Rocket,
  Users,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Button, ButtonLink } from '@/components/ui/button';
import { CodeBlock } from '@/components/ui/code';
import { LEVEL_LABEL, PLATFORM_CERTS } from '@/platform/data/certs';
import { PATHS, lessonCount } from '@/platform/data/learn';
import { usePlatform } from '@/platform/store';
import type { LearnPath, Lesson } from '@/platform/types';
import { CertBadge, PersonAvatar, SERVICE_COLORS, ServiceHeader, compact } from '@/platform/ui';
import { BrandLogo, logoFor } from '@/platform/logos';
import { person } from '@/platform/data/people';
import { cn } from '@/lib/utils';
import NotFound from './NotFound';

const KIND_ICON: Record<Lesson['kind'], typeof BookOpen> = {
  lecture: BookOpen,
  exercice: Code2,
  quiz: ListChecks,
  projet: Rocket,
};
const KIND_LABEL: Record<Lesson['kind'], string> = {
  lecture: 'Cours',
  exercice: 'Exercice',
  quiz: 'Quiz',
  projet: 'Projet',
};

function useProgress(path: LearnPath) {
  const done = usePlatform((s) => s.lessonsDone);
  const total = lessonCount(path);
  const n = path.modules.reduce(
    (acc, m) => acc + m.lessons.filter((l) => done.includes(`${path.id}/${l.id}`)).length,
    0,
  );
  return { n, total, pct: Math.round((n / total) * 100), done };
}

/** Catalogue des parcours. */
export default function Learn() {
  const enrolled = usePlatform((s) => s.enrolled);
  const mine = PATHS.filter((p) => enrolled.includes(p.id));
  return (
    <div className="dh-page mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-6">
      <ServiceHeader
        icon={GraduationCap}
        color={SERVICE_COLORS.learn}
        title="Apprendre"
        subtitle="Des parcours gratuits, du premier HTML aux agents IA. Chaque parcours mène à une certification."
      />
      {mine.length > 0 && (
        <section className="mt-6">
          <h2 className="text-[16px] font-semibold text-fg">Reprendre</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {mine.map((p) => (
              <ResumeCard key={p.id} path={p} />
            ))}
          </div>
        </section>
      )}
      <section className="mt-8">
        <h2 className="text-[16px] font-semibold text-fg">Tous les parcours</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PATHS.map((p) => (
            <PathCard key={p.id} path={p} />
          ))}
        </div>
      </section>
    </div>
  );
}

function StackLogos({ stack, size = 18 }: { stack: string[]; size?: number }) {
  return (
    <span className="flex items-center gap-1.5">
      {stack
        .filter((t) => logoFor(t))
        .map((t) => (
          <span
            key={t}
            title={t}
            className="grid place-items-center rounded-[7px] bg-canvas"
            style={{ width: size + 14, height: size + 14 }}
          >
            <BrandLogo name={t} size={size} />
          </span>
        ))}
    </span>
  );
}

function ResumeCard({ path }: { path: LearnPath }) {
  const { n, total, pct, done } = useProgress(path);
  const nextLesson = path.modules
    .flatMap((m) => m.lessons)
    .find((l) => !done.includes(`${path.id}/${l.id}`));
  return (
    <Link
      to={nextLesson ? `/apprendre/${path.id}/${nextLesson.id}` : `/apprendre/${path.id}`}
      className="flex items-center gap-4 rounded-[20px] bg-surface-1 p-4 "
    >
      <StackLogos stack={path.stack.slice(0, 1)} size={22} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-fg">{path.title}</p>
        <p className="truncate text-[12.5px] text-subtle">
          {nextLesson ? `Suivant : ${nextLesson.title}` : 'Parcours terminé'}
        </p>
        <div className="mt-2 h-1 rounded-full bg-surface-3">
          <div className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <span className="text-[12.5px] font-medium text-muted tabular">
        {n}/{total}
      </span>
    </Link>
  );
}

function PathCard({ path }: { path: LearnPath }) {
  const cert = PLATFORM_CERTS.find((c) => c.id === path.certId);
  return (
    <Link
      to={`/apprendre/${path.id}`}
      className="group flex flex-col gap-3 rounded-[20px] bg-surface-1 p-4 transition-colors "
    >
      <div className="flex items-center justify-between">
        <StackLogos stack={path.stack} />
        <span className="rounded-full border border-line-strong px-2 py-0.5 text-[11.5px] font-medium text-muted">
          {LEVEL_LABEL[path.level]}
        </span>
      </div>
      <div>
        <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-fg group-hover:underline">
          {path.title}
        </h3>
        <p className="mt-0.5 text-[13px] text-muted">{path.tagline}</p>
      </div>
      <ol className="flex flex-col gap-1 text-[12.5px] text-muted">
        {path.modules.slice(0, 3).map((m, i) => (
          <li key={m.id} className="flex items-center gap-2">
            <span className="grid size-4 place-items-center rounded-full bg-surface-3 text-[10px] font-medium text-subtle tabular">
              {i + 1}
            </span>
            {m.title}
            <span className="text-subtle">
              · {m.lessons.length} leçon{m.lessons.length > 1 ? 's' : ''}
            </span>
          </li>
        ))}
      </ol>
      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-3 text-[12px] text-subtle">
        <span className="inline-flex items-center gap-1.5">
          <PersonAvatar handle={path.author} size={16} />
          {person(path.author).name}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3.5" />
          {path.hours} h
        </span>
        <span className="inline-flex items-center gap-1">
          <Users className="size-3.5" />
          {compact(path.learners)}
        </span>
        {cert && (
          <span className="ml-auto inline-flex items-center gap-1 text-fg">
            <Award className="size-3.5 text-[#f0b232]" />
            Certifiant
          </span>
        )}
      </div>
    </Link>
  );
}

/** Page d'un parcours : objectifs, programme, progression. */
export function PathPage() {
  const { pathId = '' } = useParams();
  const path = PATHS.find((p) => p.id === pathId);
  const enrolled = usePlatform((s) => s.enrolled.includes(pathId));
  const toggle = usePlatform((s) => s.toggle);
  const nav = useNavigate();
  if (!path) return <NotFound />;
  return (
    <PathView
      path={path}
      enrolled={enrolled}
      onStart={() => {
        if (!enrolled) toggle('enrolled', path.id);
        nav(`/apprendre/${path.id}/${path.modules[0].lessons[0].id}`);
      }}
    />
  );
}

function PathView({
  path,
  enrolled,
  onStart,
}: {
  path: LearnPath;
  enrolled: boolean;
  onStart: () => void;
}) {
  const { n, total, pct, done } = useProgress(path);
  const cert = PLATFORM_CERTS.find((c) => c.id === path.certId);
  return (
    <div className="dh-page">
      <div className="border-b border-line px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-[1000px]">
          <Link
            to="/apprendre"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-fg"
          >
            <ArrowLeft className="size-4" />
            Apprendre
          </Link>
          <div className="mt-5">
            <StackLogos stack={path.stack} size={20} />
          </div>
          <h1 className="mt-4 text-[26px] leading-tight font-semibold tracking-[-0.02em] text-fg">
            {path.title}
          </h1>
          <p className="mt-1.5 max-w-2xl text-[14px] text-muted">{path.tagline}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
            <span className="inline-flex items-center gap-1.5">
              <PersonAvatar handle={path.author} size={20} />
              par {person(path.author).name}
            </span>
            <span>{LEVEL_LABEL[path.level]}</span>
            <span>{path.hours} heures</span>
            <span>{total} leçons</span>
            <span>{compact(path.learners)} apprenants</span>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button variant="primary" onClick={onStart}>
              {enrolled && n > 0 ? 'Continuer' : 'Commencer gratuitement'}
              <ArrowRight />
            </Button>
            {enrolled && (
              <span className="inline-flex items-center gap-2 text-[13px] text-muted">
                <span className="h-1 w-32 overflow-hidden rounded-full bg-surface-3">
                  <span className="block h-full bg-success" style={{ width: `${pct}%` }} />
                </span>
                {pct} % terminé
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="mx-auto grid max-w-[1000px] gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_300px]">
        <div>
          <h2 className="text-[16px] font-semibold text-fg">Programme</h2>
          <div className="mt-3 flex flex-col gap-3">
            {path.modules.map((m, mi) => (
              <section key={m.id} className="overflow-hidden rounded-[20px] bg-surface-1">
                <h3 className="border-b border-line px-4 py-3 text-[14px] font-semibold text-fg">
                  <span className="mr-2 text-subtle">Module {mi + 1}</span>
                  {m.title}
                </h3>
                <ul>
                  {m.lessons.map((l) => {
                    const isDone = done.includes(`${path.id}/${l.id}`);
                    const I = KIND_ICON[l.kind];
                    return (
                      <li key={l.id}>
                        <Link
                          to={`/apprendre/${path.id}/${l.id}`}
                          className="flex items-center gap-3 px-4 py-3 text-[13.5px] hover:bg-surface-2"
                        >
                          {isDone ? (
                            <CheckCircle2 className="size-5 shrink-0 text-success" />
                          ) : (
                            <Circle className="size-5 shrink-0 text-subtle" />
                          )}
                          <I className="size-4 shrink-0 text-subtle" />
                          <span className={cn('flex-1', isDone ? 'text-muted' : 'text-fg')}>
                            {l.title}
                          </span>
                          <span className="text-[12.5px] text-subtle">
                            {KIND_LABEL[l.kind]} · {l.minutes} min
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </div>
        <aside className="flex flex-col gap-4 self-start">
          <section className="rounded-[20px] bg-surface-1 p-4">
            <h2 className="text-[14px] font-semibold text-fg">Tu sauras</h2>
            <ul className="mt-2 flex flex-col gap-2 text-[14px] text-muted">
              {path.outcomes.map((o) => (
                <li key={o} className="flex gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" />
                  {o}
                </li>
              ))}
            </ul>
          </section>
          {cert && (
            <Link
              to={`/certifications/${cert.id}`}
              className="flex items-center gap-3 rounded-[20px] bg-surface-1 p-4 "
            >
              <CertBadge color={cert.color} logo={cert.logo} size={40} />
              <span>
                <span className="block text-[12px] font-semibold text-subtle uppercase">
                  Certification à la clé
                </span>
                <span className="font-semibold text-fg">{cert.title}</span>
              </span>
            </Link>
          )}
        </aside>
      </div>
    </div>
  );
}

/** Une leçon : cours, code, quiz, et navigation dans le parcours. */
export function LessonPage() {
  const { pathId = '', lessonId = '' } = useParams();
  const path = PATHS.find((p) => p.id === pathId);
  const complete = usePlatform((s) => s.completeLesson);
  const done = usePlatform((s) => s.lessonsDone);
  const enrolled = usePlatform((s) => s.enrolled.includes(pathId));
  const toggle = usePlatform((s) => s.toggle);
  const nav = useNavigate();
  const flat =
    path?.modules.flatMap((m) => m.lessons.map((l) => ({ ...l, module: m.title }))) ?? [];
  const idx = flat.findIndex((l) => l.id === lessonId);
  if (!path || idx < 0) return <NotFound />;
  const lesson = flat[idx];
  const key = `${path.id}/${lesson.id}`;
  const isDone = done.includes(key);
  const next = flat[idx + 1];

  const finish = () => {
    complete(key);
    if (!enrolled) toggle('enrolled', path.id);
    nav(next ? `/apprendre/${path.id}/${next.id}` : `/apprendre/${path.id}`);
  };

  return (
    <div className="dh-page mx-auto flex w-full max-w-[1200px] gap-6 px-4 py-6 sm:px-6">
      <aside className="sticky top-[72px] hidden max-h-[calc(100dvh-88px)] w-[280px] shrink-0 self-start overflow-y-auto rounded-[20px] bg-surface-1 lg:block">
        <Link
          to={`/apprendre/${path.id}`}
          className="block border-b border-line p-4 font-semibold text-fg hover:underline"
        >
          {path.title}
        </Link>
        {path.modules.map((m) => (
          <div key={m.id} className="py-2">
            <p className="px-4 py-1 text-[12px] font-semibold tracking-wide text-subtle uppercase">
              {m.title}
            </p>
            {m.lessons.map((l) => (
              <Link
                key={l.id}
                to={`/apprendre/${path.id}/${l.id}`}
                className={cn(
                  'flex items-center gap-2.5 px-4 py-2 text-[13px]',
                  l.id === lesson.id
                    ? 'bg-surface-2 font-semibold text-fg'
                    : 'text-muted hover:bg-surface-2',
                )}
              >
                {done.includes(`${path.id}/${l.id}`) ? (
                  <CheckCircle2 className="size-4 shrink-0 text-success" />
                ) : (
                  <Circle className="size-4 shrink-0 text-subtle" />
                )}
                <span className="truncate">{l.title}</span>
              </Link>
            ))}
          </div>
        ))}
      </aside>
      <article className="min-w-0 flex-1">
        <p className="text-[13px] text-subtle">
          {lesson.module} · {KIND_LABEL[lesson.kind]} · {lesson.minutes} min
        </p>
        <h1 className="mt-1 text-[22px] leading-tight font-semibold tracking-[-0.015em] text-fg">
          {lesson.title}
        </h1>
        <p className="mt-5 max-w-[68ch] text-[15px] leading-[1.75] text-fg">{lesson.body}</p>
        {lesson.code && (
          <CodeBlock
            code={lesson.code}
            lang={
              lesson.code.trim().startsWith('<')
                ? 'markup'
                : lesson.code.includes('def ') || lesson.code.includes('pd.')
                  ? 'python'
                  : 'javascript'
            }
            className="mt-5"
          />
        )}
        {(lesson.kind === 'exercice' || lesson.kind === 'projet') && (
          <div className="mt-6 flex gap-3 rounded-[20px] bg-surface-1 p-4">
            <FlaskConical className="mt-0.5 size-5 shrink-0 text-success" />
            <p className="text-[13.5px] text-muted">
              Bloqué ? Pose ta question sur{' '}
              <Link to="/sos" className="font-semibold text-accent-text hover:underline">
                l’entraide
              </Link>{' '}
              ; une fois terminé, montre ton résultat dans{' '}
              <Link to="/c/showcase" className="font-semibold text-accent-text hover:underline">
                c/showcase
              </Link>
              .
            </p>
          </div>
        )}
        {lesson.quiz && <LessonQuiz key={lesson.id} lesson={lesson} />}
        <div className="mt-10 flex items-center justify-between border-t border-line pt-5">
          {idx > 0 ? (
            <ButtonLink
              to={`/apprendre/${path.id}/${flat[idx - 1].id}`}
              variant="ghost"
              icon={<ArrowLeft />}
            >
              Précédente
            </ButtonLink>
          ) : (
            <span />
          )}
          <Button variant="primary" onClick={finish} icon={isDone ? <Check /> : undefined}>
            {isDone
              ? next
                ? 'Leçon suivante'
                : 'Retour au parcours'
              : next
                ? 'Terminer et continuer'
                : 'Terminer le parcours'}
            {!isDone && <ArrowRight />}
          </Button>
        </div>
      </article>
    </div>
  );
}

function LessonQuiz({ lesson }: { lesson: Lesson }) {
  const [picked, setPicked] = useState<Record<number, number>>({});
  return (
    <section className="mt-8 flex flex-col gap-4">
      {lesson.quiz!.map((q, i) => {
        const p = picked[i];
        return (
          <div key={q.q} className="rounded-[20px] bg-surface-1 p-4">
            <p className="font-semibold text-fg">{q.q}</p>
            <div className="mt-3 flex flex-col gap-2">
              {q.choices.map((c, k) => {
                const show = p !== undefined;
                const right = k === q.answer;
                return (
                  <button
                    key={c}
                    type="button"
                    disabled={show}
                    onClick={() => setPicked({ ...picked, [i]: k })}
                    className={cn(
                      'flex items-center gap-2.5 rounded-[8px] border px-3 py-2.5 text-left text-[13.5px]',
                      !show && 'border-line ',
                      show && right && 'border-success bg-success-soft text-fg',
                      show && p === k && !right && 'border-danger bg-danger-soft',
                      show && p !== k && !right && 'border-line opacity-60',
                    )}
                  >
                    {show && right ? (
                      <Check className="size-4 text-success" />
                    ) : show && p === k ? (
                      <X className="size-4 text-danger" />
                    ) : (
                      <Circle className="size-4 text-subtle" />
                    )}
                    {c}
                  </button>
                );
              })}
            </div>
            {p !== undefined && <p className="mt-2 text-[13px] text-muted">{q.explain}</p>}
          </div>
        );
      })}
    </section>
  );
}
