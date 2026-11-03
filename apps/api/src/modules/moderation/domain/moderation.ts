// Règles pures de la modération (M1, M4). Aucune dépendance à Nest ni à Prisma.

export type ReportTargetType =
  | 'question'
  | 'answer'
  | 'room'
  | 'room_message'
  | 'user'
  | 'post'
  | 'post_comment'
  | 'direct_message';
export type ReportStatus = 'open' | 'actioned' | 'dismissed';
export type ModerationAction = 'hide' | 'restore' | 'dismiss';

export class ReportTargetNotFoundError extends Error {}
export class ReportNotFoundError extends Error {}
/** Un compte ne se masque pas (A3 : anonymisation, hors du périmètre de M1). */
export class TargetNotHideableError extends Error {}
export class ReportAlreadyHandledError extends Error {}

/** Contenus qui portent hidden_at : on masque, on ne supprime jamais (05-modele-donnees.md). */
export const isHideable = (type: ReportTargetType): boolean => type !== 'user';

/** Source des Proof XP gagnés grâce à un contenu (xp_events.source_type), annulables par X2. */
export const XP_SOURCE: Partial<Record<ReportTargetType, string>> = {
  question: 'question',
  answer: 'answer',
  room: 'room',
};

/** Journal d'audit (admin_actions.action). */
export const AUDIT_ACTION: Record<ModerationAction, string> = {
  hide: 'hide_content',
  restore: 'restore_content',
  dismiss: 'dismiss_report',
};

/**
 * hide et dismiss traitent un signalement ouvert ; restore revient sur un masquage (signalement
 * « actioned »), le signalement devient alors « dismissed ».
 */
export function decide(
  status: ReportStatus,
  action: ModerationAction,
  targetType: ReportTargetType,
): { reportStatus: Exclude<ReportStatus, 'open'>; hidden: boolean | null } {
  if (action !== 'dismiss' && !isHideable(targetType)) throw new TargetNotHideableError();
  if (action === 'restore') {
    if (status !== 'actioned') throw new ReportAlreadyHandledError();
    return { reportStatus: 'dismissed', hidden: false };
  }
  if (status !== 'open') throw new ReportAlreadyHandledError();
  return action === 'hide'
    ? { reportStatus: 'actioned', hidden: true }
    : { reportStatus: 'dismissed', hidden: null };
}
