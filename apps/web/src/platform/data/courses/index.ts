import { COURSE_META, courseMeta } from './meta';
import type { Course, CourseLesson, CourseUnit } from './types';

export { COURSE_META, courseMeta };
export type * from './types';

/** Contenu chargé à la demande : seul le cours ouvert est téléchargé. */
const LOADERS: Record<string, () => Promise<{ units: CourseUnit[] }>> = {
  web: () => import('./web'),
  python: () => import('./python'),
  git: () => import('./git'),
  sql: () => import('./sql'),
  mobile: () => import('./mobile'),
  ia: () => import('./ia'),
};

export async function loadCourse(id: string): Promise<Course | null> {
  const meta = courseMeta(id);
  const load = LOADERS[id];
  if (!meta || !load) return null;
  const { units } = await load();
  return { ...meta, units };
}

/** Clé de progression d'une leçon de cours, partagée avec les leçons des parcours dans le store. */
export const lessonKey = (courseId: string, lessonId: string) => `cours:${courseId}/${lessonId}`;

export interface PathNode {
  unit: CourseUnit;
  unitIndex: number;
  lesson: CourseLesson;
  /** Position globale dans le cours */
  index: number;
  state: 'done' | 'current' | 'locked';
}

/** Le chemin : une leçon se débloque quand la précédente est terminée. */
export function pathNodes(course: Course, done: readonly string[]): PathNode[] {
  const nodes: PathNode[] = [];
  let currentFound = false;
  let i = 0;
  course.units.forEach((unit, unitIndex) => {
    for (const lesson of unit.lessons) {
      const isDone = done.includes(lessonKey(course.id, lesson.id));
      let state: PathNode['state'] = 'locked';
      if (isDone) state = 'done';
      else if (!currentFound) {
        state = 'current';
        currentFound = true;
      }
      nodes.push({ unit, unitIndex, lesson, index: i++, state });
    }
  });
  return nodes;
}

export function courseProgress(course: Course, done: readonly string[]) {
  const total = course.units.reduce((n, u) => n + u.lessons.length, 0);
  const n = course.units.reduce(
    (acc, u) => acc + u.lessons.filter((l) => done.includes(lessonKey(course.id, l.id))).length,
    0,
  );
  return { n, total, pct: total ? Math.round((n / total) * 100) : 0 };
}

/** Nombre de leçons d'un cours sans charger son contenu (pour les cartes du catalogue). */
export const LESSONS_PER_COURSE = 12;
