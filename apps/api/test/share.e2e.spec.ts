import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

// R7 et PR2 (ADR-0012) : un lien partagé sur WhatsApp ou LinkedIn montre la bonne carte.
const suffix = randomBytes(4).toString('hex');
const INDEX = `<!doctype html><html lang="fr"><head><meta charset="UTF-8" />
<title>DevHub Africa</title><meta property="og:title" content="DevHub Africa" />
<script type="module" src="/assets/index-test.js"></script></head><body><div id="root"></div></body></html>`;

describe('aperçus de partage (R7, ADR-0012)', () => {
  let app: INestApplication;
  const handle = `awa-share-${suffix}`;
  let code: string;

  beforeAll(async () => {
    const dir = await mkdtemp(join(tmpdir(), 'devhub-web-'));
    await writeFile(join(dir, 'index.html'), INDEX);
    applyTestEnv({
      AUTH_FAKE_PROVIDER: 'true',
      NODE_ENV: 'test',
      LOG_LEVEL: 'warn',
      WEB_INDEX_HTML: join(dir, 'index.html'),
    });
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
    await ensureTags(app.get(PrismaService), [{ slug: 'nodejs', label: 'Node.js' }]);
    const cookie = await signInAs(app, handle);
    const room = await request(app.getHttpServer())
      .post('/api/v1/rooms')
      .set(WRITE_HEADERS)
      .set('Cookie', cookie)
      .set('Idempotency-Key', randomUUID())
      .send({
        name: `Paylink <b>${suffix}</b>`,
        description: 'Paiements mobile money pour les petits commerces de Dakar.',
        state: 'looking_for_help',
        stackTagSlugs: ['nodejs'],
      })
      .expect(201);
    code = room.body.code;
  });

  afterAll(async () => {
    await app.close();
  });

  it('salle : la SPA avec titre, description et image de la salle, contenu échappé', async () => {
    const res = await request(app.getHttpServer()).get(`/p/${code}`).expect(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.headers['cache-control']).toBe('public, max-age=300');
    expect(res.text).toContain(
      `<meta property="og:title" content="Paylink &lt;b&gt;${suffix}&lt;/b&gt; · salle de projet DevHub Africa" />`,
    );
    expect(res.text).toContain('Cherche des contributeurs · Node.js. Paiements mobile money');
    expect(res.text).toContain(
      `<meta property="og:url" content="http://localhost:5173/p/${code}" />`,
    );
    expect(res.text).toContain('<script type="module" src="/assets/index-test.js"></script>');
    expect(res.text.match(/og:title/g)).toHaveLength(1);
  });

  it('Passport : nom et handle ; inconnu ou invalide : 404 avec la SPA', async () => {
    const res = await request(app.getHttpServer()).get(`/u/${handle}`).expect(200);
    expect(res.text).toContain(`(@${handle}) · Developer Passport`);
    expect(res.text).toContain('<meta property="og:type" content="profile" />');
    const missing = await request(app.getHttpServer()).get('/u/personne-inconnue-xyz').expect(404);
    expect(missing.text).toContain('<div id="root"></div>');
    await request(app.getHttpServer()).get('/p/PAS-VALIDE!').expect(404);
  });
});
