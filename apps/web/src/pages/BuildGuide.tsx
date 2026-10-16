import {
  SquareTerminal,
  AlertOctagon,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Lightbulb,
  RotateCcw,
  Scale,
  Target,
  Wand2,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DeployToSystalink } from '@/components/systalink';
import { GUIDE, TRACKS } from '@/platform/data/guide';
import { usePlatform } from '@/platform/store';
import type { GuideStep } from '@/platform/types';
import { ICONS } from '@/platform/ui';
import { BrandLogo } from '@/platform/logos';
import { cn } from '@/lib/utils';

const SEVERITY = {
  critique: {
    label: 'Critique',
    icon: AlertOctagon,
    cls: 'border-danger/40 bg-danger-soft',
    text: 'text-danger',
  },
  important: {
    label: 'Important',
    icon: AlertTriangle,
    cls: 'border-warning/40 bg-warning-soft',
    text: 'text-warning',
  },
  conseil: {
    label: 'Conseil',
    icon: Lightbulb,
    cls: 'border-line bg-surface-2',
    text: 'text-accent-text',
  },
} as const;

function stepDone(step: GuideStep, checks: Record<string, string[]>) {
  return step.checklist.every((c) => checks[step.id]?.includes(c));
}

/** Guide complet « Créer une app avec l'IA », étape par étape, avec les points d'attention. */
export default function BuildGuide() {
  const [params, setParams] = useSearchParams();
  const track = usePlatform((s) => s.guideTrack);
  const setTrack = usePlatform((s) => s.setGuideTrack);
  const checks = usePlatform((s) => s.guideChecks);
  const reset = usePlatform((s) => s.resetGuide);
  const current = GUIDE.findIndex((s) => s.id === params.get('etape'));
  const idx = current < 0 ? 0 : current;
  const step = GUIDE[idx];
  const doneCount = GUIDE.filter((s) => stepDone(s, checks)).length;
  const go = (i: number) => {
    setParams({ etape: GUIDE[i].id });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="dh-page">
      {/* En-tête */}
      <div className="border-b border-line px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-[1180px]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="mb-2 inline-flex items-center gap-2 text-[12.5px] text-muted">
                Fonctionne avec
                {(['Claude', 'Cursor', 'Google', 'GitHub'] as const).map((b) => (
                  <BrandLogo key={b} name={b} size={14} />
                ))}
                <SquareTerminal className="size-3.5" aria-label="Codex" />
              </p>
              <h1 className="text-[34px] leading-[1.05] font-bold tracking-[-0.02em] text-fg sm:text-[42px]">
                Créer une app avec l’IA
              </h1>
              <p className="mt-1 max-w-3xl text-[14px] text-muted">
                Le guide complet, de l’idée à la mise en ligne. À chaque étape : ce qu’il faut
                faire, les prompts à donner à ton agent, et les points d’attention qui font la
                différence entre une démo et une vraie app.
              </p>
            </div>
          </div>
          <div className="mt-5 flex gap-3 rounded-[10px] bg-surface-1 p-4">
            <Scale className="mt-0.5 size-5 shrink-0 text-accent-text" />
            <p className="text-[13.5px] text-fg">
              <b>La règle d’or :</b> l’IA écrit vite, mais c’est toi qui décides, qui vérifies et
              qui restes responsable du résultat. Ne fusionne jamais un code que tu ne comprends
              pas.
            </p>
          </div>

          <h2 className="mt-6 text-[14px] font-semibold text-fg">Que construis-tu ?</h2>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {TRACKS.map((t) => {
              const Icon = ICONS[t.icon] ?? Wand2;
              const on = track === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setTrack(t.id)}
                  className={cn(
                    'flex gap-3 rounded-[10px] border p-3 text-left transition-colors',
                    on
                      ? 'border-accent bg-accent-soft'
                      : 'border-line hover:border-line-strong hover:bg-surface-1',
                  )}
                >
                  <span
                    className={cn(
                      'grid size-8 shrink-0 place-items-center rounded-[8px]',
                      on ? 'bg-accent text-white' : 'bg-surface-1 text-muted',
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span>
                    <span className="block text-[13.5px] font-semibold text-fg">{t.title}</span>
                    <span className="block text-[12.5px] leading-snug text-muted">{t.text}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-500"
                style={{ width: `${(doneCount / GUIDE.length) * 100}%` }}
              />
            </div>
            <span className="text-[13px] font-semibold text-muted tabular">
              {doneCount} / {GUIDE.length} étapes validées
            </span>
            {doneCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Remettre ta progression à zéro ?')) reset();
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[12.5px] font-semibold text-subtle hover:bg-surface-2 hover:text-fg"
              >
                <RotateCcw className="size-3.5" />
                Recommencer
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1180px] gap-8 px-4 py-6 sm:px-6">
        {/* Étapes */}
        <nav
          aria-label="Étapes du guide"
          className="sticky top-[72px] hidden w-[270px] shrink-0 self-start lg:block"
        >
          <ol className="flex flex-col">
            {GUIDE.map((s, i) => {
              const done = stepDone(s, checks);
              const crit = s.pitfalls.filter((p) => p.severity === 'critique').length;
              return (
                <li key={s.id} className="relative">
                  <button
                    type="button"
                    onClick={() => go(i)}
                    aria-current={i === idx ? 'step' : undefined}
                    className={cn(
                      'relative flex w-full items-start gap-3 rounded-[10px] p-1.5 pr-2 text-left transition-colors',
                      i === idx ? 'bg-surface-2' : 'hover:bg-surface-1',
                    )}
                  >
                    <span
                      className={cn(
                        'grid size-[22px] shrink-0 translate-x-[4px] place-items-center rounded-full text-[11px] font-semibold',
                        done
                          ? 'bg-success text-white'
                          : i === idx
                            ? 'bg-accent text-white'
                            : 'bg-surface-3 text-muted',
                      )}
                    >
                      {done ? <Check className="size-3.5" /> : i + 1}
                    </span>
                    <span className="min-w-0 flex-1 pl-1">
                      <span
                        className={cn(
                          'block text-[14px] leading-snug',
                          i === idx ? 'font-semibold text-fg' : 'font-medium text-muted',
                        )}
                      >
                        {s.title}
                      </span>
                      <span className="text-[12px] text-subtle">
                        {s.duration}
                        {crit > 0 && (
                          <span className="text-danger">
                            {' '}
                            · {crit} critique{crit > 1 ? 's' : ''}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="min-w-0 flex-1">
          {/* Étapes en puces sur mobile */}
          <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 lg:hidden">
            {GUIDE.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => go(i)}
                className={cn(
                  'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold',
                  i === idx ? 'border-accent bg-accent-soft text-fg' : 'border-line text-muted',
                )}
              >
                {stepDone(s, checks) ? (
                  <Check className="size-3.5 text-success" />
                ) : (
                  <span className="tabular">{i + 1}</span>
                )}
                {s.title.split(' ').slice(0, 2).join(' ')}
              </button>
            ))}
          </div>
          <StepView
            key={step.id}
            step={step}
            index={idx}
            total={GUIDE.length}
            onPrev={idx > 0 ? () => go(idx - 1) : undefined}
            onNext={idx < GUIDE.length - 1 ? () => go(idx + 1) : undefined}
          />
        </div>
      </div>
    </div>
  );
}

function StepView({
  step,
  index,
  total,
  onPrev,
  onNext,
}: {
  step: GuideStep;
  index: number;
  total: number;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const track = usePlatform((s) => s.guideTrack);
  const stored = usePlatform((s) => s.guideChecks[step.id]);
  const checks = stored ?? [];
  const toggleCheck = usePlatform((s) => s.toggleGuideCheck);
  const note = track ? step.trackNotes?.[track] : undefined;
  const order = { critique: 0, important: 1, conseil: 2 };
  const pitfalls = [...step.pitfalls].sort((a, b) => order[a.severity] - order[b.severity]);
  const allChecked = step.checklist.every((c) => checks.includes(c));

  return (
    <article>
      <p className="text-[13px] font-semibold text-accent-text">
        Étape {index + 1} sur {total}
      </p>
      <h2 className="mt-1 text-[28px] leading-tight font-bold tracking-[-0.02em] text-fg">
        {step.title}
      </h2>
      <div className="mt-3 flex flex-wrap gap-2 text-[13px]">
        <span className="inline-flex items-center gap-1.5 rounded-[8px] bg-surface-2 px-2.5 py-1.5 font-semibold text-fg">
          <Target className="size-4 text-accent-text" />
          {step.goal}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-[8px] bg-surface-2 px-2.5 py-1.5 font-semibold text-fg">
          <Clock className="size-4 text-subtle" />
          {step.duration}
        </span>
      </div>

      <section className="mt-8">
        <h3 className="text-[16px] font-semibold text-fg">À faire</h3>
        <ol className="mt-3 flex flex-col gap-2">
          {step.actions.map((a, i) => (
            <li
              key={a}
              className="flex gap-3 rounded-[10px] bg-surface-1 px-4 py-3 text-[14px] text-fg"
            >
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-surface-3 text-[12px] font-semibold text-muted">
                {i + 1}
              </span>
              {a}
            </li>
          ))}
        </ol>
        {note && (
          <p className="mt-3 flex gap-2.5 rounded-[10px] border border-accent/40 bg-accent-soft p-3.5 text-[14px] text-fg">
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-accent-text" />
            <span>
              <b>Pour une {TRACKS.find((t) => t.id === track)?.title.toLowerCase()} :</b> {note}
            </span>
          </p>
        )}
      </section>

      <section className="mt-8">
        <h3 className="flex items-center gap-2 text-[16px] font-semibold text-fg">
          <AlertTriangle className="size-5 text-warning" />
          Points d’attention
        </h3>
        <p className="mt-1 text-[14px] text-muted">
          Ce qui casse le plus souvent à cette étape quand on travaille avec un agent IA.
        </p>
        <div className="mt-3 flex flex-col gap-2.5">
          {pitfalls.map((p) => {
            const s = SEVERITY[p.severity];
            return (
              <div key={p.title} className={cn('flex gap-3 rounded-[8px] border p-4', s.cls)}>
                <s.icon className={cn('mt-0.5 size-5 shrink-0', s.text)} />
                <div>
                  <p className="flex flex-wrap items-center gap-2 text-[14px] font-semibold text-fg">
                    {p.title}
                    <span
                      className={cn(
                        'rounded-full bg-black/10 px-2 py-0.5 text-[11px] font-semibold uppercase',
                        s.text,
                      )}
                    >
                      {s.label}
                    </span>
                  </p>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-muted">{p.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-8">
        <h3 className="text-[16px] font-semibold text-fg">Prompts pour ton agent</h3>
        <p className="mt-1 text-[14px] text-muted">
          À adapter : remplace ce qui est entre crochets. Fonctionne avec Claude Code, Codex,
          Antigravity ou Cursor.
        </p>
        <div className="mt-3 flex flex-col gap-2.5">
          {step.prompts.map((p) => (
            <div key={p.label} className="overflow-hidden rounded-[10px] bg-surface-1">
              <div className="flex items-center justify-between border-b border-line px-4 py-2">
                <span className="text-[13px] font-semibold text-fg">{p.label}</span>
                <button
                  type="button"
                  onClick={() =>
                    void navigator.clipboard
                      ?.writeText(p.text)
                      .then(() => toast.success('Prompt copié'))
                  }
                  className="inline-flex h-7 items-center gap-1.5 rounded-[6px] px-2 text-[12.5px] font-semibold text-muted hover:bg-surface-3 hover:text-fg"
                >
                  <Copy className="size-3.5" />
                  Copier
                </button>
              </div>
              <p className="px-4 py-3 font-mono text-[13px] leading-relaxed text-fg">{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-[10px] bg-surface-1 p-4">
        <h3 className="flex items-center justify-between gap-2 text-[15px] font-semibold text-fg">
          Avant de passer à la suite
          {allChecked && (
            <span className="inline-flex items-center gap-1 text-[13px] text-success">
              <CheckCircle2 className="size-4" />
              Étape validée
            </span>
          )}
        </h3>
        <ul className="mt-3 flex flex-col gap-1">
          {step.checklist.map((c) => {
            const on = checks.includes(c);
            return (
              <li key={c}>
                <label className="flex cursor-pointer items-center gap-3 rounded-[8px] px-2 py-2 hover:bg-surface-2">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggleCheck(step.id, c)}
                    className="size-[18px] accent-[var(--success)]"
                  />
                  <span className={cn('text-[14px]', on ? 'text-muted line-through' : 'text-fg')}>
                    {c}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </section>

      {step.id === 'deploy' && (
        <section className="mt-8 rounded-[10px] border border-line bg-surface-2 p-4">
          <h3 className="text-[15px] font-semibold text-fg">Héberge-la chez Systalink</h3>
          <p className="mt-1 text-[14px] text-muted">
            Datacenter à Dakar, paiement par mobile money. Une fois en ligne, prouve-le dans ta
            salle de projet (carte « En production ») : +10 Proof XP.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <DeployToSystalink from="build" variant="primary" />
            <DeployToSystalink from="build" to="orion" />
          </div>
        </section>
      )}

      {step.resources.length > 0 && (
        <section className="mt-8">
          <h3 className="text-[15px] font-semibold text-fg">Pour aller plus loin sur DevHub</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {step.resources.map((r) => (
              <Link
                key={r.to}
                to={r.to}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong px-3.5 text-[13px] font-semibold text-fg hover:bg-surface-2"
              >
                {r.label}
                <ArrowRight className="size-3.5" />
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mt-10 flex items-center justify-between border-t border-line pt-5">
        {onPrev ? (
          <Button variant="ghost" icon={<ArrowLeft />} onClick={onPrev}>
            Étape précédente
          </Button>
        ) : (
          <span />
        )}
        {onNext ? (
          <Button variant="primary" onClick={onNext}>
            Étape suivante
            <ArrowRight />
          </Button>
        ) : (
          <Link
            to="/c/showcase"
            className="inline-flex h-9 items-center gap-2 rounded-[8px] bg-accent-strong px-4 text-sm font-semibold text-white hover:bg-accent"
          >
            Présenter mon app à la communauté
            <ArrowRight className="size-4" />
          </Link>
        )}
      </div>
    </article>
  );
}
