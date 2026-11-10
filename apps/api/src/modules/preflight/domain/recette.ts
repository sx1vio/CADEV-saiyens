import type {
  PreflightCheck,
  PreflightRecette,
  PreflightReport,
  RecetteDecision,
  RecetteSectionKey,
  RecetteSeverity,
} from '@devhub/contracts';

// Lecture « recette » d'un pré-vol (méthode VABF, skill recette-qa de l'équipe, 10/11/2026) :
// les contrôles deviennent des anomalies graduées (critique, majeure, mineure), regroupées dans
// les sections du barème de recette web / PWA, avec les gates éliminatoires et un verdict
// GO / GO sous réserves / NO-GO. Fonction pure : recalculée à chaque lecture du rapport, elle vaut
// aussi pour les rapports enregistrés avant elle.

type Check = Pick<PreflightCheck, 'id' | 'category' | 'status' | 'title'>;
type ReportInput = Pick<
  PreflightReport,
  'url' | 'repo' | 'checks' | 'lighthouse' | 'loadTest' | 'metrics' | 'repoSummary'
>;

/** Poids des sections pour une application web ou une PWA (barème recette-qa §10). */
export const RECETTE_WEIGHTS: Record<RecetteSectionKey, number> = {
  functional: 25,
  security: 20,
  accessibility: 15,
  performance: 15,
  network: 10,
  privacy: 10,
  platform: 5,
};

/**
 * Contrôles critiques (poids 3) : fuite de secret ou de données, contournement d'accès, HTTPS
 * cassé. Ouverts, ils plafonnent leur section à 49 et donnent un NO-GO.
 */
const CRITICAL = new Set([
  'site.exposed_files',
  'site.client_secrets',
  'repo.committed_secrets',
  'repo.content_secrets',
  'repo.history_secrets',
  'site.firebase_open',
  'site.cors',
  'site.directory_listing',
  'site.insecure_form',
  'sec.anonymous_api',
  'tls.invalid',
  'site.unreachable',
  'site.status',
]);

/** Contrôles de faible portée (poids 1) : confort, bonnes pratiques, information. */
const MINOR_PREFIXES = ['net.image_', 'net.lazy_', 'net.font_', 'net.brotli', 'pwa.'];
const MINOR = new Set([
  'site.security_txt',
  'site.tech_disclosure',
  'sec.api_disclosure',
  'site.sri',
  'net.data_cost',
  'lh.field',
  'privacy.third_parties',
  'func.routes',
]);

export function controlWeight(id: string): 1 | 2 | 3 {
  if (CRITICAL.has(id)) return 3;
  if (MINOR.has(id) || MINOR_PREFIXES.some((p) => id.startsWith(p))) return 1;
  return 2;
}

/** Section du barème ; null : hors barème de recette (référencement, qualité du code, licences). */
export function sectionOf(c: Pick<Check, 'id' | 'category'>): RecetteSectionKey | null {
  if (c.id === 'net.pwa' || c.id.startsWith('pwa.')) return 'platform';
  if (c.id.startsWith('tls.') || c.id === 'site.https_redirect' || c.id === 'site.hsts_quality')
    return 'network';
  if (c.id === 'site.cookies' || c.id === 'site.token_storage') return 'privacy';
  if (c.id === 'site.status' || c.id === 'site.unreachable') return 'functional';
  switch (c.category) {
    case 'functional':
      return 'functional';
    case 'security':
    case 'dependencies':
      return 'security';
    case 'accessibility':
      return 'accessibility';
    case 'performance':
    case 'load':
      return 'performance';
    case 'network':
    case 'infra':
      return 'network';
    case 'privacy':
      return 'privacy';
    default:
      return null;
  }
}

/** Gravité d'un contrôle ouvert (en échec ou en avertissement) ; null s'il passe. */
export function severityOf(c: Pick<Check, 'id' | 'status'>): RecetteSeverity | null {
  if (c.status === 'pass' || c.status === 'info') return null;
  const w = controlWeight(c.id);
  if (c.status === 'fail') return w === 3 ? 'critical' : w === 2 ? 'major' : 'minor';
  return w === 3 ? 'major' : 'minor';
}

interface GateDef {
  id: string;
  label: string;
  /** Contrôles qui font échouer la gate quand ils sont ouverts. */
  checks: string[];
  /** Un avertissement suffit-il (ex. TLS 1.0 accepté, signalé en avertissement) ? */
  failOnWarn?: boolean;
  /** Gate jamais évaluable de l'extérieur. */
  untested?: boolean;
}

/** Gates éliminatoires (recette-qa §10) : une seule en échec suffit pour un NO-GO. */
const GATES: GateDef[] = [
  {
    id: 'gate.secrets',
    label: 'Aucun secret ni fichier sensible exposé',
    checks: [
      'site.exposed_files',
      'site.client_secrets',
      'repo.committed_secrets',
      'repo.content_secrets',
      'repo.history_secrets',
    ],
  },
  {
    id: 'gate.tls',
    label: 'HTTPS valide, TLS 1.2 minimum',
    checks: ['tls.invalid', 'tls.legacy'],
    failOnWarn: true,
  },
  {
    id: 'gate.anonymous_access',
    label: 'Aucune donnée protégée servie sans connexion',
    checks: ['sec.anonymous_api', 'site.firebase_open', 'site.cors', 'site.directory_listing'],
  },
  {
    id: 'gate.trackers',
    label: 'Aucun traceur publicitaire avant consentement',
    checks: ['privacy.trackers'],
    failOnWarn: true,
  },
  {
    id: 'gate.idor',
    label: 'Cloisonnement entre comptes (IDOR / BOLA)',
    checks: [],
    untested: true,
  },
];

function gates(checks: Check[]): PreflightRecette['gates'] {
  const byId = new Map(checks.map((c) => [c.id, c]));
  return GATES.map((g) => {
    if (g.untested) return { id: g.id, label: g.label, status: 'untested' as const, checks: [] };
    const present = g.checks.filter((id) => byId.has(id));
    if (!present.length)
      return { id: g.id, label: g.label, status: 'untested' as const, checks: [] };
    const failing = present.filter((id) => {
      const s = byId.get(id)!.status;
      return s === 'fail' || (g.failOnWarn && s === 'warn');
    });
    return {
      id: g.id,
      label: g.label,
      status: failing.length ? ('fail' as const) : ('pass' as const),
      checks: failing.length ? failing : present,
    };
  });
}

const SEVERITY_ORDER: Record<RecetteSeverity, number> = { critical: 0, major: 1, minor: 2 };

export function recetteOf(report: ReportInput): PreflightRecette {
  const scored = report.checks
    .map((c) => ({ c, section: sectionOf(c) }))
    .filter((x): x is { c: PreflightCheck; section: RecetteSectionKey } => x.section !== null);

  const sections = (Object.keys(RECETTE_WEIGHTS) as RecetteSectionKey[]).map((key) => {
    const mine = scored.filter((x) => x.section === key && x.c.status !== 'info');
    let points = 0;
    let max = 0;
    const counts = { critical: 0, major: 0, minor: 0 };
    for (const { c } of mine) {
      const w = controlWeight(c.id);
      max += w;
      points += c.status === 'pass' ? w : c.status === 'warn' ? w / 2 : 0;
      const sev = severityOf(c);
      if (sev) counts[sev]++;
    }
    const raw = max ? Math.round((100 * points) / max) : null;
    const cap = counts.critical ? 49 : counts.major ? 79 : null;
    return {
      key,
      weight: RECETTE_WEIGHTS[key],
      score: raw === null ? null : cap === null ? raw : Math.min(raw, cap),
      cap: raw !== null && cap !== null && raw > cap ? cap : null,
      checks: mine.length,
      ...counts,
    };
  });

  const applicable = sections.filter((s) => s.score !== null);
  const weightSum = applicable.reduce((n, s) => n + s.weight, 0);
  const score = weightSum
    ? Math.round(applicable.reduce((n, s) => n + s.weight * (s.score ?? 0), 0) / weightSum)
    : 0;

  const g = gates(report.checks);
  const critical = sections.reduce((n, s) => n + s.critical, 0);
  const majorBlocking = sections
    .filter((s) => s.key === 'security' || s.key === 'accessibility')
    .reduce((n, s) => n + s.major, 0);
  const gateFailed = g.some((x) => x.status === 'fail');

  let decision: RecetteDecision;
  if (critical > 0 || gateFailed || score < 70) decision = 'no_go';
  else if (score >= 85 && majorBlocking === 0) decision = 'go';
  else decision = 'go_with_reservations';

  const issues = scored
    .map(({ c, section }) => ({ c, section, severity: severityOf(c) }))
    .filter((x): x is typeof x & { severity: RecetteSeverity } => x.severity !== null)
    .sort(
      (a, b) =>
        SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
        RECETTE_WEIGHTS[b.section] - RECETTE_WEIGHTS[a.section],
    )
    .map(({ c, section, severity }) => ({ checkId: c.id, severity, section, title: c.title }));

  return {
    decision,
    provisional: g.some((x) => x.status === 'untested'),
    score,
    sections,
    gates: g,
    issues,
    untested: untestedOf(report),
  };
}

/** Limites déclarées (recette-qa §12) : ce qu'une sonde extérieure, sans compte, ne voit pas. */
function untestedOf(r: ReportInput): string[] {
  const out = [
    'Cloisonnement entre comptes (IDOR / BOLA) : il faut deux comptes de test et rejouer les routes de l’un avec la session de l’autre.',
    'Parcours connectés et écritures (publier, payer, candidater) : à rejouer en préproduction ou avec un compte de test identifié.',
    'Déconnexion : session invalidée côté serveur et aucune réponse liée au compte relue depuis le cache du service worker.',
    'Accessibilité manuelle : clavier complet, lecteur d’écran réel (NVDA, VoiceOver, TalkBack), zoom 200 %, erreurs de formulaire annoncées. L’automatique couvre 20 à 30 % des critères.',
    'Navigateurs : Safari et Firefox, en plus du Chrome utilisé par Lighthouse.',
  ];
  if (r.url && !r.lighthouse)
    out.push(
      'Lighthouse : audit indisponible pour ce passage, performance et accessibilité non mesurées.',
    );
  if (r.lighthouse && !r.lighthouse.field)
    out.push(
      'Mesures terrain (CrUX) : pas assez de trafic ; la performance n’est mesurée qu’en laboratoire.',
    );
  if (r.url && !r.loadTest)
    out.push('Charge : test non demandé (option « Ajouter un test de charge », domaine prouvé).');
  if (r.url && !r.repo)
    out.push(
      'Code source : sans dépôt, ni secrets dans l’historique, ni dépendances vulnérables ne sont vérifiés.',
    );
  if (r.repo && !r.url)
    out.push(
      'Application en ligne : sans URL, ni en-têtes, ni TLS, ni performance ne sont vérifiés.',
    );
  return out;
}

export const DECISION_LABEL: Record<RecetteDecision, string> = {
  go: 'GO',
  go_with_reservations: 'GO sous réserves',
  no_go: 'NO-GO',
};

export const SECTION_LABEL: Record<RecetteSectionKey, string> = {
  functional: 'Fonctionnel',
  security: 'Sécurité',
  accessibility: 'Accessibilité',
  performance: 'Performance',
  network: 'Réseau et fiabilité',
  privacy: 'Cookies et vie privée',
  platform: 'PWA et plateforme',
};

export const SEVERITY_LABEL: Record<RecetteSeverity, string> = {
  critical: 'critique',
  major: 'majeure',
  minor: 'mineure',
};
