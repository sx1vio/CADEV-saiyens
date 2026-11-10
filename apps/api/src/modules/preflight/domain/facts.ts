import type { PreflightArchitecture } from '@devhub/contracts';

// Faits collectés par les sondes (infrastructure), transformés en contrôles par des règles pures.

export type AssetType = 'script' | 'style' | 'image' | 'other';

export interface AssetFact {
  url: string;
  type: AssetType;
  status: number;
  /** Octets transférés : Content-Length si présent, sinon estimation à partir du corps décodé. */
  bytes: number;
  /** Corps compressé (gzip, br, zstd…). */
  encoded: boolean;
  cacheControl: string | null;
  contentType?: string | null;
}

export interface SiteFacts {
  requestedUrl: string;
  finalUrl: string;
  redirects: string[];
  status: number;
  ttfbMs: number;
  /** En-têtes de la page finale, noms en minuscules. */
  headers: Record<string, string>;
  html: {
    bytes: number;
    encoded: boolean;
    hasViewport: boolean;
    lang: string | null;
    title: string | null;
  };
  assets: AssetFact[];
  /** Ressources repérées mais non téléchargées (plafond atteint). */
  assetsSkipped: number;
  /** null : le port 80 ne répond pas (rien à rediriger). */
  httpRedirectsToHttps: boolean | null;
  exposedFiles: string[];
  /** Secrets trouvés dans le JavaScript servi : type et fichier, jamais la valeur. */
  clientSecrets: { kind: string; file: string }[];
  /** Cartes de source (.map) téléchargeables publiquement. */
  sourceMaps: string[];
  hostIps: string[];
  hostedOnSystalink: boolean;
  /** Pré-vol v2 : absent dans les anciens tests et rapports. */
  extra?: ExtraSiteFacts;
}

export type Severity = 'critical' | 'high' | 'moderate' | 'low' | 'unknown';

export interface VulnerablePackage {
  ecosystem: string;
  name: string;
  version: string;
  ids: string[];
  severity: Severity;
  summary: string | null;
  /** Première version corrigée connue, si OSV la donne. */
  fixedIn: string | null;
}

export interface RepoFacts {
  fullName: string;
  defaultBranch: string;
  /** Identifiant SPDX de la licence du dépôt ; null si aucune n'est détectée. */
  licence: string | null;
  archived: boolean;
  treeTruncated: boolean;
  committedSecretFiles: string[];
  ecosystems: string[];
  manifest: string | null;
  lockfile: string | null;
  /** Versions déduites des plages de package.json (pas de fichier de verrouillage). */
  approximateVersions: boolean;
  dependencies: number;
  vulnerable: VulnerablePackage[];
  vulnLookupFailed: boolean;
  /** Dépendances directes sous licence copyleft (GPL, AGPL, LGPL…). */
  copyleftDependencies: { name: string; licence: string }[];
  licenceLookupFailed: boolean;
  /** Dépendances directes examinées pour la licence. */
  licencesChecked: number;
  /** Pré-vol v2 : hygiène du projet et architecture (absents si la lecture a échoué). */
  project?: ProjectFacts;
  architecture?: PreflightArchitecture;
}

// ─────────────── Pré-vol v2 (10/11/2026) : faits supplémentaires ───────────────

/** Ce que dit le HTML de la page (référencement, partage, vie privée, robustesse). */
export interface PageFacts {
  description: string | null;
  canonical: string | null;
  robotsMeta: string | null;
  /** Balises Open Graph trouvées (og:title, og:image…), clé sans le préfixe « og: ». */
  og: Record<string, string>;
  twitterCard: string | null;
  favicon: boolean;
  appleTouchIcon: boolean;
  manifest: string | null;
  themeColor: boolean;
  generator: string | null;
  h1: number;
  images: number;
  imagesWithoutAlt: number;
  imagesLazy: number;
  imagesWithoutSize: number;
  /** Scripts externes dans <head> sans async, defer ni type=module : ils bloquent l'affichage. */
  blockingScripts: string[];
  inlineScripts: number;
  /** Hôtes tiers d'où viennent des scripts. */
  thirdPartyHosts: string[];
  /** Scripts et feuilles tiers sans attribut integrity (SRI). */
  withoutIntegrity: string[];
  /** Ressources en http:// sur une page en https:// (contenu mixte). */
  mixedContent: string[];
  /** Traceurs publicitaires ou analytiques reconnus. */
  trackers: string[];
  iframes: number;
  /** Champs mot de passe dans un formulaire envoyé en http://. */
  insecureForms: number;
}

export interface CookieFact {
  name: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: string | null;
}

export interface ExtraSiteFacts {
  page: PageFacts;
  cookies: CookieFact[];
  /** Réponse à une origine étrangère : null si la requête a échoué. */
  cors: { allowOrigin: string | null; allowCredentials: boolean; reflected: boolean } | null;
  robots: { present: boolean; disallowAll: boolean; sitemaps: string[] };
  sitemap: boolean;
  securityTxt: boolean;
  /** Page inexistante : code renvoyé et fuite éventuelle (trace d'erreur, version). */
  notFound: { status: number; leak: string | null } | null;
  /** Manifeste PWA lu : nom, icônes, mode d'affichage. */
  manifest: { name: boolean; icons: number; display: string | null } | null;
  serviceWorker: boolean;
  /** Jeton d'authentification rangé dans localStorage par le JavaScript. */
  tokenInLocalStorage: boolean;
  /** Bases Firebase Realtime trouvées dans le JavaScript et lisibles sans authentification. */
  openFirebase: string[];
  firebaseChecked: number;
  /** GraphQL qui répond à une requête d'introspection publique. */
  graphqlIntrospection: string | null;
  /** Dossiers qui affichent leur liste de fichiers. */
  directoryListing: string[];
  /** Documentation d'API publique (Swagger, OpenAPI). */
  apiDocs: string[];
  http3: boolean;
  fonts: { faces: number; withoutSwap: number; files: number };
  imageFormats: { modern: number; legacy: number };
  /** Contrôles de recette (10/11/2026) : absents dans les rapports plus anciens. */
  recette?: RecetteSiteFacts;
}

/** Une route d'API appelée sans session (GET seulement, jamais d'écriture). */
export interface AnonymousApiProbe {
  path: string;
  status: number;
  json: boolean;
  /** Clés de données personnelles ou d'identifiants non vides dans la réponse (noms seuls). */
  personalKeys: string[];
  credentialKeys: string[];
  /** La réponse ne contient que des valeurs vides (ex. `{ "user": null }`). */
  empty: boolean;
  /** Le chemin ressemble à une route réservée (me, admin, account, settings…). */
  privatePath: boolean;
  poweredBy: string | null;
}

export interface RecetteSiteFacts {
  /** Pourquoi la balise viewport bloque le zoom (WCAG 1.4.4), ou null. */
  zoomBlocked: string | null;
  /** Champs du manifeste d'installation, null sans manifeste lisible. */
  manifest: {
    id: boolean;
    startUrl: boolean;
    scope: boolean;
    themeColor: boolean;
    icon192: boolean;
    icon512: boolean;
    maskable: boolean;
  } | null;
  faviconIco: boolean;
  /** Motifs d'API mis en cache par le service worker (extraits courts). */
  swApiCache: string[];
  /** Pages du sitemap appelées une à une : adresse et code HTTP. */
  pages: { url: string; status: number }[];
  routes: { sitemap: number; robotsDisallow: number; bundle: number; api: number };
  /** Exemples de routes de l'application lues dans le JavaScript. */
  routeSamples: string[];
  api: AnonymousApiProbe[];
  /** done : matrice d'API lancée ; needs_proof : domaine non prouvé, aucune route appelée. */
  apiMatrix?: 'done' | 'needs_proof';
  /** Route d'API inexistante : réponse par défaut du framework (« Cannot GET », trace…). */
  apiNotFoundLeak: string | null;
  /** En-tête X-Powered-By renvoyé par l'API (Express, PHP…), ou null. */
  apiPoweredBy: string | null;
}

/** Domaine : certificat TLS et DNS, mesurés directement (pas de service tiers). */
export interface DomainFacts {
  host: string;
  apex: string;
  tls: {
    protocol: string | null;
    alpn: string | null;
    validTo: string | null;
    daysLeft: number | null;
    issuer: string | null;
    authorized: boolean;
    authError: string | null;
    /** Le certificat couvre-t-il aussi www. (null si l'hôte n'est pas le domaine nu) ? */
    coversWww: boolean | null;
    /** Versions obsolètes acceptées (TLS 1.0, TLS 1.1). */
    legacyProtocols: string[];
  } | null;
  dns: {
    ipv4: string[];
    ipv6: string[];
    caa: string[];
    mx: string[];
    spf: string | null;
    dmarc: string | null;
    dkimSelectors: string[];
    /** www. résout-il ? null si l'hôte n'est ni le domaine nu ni www. */
    wwwResolves: boolean | null;
  };
}

export interface DockerFinding {
  code: 'root' | 'latest' | 'secret_env' | 'add_url' | 'no_dockerignore' | 'no_healthcheck';
  detail: string;
}

/** Hygiène du projet lue dans le dépôt. */
export interface ProjectFacts {
  pushedAt: string | null;
  stars: number;
  openIssues: number;
  readme: { present: boolean; bytes: number; hasSetup: boolean };
  gitignore: { present: boolean; ignoresEnv: boolean; ignoresNodeModules: boolean | null };
  envExample: boolean;
  usesEnvVars: boolean;
  ci: string[];
  testFiles: number;
  sourceFiles: number;
  hasTestScript: boolean | null;
  linters: string[];
  docker: { path: string; findings: DockerFinding[] } | null;
  runtime: { node: string | null; python: string | null };
  tsStrict: boolean | null;
  lockfiles: string[];
  /** Secrets trouvés dans le contenu des fichiers (type et fichier, jamais la valeur). */
  contentSecrets: { kind: string; file: string }[];
  filesScanned: number;
  /** Secrets ajoutés dans les derniers commits. null : non vérifié (pas de jeton GitHub). */
  historySecrets: { kind: string; commit: string; file: string }[] | null;
  commitsScanned: number;
  outdated: { name: string; current: string; latest: string; majorsBehind: number }[];
  deprecated: { name: string; message: string }[];
  installScripts: string[];
  abandoned: { name: string; lastPublish: string }[];
  registryChecked: number;
}
