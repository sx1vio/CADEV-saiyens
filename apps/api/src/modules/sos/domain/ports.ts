import type { AnswerState, QuestionState } from './answer';

// Ports du module sos. Les écritures reçoivent la transaction de la requête (idempotence, ADR-0008).

export interface PublicAuthor {
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  isDemo: boolean;
}

export interface StoredQuestion {
  id: string;
  clientId: string;
  status: 'open' | 'resolved' | 'closed';
  aiStatus: 'pending' | 'done' | 'failed' | 'skipped';
  version: number;
  createdAt: Date;
  author: PublicAuthor;
}

export interface NewQuestion {
  authorId: string;
  clientId: string;
  title: string;
  body: string;
  codeSnippet: string | null;
  urgency: 'low' | 'normal' | 'high';
  lang: 'fr' | 'en';
  tagIds: string[];
}

/** Accès en écriture, lié à une transaction. */
export interface QuestionWriter {
  /**
   * Sérialise les écritures d'un auteur jusqu'à la fin de la transaction : sans ce verrou, des
   * envois simultanés compteraient tous « moins de 10 » et contourneraient la limite horaire.
   */
  lockAuthor(authorId: string): Promise<void>;
  findByClientId(authorId: string, clientId: string): Promise<StoredQuestion | null>;
  /** Dates de création des questions de l'auteur depuis `since`. */
  createdSince(authorId: string, since: Date): Promise<Date[]>;
  /** Identifiants des étiquettes connues, par slug. */
  tagIdsBySlug(slugs: string[]): Promise<Map<string, string>>;
  create(question: NewQuestion): Promise<StoredQuestion>;
}

// ─────────────── Réponses (S4) ───────────────

export interface StoredAnswer {
  id: string;
  clientId: string;
  questionId: string;
  body: string;
  isAccepted: boolean;
  helpfulCount: number;
  version: number;
  createdAt: Date;
  author: PublicAuthor;
}

/** Accès en écriture aux réponses, lié à une transaction. */
export interface AnswerWriter {
  /** Sérialise les réponses d'un auteur (même clientId envoyé deux fois en parallèle). */
  lockAuthor(authorId: string): Promise<void>;
  /** Verrouille la question (SELECT … FOR UPDATE) : une seule validation à la fois. */
  lockQuestion(questionId: string): Promise<QuestionState | null>;
  findQuestion(questionId: string): Promise<QuestionState | null>;
  findAnswer(answerId: string): Promise<AnswerState | null>;
  findAnswerByClientId(authorId: string, clientId: string): Promise<StoredAnswer | null>;
  createAnswer(a: {
    questionId: string;
    authorId: string;
    clientId: string;
    body: string;
  }): Promise<StoredAnswer>;
  markAccepted(questionId: string, answerId: string, at: Date): Promise<void>;
  /** Enregistre le vote ; false s'il existait déjà. */
  addVote(answerId: string, voterId: string): Promise<boolean>;
  helpfulCount(answerId: string): Promise<number>;
  userCreatedAt(userId: string): Promise<Date>;
  handles(userIds: string[]): Promise<Map<string, string>>;
}

export interface XpGrant {
  userId: string;
  kind: string;
  points: number;
}
export interface XpWithheld {
  userId: string;
  kind: string;
  reason: string;
}
export interface XpAward {
  events: XpGrant[];
  withheld: XpWithheld[];
}

/** Implémenté par AwardXp (module reputation), appelé dans la même transaction. */
export interface ReputationPort {
  acceptedAnswer(
    input: {
      answerId: string;
      questionId: string;
      helperId: string;
      authorId: string;
      tagIds: string[];
      minutesToAccept: number;
    },
    tx?: unknown,
  ): Promise<XpAward>;
  helpfulVote(
    input: {
      answerId: string;
      helperId: string;
      voterId: string;
      voterCreatedAt: Date;
      tagIds: string[];
    },
    tx?: unknown,
  ): Promise<XpAward>;
}

/** Implémenté par Notifier (module notifications), appelé dans la même transaction. */
export interface NotifierPort {
  notify(
    notifications: Array<{
      userId: string;
      type: 'answer.created' | 'answer.accepted';
      payload: Record<string, unknown>;
    }>,
    tx?: unknown,
  ): Promise<void>;
}
