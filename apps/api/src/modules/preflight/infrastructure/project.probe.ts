import { maskSecrets } from '@devhub/core';
import type { PreflightArchitecture } from '@devhub/contracts';
import {
  IGNORED_DIR,
  SOURCE_EXT,
  analyzeArchitecture,
  isTestPath,
  type SourceText,
  type TreeFile,
} from '../domain/architecture';
import type { DockerFinding, ProjectFacts } from '../domain/facts';
import { pool, type FetchedResource, type SafeFetcher } from './safe-fetch';

const MAX_SOURCES = 180;
const MAX_SOURCE_BYTES = 150 * 1024;
const MAX_TOTAL_BYTES = 4 * 1024 * 1024;
const MAX_CONFIG_FILES = 40;
const MAX_REGISTRY = 40;
const HISTORY_COMMITS = 20;

/** Secrets dont la forme ne laisse aucun doute (pas de motif générique : trop de faux positifs). */
const STRONG = new Set([
  'private_key',
  'aws_access_key',
  'github_token',
  'stripe_key',
  'anthropic_key',
  'openai_key',
  'slack_token',
]);

const PLACEHOLDER =
  /^(password|passwd|pass|secret|changeme|change_me|example|xxx+|\*+|root|admin|postgres|mysql|user|test|<[^>]+>|\$\{[^}]+\}|\$[A-Z_]+)$/i;

/** Chaîne de connexion avec un vrai mot de passe vers un hôte public (pas localhost ni service Docker). */
export function realConnectionStrings(text: string): number {
  let n = 0;
  for (const m of text.matchAll(
    /\b(?:postgres(?:ql)?|mysql|mariadb|mongodb(?:\+srv)?|redis|rediss|amqps?):\/\/[^\s:/@'"`]+:([^\s@/'"`]+)@([^\s/'":`?]+)/gi,
  )) {
    const pwd = decodeURIComponent(m[1]!);
    const host = m[2]!.toLowerCase();
    if (PLACEHOLDER.test(pwd) || pwd.length < 6) continue;
    if (!host.includes('.') || /^(localhost|127\.|0\.0\.0\.0|host\.docker\.internal)/.test(host))
      continue;
    n++;
  }
  return n;
}

export function secretKinds(text: string): string[] {
  const kinds = maskSecrets(text).kinds.filter((k) => STRONG.has(k));
  if (realConnectionStrings(text)) kinds.push('connection_string');
  return [...new Set(kinds)];
}

const major = (v: string) => Number.parseInt(v.replace(/^[^\d]*/, ''), 10);
const stripRange = (r: string) =>
  /(\d+\.\d+\.\d+[\w.-]*)/.exec(r)?.[1] ?? /(\d+(\.\d+)?)/.exec(r)?.[1] ?? '';

/** Analyse du Dockerfile : utilisateur, étiquettes, secrets, ADD distant, .dockerignore. */
export function dockerFindings(text: string, hasDockerignore: boolean): DockerFinding[] {
  const out: DockerFinding[] = [];
  const lines = text.split('\n');
  const stages = new Set(
    lines
      .map((l) => /^\s*FROM\s+\S+\s+AS\s+(\S+)/i.exec(l)?.[1]?.toLowerCase())
      .filter(Boolean) as string[],
  );
  const froms = lines
    .map((l) => /^\s*FROM\s+(?:--platform=\S+\s+)?(\S+)/i.exec(l)?.[1])
    .filter(Boolean) as string[];
  const lastFrom = froms.at(-1) ?? '';
  if (!/^\s*USER\s+(?!root\b|0\b)\S+/im.test(text) && !/nonroot|distroless/i.test(lastFrom))
    out.push({ code: 'root', detail: 'aucune instruction USER : le conteneur tourne en root' });
  const floating = froms.filter(
    (f) =>
      !stages.has(f.toLowerCase()) &&
      f !== 'scratch' &&
      (!/[:@]/.test(f.replace(/^[^/]+\//, '')) || /:latest$/i.test(f)),
  );
  if (floating.length)
    out.push({
      code: 'latest',
      detail: `image sans version fixe : ${[...new Set(floating)].join(', ')}`,
    });
  for (const l of lines) {
    const m =
      /^\s*(ENV|ARG)\s+(\w*(?:SECRET|PASSWORD|TOKEN|API_?KEY|PRIVATE_?KEY)\w*)\s*[= ]\s*(\S+)/i.exec(
        l,
      );
    if (m && !/^\$|^["']?\$\{/.test(m[3]!) && !PLACEHOLDER.test(m[3]!.replace(/["']/g, ''))) {
      out.push({
        code: 'secret_env',
        detail: `${m[1]!.toUpperCase()} ${m[2]} reçoit une valeur dans l’image`,
      });
    }
  }
  if (/^\s*ADD\s+https?:\/\//im.test(text))
    out.push({ code: 'add_url', detail: 'ADD télécharge un fichier distant sans vérification' });
  if (/^\s*COPY\s+(--\S+\s+)*\.\s+\S+/im.test(text) && !hasDockerignore)
    out.push({
      code: 'no_dockerignore',
      detail: 'COPY . sans .dockerignore : .git, .env et node_modules partent dans l’image',
    });
  if (!/^\s*HEALTHCHECK\b/im.test(text))
    out.push({ code: 'no_healthcheck', detail: 'pas de HEALTHCHECK' });
  return out;
}

/** Version minimale déclarée (« >=18 », « ^20.1 », « v20 », « lts/iron » → 18, 20, 20, null). */
export function declaredMajor(spec: string | null | undefined): string | null {
  if (!spec) return null;
  const m = /(\d+)(?:\.(\d+))?/.exec(spec);
  if (!m) return null;
  return m[2] !== undefined && Number(m[1]) === 3 ? `${m[1]}.${m[2]}` : m[1]!;
}

interface Ctx {
  fullName: string;
  branch: string;
  meta: { pushed_at?: string | null; stargazers_count?: number; open_issues_count?: number };
  tree: TreeFile[];
  raw: (path: string, maxBytes?: number) => Promise<string | null>;
  gh: (path: string) => Promise<FetchedResource>;
  githubToken: string | undefined;
  pkgText: string | null;
  lockedVersions: Map<string, string>;
  pyDeps: string[];
}

export async function probeProject(
  fetcher: SafeFetcher,
  ctx: Ctx,
): Promise<{ project: ProjectFacts; architecture: PreflightArchitecture }> {
  const paths = ctx.tree.map((t) => t.path);
  const has = (re: RegExp) => paths.some((p) => re.test(p));
  const first = (re: RegExp) =>
    paths
      .filter((p) => re.test(p) && !IGNORED_DIR.test(p))
      .sort((a, b) => a.split('/').length - b.split('/').length)[0] ?? null;

  type Pkg = {
    scripts?: Record<string, string>;
    engines?: { node?: string };
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const pkg: Pkg = (() => {
    try {
      return ctx.pkgText ? (JSON.parse(ctx.pkgText) as Pkg) : {};
    } catch {
      return {};
    }
  })();
  const npmDeps = [
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.devDependencies ?? {}),
  ];

  // ── Fichiers source : lus pour l'architecture et la recherche de secrets ──
  const sourceCandidates = ctx.tree
    .filter(
      (f) =>
        SOURCE_EXT.test(f.path) &&
        !IGNORED_DIR.test(f.path) &&
        f.size <= MAX_SOURCE_BYTES &&
        !/\.min\.js$/.test(f.path),
    )
    .sort(
      (a, b) =>
        Number(isTestPath(a.path)) - Number(isTestPath(b.path)) ||
        Number(!/(^|\/)(src|app|lib|server|api)\//.test(a.path)) -
          Number(!/(^|\/)(src|app|lib|server|api)\//.test(b.path)) ||
        a.path.split('/').length - b.path.split('/').length,
    );
  const picked: TreeFile[] = [];
  let total = 0;
  for (const f of sourceCandidates) {
    if (picked.length >= MAX_SOURCES || total + f.size > MAX_TOTAL_BYTES) break;
    picked.push(f);
    total += f.size;
  }
  const configFiles = ctx.tree
    .filter(
      (f) =>
        !IGNORED_DIR.test(f.path) &&
        f.size <= MAX_SOURCE_BYTES &&
        !SOURCE_EXT.test(f.path) &&
        /(config|settings|constants|secret|credential|keys?|database|db|firebase|env)[^/]*\.(json|ya?ml|properties|ini|toml|xml|env|cfg|conf|example|sample)$|(^|\/)\.env(\.[\w-]+)?$|appsettings[^/]*\.json$|application[^/]*\.(properties|ya?ml)$/i.test(
          f.path,
        ) &&
        !/(package(-lock)?|composer|tsconfig|jsconfig|pnpm-lock)\.json$|yarn\.lock$/i.test(f.path),
    )
    .slice(0, MAX_CONFIG_FILES);

  const texts = await pool([...picked, ...configFiles], 10, async (f) => {
    const t = await ctx.raw(f.path, MAX_SOURCE_BYTES).catch(() => null);
    return t === null ? null : { path: f.path, text: t };
  });
  const sources: SourceText[] = texts.filter((t): t is SourceText => t !== null);

  const contentSecrets: ProjectFacts['contentSecrets'] = [];
  for (const s of sources)
    for (const kind of secretKinds(s.text)) contentSecrets.push({ kind, file: s.path });

  // ── Fichiers du projet ──
  const readmePath = paths.find((p) => /^readme(\.(md|markdown|rst|txt))?$/i.test(p)) ?? null;
  const gitignorePath = paths.includes('.gitignore') ? '.gitignore' : null;
  const dockerPath = first(/(^|\/)Dockerfile(\.[\w-]+)?$/);
  const tsconfigPath = first(/(^|\/)tsconfig\.json$/);
  const [readme, gitignore, dockerfile, tsconfig, nvmrc, pyVersion, runtimeTxt, pyproject] =
    await Promise.all([
      readmePath ? ctx.raw(readmePath, 256 * 1024) : null,
      gitignorePath ? ctx.raw(gitignorePath, 64 * 1024) : null,
      dockerPath ? ctx.raw(dockerPath, 64 * 1024) : null,
      tsconfigPath ? ctx.raw(tsconfigPath, 64 * 1024) : null,
      paths.includes('.nvmrc')
        ? ctx.raw('.nvmrc', 256)
        : paths.includes('.node-version')
          ? ctx.raw('.node-version', 256)
          : null,
      paths.includes('.python-version') ? ctx.raw('.python-version', 256) : null,
      paths.includes('runtime.txt') ? ctx.raw('runtime.txt', 256) : null,
      paths.includes('pyproject.toml') ? ctx.raw('pyproject.toml', 128 * 1024) : null,
    ]);

  const dockerDir = dockerPath?.includes('/')
    ? dockerPath.slice(0, dockerPath.lastIndexOf('/') + 1)
    : '';
  const nodeFromDocker = dockerfile
    ? /^\s*FROM\s+(?:--platform=\S+\s+)?node:(\d+)/im.exec(dockerfile)?.[1]
    : undefined;
  const pyFromDocker = dockerfile
    ? /^\s*FROM\s+(?:--platform=\S+\s+)?python:(3\.\d+)/im.exec(dockerfile)?.[1]
    : undefined;
  const pyRequires = pyproject
    ? /requires-python\s*=\s*["']([^"']+)["']/.exec(pyproject)?.[1]
    : undefined;

  let tsStrict: boolean | null = null;
  if (tsconfig) {
    const clean = tsconfig.replace(/\/\*[\s\S]*?\*\/|(^|[^:])\/\/.*$/gm, '$1');
    tsStrict = /"strict"\s*:\s*true/.test(clean)
      ? true
      : /"strict"\s*:\s*false/.test(clean)
        ? false
        : /"extends"/.test(clean)
          ? null
          : false;
  }

  const linters = [
    has(/(^|\/)(eslint\.config\.[cm]?[jt]s|\.eslintrc(\.\w+)?)$/) && 'ESLint',
    has(/(^|\/)(\.prettierrc(\.\w+)?|prettier\.config\.[cm]?js)$/) && 'Prettier',
    has(/(^|\/)biome\.jsonc?$/) && 'Biome',
    has(/(^|\/)\.?oxlintrc\.json$/) && 'oxlint',
    (has(/(^|\/)ruff\.toml$/) || /\[tool\.ruff/.test(pyproject ?? '')) && 'Ruff',
    has(/(^|\/)\.flake8$/) && 'Flake8',
  ].filter((x): x is string => typeof x === 'string');

  // ── Historique : secrets ajoutés dans les derniers commits (jeton GitHub nécessaire) ──
  let historySecrets: ProjectFacts['historySecrets'] = null;
  let commitsScanned = 0;
  if (ctx.githubToken) {
    try {
      const list = await ctx.gh(
        `/repos/${ctx.fullName}/commits?sha=${encodeURIComponent(ctx.branch)}&per_page=${HISTORY_COMMITS}`,
      );
      const shas =
        list.status === 200
          ? (JSON.parse(list.body.toString('utf8')) as { sha: string }[]).map((c) => c.sha)
          : [];
      const found: NonNullable<ProjectFacts['historySecrets']> = [];
      await pool(shas, 4, async (sha) => {
        const r = await ctx.gh(`/repos/${ctx.fullName}/commits/${sha}`).catch(() => null);
        if (!r || r.status !== 200) return;
        commitsScanned++;
        const c = JSON.parse(r.body.toString('utf8')) as {
          files?: { filename: string; patch?: string }[];
        };
        for (const f of c.files ?? []) {
          const added = (f.patch ?? '')
            .split('\n')
            .filter((l) => l.startsWith('+') && !l.startsWith('+++'))
            .join('\n');
          for (const kind of secretKinds(added))
            found.push({ kind, commit: sha.slice(0, 7), file: f.filename });
        }
      });
      historySecrets = found;
    } catch {
      historySecrets = null;
    }
  }

  // ── Registre npm : versions en retard, paquets dépréciés, abandonnés, scripts d'installation ──
  const direct = Object.entries(pkg.dependencies ?? {}).slice(0, MAX_REGISTRY);
  const outdated: ProjectFacts['outdated'] = [];
  const deprecated: ProjectFacts['deprecated'] = [];
  const installScripts: string[] = [];
  const abandoned: ProjectFacts['abandoned'] = [];
  let registryChecked = 0;
  const now = Date.now();
  await pool(direct, 8, async ([name, range]) => {
    try {
      const r = await fetcher.get(`https://registry.npmjs.org/${name.replace('/', '%2F')}`, {
        maxBytes: 8 * 1024 * 1024,
        timeoutMs: 8_000,
        headers: { Accept: 'application/vnd.npm.install-v1+json' },
      });
      if (r.status !== 200) return;
      const doc = JSON.parse(r.body.toString('utf8')) as {
        modified?: string;
        'dist-tags'?: { latest?: string };
        versions?: Record<string, { deprecated?: string; hasInstallScript?: boolean }>;
      };
      registryChecked++;
      const latest = doc['dist-tags']?.latest ?? '';
      const current = ctx.lockedVersions.get(name) ?? stripRange(range);
      const v = doc.versions?.[current];
      const latestInfo = doc.versions?.[latest];
      const dep = latestInfo?.deprecated ?? v?.deprecated;
      if (dep) deprecated.push({ name, message: dep.slice(0, 200) });
      if (v?.hasInstallScript) installScripts.push(name);
      const behind = latest && current ? major(latest) - major(current) : 0;
      if (Number.isFinite(behind) && behind >= 1)
        outdated.push({ name, current, latest, majorsBehind: behind });
      if (doc.modified && now - Date.parse(doc.modified) > 2 * 365 * 86_400_000)
        abandoned.push({ name, lastPublish: doc.modified.slice(0, 10) });
    } catch {
      /* registre injoignable pour ce paquet */
    }
  });

  const project: ProjectFacts = {
    pushedAt: ctx.meta.pushed_at ?? null,
    stars: ctx.meta.stargazers_count ?? 0,
    openIssues: ctx.meta.open_issues_count ?? 0,
    readme: {
      present: readme !== null,
      bytes: readme?.length ?? 0,
      hasSetup:
        /\b(install|installation|getting started|démarrage|lancer|usage|utilisation|npm (i|install|run)|pnpm|yarn|pip install|docker compose|make )\b/i.test(
          readme ?? '',
        ),
    },
    gitignore: {
      present: gitignore !== null,
      ignoresEnv:
        /(^|\n)\s*\/?(\*\.env|\.env(\*|\.\*|\.local)?)\s*($|\n)/m.test(gitignore ?? '') ||
        /(^|\n)\s*\.env/m.test(gitignore ?? ''),
      ignoresNodeModules: ctx.pkgText ? /node_modules/.test(gitignore ?? '') : null,
    },
    envExample: has(
      /(^|\/)(\.env\.(example|sample|template|dist|defaults)|example\.env|env\.example)$/i,
    ),
    usesEnvVars: sources.some((s) =>
      /process\.env\.|import\.meta\.env\.|os\.environ|os\.getenv\(|getenv\(/.test(s.text),
    ),
    ci: paths.filter((p) =>
      /^\.github\/workflows\/[^/]+\.ya?ml$|^\.gitlab-ci\.yml$|^bitbucket-pipelines\.yml$|^\.circleci\/config\.yml$|^azure-pipelines\.yml$|^Jenkinsfile$|^codemagic\.ya?ml$/.test(
        p,
      ),
    ),
    testFiles: ctx.tree.filter(
      (f) => !IGNORED_DIR.test(f.path) && isTestPath(f.path) && SOURCE_EXT.test(f.path),
    ).length,
    sourceFiles: ctx.tree.filter(
      (f) => !IGNORED_DIR.test(f.path) && SOURCE_EXT.test(f.path) && !isTestPath(f.path),
    ).length,
    hasTestScript: ctx.pkgText
      ? Boolean(pkg.scripts?.test && !/no test specified/i.test(pkg.scripts.test))
      : null,
    linters,
    docker:
      dockerPath && dockerfile
        ? {
            path: dockerPath,
            findings: dockerFindings(
              dockerfile,
              paths.includes(`${dockerDir}.dockerignore`) || paths.includes('.dockerignore'),
            ),
          }
        : null,
    runtime: {
      node: declaredMajor(pkg.engines?.node) ?? declaredMajor(nvmrc) ?? nodeFromDocker ?? null,
      python:
        pyFromDocker ??
        declaredMajor(pyVersion) ??
        declaredMajor(runtimeTxt?.replace(/^python-/, '')) ??
        declaredMajor(pyRequires) ??
        null,
    },
    tsStrict,
    lockfiles: ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb', 'bun.lock'].filter(
      (l) => paths.includes(l),
    ),
    contentSecrets: contentSecrets.slice(0, 20),
    filesScanned: sources.length,
    historySecrets: historySecrets?.slice(0, 20) ?? null,
    commitsScanned,
    outdated: outdated.sort((a, b) => b.majorsBehind - a.majorsBehind).slice(0, 15),
    deprecated: deprecated.slice(0, 10),
    installScripts: installScripts.slice(0, 15),
    abandoned: abandoned.slice(0, 10),
    registryChecked,
  };

  const architecture = analyzeArchitecture({
    tree: ctx.tree,
    sources: sources.filter((s) => SOURCE_EXT.test(s.path)),
    npmDeps,
    pyDeps: ctx.pyDeps,
  });
  return { project, architecture };
}
