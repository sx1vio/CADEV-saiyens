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

// PR1 (profil), PR2, PR3, PR10, PR14 de bout en bout : le Passport de Moussa se remplit avec
// ses vraies actions.
applyTestEnv({ AUTH_FAKE_PROVIDER: 'true', NODE_ENV: 'test', LOG_LEVEL: 'warn' });

const suffix = randomBytes(4).toString('hex');
const awa = `awa-pass-${suffix}`;
const moussa = `moussa-pass-${suffix}`;

describe('Developer Passport public (PR2)', () => {
  let app: INestApplication;
  const cookie = new Map<string, string>();

  const send = (method: 'post' | 'patch', who: string, path: string, body: object = {}) => {
    const server = request(app.getHttpServer());
    const req = method === 'post' ? server.post(path) : server.patch(path);
    return req
      .set(WRITE_HEADERS)
      .set('Cookie', cookie.get(who)!)
      .set('Idempotency-Key', randomUUID())
      .send(body);
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
    await ensureTags(app.get(PrismaService), [
      { slug: 'docker', label: 'Docker' },
      { slug: 'nodejs', label: 'Node.js' },
    ]);
    cookie.set(awa, await signInAs(app, awa));
    cookie.set(moussa, await signInAs(app, moussa));
  });

  afterAll(async () => {
    await app.close();
  });

  it('PATCH /me : fuseau inconnu ou étiquette inconnue refusés', async () => {
    const tz = await send('patch', moussa, '/api/v1/me', { timezone: 'Mars/Olympus' }).expect(422);
    expect(tz.body.errors[0]).toMatchObject({ path: 'timezone' });
    const tag = await send('patch', moussa, '/api/v1/me', { canHelpTagSlugs: ['cobol-74'] }).expect(
      422,
    );
    expect(tag.body.code).toBe('question.tags_unknown');
    await send('patch', moussa, '/api/v1/me', {}).expect(400);
  });

  it('PATCH /me : profil, « Je peux aider », disponibilités et confidentialité', async () => {
    const res = await send('patch', moussa, '/api/v1/me', {
      bio: 'Backend Node.js à Dakar.',
      country: 'SN',
      timezone: 'Africa/Dakar',
      languages: ['fr', 'en'],
      lookingFor: 'Une mission freelance',
      canHelpTagSlugs: ['docker'],
      wantLearnTagSlugs: ['nodejs'],
      availability: { slots: [{ day: 3, from: '18:00', to: '21:00' }] },
      privacy: { hideCountry: true },
    }).expect(200);
    expect(res.body).toMatchObject({
      bio: 'Backend Node.js à Dakar.',
      country: 'SN',
      timezone: 'Africa/Dakar',
    });
  });

  it('le Passport se remplit avec une réponse validée, une salle publique et ses Proof XP', async () => {
    const q = await send('post', awa, '/api/v1/questions', {
      clientId: randomUUID(),
      title: `Passport ${suffix} : docker compose ne trouve pas le réseau`,
      body: 'Le réseau externe est introuvable.',
      tagSlugs: ['docker'],
      lang: 'fr',
    }).expect(201);
    const a = await send('post', moussa, `/api/v1/questions/${q.body.id}/answers`, {
      clientId: randomUUID(),
      body: 'Crée le réseau avec docker network create avant.',
    }).expect(201);
    await send('post', awa, `/api/v1/answers/${a.body.id}/accept`).expect(200);
    await send('post', moussa, '/api/v1/rooms', {
      name: `Dakar Pay ${suffix}`,
      description: 'Paiements pour les commerçants de Dakar.',
      stackTagSlugs: ['nodejs'],
    }).expect(201);
    await send('post', moussa, '/api/v1/rooms', {
      name: `Secret ${suffix}`,
      description: 'Projet non listé, ne doit pas apparaître.',
      visibility: 'unlisted',
      stackTagSlugs: ['nodejs'],
    }).expect(201);

    const res = await request(app.getHttpServer()).get(`/api/v1/u/${moussa}`).expect(200);
    expect(res.body.user).toMatchObject({
      handle: moussa,
      bio: 'Backend Node.js à Dakar.',
      country: null, // masqué (PR14)
      timezone: null,
      lookingFor: 'Une mission freelance',
      availability: { slots: [{ day: 3, from: '18:00', to: '21:00' }] },
      isDemo: false,
    });
    // Libellés partagés entre fichiers de test (BUG-014) : on compare les slugs.
    expect(res.body.canHelp.map((t: { slug: string }) => t.slug)).toEqual(['docker']);
    expect(res.body.wantLearn.map((t: { slug: string }) => t.slug)).toEqual(['nodejs']);
    expect(res.body.stats).toMatchObject({ answersAccepted: 1, contributions: 0, reviews: 0 });
    expect(res.body.stats.totalXp).toBeGreaterThanOrEqual(13); // +10 et +3 (moins de 15 min)
    expect(res.body.stats.medianMinutesToHelp).toBe(0);
    expect(res.body.projects.map((p: { name: string }) => p.name)).toEqual([`Dakar Pay ${suffix}`]);
    expect(
      res.body.skills.find((s: { tag: { slug: string } }) => s.tag.slug === 'docker'),
    ).toMatchObject({
      platformPoints: 13,
    });
    expect(res.body.trust).toMatchObject({ githubLinked: true, founder: true, demo: false });

    const proofs = await request(app.getHttpServer()).get(`/api/v1/u/${moussa}/proofs`).expect(200);
    expect(proofs.body.events.length).toBeGreaterThan(0);
  });

  it('statistiques et disponibilités masquées (clés du modèle de données comprises)', async () => {
    await send('patch', moussa, '/api/v1/me', {
      privacy: { hideStats: true, hideAvailability: true },
    }).expect(200);
    const res = await request(app.getHttpServer()).get(`/api/v1/u/${moussa}`).expect(200);
    expect(res.body.stats).toBeNull();
    expect(res.body.user.availability).toBeNull();
    // Un réglage écrit avec les clés du modèle (« champ visible » à false) masque aussi.
    const prisma = app.get(PrismaService);
    await prisma.user.update({
      where: { handle: awa },
      data: { country: 'CI', privacy: { country: false } },
    });
    const a = await request(app.getHttpServer()).get(`/api/v1/u/${awa}`).expect(200);
    expect(a.body.user.country).toBeNull();
  });

  it('Passport inconnu : 404', async () => {
    await request(app.getHttpServer()).get('/api/v1/u/personne-inconnue-xyz').expect(404);
    await request(app.getHttpServer()).get('/api/v1/u/pas%20valide').expect(404);
  });
});
