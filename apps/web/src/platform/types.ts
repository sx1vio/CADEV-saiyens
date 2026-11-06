import type { CertLevel, CertMeta } from '@devhub/core';

/**
 * Modèle des contenus rédigés de l'écosystème (communautés, certifications, skills IA,
 * apprentissage, guide de création, templates). Les publications, les offres d'emploi et les
 * vidéos viennent de l'API (@devhub/contracts).
 */

/* ---------------- Fil et communautés (Reddit) ---------------- */

export interface Community {
  slug: string;
  name: string;
  description: string;
  /** Couleur d'accent de la communauté (icône et bannière) */
  color: string;
  icon: string;
  rules: string[];
  banner?: string;
}

/* ---------------- Emplois ---------------- */

export type { CertLevel };

/** Question de quiz (leçons et démonstration de l'accueil). */
export interface QuizQuestion {
  q: string;
  choices: string[];
  answer: number;
  explain: string;
  /** Code à lire avant de répondre */
  code?: string;
  /** Index du thème dans le programme */
  topic?: number;
}

/** Certification DevHub : fiche publique (la banque de questions reste sur le serveur). */
export type PlatformCert = CertMeta;

/** Certification officielle d'un éditeur : fiche vérifiée, lien vers la page officielle. */
export interface MarketCert {
  id: string;
  title: string;
  /** Code d'examen officiel (CLF-C02, AZ-900…) */
  code?: string;
  provider: string;
  providerColor: string;
  domain: string;
  level: CertLevel;
  free: boolean;
  /** Prix public indicatif, à vérifier chez l'éditeur */
  price: string;
  /** Durée, nombre de questions, type d'épreuve */
  format: string;
  passScore?: string;
  validity: string;
  url: string;
  language: string[];
  description: string;
  /** Préparation officielle gratuite */
  prep?: { label: string; url: string };
  /** Cours ou parcours DevHub utile pour s'y préparer */
  prepPath?: string;
  /** Point d'attention daté (nouvelle version, retrait…) */
  note?: string;
}

/* ---------------- Skills et plugins IA ---------------- */

export type AgentTool = 'claude' | 'codex' | 'antigravity' | 'cursor';
export type SkillKind = 'skill' | 'plugin' | 'mcp' | 'rules' | 'prompt';

export interface InstallSnippet {
  /** Où coller ou lancer le code (« Terminal », « ~/.codex/config.toml »…) */
  where: string;
  code: string;
  lang: string;
}

export interface AgentSkill {
  id: string;
  name: string;
  kind: SkillKind;
  tools: AgentTool[];
  /** Éditeur réel (Anthropic, Microsoft…) ou « DevHub » */
  publisher: string;
  /** Publié par l'éditeur officiel de l'outil ou du service */
  official: boolean;
  category: string;
  summary: string;
  /** Présentation en Markdown : ce que ça fait, quand l'utiliser, précautions */
  readme: string;
  repo?: string;
  docs?: string;
  install: Partial<Record<AgentTool, InstallSnippet[]>>;
  files: { path: string; content: string }[];
}

/* ---------------- Vidéos (YouTube) ---------------- */

/* ---------------- Apprendre ---------------- */

export interface Lesson {
  id: string;
  title: string;
  minutes: number;
  kind: 'lecture' | 'exercice' | 'quiz' | 'projet';
  body: string;
  code?: string;
  quiz?: QuizQuestion[];
}

export interface LearnModule {
  id: string;
  title: string;
  lessons: Lesson[];
}

export interface LearnPath {
  id: string;
  title: string;
  tagline: string;
  level: CertLevel;
  hours: number;
  color: string;
  icon: string;
  outcomes: string[];
  modules: LearnModule[];
  certId?: string;
  /** Technos couvertes (logos) */
  stack: string[];
}

/* ---------------- Guide « Créer avec l'IA » ---------------- */

export type BuildTrack = 'webapp' | 'website' | 'mobile' | 'agent';

export interface GuideStep {
  id: string;
  title: string;
  goal: string;
  duration: string;
  actions: string[];
  /** Exemples de prompts à donner à l'agent */
  prompts: { label: string; text: string }[];
  /** Ce qui casse souvent : à vérifier avant de passer à l'étape suivante */
  pitfalls: { title: string; detail: string; severity: 'critique' | 'important' | 'conseil' }[];
  checklist: string[];
  /** Précisions selon le type de projet */
  trackNotes?: Partial<Record<BuildTrack, string>>;
  resources: { label: string; to: string }[];
}

/* ---------------- Templates ---------------- */

export interface Template {
  id: string;
  name: string;
  category:
    'landing' | 'saas' | 'ecommerce' | 'portfolio' | 'mobile' | 'dashboard' | 'blog' | 'api';
  stack: string[];
  /** Éditeur officiel du starter */
  publisher: string;
  summary: string;
  features: string[];
  /** Commande officielle de création du projet */
  command: string;
  docs: string;
  repo?: string;
  license: string;
  /** Maquette composée en CSS (pas d'image lourde) */
  preview: {
    bg: string;
    accent: string;
    layout: 'hero' | 'dashboard' | 'shop' | 'mobile' | 'blog' | 'docs';
  };
  track: BuildTrack;
}
