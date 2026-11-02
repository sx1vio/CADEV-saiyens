import {
  Award,
  BookOpen,
  Check,
  ChevronDown,
  Flame,
  Lock,
  Star,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Djeli, type DjeliPose } from '@/components/djeli';
import { cn } from '@/lib/utils';
import {
  COURSE_META,
  LESSONS_PER_COURSE,
  courseMeta,
  courseProgress,
  loadCourse,
  pathNodes,
  type Course,
  type CourseMeta,
  type PathNode,
} from '@/platform/data/courses';
import { PLATFORM_CERTS } from '@/platform/data/certs';
import { MIN_PER_LESSON, selectStreak, usePlatform } from '@/platform/store';
import '@/styles/learn.css';
import { PathsSection } from './Learn';

/** Apprendre : le chemin du cours suivi, façon Duolingo. */
export default function CourseHome() {
  const courseId = usePlatform((s) => s.course);
  const setCourse = usePlatform((s) => s.setCourse);
  const meta = courseMeta(courseId);

  return (
    <div className="dh-page mx-auto w-full max-w-[1120px] px-4 py-6 sm:px-6">
      {meta ? <CoursePath meta={meta} onSwitch={setCourse} /> : <CoursePicker onPick={setCourse} />}
      <div className="mt-14 border-t border-line pt-8">
        <PathsSection />
      </div>
    </div>
  );
}

function CoursePicker({ onPick }: { onPick: (id: string) => void }) {
  const done = usePlatform((s) => s.lessonsDone);
  return (
    <section>
      <div className="flex items-end gap-3">
        <Djeli pose="book" size={96} eager />
        <div className="mb-4">
          <h1 className="font-display text-[28px] leading-tight font-bold tracking-[-0.02em] text-fg">
            Qu’est-ce que tu veux apprendre ?
          </h1>
          <p className="mt-1 text-[15px] text-muted">
            Des leçons de quelques minutes, des exercices corrigés tout de suite. Gratuit.
          </p>
        </div>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {COURSE_META.map((c) => (
          <CourseCard key={c.id} meta={c} done={done} onClick={() => onPick(c.id)} />
        ))}
      </div>
    </section>
  );
}

function CourseCard({
  meta: c,
  done,
  onClick,
  active,
}: {
  meta: CourseMeta;
  done: readonly string[];
  onClick: () => void;
  active?: boolean;
}) {
  const n = done.filter((k) => k.startsWith(`cours:${c.id}/`)).length;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'lx-3d flex items-start gap-3.5 rounded-[18px] border-2 border-line-strong bg-canvas p-4 text-left',
        active && 'lx-picked',
      )}
    >
      <span
        className="grid size-12 shrink-0 place-items-center rounded-[14px] text-white shadow-[inset_0_-3px_0_rgb(0_0_0/0.18)]"
        style={{ backgroundColor: c.color }}
      >
        <c.icon className="size-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-semibold text-fg">{c.title}</span>
        <span className="mt-0.5 block text-[13px] leading-snug text-muted">{c.tagline}</span>
        {n > 0 && (
          <span className="mt-2 block h-2 overflow-hidden rounded-full bg-surface-2">
            <span
              className="block h-full rounded-full"
              style={{ width: `${(n / LESSONS_PER_COURSE) * 100}%`, backgroundColor: c.color }}
            />
          </span>
        )}
      </span>
    </button>
  );
}

function CoursePath({ meta, onSwitch }: { meta: CourseMeta; onSwitch: (id: string) => void }) {
  const [loaded, setLoaded] = useState<Course | null>(null);
  // Le cours affiché est celui chargé pour l'id courant (pas de remise à zéro dans l'effet).
  const course = loaded?.id === meta.id ? loaded : null;
  const done = usePlatform((s) => s.lessonsDone);

  useEffect(() => {
    let alive = true;
    void loadCourse(meta.id).then((c) => alive && setLoaded(c));
    return () => {
      alive = false;
    };
  }, [meta.id]);

  const nodes = useMemo(() => (course ? pathNodes(course, done) : []), [course, done]);
  const progress = course ? courseProgress(course, done) : null;
  const cert = PLATFORM_CERTS.find((c) => c.id === meta.certId);

  // Amène la leçon en cours à l'écran à l'ouverture.
  const currentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (course) currentRef.current?.scrollIntoView({ block: 'center', behavior: 'instant' });
  }, [course]);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-3">
          <CourseSwitcher meta={meta} onSwitch={onSwitch} />
          <StatsBar className="lg:hidden" />
        </div>

        {!course ? (
          <div className="mt-16 grid place-items-center">
            <Djeli pose="book" size={96} float eager />
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-10">
            {course.units.map((u, ui) => {
              const unitNodes = nodes.filter((n) => n.unitIndex === ui);
              const unitDone = unitNodes.every((n) => n.state === 'done');
              return (
                <section key={u.id} aria-labelledby={`unit-${u.id}`}>
                  <UnitBanner
                    index={ui}
                    title={u.title}
                    goal={u.goal}
                    color={meta.color}
                    id={`unit-${u.id}`}
                  />
                  <div className="relative mt-10 flex flex-col items-center gap-9">
                    {unitNodes.map((n, k) => (
                      <PathNodeView
                        key={n.lesson.id}
                        node={n}
                        courseId={meta.id}
                        color={meta.color}
                        offset={ZIGZAG[k % ZIGZAG.length]!}
                        ref={n.state === 'current' ? currentRef : undefined}
                      />
                    ))}
                    <span
                      className={cn(
                        'lx-3d lx-node grid size-[76px] place-items-center rounded-full',
                        unitDone ? 'bg-[#f59e0b] text-white' : 'bg-surface-2 text-subtle',
                      )}
                      style={{
                        transform: `translateX(${ZIGZAG[unitNodes.length % ZIGZAG.length]}px)`,
                        ...(unitDone ? { ['--lx-edge' as string]: '#b45309' } : {}),
                      }}
                      title={unitDone ? 'Unité terminée' : 'Termine l’unité pour la valider'}
                    >
                      <Trophy className="size-8" />
                    </span>
                    <Djeli
                      pose={UNIT_POSES[ui % UNIT_POSES.length]!}
                      size={120}
                      className={cn(
                        'pointer-events-none absolute top-16 hidden sm:block',
                        ui % 2 ? 'left-[6%]' : 'right-[6%]',
                      )}
                    />
                  </div>
                </section>
              );
            })}
            {progress && progress.n === progress.total && (
              <div className="rounded-[20px] border-2 border-[#f59e0b] bg-[#fffbeb] p-6 text-center dark:bg-[#451a03]">
                <Djeli pose="trophy" size={110} className="mx-auto" />
                <h2 className="mt-2 text-[20px] font-bold text-fg">Cours terminé, bravo !</h2>
                <p className="mt-1 text-[14.5px] text-muted">
                  Tu as terminé les {progress.total} leçons de « {meta.title} ».
                </p>
                {cert && (
                  <Link
                    to={`/certifications/${cert.id}`}
                    className="lx-3d lx-primary mt-4 inline-grid h-12 place-items-center rounded-[14px] px-6 font-bold tracking-wide uppercase"
                  >
                    Passer la certification
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <aside className="hidden flex-col gap-4 lg:flex">
        <StatsBar />
        <DailyGoalCard />
        {progress && (
          <SideCard title="Ta progression">
            <p className="text-[14px] text-muted">
              {progress.n} leçon{progress.n > 1 ? 's' : ''} sur {progress.total}
            </p>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{ width: `${progress.pct}%`, backgroundColor: meta.color }}
              />
            </div>
          </SideCard>
        )}
        {cert && (
          <SideCard title="La certification au bout">
            <div className="flex items-start gap-3">
              <Award className="mt-0.5 size-6 shrink-0 text-[#f0b232]" />
              <div>
                <p className="font-semibold text-fg">{cert.title}</p>
                <p className="mt-0.5 text-[13px] text-muted">
                  Gratuite, en ligne, corrigée tout de suite. Un badge vérifiable sur ton Passport.
                </p>
                <Link
                  to={`/certifications/${cert.id}`}
                  className="mt-2 inline-block text-[13.5px] font-semibold text-accent-text hover:underline"
                >
                  Voir le programme
                </Link>
              </div>
            </div>
          </SideCard>
        )}
      </aside>
    </div>
  );
}

const ZIGZAG = [0, 52, 84, 52, 0, -52, -84, -52];
const UNIT_POSES: DjeliPose[] = ['laptop', 'book', 'point', 'trophy'];

function UnitBanner({
  index,
  title,
  goal,
  color,
  id,
}: {
  index: number;
  title: string;
  goal: string;
  color: string;
  id: string;
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 rounded-[18px] px-5 py-4 text-white shadow-[inset_0_-5px_0_rgb(0_0_0/0.18)]"
      style={{ backgroundColor: color }}
    >
      <div className="min-w-0">
        <p className="text-[12.5px] font-bold tracking-wide uppercase opacity-80">
          Unité {index + 1}
        </p>
        <h2 id={id} className="text-[19px] leading-tight font-bold">
          {title}
        </h2>
        <p className="mt-0.5 text-[13.5px] opacity-90">{goal}</p>
      </div>
      <BookOpen className="size-7 shrink-0 opacity-80" aria-hidden />
    </div>
  );
}

function PathNodeView({
  node,
  courseId,
  color,
  offset,
  ref,
}: {
  node: PathNode;
  courseId: string;
  color: string;
  offset: number;
  ref?: React.Ref<HTMLDivElement>;
}) {
  const { state, lesson } = node;
  const style = {
    backgroundColor: state === 'locked' ? undefined : color,
    ['--lx-edge' as string]:
      state === 'locked' ? undefined : `color-mix(in oklab, ${color}, black 30%)`,
  };
  const inner =
    state === 'done' ? (
      <Check className="size-9" strokeWidth={3.5} />
    ) : state === 'current' ? (
      <Star className="size-9 fill-current" />
    ) : (
      <Lock className="size-7" />
    );
  return (
    <div ref={ref} className="relative" style={{ transform: `translateX(${offset}px)` }}>
      {state === 'current' && (
        <span
          className="lx-bubble absolute -top-12 left-1/2 rounded-[12px] border-2 border-line-strong bg-canvas px-3 py-1.5 text-[13px] font-bold tracking-wide whitespace-nowrap uppercase"
          style={{ color }}
        >
          {node.index === 0 ? 'Commencer' : 'Continuer'}
          <span
            aria-hidden
            className="absolute -bottom-[7px] left-1/2 size-3 -translate-x-1/2 rotate-45 border-r-2 border-b-2 border-line-strong bg-canvas"
          />
        </span>
      )}
      {state === 'locked' ? (
        <span
          className="lx-3d lx-node grid size-[76px] place-items-center rounded-full bg-surface-2 text-subtle"
          title={`${lesson.title} : termine la leçon précédente pour la débloquer`}
          aria-label={`${lesson.title}, verrouillée`}
        >
          {inner}
        </span>
      ) : (
        <Link
          to={`/lecon/${courseId}/${lesson.id}`}
          className={cn(
            'lx-3d lx-node grid size-[76px] place-items-center rounded-full text-white',
            state === 'current' && 'lx-node-current ring-[6px] ring-offset-4 ring-offset-canvas',
          )}
          style={{
            ...style,
            ['--tw-ring-color' as string]: `color-mix(in oklab, ${color}, transparent 75%)`,
          }}
          aria-label={`${lesson.title}${state === 'done' ? ', terminée' : ''}`}
          title={lesson.title}
        >
          {inner}
        </Link>
      )}
    </div>
  );
}

function CourseSwitcher({ meta, onSwitch }: { meta: CourseMeta; onSwitch: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const done = usePlatform((s) => s.lessonsDone);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex items-center gap-3 rounded-[14px] px-2 py-1.5 transition-colors hover:bg-surface-1"
      >
        <span
          className="grid size-10 place-items-center rounded-[12px] text-white"
          style={{ backgroundColor: meta.color }}
        >
          <meta.icon className="size-5" />
        </span>
        <span className="text-left">
          <span className="block text-[12px] font-semibold tracking-wide text-subtle uppercase">
            Ton cours
          </span>
          <span className="flex items-center gap-1 text-[17px] font-bold text-fg">
            {meta.title}
            <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />
          </span>
        </span>
      </button>
      {open && (
        <div className="dh-pop absolute top-full left-0 z-20 mt-2 w-[min(92vw,420px)] rounded-[18px] border border-line-strong bg-canvas p-3 shadow-xl">
          <p className="px-1 pb-2 text-[13px] font-semibold text-subtle">Changer de cours</p>
          <div className="flex flex-col gap-2">
            {COURSE_META.map((c) => (
              <CourseCard
                key={c.id}
                meta={c}
                done={done}
                active={c.id === meta.id}
                onClick={() => {
                  onSwitch(c.id);
                  setOpen(false);
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatsBar({ className }: { className?: string }) {
  const streak = usePlatform(selectStreak);
  const xp = usePlatform((s) => s.learnXp);
  return (
    <div className={cn('flex items-center gap-4 text-[15px] font-bold', className)}>
      <span
        className={cn('inline-flex items-center gap-1', streak ? 'text-[#f97316]' : 'text-subtle')}
        title={`Série de ${streak} jour${streak > 1 ? 's' : ''}`}
      >
        <Flame className={cn('size-5', streak > 0 && 'fill-current')} />
        {streak}
      </span>
      <span className="inline-flex items-center gap-1 text-[#f59e0b]" title="XP d’apprentissage">
        <Zap className="size-5 fill-current" />
        {xp}
      </span>
    </div>
  );
}

const GOALS = [5, 10, 20, 30];

function DailyGoalCard() {
  const goal = usePlatform((s) => s.dailyGoal);
  const setGoal = usePlatform((s) => s.setDailyGoal);
  const today = usePlatform((s) => s.lessonsToday());
  const minutes = today * MIN_PER_LESSON;
  const pct = Math.min(100, Math.round((minutes / goal) * 100));
  const r = 30;
  const circ = 2 * Math.PI * r;
  return (
    <SideCard title="Objectif du jour">
      <div className="flex items-center gap-4">
        <svg viewBox="0 0 72 72" className="size-[72px] shrink-0 -rotate-90" aria-hidden>
          <circle cx="36" cy="36" r={r} fill="none" strokeWidth="8" className="stroke-surface-2" />
          <circle
            cx="36"
            cy="36"
            r={r}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            stroke={pct >= 100 ? '#10b981' : '#f59e0b'}
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - pct / 100)}
            className="transition-[stroke-dashoffset] duration-700"
          />
        </svg>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-fg">
            {pct >= 100 ? 'Objectif atteint !' : `${minutes} / ${goal} min`}
          </p>
          <p className="text-[13px] text-muted">
            {today} leçon{today > 1 ? 's' : ''} aujourd’hui
          </p>
        </div>
        <Target className="ml-auto size-5 text-subtle" aria-hidden />
      </div>
      <div
        className="mt-3 grid grid-cols-4 gap-1.5"
        role="radiogroup"
        aria-label="Objectif quotidien"
      >
        {GOALS.map((g) => (
          <button
            key={g}
            type="button"
            role="radio"
            aria-checked={goal === g}
            onClick={() => setGoal(g)}
            className={cn(
              'rounded-[10px] border-2 py-1.5 text-[13px] font-semibold',
              goal === g
                ? 'border-accent bg-accent-soft text-accent-text'
                : 'border-line text-muted hover:border-line-strong',
            )}
          >
            {g} min
          </button>
        ))}
      </div>
    </SideCard>
  );
}

function SideCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[18px] border-2 border-line p-4">
      <h2 className="mb-3 text-[16px] font-bold text-fg">{title}</h2>
      {children}
    </section>
  );
}
