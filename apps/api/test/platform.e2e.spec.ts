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
    await post('awa', `/api/v1/answers/${a.body.id}/accept`).expect(200);
    await post('demo', '/api/v1/questions', {
      clientId: randomUUID(),
      title: `Démo ${suffix} : question d'un compte de démonstration`,
      body: 'Ne doit pas compter dans l’impact.',
      tagSlugs: ['docker'],
      lang: 'fr',
    }).expect(201);

    const res = await request(app.getHttpServer()).get('/api/v1/impact').expect(200);
    // D'autres fichiers de test créent, masquent ou passent en démo des comptes en parallèle :
    // seules des assertions vraies quel que soit leur travail sont stables (BUG-023).
    expect(res.body.questionsAsked).toBeGreaterThanOrEqual(1);
    expect(res.body.questionsResolved).toBeGreaterThanOrEqual(1);
    expect(res.body.medianFirstResponseMinutes).toEqual(expect.any(Number));
    // Le compte de démo et sa question existaient avant le calcul : ils n'y sont pas comptés.
    const [users, questions] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.question.count({ where: { hiddenAt: null } }),
    ]);
    expect(res.body.registeredDevs).toBeLessThanOrEqual(users - 1);
    expect(res.body.questionsAsked).toBeLessThanOrEqual(questions - 1);
    expect(res.headers['cache-control']).toBe('public, max-age=60');
  });
});
