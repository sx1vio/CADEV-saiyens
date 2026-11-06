import { XP_POINTS, type XpKind, applyDailyCap, isCapped, splitPoints } from '@devhub/core';

export type XpSourceType =
  'answer' | 'question' | 'task' | 'feedback_request' | 'room' | 'bench_report';

export interface GainRequest {
  userId: string;
  kind: XpKind;
  sourceType: XpSourceType;
  sourceId: string;
  /** Étiquettes créditées ; vide pour un gain sans étiquette (question résolue). */
  tagIds: string[];
  counterpartId: string | null;
}

export interface PlannedEvent extends Omit<GainRequest, 'tagIds'> {
  tagId: string | null;
  points: number;
}

export interface GainPlan {
  events: PlannedEvent[];
  requested: number;
  granted: number;
}

/**
 * Applique le barème, le plafond quotidien (sauf bonus de vitesse) et la répartition entre étiquettes.
 * `cappedPointsToday` : points déjà gagnés aujourd'hui dans les kinds plafonnés.
 * Les parts nulles (2 points sur 3 étiquettes) ne produisent pas d'événement.
 */
export function planGain(request: GainRequest, cappedPointsToday: number): GainPlan {
  const requested = XP_POINTS[request.kind];
  const granted = isCapped(request.kind) ? applyDailyCap(requested, cappedPointsToday) : requested;
  const tags = request.tagIds.length > 0 ? request.tagIds : [null];
  const parts = splitPoints(granted, tags.length);
  const { tagIds: _, ...base } = request;
  const events = tags
    .map((tagId, i) => ({ ...base, tagId, points: parts[i]! }))
    .filter((event) => event.points > 0);
  return { events, requested, granted };
}
