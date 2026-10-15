import { randomBytes, randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { ProblemDetailsFilter } from '../src/infrastructure/http/problem-details.filter';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { applyTestEnv } from './env.fixture';
import { WRITE_HEADERS, signInAs } from './sign-in.helper';
import { ensureTags } from './tags.fixture';

// M1 et M4 de bout en bout : Kwame signale une réponse de spam, l'administratrice la masque.
applyTestEnv({ AUTH_FAKE_PROVIDER: 'true', NODE_ENV: 'test', LOG_LEVEL: 'warn' });

const suffix = randomBytes(4).toString('hex');

describe('signalement et modération (M1, M4)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const cookie = new Map<string, string>();
  const handle = (n: string) => `${n}-mod-${suffix}`;
  let questionId: string;
  let answerId: string;
  let reportId: string;

  const post = (who: string, path: string, body: object = {}, key = randomUUID()) =>
    request(app.getHttpServer())
      .post(path)
      .set(WRITE_HEADERS)
      .set('Cookie', cookie.get(who)!)
      .set('Idempotency-Key', key)
      .send(body);
  const get = (path: string, who?: string) => {
    const r = request(app.getHttpServer()).get(path);
    return who ? r.set('Cookie', cookie.get(who)!) : r;
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
    prisma = app.get(PrismaService);
    await ensureTags(prisma, [{ slug: 'docker', label: 'Docker' }]);
    for (const n of ['awa', 'spammer', 'kwame', 'admin'])
      cookie.set(n, await signInAs(app, handle(n)));
    await prisma.user.update({ where: { handle: handle('admin') }, data: { isAdmin: true } });

    const q = await post('awa', '/api/v1/questions', {
      clientId: randomUUID(),
      title: `Modération ${suffix} : image Docker trop lourde`,
      body: 'Mon image fait 2 Go.',
      tagSlugs: ['docker'],
      lang: 'fr',
    }).expect(201);
    questionId = q.body.id;
    const a = await post('spammer', `/api/v1/questions/${questionId}/answers`, {
      clientId: randomUUID(),
      body: 'Achetez des followers sur mon site !',
    }).expect(201);
    answerId = a.body.id;
    await post('awa', `/api/v1/answers/${answerId}/accept`).expect(200); // XP à annuler ensuite
  });

  afterAll(async () => {
    await app.close();
  });

  it('signaler : 201 ; le même signalement renvoie l’original ; cible inconnue : 422', async () => {
    const key = randomUUID();
    const body = { targetType: 'answer', targetId: answerId, reason: 'Spam publicitaire' };
    const first = await post('kwame', '/api/v1/reports', body, key).expect(201);
    reportId = first.body.id;
    expect(first.body).toMatchObject({ status: 'open', targetType: 'answer' });
    const replay = await post('kwame', '/api/v1/reports', body, key).expect(201);
    expect(replay.headers['idempotent-replayed']).toBe('true');
    const again = await post('kwame', '/api/v1/reports', body).expect(200);
    expect(again.body.id).toBe(reportId);
    await post('awa', '/api/v1/reports', { ...body, reason: 'Hors sujet' }).expect(201);

    const missing = await post('kwame', '/api/v1/reports', {
      ...body,
      targetId: randomUUID(),
    }).expect(422);
    expect(missing.body.code).toBe('report.target_not_found');
    await request(app.getHttpServer())
      .post('/api/v1/reports')
      .set(WRITE_HEADERS)
      .send(body)
      .expect(401);
  });

  it('file de modération : administrateurs seulement, avec l’extrait du contenu', async () => {
    expect((await get('/api/v1/admin/reports', 'kwame').expect(403)).body.code).toBe('forbidden');
    const res = await get('/api/v1/admin/reports?limit=50', 'admin').expect(200);
    const mine = res.body.data.find((r: { id: string }) => r.id === reportId);
    expect(mine).toMatchObject({
      reporter: { handle: handle('kwame') },
      target: {
        excerpt: 'Achetez des followers sur mon site !',
        author: { handle: handle('spammer') },
        hidden: false,
      },
      openReportsOnTarget: 2,
    });
  });

  it('masquer : la réponse disparaît, les deux signalements sont clos, les XP annulés, audit écrit', async () => {
    await post('kwame', `/api/v1/admin/reports/${reportId}/action`, {
      action: 'hide',
      reason: 'Spam',
    }).expect(403);
    const res = await post('admin', `/api/v1/admin/reports/${reportId}/action`, {
      action: 'hide',
      reason: 'Spam publicitaire',
      revertXp: true,
    }).expect(200);
    expect(res.body).toMatchObject({
      report: { status: 'actioned' },
      closedReports: 2,
      revertedXpEvents: expect.any(Number),
    });
    expect(res.body.revertedXpEvents).toBeGreaterThan(0);

    const detail = await get(`/api/v1/questions/${questionId}`).expect(200);
    expect(detail.body.answers.map((a: { id: string }) => a.id)).not.toContain(answerId);
    const spammer = await prisma.user.findUniqueOrThrow({ where: { handle: handle('spammer') } });
    const xp = await prisma.xpEvent.aggregate({
      where: { userId: spammer.id, sourceType: 'answer', sourceId: answerId },
      _sum: { points: true },
    });
    expect(xp._sum.points).toBe(0);
    const audit = await prisma.adminAction.findMany({ where: { targetId: answerId } });
    expect(audit.map((a) => a.action)).toEqual(['hide_content']);

    const twice = await post('admin', `/api/v1/admin/reports/${reportId}/action`, {
      action: 'hide',
      reason: 'Encore',
    }).expect(409);
    expect(twice.body.code).toBe('report.already_handled');
  });

  it('journal d’audit (M4) : administrateurs seulement, filtrable par contenu', async () => {
    await get('/api/v1/admin/audit', 'kwame').expect(403);
    const res = await get(
      `/api/v1/admin/audit?targetType=answer&targetId=${answerId}`,
      'admin',
    ).expect(200);
    expect(res.body.data).toEqual([
      expect.objectContaining({
        action: 'hide_content',
        targetType: 'answer',
        targetId: answerId,
        reason: 'Spam publicitaire',
        admin: expect.objectContaining({ handle: handle('admin') }),
      }),
    ]);
    expect(res.body.page).toEqual({ hasMore: false, nextCursor: null });
  });

  it('rétablir : la réponse revient ; un compte signalé ne se masque pas', async () => {
    await post('admin', `/api/v1/admin/reports/${reportId}/action`, {
      action: 'restore',
      reason: 'Décision revue',
    }).expect(200);
    const detail = await get(`/api/v1/questions/${questionId}`).expect(200);
    expect(detail.body.answers.map((a: { id: string }) => a.id)).toContain(answerId);

    const spammer = await prisma.user.findUniqueOrThrow({ where: { handle: handle('spammer') } });
    const user = await post('kwame', '/api/v1/reports', {
      targetType: 'user',
      targetId: spammer.id,
      reason: 'Compte de spam',
    }).expect(201);
    const no = await post('admin', `/api/v1/admin/reports/${user.body.id}/action`, {
      action: 'hide',
      reason: 'Spam',
    }).expect(422);
    expect(no.body.code).toBe('report.target_not_hideable');
    await post('admin', `/api/v1/admin/reports/${user.body.id}/action`, {
      action: 'dismiss',
      reason: 'Traité hors plateforme',
    }).expect(200);
  });
});
