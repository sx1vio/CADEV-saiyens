import { randomBytes, randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { ProblemDetailsFilter } from '../src/infrastructure/http/problem-details.filter';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { applyTestEnv } from './env.fixture';
import { ensureTags } from './tags.fixture';
import { WRITE_HEADERS, signInAs } from './sign-in.helper';

// S14 de bout en bout : lien de reproduction validé (liste blanche), stocké, relu, aussi via /sync.
applyTestEnv({ AUTH_FAKE_PROVIDER: 'true', NODE_ENV: 'test', LOG_LEVEL: 'warn' });

const suffix = randomBytes(4).toString('hex');
const login = `e2e-repro-${suffix}`;
// Faux jeton construit à l'exécution : un littéral serait signalé par gitleaks en CI.
const fakeToken = 'ghp_' + 'a'.repeat(36);

describe('lien de reproduction (S14)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookie: string;

  const question = (reproUrl: unknown) => ({
    clientId: randomUUID(),
    title: `Vite ${suffix} ne recharge plus le module`,
    body: 'Le rechargement à chaud ne marche plus depuis la mise à jour.',
    tagSlugs: ['docker'],
    lang: 'fr',
    reproUrl,
  });
  const post = (body: object) =>
    request(app.getHttpServer())
      .post('/api/v1/questions')
      .set(WRITE_HEADERS)
      .set('Cookie', cookie)
      .set('Idempotency-Key', randomUUID())
      .send(body);
  const detail = async (id: string) =>
    (await request(app.getHttpServer()).get(`/api/v1/questions/${id}`).expect(200)).body;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
    prisma = app.get(PrismaService);
    await ensureTags(prisma, [{ slug: 'docker', label: 'Docker' }]);
    cookie = await signInAs(app, login);
  });

  afterAll(async () => {
    const user = await prisma.user.findUnique({ where: { handle: login } });
    if (user) {
      await prisma.idempotencyKey.deleteMany({ where: { userId: user.id } });
      await prisma.question.deleteMany({ where: { authorId: user.id } });
    }
    await app.close();
  });

  it('un lien accepté est stocké et rendu sur la fiche', async () => {
    const url = 'https://stackblitz.com/edit/vite-hmr-bug?file=main.ts';
    const created = await post(question(url)).expect(201);
    expect((await detail(created.body.id)).reproUrl).toBe(url);
  });

  it('sans lien, ou avec un lien vide : null', async () => {
    const none = await post(question(undefined)).expect(201);
    expect((await detail(none.body.id)).reproUrl).toBeNull();
    const empty = await post(question('  ')).expect(201);
    expect((await detail(empty.body.id)).reproUrl).toBeNull();
  });

  it('refuse un domaine hors liste, le HTTP simple et les identifiants dans l’hôte', async () => {
    for (const url of [
      'https://evil.example.com/repro',
      'https://abc.csb.app/',
      'https://x.stackblitz.io/',
      'https://evil.codesandbox.io/',
      'https://user.github.io/',
      'http://codesandbox.io/s/abc',
      'https://github.com@evil.example.com/x',
      'https://notgithub.com/x',
      'javascript:alert(1)',
    ]) {
      const res = await post(question(url)).expect(400);
      expect(res.body.code).toBe('validation.failed');
    }
  });

  it('un secret dans la requête du lien est retiré et compté', async () => {
    const res = await post(
      question(`https://gist.github.com/awa/abc123?token=${fakeToken}`),
    ).expect(201);
    expect(res.body.secretsMasked).toBe(1);
    expect((await detail(res.body.id)).reproUrl).toBe('https://gist.github.com/awa/abc123');
  });

  it('hors ligne : le lien passe aussi par /sync', async () => {
    const url = 'https://codesandbox.io/s/react-bug-x1';
    const res = await request(app.getHttpServer())
      .post('/api/v1/sync')
      .set(WRITE_HEADERS)
      .set('Cookie', cookie)
      .send({ actions: [{ opId: randomUUID(), type: 'question.create', payload: question(url) }] })
      .expect(200);
    expect(res.body.results[0]).toMatchObject({ status: 'applied', httpStatus: 201 });
    const stored = await prisma.question.findFirst({
      where: { author: { handle: login }, reproUrl: url },
    });
    expect(stored).not.toBeNull();
  });
});
