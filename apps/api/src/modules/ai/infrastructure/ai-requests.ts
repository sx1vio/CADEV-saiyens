import type { Prisma } from '../../../generated/prisma/client';
import type { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { AiRequestRecord, ModelCallBase, ModelCallResult } from '../domain/ports';

/**
 * Statuts de ai_requests qui correspondent à un appel au modèle, fait ou en cours (« pending »,
 * réservé avant l'appel), comptés dans le quota horaire commun.
 */
export const MODEL_CALL_STATUSES = ['ok', 'error', 'timeout', 'refusal', 'pending'];

/** Quota horaire (§8) : partagé par tous les usages de l'IA (piste, traduction…). */
export function countModelCallsSince(
  prisma: PrismaService,
  userId: string,
  since: Date,
): Promise<number> {
  return prisma.aiRequest.count({
    where: { userId, createdAt: { gte: since }, status: { in: MODEL_CALL_STATUSES } },
  });
}

export async function recordAiRequest(
  prisma: PrismaService,
  record: AiRequestRecord,
): Promise<void> {
  await prisma.aiRequest.create({
    data: {
      userId: record.userId,
      kind: record.kind,
      inputHash: record.inputHash,
      promptVer: record.promptVer,
      status: record.status,
      output: record.output ?? undefined,
      inputTokens: record.inputTokens,
      outputTokens: record.outputTokens,
      latencyMs: record.latencyMs,
    },
  });
}

/**
 * Compte et réserve dans une même transaction courte, sous un verrou consultatif propre à
 * l'utilisateur : deux requêtes simultanées du même compte passent l'une après l'autre, et le
 * quota ne peut pas être dépassé. Renvoie l'id de la ligne « pending », ou null si le quota est atteint.
 */
export function reserveModelCall(
  prisma: PrismaService,
  base: ModelCallBase,
  since: Date,
  quota: number,
): Promise<string | null> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('ai_quota'), hashtext(${base.userId}))`;
    const used = await tx.aiRequest.count({
      where: {
        userId: base.userId,
        createdAt: { gte: since },
        status: { in: MODEL_CALL_STATUSES },
      },
    });
    if (used >= quota) return null;
    const row = await tx.aiRequest.create({
      data: { ...base, status: 'pending' },
      select: { id: true },
    });
    return row.id;
  });
}

export async function finishModelCall(
  prisma: PrismaService,
  id: string,
  result: ModelCallResult,
): Promise<void> {
  await prisma.aiRequest.update({
    where: { id },
    data: {
      status: result.status,
      output: (result.output ?? undefined) as Prisma.InputJsonValue | undefined,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      latencyMs: result.latencyMs,
    },
  });
}

/** Aucun appel n'est parti (IA désactivée) : la réservation ne compte pas. */
export async function releaseModelCall(prisma: PrismaService, id: string): Promise<void> {
  await prisma.aiRequest.deleteMany({ where: { id, status: 'pending' } });
}
