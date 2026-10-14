import type { TagSignal } from '@devhub/core';

export interface GithubTokenSource {
  tokenFor(userId: string): Promise<string | null>;
}

export interface ImportSummary {
  reposListed: number;
  reposAnalysed: number;
  skills: number;
}

export interface SkillStore {
  /** Index « nom de langage GitHub, slug ou alias en minuscules » → identifiant d'étiquette. */
  tagIndex(): Promise<Map<string, string>>;
  /** Remplace la part GitHub (G) des compétences ; conserve la part plateforme (XP). */
  replaceGithubSignals(userId: string, signals: TagSignal[]): Promise<void>;
  lastImportAt(userId: string): Promise<Date | null>;
  recordImport(userId: string, summary: ImportSummary, at: Date): Promise<void>;
}
