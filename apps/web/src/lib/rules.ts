/**
 * Règles produit du cahier des charges, en un seul endroit.
 * - Proof XP et scores : CDC v3 §6.3 (+ X3)
 * - Matching : CDC v3 §6.2 (+ X4 démarrage à froid, S10 langue, PR10 « je peux aider »)
 * Partagées par le serveur local ; le back-end doit appliquer les mêmes.
 */
import type {
  Lang,
  MatchReason,
  SkillLevel,
  User,
  UserSkill,
  XPKind,
  XpRules,
} from '@/services/types';

export const XP: Record<Exclude<XPKind, 'revert'>, number> = {
  'answer-accepted': 10,
  'fast-bonus': 3,
  'answer-helpful': 2,
  'contribution-accepted': 15,
  'code-review': 8,
  'project-demo': 5,
  'deployment-verified': 10,
  'field-test': 8,
  'question-resolved': 1,
};

export const GUARDS = {
  /** Plafond quotidien, hors bonus de vitesse */
  dailyCap: 60,
  /** Votes « utile » comptés au maximum par réponse */
  maxHelpfulVotesPerAnswer: 5,
  /** Validations par paire auteur-répondant et par semaine */
  maxAcceptsPerPairPerWeek: 2,
  /** Ancienneté minimale pour voter */
  minAccountAgeHoursToVote: 24,
  fastBonusMinutes: 15,
  escalationMinutes: 15,
  claimExpiryMinutes: 20,
  maxSolicitationsPer24h: 5,
  activeDays: 30,
};

/** X5 : barème de repli (mode local, hors ligne) ; en ligne, la page lit GET /rules/xp. */
export const STATIC_XP_RULES: XpRules = {
  points: {
    accepted: XP['answer-accepted'],
    fast: XP['fast-bonus'],
    helpful: XP['answer-helpful'],
    contribution: XP['contribution-accepted'],
    review: XP['code-review'],
    demo: XP['project-demo'],
    resolved: XP['question-resolved'],
    deployment: XP['deployment-verified'],
    fieldTest: XP['field-test'],
  },
  dailyCap: GUARDS.dailyCap,
  fastBonusMinutes: GUARDS.fastBonusMinutes,
  helpfulVotesPerAnswer: GUARDS.maxHelpfulVotesPerAnswer,
  validationsPerPairPerWeek: GUARDS.maxAcceptsPerPairPerWeek,
  minVoterAccountAgeHours: GUARDS.minAccountAgeHoursToVote,
  githubPerRepo: 5,
  githubCap: 40,
  platformCap: 60,
  activeMonths: 24,
};

export function githubSignal(qualifiedRepos: number) {
  return Math.min(40, 5 * qualifiedRepos);
}

export function platformSignal(xpOnTag: number) {
  return Math.min(60, xpOnTag);
}

export function skillScore(g: number, p: number) {
  return Math.min(100, g + p);
}

export function skillLevel(score: number): SkillLevel {
  if (score >= 80) return 'expert';
  if (score >= 60) return 'advanced';
  if (score >= 30) return 'confirmed';
  return 'beginner';
}

/** X3 : un dépôt compte s'il est non forké, non vide, actif depuis moins de 24 mois. */
export function isQualifiedRepo(
  repo: { fork: boolean; size: number; pushed_at: string | null },
  now = Date.now(),
) {
  if (repo.fork || repo.size <= 0 || !repo.pushed_at) return false;
  const months = (now - new Date(repo.pushed_at).getTime()) / (1000 * 60 * 60 * 24 * 30.4);
  return months < 24;
}

/* ---------------- Matching ---------------- */

export interface MatchCandidate {
  user: User;
  skills: UserSkill[];
  /** Somme, pour chaque réponse validée, de (étiquettes communes / étiquettes de la question) */
  experienceN: number;
  /** Nombre de réponses validées sur des étiquettes communes (pour la raison affichée) */
  solvedSimilar: number;
  totalXp: number;
  solicitations24h: number;
  lastSolicitedAt: number;
}

export interface MatchInput {
  authorId: string;
  tagIds: string[];
  tagLabels: Record<string, string>;
  lang: Lang;
  authorUtcOffset: number;
  /** Nombre total de réponses validées sur la plateforme (X4) */
  platformAccepted: number;
  now?: number;
}

export interface ScoredMatch {
  candidate: MatchCandidate;
  score: number;
  reasons: MatchReason[];
}

const WEIGHTS_NORMAL = { E: 0.35, S: 0.25, F: 0.15, D: 0.1, R: 0.1, L: 0.05 };
const WEIGHTS_COLD = { E: 0.1, S: 0.4, F: 0.15, D: 0.15, R: 0.1, L: 0.1 };

export function scoreCandidates(input: MatchInput, candidates: MatchCandidate[]): ScoredMatch[] {
  const now = input.now ?? Date.now();
  const cold = input.platformAccepted < 50;
  const w = cold ? WEIGHTS_COLD : WEIGHTS_NORMAL;
  const qTags = new Set(input.tagIds);

  const eligible = candidates.filter((c) => {
    const u = c.user;
    if (u.id === input.authorId || u.deletedAt) return false;
    const activeMs = now - new Date(u.lastSeenAt).getTime();
    if (activeMs > GUARDS.activeDays * 864e5) return false;
    if (c.solicitations24h >= GUARDS.maxSolicitationsPer24h) return false;
    if (u.availability.status === 'busy' && !u.availability.slots.length) return false;
    return c.skills.some((s) => qTags.has(s.tagId)) || u.canHelpWith.some((t) => qTags.has(t));
  });

  const scored = eligible.map((c) => {
    const u = c.user;
    const common = c.skills.filter((s) => qTags.has(s.tagId));
    const S = qTags.size ? common.length / qTags.size : 0;
    let E = Math.min(c.experienceN, 10) / 10;
    if (cold) {
      // E' = max(E, 0,5 × G_tag / 40) sur la meilleure étiquette commune
      const bestG = Math.max(0, ...common.map((s) => s.githubSignal));
      E = Math.max(E, (0.5 * bestG) / 40);
    }
    const gap = Math.abs(u.utcOffset - input.authorUtcOffset);
    const F = gap <= 1 ? 1 : gap <= 3 ? 0.7 : 0.3;
    const D = u.availability.status === 'now' ? 1 : u.availability.status === 'today' ? 0.5 : 0;
    const R = Math.min(c.totalXp, 500) / 500;
    const L = u.languages.includes(input.lang) ? 1 : 0.5; // S10 : 0,5 si traduction disponible
    const canHelp = u.canHelpWith.some((t) => qTags.has(t)) ? 0.05 : 0;

    const score = Math.round(
      100 * (w.E * E + w.S * S + w.F * F + w.D * D + w.R * R + w.L * L + canHelp),
    );

    const reasons: MatchReason[] = [];
    const tagNames = common
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map((s) => input.tagLabels[s.tagId] ?? '')
      .filter(Boolean)
      .join(' · ');
    if (c.solvedSimilar > 0) {
      reasons.push({
        kind: 'experience',
        key: 'match.reason.solved',
        params: { count: c.solvedSimilar, tags: tagNames },
      });
    } else if (cold && common.some((s) => s.githubRepos > 0)) {
      const repos = Math.max(...common.map((s) => s.githubRepos));
      reasons.push({
        kind: 'experience',
        key: 'match.reason.repos',
        params: { count: repos, tags: tagNames },
      });
    }
    if (S >= 0.5)
      reasons.push({ kind: 'stack', key: 'match.reason.stack', params: { tags: tagNames } });
    if (gap <= 1) reasons.push({ kind: 'timezone', key: 'match.reason.timezone' });
    if (D === 1) reasons.push({ kind: 'availability', key: 'match.reason.available' });
    if (L < 1) reasons.push({ kind: 'language', key: 'match.reason.translated' });
    if (canHelp) reasons.push({ kind: 'can-help', key: 'match.reason.canHelp' });

    return { candidate: c, score, reasons: reasons.slice(0, 3) };
  });

  // 3 meilleurs ; à égalité, le moins sollicité récemment passe devant.
  return scored.sort(
    (a, b) => b.score - a.score || a.candidate.lastSolicitedAt - b.candidate.lastSolicitedAt,
  );
}
