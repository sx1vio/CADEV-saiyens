// Ports du module ai (docs/architecture/09-ia-integrations.md). Le modèle de langage est appelé
// uniquement côté serveur, derrière LlmPort ; le contenu utilisateur n'est jamais une instruction.

export type AiTaskKind = 'hint' | 'room_tasks';

/** Contenu fourni par un utilisateur : toujours encadré et présenté au modèle comme une donnée. */
export interface UntrustedInput {
  label: string;
  text: string;
}

export interface LlmRequest {
  task: AiTaskKind;
  /** Version du gabarit, enregistrée dans ai_requests.prompt_ver (ex. « hint@1 »). */
  promptVersion: string;
  system: string;
  userContent: UntrustedInput[];
  maxTokens: number;
  timeoutMs: number;
}

export type LlmFailure = 'timeout' | 'error' | 'refusal' | 'disabled';

export type LlmResult =
  | { ok: true; text: string; inputTokens: number; outputTokens: number; latencyMs: number }
  | { ok: false; reason: LlmFailure; latencyMs: number; detail?: string };

export interface LlmPort {
  complete(request: LlmRequest): Promise<LlmResult>;
}

export const LLM_PORT = Symbol('LLM_PORT');

/** Question telle que la piste IA la lit. */
export interface HintQuestion {
  id: string;
  authorId: string;
  title: string;
  body: string;
  codeSnippet: string | null;
  lang: 'fr' | 'en';
  /** Libellés des étiquettes de la question. */
  tags: string[];
  aiStatus: 'pending' | 'done' | 'failed' | 'skipped';
}

/**
 * Statuts de ai_requests : ok, error, timeout, refusal (appels réels) ; pending (appel réservé, en
 * cours) ; cache et quota (sans appel).
 */
export type AiRequestStatus =
  'ok' | 'error' | 'timeout' | 'refusal' | 'pending' | 'cache' | 'quota';

/** Ligne de ai_requests ; `Output` dépend de l'usage (piste : { hint }, R5 : { tasks }). */
export interface AiRequestRecord<Output = { hint: string }> {
  userId: string;
  kind: AiTaskKind;
  inputHash: string;
  promptVer: string;
  status: AiRequestStatus;
  output: Output | null;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
}

export type HintStatus = 'done' | 'failed' | 'skipped';

export interface HintStore {
  findQuestion(questionId: string): Promise<HintQuestion | null>;
  /** Appels réellement envoyés au modèle par cet utilisateur depuis `since` (quota horaire). */
  countModelCallsSince(userId: string, since: Date): Promise<number>;
  /** Dernière piste réussie pour la même entrée et la même version de prompt. */
  findCachedHint(inputHash: string, promptVer: string): Promise<string | null>;
  /** Écrit le résultat seulement si la question attend encore sa piste ; renvoie false sinon. */
  saveHint(questionId: string, status: HintStatus, hint: string | null): Promise<boolean>;
  recordRequest(record: AiRequestRecord): Promise<void>;
}

/** Tâche proposée depuis une discussion de salle (R5) : une proposition, jamais une écriture. */
export interface RoomTaskSuggestion {
  title: string;
  description: string | null;
  level: 'first_step' | 'easy' | 'medium' | 'hard';
}

type RoomTasksRecord = AiRequestRecord<{ tasks: RoomTaskSuggestion[] }>;

export interface RoomTasksStore {
  /** Dernières propositions réussies pour la même discussion et la même version de prompt. */
  findCachedTasks(inputHash: string, promptVer: string): Promise<RoomTaskSuggestion[] | null>;
  /** Ligne sans appel au modèle (cache, quota). */
  recordRequest(record: RoomTasksRecord): Promise<void>;
  /**
   * Réserve atomiquement un appel au modèle (ligne « pending », comptée dans le quota horaire
   * commun) ; null si le quota est atteint. Deux requêtes parallèles ne le dépassent pas.
   */
  reserveModelCall(
    base: Pick<RoomTasksRecord, 'userId' | 'kind' | 'inputHash' | 'promptVer'>,
    since: Date,
    quota: number,
  ): Promise<string | null>;
  /** Complète la ligne réservée avec le résultat de l'appel. */
  finishModelCall(
    id: string,
    result: Omit<RoomTasksRecord, 'userId' | 'kind' | 'inputHash' | 'promptVer'>,
  ): Promise<void>;
  /** Annule la réservation : aucun appel n'est parti (IA désactivée). */
  releaseModelCall(id: string): Promise<void>;
}
