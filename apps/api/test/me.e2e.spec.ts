import { randomBytes } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { ProblemDetailsFilter } from '../src/infrastructure/http/problem-details.filter';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { applyTestEnv } from './env.fixture';
import { WRITE_HEADERS, signInAs } from './sign-in.helper';

applyTestEnv({ AUTH_FAKE_PROVIDER: 'true', NODE_ENV: 'test', LOG_LEVEL: 'warn' });

const login = `e2e-me-${randomBytes(4).toString('hex')}`;

describe('/me : signaux de confiance (PR11) et code de conduite (M3)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookie: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
    prisma = app.get(PrismaService);
    cookie = await signInAs(app, login);
    // Le badge « Membre fondateur » dépend de la date d'inscription : on la fixe avant l'échéance
    // pour que le test ne change pas de résultat après le 22 octobre.
    await prisma.user.update({
      where: { handle: login },
      data: { createdAt: new Date('2026-10-10T00:00:00Z') },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { handle: { startsWith: login } } });
    await app.close();
  });

  it('expose les signaux de confiance', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Cookie', cookie)
      .expect(200);
    expect(res.body.trust).toMatchObject({
      githubLinked: true,
      emailVerified: true,
      demo: false,
      founder: true,
    });
    expect(res.body.trust.githubAccountYears).toBeGreaterThanOrEqual(6); // faux compte créé en 2020
  });

  it('n’a pas encore accepté le code de conduite après l’inscription', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Cookie', cookie)
      .expect(200);
    expect(res.body.codeOfConductAcceptedAt).toBeNull();
  });

  it('enregistre l’acceptation une seule fois', async () => {
    const first = await request(app.getHttpServer())
      .post('/api/v1/me/code-of-conduct')
      .set('Cookie', cookie)
      .set(WRITE_HEADERS)
      .expect(200);
    const second = await request(app.getHttpServer())
      .post('/api/v1/me/code-of-conduct')
      .set('Cookie', cookie)
      .set(WRITE_HEADERS)
      .expect(200);
    expect(first.body.codeOfConductAcceptedAt).toBeTruthy();
    expect(second.body.codeOfConductAcceptedAt).toBe(first.body.codeOfConductAcceptedAt);

    const me = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Cookie', cookie)
      .expect(200);
    expect(me.body.codeOfConductAcceptedAt).toBe(first.body.codeOfConductAcceptedAt);
  });

  it('refuse l’acceptation sans session', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/me/code-of-conduct')
      .set(WRITE_HEADERS)
      .expect(401);
  });
});
