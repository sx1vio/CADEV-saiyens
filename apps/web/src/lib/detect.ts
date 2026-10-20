/**
 * Analyse locale d'une question, qui fonctionne sans réseau :
 * - S9 : étiquettes détectées depuis une trace d'erreur
 * - O9 : masquage des secrets avant la mise en file
 * - S8 : jauge de qualité de la question
 * - Piste locale : premières vérifications pour des erreurs connues (marquée comme telle)
 */

type Pattern = { re: RegExp; tags: string[] };

/**
 * Motifs partagés front/back (dictionnaire à enrichir). Chaque slug existe dans le référentiel
 * de l'API (`TAG_REFERENCE` de @devhub/core) : sinon la suggestion disparaît sans bruit (S9).
 */
export const TAG_PATTERNS: Pattern[] = [
  {
    re: /ModuleNotFoundError|ImportError|Traceback \(most recent call last\)|pip install|\.py\b|venv/i,
    tags: ['python'],
  },
  { re: /django|manage\.py|ORM|makemigrations/i, tags: ['django', 'python'] },
  { re: /fastapi|uvicorn|pydantic/i, tags: ['fastapi', 'python'] },
  {
    // Codes d'erreur en mots entiers : « ModuleNotFoundError » (Python) contient « eNotFound ».
    re: /\b(ECONNREFUSED|ENOTFOUND|EADDRINUSE)\b|node_modules|npm ERR|require\(|process\.env/i,
    tags: ['nodejs'],
  },
  { re: /Cannot find module|ERR_MODULE_NOT_FOUND|package\.json/i, tags: ['nodejs'] },
  { re: /TS\d{4}|tsconfig|\.tsx?\b|Type '.*' is not assignable/i, tags: ['typescript'] },
  { re: /React|useEffect|useState|jsx|Hydration|hook/i, tags: ['react'] },
  { re: /next\.config|getServerSideProps|app router|next\/|NEXT_/i, tags: ['nextjs', 'react'] },
  { re: /Expo|react-native|Metro bundler/i, tags: ['react-native'] },
  { re: /nestjs|@nestjs|@Injectable/i, tags: ['nestjs', 'nodejs'] },
  { re: /express\(|app\.listen|req\.body|\bExpress\b/, tags: ['express', 'nodejs'] },
  {
    re: /SQLSTATE|syntax error at or near|relation ".*" does not exist|psql|postgres/i,
    tags: ['postgresql', 'sql'],
  },
  { re: /ER_ACCESS_DENIED|mysql|MariaDB/i, tags: ['mysql', 'sql'] },
  { re: /MongoServerError|mongoose|MongoNetworkError/i, tags: ['mongodb'] },
  { re: /redis|ECONNRESET.*6379/i, tags: ['redis'] },
  { re: /docker|Dockerfile|docker-compose|container|compose\.ya?ml/i, tags: ['docker'] },
  { re: /nginx|502 Bad Gateway|upstream|proxy_pass/i, tags: ['nginx'] },
  { re: /kubectl|CrashLoopBackOff|ImagePullBackOff|k8s/i, tags: ['kubernetes'] },
  { re: /Gradle|AndroidManifest|adb |Kotlin|ANR/i, tags: ['android', 'kotlin'] },
  { re: /flutter|dart:|pubspec\.yaml|Widget build/i, tags: ['flutter', 'dart'] },
  { re: /Xcode|CocoaPods|Swift|UIKit/i, tags: ['swift'] },
  { re: /laravel|artisan|Eloquent|composer\.json/i, tags: ['laravel', 'php'] },
  { re: /PHP (Fatal|Warning|Parse) error|\$_POST|\.php\b/i, tags: ['php'] },
  { re: /Spring|@Autowired|NullPointerException|\.java\b|Maven/i, tags: ['java', 'spring'] },
  { re: /panic:|goroutine|go\.mod/i, tags: ['go'] },
  { re: /cargo|borrow checker|rustc|E0\d{3}/i, tags: ['rust'] },
  { re: /CORS|Access-Control-Allow-Origin|preflight/i, tags: ['rest-api', 'javascript'] },
  {
    re: /mobile money|MTN MoMo|Orange Money|Wave|Flutterwave|Paystack|CinetPay|FedaPay|Kkiapay/i,
    tags: ['mobile-money'],
  },
  { re: /firebase|firestore|FirebaseError/i, tags: ['firebase'] },
  { re: /supabase|RLS|row level security/i, tags: ['postgresql'] },
  { re: /prisma|PrismaClient|P\d{4}/i, tags: ['nodejs', 'sql'] },
  { re: /service worker|workbox|IndexedDB|manifest\.webmanifest/i, tags: ['pwa'] },
  { re: /github actions|workflow|\.github\/workflows/i, tags: ['devops', 'git'] },
  { re: /git (push|pull|rebase|merge)|merge conflict|detached HEAD/i, tags: ['git'] },
  { re: /tailwind|className=/i, tags: ['tailwind', 'css'] },
  { re: /websocket|socket\.io|ws:\/\//i, tags: ['javascript'] },
  { re: /graphql|Apollo|resolver/i, tags: ['graphql'] },
  { re: /JWT|OAuth|bcrypt|XSS|CSRF|injection/i, tags: ['security'] },
];

export function detectTags(text: string, max = 5): string[] {
  const found: string[] = [];
  for (const p of TAG_PATTERNS) {
    if (p.re.test(text)) for (const t of p.tags) if (!found.includes(t)) found.push(t);
    if (found.length >= max) break;
  }
  return found.slice(0, max);
}

/* ---------------- O9 : secrets ---------------- */

const SECRET_PATTERNS: { name: string; re: RegExp }[] = [
  { name: 'AWS', re: /AKIA[0-9A-Z]{16}/g },
  { name: 'GitHub', re: /gh[pousr]_[A-Za-z0-9]{36,}/g },
  { name: 'Slack', re: /xox[baprs]-[A-Za-z0-9-]{10,}/g },
  { name: 'Stripe', re: /(sk|rk)_(live|test)_[A-Za-z0-9]{16,}/g },
  { name: 'Google', re: /AIza[0-9A-Za-z_-]{35}/g },
  { name: 'Anthropic/OpenAI', re: /sk-(ant-)?[A-Za-z0-9_-]{20,}/g },
  { name: 'JWT', re: /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g },
  {
    name: 'URL de connexion',
    re: /\b(postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|amqp):\/\/[^:\s]+:[^@\s]+@/gi,
  },
  {
    name: 'Clé privée',
    re: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  },
  {
    name: 'Mot de passe',
    re: /\b(password|passwd|pwd|secret|api[_-]?key|token)\s*[=:]\s*["']?[^\s"']{6,}/gi,
  },
];

export function maskSecrets(text: string): { text: string; found: string[] } {
  const found = new Set<string>();
  let out = text;
  for (const { name, re } of SECRET_PATTERNS) {
    out = out.replace(re, (m) => {
      found.add(name);
      if (name === 'URL de connexion') return m.replace(/:\/\/([^:\s]+):[^@\s]+@/, '://$1:••••••@');
      if (name === 'Mot de passe') return m.replace(/([=:]\s*["']?)[^\s"']+/, '$1••••••');
      return '••••••[masqué]';
    });
  }
  return { text: out, found: [...found] };
}

/* ---------------- S8 : qualité ---------------- */

export interface QualityCheck {
  key: 'title' | 'goal' | 'tried' | 'code' | 'env' | 'tags';
  ok: boolean;
}

export function questionQuality(q: {
  title: string;
  body: string;
  tried?: string;
  codeSnippet: string;
  environment?: string;
  tagIds: string[];
}): { score: number; checks: QualityCheck[] } {
  const checks: QualityCheck[] = [
    { key: 'title', ok: q.title.trim().length >= 15 },
    { key: 'goal', ok: q.body.trim().length >= 40 },
    { key: 'tried', ok: (q.tried ?? '').trim().length >= 20 },
    { key: 'code', ok: q.codeSnippet.trim().length >= 10 },
    { key: 'env', ok: /\d+(\.\d+)/.test(q.environment ?? '') || /\d+(\.\d+)/.test(q.body) },
    { key: 'tags', ok: q.tagIds.length >= 1 },
  ];
  const weights = { title: 15, goal: 20, tried: 20, code: 20, env: 15, tags: 10 };
  const score = checks.reduce((s, c) => s + (c.ok ? weights[c.key] : 0), 0);
  return { score, checks };
}

/* ---------------- Piste locale (règles) ---------------- */

const HINTS: { re: RegExp; hint: string }[] = [
  {
    re: /502 Bad Gateway|upstream/i,
    hint: "Un 502 derrière nginx veut dire que nginx n'arrive pas à joindre ton application.\n\n1. Dans Docker, `proxy_pass` doit viser le **nom du service** (`http://api:3000`), pas `localhost`.\n2. Vérifie que l'app écoute sur `0.0.0.0` et pas seulement `127.0.0.1`.\n3. Regarde `docker compose logs api` : l'app a peut-être planté au démarrage.",
  },
  {
    re: /ECONNREFUSED/i,
    hint: "`ECONNREFUSED` : rien n'écoute à l'adresse appelée.\n\n1. Le service cible est-il démarré ?\n2. Dans un conteneur, `localhost` désigne le conteneur lui-même : utilise le nom du service Docker.\n3. Vérifie le port et la variable d'environnement qui le fixe.",
  },
  {
    re: /CORS|Access-Control-Allow-Origin/i,
    hint: "Erreur CORS : c'est le **serveur** qui doit autoriser l'origine du front.\n\n1. Ajoute l'en-tête `Access-Control-Allow-Origin` avec l'URL exacte du front (pas `*` si tu envoies des cookies).\n2. Réponds aussi aux requêtes `OPTIONS` (preflight).\n3. Avec des cookies : `credentials: 'include'` côté front et `Access-Control-Allow-Credentials: true` côté serveur.",
  },
  {
    re: /ModuleNotFoundError|ImportError/i,
    hint: "Le module n'est pas installé dans l'environnement qui exécute ton code.\n\n1. Active le bon environnement virtuel (`source .venv/bin/activate`).\n2. Installe avec le même interpréteur : `python -m pip install <paquet>`.\n3. Vérifie le nom du paquet sur PyPI : il diffère parfois du nom d'import.",
  },
  {
    re: /Cannot find module|ERR_MODULE_NOT_FOUND/i,
    hint: "Node ne trouve pas le module.\n\n1. `npm install` a-t-il été lancé dans le bon dossier ?\n2. En ESM, les imports relatifs ont besoin de l'extension (`./utils.js`).\n3. Vérifie la casse du chemin : Linux la respecte, Windows non.",
  },
  {
    re: /Hydration/i,
    hint: "Erreur d'hydratation : le HTML du serveur diffère du premier rendu client.\n\n1. Cherche `Date.now()`, `Math.random()`, `window` ou `localStorage` lus pendant le rendu.\n2. Déplace ces lectures dans un `useEffect`.\n3. Vérifie qu'aucune balise n'est mal imbriquée (`<div>` dans `<p>`).",
  },
  {
    re: /relation ".*" does not exist/i,
    hint: 'PostgreSQL ne trouve pas la table.\n\n1. Les migrations ont-elles été appliquées sur **cette** base ?\n2. Vérifie le schéma (`search_path`) et la casse : un nom entre guillemets est sensible à la casse.\n3. Contrôle `DATABASE_URL` : tu vises peut-être une autre base.',
  },
  {
    re: /CrashLoopBackOff/i,
    hint: "Le pod redémarre en boucle.\n\n1. `kubectl logs <pod> --previous` montre l'erreur du dernier démarrage.\n2. Vérifie les variables d'environnement et les secrets montés.\n3. Une sonde de vivacité trop stricte peut aussi tuer le conteneur.",
  },
  {
    re: /Gradle|Could not resolve/i,
    hint: 'Problème de build Gradle.\n\n1. Synchronise le projet et vérifie la version du plugin Android Gradle face à ta version de Gradle.\n2. Vide le cache : `./gradlew clean` puis `--refresh-dependencies`.\n3. Vérifie les dépôts (`google()`, `mavenCentral()`) dans `settings.gradle`.',
  },
  {
    re: /webhook|callback|mobile money|MoMo|Flutterwave|Paystack|CinetPay|FedaPay/i,
    hint: "Paiement mobile money : la plupart des soucis viennent du webhook.\n\n1. L'URL de callback doit être publique en HTTPS (utilise un tunnel en local).\n2. Vérifie la signature du webhook avec la clé **secrète** du bon environnement (sandbox ou live).\n3. Rends ton traitement idempotent : le même événement peut arriver plusieurs fois.",
  },
];

export function localHint(text: string): string | null {
  for (const h of HINTS) if (h.re.test(text)) return h.hint;
  return null;
}
