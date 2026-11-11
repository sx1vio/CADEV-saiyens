import type { PreflightCheck } from '@devhub/contracts';
import { describe, expect, it } from 'vitest';
import { fixesOf, githubNewFileUrl } from './fixes';

const check = (id: string, status: PreflightCheck['status'] = 'fail'): PreflightCheck => ({
  id,
  category: 'security',
  status,
  title: id,
  detail: '',
  fix: null,
  evidence: [],
});

const base = {
  url: 'https://monapp.sn/accueil',
  repo: 'awa/monapp',
  repoSummary: {
    fullName: 'awa/monapp',
    defaultBranch: 'develop',
    licence: 'MIT',
    ecosystems: ['npm'],
    dependencies: 10,
    vulnerablePackages: 0,
  },
};
const opts = { apiOrigin: 'https://devafrica.tech', now: new Date('2026-11-11T12:00:00Z') };

describe('correctifs prêts du pré-vol', () => {
  it('ouvre l’éditeur de GitHub prérempli sur la bonne branche', () => {
    const url = githubNewFileUrl('awa/monapp', 'develop', 'public/robots.txt', 'User-agent: *\n');
    expect(url).toBe(
      'https://github.com/awa/monapp/new/develop?filename=public%2Frobots.txt&value=User-agent%3A%20*%0A',
    );
    expect(githubNewFileUrl('pas un dépôt', null, 'a', 'b')).toBeNull();
    expect(githubNewFileUrl('awa/monapp', 'main', 'a', 'x'.repeat(8_000))).toBeNull();
  });

  it('ne propose rien quand tout passe', () => {
    expect(fixesOf({ ...base, checks: [check('site.security_txt', 'pass')] }, opts)).toEqual([]);
  });

  it('donne security.txt, robots.txt et la CI du pré-vol avec leur contenu réel', () => {
    const fixes = fixesOf(
      {
        ...base,
        checks: [check('site.security_txt'), check('seo.robots', 'warn'), check('quality.ci')],
      },
      opts,
    );
    const byPath = Object.fromEntries(fixes.map((f) => [f.path, f]));
    expect(byPath['public/.well-known/security.txt']!.content).toContain(
      'Canonical: https://monapp.sn/.well-known/security.txt',
    );
    expect(byPath['public/.well-known/security.txt']!.content).toContain(
      'Expires: 2027-11-11T12:00:00Z',
    );
    expect(byPath['public/robots.txt']!.content).toContain(
      'Sitemap: https://monapp.sn/sitemap.xml',
    );
    const ci = byPath['.github/workflows/prevol.yml']!;
    expect(ci.content).toContain('api-url: https://devafrica.tech');
    expect(ci.content).toContain('url: https://monapp.sn');
    expect(ci.githubUrl).toContain('/new/develop?filename=.github%2Fworkflows%2Fprevol.yml');
  });

  it('regroupe les en-têtes de sécurité en un jeu complet par hébergeur', () => {
    const fixes = fixesOf(
      { ...base, checks: [check('site.security_headers'), check('site.hsts_quality', 'warn')] },
      opts,
    );
    expect(fixes.map((f) => f.title)).toEqual([
      'En-têtes de sécurité (Netlify, Cloudflare Pages)',
      'En-têtes de sécurité (Vercel)',
      'En-têtes de sécurité (Next.js)',
      'En-têtes de sécurité (Nginx)',
      'En-têtes de sécurité (Caddy)',
    ]);
    expect(fixes[0]!.content).toContain('Strict-Transport-Security: max-age=31536000');
    expect(JSON.parse(fixes[1]!.content).headers[0].source).toBe('/(.*)');
    expect(fixes[1]!.githubUrl).toBeNull();
    expect(fixes[2]!.content).toContain("{ key: 'Strict-Transport-Security'");
    expect(fixes[2]!.content).toContain('async headers()');
  });

  it('sans dépôt : le fichier est donné, sans lien GitHub', () => {
    const [fix] = fixesOf(
      { url: 'https://monapp.sn', repo: null, repoSummary: null, checks: [check('seo.robots')] },
      opts,
    );
    expect(fix!.kind).toBe('file');
    expect(fix!.githubUrl).toBeNull();
  });
});
