// Matching SOS Dev (CDC v3 §6.2, correctif v3.1 X4, PR10) : docs/architecture/08-algorithmes.md § 1.
// Fonctions pures, partagées par l'API et la page publique /regles.

export type Regime = 'cold_start' | 'normal';
type Weights = { E: number; S: number; F: number; D: number; R: number; L: number };

export const MATCHING = {
  /** Aidants retenus par vague. */
  helpersPerWave: 3,
  /** Moins de 5 sollicitations sur 24 h pour rester éligible. */
  maxRequestsPer24h: 5,
  /** Activité récente exigée (jours). */
  activeDays: 30,
  /** En dessous, régime « démarrage à froid » (X4). */
  coldStartAcceptedAnswers: 50,
  /** Escalade : délai avant la vague 2 ; expiration d'un « Je m'en occupe » (S11). */
  escalateAfterMinutes: 15,
  claimExpiresMinutes: 20,
  canHelpBonus: 5,
  reputationCap: 500,
  experienceCap: 10,
  maxReasons: 2,
  weights: {
    cold_start: { E: 0.1, S: 0.4, F: 0.15, D: 0.15, R: 0.1, L: 0.1 },
    normal: { E: 0.35, S: 0.25, F: 0.15, D: 0.1, R: 0.1, L: 0.05 },
  } satisfies Record<Regime, Weights>,
} as const;

export type Availability = 'now' | 'later_today' | 'none';

export interface MatchQuestion {
  tagIds: string[];
  lang: 'fr' | 'en';
  /** Décalage UTC de l'auteur en minutes (null si fuseau inconnu). */
  authorOffsetMinutes: number | null;
}

export interface MatchCandidate {
  userId: string;
  /** Étiquettes des questions où le dev a une réponse validée (une entrée par réponse). */
  acceptedAnswerTagIds: string[][];
  /** Compétences avec un score > 0. */
  skillTagIds: string[];
  /** Signal GitHub (G) par étiquette. */
  githubSignalByTag: Record<string, number>;
  /** « Je peux aider sur » (PR10). */
  canHelpTagIds: string[];
  offsetMinutes: number | null;
  availability: Availability;
  totalXp: number;
  languages: Array<'fr' | 'en'>;
  /** Sollicitations reçues sur les 24 dernières heures. */
  recentRequests: number;
  lastRequestedAt: Date | null;
}

export interface MatchReason {
  code:
    | 'solved_similar'
    | 'github_repos'
    | 'can_help'
    | 'same_timezone'
    | 'available_now'
    | 'translated';
  params: Record<string, unknown>;
}

export interface ScoredHelper {
  userId: string;
  /** Score sur 100, arrondi au centième. */
  score: number;
  reasons: MatchReason[];
  terms: Weights;
}

export function regimeFor(acceptedAnswersOnPlatform: number): Regime {
  return acceptedAnswersOnPlatform < MATCHING.coldStartAcceptedAnswers ? 'cold_start' : 'normal';
}

/** F : 1 si l'écart est ≤ 1 h, 0,7 si ≤ 3 h, 0,3 au-delà ou si un fuseau est inconnu. */
export function timezoneTerm(a: number | null, b: number | null): number {
  if (a === null || b === null) return 0.3;
  const gap = Math.abs(a - b);
  if (gap <= 60) return 1;
  if (gap <= 180) return 0.7;
  return 0.3;
}

const AVAILABILITY_TERM: Record<Availability, number> = { now: 1, later_today: 0.5, none: 0 };

/** Éligibilité calculée en mémoire (le reste est filtré en SQL : actif, auteur, ne pas déranger…). */
export function isEligible(question: MatchQuestion, c: MatchCandidate): boolean {
  if (c.recentRequests >= MATCHING.maxRequestsPer24h) return false;
  return question.tagIds.some((t) => c.skillTagIds.includes(t) || c.canHelpTagIds.includes(t));
}

export function scoreHelper(
  question: MatchQuestion,
  c: MatchCandidate,
  regime: Regime,
  translationAvailable = false,
): ScoredHelper {
  const qTags = question.tagIds;
  const common = (tags: string[]) => tags.filter((t) => qTags.includes(t));

  // E : expérience réelle du problème.
  const solved = c.acceptedAnswerTagIds.filter((tags) => common(tags).length > 0);
  const n = c.acceptedAnswerTagIds.reduce(
    (sum, tags) => sum + common(tags).length / qTags.length,
    0,
  );
  const E = Math.min(n, MATCHING.experienceCap) / MATCHING.experienceCap;

  // E' (X4) : au démarrage à froid, le meilleur signal GitHub des étiquettes de la question.
  const best = qTags.reduce<{ tag: string | null; g: number }>(
    (acc, t) =>
      (c.githubSignalByTag[t] ?? 0) > acc.g ? { tag: t, g: c.githubSignalByTag[t]! } : acc,
    { tag: null, g: 0 },
  );
  const Eprime = regime === 'cold_start' ? Math.max(E, (0.5 * best.g) / 40) : E;

  const S = common(c.skillTagIds).length / qTags.length;
  const F = timezoneTerm(question.authorOffsetMinutes, c.offsetMinutes);
  const D = AVAILABILITY_TERM[c.availability];
  const R = Math.min(Math.max(c.totalXp, 0), MATCHING.reputationCap) / MATCHING.reputationCap;
  const L = c.languages.includes(question.lang) ? 1 : translationAvailable ? 0.5 : 0;

  const w = MATCHING.weights[regime];
  const canHelp = common(c.canHelpTagIds);
  const raw =
    100 * (w.E * Eprime + w.S * S + w.F * F + w.D * D + w.R * R + w.L * L) +
    (canHelp.length > 0 ? MATCHING.canHelpBonus : 0);

  const reasons: MatchReason[] = [];
  if (E >= 0.1) {
    const tags = [...new Set(solved.flatMap(common))];
    reasons.push({ code: 'solved_similar', params: { count: solved.length, tagIds: tags } });
  }
  if (regime === 'cold_start' && best.tag) {
    reasons.push({ code: 'github_repos', params: { count: best.g / 5, tagId: best.tag } });
  }
  if (canHelp.length > 0) reasons.push({ code: 'can_help', params: { tagId: canHelp[0] } });
  if (F === 1) reasons.push({ code: 'same_timezone', params: {} });
  if (D === 1) reasons.push({ code: 'available_now', params: {} });
  if (L === 0.5) reasons.push({ code: 'translated', params: { lang: question.lang } });

  return {
    userId: c.userId,
    score: Math.round(raw * 100) / 100,
    reasons: reasons.slice(0, MATCHING.maxReasons),
    terms: { E: Eprime, S, F, D, R, L },
  };
}

/**
 * Sélection d'une vague (§6.2) : éligibles seulement, score décroissant, à égalité le moins
 * sollicité récemment d'abord, puis les 3 premiers.
 */
export function pickHelpers(
  question: MatchQuestion,
  candidates: MatchCandidate[],
  regime: Regime,
  limit: number = MATCHING.helpersPerWave,
  translationAvailable = false,
): ScoredHelper[] {
  const byId = new Map(candidates.map((c) => [c.userId, c]));
  const lastRequested = (id: string) => byId.get(id)!.lastRequestedAt?.getTime() ?? 0;
  return candidates
    .filter((c) => isEligible(question, c))
    .map((c) => scoreHelper(question, c, regime, translationAvailable))
    .sort(
      (a, b) =>
        b.score - a.score ||
        lastRequested(a.userId) - lastRequested(b.userId) ||
        a.userId.localeCompare(b.userId),
    )
    .slice(0, limit);
}

/** Décalage UTC (minutes) d'un fuseau IANA à un instant donné ; null si le fuseau est inconnu. */
export function timezoneOffsetMinutes(timeZone: string | null, at: Date): number | null {
  if (!timeZone) return null;
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).formatToParts(at);
    const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
    const local = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'));
    return Math.round((local - Math.floor(at.getTime() / 60_000) * 60_000) / 60_000);
  } catch {
    return null;
  }
}

export interface AvailabilitySettings {
  now?: boolean;
  until?: string;
  /** Créneaux dans le fuseau du dev : day 0 = dimanche, heures « HH:MM ». */
  slots?: Array<{ day: number; from: string; to: string }>;
}

/** « HH:MM » ou « HH » en minutes depuis minuit ; une valeur invalide vaut minuit. */
const minutesOf = (hhmm: string) => {
  const match = /^(\d{1,2})(?::(\d{2}))?$/.exec(hhmm);
  return match ? Number(match[1]) * 60 + Number(match[2] ?? 0) : 0;
};

/** D : disponible maintenant (drapeau ou créneau en cours), plus tard dans la journée, ou non. */
export function availabilityAt(
  settings: AvailabilitySettings | null,
  offsetMinutes: number | null,
  now: Date,
): Availability {
  if (!settings) return 'none';
  if (settings.now && (!settings.until || Date.parse(settings.until) > now.getTime())) return 'now';
  const local = new Date(now.getTime() + (offsetMinutes ?? 0) * 60_000);
  const day = local.getUTCDay();
  const minute = local.getUTCHours() * 60 + local.getUTCMinutes();
  let later = false;
  for (const slot of settings.slots ?? []) {
    if (slot.day !== day) continue;
    const from = minutesOf(slot.from);
    const to = minutesOf(slot.to);
    if (minute >= from && minute < to) return 'now';
    if (from > minute) later = true;
  }
  return later ? 'later_today' : 'none';
}
