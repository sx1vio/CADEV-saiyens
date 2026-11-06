import { isStrongCopyleft } from '../domain/checks';
import type { RepoFacts, Severity, VulnerablePackage } from '../domain/facts';
import {
  type Dependency,
  isSecretFile,
  parsePackageJson,
  parsePackageLock,
  parsePnpmLock,
  parseRequirements,
  parseYarnLock,
} from '../domain/lockfiles';
import { pool, type SafeFetcher } from './safe-fetch';

const MAX_LOCKFILE = 12 * 1024 * 1024;
const MAX_DEPS = 3000;
const MAX_VULN_DETAILS = 25;
const MAX_LICENCE_LOOKUPS = 60;

export class RepoNotFoundError extends Error {}
export class GithubRateLimitedError extends Error {}

const LOCKFILES = ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock'] as const;

/** Chemin le moins profond portant ce nom (projet à la racine ou dans un sous-dossier). */
function shallowest(paths: string[], name: string): string | null {
  return (
    paths
      .filter((p) => (p === name || p.endsWith(`/${name}`)) && !p.includes('node_modules/'))
      .sort((a, b) => a.split('/').length - b.split('/').length || a.length - b.length)[0] ?? null
  );
}

/** Analyse un dépôt GitHub public : secrets publiés, failles (OSV) et licences des dépendances. */
export async function probeRepo(
  fetcher: SafeFetcher,
  fullName: string,
  githubToken: string | undefined,
): Promise<RepoFacts> {
  const gh = (path: string) =>
    fetcher.get(`https://api.github.com${path}`, {
      maxBytes: 8 * 1024 * 1024,
      timeoutMs: 10_000,
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(githubToken ? { Authorization: `Bearer ${githubToken}` } : {}),
      },
    });

  const meta = await gh(`/repos/${fullName}`);
  if (meta.status === 404) throw new RepoNotFoundError(fullName);
  if (meta.status === 403 || meta.status === 429) throw new GithubRateLimitedError();
  if (meta.status >= 400) throw new RepoNotFoundError(fullName);
  const repo = JSON.parse(meta.body.toString('utf8')) as {
    full_name: string;
    default_branch: string;
    archived: boolean;
    private: boolean;
    license: { spdx_id: string | null } | null;
  };
  if (repo.private) throw new RepoNotFoundError(fullName);
  const branch = repo.default_branch;

  const treeRes = await gh(
    `/repos/${repo.full_name}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
  );
  const tree =
    treeRes.status === 200
      ? (JSON.parse(treeRes.body.toString('utf8')) as {
          truncated: boolean;
          tree: { path: string; type: string }[];
        })
      : { truncated: true, tree: [] };
  const paths = tree.tree.filter((t) => t.type === 'blob').map((t) => t.path);

  const raw = async (path: string): Promise<string | null> => {
    const r = await fetcher
      .get(
        `https://raw.githubusercontent.com/${repo.full_name}/${encodeURIComponent(branch)}/${path
          .split('/')
          .map(encodeURIComponent)
          .join('/')}`,
        { maxBytes: MAX_LOCKFILE, timeoutMs: 12_000 },
      )
      .catch(() => null);
    return r && r.status === 200 ? r.body.toString('utf8') : null;
  };

  // Dépendances : fichier de verrouillage du projet principal, sinon package.json, plus requirements.txt.
  const manifest = shallowest(paths, 'package.json');
  const manifestDir = manifest?.includes('/')
    ? manifest.slice(0, manifest.lastIndexOf('/') + 1)
    : '';
  const lockfile =
    LOCKFILES.map((n) => paths.find((p) => p === `${manifestDir}${n}`) ?? null).find(Boolean) ??
    LOCKFILES.map((n) => shallowest(paths, n)).find(Boolean) ??
    null;
  const requirements = shallowest(paths, 'requirements.txt');

  let deps: Dependency[] = [];
  let approximateVersions = false;
  let direct: { name: string; range: string }[] = [];
  const pkgText = manifest ? await raw(manifest) : null;
  if (pkgText) {
    try {
      const parsed = parsePackageJson(pkgText);
      direct = parsed.direct;
      if (!lockfile) {
        deps = parsed.deps;
        approximateVersions = true;
      }
    } catch {
      /* package.json invalide : ignoré */
    }
  }
  if (lockfile) {
    const text = await raw(lockfile);
    try {
      if (text) {
        deps = lockfile.endsWith('package-lock.json')
          ? parsePackageLock(text)
          : lockfile.endsWith('pnpm-lock.yaml')
            ? parsePnpmLock(text)
            : parseYarnLock(text);
      }
    } catch {
      deps = [];
    }
  }
  if (requirements) {
    const text = await raw(requirements);
    if (text) deps = [...deps, ...parseRequirements(text)];
  }
  deps = deps.slice(0, MAX_DEPS);

  const { vulnerable, failed: vulnLookupFailed } = await lookupVulns(fetcher, deps);

  // Licences des dépendances directes de production (registre npm).
  const lockedVersion = new Map(
    deps.filter((d) => d.ecosystem === 'npm').map((d) => [d.name, d.version]),
  );
  let licenceFailures = 0;
  const licences = await pool(direct.slice(0, MAX_LICENCE_LOOKUPS), 8, async (d) => {
    const version = lockedVersion.get(d.name) ?? 'latest';
    try {
      const r = await fetcher.get(
        `https://registry.npmjs.org/${d.name.replace('/', '%2F')}/${encodeURIComponent(version)}`,
        { maxBytes: 512 * 1024, timeoutMs: 6_000, headers: { Accept: 'application/json' } },
      );
      if (r.status !== 200) return null;
      const body = JSON.parse(r.body.toString('utf8')) as {
        license?: string | { type?: string };
        licenses?: { type?: string }[];
      };
      const lic =
        typeof body.license === 'string'
          ? body.license
          : (body.license?.type ?? body.licenses?.map((l) => l.type).join(' OR ') ?? '');
      return { name: d.name, licence: lic };
    } catch {
      licenceFailures++;
      return null;
    }
  });
  const checked = licences.filter((l): l is { name: string; licence: string } => l !== null);
  const copyleftDependencies = checked.filter(
    (l) => isStrongCopyleft(l.licence) || /\b(LGPL|MPL|EPL|CDDL)/i.test(l.licence),
  );

  return {
    fullName: repo.full_name,
    defaultBranch: branch,
    licence:
      repo.license?.spdx_id && repo.license.spdx_id !== 'NOASSERTION' ? repo.license.spdx_id : null,
    archived: repo.archived,
    treeTruncated: tree.truncated,
    committedSecretFiles: paths.filter(isSecretFile).slice(0, 20),
    ecosystems: [...new Set(deps.map((d) => d.ecosystem))],
    manifest: manifest ?? requirements,
    lockfile,
    approximateVersions,
    dependencies: deps.length,
    vulnerable,
    vulnLookupFailed,
    copyleftDependencies,
    licenceLookupFailed: direct.length > 0 && checked.length === 0 && licenceFailures > 0,
    licencesChecked: checked.length,
  };
}

interface OsvVuln {
  id: string;
  summary?: string;
  database_specific?: { severity?: string };
  affected?: {
    package?: { name?: string; ecosystem?: string };
    ranges?: { events?: { fixed?: string }[] }[];
  }[];
}

/** Base OSV (Google, gratuite) : requête groupée, puis détail des failles les plus fréquentes. */
async function lookupVulns(
  fetcher: SafeFetcher,
  deps: Dependency[],
): Promise<{ vulnerable: VulnerablePackage[]; failed: boolean }> {
  if (!deps.length) return { vulnerable: [], failed: false };
  const hits: { dep: Dependency; ids: string[] }[] = [];
  try {
    for (let i = 0; i < deps.length; i += 1000) {
      const chunk = deps.slice(i, i + 1000);
      const r = await fetcher.get('https://api.osv.dev/v1/querybatch', {
        method: 'POST',
        maxBytes: 8 * 1024 * 1024,
        timeoutMs: 15_000,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queries: chunk.map((d) => ({
            package: { ecosystem: d.ecosystem, name: d.name },
            version: d.version,
          })),
        }),
      });
      if (r.status !== 200) return { vulnerable: [], failed: true };
      const body = JSON.parse(r.body.toString('utf8')) as {
        results: { vulns?: { id: string }[] }[];
      };
      body.results.forEach((res, j) => {
        if (res.vulns?.length) hits.push({ dep: chunk[j]!, ids: res.vulns.map((v) => v.id) });
      });
    }
  } catch {
    return { vulnerable: [], failed: true };
  }

  const ids = [...new Set(hits.flatMap((h) => h.ids))].slice(0, MAX_VULN_DETAILS);
  const details = new Map<string, OsvVuln>();
  await pool(ids, 6, async (id) => {
    try {
      const r = await fetcher.get(`https://api.osv.dev/v1/vulns/${encodeURIComponent(id)}`, {
        maxBytes: 1024 * 1024,
        timeoutMs: 8_000,
      });
      if (r.status === 200) details.set(id, JSON.parse(r.body.toString('utf8')) as OsvVuln);
    } catch {
      /* détail facultatif */
    }
  });

  const RANK: Severity[] = ['unknown', 'low', 'moderate', 'high', 'critical'];
  return {
    failed: false,
    vulnerable: hits.map(({ dep, ids: vids }) => {
      let severity: Severity = 'unknown';
      let summary: string | null = null;
      let fixedIn: string | null = null;
      for (const id of vids) {
        const v = details.get(id);
        if (!v) continue;
        const s = (v.database_specific?.severity ?? '').toLowerCase();
        const sev: Severity =
          s === 'critical'
            ? 'critical'
            : s === 'high'
              ? 'high'
              : s === 'moderate' || s === 'medium'
                ? 'moderate'
                : s === 'low'
                  ? 'low'
                  : 'unknown';
        if (RANK.indexOf(sev) > RANK.indexOf(severity)) {
          severity = sev;
          summary = v.summary ?? summary;
        }
        summary ??= v.summary ?? null;
        const fixed = v.affected
          ?.filter((a) => a.package?.name?.toLowerCase() === dep.name.toLowerCase())
          .flatMap((a) => a.ranges ?? [])
          .flatMap((r) => r.events ?? [])
          .map((e) => e.fixed)
          .filter((f): f is string => Boolean(f))
          .sort(compareVersions)
          .find((f) => compareVersions(f, dep.version) > 0);
        if (fixed && (!fixedIn || compareVersions(fixed, fixedIn) > 0)) fixedIn = fixed;
      }
      return {
        ecosystem: dep.ecosystem,
        name: dep.name,
        version: dep.version,
        ids: vids,
        severity,
        summary,
        fixedIn,
      };
    }),
  };
}

export function compareVersions(a: string, b: string): number {
  const pa = a.split(/[.+-]/).map((x) => Number.parseInt(x, 10));
  const pb = b.split(/[.+-]/).map((x) => Number.parseInt(x, 10));
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d;
  }
  return 0;
}
