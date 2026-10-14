import { randomBytes, randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
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

// Y8 de bout en bout : un vrai flux SSE, ouvert sur un port, reçoit l'événement au COMMIT.
applyTestEnv({ AUTH_FAKE_PROVIDER: 'true', NODE_ENV: 'test', LOG_LEVEL: 'warn' });

const suffix = randomBytes(4).toString('hex');

interface Stream {
  /** Attend un morceau du flux qui contient `needle`. */
  waitFor(needle: string, timeoutMs?: number): Promise<string>;
  close(): void;
}

async function openStream(url: string, headers: Record<string, string> = {}): Promise<Stream> {
  const controller = new AbortController();
  const res = await fetch(url, { headers, signal: controller.signal });
  expect(res.status).toBe(200);
  expect(res.headers.get('content-type')).toContain('text/event-stream');
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  return {
    async waitFor(needle, timeoutMs = 5_000) {
      const deadline = Date.now() + timeoutMs;
      while (!buffer.includes(needle)) {
        const remaining = deadline - Date.now();
        if (remaining <= 0) throw new Error(`« ${needle} » non reçu ; flux : ${buffer}`);
        const chunk = await Promise.race([
          reader.read(),
          new Promise<{ done: true; value: undefined }>((r) =>
            setTimeout(() => r({ done: true, value: undefined }), remaining),
          ),
        ]);
        if (chunk.value) buffer += decoder.decode(chunk.value, { stream: true });
        if (chunk.done && !buffer.includes(needle)) throw new Error(`flux terminé : ${buffer}`);
      }
      return buffer;
    },
    close: () => controller.abort(),
  };
}

describe('temps réel (Y8)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let base: string;
  let awa: string;
  let moussa: string;
  let questionId: string;

  const post = (cookie: string, path: string, body: object) =>
    request(app.getHttpServer())
      .post(path)
      .set(WRITE_HEADERS)
      .set('Cookie', cookie)
      .set('Idempotency-Key', randomUUID())
      .send(body);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.listen(0);
    base = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
    prisma = app.get(PrismaService);
    await ensureTags(prisma, [{ slug: 'docker', label: 'Docker' }]);
    awa = await signInAs(app, `awa-sse-${suffix}`);
    moussa = await signInAs(app, `moussa-sse-${suffix}`);
    const q = await post(awa, '/api/v1/questions', {
      clientId: randomUUID(),
      title: `SSE ${suffix} : le conteneur ne démarre pas`,
      body: 'Erreur au démarrage.',
      tagSlugs: ['docker'],
      lang: 'fr',
    }).expect(201);
    questionId = q.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('sans session ni sujet : 401 ; sujet invalide : 400', async () => {
    await request(app.getHttpServer()).get('/api/v1/events').expect(401);
    await request(app.getHttpServer()).get('/api/v1/events?topics=tag:docker').expect(400);
  });

  it('Awa reçoit en direct la réponse de Moussa, et la page publique aussi', async () => {
    const personal = await openStream(`${base}/api/v1/events`, { Cookie: awa });
    const page = await openStream(`${base}/api/v1/events?topics=question:${questionId}`);
    await personal.waitFor('retry: 3000');
    await page.waitFor('retry: 3000');

    await post(moussa, `/api/v1/questions/${questionId}/answers`, {
      clientId: randomUUID(),
      body: 'Vérifie le point d’entrée de l’image.',
    }).expect(201);

    const received = await personal.waitFor('"type":"answer.created"');
    expect(received).toMatch(/id: \d+\nevent: notification\.created\n/);
    expect(await page.waitFor('event: answer.created')).toContain(questionId);
    personal.close();
    page.close();
  });

  it('reprise avec Last-Event-ID : les événements manqués sont rejoués', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { handle: `awa-sse-${suffix}` } });
    const last = await prisma.notification.findFirstOrThrow({
      where: { userId: user.id },
      orderBy: { seq: 'desc' },
    });
    const resumed = await openStream(`${base}/api/v1/events`, {
      Cookie: awa,
      'Last-Event-ID': (last.seq - 1n).toString(),
    });
    expect(await resumed.waitFor(`id: ${last.seq}\n`)).toContain('notification.created');
    resumed.close();
  });
});
