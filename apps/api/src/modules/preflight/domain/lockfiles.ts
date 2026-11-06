// Lecture des fichiers de dépendances, sans exécuter quoi que ce soit du dépôt analysé.

export interface Dependency {
  ecosystem: 'npm' | 'PyPI';
  name: string;
  version: string;
}

const NPM_VERSION = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

function dedupe(deps: Dependency[]): Dependency[] {
  const seen = new Set<string>();
  return deps.filter((d) => {
    const k = `${d.ecosystem}:${d.name}@${d.version}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** package-lock.json (formats 1, 2 et 3). */
export function parsePackageLock(text: string): Dependency[] {
  const lock = JSON.parse(text) as {
    packages?: Record<string, { version?: string; link?: boolean }>;
    dependencies?: Record<string, { version?: string; dependencies?: unknown }>;
  };
  const out: Dependency[] = [];
  if (lock.packages) {
    for (const [key, p] of Object.entries(lock.packages)) {
      const i = key.lastIndexOf('node_modules/');
      if (i < 0 || p.link || !p.version || !NPM_VERSION.test(p.version)) continue;
      out.push({
        ecosystem: 'npm',
        name: key.slice(i + 'node_modules/'.length),
        version: p.version,
      });
    }
  } else if (lock.dependencies) {
    const walk = (deps: Record<string, { version?: string; dependencies?: unknown }>) => {
      for (const [name, d] of Object.entries(deps)) {
        if (d.version && NPM_VERSION.test(d.version))
          out.push({ ecosystem: 'npm', name, version: d.version });
        if (d.dependencies && typeof d.dependencies === 'object')
          walk(d.dependencies as typeof deps);
      }
    };
    walk(lock.dependencies);
  }
  return dedupe(out);
}

/** pnpm-lock.yaml (formats 5 à 9), sections « packages » (pnpm 10 peut en contenir plusieurs). */
export function parsePnpmLock(text: string): Dependency[] {
  const out: Dependency[] = [];
  for (const header of text.matchAll(/^packages:\s*$/gm)) {
    const rest = text.slice(header.index + header[0].length);
    const end = rest.search(/^\S/m);
    const section = end < 0 ? rest : rest.slice(0, end);
    for (const line of section.split('\n')) {
      // v9 : « 'name@1.2.3': » ou « '@scope/name@1.2.3(peer@x)': » ; v5-6 : « /name/1.2.3: » ou « /@scope/name@1.2.3: »
      const m =
        /^ {2}'?((?:@[^/\s'@]+\/)?[^/\s'@(]+)@(\d[^\s'():_]*)/.exec(line) ??
        /^ {2}\/((?:@[^/\s]+\/)?[^/\s@]+)[/@](\d[^\s:(_]*)/.exec(line);
      if (m && NPM_VERSION.test(m[2]!)) out.push({ ecosystem: 'npm', name: m[1]!, version: m[2]! });
    }
  }
  return dedupe(out);
}

/** yarn.lock (Yarn 1 et Berry). */
export function parseYarnLock(text: string): Dependency[] {
  const out: Dependency[] = [];
  const blocks = text.split(/\n(?=\S)/);
  for (const b of blocks) {
    const header = /^"?((?:@[^/\s"@]+\/)?[^@\s",]+)@/.exec(b);
    const version = /^\s+version:?\s+"?([^"\s]+)"?/m.exec(b);
    if (header && version && NPM_VERSION.test(version[1]!)) {
      out.push({ ecosystem: 'npm', name: header[1]!, version: version[1]! });
    }
  }
  return dedupe(out);
}

/** package.json sans fichier de verrouillage : version minimale de chaque plage (approximation). */
export function parsePackageJson(text: string): {
  deps: Dependency[];
  direct: { name: string; range: string }[];
} {
  const pkg = JSON.parse(text) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const direct = Object.entries(pkg.dependencies ?? {}).map(([name, range]) => ({ name, range }));
  const all = { ...(pkg.devDependencies ?? {}), ...(pkg.dependencies ?? {}) };
  const deps: Dependency[] = [];
  for (const [name, range] of Object.entries(all)) {
    const v = /\d+\.\d+\.\d+/.exec(range)?.[0];
    if (v && !/^(workspace|file|link|git|github|http)/.test(range)) {
      deps.push({ ecosystem: 'npm', name, version: v });
    }
  }
  return { deps: dedupe(deps), direct };
}

/** requirements.txt : seules les versions épinglées (==) sont vérifiables. */
export function parseRequirements(text: string): Dependency[] {
  const out: Dependency[] = [];
  for (const raw of text.split('\n')) {
    const m = /^\s*([A-Za-z0-9][A-Za-z0-9._-]*)(?:\[[^\]]*\])?\s*==\s*([0-9][^\s;#]*)/.exec(raw);
    if (m) out.push({ ecosystem: 'PyPI', name: m[1]!.toLowerCase(), version: m[2]! });
  }
  return dedupe(out);
}

/** Fichiers qui contiennent d'habitude des secrets et n'ont rien à faire dans un dépôt public. */
export function isSecretFile(path: string): boolean {
  const name = path.split('/').pop() ?? '';
  if (
    /(^|\/)(node_modules|vendor|tests?|__tests__|__fixtures__|fixtures?|examples?|samples?|playgrounds?|e2e|spec|mocks?|docs?)\//i.test(
      path,
    )
  ) {
    return false;
  }
  if (/^\.env(\..+)?$/i.test(name)) {
    return !/\.(example|sample|template|dist|defaults?|test|ci)$/i.test(name);
  }
  return (
    /^(id_rsa|id_ed25519|id_ecdsa)$/.test(name) ||
    (/\.(pem|p12|pfx|key)$/i.test(name) && !/\.pub\.pem$/i.test(name)) ||
    /^(credentials|service-account|serviceAccountKey)[\w-]*\.json$/i.test(name)
  );
}
