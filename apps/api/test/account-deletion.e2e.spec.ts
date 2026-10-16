import { randomBytes, randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { ProblemDetailsFilter } from '../src/infrastructure/http/problem-details.filter';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { deletedHandle } from '../src/modules/identity/infrastructure/account-deletion';
import { applyTestEnv } from './env.fixture';
import { WRITE_HEADERS, signInAs } from './sign-in.helper';
import { ensureTags } from './tags.fixture';

// A3 de bout en bout : Moussa supprime son compte ; la question d'Awa garde sa réponse.
applyTestEnv({ AUTH_FAKE_PROVIDER: 'true', NODE_ENV: 'test', LOG_LEVEL: 'warn' });

const suffix = randomBytes(4).toString('hex');

describe('suppression du compte (A3)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const cookie = new Map<string, string>();
  const handle = (n: string) => `${n}-del-${suffix}`;
  let questionId: string;
  let ownQuestionId: string;

  const post = (who: string, path: string, body: object) =>
    request(app.getHttpServer())
      .post(path)
      .set(WRITE_HEADERS)
      .set('Cookie', cookie.get(who)!)
      .set('Idempotency-Key', randomUUID())
      .send(body);
  const del = (who: string, body: object) =>
    request(app.getHttpServer())
      .delete('/api/v1/me')
      .set(WRITE_HEADERS)
      .set('Cookie', cookie.get(who)!)
      .send(body);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
    prisma = app.get(PrismaService);
    await ensureTags(prisma, [{ slug: 'docker', label: 'Docker' }]);
    for (const n of ['awa', 'moussa']) cookie.set(n, await signInAs(app, handle(n)));
    const q = await post('awa', '/api/v1/questions', {
      clientId: randomUUID(),
      title: `Suppression ${suffix} : volume Docker en lecture seule`,
      body: 'Le conteneur ne peut pas écrire dans /data.',
      tagSlugs: ['docker'],
      lang: 'fr',
    }).expect(201);
    questionId = q.body.id;
    await post('moussa', `/api/v1/questions/${questionId}/answers`, {
      clientId: randomUUID(),
      body: 'Vérifie le propriétaire du dossier monté.',
    }).expect(201);
    const own = await post('moussa', '/api/v1/questions', {
      clientId: randomUUID(),
      title: `Suppression ${suffix} : question de Moussa`,
      body: 'Elle doit rester lisible après la suppression.',
      tagSlugs: ['docker'],
      lang: 'fr',
    }).expect(201);
    ownQuestionId = own.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('handle de remplacement au bon format', () => {
    expect(deletedHandle(new Uint8Array(6).fill(255))).toMatch(/^deleted-[a-z0-9]{8}$/);
  });

  it('confirmation obligatoire : un autre handle est refusé, rien ne change', async () => {
    const res = await del('moussa', { confirmHandle: 'quelquun-d-autre' }).expect(422);
    expect(res.body.code).toBe('account.confirmation_mismatch');
    await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Cookie', cookie.get('moussa')!)
      .expect(200);
    // Sans session : 401 ; sans en-têtes d'écriture : refus CSRF avant tout (403).
    await request(app.getHttpServer())
      .delete('/api/v1/me')
      .set(WRITE_HEADERS)
      .send({ confirmHandle: 'x' })
      .expect(401);
    await request(app.getHttpServer())
      .delete('/api/v1/me')
      .set('Cookie', cookie.get('moussa')!)
      .send({ confirmHandle: handle('moussa') })
      .expect(403);
  });

  it('anonymise, déconnecte partout, garde les fils des autres ; le Passport répond 404', async () => {
    const before = await prisma.user.findUniqueOrThrow({ where: { handle: handle('moussa') } });
    const res = await del('moussa', { confirmHandle: handle('moussa').toUpperCase() }).expect(204);
    expect(String(res.headers['set-cookie'])).toContain('__Host-sid=;');

    await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Cookie', cookie.get('moussa')!)
      .expect(401);
    await request(app.getHttpServer())
      .get(`/api/v1/u/${handle('moussa')}`)
      .expect(404);

    const after = await prisma.user.findUniqueOrThrow({ where: { id: before.id } });
    expect(after).toMatchObject({
      displayName: 'Compte supprimé',
      githubId: null,
      email: null,
      avatarUrl: null,
      bio: null,
      deletedAt: expect.any(Date),
      privacy: { unlisted: true },
    });
    expect(after.handle).toMatch(/^deleted-[a-z0-9]{8}$/);
    expect(await prisma.session.count({ where: { userId: before.id } })).toBe(0);
    expect(await prisma.oAuthAccount.count({ where: { userId: before.id } })).toBe(0);

    // La question d'Awa garde la réponse, attribuée au compte anonymisé.
    const q = await request(app.getHttpServer()).get(`/api/v1/questions/${questionId}`).expect(200);
    expect(q.body.answers).toEqual([
      expect.objectContaining({
        author: expect.objectContaining({ displayName: 'Compte supprimé' }),
      }),
    ]);
    // La question de Moussa reste lisible (les réponses des autres en dépendent).
    const own = await request(app.getHttpServer())
      .get(`/api/v1/questions/${ownQuestionId}`)
      .expect(200);
    expect(own.body.author.displayName).toBe('Compte supprimé');
  });
});
