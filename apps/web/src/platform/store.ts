import { create } from 'zustand';
import { storageGet, storageSet, uuid } from '@/lib/utils';
import type { BuildTrack, Comment, Post } from './types';

/**
 * État personnel sur les services de l'écosystème, gardé sur l'appareil (fonctionne hors ligne).
 * Il sera synchronisé avec l'API quand le serveur exposera ces services.
 */
export interface CertResult {
  score: number;
  passed: boolean;
  at: string;
  /** Code de vérification du certificat, posé à la réussite */
  code?: string;
  /** Dernière tentative (réussie ou non) : délai avant la suivante */
  lastAttemptAt?: string;
}

interface Persisted {
  votes: Record<string, 1 | -1>;
  saved: string[];
  joined: string[];
  myPosts: Post[];
  myComments: Comment[];
  savedJobs: string[];
  certResults: Record<string, CertResult>;
  savedCerts: string[];
  installedSkills: string[];
  starredSkills: string[];
  likedVideos: string[];
  subscriptions: string[];
  watchLater: string[];
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
  vote: (id: string, dir: 1 | -1) => void;
  toggle: (
    key:
      | 'saved'
      | 'joined'
      | 'savedJobs'
      | 'savedCerts'
      | 'installedSkills'
      | 'starredSkills'
      | 'likedVideos'
      | 'subscriptions'
      | 'watchLater'
      | 'enrolled',
    id: string,
  ) => void;
  addPost: (p: Omit<Post, 'id' | 'score' | 'comments' | 'createdAt'>) => Post;
  addComment: (postId: string, parentId: string | null, author: string, body: string) => void;
  recordCert: (certId: string, score: number, passScore: number) => void;
  completeLesson: (key: string, xp?: number) => void;
  lessonsToday: () => number;
  setGuideTrack: (t: BuildTrack) => void;
  toggleGuideCheck: (stepId: string, item: string) => void;
  resetGuide: () => void;
  /** Applique les choix de l'onboarding : parcours suivis, communautés rejointes, objectif du jour */
  applyOnboarding: (o: {
    enroll: string[];
    join: string[];
    dailyGoal: number;
    course?: string | null;
  }) => void;
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
  votes: {},
  saved: [],
  joined: ['ia', 'web', 'showcase', 'carriere'],
  myPosts: [],
  myComments: [],
  savedJobs: [],
  certResults: {},
  savedCerts: [],
  installedSkills: [],
  starredSkills: [],
  likedVideos: [],
  subscriptions: [
    'moussa-diop',
    'grace-uwase',
    'kwame-dev',
    'je-hounkpatin',
    'nadia-benali',
    'esi-owusu',
  ],
  watchLater: [],
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
  vote: (id, dir) =>
    set((s) => {
      const votes = { ...s.votes };
      if (votes[id] === dir) delete votes[id];
      else votes[id] = dir;
      return { votes };
    }),
  toggle: (key, id) =>
    set((s) => {
      const list = s[key];
      return {
        [key]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id],
      } as Partial<Persisted>;
    }),
  addPost: (p) => {
    const post: Post = {
      ...p,
      id: `mine-${uuid()}`,
      score: 1,
      comments: 0,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ myPosts: [post, ...s.myPosts], votes: { ...s.votes, [post.id]: 1 } }));
    return post;
  },
  addComment: (postId, parentId, author, body) =>
    set((s) => ({
      myComments: [
        ...s.myComments,
        {
          id: `mc-${uuid()}`,
          postId,
          parentId,
          author,
          body,
          score: 1,
          createdAt: new Date().toISOString(),
        },
      ],
    })),
  recordCert: (certId, score, passScore) =>
    set((s) => {
      const prev = s.certResults[certId];
      const now = new Date().toISOString();
      const passed = score >= passScore;
      const code =
        prev?.code ??
        (passed
          ? `DH-${certId.split('-')[0]!.toUpperCase().slice(0, 4)}-${uuid().slice(0, 4).toUpperCase()}-${uuid().slice(0, 4).toUpperCase()}`
          : undefined);
      // On garde le meilleur résultat obtenu, et la date de la dernière tentative.
      const best = prev && prev.score > score ? prev : { score, passed, at: now };
      return {
        certResults: {
          ...s.certResults,
          [certId]: { ...best, passed: best.passed || !!prev?.passed, code, lastAttemptAt: now },
        },
      };
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
  applyOnboarding: ({ enroll, join, dailyGoal, course }) =>
    set((s) => ({
      enrolled: [...new Set([...s.enrolled, ...enroll])],
      joined: [...new Set([...s.joined, ...join])],
      dailyGoal,
      course: course ?? s.course,
    })),
  setCourse: (id) => set({ course: id }),
  setDailyGoal: (min) => set({ dailyGoal: min }),
}));

// Sauvegarde sur l'appareil à chaque changement (les fonctions ne sont pas sérialisées).
usePlatform.subscribe((s) => {
  const data: Persisted = {
    votes: s.votes,
    saved: s.saved,
    joined: s.joined,
    myPosts: s.myPosts,
    myComments: s.myComments,
    savedJobs: s.savedJobs,
    certResults: s.certResults,
    savedCerts: s.savedCerts,
    installedSkills: s.installedSkills,
    starredSkills: s.starredSkills,
    likedVideos: s.likedVideos,
    subscriptions: s.subscriptions,
    watchLater: s.watchLater,
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
