import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { ProblemDetailsFilter } from '../src/infrastructure/http/problem-details.filter';
import { applyTestEnv } from './env.fixture';

// Idée B : le bouton « Déployer sur Systalink » compte le renvoi, puis redirige.
applyTestEnv({ AUTH_FAKE_PROVIDER: 'true', NODE_ENV: 'test', LOG_LEVEL: 'warn' });

describe('renvois vers Systalink (idée B)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('302 vers la destination de la liste fermée, avec utm ; le renvoi est compté', async () => {
    const before = (await request(app.getHttpServer()).get('/api/v1/systalink/ecosystem')).body;
    const res = await request(app.getHttpServer())
      .get('/api/v1/go/systalink?to=orion&from=build')
      .expect(302);
    const url = new URL(res.headers.location!);
    expect(url.origin + url.pathname).toBe('https://systalink.com/fr/orion');
    expect(url.searchParams.get('utm_medium')).toBe('build');

    const after = await request(app.getHttpServer()).get('/api/v1/systalink/ecosystem').expect(200);
    expect(after.body.referrals.total).toBe(before.referrals.total + 1);
    expect(after.body.referrals.bySource).toEqual(
      expect.arrayContaining([expect.objectContaining({ source: 'build' })]),
    );
  });

  it('destination inconnue refusée : pas de redirection ouverte', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/go/systalink?to=https://evil.example')
      .expect(400);
  });
});
