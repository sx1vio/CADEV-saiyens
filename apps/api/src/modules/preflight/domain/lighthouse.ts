import type { PreflightCheck, PreflightLighthouse } from '@devhub/contracts';
import { formatMs } from './network';

// Lighthouse réel, lu dans la réponse de l'API PageSpeed Insights (v5). Fonctions pures :
// parsePageSpeed transforme le JSON de Google, lighthouseChecks en tire les contrôles du rapport.

type Json = Record<string, unknown>;
const obj = (v: unknown): Json => (v && typeof v === 'object' ? (v as Json) : {});
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const int = (v: unknown) => {
  const n = num(v);
  return n === null ? null : Math.round(n);
};
const score = (v: unknown) => {
  const n = num(v);
  return n === null ? null : Math.round(n * 100);
};

export function parsePageSpeed(body: unknown): PreflightLighthouse | null {
  const lh = obj(obj(body).lighthouseResult);
  const cats = obj(lh.categories);
  const audits = obj(lh.audits);
  if (!Object.keys(cats).length) return null;
  const audit = (id: string) => obj(audits[id]);

  const opportunities = Object.entries(audits)
    .map(([id, a]) => {
      const d = obj(obj(a).details);
      const savings = num(d.overallSavingsMs) ?? 0;
      return d.type === 'opportunity' && savings >= 100
        ? { id, title: String(obj(a).title ?? id), savingsMs: Math.round(savings) }
        : null;
    })
    .filter((x): x is { id: string; title: string; savingsMs: number } => x !== null)
    .sort((a, b) => b.savingsMs - a.savingsMs)
    .slice(0, 6);

  const a11yRefs = (obj(cats.accessibility).auditRefs as Json[] | undefined) ?? [];
  const accessibilityIssues = a11yRefs
    .filter((r) => (num(r.weight) ?? 0) > 0)
    .map((r) => {
      const a = audit(String(r.id));
      const items = (obj(a.details).items as unknown[] | undefined)?.length ?? 0;
      return a.score === 0 ? { id: String(r.id), title: String(a.title ?? r.id), items } : null;
    })
    .filter((x): x is { id: string; title: string; items: number } => x !== null)
    .slice(0, 8);

  const field = obj(obj(body).loadingExperience);
  const metrics = obj(field.metrics);
  const pct = (k: string) => num(obj(metrics[k]).percentile);
  const hasField = Object.keys(metrics).length > 0;

  return {
    strategy: 'mobile',
    scores: {
      performance: score(obj(cats.performance).score),
      accessibility: score(obj(cats.accessibility).score),
      bestPractices: score(obj(cats['best-practices']).score),
      seo: score(obj(cats.seo).score),
    },
    lab: {
      fcpMs: int(audit('first-contentful-paint').numericValue),
      lcpMs: int(audit('largest-contentful-paint').numericValue),
      tbtMs: int(audit('total-blocking-time').numericValue),
      cls: num(audit('cumulative-layout-shift').numericValue),
      speedIndexMs: int(audit('speed-index').numericValue),
    },
    field: hasField
      ? {
          lcpMs: int(pct('LARGEST_CONTENTFUL_PAINT_MS')),
          inpMs: int(pct('INTERACTION_TO_NEXT_PAINT')),
          cls:
            pct('CUMULATIVE_LAYOUT_SHIFT_SCORE') === null
              ? null
              : pct('CUMULATIVE_LAYOUT_SHIFT_SCORE')! / 100,
          overall: typeof field.overall_category === 'string' ? field.overall_category : null,
        }
      : null,
    opportunities,
    accessibilityIssues,
  };
}

/** Seuils officiels des Core Web Vitals (Google) : bon / à améliorer / mauvais. */
const grade = (v: number | null, good: number, poor: number) =>
  v === null ? null : v <= good ? 'pass' : v <= poor ? 'warn' : 'fail';
const scoreGrade = (v: number | null, good = 90, poor = 50) =>
  v === null ? null : v >= good ? 'pass' : v >= poor ? 'warn' : 'fail';

export function lighthouseChecks(lh: PreflightLighthouse): PreflightCheck[] {
  const out: PreflightCheck[] = [];
  const perf = scoreGrade(lh.scores.performance);
  const opp = lh.opportunities.map((o) => `${o.title} (gain estimé ${formatMs(o.savingsMs)})`);
  if (perf) {
    out.push({
      id: 'lh.performance',
      category: 'performance',
      status: perf,
      title: `Performance Lighthouse mobile : ${lh.scores.performance}/100`,
      detail:
        'Audit Lighthouse réel exécuté par Google PageSpeed Insights, sur un téléphone de milieu de gamme simulé avec un réseau 4G lent.',
      fix:
        perf === 'pass'
          ? null
          : opp.length
            ? `Appliquer les pistes de Lighthouse dans l’ordre du gain :\n${opp.map((o, i) => `${i + 1}. ${o}`).join('\n')}`
            : 'Réduire le JavaScript chargé au démarrage (découpage par route), compresser et redimensionner les images, et précharger la police principale.',
      evidence: opp,
    });
  }
  const lcp = grade(lh.lab.lcpMs, 2_500, 4_000);
  if (lcp && lh.lab.lcpMs !== null) {
    out.push({
      id: 'lh.lcp',
      category: 'performance',
      status: lcp,
      title: `Plus grand élément affiché en ${formatMs(lh.lab.lcpMs)}`,
      detail:
        'Largest Contentful Paint : le moment où le contenu principal apparaît. Google le considère bon sous 2,5 s, mauvais au-delà de 4 s.',
      fix:
        lcp === 'pass'
          ? null
          : 'Servir l’image ou le titre principal sans attendre le JavaScript (rendu côté serveur ou HTML statique), ajouter fetchpriority="high" sur l’image principale, la servir en WebP ou AVIF à la bonne taille, et réduire le temps de réponse du serveur.',
      evidence: [],
    });
  }
  const tbt = grade(lh.lab.tbtMs, 200, 600);
  if (tbt && lh.lab.tbtMs !== null && tbt !== 'pass') {
    out.push({
      id: 'lh.tbt',
      category: 'performance',
      status: tbt,
      title: `Page bloquée ${formatMs(lh.lab.tbtMs)} par le JavaScript`,
      detail:
        'Total Blocking Time : temps pendant lequel la page ne réagit pas aux touchers parce que le JavaScript occupe le téléphone.',
      fix: 'Découper le JavaScript par route (import() dynamique), différer les scripts tiers (analyse d’audience, chat) après le chargement, et retirer les bibliothèques inutilisées.',
      evidence: [],
    });
  }
  const cls = grade(lh.lab.cls, 0.1, 0.25);
  if (cls && lh.lab.cls !== null && cls !== 'pass') {
    out.push({
      id: 'lh.cls',
      category: 'performance',
      status: cls,
      title: `La mise en page saute pendant le chargement (CLS ${lh.lab.cls.toFixed(2)})`,
      detail:
        'Cumulative Layout Shift : des éléments bougent pendant que la page se charge, le visiteur clique au mauvais endroit.',
      fix: 'Donner une taille (width et height, ou aspect-ratio) à chaque image, vidéo et bloc publicitaire, et réserver la place des éléments injectés après coup.',
      evidence: [],
    });
  }
  if (lh.field) {
    const f = lh.field;
    out.push({
      id: 'lh.field',
      category: 'performance',
      status: f.overall === 'SLOW' ? 'warn' : 'info',
      title: 'Mesures de vrais visiteurs (Chrome)',
      detail: `Données réelles des 28 derniers jours : affichage principal ${f.lcpMs !== null ? formatMs(f.lcpMs) : '–'}, réactivité ${f.inpMs !== null ? formatMs(f.inpMs) : '–'}, stabilité ${f.cls !== null ? f.cls.toFixed(2) : '–'}.`,
      fix: null,
      evidence: [],
    });
  }
  const a11y = scoreGrade(lh.scores.accessibility, 90, 70);
  if (a11y) {
    out.push({
      id: 'lh.accessibility',
      category: 'accessibility',
      status: a11y,
      title: `Accessibilité : ${lh.scores.accessibility}/100`,
      detail:
        'Contrastes, textes alternatifs, libellés de formulaires, ordre des titres : ce qui rend l’application utilisable par tous, y compris avec un lecteur d’écran.',
      fix: lh.accessibilityIssues.length
        ? `Corriger :\n${lh.accessibilityIssues.map((i, n) => `${n + 1}. ${i.title}${i.items ? ` (${i.items} élément${i.items > 1 ? 's' : ''})` : ''}`).join('\n')}`
        : null,
      evidence: lh.accessibilityIssues.map((i) => `${i.id} : ${i.title}`),
    });
  }
  const seo = scoreGrade(lh.scores.seo, 90, 70);
  if (seo && seo !== 'pass') {
    out.push({
      id: 'lh.seo',
      category: 'performance',
      status: seo,
      title: `Référencement : ${lh.scores.seo}/100`,
      detail:
        'Titre, description, liens explorables, balises de langue : ce que lisent les moteurs de recherche.',
      fix: 'Ajouter <title> et <meta name="description"> propres à chaque page, un attribut lang sur <html>, des liens <a href> réels plutôt que des clics JavaScript, et un fichier robots.txt valide.',
      evidence: [],
    });
  }
  const bp = scoreGrade(lh.scores.bestPractices, 90, 70);
  if (bp && bp !== 'pass') {
    out.push({
      id: 'lh.best_practices',
      category: 'security',
      status: bp,
      title: `Bonnes pratiques : ${lh.scores.bestPractices}/100`,
      detail:
        'Erreurs dans la console, bibliothèques connues pour leurs failles, images à la mauvaise taille, API obsolètes du navigateur.',
      fix: 'Ouvrir la console du navigateur sur la page et corriger chaque erreur, puis mettre à jour les bibliothèques front signalées.',
      evidence: [],
    });
  }
  return out;
}
