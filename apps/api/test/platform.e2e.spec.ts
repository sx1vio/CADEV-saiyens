import { randomBytes, randomUUID } from 'node:crypto';
import { writeFile, mkdtemp } from 'node:fs/promises';
import { type Server, createServer as createHttpServer } from 'node:http';
import { type Server as TcpServer, createServer as createTcpServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { ProblemDetailsFilter } from '../src/infrastructure/http/problem-details.filter';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { CheckServices } from '../src/modules/platform';
import { ImpactReader } from '../src/modules/platform/infrastructure/impact.reader';
import { applyTestEnv } from './env.fixture';
import { WRITE_HEADERS, signInAs } from './sign-in.helper';
import { ensureTags } from './tags.fixture';

// Y1 et Y2 de bout en bout. Les sondes visent de vrais services locaux : un serveur HTTP joue
// l'API derrière Caddy, un serveur TCP le SMTP, un fichier le statut écrit par backup.sh.
const suffix = randomBytes(4).toString('hex');
const listen = <S extends Server | TcpServer>(server: S) =>
  new Promise<number>((resolve) =>
    server.listen(0, '127.0.0.1', () => resolve((server.address() as { port: number }).port)),
  );

describe('écran Systalink et impact (Y1, Y2)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let fakeApi: Server;
  let fakeSmtp: TcpServer;
  const cookie = new Map<string, string>();
  const handle = (n: string) => `${n}-platform-${suffix}`;

  const post = (who: string, path: string, body: object = {}) =>
    request(app.getHttpServer())
      .post(path)
      .set(WRITE_HEADERS)
      .set('Cookie', cookie.get(who)!)
      .set('Idempotency-Key', randomUUID())
      .send(body);

  beforeAll(async () => {
    fakeApi = createHttpServer((req, res) => {
      res.statusCode = req.url === '/api/v1/healthz' ? 200 : 404;
      res.end('{"status":"ok"}');
    });
    fakeSmtp = createTcpServer((socket) => {
      socket.on('error', () => {}); // la sonde ferme la connexion sans attendre la bannière
      socket.end('220 smtp.test ESMTP\r\n');
    });
    const [apiPort, smtpPort] = await Promise.all([listen(fakeApi), listen(fakeSmtp)]);
    const dir = await mkdtemp(join(tmpdir(), 'devhub-backup-'));
    const statusFile = join(dir, 'status.json');
    await writeFile(
      statusFile,
      JSON.stringify({ lastBackupAt: new Date(Date.now() - 3_600_000).toISOString() }),
    );
    applyTestEnv({
      AUTH_FAKE_PROVIDER: 'true',
      NODE_ENV: 'test',
      LOG_LEVEL: 'warn',
      API_URL: `http://127.0.0.1:${apiPort}`,
      BACKUP_STATUS_URL: statusFile,
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: String(smtpPort),
    });

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
    prisma = app.get(PrismaService);
    await ensureTags(prisma, [{ slug: 'docker', label: 'Docker' }]);
    for (const n of ['awa', 'moussa', 'demo']) cookie.set(n, await signInAs(app, handle(n)));
    await prisma.user.update({ where: { handle: handle('demo') }, data: { isDemo: true } });
  });

  afterAll(async () => {
    await app.close();
    fakeApi.close();
    fakeSmtp.close();
  });

  it('GET /status : les quatre services sondés pour de vrai, dernière sauvegarde affichée', async () => {
    const results = await app.get(CheckServices).run();
    expect(results.map((r) => [r.service, r.ok])).toEqual([
      ['vps', true],
      ['database', true],
      ['backup', true],
      ['mail', true],
    ]);
    const res = await request(app.getHttpServer()).get('/api/v1/status').expect(200);
    expect(res.headers['cache-control']).toBe('public, max-age=30');
    expect(res.body.overall).toBe('operational');
    expect(res.body.services.map((s: { state: string }) => s.state)).toEqual([
      'operational',
      'operational',
      'operational',
      'operational',
    ]);
    expect(res.body.services[1].latencyMs).toEqual(expect.any(Number));
    expect(Date.now() - Date.parse(res.body.lastBackupAt)).toBeGreaterThan(3_000_000);
  });

  it('GET /status : un service en panne dégrade l’état global', async () => {
    fakeSmtp.close();
    await new Promise((r) => setTimeout(r, 50));
    await app.get(CheckServices).run();
    const res = await request(app.getHttpServer()).get('/api/v1/status').expect(200);
    expect(res.body.overall).toBe('degraded');
    expect(res.body.services[3]).toMatchObject({ service: 'mail', state: 'down', latencyMs: null });
  });

  it('GET /impact : une question résolue compte ; un compte de démo jamais', async () => {
    const q = await post('awa', '/api/v1/questions', {
      clientId: randomUUID(),
      title: `Impact ${suffix} : le conteneur redémarre en boucle`,
      body: 'Le healthcheck échoue au démarrage.',
      tagSlugs: ['docker'],
      lang: 'fr',
    }).expect(201);
    const a = await post('moussa', `/api/v1/questions/${q.body.id}/answers`, {
      clientId: randomUUID(),
      body: 'Ajoute un start_period au healthcheck.',
    }).expect(201);
    // Moussa ne parle qu'anglais : sa réponse validée à une question en français est un échange
    // entre langues. Une contribution vérifiée par GitHub dans une salle publique de Moussa.
    const moussa = await prisma.user.update({
      where: { handle: handle('moussa') },
      data: { languages: ['en'] },
    });
    await post('awa', `/api/v1/answers/${a.body.id}/accept`).expect(200);
    const room = await prisma.room.create({
      data: {
        ownerId: moussa.id,
        name: `Impact ${suffix}`,
        description: 'Salle publique pour le test d’impact.',
        inviteCode: `imp${suffix}`,
      },
    });
    await prisma.task.create({
      data: {
        roomId: room.id,
        title: 'Contribution vérifiée',
        status: 'done',
        assigneeId: moussa.id,
        verification: 'github_verified',
      },
    });
    await prisma.task.create({
      data: {
        roomId: room.id,
        title: 'Contribution déclarée',
        status: 'done',
        assigneeId: moussa.id,
        verification: 'declared',
      },
    });
    await post('demo', '/api/v1/questions', {
      clientId: randomUUID(),
      title: `Démo ${suffix} : question d'un compte de démonstration`,
      body: 'Ne doit pas compter dans l’impact.',
      tagSlugs: ['docker'],
      lang: 'fr',
    }).expect(201);

    const res = await request(app.getHttpServer()).get('/api/v1/impact').expect(200);
    expect(res.headers['cache-control']).toBe('public, max-age=60');

    // BUG-038 : d'autres fichiers créent, masquent et suppriment comptes et questions en
    // parallèle. L'impact et les totaux attendus sont lus dans une même transaction en lecture
    // répétable (instantané figé) : on compare par égalité, sans dépendre des autres fichiers.
    const snap = await prisma.$transaction(
      async (tx) => {
        const real = { isDemo: false, deletedAt: null };
        const impact = await new ImpactReader(prisma).compute(tx);
        const devs = await tx.user.count({ where: real });
        const asked = await tx.question.count({ where: { hiddenAt: null, author: real } });
        const all = await tx.question.count({ where: { hiddenAt: null } });
        const resolved = await tx.question.count({
          where: { hiddenAt: null, status: 'resolved', author: real },
        });
        const verified = await tx.task.count({
          where: {
            status: 'done',
            verification: 'github_verified',
            room: { hiddenAt: null, visibility: 'public' },
            assignee: real,
          },
        });
        return { impact, devs, asked, all, resolved, verified };
      },
      { isolationLevel: 'RepeatableRead' },
    );
    expect(snap.impact).toMatchObject({
      registeredDevs: snap.devs,
      questionsAsked: snap.asked,
      questionsResolved: snap.resolved,
      verifiedContributions: snap.verified,
      medianFirstResponseMinutes: expect.any(Number),
    });
    // Le compte de démo et sa question existent : ils ne sont pas comptés.
    expect(snap.all).toBeGreaterThan(snap.asked);
    // Nos données : une contribution vérifiée (la « déclarée » ne compte pas), un échange
    // entre langues (réponse validée en anglais à une question en français).
    expect(snap.impact.verifiedContributions).toBeGreaterThanOrEqual(1);
    expect(snap.impact.crossLanguageAnswers).toBeGreaterThanOrEqual(1);
  });

  it('GET /status/history : disponibilité par jour ; « non branché » exclu ; jours bornés', async () => {
    const day = new Date(Date.now() - 2 * 86_400_000);
    const at = (h: number) =>
      new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), h));
    const date = at(0).toISOString().slice(0, 10);
    await prisma.statusCheck.deleteMany({
      where: { service: 'backup', checkedAt: { gte: at(0), lt: at(24) } },
    });
    await prisma.statusCheck.createMany({
      data: [
        { service: 'backup', ok: true, checkedAt: at(1) },
        { service: 'backup', ok: true, checkedAt: at(2) },
        { service: 'backup', ok: false, checkedAt: at(3) },
        { service: 'backup', ok: false, detail: { configured: false }, checkedAt: at(4) },
      ],
    });
    const res = await request(app.getHttpServer()).get('/api/v1/status/history?days=7').expect(200);
    expect(res.headers['cache-control']).toBe('public, max-age=300');
    expect(res.body.days).toBe(7);
    const backup = res.body.services.find((s: { service: string }) => s.service === 'backup');
    expect(backup.daily).toHaveLength(7);
    expect(backup.daily.find((d: { date: string }) => d.date === date)).toEqual({
      date,
      uptimePercent: 66.7,
      checks: 3,
    });
    await request(app.getHttpServer()).get('/api/v1/status/history?days=31').expect(400);
  });
});
