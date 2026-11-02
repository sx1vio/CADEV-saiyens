import { z } from 'zod';
import { PublicAuthor } from './questions';
import { PageInfo } from './xp';

// M1 : signalement d'un contenu et retrait par un administrateur, chaque décision journalisée (M4).

export const ReportTargetType = z.enum(['question', 'answer', 'room', 'room_message', 'user']);
export type ReportTargetType = z.infer<typeof ReportTargetType>;
export const ReportStatus = z.enum(['open', 'actioned', 'dismissed']);

/** POST /api/v1/reports (Idempotency-Key) */
export const CreateReportRequest = z.object({
  targetType: ReportTargetType,
  targetId: z.uuid(),
  reason: z.string().trim().min(3).max(500),
});
export type CreateReportRequest = z.infer<typeof CreateReportRequest>;

export const ReportView = z.object({
  id: z.uuid(),
  targetType: ReportTargetType,
  targetId: z.uuid(),
  reason: z.string(),
  status: ReportStatus,
  createdAt: z.iso.datetime(),
});
export type ReportView = z.infer<typeof ReportView>;

/** GET /api/v1/admin/reports */
export const ListReportsQuery = z.object({
  status: ReportStatus.default('open'),
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type ListReportsQuery = z.infer<typeof ListReportsQuery>;

export const AdminReportView = ReportView.extend({
  reporter: PublicAuthor,
  /** Extrait du contenu signalé ; null s'il n'existe plus. */
  target: z
    .object({
      excerpt: z.string(),
      author: PublicAuthor.nullable(),
      hidden: z.boolean(),
    })
    .nullable(),
  /** Autres signalements ouverts sur le même contenu. */
  openReportsOnTarget: z.number().int(),
  handledAt: z.iso.datetime().nullable(),
});
export type AdminReportView = z.infer<typeof AdminReportView>;

export const ListReportsResponse = z.object({ data: z.array(AdminReportView), page: PageInfo });
export type ListReportsResponse = z.infer<typeof ListReportsResponse>;

/**
 * POST /api/v1/admin/reports/:id/action (Idempotency-Key). hide masque le contenu (jamais de
 * suppression) ; restore le rétablit ; dismiss rejette le signalement. revertXp annule les Proof
 * XP gagnés grâce au contenu masqué (X2).
 */
export const ReportActionRequest = z
  .object({
    action: z.enum(['hide', 'restore', 'dismiss']),
    reason: z.string().trim().min(3).max(500),
    revertXp: z.boolean().default(false),
  })
  .refine((b) => !b.revertXp || b.action === 'hide', {
    message: 'revertXp seulement avec hide',
    path: ['revertXp'],
  });
export type ReportActionRequest = z.infer<typeof ReportActionRequest>;

export const ReportActionResponse = z.object({
  report: ReportView,
  /** Signalements ouverts sur le même contenu, clos par cette décision (celui-ci compris). */
  closedReports: z.number().int(),
  revertedXpEvents: z.number().int(),
});
export type ReportActionResponse = z.infer<typeof ReportActionResponse>;

/** GET /api/v1/admin/audit (M4) : journal des décisions de modération, plus récentes d'abord. */
/** Cibles du journal : contenus modérés, offres d'emploi, comptes (connexion à l'administration). */
export const AuditTargetType = z.enum([...ReportTargetType.options, 'job_offer']);
export type AuditTargetType = z.infer<typeof AuditTargetType>;

export const AuditAction = z.enum([
  'hide_content',
  'restore_content',
  'dismiss_report',
  'job_create',
  'job_update',
  'job_delete',
  'admin_sign_in',
]);
export type AuditAction = z.infer<typeof AuditAction>;

export const ListAuditQuery = z.object({
  targetType: AuditTargetType.optional(),
  targetId: z.uuid().optional(),
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type ListAuditQuery = z.infer<typeof ListAuditQuery>;

export const AuditEntry = z.object({
  id: z.uuid(),
  action: AuditAction,
  targetType: AuditTargetType,
  targetId: z.uuid(),
  reason: z.string(),
  admin: PublicAuthor,
  createdAt: z.iso.datetime(),
});
export type AuditEntry = z.infer<typeof AuditEntry>;

export const ListAuditResponse = z.object({ data: z.array(AuditEntry), page: PageInfo });
export type ListAuditResponse = z.infer<typeof ListAuditResponse>;
