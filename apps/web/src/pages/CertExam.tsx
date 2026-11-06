import type { CertAttemptResult, CertAttemptView, CertQuestion } from '@devhub/contracts';
import { CERT_RETRY_DELAY_MS } from '@devhub/core';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BadgeCheck,
  BookOpen,
  CalendarDays,
  Check,
  CircleCheck,
  Clock,
  Copy,
  Dumbbell,
  Flag,
  ListChecks,
  RotateCcw,
  ShieldCheck,
  Target,
  Timer,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { Button, ButtonLink, Spinner } from '@/components/ui/button';
import { CodeBlock } from '@/components/ui/code';
import { Skeleton } from '@/components/ui/primitives';
import { invalidate, useQuery } from '@/lib/query';
import { cn } from '@/lib/utils';
import { certsApi, type MyCert } from '@/platform/certs-api';
import { PLATFORM_CERTS } from '@/platform/data/certs';
import { loadCourse, lessonKey } from '@/platform/data/courses';
import { courseMeta } from '@/platform/data/courses/meta';
import { dayKey, usePlatform, type TopicStats } from '@/platform/store';
import type { PlatformCert } from '@/platform/types';
import { Chips, CertBadge } from '@/platform/ui';
import { useSession } from '@/stores/app';
import { LevelPill } from './Certifications';
import NotFound from './NotFound';

/** Référence stable : un sélecteur du store ne doit pas renvoyer un nouveau tableau à chaque rendu. */
const NO_IDS: string[] = [];

const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const ERRORS: Record<string, string> = {
  'cert.retry_later': 'Nouvelle tentative possible une heure après un échec.',
  'cert.mock_limit':
    'Tu as passé 5 examens blancs en 24 h sur cette certification : reviens demain.',
  'cert.already_submitted': 'Cet examen a déjà été envoyé.',
  'network.offline': 'Pas de connexion : l’examen a besoin du réseau pour être corrigé.',
  'http.401': 'Connecte-toi pour passer l’examen.',
};
const errorText = (e: unknown) =>
  ERRORS[(e as { code?: string })?.code ?? ''] ?? 'Une erreur est survenue, réessaie.';

/** Maîtrise d'un thème à l'entraînement : part de bonnes réponses, null si jamais travaillé. */
function mastery(stats: TopicStats | undefined, topic: number): number | null {
  const t = stats?.[topic];
  return t && t.seen > 0 ? Math.round((t.ok / t.seen) * 100) : null;
}

/** Fiche d'une certification DevHub : préparation, examen blanc et examen corrigés par le serveur. */
export default function CertExam() {
  const { id = '' } = useParams();
  const cert = PLATFORM_CERTS.find((c) => c.id === id);
  const [attempt, setAttempt] = useState<CertAttemptView | null>(null);
  const [result, setResult] = useState<CertAttemptResult | null>(null);
  if (!cert) return <NotFound />;
  if (result)
    return (
      <Results
        cert={cert}
        result={result}
        onBack={() => {
          setResult(null);
          window.scrollTo(0, 0);
        }}
      />
    );
  if (attempt)
    return (
      <Exam
        cert={cert}
        attempt={attempt}
        onDone={(r) => {
          setResult(r);
          setAttempt(null);
          invalidate('certs:');
          window.scrollTo(0, 0);
        }}
      />
    );
  return <Prep cert={cert} onStart={setAttempt} />;
}

/* ---------------- Fiche et préparation ---------------- */

type View = 'programme' | 'entrainement' | 'erreurs' | 'plan';

function Prep({ cert, onStart }: { cert: PlatformCert; onStart: (a: CertAttemptView) => void }) {
  const me = useSession((s) => s.user);
  const [params, setParams] = useSearchParams();
  const view = (params.get('vue') as View) || 'programme';
  const mistakes = usePlatform((s) => s.certMistakes[cert.id] ?? NO_IDS);
  const [practice, setPractice] = useState<{ topic?: number; ids?: string[] } | null>(null);
  const { data: mine } = useQuery(me ? 'certs:me' : null, () => certsApi.mine());
  const status = mine?.items.find((i) => i.certId === cert.id) ?? null;
  const go = (v: View) => {
    setPractice(null);
    setParams(v === 'programme' ? {} : { vue: v }, { replace: true });
  };

  return (
    <div className="dh-page">
      <div className="border-b border-line px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-[1080px]">
          <Link
            to="/certifications"
            className="inline-flex items-center gap-1.5 text-[14px] font-medium text-muted hover:text-fg"
          >
            <ArrowLeft className="size-4" />
            Certifications
          </Link>
          <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
            <CertBadge color={cert.color} logo={cert.logo} size={84} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <LevelPill level={cert.level} />
                <span className="rounded-full bg-success-soft px-2 py-0.5 text-[12px] font-medium text-success">
                  Gratuit
                </span>
                <span className="text-[13px] text-muted">Certification DevHub · {cert.track}</span>
              </div>
              <h1 className="mt-2 text-[28px] leading-tight font-bold tracking-[-0.02em] text-fg">
                {cert.title}
              </h1>
              <p className="mt-1.5 max-w-2xl text-[15px] text-muted">{cert.description}</p>
              <div className="mt-3 flex flex-wrap gap-4 text-[14px] text-fg">
                <span className="inline-flex items-center gap-1.5">
                  <Timer className="size-4" />
                  {cert.minutes} minutes chronométrées
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ListChecks className="size-4" />
                  {Math.min(cert.draw, cert.bankSize)} questions tirées parmi {cert.bankSize}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <BadgeCheck className="size-4" />
                  {cert.passScore} % pour réussir
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1080px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <Chips
            value={view}
            onChange={go}
            items={[
              { id: 'programme', label: 'Programme' },
              { id: 'entrainement', label: 'S’entraîner' },
              {
                id: 'erreurs',
                label: `Mes erreurs${mistakes.length ? ` · ${mistakes.length}` : ''}`,
              },
              { id: 'plan', label: 'Mon plan' },
            ]}
          />
          <div className="mt-5">
            {practice ? (
              <Practice cert={cert} source={practice} onExit={() => setPractice(null)} />
            ) : view === 'entrainement' ? (
              <TrainView cert={cert} onPractice={setPractice} />
            ) : view === 'erreurs' ? (
              <MistakesView cert={cert} onPractice={setPractice} />
            ) : view === 'plan' ? (
              <PlanView
                cert={cert}
                status={status}
                onPractice={setPractice}
                onStart={onStart}
                signedIn={!!me}
              />
            ) : (
              <ProgramView
                cert={cert}
                onPractice={(topic) => {
                  setParams({ vue: 'entrainement' }, { replace: true });
                  setPractice({ topic });
                }}
              />
            )}
          </div>
        </div>
        <StatusCard cert={cert} status={status} signedIn={!!me} onStart={onStart} />
      </div>
    </div>
  );
}

function StatusCard({
  cert,
  status,
  signedIn,
  onStart,
}: {
  cert: PlatformCert;
  status: MyCert | null;
  signedIn: boolean;
  onStart: (a: CertAttemptView) => void;
}) {
  const [now] = useState(() => Date.now());
  const wait = status?.nextAttemptAt ? new Date(status.nextAttemptAt).getTime() - now : 0;
  const examActive = status?.active?.mode === 'exam';
  const mockActive = status?.active?.mode === 'mock';
  return (
    <aside className="surface-card flex flex-col gap-4 self-start p-5">
      {status?.certificate ? (
        <div className="rounded-[10px] bg-success-soft p-3 text-[14px] text-success">
          <p className="flex items-center gap-2 font-semibold">
            <BadgeCheck className="size-5" />
            Obtenue avec {status.certificate.bestScore} %
          </p>
          <Link
            to={`/certificat/${status.certificate.code}`}
            className="mt-1 inline-block font-mono text-[13px] underline-offset-2 hover:underline"
          >
            {status.certificate.code}
          </Link>
        </div>
      ) : status?.lastAttempt ? (
        <p className="rounded-[10px] bg-warning-soft p-3 text-[14px] font-semibold text-warning">
          Dernier examen : {status.lastAttempt.score} %
        </p>
      ) : null}
      {!signedIn ? (
        <ButtonLink
          to={`/connexion?next=${encodeURIComponent(`/certifications/${cert.id}`)}`}
          variant="primary"
          size="lg"
          className="w-full"
        >
          Se connecter pour passer l’examen
        </ButtonLink>
      ) : (
        <>
          {wait > 0 && !examActive ? (
            <p className="rounded-[10px] bg-surface-2 p-3 text-center text-[14px] text-fg">
              Nouvelle tentative possible dans {Math.ceil(wait / 60000)} min. Profite-en pour
              t’entraîner ou passer un examen blanc.
            </p>
          ) : (
            <StartButton
              cert={cert}
              mode="exam"
              onStart={onStart}
              label={
                examActive
                  ? 'Reprendre l’examen en cours'
                  : status?.lastAttempt
                    ? 'Repasser l’examen'
                    : 'Commencer l’examen'
              }
              variant="primary"
            />
          )}
          <StartButton
            cert={cert}
            mode="mock"
            onStart={onStart}
            label={mockActive ? 'Reprendre l’examen blanc' : 'Passer un examen blanc'}
            variant="secondary"
          />
        </>
      )}
      <ul className="flex flex-col gap-2 text-[14px] text-fg">
        <li className="flex gap-2">
          <Award className="mt-0.5 size-4 shrink-0 text-[#c27c0e]" />
          Badge sur ton profil, avec un code que n’importe qui peut vérifier
        </li>
        <li className="flex gap-2">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
          Questions tirées et corrigées par le serveur
        </li>
        <li className="flex gap-2">
          <Target className="mt-0.5 size-4 shrink-0 text-blue-text" />
          L’examen blanc est corrigé pareil, sans compter ni bloquer
        </li>
      </ul>
    </aside>
  );
}

function StartButton({
  cert,
  mode,
  label,
  variant,
  onStart,
}: {
  cert: PlatformCert;
  mode: 'exam' | 'mock';
  label: string;
  variant: 'primary' | 'secondary';
  onStart: (a: CertAttemptView) => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant={variant}
      size="lg"
      className="w-full"
      disabled={busy}
      icon={busy ? <Spinner /> : mode === 'exam' ? <Award /> : <Target />}
      onClick={async () => {
        setBusy(true);
        try {
          onStart(await certsApi.start(cert.id, mode));
          window.scrollTo(0, 0);
        } catch (e) {
          toast.error(errorText(e));
          invalidate('certs:');
        } finally {
          setBusy(false);
        }
      }}
    >
      {label}
    </Button>
  );
}

function MasteryBar({ value }: { value: number | null }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-3">
        {value !== null && (
          <div
            className={cn(
              'h-full rounded-full',
              value >= 75 ? 'bg-success' : value >= 50 ? 'bg-warning' : 'bg-danger',
            )}
            style={{ width: `${Math.max(6, value)}%` }}
          />
        )}
      </div>
      <span className="w-14 text-right text-[13px] font-medium tabular text-fg">
        {value === null ? 'à faire' : `${value} %`}
      </span>
    </div>
  );
}

function ProgramView({
  cert,
  onPractice,
}: {
  cert: PlatformCert;
  onPractice: (topic: number) => void;
}) {
  const stats = usePlatform((s) => s.certPractice[cert.id]);
  return (
    <>
      <h2 className="text-[18px] font-semibold text-fg">Programme par thème</h2>
      <p className="mt-1 text-[14px] text-muted">
        Ta maîtrise de chaque thème se calcule sur tes réponses à l’entraînement et aux examens.
      </p>
      <ol className="mt-4 flex flex-col gap-2">
        {cert.syllabus.map((s, k) => (
          <li key={s} className="surface-card flex flex-wrap items-center gap-3 px-4 py-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft text-[13px] font-semibold text-accent-text">
              {k + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium text-fg">{s}</p>
              <p className="text-[13px] text-muted">
                {cert.topicCounts[k]} questions dans la banque
              </p>
            </div>
            <MasteryBar value={mastery(stats, k)} />
            <Button size="sm" icon={<Dumbbell />} onClick={() => onPractice(k)}>
              S’entraîner
            </Button>
          </li>
        ))}
      </ol>
      {cert.course && <CourseLessons courseId={cert.course} />}
      <h2 className="mt-8 text-[18px] font-semibold text-fg">Déroulement de l’examen</h2>
      <ul className="mt-3 flex flex-col gap-2 text-[14px] text-fg">
        {[
          `${Math.min(cert.draw, cert.bankSize)} questions à choix unique, tirées par le serveur dans une banque de ${cert.bankSize}, au moins une par thème ; l’ordre des réponses change à chaque tentative.`,
          `${cert.minutes} minutes : à la fin du temps, l’examen est envoyé avec les réponses données. Si tu recharges la page, tu reprends là où tu en étais, avec le même chrono.`,
          'Tu peux revenir sur une question et en marquer pour la revoir avant d’envoyer.',
          'Résultat immédiat : score global, score par thème et correction expliquée. Tes erreurs rejoignent « Mes erreurs ».',
          `En cas d’échec, nouvelle tentative ${CERT_RETRY_DELAY_MS / 3_600_000} heure plus tard ; ton meilleur score est gardé. L’examen blanc, lui, reste ouvert.`,
        ].map((t) => (
          <li key={t} className="flex gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-success" />
            {t}
          </li>
        ))}
      </ul>
      <h2 className="mt-8 text-[18px] font-semibold text-fg">Compétences validées</h2>
      <div className="mt-2 flex flex-wrap gap-2">
        {cert.skills.map((s) => (
          <span
            key={s}
            className="rounded-[8px] bg-surface-3 px-2.5 py-1 text-[13px] font-semibold text-fg"
          >
            {s}
          </span>
        ))}
      </div>
    </>
  );
}

/** Leçons du cours qui prépare à la certification (contenu chargé à la demande). */
function CourseLessons({ courseId }: { courseId: string }) {
  const meta = courseMeta(courseId);
  const done = usePlatform((s) => s.lessonsDone);
  const { data: course } = useQuery(`course:${courseId}`, () => loadCourse(courseId));
  if (!meta) return null;
  return (
    <section className="mt-8">
      <h2 className="flex items-center gap-2 text-[18px] font-semibold text-fg">
        <BookOpen className="size-5" />
        Leçons pour réviser : {meta.title}
      </h2>
      <p className="mt-1 text-[14px] text-muted">
        Des leçons courtes avec exercices corrigés, à faire dans l’ordre ou au besoin.
      </p>
      {!course ? (
        <Skeleton className="mt-4 h-40 rounded-[14px]" />
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {course.units.map((u) => (
            <div key={u.id} className="surface-card p-4">
              <p className="text-[15px] font-semibold text-fg">{u.title}</p>
              <p className="mt-0.5 text-[13px] text-muted">{u.goal}</p>
              <ul className="mt-3 flex flex-col gap-1">
                {u.lessons.map((l) => {
                  const isDone = done.includes(lessonKey(courseId, l.id));
                  return (
                    <li key={l.id}>
                      <Link
                        to={`/lecon/${courseId}/${l.id}`}
                        className="flex items-center gap-2 rounded-[8px] px-2 py-1.5 text-[14px] text-fg hover:bg-surface-2"
                      >
                        {isDone ? (
                          <CircleCheck className="size-4 shrink-0 text-success" />
                        ) : (
                          <span className="size-4 shrink-0 rounded-full border-2 border-line-strong" />
                        )}
                        {l.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function TrainView({
  cert,
  onPractice,
}: {
  cert: PlatformCert;
  onPractice: (s: { topic?: number }) => void;
}) {
  const stats = usePlatform((s) => s.certPractice[cert.id]);
  const total = Object.values(stats ?? {}).reduce((s, t) => s + t.seen, 0);
  return (
    <>
      <h2 className="text-[18px] font-semibold text-fg">S’entraîner, sans chrono</h2>
      <p className="mt-1 text-[14px] text-muted">
        10 questions de la vraie banque, corrigées une par une avec l’explication.
        {total > 0 && ` Tu as déjà répondu à ${total} questions.`}
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onPractice({})}
          className="surface-card flex items-center gap-3 p-4 text-left transition-transform active:scale-[0.99]"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-text">
            <Dumbbell className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-fg">Tous les thèmes</span>
            <span className="block text-[13px] text-muted">Un mélange, comme à l’examen</span>
          </span>
          <ArrowRight className="size-4 text-muted" />
        </button>
        {cert.syllabus.map((s, k) => (
          <button
            key={s}
            type="button"
            onClick={() => onPractice({ topic: k })}
            className="surface-card flex items-center gap-3 p-4 text-left transition-transform active:scale-[0.99]"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-3 text-[14px] font-semibold text-fg">
              {k + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-fg">{s}</span>
              <MasteryBar value={mastery(stats, k)} />
            </span>
            <ArrowRight className="size-4 text-muted" />
          </button>
        ))}
      </div>
    </>
  );
}

function MistakesView({
  cert,
  onPractice,
}: {
  cert: PlatformCert;
  onPractice: (s: { ids: string[] }) => void;
}) {
  const mistakes = usePlatform((s) => s.certMistakes[cert.id] ?? NO_IDS);
  return (
    <div className="surface-card flex flex-col items-start gap-3 p-6">
      <RotateCcw className="size-7 text-fg" />
      {mistakes.length === 0 ? (
        <>
          <p className="text-[16px] font-semibold text-fg">Aucune erreur à revoir</p>
          <p className="text-[14px] text-muted">
            Les questions ratées à l’entraînement et aux examens arrivent ici. Une question bien
            répondue en révision quitte la liste.
          </p>
        </>
      ) : (
        <>
          <p className="text-[16px] font-semibold text-fg">
            {mistakes.length} question{mistakes.length > 1 ? 's' : ''} à revoir
          </p>
          <p className="text-[14px] text-muted">
            Réponds-y de nouveau avec l’explication ; chaque bonne réponse retire la question de la
            liste.
          </p>
          <Button
            variant="primary"
            icon={<RotateCcw />}
            onClick={() => onPractice({ ids: mistakes.slice(-30) })}
          >
            Revoir mes erreurs
          </Button>
        </>
      )}
    </div>
  );
}

/* ---------------- Plan de révision ---------------- */

interface PlanTask {
  kind: 'topic' | 'mock' | 'mistakes' | 'exam';
  topic?: number;
}

/**
 * Plan jusqu'à la date d'examen : les thèmes les moins maîtrisés d'abord, un examen blanc et la
 * révision des erreurs la veille, l'examen le jour J. Au-delà de 60 jours, le plan s'arrête.
 */
export function buildPlan(
  cert: Pick<PlatformCert, 'syllabus'>,
  examDate: string,
  stats: TopicStats | undefined,
  today: Date,
): Array<{ day: string; tasks: PlanTask[] }> {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const [y, m, d] = examDate.split('-').map(Number);
  const exam = new Date(y!, m! - 1, d!);
  const days: string[] = [];
  for (const cur = new Date(start); cur < exam && days.length < 60; cur.setDate(cur.getDate() + 1))
    days.push(dayKey(cur));
  const order = cert.syllabus
    .map((_, k) => ({ k, m: mastery(stats, k) }))
    .sort((a, b) => (a.m ?? -1) - (b.m ?? -1))
    .map((x) => x.k);
  const plan: Array<{ day: string; tasks: PlanTask[] }> = [];
  const studyDays = days.length >= 2 ? days.slice(0, -1) : days;
  if (studyDays.length > 0) {
    if (studyDays.length >= order.length) {
      studyDays.forEach((day, i) =>
        plan.push({ day, tasks: [{ kind: 'topic', topic: order[i % order.length]! }] }),
      );
    } else {
      // Moins de jours que de thèmes : plusieurs thèmes par jour.
      studyDays.forEach((day, i) => {
        const per = Math.ceil(order.length / studyDays.length);
        const topics = order.slice(i * per, (i + 1) * per);
        if (topics.length)
          plan.push({ day, tasks: topics.map((topic) => ({ kind: 'topic', topic })) });
      });
    }
  }
  if (days.length >= 2)
    plan.push({ day: days[days.length - 1]!, tasks: [{ kind: 'mock' }, { kind: 'mistakes' }] });
  plan.push({ day: dayKey(exam), tasks: [{ kind: 'exam' }] });
  return plan;
}

function PlanView({
  cert,
  status,
  signedIn,
  onPractice,
  onStart,
}: {
  cert: PlatformCert;
  status: MyCert | null;
  signedIn: boolean;
  onPractice: (s: { topic?: number; ids?: string[] }) => void;
  onStart: (a: CertAttemptView) => void;
}) {
  const plan = usePlatform((s) => s.certPlans[cert.id]);
  const stats = usePlatform((s) => s.certPractice[cert.id]);
  const mistakes = usePlatform((s) => s.certMistakes[cert.id] ?? NO_IDS);
  const setPlan = usePlatform((s) => s.setCertPlan);
  const toggle = usePlatform((s) => s.togglePlanDay);
  const [today] = useState(() => new Date());
  const todayKey = dayKey(today);
  const min = useMemo(() => {
    const t = new Date(today);
    t.setDate(t.getDate() + 1);
    return dayKey(t);
  }, [today]);
  const days = useMemo(
    () => (plan ? buildPlan(cert, plan.examDate, stats, today) : []),
    [cert, plan, stats, today],
  );
  const fmt = (day: string) => {
    const [y, m, d] = day.split('-').map(Number);
    return new Date(y!, m! - 1, d!).toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <>
      <h2 className="flex items-center gap-2 text-[18px] font-semibold text-fg">
        <CalendarDays className="size-5" />
        Mon plan jusqu’à l’examen
      </h2>
      <p className="mt-1 text-[14px] text-muted">
        Choisis ta date d’examen : DevHub répartit les thèmes, en commençant par ceux que tu
        maîtrises le moins, et garde la veille pour un examen blanc.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-fg">
          Date d’examen
          <input
            type="date"
            min={min}
            value={plan?.examDate ?? ''}
            onChange={(e) => setPlan(cert.id, e.target.value || null)}
            className="lg-clear h-10 rounded-[10px] px-3 text-[14px] text-fg"
          />
        </label>
        {plan && (
          <Button variant="ghost" onClick={() => setPlan(cert.id, null)}>
            Effacer le plan
          </Button>
        )}
      </div>
      {plan && (
        <ol className="mt-5 flex flex-col gap-2">
          {days.map(({ day, tasks }) => {
            const isDone = plan.done.includes(day);
            const isToday = day === todayKey;
            return (
              <li
                key={day}
                className={cn(
                  'surface-card flex flex-wrap items-center gap-3 px-4 py-3',
                  isToday && 'ring-2 ring-accent',
                )}
              >
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={isDone}
                  aria-label={`Journée du ${fmt(day)} faite`}
                  onClick={() => toggle(cert.id, day)}
                  disabled={tasks[0]?.kind === 'exam'}
                  className={cn(
                    'grid size-6 shrink-0 place-items-center rounded-full border-2',
                    isDone ? 'border-success bg-success text-canvas' : 'border-line-strong',
                    tasks[0]?.kind === 'exam' && 'invisible',
                  )}
                >
                  {isDone && <Check className="size-3.5" />}
                </button>
                <span className="w-24 shrink-0 text-[14px] font-semibold text-fg">
                  {isToday ? 'Aujourd’hui' : fmt(day)}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  {tasks.map((t, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-2">
                      <span className={cn('text-[14px] text-fg', isDone && 'line-through')}>
                        {t.kind === 'topic'
                          ? `${cert.syllabus[t.topic!]} : 10 questions`
                          : t.kind === 'mock'
                            ? 'Examen blanc chronométré'
                            : t.kind === 'mistakes'
                              ? `Revoir mes erreurs${mistakes.length ? ` (${mistakes.length})` : ''}`
                              : 'Jour de l’examen'}
                      </span>
                      {isToday && t.kind === 'topic' && (
                        <Button size="xs" onClick={() => onPractice({ topic: t.topic })}>
                          Commencer
                        </Button>
                      )}
                      {isToday && t.kind === 'mistakes' && mistakes.length > 0 && (
                        <Button size="xs" onClick={() => onPractice({ ids: mistakes.slice(-30) })}>
                          Revoir
                        </Button>
                      )}
                      {isToday && signedIn && (t.kind === 'mock' || t.kind === 'exam') && (
                        <StartInline
                          cert={cert}
                          mode={t.kind === 'mock' ? 'mock' : 'exam'}
                          disabled={t.kind === 'exam' && !!status?.nextAttemptAt}
                          onStart={onStart}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}

function StartInline({
  cert,
  mode,
  disabled,
  onStart,
}: {
  cert: PlatformCert;
  mode: 'exam' | 'mock';
  disabled?: boolean;
  onStart: (a: CertAttemptView) => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="xs"
      disabled={busy || disabled}
      onClick={async () => {
        setBusy(true);
        try {
          onStart(await certsApi.start(cert.id, mode));
        } catch (e) {
          toast.error(errorText(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      Commencer
    </Button>
  );
}

/* ---------------- Entraînement ---------------- */

function Practice({
  cert,
  source,
  onExit,
}: {
  cert: PlatformCert;
  source: { topic?: number; ids?: string[] };
  onExit: () => void;
}) {
  const record = usePlatform((s) => s.recordAnswers);
  const [round, setRound] = useState(0);
  const key = `cert-practice:${cert.id}:${source.topic ?? ''}:${source.ids?.join(',') ?? ''}:${round}`;
  const { data, error } = useQuery(key, () =>
    certsApi.practice(cert.id, { topic: source.topic, ids: source.ids, count: 10 }),
  );
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [checked, setChecked] = useState<{
    correct: boolean;
    answer: number;
    explain: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [good, setGood] = useState(0);
  const title =
    source.ids !== undefined
      ? 'Révision des erreurs'
      : source.topic !== undefined
        ? cert.syllabus[source.topic]
        : 'Tous les thèmes';

  if (error)
    return (
      <div className="surface-card p-5 text-[15px] text-fg">
        {errorText(error)}
        <div className="mt-3">
          <Button onClick={onExit}>Retour</Button>
        </div>
      </div>
    );
  if (!data) return <Skeleton className="h-72 rounded-[14px]" />;
  const questions = data.questions;
  if (questions.length === 0)
    return (
      <div className="surface-card p-5 text-[15px] text-fg">
        Aucune question à revoir.
        <div className="mt-3">
          <Button onClick={onExit}>Retour</Button>
        </div>
      </div>
    );

  if (i >= questions.length)
    return (
      <div className="surface-card flex flex-col items-center gap-3 p-8 text-center">
        <p className="text-[40px] leading-none font-bold tabular text-fg">
          {good}/{questions.length}
        </p>
        <p className="text-[15px] text-fg">
          {good === questions.length
            ? 'Sans faute. Passe au thème suivant ou tente un examen blanc.'
            : 'Tes erreurs sont dans « Mes erreurs » pour la révision.'}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            variant="primary"
            icon={<RotateCcw />}
            onClick={() => {
              setRound((r) => r + 1);
              setI(0);
              setGood(0);
              setPicked(null);
              setChecked(null);
            }}
          >
            Nouvelle série
          </Button>
          <Button onClick={onExit}>Terminer</Button>
        </div>
      </div>
    );

  const q = questions[i]!;
  async function check() {
    if (picked === null) return;
    setBusy(true);
    try {
      const r = await certsApi.check(cert.id, q.id, picked);
      setChecked(r);
      if (r.correct) setGood((g) => g + 1);
      record(cert.id, [{ id: q.id, topic: q.topic, correct: r.correct }]);
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="surface-card p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-medium text-muted">
          {title} · question {i + 1} sur {questions.length}
        </p>
        <Button size="xs" variant="ghost" onClick={onExit}>
          Arrêter
        </Button>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3">
        <div
          className="h-full rounded-full bg-accent-strong transition-[width]"
          style={{ width: `${(i / questions.length) * 100}%` }}
        />
      </div>
      <QuestionBody cert={cert} q={q} />
      <div role="radiogroup" aria-label="Réponses" className="mt-5 flex flex-col gap-2">
        {q.choices.map((c, k) => {
          const state = checked
            ? k === checked.answer
              ? 'right'
              : k === picked
                ? 'wrong'
                : 'idle'
            : k === picked
              ? 'picked'
              : 'idle';
          return (
            <Choice
              key={k}
              index={k}
              label={c}
              state={state}
              disabled={!!checked}
              onClick={() => setPicked(k)}
            />
          );
        })}
      </div>
      {checked && (
        <p
          className={cn(
            'mt-4 rounded-[10px] p-3 text-[14px]',
            checked.correct ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger',
          )}
          role="status"
        >
          <b>{checked.correct ? 'Bonne réponse. ' : 'Pas tout à fait. '}</b>
          <span className="text-fg">{checked.explain}</span>
        </p>
      )}
      <div className="mt-5 flex justify-end">
        {checked ? (
          <Button
            variant="primary"
            onClick={() => {
              setI(i + 1);
              setPicked(null);
              setChecked(null);
            }}
          >
            {i + 1 < questions.length ? 'Question suivante' : 'Voir le bilan'}
            <ArrowRight />
          </Button>
        ) : (
          <Button
            variant="primary"
            disabled={picked === null || busy}
            icon={busy ? <Spinner /> : undefined}
            onClick={check}
          >
            Vérifier
          </Button>
        )}
      </div>
    </div>
  );
}

function QuestionBody({ cert, q }: { cert: PlatformCert; q: CertQuestion }) {
  return (
    <>
      <p className="mt-5 text-[13px] text-muted">{cert.syllabus[q.topic]}</p>
      <h2 className="mt-1 text-[19px] leading-snug font-semibold text-fg">{q.q}</h2>
      {q.code && <CodeBlock code={q.code} lang={cert.codeLang} compact className="mt-4" />}
    </>
  );
}

function Choice({
  index,
  label,
  state,
  disabled,
  onClick,
}: {
  index: number;
  label: string;
  state: 'idle' | 'picked' | 'right' | 'wrong';
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={state === 'picked'}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-[12px] border-2 p-4 text-left text-[15px] text-fg transition-colors',
        state === 'picked' && 'border-accent bg-accent-soft',
        state === 'right' && 'border-success bg-success-soft',
        state === 'wrong' && 'border-danger bg-danger-soft',
        state === 'idle' && 'border-line bg-surface-1 enabled:hover:border-line-strong',
      )}
    >
      <span
        className={cn(
          'grid size-7 shrink-0 place-items-center rounded-full border-2 text-[12px] font-bold',
          state === 'picked'
            ? 'border-accent bg-accent text-white'
            : state === 'right'
              ? 'border-success bg-success text-canvas'
              : state === 'wrong'
                ? 'border-danger bg-danger text-canvas'
                : 'border-line-strong text-muted',
        )}
      >
        {String.fromCharCode(65 + index)}
      </span>
      {label}
    </button>
  );
}

/* ---------------- Examen ---------------- */

function Exam({
  cert,
  attempt,
  onDone,
}: {
  cert: PlatformCert;
  attempt: CertAttemptView;
  onDone: (r: CertAttemptResult) => void;
}) {
  const record = usePlatform((s) => s.recordAnswers);
  const exam = attempt.questions;
  const storageKey = `dh-exam:${attempt.id}`;
  const [i, setI] = useState(0);
  // Les réponses survivent à un rechargement de la page (la tentative est reprise par le serveur).
  const [answers, setAnswers] = useState<(number | null)[]>(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null') as unknown;
      if (Array.isArray(saved) && saved.length === exam.length) return saved as (number | null)[];
    } catch {
      /* stockage indisponible */
    }
    return exam.map(() => null);
  });
  const [flags, setFlags] = useState<boolean[]>(() => exam.map(() => false));
  const deadline = useMemo(() => new Date(attempt.deadline).getTime(), [attempt.deadline]);
  const [left, setLeft] = useState(() => deadline - Date.now());
  const [confirm, setConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const sent = useRef(false);
  const q = exam[i]!;
  const answered = answers.filter((a) => a !== null).length;
  const mock = attempt.mode === 'mock';

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(answers));
    } catch {
      /* stockage indisponible */
    }
  }, [answers, storageKey]);

  const finish = useCallback(async () => {
    if (sent.current) return;
    sent.current = true;
    setSending(true);
    try {
      const r = await certsApi.submit(attempt.id, answers);
      if (!r.late)
        record(
          cert.id,
          r.corrections.map((c) => ({ id: c.id, topic: c.topic, correct: c.correct })),
        );
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        /* stockage indisponible */
      }
      onDone(r);
    } catch (e) {
      sent.current = false;
      setSending(false);
      toast.error(errorText(e));
    }
  }, [answers, attempt.id, cert.id, onDone, record, storageKey]);

  useEffect(() => {
    const t = setInterval(() => setLeft(deadline - Date.now()), 500);
    return () => clearInterval(t);
  }, [deadline]);
  useEffect(() => {
    if (left <= 0) void finish();
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
        <p className="text-[15px] font-semibold text-fg">
          {mock ? 'Examen blanc · ' : ''}
          {cert.title}
        </p>
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
      {attempt.resumed && (
        <p className="mt-3 rounded-[10px] bg-blue-soft px-3 py-2 text-[14px] text-blue-text">
          Tentative reprise : le chrono a continué pendant ton absence.
        </p>
      )}
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-3">
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${(answered / exam.length) * 100}%`, background: cert.color }}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_240px]">
        <div className="min-w-0">
          <p className="text-[13px] text-muted">
            Question {i + 1} sur {exam.length} · {cert.syllabus[q.topic]}
          </p>
          <h1 className="mt-2 text-[19px] leading-snug font-semibold text-fg">{q.q}</h1>
          {q.code && <CodeBlock code={q.code} lang={cert.codeLang} compact className="mt-4" />}
          <div role="radiogroup" aria-label="Réponses" className="mt-5 flex flex-col gap-2">
            {q.choices.map((c, k) => (
              <Choice
                key={k}
                index={k}
                label={c}
                state={answers[i] === k ? 'picked' : 'idle'}
                onClick={() => pick(k)}
              />
            ))}
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
                'inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold',
                flags[i] ? 'bg-warning-soft text-warning' : 'bg-surface-2 text-fg',
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

        <aside className="surface-card self-start p-4">
          <p className="text-[14px] font-semibold text-fg">
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
                  answers[k] !== null ? 'bg-accent-soft text-accent-text' : 'bg-surface-3 text-fg',
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
            Envoyer {mock ? 'l’examen blanc' : 'l’examen'}
          </Button>
        </aside>
      </div>

      {(confirm || sending) && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="send-title"
        >
          <div className="w-full max-w-[420px] rounded-[16px] bg-canvas p-6">
            <h2 id="send-title" className="text-[18px] font-semibold text-fg">
              {sending ? 'Correction en cours…' : 'Envoyer l’examen ?'}
            </h2>
            {!sending && (
              <>
                <p className="mt-2 text-[14px] text-fg">
                  {answered < exam.length
                    ? `Sans réponse : ${exam.length - answered} question${exam.length - answered > 1 ? 's' : ''}, comptée${exam.length - answered > 1 ? 's' : ''} comme fausse${exam.length - answered > 1 ? 's' : ''}.`
                    : 'Toutes les questions ont une réponse.'}
                  {flags.some(Boolean) && ' Tu as encore des questions marquées pour revoir.'}
                </p>
                <div className="mt-5 flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => setConfirm(false)}>
                    Continuer
                  </Button>
                  <Button variant="primary" onClick={() => void finish()}>
                    Envoyer
                  </Button>
                </div>
              </>
            )}
            {sending && <Spinner className="mt-4" />}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Résultat ---------------- */

function Results({
  cert,
  result,
  onBack,
}: {
  cert: PlatformCert;
  result: CertAttemptResult;
  onBack: () => void;
}) {
  const mock = result.mode === 'mock';
  const code = result.certificate?.code;
  return (
    <div className="dh-page mx-auto w-full max-w-[820px] px-4 py-8">
      <div className="surface-card flex flex-col items-center p-8 text-center">
        {result.passed && !mock ? (
          <CertBadge color={cert.color} logo={cert.logo} size={80} />
        ) : (
          <span className="grid size-16 place-items-center rounded-full bg-surface-3 text-fg">
            {mock ? <Target className="size-7" /> : <RotateCcw className="size-7" />}
          </span>
        )}
        {mock && <p className="mt-3 text-[13px] font-semibold text-muted">Examen blanc</p>}
        <p className="mt-3 text-[40px] leading-none font-bold text-fg tabular-nums">
          {result.score} %
        </p>
        <p className="mt-1 text-[14px] text-muted">
          {result.good} bonnes réponses sur {result.total} · seuil {cert.passScore} %
        </p>
        <h1 className="mt-3 text-[20px] font-semibold text-fg">
          {result.late
            ? 'Envoyé après la fin du temps : les réponses ne sont pas prises en compte'
            : mock
              ? result.passed
                ? 'Tu aurais réussi : tu es prêt pour l’examen'
                : 'Pas encore le niveau : continue l’entraînement'
              : result.passed
                ? 'Certification obtenue, bravo !'
                : result.score >= cert.passScore - 15
                  ? 'Pas encore : tu y es presque'
                  : 'Pas encore : encore un peu de révision'}
        </h1>
        {code && (
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(`${window.location.origin}/certificat/${code}`);
              toast.success('Lien de vérification copié');
            }}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-surface-2 px-4 py-1.5 font-mono text-[14px] text-fg hover:bg-surface-3"
          >
            {code}
            <Copy className="size-3.5" />
          </button>
        )}
        <p className="mt-2 max-w-md text-[14px] text-fg">
          {mock
            ? 'Rien n’est enregistré comme certification. Tes erreurs rejoignent « Mes erreurs ».'
            : result.passed
              ? 'Ton badge est sur ton profil. Le lien du code permet à un recruteur de le vérifier.'
              : 'Regarde les thèmes à retravailler ci-dessous. Nouvelle tentative possible dans une heure ; l’examen blanc reste ouvert.'}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {code && (
            <ButtonLink to={`/certificat/${code}`} variant="primary" icon={<BadgeCheck />}>
              Voir le certificat
            </ButtonLink>
          )}
          {!result.passed && (
            <ButtonLink
              to={`/certifications/${cert.id}?vue=erreurs`}
              onClick={onBack}
              variant="primary"
              icon={<RotateCcw />}
            >
              Revoir mes erreurs
            </ButtonLink>
          )}
          <Button variant="secondary" onClick={onBack}>
            Retour à la fiche
          </Button>
        </div>
      </div>

      <h2 className="mt-8 text-[16px] font-semibold text-fg">Score par thème</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {result.topics.map((t) => {
          const pct = Math.round((t.ok / t.total) * 100);
          const ok = pct >= cert.passScore;
          return (
            <li key={t.topic} className="surface-card p-3">
              <div className="flex items-center justify-between text-[14px]">
                <span className="font-medium text-fg">{cert.syllabus[t.topic]}</span>
                <span
                  className={cn('font-semibold tabular-nums', ok ? 'text-success' : 'text-warning')}
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

      <h2 className="mt-8 text-[16px] font-semibold text-fg">Correction</h2>
      <ol className="mt-3 flex flex-col gap-2">
        {result.corrections.map((q, k) => (
          <li key={q.id} className="surface-card p-4">
            <p className="flex gap-2 font-semibold text-fg">
              {q.correct ? (
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
            {!q.correct && (
              <p className="mt-1 pl-6 text-[14px] text-fg">
                {q.given === null ? 'Sans réponse. ' : <>Ta réponse : {q.choices[q.given]}. </>}
                Bonne réponse : <b>{q.choices[q.answer]}</b>
              </p>
            )}
            <p className="mt-1 pl-6 text-[14px] text-muted">{q.explain}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
