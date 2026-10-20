import { randomBytes, randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { ProblemDetailsFilter } from '../src/infrastructure/http/problem-details.filter';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { applyTestEnv } from './env.fixture';
import { signInAs } from './sign-in.helper';

// S6 : une question résolue devient une fiche cherchable. Recherche dans la réponse acceptée,
// tri par pertinence, pagination stable, résultats en moins d'une seconde.
applyTestEnv({ AUTH_FAKE_PROVIDER: 'true', NODE_ENV: 'test', LOG_LEVEL: 'warn' });

const suffix = randomBytes(4).toString('hex');
const author = `e2e-kb-${suffix}`;
const helper = `e2e-kb-helper-${suffix}`;
/** Mots introuvables ailleurs en base : chaque essai ne voit que ses propres questions. */
const word = (w: string) => `${w}${suffix}`;

describe('base de connaissance cherchable (S6)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authorId: string;
  let helperId: string;

  const search = (query: Record<string, string | number>) =>
    request(app.getHttpServer()).get('/api/v1/questions').query(query).expect(200);

  const question = (title: string, body: string, createdAt = new Date()) =>
    prisma.question.create({
      data: { authorId, clientId: randomUUID(), title, body, lang: 'fr', createdAt },
    });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
    prisma = app.get(PrismaService);
    await signInAs(app, author);
    await signInAs(app, helper);
    authorId = (await prisma.user.findUniqueOrThrow({ where: { handle: author } })).id;
    helperId = (await prisma.user.findUniqueOrThrow({ where: { handle: helper } })).id;
  });

  afterAll(async () => {
    await prisma.question.deleteMany({ where: { authorId: { in: [authorId, helperId] } } });
    await app.close();
  });

  it('retrouve une question résolue par les mots de sa solution, pas par une réponse refusée', async () => {
    const solved = await question('La base ne démarre pas', 'Le conteneur redémarre en boucle.');
    const accepted = await prisma.answer.create({
      data: {
        questionId: solved.id,
        authorId: helperId,
        clientId: randomUUID(),
        body: `Supprime le volume ${word('pgdata')} puis relance.`,
        isAccepted: true,
      },
    });
    await prisma.question.update({
      where: { id: solved.id },
      data: { status: 'resolved', acceptedAnswerId: accepted.id, resolvedAt: new Date() },
    });
    const open = await question('Le build échoue', 'Erreur de compilation.');
    await prisma.answer.create({
      data: {
        questionId: open.id,
        authorId: helperId,
        clientId: randomUUID(),
        body: `Essaie ${word('rebuild')}.`,
      },
    });

    const bySolution = await search({ q: word('pgdata') });
    expect(bySolution.body.data.map((q: { id: string }) => q.id)).toEqual([solved.id]);
    expect(bySolution.body.data[0]).toMatchObject({ status: 'resolved' });

    // Une réponse non acceptée n'est pas une solution : elle ne rend pas la question trouvable.
    expect((await search({ q: word('rebuild') })).body.data).toEqual([]);

    // Une solution masquée par la modération ne l'est plus non plus.
    await prisma.answer.update({ where: { id: accepted.id }, data: { hiddenAt: new Date() } });
    expect((await search({ q: word('pgdata') })).body.data).toEqual([]);
  });

  it('trie par pertinence et pagine sans doublon ni oubli', async () => {
    const term = word('nginx');
    const old = new Date(Date.now() - 3_600_000);
    // Le terme dans le titre (poids A) l'emporte sur le terme dans le corps (poids B),
    // même quand la question est plus ancienne : un tri par date donnerait l'ordre inverse.
    const inTitle = await question(`${term} renvoie 502`, 'Derrière Docker.', old);
    const inBody = await question('Erreur 502 en production', `Le proxy ${term} répond mal.`);
    const both = await question(`${term} et ${term}`, `Encore ${term} : ${term} partout.`, old);

    const all = await search({ q: term, limit: 50 });
    expect(all.body.data.map((q: { id: string }) => q.id)).toEqual([
      both.id,
      inTitle.id,
      inBody.id,
    ]);

    const seen: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await search({ q: term, limit: 1, ...(cursor ? { cursor } : {}) });
      seen.push(...page.body.data.map((q: { id: string }) => q.id));
      cursor = page.body.page.nextCursor ?? undefined;
    } while (cursor && seen.length < 10);
    expect(seen).toEqual([both.id, inTitle.id, inBody.id]);
  });

  it('répond en moins d’une seconde sur 5 000 questions', async () => {
    const common = word('docker');
    const rare = word('kubelet');
    await prisma.$executeRaw`
      INSERT INTO questions (author_id, client_id, title, body, lang, updated_at)
      SELECT ${authorId}::uuid, gen_random_uuid(),
        'Question ' || n || ' sur ' || ${common},
        'Corps ' || n || CASE WHEN n % 500 = 0 THEN ' ' || ${rare} ELSE '' END,
        'fr', now()
      FROM generate_series(1, 5000) AS n`;

    for (const q of [rare, common]) {
      await search({ q }); // préchauffage (plan de requête, connexions)
      const started = performance.now();
      const res = await search({ q, limit: 20 });
      const elapsed = performance.now() - started;
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(elapsed, `recherche « ${q} » en ${Math.round(elapsed)} ms`).toBeLessThan(1_000);
    }
  });
});
