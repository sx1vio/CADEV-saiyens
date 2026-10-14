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
