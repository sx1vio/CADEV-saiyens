import {
  ArrowLeft,
  ArrowRight,
  Award,
  BadgeCheck,
  Check,
  Clock,
  Copy,
  Flag,
  GraduationCap,
  ListChecks,
  RotateCcw,
  ShieldCheck,
  Timer,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import { Button, ButtonLink } from '@/components/ui/button';
import { CodeBlock } from '@/components/ui/code';
import { cn } from '@/lib/utils';
import { PLATFORM_CERTS } from '@/platform/data/certs';
import { courseMeta } from '@/platform/data/courses/meta';
import { PATHS } from '@/platform/data/learn';
import { usePlatform } from '@/platform/store';
import type { PlatformCert, QuizQuestion } from '@/platform/types';
import { CertBadge } from '@/platform/ui';
import { useSession } from '@/stores/app';
import { LevelPill } from './Certifications';
import NotFound from './NotFound';

/** Délai entre deux tentatives, pour qu'on révise plutôt que de deviner. */
const COOLDOWN_MS = 60 * 60 * 1000;

interface ExamQuestion extends QuizQuestion {
  /** Ordre d'affichage des choix (index d'origine) */
  order: number[];
}

const shuffle = <T,>(list: readonly T[]): T[] => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
};

/** Tirage : au moins une question par thème, le reste au hasard ; choix mélangés. */
function drawExam(cert: PlatformCert): ExamQuestion[] {
  const byTopic = new Map<number, QuizQuestion[]>();
  for (const q of shuffle(cert.quiz)) {
    const t = q.topic ?? 0;
    byTopic.set(t, [...(byTopic.get(t) ?? []), q]);
  }
  const picked: QuizQuestion[] = [];
  for (const list of byTopic.values()) if (list[0]) picked.push(list[0]);
  const rest = shuffle(cert.quiz.filter((q) => !picked.includes(q)));
  const all = [...picked, ...rest].slice(0, Math.min(cert.draw, cert.quiz.length));
  return shuffle(all).map((q) => ({ ...q, order: shuffle(q.choices.map((_, i) => i)) }));
}

const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** Fiche d'une certification DevHub et son examen chronométré. */
export default function CertExam() {
  const { id = '' } = useParams();
  const cert = PLATFORM_CERTS.find((c) => c.id === id);
  const [exam, setExam] = useState<ExamQuestion[] | null>(null);
  const [result, setResult] = useState<{ exam: ExamQuestion[]; answers: (number | null)[] } | null>(
    null,
  );
  if (!cert) return <NotFound />;
  if (result)
    return (
      <Results
        cert={cert}
        exam={result.exam}
        answers={result.answers}
        onBack={() => setResult(null)}
      />
    );
  if (exam)
    return (
      <Exam
        cert={cert}
        exam={exam}
        onFinish={(answers) => {
          setResult({ exam, answers });
          setExam(null);
        }}
      />
    );
  return <Intro cert={cert} onStart={() => setExam(drawExam(cert))} />;
}

function usePrep(cert: PlatformCert) {
  const course = courseMeta(cert.course);
  const path = PATHS.find((p) => p.certId === cert.id);
  return course
    ? { to: '/apprendre', label: `Cours « ${course.title} »` }
    : path
      ? { to: `/apprendre/${path.id}`, label: path.title }
      : null;
}

function Intro({ cert, onStart }: { cert: PlatformCert; onStart: () => void }) {
  const me = useSession((s) => s.user);
  const result = usePlatform((s) => s.certResults[cert.id]);
  const setCourse = usePlatform((s) => s.setCourse);
  const prep = usePrep(cert);
  const [now] = useState(() => Date.now());
  const wait = result?.lastAttemptAt
    ? new Date(result.lastAttemptAt).getTime() + COOLDOWN_MS - now
    : 0;
  const n = Math.min(cert.draw, cert.quiz.length);

  return (
    <div className="dh-page">
      <div className="border-b border-line px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-[1000px]">
          <Link
            to="/certifications"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-fg"
          >
            <ArrowLeft className="size-4" />
            Certifications
          </Link>
          <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
            <CertBadge color={cert.color} logo={cert.logo} size={84} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <LevelPill level={cert.level} />
                <span className="rounded-full bg-success-soft px-2 py-0.5 text-[11.5px] font-medium text-success">
                  Gratuit
                </span>
                <span className="text-[12.5px] text-subtle">
                  Certification DevHub · {cert.track}
                </span>
              </div>
              <h1 className="mt-2 text-[26px] leading-tight font-semibold tracking-[-0.02em] text-fg">
                {cert.title}
              </h1>
              <p className="mt-1.5 max-w-2xl text-[14px] text-muted">{cert.description}</p>
              <div className="mt-3 flex flex-wrap gap-4 text-[13px] text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <Timer className="size-4 text-subtle" />
                  {cert.minutes} minutes chronométrées
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ListChecks className="size-4 text-subtle" />
                  {n} questions tirées parmi {cert.quiz.length}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <BadgeCheck className="size-4 text-subtle" />
                  {cert.passScore} % pour réussir
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto grid max-w-[1000px] gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_320px]">
        <div>
          <h2 className="text-[16px] font-semibold text-fg">Programme évalué</h2>
          <ol className="mt-3 flex flex-col gap-2">
            {cert.syllabus.map((s, k) => (
              <li
                key={s}
                className="flex items-center gap-3 rounded-[10px] bg-surface-1 px-4 py-3 text-[13.5px] text-fg"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-3 text-[12px] font-semibold text-muted">
                  {k + 1}
                </span>
                {s}
                <span className="ml-auto shrink-0 text-[12px] text-subtle">
                  {cert.quiz.filter((q) => q.topic === k).length} questions
                </span>
              </li>
            ))}
          </ol>
          <h2 className="mt-8 text-[16px] font-semibold text-fg">Déroulement</h2>
          <ul className="mt-3 flex flex-col gap-2 text-[13.5px] text-muted">
            {[
              `${n} questions à choix unique, tirées au hasard dans une banque de ${cert.quiz.length}, au moins une par thème ; l’ordre des réponses change à chaque tentative.`,
              `${cert.minutes} minutes : à la fin du temps, l’examen est envoyé avec les réponses données.`,
              'Tu peux revenir sur une question et en marquer pour la revoir avant d’envoyer.',
              'Résultat immédiat : score global, score par thème et correction expliquée.',
              'En cas d’échec, nouvelle tentative possible une heure plus tard. Ton meilleur score est gardé.',
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-success" />
                {t}
              </li>
            ))}
          </ul>
          <h2 className="mt-8 text-[16px] font-semibold text-fg">Compétences validées</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {cert.skills.map((s) => (
              <span
                key={s}
                className="rounded-[6px] bg-surface-3 px-2.5 py-1 text-[13px] font-semibold text-fg"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
        <aside className="flex flex-col gap-4 self-start rounded-[10px] bg-surface-1 p-5">
          {result?.passed ? (
            <div className="rounded-[8px] bg-success-soft p-3 text-[14px] text-success">
              <p className="flex items-center gap-2 font-semibold">
                <BadgeCheck className="size-5" />
                Obtenue avec {result.score} %
              </p>
              {result.code && <p className="mt-1 font-mono text-[12.5px]">{result.code}</p>}
            </div>
          ) : result ? (
            <p className="rounded-[8px] bg-warning-soft p-3 text-[14px] font-semibold text-warning">
              Meilleur score : {result.score} %
            </p>
          ) : null}
          {!me ? (
            <ButtonLink to="/connexion" variant="primary" size="lg" className="w-full">
              Se connecter pour passer l’examen
            </ButtonLink>
          ) : wait > 0 && !result?.passed ? (
            <p className="rounded-[8px] bg-surface-2 p-3 text-center text-[13.5px] text-muted">
              Nouvelle tentative possible dans {Math.ceil(wait / 60000)} min. Profite-en pour
              réviser.
            </p>
          ) : (
            <Button variant="primary" size="lg" className="w-full" onClick={onStart}>
              {result ? 'Repasser l’examen' : 'Commencer l’examen'}
            </Button>
          )}
          <ul className="flex flex-col gap-2 text-[13px] text-muted">
            <li className="flex gap-2">
              <Award className="mt-0.5 size-4 shrink-0 text-[#f0b232]" />
              Badge sur ton Passport, avec un code de vérification
            </li>
            <li className="flex gap-2">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
              Gratuit, sans limite dans le temps
            </li>
          </ul>
          {prep && (
            <Link
              to={prep.to}
              onClick={() => cert.course && setCourse(cert.course)}
              className="rounded-[10px] border border-line p-3 text-[13px] hover:border-line-strong"
            >
              <span className="flex items-center gap-1.5 text-[12px] font-semibold text-subtle uppercase">
                <GraduationCap className="size-3.5" />
                Pour se préparer, gratuitement
              </span>
              <span className="font-semibold text-fg">{prep.label}</span>
            </Link>
          )}
        </aside>
      </div>
    </div>
  );
}

function Exam({
  cert,
  exam,
  onFinish,
}: {
  cert: PlatformCert;
  exam: ExamQuestion[];
  onFinish: (answers: (number | null)[]) => void;
}) {
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => exam.map(() => null));
  const [flags, setFlags] = useState<boolean[]>(() => exam.map(() => false));
  const [deadline] = useState(() => Date.now() + cert.minutes * 60_000);
  const [left, setLeft] = useState(cert.minutes * 60_000);
  const [confirm, setConfirm] = useState(false);
  const q = exam[i]!;
  const answered = answers.filter((a) => a !== null).length;

  const finish = useCallback(() => onFinish(answers), [answers, onFinish]);

  useEffect(() => {
    const t = setInterval(() => setLeft(deadline - Date.now()), 500);
    return () => clearInterval(t);
  }, [deadline]);
  useEffect(() => {
    if (left <= 0) finish();
  }, [left, finish]);

  // Quitter la page pendant l'examen : le navigateur demande confirmation.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  const pick = (choice: number) => setAnswers((a) => Object.assign([...a], { [i]: choice }));

  return (
    <div className="dh-page mx-auto w-full max-w-[1000px] px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[14px] font-semibold text-fg">{cert.title}</p>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[14px] font-semibold tabular-nums',
            left < 60_000 ? 'bg-danger-soft text-danger' : 'bg-surface-2 text-fg',
          )}
          role="timer"
          aria-label="Temps restant"
        >
          <Clock className="size-4" />
          {mmss(left)}
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-3">
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${(answered / exam.length) * 100}%`, background: cert.color }}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_240px]">
        <div>
          <p className="text-[13px] text-subtle">
            Question {i + 1} sur {exam.length} · {cert.syllabus[q.topic ?? 0]}
          </p>
          <h1 className="mt-2 text-[19px] leading-snug font-semibold text-fg">{q.q}</h1>
          {q.code && <CodeBlock code={q.code} lang={cert.codeLang} compact className="mt-4" />}
          <div role="radiogroup" aria-label="Réponses" className="mt-5 flex flex-col gap-2">
            {q.order.map((orig, k) => {
              const on = answers[i] === orig;
              return (
                <button
                  key={orig}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => pick(orig)}
                  className={cn(
                    'flex items-center gap-3 rounded-[10px] border-2 p-4 text-left text-[14.5px] transition-colors',
                    on
                      ? 'border-accent bg-accent-soft text-fg'
                      : 'border-line bg-surface-1 text-fg hover:border-line-strong',
                  )}
                >
                  <span
                    className={cn(
                      'grid size-7 shrink-0 place-items-center rounded-full border-2 text-[12px] font-bold',
                      on ? 'border-accent bg-accent text-white' : 'border-line-strong text-subtle',
                    )}
                  >
                    {String.fromCharCode(65 + k)}
                  </span>
                  {q.choices[orig]}
                </button>
              );
            })}
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
            <Button
              variant="secondary"
              icon={<ArrowLeft />}
              disabled={i === 0}
              onClick={() => setI(i - 1)}
            >
              Précédente
            </Button>
            <button
              type="button"
              onClick={() => setFlags((f) => Object.assign([...f], { [i]: !f[i] }))}
              aria-pressed={flags[i]}
              className={cn(
                'inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[13.5px] font-semibold',
                flags[i] ? 'bg-warning-soft text-warning' : 'bg-surface-2 text-muted hover:text-fg',
              )}
            >
              <Flag className="size-4" />
              {flags[i] ? 'Marquée' : 'Marquer pour revoir'}
            </button>
            {i < exam.length - 1 ? (
              <Button variant="primary" onClick={() => setI(i + 1)}>
                Suivante
                <ArrowRight />
              </Button>
            ) : (
              <Button variant="primary" onClick={() => setConfirm(true)}>
                Terminer
              </Button>
            )}
          </div>
        </div>

        <aside className="self-start rounded-[10px] bg-surface-1 p-4">
          <p className="text-[13px] font-semibold text-fg">
            {answered} / {exam.length} répondues
          </p>
          <div className="mt-3 grid grid-cols-5 gap-1.5">
            {exam.map((_, k) => (
              <button
                key={k}
                type="button"
                onClick={() => setI(k)}
                aria-label={`Question ${k + 1}${answers[k] !== null ? ', répondue' : ''}${flags[k] ? ', marquée' : ''}`}
                aria-current={k === i ? 'step' : undefined}
                className={cn(
                  'relative grid h-9 place-items-center rounded-[8px] text-[13px] font-semibold tabular-nums',
                  k === i && 'ring-2 ring-accent',
                  answers[k] !== null
                    ? 'bg-accent-soft text-accent-text'
                    : 'bg-surface-3 text-muted',
                )}
              >
                {k + 1}
                {flags[k] && (
                  <span className="absolute top-0.5 right-0.5 size-2 rounded-full bg-warning" />
                )}
              </button>
            ))}
          </div>
          <Button variant="secondary" className="mt-4 w-full" onClick={() => setConfirm(true)}>
            Envoyer l’examen
          </Button>
        </aside>
      </div>

      {confirm && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="send-title"
        >
          <div className="w-full max-w-[420px] rounded-[16px] bg-canvas p-6">
            <h2 id="send-title" className="text-[18px] font-semibold text-fg">
              Envoyer l’examen ?
            </h2>
            <p className="mt-2 text-[14px] text-muted">
              {answered < exam.length
                ? `Sans réponse : ${exam.length - answered} question${exam.length - answered > 1 ? 's' : ''}, comptée${exam.length - answered > 1 ? 's' : ''} comme fausse${exam.length - answered > 1 ? 's' : ''}.`
                : 'Toutes les questions ont une réponse.'}
              {flags.some(Boolean) && ' Tu as encore des questions marquées pour revoir.'}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirm(false)}>
                Continuer
              </Button>
              <Button variant="primary" onClick={finish}>
                Envoyer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Results({
  cert,
  exam,
  answers,
  onBack,
}: {
  cert: PlatformCert;
  exam: ExamQuestion[];
  answers: (number | null)[];
  onBack: () => void;
}) {
  const record = usePlatform((s) => s.recordCert);
  const stored = usePlatform((s) => s.certResults[cert.id]);
  const prep = usePrep(cert);
  const good = exam.filter((q, k) => answers[k] === q.answer).length;
  const score = Math.round((good / exam.length) * 100);
  const passed = score >= cert.passScore;

  // Le résultat est enregistré une seule fois, à l'arrivée sur cet écran.
  useEffect(() => {
    record(cert.id, score, cert.passScore);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const topics = useMemo(
    () =>
      cert.syllabus.map((label, t) => {
        const qs = exam.filter((q) => (q.topic ?? 0) === t);
        const ok = qs.filter((q) => answers[exam.indexOf(q)] === q.answer).length;
        return { label, total: qs.length, ok };
      }),
    [cert, exam, answers],
  );

  return (
    <div className="dh-page mx-auto w-full max-w-[820px] px-4 py-8">
      <div className="flex flex-col items-center rounded-[14px] border border-line bg-surface-1 p-8 text-center">
        {passed ? (
          <CertBadge color={cert.color} logo={cert.logo} size={80} />
        ) : (
          <span className="grid size-16 place-items-center rounded-full bg-surface-3 text-muted">
            <RotateCcw className="size-7" />
          </span>
        )}
        <p className="mt-4 text-[40px] leading-none font-semibold text-fg tabular-nums">
          {score} %
        </p>
        <p className="mt-1 text-[13px] text-subtle">
          {good} bonnes réponses sur {exam.length} · seuil {cert.passScore} %
        </p>
        <h1 className="mt-3 text-[19px] font-semibold text-fg">
          {passed
            ? 'Certification obtenue, bravo !'
            : score >= cert.passScore - 15
              ? 'Pas encore : tu y es presque'
              : 'Pas encore : encore un peu de révision'}
        </h1>
        {passed && stored?.code && (
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(stored.code!);
              toast.success('Code copié');
            }}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-surface-2 px-4 py-1.5 font-mono text-[13px] text-fg hover:bg-surface-3"
          >
            {stored.code}
            <Copy className="size-3.5 text-subtle" />
          </button>
        )}
        <p className="mt-2 max-w-md text-[13.5px] text-muted">
          {passed
            ? 'Ton badge est ajouté à ton Passport. Le code identifie ce certificat.'
            : 'Regarde les thèmes à retravailler ci-dessous. Nouvelle tentative possible dans une heure.'}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {passed ? (
            <ButtonLink to="/certifications?vue=mes-badges" variant="primary" icon={<BadgeCheck />}>
              Voir mes badges
            </ButtonLink>
          ) : (
            prep && (
              <ButtonLink to={prep.to} variant="primary" icon={<GraduationCap />}>
                Réviser : {prep.label}
              </ButtonLink>
            )
          )}
          <Button variant="secondary" onClick={onBack}>
            Retour à la fiche
          </Button>
        </div>
      </div>

      <h2 className="mt-8 text-[15px] font-semibold text-fg">Score par thème</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {topics
          .filter((t) => t.total > 0)
          .map((t) => {
            const pct = Math.round((t.ok / t.total) * 100);
            const ok = pct >= cert.passScore;
            return (
              <li key={t.label} className="rounded-[10px] bg-surface-1 p-3">
                <div className="flex items-center justify-between text-[13.5px]">
                  <span className="font-medium text-fg">{t.label}</span>
                  <span
                    className={cn(
                      'font-semibold tabular-nums',
                      ok ? 'text-success' : 'text-warning',
                    )}
                  >
                    {t.ok}/{t.total}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3">
                  <div
                    className={cn('h-full rounded-full', ok ? 'bg-success' : 'bg-warning')}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
      </ul>

      <h2 className="mt-8 text-[15px] font-semibold text-fg">Correction</h2>
      <ol className="mt-3 flex flex-col gap-2">
        {exam.map((q, k) => {
          const ok = answers[k] === q.answer;
          const given = answers[k];
          return (
            <li key={q.q} className="rounded-[10px] bg-surface-1 p-4">
              <p className="flex gap-2 font-semibold text-fg">
                {ok ? (
                  <Check className="mt-0.5 size-4 shrink-0 text-success" />
                ) : (
                  <X className="mt-0.5 size-4 shrink-0 text-danger" />
                )}
                <span>
                  {k + 1}. {q.q}
                </span>
              </p>
              {q.code && (
                <CodeBlock code={q.code} lang={cert.codeLang} compact className="mt-2 ml-6" />
              )}
              {!ok && (
                <p className="mt-1 pl-6 text-[13px] text-muted">
                  {given === null || given === undefined ? (
                    'Sans réponse. '
                  ) : (
                    <>Ta réponse : {q.choices[given]}. </>
                  )}
                  Bonne réponse : <b className="text-fg">{q.choices[q.answer]}</b>
                </p>
              )}
              <p className="mt-1 pl-6 text-[13px] text-muted">{q.explain}</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
