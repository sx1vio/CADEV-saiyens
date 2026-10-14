import {
  ArrowLeft,
  ArrowRight,
  Award,
  BadgeCheck,
  Check,
  Clock,
  ListChecks,
  RotateCcw,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { Button, ButtonLink } from '@/components/ui/button';
import { PLATFORM_CERTS } from '@/platform/data/certs';
import { PATHS } from '@/platform/data/learn';
import { usePlatform } from '@/platform/store';
import { CertBadge, compact } from '@/platform/ui';
import { cn } from '@/lib/utils';
import { useSession } from '@/stores/app';
import { LevelPill } from './Certifications';
import NotFound from './NotFound';

/** Fiche d'une certification DevHub et son examen en ligne. */
export default function CertExam() {
  const { id = '' } = useParams();
  const me = useSession((s) => s.user);
  const cert = PLATFORM_CERTS.find((c) => c.id === id);
  const result = usePlatform((s) => s.certResults[id]);
  const record = usePlatform((s) => s.recordCert);
  const [phase, setPhase] = useState<'intro' | 'exam' | 'done'>('intro');
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  if (!cert) return <NotFound />;
  const prep = PATHS.find((p) => p.certId === cert.id);
  const q = cert.quiz[i];
  const score = Math.round(
    (answers.filter((a, k) => a === cert.quiz[k].answer).length / cert.quiz.length) * 100,
  );

  const start = () => {
    setAnswers([]);
    setI(0);
    setPhase('exam');
  };

  if (phase === 'exam')
    return (
      <div className="dh-page mx-auto w-full max-w-[720px] px-4 py-6">
        <div className="flex items-center justify-between text-[13px] text-subtle">
          <span className="font-semibold text-fg">{cert.title}</span>
          <span>
            Question {i + 1} / {cert.quiz.length}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3">
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{
              width: `${((i + (answers[i] !== undefined ? 1 : 0)) / cert.quiz.length) * 100}%`,
              background: cert.color,
            }}
          />
        </div>
        <h1 className="mt-8 text-[19px] leading-snug font-semibold text-fg">{q.q}</h1>
        <div role="radiogroup" aria-label="Réponses" className="mt-5 flex flex-col gap-2">
          {q.choices.map((c, k) => {
            const on = answers[i] === k;
            return (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setAnswers(Object.assign([...answers], { [i]: k }))}
                className={cn(
                  'flex items-center gap-3 rounded-[10px] border p-4 text-left text-[14px] transition-colors',
                  on ? 'border-accent bg-accent-soft text-fg' : 'border-line bg-surface-1 text-fg ',
                )}
              >
                <span
                  className={cn(
                    'grid size-7 shrink-0 place-items-center rounded-full border text-[13px] font-semibold',
                    on ? 'border-accent bg-accent text-white' : 'border-line-strong text-muted',
                  )}
                >
                  {String.fromCharCode(65 + k)}
                </span>
                <span>{c}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-6 flex justify-between">
          <Button
            variant="ghost"
            icon={<ArrowLeft />}
            disabled={i === 0}
            onClick={() => setI(i - 1)}
          >
            Précédente
          </Button>
          {i < cert.quiz.length - 1 ? (
            <Button
              variant="primary"
              disabled={answers[i] === undefined}
              onClick={() => setI(i + 1)}
            >
              Suivante
              <ArrowRight />
            </Button>
          ) : (
            <Button
              variant="primary"
              disabled={answers[i] === undefined}
              onClick={() => {
                record(cert.id, score, cert.passScore);
                setPhase('done');
              }}
            >
              Terminer l’examen
            </Button>
          )}
        </div>
      </div>
    );

  if (phase === 'done') {
    const passed = score >= cert.passScore;
    return (
      <div className="dh-page mx-auto w-full max-w-[760px] px-4 py-8">
        <div className="flex flex-col items-center rounded-[10px] border border-line bg-surface-1 p-8 text-center">
          {passed ? (
            <CertBadge color={cert.color} logo={cert.logo} size={76} />
          ) : (
            <span className="grid size-16 place-items-center rounded-full bg-surface-3 text-muted">
              <RotateCcw className="size-7" />
            </span>
          )}
          <p className="mt-4 text-[34px] leading-none font-semibold tabular text-fg">{score} %</p>
          <h1 className="mt-2 text-[18px] font-semibold text-fg">
            {passed ? 'Certification obtenue' : 'Pas encore'}
          </h1>
          <p className="mt-1 max-w-md text-[13.5px] text-muted">
            {passed
              ? 'Ton badge est ajouté à ton profil et joint à tes candidatures.'
              : `Il faut ${cert.passScore} % pour obtenir le badge. Relis les explications ci-dessous et retente quand tu veux.`}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {passed ? (
              <ButtonLink
                to="/certifications?vue=mes-badges"
                variant="primary"
                icon={<BadgeCheck />}
              >
                Voir mes badges
              </ButtonLink>
            ) : (
              <Button variant="primary" icon={<RotateCcw />} onClick={start}>
                Retenter
              </Button>
            )}
            {prep && (
              <ButtonLink to={`/apprendre/${prep.id}`} variant="secondary">
                Parcours de préparation
              </ButtonLink>
            )}
          </div>
        </div>
        <h2 className="mt-8 text-[15px] font-semibold text-fg">Correction</h2>
        <ol className="mt-3 flex flex-col gap-2">
          {cert.quiz.map((qq, k) => {
            const ok = answers[k] === qq.answer;
            return (
              <li key={qq.q} className="rounded-[10px] bg-surface-1 p-4">
                <p className="flex gap-2 font-semibold text-fg">
                  {ok ? (
                    <Check className="mt-0.5 size-4 shrink-0 text-success" />
                  ) : (
                    <X className="mt-0.5 size-4 shrink-0 text-danger" />
                  )}
                  {qq.q}
                </p>
                {!ok && (
                  <p className="mt-1 pl-6 text-[13px] text-muted">
                    Bonne réponse : <b className="text-fg">{qq.choices[qq.answer]}</b>
                  </p>
                )}
                <p className="mt-1 pl-6 text-[13px] text-muted">{qq.explain}</p>
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

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
                  <Clock className="size-4 text-subtle" />
                  {cert.minutes} minutes
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ListChecks className="size-4 text-subtle" />
                  {cert.quiz.length} questions · {cert.passScore} % pour réussir
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Users className="size-4 text-subtle" />
                  {compact(cert.holders)} certifiés
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto grid max-w-[1000px] gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_320px]">
        <div>
          <h2 className="text-[16px] font-semibold text-fg">Programme</h2>
          <ol className="mt-3 flex flex-col gap-2">
            {cert.syllabus.map((s, k) => (
              <li
                key={s}
                className="flex items-center gap-3 rounded-[10px] bg-surface-1 px-4 py-3 text-[13.5px] text-fg"
              >
                <span className="grid size-7 place-items-center rounded-full bg-surface-3 text-[12px] font-semibold text-muted">
                  {k + 1}
                </span>
                {s}
              </li>
            ))}
          </ol>
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
            <p className="flex items-center gap-2 rounded-[8px] bg-success-soft p-3 text-[14px] font-semibold text-success">
              <BadgeCheck className="size-5" />
              Obtenue avec {result.score} %
            </p>
          ) : result ? (
            <p className="rounded-[8px] bg-warning-soft p-3 text-[14px] font-semibold text-warning">
              Dernier score : {result.score} %
            </p>
          ) : null}
          {me ? (
            <Button variant="primary" size="lg" className="w-full" onClick={start}>
              {result ? 'Repasser l’examen' : 'Commencer l’examen'}
            </Button>
          ) : (
            <ButtonLink to="/connexion" variant="primary" size="lg" className="w-full">
              Se connecter pour passer l’examen
            </ButtonLink>
          )}
          <ul className="flex flex-col gap-2 text-[13px] text-muted">
            <li className="flex gap-2">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
              Tentatives illimitées, ton meilleur score est gardé
            </li>
            <li className="flex gap-2">
              <Award className="mt-0.5 size-4 shrink-0 text-[#f0b232]" />
              Badge vérifiable sur ton profil et dans tes candidatures
            </li>
            <li className="flex gap-2">
              <Clock className="mt-0.5 size-4 shrink-0 text-subtle" />
              Pas de chronomètre bloquant : prends le temps de lire
            </li>
          </ul>
          {prep && (
            <Link
              to={`/apprendre/${prep.id}`}
              className="rounded-[10px] border border-line p-3 text-[13px] "
            >
              <span className="block text-[12px] font-semibold text-subtle uppercase">
                Pour se préparer
              </span>
              <span className="font-semibold text-fg">{prep.title}</span>
            </Link>
          )}
        </aside>
      </div>
    </div>
  );
}
