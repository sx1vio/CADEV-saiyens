import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { cn, storageSet } from '@/lib/utils';
import { useUI } from '@/stores/app';
import { Djeli, type DjeliPose } from './djeli';
import { Button } from './ui/button';
import { useIsMobile } from './ui/overlay';

interface Step {
  key: string;
  /** Sélecteurs candidats, le premier visible gagne */
  targets: string[];
  pose: DjeliPose;
}

const STEPS: Step[] = [
  { key: 's0', targets: [], pose: 'wave' },
  { key: 's1', targets: ['[data-tour="home"]', '[data-tour="hero"]'], pose: 'point' },
  {
    key: 's2',
    targets: ['[data-tour="ask"]', '[data-tour="ask-mobile"]', '[data-tour="hero-ask"]'],
    pose: 'point',
  },
  { key: 's3', targets: ['[data-tour="projects"]'], pose: 'point' },
  { key: 's4', targets: ['[data-tour="passport"]', '[data-tour="xp"]'], pose: 'point' },
  { key: 's6', targets: ['[data-tour="palette"]'], pose: 'celebrate' },
];

function visibleTarget(selectors: string[]): HTMLElement | null {
  for (const sel of selectors) {
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(sel))) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && el.offsetParent !== null) return el;
    }
  }
  return null;
}

type Rect = { top: number; left: number; width: number; height: number };

/** Place réservée au-dessus de la bulle pour Djeli, marge écran et écart à la cible */
const DJELI_SPACE = 92;
const MARGIN = 12;
const GAP = 16;

/**
 * Bulle à droite, à gauche, dessous puis dessus de la cible : la première qui tient
 * entièrement dans l'écran (Djeli compris) sans recouvrir la cible. Centrée sinon.
 */
function placeCard(rect: Rect | null, vw: number, vh: number, w: number, h: number) {
  const minTop = MARGIN + DJELI_SPACE;
  const clampTop = (t: number) => Math.max(minTop, Math.min(vh - MARGIN - h, t));
  const clampLeft = (l: number) => Math.max(MARGIN, Math.min(vw - MARGIN - w, l));
  if (rect) {
    const midTop = clampTop(rect.top + rect.height / 2 - h / 2);
    const midLeft = clampLeft(rect.left + rect.width / 2 - w / 2);
    if (rect.left + rect.width + GAP + w <= vw - MARGIN)
      return { left: rect.left + rect.width + GAP, top: midTop };
    if (rect.left - GAP - w >= MARGIN) return { left: rect.left - GAP - w, top: midTop };
    const below = rect.top + rect.height + GAP + DJELI_SPACE;
    if (below + h <= vh - MARGIN) return { left: midLeft, top: below };
    const above = rect.top - GAP - h;
    if (above >= minTop) return { left: midLeft, top: above };
  }
  return { left: (vw - w) / 2, top: clampTop((vh - h) / 2 + DJELI_SPACE / 2) };
}

/**
 * Visite guidée par Djeli (décision docs/decisions.md §4).
 * Projecteur qui glisse d'un élément réel à l'autre, bulle à côté ; clavier : ← → Échap.
 */
export function Tour() {
  const { t } = useTranslation();
  const step = useUI((s) => s.tourStep);
  const setStep = useUI((s) => s.setTourStep);
  const isMobile = useIsMobile();
  const [rect, setRect] = useState<Rect | null>(null);
  const [cardH, setCardH] = useState(260);
  const nextRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const current = step !== null ? STEPS[step] : null;
  const total = STEPS.length;

  const measure = useCallback(() => {
    if (!current) return;
    const el = visibleTarget(current.targets);
    if (!el) return setRect(null);
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    const r = el.getBoundingClientRect();
    const pad = 6;
    setRect({
      top: r.top - pad,
      left: r.left - pad,
      width: r.width + pad * 2,
      height: r.height + pad * 2,
    });
  }, [current]);

  useLayoutEffect(() => {
    // Mesure du DOM après rendu : c'est l'usage prévu d'un effet de mise en page.
    // oxlint-disable-next-line react/set-state-in-effect
    measure();
  }, [measure]);

  // Hauteur réelle de la bulle (le texte varie selon l'étape et la langue) : mesurée à chaque
  // rendu, l'état ne change que si la hauteur change, donc pas de boucle.
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const h = cardRef.current?.offsetHeight;
    if (h && h !== cardH) setCardH(h);
  });

  useEffect(() => {
    if (step === null) return;
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    const id = setTimeout(measure, 260);
    nextRef.current?.focus();
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
      clearTimeout(id);
    };
  }, [step, measure]);

  const finish = useCallback(() => {
    storageSet('dh-tour-done', '1');
    setStep(null);
  }, [setStep]);

  useEffect(() => {
    if (step === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
      if (e.key === 'ArrowRight') {
        if (step < total - 1) setStep(step + 1);
        else finish();
      }
      if (e.key === 'ArrowLeft' && step > 0) setStep(step - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, total, setStep, finish]);

  if (step === null || !current) return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cardW = Math.min(360, vw - 24);
  const cardStyle: React.CSSProperties = isMobile
    ? { left: 12, right: 12, bottom: 'calc(env(safe-area-inset-bottom) + 84px)' }
    : { ...placeCard(rect, vw, vh, cardW, cardH), width: cardW };

  return createPortal(
    <div
      className="fixed inset-0 z-[80]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
      aria-describedby="tour-text"
    >
      {/* Voile avec « trou » autour de la cible */}
      {rect ? (
        <div
          aria-hidden
          className="pointer-events-none fixed rounded-[10px] ring-2 ring-accent transition-[top,left,width,height] duration-300 ease-out"
          style={{
            ...rect,
            boxShadow:
              '0 0 0 9999px var(--scrim), 0 0 32px 4px color-mix(in oklab, var(--accent), transparent 50%)',
          }}
        />
      ) : (
        <div aria-hidden className="fixed inset-0 bg-[var(--scrim)] backdrop-blur-[2px]" />
      )}
      <div className="fixed inset-0" onClick={finish} aria-hidden />

      <div key={current.key} className="dh-pop fixed z-10" style={cardStyle} data-state="open">
        <div
          ref={cardRef}
          className="relative rounded-[10px] border border-line-strong bg-surface-2 p-5 pt-6 shadow-lg"
        >
          <div
            className={cn('absolute -top-[84px] left-4', isMobile && 'left-1/2 -translate-x-1/2')}
          >
            <Djeli pose={current.pose} size={step === 0 ? 112 : 92} float />
          </div>
          <button
            type="button"
            onClick={finish}
            aria-label={t('tour.skip')}
            className="absolute top-3 right-3 grid size-8 place-items-center rounded-full text-subtle hover:bg-surface-3 hover:text-fg"
          >
            <X className="size-4" />
          </button>
          <p className="mt-6 label-caps">{t('tour.of', { n: step + 1, total })}</p>
          <h2 id="tour-title" className="mt-1 text-lg font-semibold tracking-tight text-fg">
            {t(`tour.${current.key}Title`)}
          </h2>
          <p id="tour-text" className="mt-1.5 text-sm leading-relaxed text-muted">
            {t(`tour.${current.key}Text`)}
          </p>
          <div className="mt-4 flex items-center gap-1.5">
            {STEPS.map((s, i) => (
              <span
                key={s.key}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  i === step ? 'w-5 bg-accent' : 'w-1.5 bg-line-strong',
                )}
              />
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={finish}>
              {t('tour.skip')}
            </Button>
            <div className="flex gap-2">
              {step > 0 && (
                <Button
                  variant="secondary"
                  size="icon-sm"
                  aria-label={t('common.previous')}
                  onClick={() => setStep(step - 1)}
                >
                  <ArrowLeft />
                </Button>
              )}
              <Button
                ref={nextRef}
                variant={step === total - 1 ? 'hero' : 'primary'}
                size="sm"
                onClick={() => (step < total - 1 ? setStep(step + 1) : finish())}
              >
                {step === total - 1 ? t('tour.done') : t('tour.next')}
                {step < total - 1 && <ArrowRight />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
