import { Injectable } from '@nestjs/common';
import type {
  CertAttemptMode,
  CertAttemptResult,
  CertAttemptView,
  CertCheckResponse,
  CertPracticeQuery,
  CertQuestion,
  CertificateView,
  MyCertificationsResponse,
  VerifyCertificateResponse,
} from '@devhub/contracts';
import type { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { BANK, type Bank, type BankQuestion, bankOf } from '../bank';
import {
  certificateCode,
  type Drawn,
  drawExam,
  grade,
  isActive,
  MOCKS_PER_DAY,
  nextAttemptAt,
  shuffle,
  SUBMIT_GRACE_MS,
} from '../domain/exam';

const DAY = 24 * 60 * 60 * 1000;

export class CertError extends Error {
  constructor(
    readonly code:
      | 'cert.not_found'
      | 'cert.retry_later'
      | 'cert.mock_limit'
      | 'cert.already_submitted'
      | 'cert.question_not_found',
    readonly nextAttemptAt: Date | null = null,
  ) {
    super(code);
  }
}

function view(q: BankQuestion, order: number[]): CertQuestion {
  return {
    id: q.id,
    q: q.q,
    code: q.code ?? null,
    choices: order.map((i) => q.choices[i]!),
    topic: q.topic,
  };
}

const certificate = (c: { code: string; bestScore: number; passedAt: Date }) => ({
  code: c.code,
  bestScore: c.bestScore,
  passedAt: c.passedAt.toISOString(),
});

// Certifications DevHub : tirage, chrono et correction côté serveur ; certificats vérifiables.
@Injectable()
export class CertificationsService {
  constructor(private readonly prisma: PrismaService) {}

  private bank(certId: string): Bank {
    const bank = bankOf(certId);
    if (!bank) throw new CertError('cert.not_found');
    return bank;
  }

  /** Démarre une tentative, ou reprend celle en cours (même mode) après un rechargement. */
  async start(userId: string, certId: string, mode: CertAttemptMode): Promise<CertAttemptView> {
    const bank = this.bank(certId);
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`cert:${userId}:${certId}`}))`;
      const now = new Date();
      const last = await tx.certAttempt.findFirst({
        where: { userId, certId, mode },
        orderBy: { startedAt: 'desc' },
      });
      if (last && isActive(last, now)) {
        const drawn = last.questions as unknown as Drawn[];
        return this.attemptView(bank, last.id, mode, last.deadline, drawn, true);
      }
      if (mode === 'exam') {
        const next = nextAttemptAt(last, now);
        if (next) throw new CertError('cert.retry_later', next);
      } else {
        const mocks = await tx.certAttempt.count({
          where: {
            userId,
            certId,
            mode: 'mock',
            startedAt: { gte: new Date(now.getTime() - DAY) },
          },
        });
        if (mocks >= MOCKS_PER_DAY) throw new CertError('cert.mock_limit');
      }
      const drawn = drawExam(bank);
      const deadline = new Date(now.getTime() + bank.minutes * 60_000);
      const created = await tx.certAttempt.create({
        data: {
          userId,
          certId,
          mode,
          questions: drawn as unknown as Prisma.InputJsonValue,
          startedAt: now,
          deadline,
        },
        select: { id: true },
      });
      return this.attemptView(bank, created.id, mode, deadline, drawn, false);
    });
  }

  private attemptView(
    bank: Bank,
    id: string,
    mode: CertAttemptMode,
    deadline: Date,
    drawn: Drawn[],
    resumed: boolean,
  ): CertAttemptView {
    const byId = new Map(bank.questions.map((q) => [q.id, q]));
    return {
      id,
      certId: bank.id,
      mode,
      deadline: deadline.toISOString(),
      resumed,
      questions: drawn.flatMap((d) => {
        const q = byId.get(d.id);
        return q ? [view(q, d.order)] : [];
      }),
    };
  }

  /** Corrige une tentative ; hors délai, les réponses ne comptent pas. Renvoie null si inconnue. */
  async submit(
    userId: string,
    attemptId: string,
    answers: Array<number | null>,
  ): Promise<CertAttemptResult | null> {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM cert_attempts WHERE id = ${attemptId}::uuid AND user_id = ${userId}::uuid FOR UPDATE`;
      if (!rows[0]) return null;
      const attempt = await tx.certAttempt.findUniqueOrThrow({ where: { id: attemptId } });
      if (attempt.submittedAt) throw new CertError('cert.already_submitted');
      const bank = this.bank(attempt.certId);
      const now = new Date();
      const late = now.getTime() > attempt.deadline.getTime() + SUBMIT_GRACE_MS;
      const drawn = attempt.questions as unknown as Drawn[];
      const result = grade(bank, drawn, late ? [] : answers);
      await tx.certAttempt.update({
        where: { id: attemptId },
        data: {
          submittedAt: now,
          answers: result.original as Prisma.InputJsonValue,
          score: result.score,
          passed: result.passed,
        },
      });

      let cert: CertAttemptResult['certificate'] = null;
      if (attempt.mode === 'exam' && result.passed) {
        const existing = await tx.certificate.findUnique({
          where: { userId_certId: { userId, certId: bank.id } },
        });
        const saved = existing
          ? await tx.certificate.update({
              where: { id: existing.id },
              data: { bestScore: Math.max(existing.bestScore, result.score) },
            })
          : await this.issue(tx, userId, bank.id, result.score, now);
        cert = certificate(saved);
      }
      const next =
        attempt.mode === 'exam'
          ? nextAttemptAt(
              {
                startedAt: attempt.startedAt,
                deadline: attempt.deadline,
                submittedAt: now,
                passed: result.passed,
              },
              now,
            )
          : null;
      return {
        attemptId,
        certId: bank.id,
        mode: attempt.mode,
        score: result.score,
        good: result.good,
        total: result.total,
        passed: result.passed,
        late,
        topics: result.topics,
        corrections: result.corrections.map((c) => ({
          ...view(c.question, c.order),
          given: c.given,
          answer: c.answer,
          explain: c.question.explain,
          correct: c.correct,
        })),
        certificate: cert,
        nextAttemptAt: next?.toISOString() ?? null,
      };
    });
  }

  /** Code unique : on retire un nouveau code dans le cas (très improbable) d'une collision. */
  private async issue(
    tx: Prisma.TransactionClient,
    userId: string,
    certId: string,
    score: number,
    now: Date,
  ) {
    for (let i = 0; ; i++) {
      const code = certificateCode(certId);
      if (i < 5 && (await tx.certificate.count({ where: { code } }))) continue;
      return tx.certificate.create({
        data: { userId, certId, bestScore: score, code, passedAt: now },
      });
    }
  }

  async mine(userId: string): Promise<MyCertificationsResponse> {
    const now = new Date();
    const [certs, attempts] = await Promise.all([
      this.prisma.certificate.findMany({ where: { userId } }),
      // Dernière tentative de chaque mode, par certification.
      this.prisma.certAttempt.findMany({
        where: { userId },
        orderBy: { startedAt: 'desc' },
        distinct: ['certId', 'mode'],
      }),
    ]);
    return {
      items: BANK.map((bank) => {
        const c = certs.find((x) => x.certId === bank.id);
        const exam = attempts.find((a) => a.certId === bank.id && a.mode === 'exam') ?? null;
        const mock = attempts.find((a) => a.certId === bank.id && a.mode === 'mock') ?? null;
        const active = [exam, mock].find((a) => a && isActive(a, now)) ?? null;
        const lastDone = exam?.submittedAt
          ? { score: exam.score ?? 0, passed: !!exam.passed, at: exam.submittedAt.toISOString() }
          : null;
        return {
          certId: bank.id,
          certificate: c ? certificate(c) : null,
          lastAttempt: lastDone,
          nextAttemptAt: nextAttemptAt(exam, now)?.toISOString() ?? null,
          active: active ? { mode: active.mode, deadline: active.deadline.toISOString() } : null,
        };
      }),
    };
  }

  /** Entraînement : questions d'un thème, ou une liste précise (révision des erreurs), sans réponse. */
  practice(certId: string, q: CertPracticeQuery): CertQuestion[] {
    const bank = this.bank(certId);
    let pool = bank.questions;
    if (q.ids) {
      const wanted = new Set(q.ids);
      pool = pool.filter((x) => wanted.has(x.id));
    } else if (q.topic !== undefined) {
      pool = pool.filter((x) => x.topic === q.topic);
    }
    return shuffle(pool)
      .slice(0, q.count)
      .map((x) =>
        view(
          x,
          x.choices.map((_, i) => i),
        ),
      );
  }

  check(certId: string, id: string, choice: number): CertCheckResponse {
    const question = this.bank(certId).questions.find((x) => x.id === id);
    if (!question) throw new CertError('cert.question_not_found');
    return {
      correct: choice === question.answer,
      answer: question.answer,
      explain: question.explain,
    };
  }

  async ofUser(handle: string): Promise<CertificateView[] | null> {
    const user = await this.prisma.user.findFirst({
      where: { handle, deletedAt: null },
      select: { certificates: { orderBy: { passedAt: 'desc' } } },
    });
    if (!user) return null;
    return user.certificates
      .filter((c) => bankOf(c.certId))
      .map((c) => ({ certId: c.certId, ...certificate(c) }));
  }

  async verify(code: string): Promise<VerifyCertificateResponse | null> {
    const c = await this.prisma.certificate.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        user: {
          select: {
            handle: true,
            displayName: true,
            avatarUrl: true,
            isDemo: true,
            deletedAt: true,
          },
        },
      },
    });
    if (!c || c.user.deletedAt) return null;
    const { deletedAt: _, ...holder } = c.user;
    return { certId: c.certId, ...certificate(c), holder };
  }
}
