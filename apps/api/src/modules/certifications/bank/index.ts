import { createHash } from 'node:crypto';
import { JS, PYTHON, WEB } from './devhub-1';
import { GIT, REACT, SQL } from './devhub-2';
import { DOCKER, IA, SECURITE } from './devhub-3';
import type { BankCert, QuizQuestion } from './types';

export type { BankCert, QuizQuestion };

/** Question avec un identifiant stable : empreinte de la certification et de l'énoncé. */
export interface BankQuestion extends QuizQuestion {
  id: string;
  topic: number;
}

export interface Bank extends Omit<BankCert, 'quiz'> {
  questions: BankQuestion[];
}

const questionId = (certId: string, q: QuizQuestion) =>
  createHash('sha256')
    .update(`${certId}\n${q.q}\n${q.code ?? ''}`)
    .digest('hex')
    .slice(0, 16);

/** Les 9 certifications DevHub, dans l'ordre du catalogue public (@devhub/core CERT_CATALOG). */
export const BANK: Bank[] = [WEB, JS, PYTHON, GIT, SQL, REACT, SECURITE, DOCKER, IA].map(
  ({ quiz, ...cert }) => ({
    ...cert,
    questions: quiz.map((q) => ({ ...q, topic: q.topic ?? 0, id: questionId(cert.id, q) })),
  }),
);

export const bankOf = (certId: string): Bank | undefined => BANK.find((c) => c.id === certId);
