// Ports du module ai (docs/architecture/09-ia-integrations.md). Le modèle de langage est appelé
// uniquement côté serveur, derrière LlmPort ; le contenu utilisateur n'est jamais une instruction.

export type AiTaskKind = 'hint';

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

/** Statuts de ai_requests : ok, error, timeout, refusal (appels réels) ; cache et quota (sans appel). */
export type AiRequestStatus = 'ok' | 'error' | 'timeout' | 'refusal' | 'cache' | 'quota';

export interface AiRequestRecord {
  userId: string;
  kind: AiTaskKind;
  inputHash: string;
  promptVer: string;
  status: AiRequestStatus;
  output: { hint: string } | null;
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
