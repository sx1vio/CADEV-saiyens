import type { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { AiRequestRecord } from '../domain/ports';

/** Statuts de ai_requests qui correspondent à un appel réel au modèle (comptés dans le quota). */
const MODEL_CALL_STATUSES = ['ok', 'error', 'timeout', 'refusal'];

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
