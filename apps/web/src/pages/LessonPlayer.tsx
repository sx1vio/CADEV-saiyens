import { Check, Flame, Lightbulb, Target, Timer, X, Zap } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Djeli } from '@/components/djeli';
import { CodeBlock } from '@/components/ui/code';
import { cn } from '@/lib/utils';
import {
  lessonKey,
  loadCourse,
  type Course,
  type CourseLesson,
  type Exercise,
  type Step,
} from '@/platform/data/courses';
import { selectStreak, usePlatform } from '@/platform/store';
import '@/styles/learn.css';
import NotFound from './NotFound';

/** Lecteur de leçon plein écran, façon Duolingo. */
export default function LessonPlayer() {
  const { courseId = '', lessonId = '' } = useParams();
  const [course, setCourse] = useState<Course | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    void loadCourse(courseId).then((c) => alive && setCourse(c));
    return () => {
      alive = false;
    };
  }, [courseId]);

  if (course === undefined)
    return (
      <div className="grid min-h-dvh place-items-center bg-canvas">
        <Djeli pose="book" size={96} float eager />
      </div>
    );
  const all = course?.units.flatMap((u) => u.lessons) ?? [];
  const idx = all.findIndex((l) => l.id === lessonId);
  if (!course || idx < 0) return <NotFound />;
  return <Player key={lessonId} course={course} lesson={all[idx]!} next={all[idx + 1] ?? null} />;
}

type Item = { step: Step; key: string; retry: boolean };
type Phase = 'answer' | 'feedback' | 'done';

const shuffle = <T,>(list: readonly T[]): T[] => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
};

const PRAISE = ['Excellent !', 'Bravo !', 'Parfait !', 'Bien vu !', 'Exactement !'];

function Player({
  course,
  lesson,
  next,
}: {
  course: Course;
  lesson: CourseLesson;
  next: CourseLesson | null;
}) {
  const nav = useNavigate();
  const completeLesson = usePlatform((s) => s.completeLesson);
  // Lu une seule fois : la leçon passe à « terminée » pendant l'écran de fin.
  const [alreadyDone] = useState(() =>
    usePlatform.getState().lessonsDone.includes(lessonKey(course.id, lesson.id)),
  );

  const [queue, setQueue] = useState<Item[]>(() =>
    lesson.steps.map((step, i) => ({ step, key: `s${i}`, retry: false })),
  );
  const [pos, setPos] = useState(0);
  const [phase, setPhase] = useState<Phase>('answer');
  const [answer, setAnswer] = useState<unknown>(null);
  const [correct, setCorrect] = useState(false);
  const [passed, setPassed] = useState(0);
  const [firstTry, setFirstTry] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [combo, setCombo] = useState(0);
  const [quit, setQuit] = useState(false);
  const [started] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const praise = PRAISE[pos % PRAISE.length]!;

  const total = lesson.steps.length;
  const exercises = lesson.steps.filter((s) => s.kind !== 'tip').length;
  const item = queue[pos];
  const step = item?.step;

  const advance = useCallback(() => {
    if (pos + 1 >= queue.length) {
      setElapsed(Date.now() - started);
      setPhase('done');
      return;
    }
    setPos(pos + 1);
    setAnswer(null);
    setPhase('answer');
  }, [pos, queue.length, started]);

  const check = useCallback(() => {
    if (!step || step.kind === 'tip') return;
    const ok = isCorrect(step, answer);
    setCorrect(ok);
    setPhase('feedback');
    if (ok) {
      setPassed((n) => n + 1);
      setCombo((n) => n + 1);
      if (!item.retry) setFirstTry((n) => n + 1);
    } else {
      setMistakes((n) => n + 1);
      setCombo(0);
      // Comme Duolingo : l'exercice raté revient à la fin de la leçon.
      setQueue((q) => [...q, { step, key: `${item.key}r${q.length}`, retry: true }]);
    }
  }, [step, answer, item]);

  const continueTip = useCallback(() => {
    setPassed((n) => n + 1);
    advance();
  }, [advance]);

  const ready = step ? step.kind === 'tip' || isAnswered(step, answer) : false;

  // Clavier : Entrée valide ou continue.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || quit || phase === 'done') return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'BUTTON') return;
      e.preventDefault();
      if (step?.kind === 'tip') continueTip();
      else if (phase === 'feedback') advance();
      else if (ready) check();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, ready, step, check, advance, continueTip, quit]);

  const xp = 10 + (mistakes === 0 ? 5 : 0);
  useEffect(() => {
    if (phase === 'done') completeLesson(lessonKey(course.id, lesson.id), alreadyDone ? 0 : xp);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === 'done')
    return (
      <Finish
        course={course}
        lesson={lesson}
        next={next}
        xp={alreadyDone ? 0 : xp}
        accuracy={exercises ? Math.round((firstTry / exercises) * 100) : 100}
        elapsed={elapsed}
        perfect={mistakes === 0}
      />
    );

  const pct = Math.min(100, Math.round((passed / total) * 100));

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="mx-auto flex w-full max-w-[1000px] items-center gap-4 px-4 pt-5 sm:px-6">
        <button
          type="button"
          onClick={() => (passed > 0 ? setQuit(true) : nav('/certifications'))}
          className="grid size-10 place-items-center rounded-full text-subtle transition-colors hover:bg-surface-2 hover:text-fg"
          aria-label="Quitter la leçon"
        >
          <X className="size-6" />
        </button>
        <div
          className="h-4 flex-1 overflow-hidden rounded-full bg-surface-2"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label="Progression de la leçon"
        >
          <div
            className="lx-progress-fill h-full rounded-full"
            style={{ width: `${Math.max(pct, 4)}%`, backgroundColor: course.color }}
          />
        </div>
        <span
          className={cn(
            'inline-flex min-w-[52px] items-center justify-end gap-1 text-[15px] font-bold tabular-nums',
            combo >= 2 ? 'text-[#f97316]' : 'text-subtle',
          )}
          aria-label={`${combo} bonnes réponses d’affilée`}
        >
          <Flame className={cn('size-5', combo >= 2 && 'lx-flame fill-current')} key={combo} />
          {combo}
        </span>
      </header>

      <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col px-5 pt-8 pb-40 sm:pt-12">
        {item && step && (
          <div key={item.key} className="lx-enter flex flex-col gap-6">
            {item.retry && (
              <p className="inline-flex w-fit items-center gap-1.5 rounded-full bg-warning-soft px-3 py-1 text-[13px] font-semibold text-fg">
                <Target className="size-4" />
                On retente celle-ci
              </p>
            )}
            {step.kind === 'tip' ? (
              <TipView step={step} color={course.color} />
            ) : (
              <ExerciseView
                step={step}
                value={answer}
                onChange={setAnswer}
                locked={phase === 'feedback'}
                verdict={phase === 'feedback' ? correct : null}
              />
            )}
          </div>
        )}
      </main>

      {/* Barre du bas : Vérifier, puis la correction */}
      <footer
        className={cn(
          'fixed inset-x-0 bottom-0 border-t-2',
          phase === 'feedback'
            ? correct
              ? 'lx-sheet border-transparent bg-success-soft'
              : 'lx-sheet border-transparent bg-danger-soft'
            : 'border-line bg-canvas',
        )}
      >
        <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-4 px-5 py-5 pb-[max(env(safe-area-inset-bottom),20px)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          {phase === 'feedback' && step && step.kind !== 'tip' ? (
            <Feedback step={step} correct={correct} praise={praise} />
          ) : (
            <span className="hidden sm:block" />
          )}
          {step?.kind === 'tip' ? (
            <BigButton onClick={continueTip} className="lx-primary">
              Continuer
            </BigButton>
          ) : phase === 'feedback' ? (
            <BigButton onClick={advance} className={correct ? 'lx-good' : 'lx-bad'} autoFocus>
              Continuer
            </BigButton>
          ) : (
            <BigButton onClick={check} disabled={!ready} className="lx-primary">
              Vérifier
            </BigButton>
          )}
        </div>
      </footer>

      {quit && (
        <div
          className="fixed inset-0 z-50 grid place-items-end bg-black/40 sm:place-items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quit-title"
        >
          <div className="lx-sheet w-full max-w-[440px] rounded-t-[24px] bg-canvas p-6 text-center sm:rounded-[24px]">
            <Djeli pose="streak" size={88} className="mx-auto" eager />
            <h2 id="quit-title" className="mt-3 text-[20px] font-bold text-fg">
              Attends, tu y es presque !
            </h2>
            <p className="mt-1 text-[14.5px] text-muted">
              Si tu quittes maintenant, ta progression dans cette leçon sera perdue.
            </p>
            <div className="mt-5 flex flex-col gap-3">
              <BigButton onClick={() => setQuit(false)} className="lx-primary" autoFocus>
                Continuer la leçon
              </BigButton>
              <button
                type="button"
                onClick={() => nav('/certifications')}
                className="py-2 text-[15px] font-bold tracking-wide text-danger uppercase"
              >
                Quitter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Correction ---------------- */

function isAnswered(step: Exercise, v: unknown): boolean {
  switch (step.kind) {
    case 'choice':
      return typeof v === 'number';
    case 'truefalse':
      return typeof v === 'boolean';
    case 'fill':
      return typeof v === 'string';
    case 'order':
      return Array.isArray(v) && v.length === step.lines.length;
    case 'match':
      return v === 'complete';
  }
}

function isCorrect(step: Exercise, v: unknown): boolean {
  switch (step.kind) {
    case 'choice':
      return v === step.answer;
    case 'truefalse':
      return v === step.answer;
    case 'fill':
      return v === step.answer;
    case 'order':
      return Array.isArray(v) && v.every((line, i) => line === step.lines[i]);
    case 'match':
      return v === 'complete';
  }
}

function Feedback({ step, correct, praise }: { step: Exercise; correct: boolean; praise: string }) {
  const solution =
    step.kind === 'choice'
      ? step.choices[step.answer]
      : step.kind === 'truefalse'
        ? step.answer
          ? 'Vrai'
          : 'Faux'
        : step.kind === 'fill'
          ? step.answer
          : null;
  const explain = 'explain' in step ? step.explain : undefined;
  return (
    <div className="flex min-w-0 items-start gap-3.5" role="status" aria-live="polite">
      <span
        className={cn(
          'lx-pop grid size-12 shrink-0 place-items-center rounded-full bg-canvas',
          correct ? 'text-success' : 'text-danger',
        )}
      >
        {correct ? (
          <Check className="size-7" strokeWidth={3.5} />
        ) : (
          <X className="size-7" strokeWidth={3.5} />
        )}
      </span>
      <div className="min-w-0">
        <p className={cn('text-[20px] font-bold', correct ? 'text-success' : 'text-danger')}>
          {correct ? praise : 'Pas tout à fait…'}
        </p>
        {!correct && solution && (
          <p className="mt-0.5 text-[15px] font-semibold text-fg">
            Bonne réponse : <span className="font-mono">{solution}</span>
          </p>
        )}
        {!correct && step.kind === 'order' && (
          <pre className="mt-1 max-w-full overflow-x-auto rounded-[10px] bg-canvas/70 px-3 py-2 font-mono text-[13px] text-fg">
            {step.lines.join('\n')}
          </pre>
        )}
        {explain && <p className="mt-1 max-w-[560px] text-[14.5px] text-fg/85">{explain}</p>}
      </div>
    </div>
  );
}

/* ---------------- Étapes ---------------- */

function TipView({ step, color }: { step: Extract<Step, { kind: 'tip' }>; color: string }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end gap-3">
        <Djeli pose="book" size={84} eager />
        <p
          className="mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-bold tracking-wide text-white uppercase"
          style={{ backgroundColor: color }}
        >
          <Lightbulb className="size-4" />
          Nouvelle notion
        </p>
      </div>
      <h1 className="font-display text-[26px] leading-tight font-bold tracking-[-0.02em] text-fg sm:text-[30px]">
        {step.title}
      </h1>
      <p className="text-[17px] leading-relaxed text-fg">{step.body}</p>
      {step.code && <CodeBlock code={step.code} />}
    </div>
  );
}

function Prompt({ children, code }: { children: ReactNode; code?: string }) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-[22px] leading-snug font-bold tracking-[-0.01em] text-fg sm:text-[26px]">
        {children}
      </h1>
      {code && <CodeBlock code={code} compact />}
    </div>
  );
}

function ExerciseView({
  step,
  value,
  onChange,
  locked,
  verdict,
}: {
  step: Exercise;
  value: unknown;
  onChange: (v: unknown) => void;
  locked: boolean;
  verdict: boolean | null;
}) {
  const wrap = verdict === false ? 'lx-shake' : verdict === true ? 'lx-pop' : '';
  switch (step.kind) {
    case 'choice':
      return (
        <Choices
          prompt={<Prompt code={step.code}>{step.prompt}</Prompt>}
          options={step.choices}
          value={value as number | null}
          onChange={onChange}
          locked={locked}
          answer={step.answer}
          verdict={verdict}
          wrap={wrap}
        />
      );
    case 'truefalse':
      return (
        <Choices
          prompt={
            <Prompt code={step.code}>
              <span className="mb-1 block text-[13px] font-bold tracking-wide text-subtle uppercase">
                Vrai ou faux ?
              </span>
              {step.statement}
            </Prompt>
          }
          options={['Vrai', 'Faux']}
          value={value === true ? 0 : value === false ? 1 : null}
          onChange={(i) => onChange(i === 0)}
          locked={locked}
          answer={step.answer ? 0 : 1}
          verdict={verdict}
          wrap={wrap}
          columns
        />
      );
    case 'fill':
      return (
        <Fill
          step={step}
          value={value as string | null}
          onChange={onChange}
          locked={locked}
          wrap={wrap}
        />
      );
    case 'order':
      return <Order step={step} onChange={onChange} locked={locked} wrap={wrap} />;
    case 'match':
      return <Match step={step} onChange={onChange} locked={locked} />;
  }
}

function Choices({
  prompt,
  options,
  value,
  onChange,
  locked,
  answer,
  verdict,
  wrap,
  columns,
}: {
  prompt: ReactNode;
  options: string[];
  value: number | null;
  onChange: (i: number) => void;
  locked: boolean;
  answer: number;
  verdict: boolean | null;
  wrap: string;
  columns?: boolean;
}) {
  // Raccourcis 1, 2, 3… comme sur Duolingo.
  useEffect(() => {
    if (locked) return;
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= options.length) onChange(n - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [locked, options.length, onChange]);

  return (
    <div className="flex flex-col gap-6">
      {prompt}
      <div
        className={cn('grid gap-3', columns ? 'grid-cols-2' : 'grid-cols-1', wrap)}
        role="radiogroup"
      >
        {options.map((o, i) => {
          const picked = value === i;
          const showGood = verdict !== null && i === answer;
          const showBad = verdict === false && picked;
          return (
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={picked}
              disabled={locked}
              onClick={() => onChange(i)}
              className={cn(
                'lx-3d flex items-center gap-3 rounded-[16px] border-2 border-line-strong bg-canvas px-4 py-3.5 text-left text-[16px] font-medium text-fg disabled:cursor-default',
                columns && 'justify-center py-5 text-[18px] font-bold',
                picked && verdict === null && 'lx-picked',
                showGood && 'border-success! bg-success-soft! text-fg',
                showBad && 'border-danger! bg-danger-soft! text-fg',
              )}
            >
              {!columns && (
                <span
                  className={cn(
                    'grid size-7 shrink-0 place-items-center rounded-[8px] border-2 border-line-strong text-[13px] font-bold text-subtle',
                    picked && 'border-current text-current',
                  )}
                >
                  {i + 1}
                </span>
              )}
              <span className="min-w-0">{o}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Fill({
  step,
  value,
  onChange,
  locked,
  wrap,
}: {
  step: Extract<Exercise, { kind: 'fill' }>;
  value: string | null;
  onChange: (v: string | null) => void;
  locked: boolean;
  wrap: string;
}) {
  const options = useMemo(() => shuffle(step.options), [step]);
  const [before, after] = step.code.split('___') as [string, string];
  return (
    <div className="flex flex-col gap-6">
      <Prompt>{step.prompt}</Prompt>
      <pre
        className={cn(
          'overflow-x-auto rounded-[14px] border border-line bg-inset px-4 py-4 font-mono text-[15px] leading-relaxed whitespace-pre text-fg',
          wrap,
        )}
      >
        {before}
        <button
          type="button"
          disabled={locked || !value}
          onClick={() => onChange(null)}
          className={cn(
            'inline-block min-w-[72px] rounded-[8px] border-2 border-dashed px-2 align-baseline font-mono',
            value
              ? 'border-accent bg-accent-soft text-accent-text'
              : 'border-line-strong text-transparent',
          )}
          aria-label={value ? `Retirer ${value}` : 'Case vide'}
        >
          {value ?? '___'}
        </button>
        {after}
      </pre>
      <div className="flex flex-wrap justify-center gap-3">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            disabled={locked || value === o}
            onClick={() => onChange(o)}
            className={cn(
              'lx-3d rounded-[14px] border-2 border-line-strong bg-canvas px-4 py-2.5 font-mono text-[15px] font-semibold text-fg',
              value === o && 'opacity-30 shadow-none',
            )}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function Order({
  step,
  onChange,
  locked,
  wrap,
}: {
  step: Extract<Exercise, { kind: 'order' }>;
  onChange: (v: string[]) => void;
  locked: boolean;
  wrap: string;
}) {
  const bank = useMemo(() => {
    // On évite de proposer les lignes déjà dans le bon ordre.
    let s = shuffle(step.lines.map((line, i) => ({ line, i })));
    for (let t = 0; t < 5 && s.every((x, k) => x.i === k); t++) s = shuffle(s);
    return s;
  }, [step]);
  const [picked, setPicked] = useState<number[]>([]);

  const set = (next: number[]) => {
    setPicked(next);
    onChange(next.map((k) => bank[k]!.line));
  };

  return (
    <div className="flex flex-col gap-6">
      <Prompt>{step.prompt}</Prompt>
      <ol
        className={cn(
          'flex min-h-[132px] flex-col gap-2 rounded-[16px] border-2 border-dashed border-line-strong p-3',
          wrap,
        )}
        aria-label="Ta réponse"
      >
        {picked.length === 0 && (
          <li className="m-auto text-[14px] text-subtle">Touche les lignes dans le bon ordre</li>
        )}
        {picked.map((k, n) => (
          <li key={k}>
            <button
              type="button"
              disabled={locked}
              onClick={() => set(picked.filter((x) => x !== k))}
              className="lx-3d lx-pop flex w-full items-center gap-3 rounded-[12px] border-2 border-line-strong bg-canvas px-3 py-2 text-left font-mono text-[14px] whitespace-pre text-fg"
            >
              <span className="w-5 shrink-0 text-right font-sans text-[12px] font-bold text-subtle">
                {n + 1}
              </span>
              {bank[k]!.line}
            </button>
          </li>
        ))}
      </ol>
      <div className="flex flex-col gap-2">
        {bank.map((b, k) =>
          picked.includes(k) ? (
            <div
              key={k}
              className="rounded-[12px] border-2 border-line bg-surface-2 px-3 py-2 font-mono text-[14px] whitespace-pre text-transparent select-none"
              aria-hidden
            >
              {b.line || ' '}
            </div>
          ) : (
            <button
              key={k}
              type="button"
              disabled={locked}
              onClick={() => set([...picked, k])}
              className="lx-3d rounded-[12px] border-2 border-line-strong bg-canvas px-3 py-2 text-left font-mono text-[14px] whitespace-pre text-fg"
            >
              {b.line}
            </button>
          ),
        )}
      </div>
    </div>
  );
}

function Match({
  step,
  onChange,
  locked,
}: {
  step: Extract<Exercise, { kind: 'match' }>;
  onChange: (v: 'complete' | null) => void;
  locked: boolean;
}) {
  const left = useMemo(() => shuffle(step.pairs.map((p, i) => ({ text: p[0], i }))), [step]);
  const right = useMemo(() => shuffle(step.pairs.map((p, i) => ({ text: p[1], i }))), [step]);
  const [sel, setSel] = useState<{ side: 'l' | 'r'; i: number } | null>(null);
  const [done, setDone] = useState<number[]>([]);
  const [wrong, setWrong] = useState<{ l: number; r: number } | null>(null);

  const pick = (side: 'l' | 'r', i: number) => {
    if (locked || done.includes(i) || wrong) return;
    if (!sel || sel.side === side) return setSel({ side, i });
    if (sel.i === i) {
      const next = [...done, i];
      setDone(next);
      setSel(null);
      if (next.length === step.pairs.length) onChange('complete');
    } else {
      setWrong(side === 'l' ? { l: i, r: sel.i } : { l: sel.i, r: i });
      setSel(null);
      setTimeout(() => setWrong(null), 650);
    }
  };

  const tile = (side: 'l' | 'r', t: { text: string; i: number }) => {
    const isDone = done.includes(t.i);
    const isSel = sel?.side === side && sel.i === t.i;
    const isWrong = wrong && (side === 'l' ? wrong.l : wrong.r) === t.i;
    return (
      <button
        key={`${side}${t.i}`}
        type="button"
        disabled={locked || isDone}
        onClick={() => pick(side, t.i)}
        className={cn(
          'lx-3d min-h-[56px] rounded-[14px] border-2 border-line-strong bg-canvas px-3 py-2.5 text-[15px] font-medium text-fg',
          isSel && 'lx-picked',
          isWrong && 'lx-shake border-danger! bg-danger-soft!',
          isDone && 'border-success-soft! bg-success-soft! text-success opacity-70 shadow-none',
        )}
      >
        {t.text}
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <Prompt>{step.prompt}</Prompt>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-3">{left.map((t) => tile('l', t))}</div>
        <div className="flex flex-col gap-3">{right.map((t) => tile('r', t))}</div>
      </div>
    </div>
  );
}

function BigButton({
  children,
  onClick,
  disabled,
  className,
  autoFocus,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  autoFocus?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      autoFocus={autoFocus}
      className={cn(
        'lx-3d h-[52px] w-full rounded-[16px] px-8 text-[16px] font-bold tracking-wide uppercase sm:w-auto sm:min-w-[180px]',
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ---------------- Fin de leçon ---------------- */

const CONFETTI_COLORS = ['#2563eb', '#f59e0b', '#10b981', '#ef4444', '#a855f7', '#06b6d4'];

function Finish({
  course,
  lesson,
  next,
  xp,
  accuracy,
  elapsed,
  perfect,
}: {
  course: Course;
  lesson: CourseLesson;
  next: CourseLesson | null;
  xp: number;
  accuracy: number;
  elapsed: number;
  perfect: boolean;
}) {
  const streak = usePlatform(selectStreak);
  const [confetti] = useState(() =>
    Array.from({ length: 42 }, (_, i) => ({
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      dx: `${Math.round((Math.random() - 0.5) * 900)}px`,
      dy: `${Math.round(Math.random() * 520 - 120)}px`,
      rot: `${Math.round(Math.random() * 900 - 450)}deg`,
      delay: `${Math.round(Math.random() * 250)}ms`,
    })),
  );
  const min = Math.floor(elapsed / 60000);
  const sec = Math.round((elapsed % 60000) / 1000);

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-canvas">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {confetti.map((c, i) => (
          <span
            key={i}
            className="lx-confetti"
            style={
              {
                backgroundColor: c.color,
                '--lx-dx': c.dx,
                '--lx-dy': c.dy,
                '--lx-rot': c.rot,
                '--lx-delay': c.delay,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
      <main className="relative mx-auto flex w-full max-w-[560px] flex-1 flex-col items-center justify-center px-5 py-10 text-center">
        <Djeli pose="celebrate" size={168} float eager />
        <h1 className="lx-pop mt-4 font-display text-[30px] font-bold tracking-[-0.02em] text-[#f59e0b]">
          {perfect ? 'Leçon parfaite !' : 'Leçon terminée !'}
        </h1>
        <p className="mt-1 text-[16px] text-muted">{lesson.title}</p>

        <div className="mt-8 grid w-full grid-cols-3 gap-3">
          <Stat icon={Zap} label="XP gagnés" value={`+${xp}`} color="#f59e0b" />
          <Stat icon={Target} label="Précision" value={`${accuracy} %`} color="#10b981" />
          <Stat
            icon={Timer}
            label="Temps"
            value={`${min}:${String(sec).padStart(2, '0')}`}
            color="#2563eb"
          />
        </div>
        {streak > 0 && (
          <p className="lx-flame mt-6 inline-flex items-center gap-2 rounded-full bg-[#fff7ed] px-4 py-2 text-[15px] font-bold text-[#c2410c] dark:bg-[#431407] dark:text-[#fdba74]">
            <Flame className="size-5 fill-current" />
            Série de {streak} jour{streak > 1 ? 's' : ''}
          </p>
        )}
      </main>
      <footer className="border-t-2 border-line">
        <div className="mx-auto flex w-full max-w-[1000px] flex-col-reverse gap-3 px-5 py-5 pb-[max(env(safe-area-inset-bottom),20px)] sm:flex-row sm:justify-between sm:px-6">
          <Link
            to="/certifications"
            className="lx-3d grid h-[52px] place-items-center rounded-[16px] border-2 border-line-strong bg-canvas px-8 text-[16px] font-bold tracking-wide text-fg uppercase"
          >
            Retour au chemin
          </Link>
          {next && (
            <Link
              to={`/lecon/${course.id}/${next.id}`}
              className="lx-3d lx-primary grid h-[52px] place-items-center rounded-[16px] px-8 text-[16px] font-bold tracking-wide uppercase"
              autoFocus
            >
              Leçon suivante
            </Link>
          )}
        </div>
      </footer>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Zap;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="lx-pop overflow-hidden rounded-[16px] border-2" style={{ borderColor: color }}>
      <p
        className="py-1 text-[11.5px] font-bold tracking-wide text-white uppercase"
        style={{ backgroundColor: color }}
      >
        {label}
      </p>
      <p className="inline-flex items-center gap-1.5 py-3 text-[20px] font-bold text-fg tabular-nums">
        <Icon className="size-5" style={{ color }} />
        {value}
      </p>
    </div>
  );
}
