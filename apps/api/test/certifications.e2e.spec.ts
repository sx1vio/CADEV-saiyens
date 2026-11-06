import { randomBytes } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { ProblemDetailsFilter } from '../src/infrastructure/http/problem-details.filter';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { bankOf } from '../src/modules/certifications/bank';
import { applyTestEnv } from './env.fixture';
import { WRITE_HEADERS, signInAs } from './sign-in.helper';

// Certifications DevHub de bout en bout : le serveur tire, chronomètre, corrige et délivre le code.
applyTestEnv({ AUTH_FAKE_PROVIDER: 'true', NODE_ENV: 'test', LOG_LEVEL: 'warn' });

const suffix = randomBytes(4).toString('hex');
const CERT = 'git-fondamentaux';
const bank = bankOf(CERT)!;
type Question = { id: string; choices: string[] };
/** Bonne réponse dans l'ordre affiché, retrouvée à partir de la banque du serveur. */
const right = (q: Question) => {
  const b = bank.questions.find((x) => x.id === q.id)!;
  return q.choices.indexOf(b.choices[b.answer]!);
};

describe('certifications DevHub', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const cookie = { ama: '', yao: '' };
  const handle = (n: keyof typeof cookie) => `${n}-cert-${suffix}`;

  const send = (
    method: 'get' | 'post',
    who: keyof typeof cookie | null,
    path: string,
    body?: object,
  ) => {
    const r = request(app.getHttpServer())[method](path);
    if (who) r.set('Cookie', cookie[who]);
    return method === 'get' ? r : r.set(WRITE_HEADERS).send(body ?? {});
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
    prisma = app.get(PrismaService);
    for (const n of ['ama', 'yao'] as const) cookie[n] = await signInAs(app, handle(n));
  });

  afterAll(async () => {
    await app.close();
  });

  it('entraînement public : questions sans réponse, correction à la demande', async () => {
    const res = await send(
      'get',
      null,
      `/api/v1/certifications/${CERT}/practice?topic=1&count=3`,
    ).expect(200);
    expect(res.body.questions).toHaveLength(3);
    for (const q of res.body.questions) {
      expect(q.topic).toBe(1);
      expect(q).not.toHaveProperty('answer');
      expect(q).not.toHaveProperty('explain');
    }
    const q = res.body.questions[0];
    const b = bank.questions.find((x) => x.id === q.id)!;
    const ok = await send('post', null, `/api/v1/certifications/${CERT}/check`, {
      id: q.id,
      choice: b.answer,
    }).expect(200);
    expect(ok.body).toMatchObject({ correct: true, answer: b.answer });
    const ids = bank.questions
      .slice(0, 2)
      .map((x) => x.id)
      .join(',');
    const review = await send(
      'get',
      null,
      `/api/v1/certifications/${CERT}/practice?ids=${ids}`,
    ).expect(200);
    expect(review.body.questions.map((x: Question) => x.id).sort()).toEqual(ids.split(',').sort());
    await send('get', null, '/api/v1/certifications/inconnue/practice').expect(404);
  });

  it('examen : un échec impose d’attendre une heure', async () => {
    await send('post', null, `/api/v1/certifications/${CERT}/attempts`, {}).expect(401);
    const start = await send('post', 'yao', `/api/v1/certifications/${CERT}/attempts`, {
      mode: 'exam',
    }).expect(201);
    expect(start.body.questions).toHaveLength(bank.draw);
    expect(JSON.stringify(start.body)).not.toContain('"answer"');
    // Un rechargement reprend la même tentative au lieu d'en tirer une nouvelle.
    const again = await send('post', 'yao', `/api/v1/certifications/${CERT}/attempts`, {
      mode: 'exam',
    }).expect(201);
    expect(again.body).toMatchObject({ id: start.body.id, resumed: true });

    const answers = start.body.questions.map(() => null);
    const res = await send(
      'post',
      'yao',
      `/api/v1/certifications/attempts/${start.body.id}/submit`,
      { answers },
    ).expect(200);
    expect(res.body).toMatchObject({ score: 0, passed: false, certificate: null });
    expect(res.body.corrections[0]).toHaveProperty('explain');
    expect(res.body.nextAttemptAt).not.toBeNull();
    await send('post', 'yao', `/api/v1/certifications/attempts/${start.body.id}/submit`, {
      answers,
    }).expect(409);
    const blocked = await send('post', 'yao', `/api/v1/certifications/${CERT}/attempts`, {
      mode: 'exam',
    }).expect(429);
    expect(blocked.body.code).toBe('cert.retry_later');
    // L'examen blanc reste possible pendant l'attente, sans certificat.
    const mock = await send('post', 'yao', `/api/v1/certifications/${CERT}/attempts`, {
      mode: 'mock',
    }).expect(201);
    const mockRes = await send(
      'post',
      'yao',
      `/api/v1/certifications/attempts/${mock.body.id}/submit`,
      {
        answers: mock.body.questions.map(right),
      },
    ).expect(200);
    expect(mockRes.body).toMatchObject({
      mode: 'mock',
      score: 100,
      passed: true,
      certificate: null,
    });
    expect(await prisma.certificate.count({ where: { user: { handle: handle('yao') } } })).toBe(0);
  });

  it('examen réussi : certificat avec un code vérifiable, visible sur le profil public', async () => {
    const start = await send('post', 'ama', `/api/v1/certifications/${CERT}/attempts`, {
      mode: 'exam',
    }).expect(201);
    const answers = start.body.questions.map(right);
    answers[0] = (answers[0] + 1) % start.body.questions[0].choices.length; // une erreur
    const res = await send(
      'post',
      'ama',
      `/api/v1/certifications/attempts/${start.body.id}/submit`,
      { answers },
    ).expect(200);
    expect(res.body).toMatchObject({ passed: true, score: 95, nextAttemptAt: null });
    expect(res.body.corrections[0]).toMatchObject({ correct: false });
    const code = res.body.certificate.code;
    expect(code).toMatch(/^DH-GIT-/);

    const verify = await send('get', null, `/api/v1/certifications/verify/${code}`).expect(200);
    expect(verify.body).toMatchObject({
      certId: CERT,
      bestScore: 95,
      holder: { handle: handle('ama') },
    });
    await send('get', null, '/api/v1/certifications/verify/DH-GIT-AAAA-AAAA').expect(404);
    const profile = await send('get', null, `/api/v1/u/${handle('ama')}/certificates`).expect(200);
    expect(profile.body.items).toEqual([expect.objectContaining({ certId: CERT, code })]);

    const mine = await send('get', 'ama', '/api/v1/certifications/me').expect(200);
    const item = mine.body.items.find((i: { certId: string }) => i.certId === CERT);
    expect(item).toMatchObject({
      certificate: { code },
      lastAttempt: { score: 95, passed: true },
      nextAttemptAt: null,
      active: null,
    });
  });

  it('refuse les réponses envoyées après la fin du chrono', async () => {
    const start = await send('post', 'ama', `/api/v1/certifications/${CERT}/attempts`, {
      mode: 'mock',
    }).expect(201);
    await prisma.certAttempt.update({
      where: { id: start.body.id },
      data: { deadline: new Date(Date.now() - 5 * 60_000) },
    });
    const res = await send(
      'post',
      'ama',
      `/api/v1/certifications/attempts/${start.body.id}/submit`,
      {
        answers: start.body.questions.map(right),
      },
    ).expect(200);
    expect(res.body).toMatchObject({ late: true, score: 0 });
    await send('post', 'yao', `/api/v1/certifications/attempts/${start.body.id}/submit`, {
      answers: [],
    }).expect(404);
  });
});
