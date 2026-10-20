import type { Tx } from '../../../infrastructure/idempotency/idempotency.service';
import type { PairSessionRecord, PairStore } from '../application/pair-sessions';
import type { PairStatus } from '../domain/pair';

const person = {
  select: { id: true, handle: true, displayName: true, avatarUrl: true, isDemo: true },
};
const withPeople = { host: person, guest: person } as const;

/** Écritures de S5 dans la transaction de la requête (idempotence comprise). */
export class PrismaPairStore implements PairStore {
  constructor(private readonly tx: Tx) {}

  async findQuestion(questionId: string) {
    // Une question retirée par la modération n'accepte plus de proposition.
    return this.tx.question.findFirst({
      where: { id: questionId, hiddenAt: null },
      select: { id: true, authorId: true, title: true, status: true },
    });
  }

  async hasPendingProposal(questionId: string, hostId: string): Promise<boolean> {
    const n = await this.tx.pairSession.count({
      where: { questionId, hostId, status: 'proposed' },
    });
    return n > 0;
  }

  create(input: {
    questionId: string;
    hostId: string;
    guestId: string;
    startsAt: Date;
    videoLink: string;
  }): Promise<PairSessionRecord> {
    return this.tx.pairSession.create({ data: input, include: withPeople });
  }

  async findForUpdate(pairId: string): Promise<PairSessionRecord | null> {
    await this.tx.$queryRaw`SELECT id FROM pair_sessions WHERE id = ${pairId}::uuid FOR UPDATE`;
    return this.tx.pairSession.findUnique({ where: { id: pairId }, include: withPeople });
  }

  setStatus(pairId: string, status: PairStatus): Promise<PairSessionRecord> {
    return this.tx.pairSession.update({
      where: { id: pairId },
      data: { status },
      include: withPeople,
    });
  }

  async findQuestionTitle(questionId: string): Promise<string> {
    const q = await this.tx.question.findUnique({
      where: { id: questionId },
      select: { title: true },
    });
    return q?.title ?? '';
  }
}
