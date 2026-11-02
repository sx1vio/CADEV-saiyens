import type { LucideIcon } from 'lucide-react';

/**
 * Cours façon Duolingo : un chemin d'unités, chaque unité est une suite de leçons courtes,
 * chaque leçon enchaîne une fiche de cours puis des exercices corrigés tout de suite.
 */

/** Fiche de cours affichée avant les exercices (ou entre deux). */
export interface TipStep {
  kind: 'tip';
  title: string;
  body: string;
  code?: string;
}

/** Une seule bonne réponse parmi plusieurs. */
export interface ChoiceStep {
  kind: 'choice';
  prompt: string;
  code?: string;
  choices: string[];
  answer: number;
  explain: string;
}

/** Affirmation à juger. */
export interface TrueFalseStep {
  kind: 'truefalse';
  statement: string;
  code?: string;
  answer: boolean;
  explain: string;
}

/** Code à trou : on touche le bon mot pour compléter `___`. */
export interface FillStep {
  kind: 'fill';
  prompt: string;
  /** Le code contient exactement un `___` */
  code: string;
  options: string[];
  answer: string;
  explain: string;
}

/** Lignes à remettre dans l'ordre (données dans le bon ordre, mélangées à l'affichage). */
export interface OrderStep {
  kind: 'order';
  prompt: string;
  lines: string[];
  explain: string;
}

/** Associer chaque élément de gauche à celui de droite (données appariées, mélangées à l'affichage). */
export interface MatchStep {
  kind: 'match';
  prompt: string;
  pairs: [string, string][];
  explain?: string;
}

export type Exercise = ChoiceStep | TrueFalseStep | FillStep | OrderStep | MatchStep;
export type Step = TipStep | Exercise;

export interface CourseLesson {
  id: string;
  title: string;
  steps: Step[];
}

export interface CourseUnit {
  id: string;
  title: string;
  /** Ce que tu sais faire à la fin de l'unité */
  goal: string;
  lessons: CourseLesson[];
}

export type CourseDomain = 'web' | 'mobile' | 'backend' | 'data' | 'cloud' | 'ai';

export interface CourseMeta {
  id: string;
  title: string;
  tagline: string;
  /** Pour qui : affiché sous le titre dans le choix du cours */
  forWho: string;
  icon: LucideIcon;
  /** Couleur principale du chemin (hexadécimal) */
  color: string;
  domain: CourseDomain;
  /** Certification DevHub à laquelle le cours prépare */
  certId?: string;
}

export interface Course extends CourseMeta {
  units: CourseUnit[];
}
