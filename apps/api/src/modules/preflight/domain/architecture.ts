import type { PreflightArchitecture } from '@devhub/contracts';

// Architecture d'un dépôt, calculée en lisant le code : graphe des imports entre fichiers,
// cycles, fichiers « carrefour », fichiers orphelins. Reprend l'idée de Boby (hackathon IBM,
// mai 2026) en TypeScript, avec les alias (@/, ~/), les monorepos et Python.

export const SOURCE_EXT =
  /\.(tsx?|jsx?|mjs|cjs|vue|svelte|py|go|rb|php|java|kt|dart|rs|cs|swift)$/i;

const LANGUAGE: [RegExp, string][] = [
  [/\.(tsx?|mts|cts)$/i, 'TypeScript'],
  [/\.(jsx?|mjs|cjs)$/i, 'JavaScript'],
  [/\.vue$/i, 'Vue'],
  [/\.svelte$/i, 'Svelte'],
  [/\.py$/i, 'Python'],
  [/\.go$/i, 'Go'],
  [/\.rb$/i, 'Ruby'],
  [/\.php$/i, 'PHP'],
  [/\.(java)$/i, 'Java'],
  [/\.(kt|kts)$/i, 'Kotlin'],
  [/\.dart$/i, 'Dart'],
  [/\.rs$/i, 'Rust'],
  [/\.cs$/i, 'C#'],
  [/\.swift$/i, 'Swift'],
  [/\.(css|scss|sass|less)$/i, 'CSS'],
  [/\.html?$/i, 'HTML'],
  [/\.sql$/i, 'SQL'],
];

/** Dossiers jamais analysés : dépendances, builds, fichiers générés. */
export const IGNORED_DIR =
  /(^|\/)(node_modules|dist|build|out|\.next|\.nuxt|\.output|coverage|vendor|venv|\.venv|__pycache__|target|\.git|generated|\.turbo|\.cache|Pods|\.dart_tool)\//;

export const isTestPath = (p: string) =>
  /(^|\/)(__tests__|tests?|spec|e2e|cypress|playwright)\//i.test(p) ||
  /\.(test|spec|e2e)\.[cm]?[jt]sx?$/i.test(p) ||
  /(^|\/)test_[^/]+\.py$|_test\.(py|go)$/i.test(p);

export interface TreeFile {
  path: string;
  size: number;
}

export interface SourceText {
  path: string;
  text: string;
}

const languageOf = (p: string) => LANGUAGE.find(([re]) => re.test(p))?.[1] ?? null;

/** Points d'entrée : normal que rien ne les importe. */
const ENTRY =
  /(^|\/)(index|main|app|server|cli|worker|page|layout|route|routes|middleware|handler|manage|wsgi|asgi|setup|conftest|__init__|__main__|vite\.config|next\.config|tailwind\.config|postcss\.config|eslint\.config|vitest\.config|playwright\.config|jest\.config|webpack\.config|astro\.config|nuxt\.config|svelte\.config|babel\.config|metro\.config|prettier\.config)\.[a-z]+$/i;
/** Fichiers chargés par convention (routes de framework, migrations, scripts). */
const CONVENTION =
  /(^|\/)(pages|app|routes|migrations|scripts|bin|public|seeds?|fixtures|stories|\.storybook|e2e|tests?)\//i;

/** Imports relatifs ou par alias d'un fichier (les paquets npm/pip sont ignorés). */
export function importsOf(path: string, text: string): string[] {
  const out = new Set<string>();
  if (/\.py$/i.test(path)) {
    for (const m of text.matchAll(/^\s*from\s+(\.+[\w.]*|[\w.]+)\s+import\b/gm)) out.add(m[1]!);
    for (const m of text.matchAll(/^\s*import\s+([\w.]+)/gm)) out.add(m[1]!);
    return [...out];
  }
  const patterns = [
    /\bimport\s+(?:type\s+)?(?:[\w*{}\s,]+\s+from\s+)?['"]([^'"]+)['"]/g,
    /\bexport\s+(?:type\s+)?(?:\*|\{[^}]*\})\s+from\s+['"]([^'"]+)['"]/g,
    /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const re of patterns) {
    for (const m of text.matchAll(re)) {
      const spec = m[1]!;
      if (
        spec.startsWith('.') ||
        spec.startsWith('@/') ||
        spec.startsWith('~/') ||
        spec.startsWith('src/')
      )
        out.add(spec);
    }
  }
  return [...out];
}

const JS_EXT = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.vue', '.svelte'];
const INDEX = ['/index.ts', '/index.tsx', '/index.js', '/index.jsx', '/index.mjs'];

function normalize(parts: string[]): string {
  const out: string[] = [];
  for (const p of parts) {
    if (!p || p === '.') continue;
    if (p === '..') out.pop();
    else out.push(p);
  }
  return out.join('/');
}

/** Racine du paquet qui contient `path` (dossier qui porte src/), pour résoudre « @/ ». */
function srcRoot(path: string): string {
  const i = path.lastIndexOf('/src/');
  if (i >= 0) return path.slice(0, i + 5);
  return path.startsWith('src/') ? 'src/' : '';
}

/** Fichier du dépôt visé par un import, ou null (paquet externe, fichier non lu). */
export function resolveImport(from: string, spec: string, files: Set<string>): string | null {
  const dir = from.includes('/') ? from.slice(0, from.lastIndexOf('/')) : '';
  if (/\.py$/i.test(from)) {
    let base: string;
    if (spec.startsWith('.')) {
      const dots = /^\.+/.exec(spec)![0].length;
      const up = dir.split('/').slice(0, Math.max(0, dir.split('/').length - (dots - 1)));
      base = normalize([...up, ...spec.slice(dots).split('.')]);
    } else base = spec.replace(/\./g, '/');
    for (const c of [`${base}.py`, `${base}/__init__.py`]) if (files.has(c)) return c;
    return null;
  }
  let base: string;
  if (spec.startsWith('@/') || spec.startsWith('~/')) base = srcRoot(from) + spec.slice(2);
  else if (spec.startsWith('src/')) base = (srcRoot(from) || 'src/').replace(/src\/$/, '') + spec;
  else base = normalize([...dir.split('/'), ...spec.split('/')]);
  base = base.replace(/\/+/g, '/');
  for (const ext of JS_EXT) if (files.has(base + ext)) return base + ext;
  // import './x.js' compilé depuis x.ts
  const noJs = base.replace(/\.(m?js|cjs|jsx)$/, '');
  if (noJs !== base)
    for (const ext of ['.ts', '.tsx', '.mts']) if (files.has(noJs + ext)) return noJs + ext;
  for (const ext of INDEX) if (files.has(base + ext)) return base + ext;
  return null;
}

/** Composantes fortement connexes (Tarjan) de taille > 1 : les cycles d'imports. */
export function findCycles(graph: Map<string, Set<string>>): string[][] {
  let index = 0;
  const idx = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const on = new Set<string>();
  const out: string[][] = [];
  const visit = (v: string) => {
    // Parcours itératif : un gros dépôt dépasserait la pile en récursif.
    const work: [string, Iterator<string>][] = [];
    const enter = (n: string) => {
      idx.set(n, index);
      low.set(n, index);
      index++;
      stack.push(n);
      on.add(n);
      work.push([n, (graph.get(n) ?? new Set<string>()).values()]);
    };
    enter(v);
    while (work.length) {
      const [n, it] = work[work.length - 1]!;
      const next = it.next();
      if (!next.done) {
        const w = next.value;
        if (!idx.has(w)) enter(w);
        else if (on.has(w)) low.set(n, Math.min(low.get(n)!, idx.get(w)!));
        continue;
      }
      work.pop();
      if (work.length) {
        const parent = work[work.length - 1]![0];
        low.set(parent, Math.min(low.get(parent)!, low.get(n)!));
      }
      if (low.get(n) === idx.get(n)) {
        const comp: string[] = [];
        let w: string;
        do {
          w = stack.pop()!;
          on.delete(w);
          comp.push(w);
        } while (w !== n);
        if (comp.length > 1) out.push(comp.sort());
      }
    }
  };
  for (const v of graph.keys()) if (!idx.has(v)) visit(v);
  return out.sort((a, b) => b.length - a.length);
}

const FRAMEWORKS: [string, string][] = [
  ['next', 'Next.js'],
  ['nuxt', 'Nuxt'],
  ['react-native', 'React Native'],
  ['expo', 'Expo'],
  ['react', 'React'],
  ['vue', 'Vue'],
  ['svelte', 'Svelte'],
  ['@angular/core', 'Angular'],
  ['astro', 'Astro'],
  ['@nestjs/core', 'NestJS'],
  ['express', 'Express'],
  ['fastify', 'Fastify'],
  ['hono', 'Hono'],
  ['koa', 'Koa'],
  ['prisma', 'Prisma'],
  ['@prisma/client', 'Prisma'],
  ['drizzle-orm', 'Drizzle'],
  ['typeorm', 'TypeORM'],
  ['mongoose', 'Mongoose'],
  ['sequelize', 'Sequelize'],
  ['firebase', 'Firebase'],
  ['@supabase/supabase-js', 'Supabase'],
  ['tailwindcss', 'Tailwind CSS'],
  ['vite', 'Vite'],
  ['electron', 'Electron'],
  ['socket.io', 'Socket.IO'],
];
const FRONT = new Set(['Next.js', 'Nuxt', 'React', 'Vue', 'Svelte', 'Angular', 'Astro']);
const BACK = new Set([
  'NestJS',
  'Express',
  'Fastify',
  'Hono',
  'Koa',
  'Django',
  'Flask',
  'FastAPI',
  'Laravel',
  'Spring',
  'Go',
]);

export function detectFrameworks(npmDeps: string[], paths: string[], pyDeps: string[]): string[] {
  const found = new Set<string>();
  const deps = new Set(npmDeps);
  for (const [dep, name] of FRAMEWORKS) if (deps.has(dep)) found.add(name);
  const py = new Set(pyDeps.map((d) => d.toLowerCase()));
  if (py.has('django') || paths.some((p) => /(^|\/)manage\.py$/.test(p))) found.add('Django');
  if (py.has('flask')) found.add('Flask');
  if (py.has('fastapi')) found.add('FastAPI');
  if (paths.some((p) => /(^|\/)pubspec\.yaml$/.test(p))) found.add('Flutter');
  if (paths.some((p) => /(^|\/)artisan$/.test(p))) found.add('Laravel');
  if (paths.some((p) => /(^|\/)pom\.xml$|build\.gradle(\.kts)?$/.test(p))) found.add('Spring');
  if (paths.some((p) => /(^|\/)go\.mod$/.test(p))) found.add('Go');
  return [...found];
}

export function projectKind(frameworks: string[], paths: string[]): string {
  const mono = paths.some((p) =>
    /^(pnpm-workspace\.yaml|lerna\.json|nx\.json|turbo\.json)$/.test(p),
  );
  const front = frameworks.some((f) => FRONT.has(f));
  const back = frameworks.some((f) => BACK.has(f));
  const mobile = frameworks.some((f) => ['React Native', 'Expo', 'Flutter'].includes(f));
  const base = mobile
    ? 'Application mobile'
    : front && back
      ? 'Full-stack'
      : back
        ? 'API / serveur'
        : front
          ? 'Application web'
          : 'Projet';
  return mono ? `Monorepo · ${base}` : base;
}

/**
 * Analyse complète. `tree` : tous les fichiers du dépôt (chemin, taille) ; `sources` : le texte
 * des fichiers source lus (plafonné par la sonde).
 */
export function analyzeArchitecture(input: {
  tree: TreeFile[];
  sources: SourceText[];
  npmDeps: string[];
  pyDeps: string[];
}): PreflightArchitecture {
  const files = input.tree.filter((f) => !IGNORED_DIR.test(f.path));
  const paths = files.map((f) => f.path);
  const source = files.filter((f) => SOURCE_EXT.test(f.path));

  const langs = new Map<string, { files: number; bytes: number }>();
  for (const f of files) {
    const l = languageOf(f.path);
    if (!l) continue;
    const e = langs.get(l) ?? { files: 0, bytes: 0 };
    e.files++;
    e.bytes += f.size;
    langs.set(l, e);
  }

  const read = input.sources.filter((s) => !isTestPath(s.path));
  const known = new Set(read.map((s) => s.path));
  const graph = new Map<string, Set<string>>();
  const dependents = new Map<string, number>();
  let imports = 0;
  for (const s of read) {
    const out = new Set<string>();
    for (const spec of importsOf(s.path, s.text)) {
      const target = resolveImport(s.path, spec, known);
      if (target && target !== s.path) out.add(target);
    }
    graph.set(s.path, out);
    imports += out.size;
    for (const t of out) dependents.set(t, (dependents.get(t) ?? 0) + 1);
  }

  const frameworks = detectFrameworks(input.npmDeps, paths, input.pyDeps);
  const all = input.sources;
  const count = (re: RegExp, filter: (p: string) => boolean = () => true) =>
    all.filter((s) => filter(s.path)).reduce((n, s) => n + (s.text.match(re)?.length ?? 0), 0);

  return {
    kind: projectKind(frameworks, paths),
    frameworks,
    totalFiles: files.length,
    sourceFiles: source.length,
    analysedFiles: read.length,
    languages: [...langs.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 8),
    imports,
    cycles: findCycles(graph)
      .slice(0, 5)
      .map((c) => c.slice(0, 8)),
    hubs: [...dependents.entries()]
      .sort((a, b) => b[1] - a[1])
      .filter(([, n]) => n >= 3)
      .slice(0, 8)
      .map(([file, n]) => ({ file, dependents: n })),
    largest: read
      .map((s) => ({ file: s.path, lines: s.text.split('\n').length }))
      .sort((a, b) => b.lines - a.lines)
      .slice(0, 6),
    orphans: read
      .filter((s) => !dependents.has(s.path) && !ENTRY.test(s.path) && !CONVENTION.test(s.path))
      .filter((s) => /\.(tsx?|jsx?|vue|svelte|py)$/i.test(s.path))
      .filter((s) => !/\.d\.ts$|\.config\.|(^|\/)types?\.ts$/i.test(s.path))
      .map((s) => s.path)
      .slice(0, 12),
    testFiles: files.filter((f) => isTestPath(f.path)).length,
    todos: count(/\b(TODO|FIXME|HACK|XXX)\b/g),
    consoleLogs: count(
      /\bconsole\.log\(/g,
      (p) => /\.(tsx?|jsx?|vue|svelte)$/i.test(p) && !isTestPath(p),
    ),
    anyTypes: count(/:\s*any\b|as\s+any\b|<any>/g, (p) => /\.tsx?$/i.test(p) && !isTestPath(p)),
  };
}
