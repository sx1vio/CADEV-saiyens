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

// S10 de bout en bout avec le faux modèle (aucune clé d'IA) : Awa pose en français, Kwame lit
// la question et la réponse en anglais. La traduction est marquée « démo » et mise en cache.
applyTestEnv({ AUTH_FAKE_PROVIDER: 'true', NODE_ENV: 'test', LOG_LEVEL: 'warn', LLM_API_KEY: '' });

const suffix = randomBytes(4).toString('hex');
const handles = { awa: `awa-tr-${suffix}`, kwame: `kwame-tr-${suffix}` };

describe('pont bilingue (S10)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const cookies: Record<keyof typeof handles, string> = { awa: '', kwame: '' };
  let questionId: string;
  let answerId: string;

  const write = (who: keyof typeof handles | null, path: string, body: object = {}) => {
    const req = request(app.getHttpServer())
      .post(path)
      .set(WRITE_HEADERS)
      .set('Idempotency-Key', randomUUID());
    return (who ? req.set('Cookie', cookies[who]) : req).send(body);
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
    prisma = app.get(PrismaService);
    await ensureTags(prisma, [{ slug: 'docker', label: 'Docker' }]);
    for (const who of Object.keys(handles) as Array<keyof typeof handles>) {
      cookies[who] = await signInAs(app, handles[who]);
    }
    const q = await write('awa', '/api/v1/questions', {
      clientId: randomUUID(),
      title: `Docker ${suffix} : le conteneur ne joint pas Postgres`,
      body: 'Connexion refusée depuis le conteneur.\n\n```yaml\nhost: localhost\n```',
      tagSlugs: ['docker'],
      lang: 'fr',
    }).expect(201);
    questionId = q.body.id;
    const a = await write('kwame', `/api/v1/questions/${questionId}/answers`, {
      clientId: randomUUID(),
      body: 'Remplace localhost par le nom du service : `db`.',
    }).expect(201);
    answerId = a.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('traduit la question en anglais, code intact, mention démo ; la 2e lecture vient du cache', async () => {
    const first = await write('kwame', `/api/v1/questions/${questionId}/translate?lang=en`).expect(
      200,
    );
    expect(first.body).toMatchObject({
      contentType: 'question',
      contentId: questionId,
      lang: 'en',
      cached: false,
      demo: true,
    });
    expect(first.body.title).toContain(suffix);
    expect(first.body.body).toMatch(/^_Demo translation/);
    expect(first.body.body).toContain('```yaml\nhost: localhost\n```');

    const second = await write('kwame', `/api/v1/questions/${questionId}/translate?lang=en`).expect(
      200,
    );
    expect(second.body).toMatchObject({ cached: true, body: first.body.body });
    const stored = await prisma.translation.count({
      where: { contentType: 'question', contentId: questionId },
    });
    expect(stored).toBe(1);

    // L'original reste intact et toujours accessible.
    const original = await request(app.getHttpServer())
      .get(`/api/v1/questions/${questionId}`)
      .expect(200);
    expect(original.body.body).toBe(
      'Connexion refusée depuis le conteneur.\n\n```yaml\nhost: localhost\n```',
    );
  });

  it('traduit une réponse (sans titre)', async () => {
    const res = await write('awa', `/api/v1/answers/${answerId}/translate?lang=en`).expect(200);
    expect(res.body).toMatchObject({ contentType: 'answer', title: null, demo: true });
    expect(res.body.body).toContain('Remplace localhost par le nom du service');
  });

  it('erreurs : même langue (422), langue inconnue (400), introuvable (404), sans session (401)', async () => {
    const same = await write('kwame', `/api/v1/questions/${questionId}/translate?lang=fr`).expect(
      422,
    );
    expect(same.body.code).toBe('translation.same_language');
    await write('kwame', `/api/v1/questions/${questionId}/translate?lang=de`).expect(400);
    const missing = await write(
      'kwame',
      `/api/v1/answers/${randomUUID()}/translate?lang=en`,
    ).expect(404);
    expect(missing.body.code).toBe('not_found');
    await write(null, `/api/v1/questions/${questionId}/translate?lang=en`).expect(401);
  });
});
