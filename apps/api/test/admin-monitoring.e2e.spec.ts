import { randomBytes } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AdminMonitoringView } from '@devhub/contracts';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { httpMetrics } from '../src/infrastructure/http/http-metrics';
import { ProblemDetailsFilter } from '../src/infrastructure/http/problem-details.filter';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { ADMIN_HEADERS, adminSignIn, makeAdmin } from './admin.helper';
import { applyTestEnv } from './env.fixture';
import { signInAs } from './sign-in.helper';

// Supervision de l'administration : santé de l'API, de la base, du worker et des réglages.
applyTestEnv({
  AUTH_FAKE_PROVIDER: 'true',
  NODE_ENV: 'test',
  LOG_LEVEL: 'warn',
  ADMIN_URL: 'http://localhost:5299',
});

const suffix = randomBytes(4).toString('hex');

describe('supervision de l’administration', () => {
  let app: INestApplication;
  let adminCookie: string;
  let memberCookie: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
    const prisma = app.get(PrismaService);
    memberCookie = await signInAs(app, `mon-member-${suffix}`);
    await signInAs(app, `mon-admin-${suffix}`);
    adminCookie = await adminSignIn(app, await makeAdmin(prisma, `mon-admin-${suffix}`));
  });

  afterAll(async () => {
    await app.close();
  });

  it('invisible sans session d’administration (404)', async () => {
    await request(app.getHttpServer()).get('/api/v1/admin/monitoring').expect(404);
    await request(app.getHttpServer())
      .get('/api/v1/admin/monitoring')
      .set('Cookie', memberCookie)
      .expect(404);
  });

  it('décrit l’API, la base, le worker et les réglages, sans jamais montrer de secret', async () => {
    httpMetrics.record({ at: Date.now(), method: 'GET', route: 'GET /x', status: 503, ms: 12 });
    httpMetrics.recordError({
      at: new Date().toISOString(),
      method: 'GET',
      path: '/api/v1/x',
      requestId: 'req_test',
      message: 'boom',
    });
    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/monitoring')
      .set(ADMIN_HEADERS)
      .set('Cookie', adminCookie)
      .expect(200);
    const view = AdminMonitoringView.parse(res.body);
    expect(view.database.ok).toBe(true);
    expect(view.database.migrations).toBeGreaterThan(0);
    expect(view.database.lastMigration).toMatch(/^\d{14}_/);
    expect(view.api.nodeVersion).toBe(process.version);
    expect(view.http.lastHour.serverErrors).toBeGreaterThanOrEqual(1);
    expect(view.http.recentErrors[0]).toMatchObject({ path: '/api/v1/x', message: 'boom' });
    expect(view.security.activeAdminSessions).toBeGreaterThanOrEqual(1);
    // Connexion de test active ici : signalée comme danger, et aucune valeur de réglage exposée.
    expect(view.config.find((c) => c.key === 'AUTH_FAKE_PROVIDER')?.state).toBe('danger');
    const raw = JSON.stringify(res.body);
    for (const secret of [process.env.SESSION_SECRET, process.env.TOKEN_ENCRYPTION_KEY])
      if (secret) expect(raw).not.toContain(secret);
  });

  it('la vue d’ensemble compte les entreprises en attente', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/overview')
      .set(ADMIN_HEADERS)
      .set('Cookie', adminCookie)
      .expect(200);
    expect(res.body.pendingCompanies).toEqual(expect.any(Number));
  });
});
