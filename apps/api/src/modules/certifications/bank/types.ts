import type { CertMeta } from '@devhub/core';

/** Question d'examen : la bonne réponse et l'explication ne quittent jamais le serveur avant correction. */
export interface QuizQuestion {
  q: string;
  choices: string[];
  answer: number;
  explain: string;
  /** Code à lire avant de répondre */
  code?: string;
  /** Index du thème dans le programme (syllabus) */
  topic?: number;
}

/** Certification avec sa banque de questions (serveur uniquement). */
export interface BankCert extends Omit<CertMeta, 'topicCounts' | 'bankSize'> {
  quiz: QuizQuestion[];
}
