import { randomBytes, randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { AiHintJob } from '../src/modules/ai/jobs/ai-hint.job';
import { applyTestEnv } from './env.fixture';
import { ensureTags } from './tags.fixture';

// S2 de bout en bout, avec le faux modèle (aucune clé d'IA en test) et une vraie base.
applyTestEnv({ AUTH_FAKE_PROVIDER: 'true', NODE_ENV: 'test', LOG_LEVEL: 'warn', LLM_API_KEY: '' });

const suffix = randomBytes(4).toString('hex');

describe('piste IA (S2) de bout en bout', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let job: AiHintJob;
  let authorId: string;
  let tagId: string;

  const ask = async (title: string, body = 'Le conteneur ne joint pas la base.') => {
    const q = await prisma.question.create({
      data: {
        authorId,
        clientId: randomUUID(),
        title,
        body,
        codeSnippet: 'postgres://app:MotDePasse42@db:5432/app',
        lang: 'fr',
        tags: { create: [{ tagId }] },
      },
    });
    return q.id;
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    job = app.get(AiHintJob);
    const ids = await ensureTags(prisma, [
      { slug: 'docker', label: 'Docker', aliases: ['Dockerfile'] },
    ]);
    tagId = ids.get('docker')!;
    const author = await prisma.user.create({
      data: { handle: `e2e-ai-${suffix}`, displayName: 'E2E IA' },
    });
    authorId = author.id;
  });

  afterAll(async () => {
    await prisma.aiRequest.deleteMany({ where: { userId: authorId } });
    await prisma.question.deleteMany({ where: { authorId } });
    await prisma.user.delete({ where: { id: authorId } });
    await app.close();
  });

  it('écrit la piste, passe ai_status à done et journalise l’appel', async () => {
    const id = await ask(`Docker ${suffix} : connexion refusée`);
    await job.handle(id);

    const q = await prisma.question.findUniqueOrThrow({ where: { id } });
    expect(q.aiStatus).toBe('done');
    expect(q.aiHint).toContain('Piste de démonstration');

    const [request] = await prisma.aiRequest.findMany({ where: { userId: authorId } });
    expect(request).toMatchObject({ kind: 'hint', promptVer: 'hint@1', status: 'ok' });
    // Le secret de l'extrait n'est jamais stocké dans le journal de l'IA.
    expect(JSON.stringify(request?.output)).not.toContain('MotDePasse42');
  });

  it('une question identique réutilise le cache', async () => {
    const id = await ask(`Docker ${suffix} : connexion refusée`);
    await job.handle(id);

    expect((await prisma.question.findUniqueOrThrow({ where: { id } })).aiStatus).toBe('done');
    const statuses = (await prisma.aiRequest.findMany({ where: { userId: authorId } })).map(
      (r) => r.status,
    );
    expect(statuses.sort()).toEqual(['cache', 'ok']);
  });

  it('job rejoué : la piste n’est ni recalculée ni réécrite', async () => {
    const id = await ask(`Rejeu ${suffix}`);
    await job.handle(id);
    const before = await prisma.aiRequest.count({ where: { userId: authorId } });
    await job.handle(id);
    expect(await prisma.aiRequest.count({ where: { userId: authorId } })).toBe(before);
  });

  it('quota horaire atteint : ai_status = skipped', async () => {
    const calls = await prisma.aiRequest.count({
      where: { userId: authorId, status: { in: ['ok', 'error', 'timeout', 'refusal'] } },
    });
    await prisma.aiRequest.createMany({
      data: Array.from({ length: 10 - calls }, () => ({
        userId: authorId,
        kind: 'hint',
        inputHash: 'x',
        promptVer: 'hint@1',
        status: 'timeout',
      })),
    });
    const id = await ask(`Quota ${suffix}`);
    await job.handle(id);

    const q = await prisma.question.findUniqueOrThrow({ where: { id } });
    expect(q.aiStatus).toBe('skipped');
    expect(q.aiHint).toBeNull();
  });
});
