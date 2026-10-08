import { hintInputHash, prepareHintInput } from '../domain/hint-input';
import type { HintStore, LlmPort } from '../domain/ports';
import {
  HINT_PROMPT_VERSION,
  cleanHint,
  hintSystemPrompt,
  hintUserContent,
} from '../prompts/hint.v1';

export interface HintSettings {
  /** Appels au modèle par utilisateur et par heure (LLM_HOURLY_QUOTA_PER_USER, §8). */
  hourlyQuotaPerUser: number;
  /** Délai maximal de la piste (LLM_HINT_TIMEOUT_MS, S2 : 10 s). */
  timeoutMs: number;
}

export type HintOutcome =
  | 'done' // piste générée par le modèle
  | 'cached' // même question déjà traitée avec le même prompt
  | 'skipped' // quota atteint ou IA désactivée : la question part quand même aux devs
  | 'failed' // délai dépassé, erreur ou refus du modèle
  | 'ignored'; // question introuvable ou déjà traitée (job rejoué)

const HOUR_MS = 60 * 60 * 1000;
const HINT_MAX_TOKENS = 1_024;

/**
 * S2 : piste IA d'une question SOS Dev. Ne bloque jamais le parcours : quel que soit le résultat,
 * ai_status quitte « pending » et la question continue vers le matching.
 */
export class GenerateHint {
  constructor(
    private readonly store: HintStore,
    private readonly llm: LlmPort,
    private readonly settings: HintSettings,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(questionId: string): Promise<HintOutcome> {
    const question = await this.store.findQuestion(questionId);
    if (!question || question.aiStatus !== 'pending') return 'ignored';

    const input = prepareHintInput(question);
    const inputHash = hintInputHash(input);
    const base = {
      userId: question.authorId,
      kind: 'hint' as const,
      inputHash,
      promptVer: HINT_PROMPT_VERSION,
    };

    const cached = await this.store.findCachedHint(inputHash, HINT_PROMPT_VERSION);
    if (cached) {
      if (!(await this.store.saveHint(question.id, 'done', cached))) return 'ignored';
      await this.store.recordRequest({ ...base, status: 'cache', output: { hint: cached } });
      return 'cached';
    }

    const since = new Date(this.now().getTime() - HOUR_MS);
    const used = await this.store.countModelCallsSince(question.authorId, since);
    if (used >= this.settings.hourlyQuotaPerUser) {
      if (!(await this.store.saveHint(question.id, 'skipped', null))) return 'ignored';
      await this.store.recordRequest({ ...base, status: 'quota', output: null });
      return 'skipped';
    }

    const result = await this.llm.complete({
      task: 'hint',
      promptVersion: HINT_PROMPT_VERSION,
      system: hintSystemPrompt(input.lang),
      userContent: hintUserContent(input),
      maxTokens: HINT_MAX_TOKENS,
      timeoutMs: this.settings.timeoutMs,
    });

    if (!result.ok) {
      const status = result.reason === 'disabled' ? 'skipped' : 'failed';
      if (!(await this.store.saveHint(question.id, status, null))) return 'ignored';
      if (result.reason !== 'disabled') {
        await this.store.recordRequest({
          ...base,
          status: result.reason,
          output: null,
          latencyMs: result.latencyMs,
        });
      }
      return status;
    }

    const hint = cleanHint(result.text);
    const status = hint ? 'done' : 'failed';
    if (!(await this.store.saveHint(question.id, status, hint))) return 'ignored';
    await this.store.recordRequest({
      ...base,
      status: hint ? 'ok' : 'error',
      output: hint ? { hint } : null,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      latencyMs: result.latencyMs,
    });
    return status;
  }
}
