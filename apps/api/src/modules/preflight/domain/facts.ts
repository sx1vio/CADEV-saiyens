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
}
