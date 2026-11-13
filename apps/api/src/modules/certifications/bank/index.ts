import { createHash } from 'node:crypto';
import { JS, PYTHON, WEB } from './devhub-1';
import { GIT, REACT, SQL } from './devhub-2';
import { DOCKER, IA, SECURITE } from './devhub-3';
import type { BankCert, QuizQuestion } from './types';
import { EXTRA as X_WEB } from './extra/web-fondamentaux';
import { EXTRA as X_JS } from './extra/js-fondamentaux';
import { EXTRA as X_PYTHON } from './extra/python-fondamentaux';
import { EXTRA as X_GIT } from './extra/git-fondamentaux';
import { EXTRA as X_SQL } from './extra/sql-fondamentaux';
import { EXTRA as X_REACT } from './extra/react-essentiel';
import { EXTRA as X_SECURITE } from './extra/securite-web';
import { EXTRA as X_DOCKER } from './extra/docker-deploiement';
import { EXTRA as X_IA } from './extra/ia-usage-responsable';

/** Questions ajoutées le 12/11/2026 (au moins 12 par thème), une liste par certification. */
const EXTRA: Record<string, QuizQuestion[]> = {
  'web-fondamentaux': X_WEB,
  'js-fondamentaux': X_JS,
  'python-fondamentaux': X_PYTHON,
  'git-fondamentaux': X_GIT,
  'sql-fondamentaux': X_SQL,
  'react-essentiel': X_REACT,
  'securite-web': X_SECURITE,
  'docker-deploiement': X_DOCKER,
  'ia-usage-responsable': X_IA,
};

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
    questions: [...quiz, ...(EXTRA[cert.id] ?? [])].map((q) => ({
      ...q,
      topic: q.topic ?? 0,
      id: questionId(cert.id, q),
    })),
  }),
);

export const bankOf = (certId: string): Bank | undefined => BANK.find((c) => c.id === certId);
