import { randomBytes, randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { ProblemDetailsFilter } from '../src/infrastructure/http/problem-details.filter';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { MatchingJobs } from '../src/modules/matching/jobs/matching.jobs';
import { applyTestEnv } from './env.fixture';
import { WRITE_HEADERS, signInAs } from './sign-in.helper';
import { ensureTags } from './tags.fixture';

// S3, S11 et X4 de bout en bout : la question d'Awa sollicite 3 devs adaptés, avec leurs raisons.
applyTestEnv({ AUTH_FAKE_PROVIDER: 'true', NODE_ENV: 'test', LOG_LEVEL: 'warn' });

const suffix = randomBytes(4).toString('hex');
// Une étiquette propre à ce fichier : les autres tests ne créent pas de candidats concurrents.
const slug = `matching-${suffix}`;

describe('matching (S3) de bout en bout', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jobs: MatchingJobs;
  const cookies = new Map<string, string>();
  let questionId: string;

  const login = (name: string) => `${name}-${suffix}`;
  const write = (who: string, path: string, body: object = {}) =>
    request(app.getHttpServer())
      .post(path)
      .set(WRITE_HEADERS)
      .set('Cookie', cookies.get(who)!)
      .set('Idempotency-Key', randomUUID())
      .send(body);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
    prisma = app.get(PrismaService);
    jobs = app.get(MatchingJobs);
    const tagId = (await ensureTags(prisma, [{ slug, label: 'Kubernetes' }])).get(slug)!;

    for (const name of ['awa', 'moussa', 'aida', 'kwame', 'yao', 'idle', 'dnd']) {
      cookies.set(name, await signInAs(app, login(name)));
    }
    // Aidants : compétence sur l'étiquette (signal GitHub décroissant), sauf awa (l'autrice).
    const signals: Record<string, number> = {
      moussa: 30,
      aida: 25,
      kwame: 20,
      yao: 5,
      idle: 40,
      dnd: 40,
    };
    for (const [name, g] of Object.entries(signals)) {
      const u = await prisma.user.findUniqueOrThrow({ where: { handle: login(name) } });
      await prisma.userSkill.create({ data: { userId: u.id, tagId, githubSignal: g, score: g } });
    }
    // idle n'est pas venu depuis 40 jours ; dnd a activé « ne pas déranger » : tous deux exclus.
    await prisma.user.update({
      where: { handle: login('idle') },
      data: { lastSeenAt: new Date(Date.now() - 40 * 24 * 3600 * 1000) },
    });
    await prisma.user.update({ where: { handle: login('dnd') }, data: { doNotDisturb: true } });

    const q = await write('awa', '/api/v1/questions', {
      clientId: randomUUID(),
      title: `Pod ${suffix} en CrashLoopBackOff après le déploiement`,
      body: 'Le pod redémarre en boucle depuis la nouvelle image.',
      tagSlugs: [slug],
      lang: 'fr',
    }).expect(201);
    questionId = q.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('vague 1 : les 3 meilleurs aidants actifs, avec la raison du choix', async () => {
    await jobs.first(questionId);
    const res = await request(app.getHttpServer())
      .get(`/api/v1/questions/${questionId}`)
      .expect(200);
    expect(res.body.helpers.map((h: { helper: { handle: string } }) => h.helper.handle)).toEqual([
      login('moussa'),
      login('aida'),
      login('kwame'),
    ]);
    expect(res.body.helpers[0]).toMatchObject({
      wave: 1,
      rank: 1,
      claimedAt: null,
      reasons: [{ code: 'github_repos', params: { count: 6, tag: 'Kubernetes' } }],
    });

    const inbox = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .set('Cookie', cookies.get('moussa')!)
      .expect(200);
    expect(inbox.body.data[0]).toMatchObject({
      type: 'match.request',
      payload: { questionId, wave: 1 },
    });
  });

  it('rejouer la vague 1 (nouvel essai du job) ne sollicite personne de plus', async () => {
    const before = await prisma.matchEvent.count({ where: { questionId } });
    await jobs.first(questionId);
    expect(await prisma.matchEvent.count({ where: { questionId } })).toBe(before);
  });

  it('« Je m’en occupe » : 200 pour un aidant sollicité, 403 sinon', async () => {
    const ok = await write('moussa', `/api/v1/questions/${questionId}/claim`).expect(200);
    expect(ok.body).toMatchObject({ questionId, claimedAt: expect.any(String) });
    const no = await write('idle', `/api/v1/questions/${questionId}/claim`).expect(403);
    expect(no.body.code).toBe('forbidden');
  });

  it('l’escalade attend tant que quelqu’un s’en occupe, puis s’arrête dès une réponse', async () => {
    await jobs.escalate(questionId);
    const q = await prisma.question.findUniqueOrThrow({ where: { id: questionId } });
    expect(q.escalatedAt).toBeNull();

    await write('moussa', `/api/v1/questions/${questionId}/answers`, {
      clientId: randomUUID(),
      body: 'Regarde les logs du conteneur précédent : kubectl logs --previous.',
    }).expect(201);
    const moussa = await prisma.user.findUniqueOrThrow({ where: { handle: login('moussa') } });
    const event = await prisma.matchEvent.findFirstOrThrow({
      where: { questionId, helperId: moussa.id },
    });
    expect(event.answeredAt).not.toBeNull();

    await jobs.escalate(questionId);
    expect(
      (await prisma.question.findUniqueOrThrow({ where: { id: questionId } })).escalatedAt,
    ).toBeNull();
  });
});
