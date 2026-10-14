// Modification d'un texte déjà publié (O4, docs/architecture/04-hors-ligne-sync.md § 5).
// Chaque contenu porte une `version` ; le client envoie celle qu'il a modifiée (`baseVersion`).

export class ContentNotFoundError extends Error {}
export class NotContentAuthorError extends Error {}

/** La version serveur a changé depuis la copie du client : il choisit (écran de conflit). */
export class VersionConflictError extends Error {
  constructor(readonly server: Record<string, unknown> & { version: number }) {
    super('Conflit de version');
  }
}

export interface EditableState {
  authorId: string;
  version: number;
}

export function assertCanEdit<T extends EditableState>(
  current: T | null,
  actorId: string,
  baseVersion: number,
  snapshot: (c: T) => Record<string, unknown>,
): asserts current is T {
  if (!current) throw new ContentNotFoundError();
  if (current.authorId !== actorId) throw new NotContentAuthorError();
  if (current.version !== baseVersion) {
    throw new VersionConflictError({ version: current.version, ...snapshot(current) });
  }
}

export interface QuestionText {
  id: string;
  authorId: string;
  version: number;
  title: string;
  body: string;
  codeSnippet: string | null;
}

export interface AnswerText {
  id: string;
  authorId: string;
  version: number;
  body: string;
}

export interface EditWriter {
  lockQuestion(id: string): Promise<QuestionText | null>;
  lockAnswer(id: string): Promise<AnswerText | null>;
  archive(
    contentType: 'question' | 'answer',
    contentId: string,
    version: number,
    body: Record<string, unknown>,
  ): Promise<void>;
  saveQuestion(
    id: string,
    fields: { title: string; body: string; codeSnippet: string | null },
    version: number,
  ): Promise<QuestionText>;
  saveAnswer(id: string, body: string, version: number): Promise<AnswerText>;
}
