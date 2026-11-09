import { create } from 'zustand';
import { storageGet, storageSet } from '@/lib/utils';
import type { BuildTrack } from './types';

/**
 * État personnel sur les services de l'écosystème, gardé sur l'appareil (fonctionne hors ligne).
 * Il sera synchronisé avec l'API quand le serveur exposera ces services.
 */
/** Entraînement d'une certification, par thème : questions vues et réussies. */
export type TopicStats = Record<number, { seen: number; ok: number }>;

/** Plan de révision jusqu'à la date d'examen choisie ; `done` = jours cochés (AAAA-MM-JJ). */
export interface CertPlan {
  examDate: string;
  done: string[];
}

interface Persisted {
  saved: string[];
  joined: string[];
  savedJobs: string[];
  /** Résultats d'entraînement par certification (les examens sont corrigés et gardés par l'API). */
  certPractice: Record<string, TopicStats>;
  /** Questions ratées à revoir, par certification (identifiants de la banque). */
  certMistakes: Record<string, string[]>;
  certPlans: Record<string, CertPlan>;
  savedCerts: string[];
  installedSkills: string[];
  starredSkills: string[];
  lessonsDone: string[];
  /** Jour de fin de chaque leçon */
  lessonsLog: Record<string, string>;
  /** Jours (AAAA-MM-JJ, heure locale) où au moins une leçon a été terminée : la série */
  learnDays: string[];
  /** XP d'apprentissage : 10 par leçon, 5 par bonne réponse de quiz */
  learnXp: number;
  enrolled: string[];
  /** Cours façon Duolingo suivi en ce moment (choisi à l'onboarding ou sur /apprendre) */
  course: string | null;
  /** Objectif quotidien d'apprentissage, en minutes (onboarding) */
  dailyGoal: number;
  guideTrack: BuildTrack | null;
  guideChecks: Record<string, string[]>;
}

interface Actions {
  toggle: (
    key:
      | 'saved'
      | 'joined'
      | 'savedJobs'
      | 'savedCerts'
      | 'installedSkills'
      | 'starredSkills'
      | 'enrolled',
    id: string,
  ) => void;
  /** Une réponse d'entraînement ou d'examen : statistiques du thème et liste des erreurs à revoir. */
  recordAnswers: (
    certId: string,
    answers: Array<{ id: string; topic: number; correct: boolean }>,
  ) => void;
  setCertPlan: (certId: string, examDate: string | null) => void;
  togglePlanDay: (certId: string, day: string) => void;
  completeLesson: (key: string, xp?: number) => void;
  lessonsToday: () => number;
  setGuideTrack: (t: BuildTrack) => void;
  toggleGuideCheck: (stepId: string, item: string) => void;
  resetGuide: () => void;
  /** Applique les choix de l'onboarding : centres d'intérêt du fil et cours choisi (débutant). */
  applyOnboarding: (o: { interests: string[]; course?: string | null }) => void;
  setCourse: (id: string) => void;
  setDailyGoal: (min: number) => void;
}

const KEY = 'dh-platform';

/** Jour local au format AAAA-MM-JJ */
export function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Série : jours consécutifs avec une leçon, jusqu'à aujourd'hui (ou hier, la série n'est pas encore perdue). */
export function selectStreak(s: { learnDays: string[] }) {
  const days = new Set(s.learnDays);
  const d = new Date();
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(dayKey(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

/** Minutes comptées par leçon terminée pour l'objectif du jour (une leçon dure 3 à 5 minutes). */
export const MIN_PER_LESSON = 4;

/** Objectif du jour atteint : leçons du jour × durée moyenne ≥ objectif choisi. */
export function selectGoalReached(s: { lessonsToday: () => number; dailyGoal: number }) {
  return s.lessonsToday() * MIN_PER_LESSON >= s.dailyGoal;
}

const DEFAULTS: Persisted = {
  saved: [],
  joined: ['ia', 'web', 'showcase', 'carriere'],
  savedJobs: [],
  certPractice: {},
  certMistakes: {},
  certPlans: {},
  savedCerts: [],
  installedSkills: [],
  starredSkills: [],
  lessonsDone: [],
  lessonsLog: {},
  learnDays: [],
  learnXp: 0,
  enrolled: [],
  course: null,
  dailyGoal: 10,
  guideTrack: null,
  guideChecks: {},
};

function load(): Persisted {
  try {
    const raw = storageGet(KEY);
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Persisted>) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export const usePlatform = create<Persisted & Actions>((set, get) => ({
  ...load(),
  toggle: (key, id) =>
    set((s) => {
      const list = s[key];
      return {
        [key]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id],
      } as Partial<Persisted>;
    }),
  recordAnswers: (certId, answers) =>
    set((s) => {
      const stats: TopicStats = { ...s.certPractice[certId] };
      let mistakes = s.certMistakes[certId] ?? [];
      for (const a of answers) {
        const t = stats[a.topic] ?? { seen: 0, ok: 0 };
        stats[a.topic] = { seen: t.seen + 1, ok: t.ok + (a.correct ? 1 : 0) };
        mistakes = a.correct
          ? mistakes.filter((id) => id !== a.id)
          : mistakes.includes(a.id)
            ? mistakes
            : [...mistakes, a.id];
      }
      return {
        certPractice: { ...s.certPractice, [certId]: stats },
        certMistakes: { ...s.certMistakes, [certId]: mistakes.slice(-60) },
      };
    }),
  setCertPlan: (certId, examDate) =>
    set((s) => {
      const plans = { ...s.certPlans };
      if (examDate) plans[certId] = { examDate, done: plans[certId]?.done ?? [] };
      else delete plans[certId];
      return { certPlans: plans };
    }),
  togglePlanDay: (certId, day) =>
    set((s) => {
      const plan = s.certPlans[certId];
      if (!plan) return s;
      const done = plan.done.includes(day)
        ? plan.done.filter((d) => d !== day)
        : [...plan.done, day];
      return { certPlans: { ...s.certPlans, [certId]: { ...plan, done } } };
    }),
  completeLesson: (key, xp = 10) =>
    set((s) => {
      if (s.lessonsDone.includes(key)) return s;
      const d = dayKey(new Date());
      return {
        lessonsDone: [...s.lessonsDone, key],
        learnDays: s.learnDays.includes(d) ? s.learnDays : [...s.learnDays, d],
        learnXp: s.learnXp + xp,
        lessonsLog: { ...s.lessonsLog, [key]: d },
      };
    }),
  lessonsToday: () => {
    const d = dayKey(new Date());
    return Object.values(get().lessonsLog).filter((x) => x === d).length;
  },
  setGuideTrack: (guideTrack) => set({ guideTrack }),
  toggleGuideCheck: (stepId, item) =>
    set((s) => {
      const cur = s.guideChecks[stepId] ?? [];
      return {
        guideChecks: {
          ...s.guideChecks,
          [stepId]: cur.includes(item) ? cur.filter((x) => x !== item) : [...cur, item],
        },
      };
    }),
  resetGuide: () => set({ guideChecks: {}, guideTrack: null }),
  // Les centres d'intérêt choisis remplacent ceux par défaut : le fil suit exactement ce choix.
  applyOnboarding: ({ interests, course }) =>
    set((s) => ({
      joined: interests.length ? [...new Set(interests)] : s.joined,
      course: course ?? s.course,
    })),
  setCourse: (id) => set({ course: id }),
  setDailyGoal: (min) => set({ dailyGoal: min }),
}));

// Sauvegarde sur l'appareil à chaque changement (les fonctions ne sont pas sérialisées).
usePlatform.subscribe((s) => {
  const data: Persisted = {
    saved: s.saved,
    joined: s.joined,
    savedJobs: s.savedJobs,
    certPractice: s.certPractice,
    certMistakes: s.certMistakes,
    certPlans: s.certPlans,
    savedCerts: s.savedCerts,
    installedSkills: s.installedSkills,
    starredSkills: s.starredSkills,
    lessonsDone: s.lessonsDone,
    lessonsLog: s.lessonsLog,
    learnDays: s.learnDays,
    learnXp: s.learnXp,
    enrolled: s.enrolled,
    course: s.course,
    dailyGoal: s.dailyGoal,
    guideTrack: s.guideTrack,
    guideChecks: s.guideChecks,
  };
  try {
    storageSet(KEY, JSON.stringify(data));
  } catch {
    /* stockage plein ou indisponible : l'état reste en mémoire */
  }
});
