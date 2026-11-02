/**
 * Modèle des services de l'écosystème (fil, communautés, emplois, certifications,
 * skills IA, vidéos, apprentissage, guide de création, templates).
 * Données de démonstration locales en attendant l'API ; aucune n'est présentée comme réelle.
 */

export interface Person {
  handle: string;
  name: string;
  avatar: string;
  country: string;
  city: string;
}

/* ---------------- Fil et communautés (Reddit) ---------------- */

export interface Community {
  slug: string;
  name: string;
  description: string;
  /** Couleur d'accent de la communauté (icône et bannière) */
  color: string;
  icon: string;
  members: number;
  online: number;
  rules: string[];
  banner?: string;
}

export type PostKind =
  'news' | 'launch' | 'opensource' | 'discussion' | 'showcase' | 'question' | 'video' | 'job';

export interface Post {
  id: string;
  kind: PostKind;
  community: string;
  author: string;
  title: string;
  body: string;
  /** Lien externe (actu) ou interne (/emplois/…, /videos/…) */
  link?: { url: string; domain: string };
  image?: string;
  /** Bloc de code mis en avant */
  code?: string;
  tags: string[];
  score: number;
  comments: number;
  createdAt: string;
  /** Actu IA et tech, éditorialisée par l'équipe */
  editorial?: boolean;
  repo?: { name: string; stars: number; language: string };
}

export interface Comment {
  id: string;
  postId: string;
  parentId: string | null;
  author: string;
  body: string;
  score: number;
  createdAt: string;
}

/* ---------------- Emplois ---------------- */

export type CertLevel = 'debutant' | 'intermediaire' | 'avance' | 'expert';

export interface QuizQuestion {
  q: string;
  choices: string[];
  answer: number;
  explain: string;
  /** Code à lire avant de répondre */
  code?: string;
  /** Index du thème dans le programme (syllabus) : score détaillé par thème */
  topic?: number;
}

/** Certification de la plateforme : gratuite, examen en ligne, badge vérifiable. */
export interface PlatformCert {
  id: string;
  title: string;
  track: string;
  level: CertLevel;
  /** Durée de l'examen (chronomètre) */
  minutes: number;
  /** Score minimal pour obtenir la certification, en % */
  passScore: number;
  skills: string[];
  description: string;
  /** Thèmes évalués ; les questions y renvoient par `topic` */
  syllabus: string[];
  /** Banque de questions ; chaque examen en tire `draw` au hasard */
  quiz: QuizQuestion[];
  draw: number;
  color: string;
  /** Logo de la techno affiché dans le badge */
  logo?: string;
  /** Cours DevHub qui prépare à l'examen (id de cours façon Duolingo) */
  course?: string;
  /** Langage des extraits de code des questions (coloration) */
  codeLang?: string;
}

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

export interface Video {
  id: string;
  title: string;
  channel: string;
  category: string;
  duration: string;
  views: number;
  likes: number;
  publishedAt: string;
  description: string;
  chapters: { at: string; title: string }[];
  /** Vignette composée : couleur de fond, mot-clé et visuel */
  thumb: {
    bg: string;
    fg: string;
    kicker: string;
    big: string;
    avatar?: boolean;
    code?: string;
    accent?: string;
    logo?: string;
    file?: string;
    editor?: string;
  };
  live?: boolean;
  tags: string[];
}

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
  author: string;
  summary: string;
  features: string[];
  uses: number;
  stars: number;
  free: boolean;
  /** Maquette composée en CSS (pas d'image lourde) */
  preview: {
    bg: string;
    accent: string;
    layout: 'hero' | 'dashboard' | 'shop' | 'mobile' | 'blog' | 'docs';
  };
  track: BuildTrack;
}
