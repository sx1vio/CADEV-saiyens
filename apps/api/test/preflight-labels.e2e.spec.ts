import { randomBytes } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { PreflightCheck } from '@devhub/contracts';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { ProblemDetailsFilter } from '../src/infrastructure/http/problem-details.filter';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { PreflightLabels } from '../src/modules/preflight/infrastructure/preflight-labels';
import { applyTestEnv } from './env.fixture';
import { signInAs } from './sign-in.helper';

// Label « DevHub Ready » (11/11/2026) : un pré-vol GO sur un domaine prouvé donne un label public,
// un badge SVG et 10 Proof XP ; un NO-GO le retire.
applyTestEnv({ AUTH_FAKE_PROVIDER: 'true', NODE_ENV: 'test', LOG_LEVEL: 'warn' });

const suffix = randomBytes(4).toString('hex');
const login = `ready-${suffix}`;
const domain = `app-${suffix}.example.sn`;

const pass = (id: string, category: PreflightCheck['category']): PreflightCheck => ({
  id,
  category,
  status: 'pass',
  title: id,
  detail: '',
  fix: null,
  evidence: [],
});
const GO_CHECKS: PreflightCheck[] = [
  pass('site.status', 'security'),
  pass('site.exposed_files', 'security'),
  pass('site.client_secrets', 'security'),
  pass('site.security_headers', 'security'),
  pass('site.https_redirect', 'security'),
  pass('func.pages', 'functional'),
  pass('a11y.lang', 'accessibility'),
  pass('net.first_load_3g', 'network'),
  pass('site.cookies', 'security'),
];

describe('Label « DevHub Ready »', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let labels: PreflightLabels;
  let userId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
    prisma = app.get(PrismaService);
    labels = app.get(PreflightLabels);
    await signInAs(app, login);
    userId = (await prisma.user.findFirstOrThrow({ where: { handle: login } })).id;
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());
  const svgText = (r: request.Response) =>
    typeof r.text === 'string' ? r.text : Buffer.from(r.body as Buffer).toString('utf8');
  const report = async (checks: PreflightCheck[], owned: boolean) => {
    const counts = {
      pass: checks.filter((c) => c.status === 'pass').length,
      warn: 0,
      fail: 0,
      info: 0,
    };
    counts.fail = checks.filter((c) => c.status === 'fail').length;
    const row = await prisma.preflightReport.create({
      data: {
        userId,
        url: `https://${domain}/`,
        repo: null,
        score: counts.fail ? 60 : 100,
        verdict: counts.fail ? 'fix' : 'ready',
        durationMs: 1000,
        result: { checks, metrics: null, repoSummary: null, counts, owned } as object,
      },
      select: { id: true },
    });
    await labels.record(row.id);
    return row.id;
  };

  it('sans preuve de propriété : pas de label', async () => {
    await report(GO_CHECKS, false);
    await http().get(`/api/v1/labels/${domain}`).expect(404);
    const svg = await http().get(`/api/v1/labels/${domain}/badge.svg`).expect(200);
    expect(svg.headers['content-type']).toContain('image/svg+xml');
    expect(svgText(svg)).toContain('non vérifié');
  });

  it('GO sur un domaine prouvé : label public, badge vert, 10 XP une seule fois', async () => {
    const id = await report(GO_CHECKS, true);
    const label = await http().get(`/api/v1/labels/${domain}`).expect(200);
    expect(label.body.status).toBe('ready');
    expect(label.body.owner.handle).toBe(login);
    expect(label.body.reportId).toBe(id);
    expect(label.body.expiresAt).toBeTruthy();
    expect(label.body.sections.length).toBeGreaterThan(0);

    const svg = await http().get(`/api/v1/labels/${domain}/badge.svg`).expect(200);
    expect(svgText(svg)).toContain('Ready ✓');
    expect(svg.headers['cache-control']).toContain('max-age=3600');

    const full = await http().get(`/api/v1/preflight/${id}`).expect(200);
    expect(full.body.label).toEqual({ domain, owned: true, ready: true });

    await report(GO_CHECKS, true);
    const xp = await prisma.xpEvent.findMany({ where: { userId, kind: 'preflight_ready' } });
    expect(xp).toHaveLength(1);
    expect(xp[0]!.points).toBe(10);

    const mine = await http().get(`/api/v1/labels?owner=${login}`).expect(200);
    expect(mine.body.items.map((l: { domain: string }) => l.domain)).toContain(domain);
  });

  it('un NO-GO retire le label, et le rapport donne ses correctifs prêts', async () => {
    const id = await report(
      [
        ...GO_CHECKS.filter((c) => c.id !== 'site.exposed_files'),
        { ...pass('site.exposed_files', 'security'), status: 'fail' },
        { ...pass('site.security_txt', 'security'), status: 'warn' },
      ],
      true,
    );
    const label = await http().get(`/api/v1/labels/${domain}`).expect(200);
    expect(label.body.status).toBe('not_ready');
    expect(label.body.decision).toBe('no_go');
    const svg = await http().get(`/api/v1/labels/${domain}/badge.svg`).expect(200);
    expect(svgText(svg)).toContain('pré-vol');
    const full = await http().get(`/api/v1/preflight/${id}`).expect(200);
    expect(full.body.label.ready).toBe(false);
    expect(full.body.fixes.map((f: { path: string }) => f.path)).toContain(
      'public/.well-known/security.txt',
    );
  });

  it('refuse un domaine mal formé', async () => {
    await http().get('/api/v1/labels/..%2Fadmin').expect(400);
    await http().get('/api/v1/labels').expect(400);
  });
});
