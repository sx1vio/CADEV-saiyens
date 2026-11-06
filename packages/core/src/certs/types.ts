export type CertLevel = 'debutant' | 'intermediaire' | 'avance' | 'expert';

/** Fiche publique d'une certification DevHub : tout sauf la banque de questions (restée sur le serveur). */
export interface CertMeta {
  id: string;
  title: string;
  track: string;
  level: CertLevel;
  /** Durée de l'examen (chronomètre), en minutes */
  minutes: number;
  /** Score minimal pour obtenir la certification, en % */
  passScore: number;
  /** Questions tirées à chaque examen */
  draw: number;
  skills: string[];
  description: string;
  /** Thèmes évalués ; les questions y renvoient par leur index */
  syllabus: string[];
  /** Nombre de questions de la banque par thème (même ordre que `syllabus`) */
  topicCounts: number[];
  /** Taille de la banque de questions */
  bankSize: number;
  color: string;
  /** Logo de la techno affiché dans le badge */
  logo?: string;
  /** Cours DevHub qui prépare à l'examen */
  course?: string;
  /** Langage des extraits de code des questions (coloration) */
  codeLang?: string;
}

/** Délai entre deux tentatives d'examen après un échec, pour qu'on révise plutôt que de deviner. */
export const CERT_RETRY_DELAY_MS = 60 * 60 * 1000;
