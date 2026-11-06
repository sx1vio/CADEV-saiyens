import type { PlatformCert } from './types';
import { dayKey, type TopicStats } from './store';

/** Maîtrise d'un thème à l'entraînement : part de bonnes réponses, null si jamais travaillé. */
export function mastery(stats: TopicStats | undefined, topic: number): number | null {
  const t = stats?.[topic];
  return t && t.seen > 0 ? Math.round((t.ok / t.seen) * 100) : null;
}

export interface PlanTask {
  kind: 'topic' | 'mock' | 'mistakes' | 'exam';
  topic?: number;
}

/**
 * Plan jusqu'à la date d'examen : les thèmes les moins maîtrisés d'abord, un examen blanc et la
 * révision des erreurs la veille, l'examen le jour J. Au-delà de 60 jours, le plan s'arrête.
 */
export function buildPlan(
  cert: Pick<PlatformCert, 'syllabus'>,
  examDate: string,
  stats: TopicStats | undefined,
  today: Date,
): Array<{ day: string; tasks: PlanTask[] }> {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const [y, m, d] = examDate.split('-').map(Number);
  const exam = new Date(y!, m! - 1, d!);
  const days: string[] = [];
  for (const cur = new Date(start); cur < exam && days.length < 60; cur.setDate(cur.getDate() + 1))
    days.push(dayKey(cur));
  const order = cert.syllabus
    .map((_, k) => ({ k, m: mastery(stats, k) }))
    .sort((a, b) => (a.m ?? -1) - (b.m ?? -1))
    .map((x) => x.k);
  const plan: Array<{ day: string; tasks: PlanTask[] }> = [];
  const studyDays = days.length >= 2 ? days.slice(0, -1) : days;
  if (studyDays.length > 0) {
    if (studyDays.length >= order.length) {
      studyDays.forEach((day, i) =>
        plan.push({ day, tasks: [{ kind: 'topic', topic: order[i % order.length]! }] }),
      );
    } else {
      // Moins de jours que de thèmes : plusieurs thèmes par jour.
      studyDays.forEach((day, i) => {
        const per = Math.ceil(order.length / studyDays.length);
        const topics = order.slice(i * per, (i + 1) * per);
        if (topics.length)
          plan.push({ day, tasks: topics.map((topic) => ({ kind: 'topic', topic })) });
      });
    }
  }
  if (days.length >= 2)
    plan.push({ day: days[days.length - 1]!, tasks: [{ kind: 'mock' }, { kind: 'mistakes' }] });
  plan.push({ day: dayKey(exam), tasks: [{ kind: 'exam' }] });
  return plan;
}
