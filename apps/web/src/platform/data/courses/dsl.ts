import type {
  ChoiceStep,
  CourseLesson,
  CourseUnit,
  FillStep,
  MatchStep,
  OrderStep,
  Step,
  TipStep,
  TrueFalseStep,
} from './types';

/** Petites fonctions pour écrire les cours de façon compacte et lisible. */

export const tip = (title: string, body: string, code?: string): TipStep => ({
  kind: 'tip',
  title,
  body,
  code,
});

/** Choix unique : `answer` est l'index de la bonne réponse. */
export const qcm = (
  prompt: string,
  choices: string[],
  answer: number,
  explain: string,
  code?: string,
): ChoiceStep => ({ kind: 'choice', prompt, choices, answer, explain, code });

export const vf = (
  statement: string,
  answer: boolean,
  explain: string,
  code?: string,
): TrueFalseStep => ({ kind: 'truefalse', statement, answer, explain, code });

/** Code à trou : `code` contient `___`, `answer` fait partie de `options`. */
export const fill = (
  prompt: string,
  code: string,
  options: string[],
  answer: string,
  explain: string,
): FillStep => ({ kind: 'fill', prompt, code, options, answer, explain });

/** `lines` dans le bon ordre : elles sont mélangées à l'affichage. */
export const order = (prompt: string, lines: string[], explain: string): OrderStep => ({
  kind: 'order',
  prompt,
  lines,
  explain,
});

export const match = (prompt: string, pairs: [string, string][], explain?: string): MatchStep => ({
  kind: 'match',
  prompt,
  pairs,
  explain,
});

export const lesson = (id: string, title: string, steps: Step[]): CourseLesson => ({
  id,
  title,
  steps,
});

export const unit = (
  id: string,
  title: string,
  goal: string,
  lessons: CourseLesson[],
): CourseUnit => ({ id, title, goal, lessons });
