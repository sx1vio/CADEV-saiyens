import Anthropic from '@anthropic-ai/sdk';
import type { LlmPort, LlmRequest, LlmResult } from '../domain/ports';
import { renderUntrusted } from '../domain/untrusted';

/** Sous-ensemble du client utilisé, pour pouvoir le remplacer en test. */
export type AnthropicMessagesClient = Pick<Anthropic, 'beta'>;

/**
 * Adaptateur de l'API Claude (côté serveur uniquement, clé LLM_API_KEY).
 * - Aucun outil, aucune navigation : le modèle ne peut déclencher aucune action (M2, règle 5).
 * - Pas de nouvel essai du SDK : le délai de 10 s de S2 est un budget total, et le job ai.hint
 *   a son propre nouvel essai.
 * - Repli côté serveur (`fallbacks: 'default'`) : si le modèle refuse, l'API relance la même
 *   demande sur un autre modèle, dans le même appel.
 */
export class AnthropicLlmAdapter implements LlmPort {
  constructor(
    private readonly client: AnthropicMessagesClient,
    private readonly model: string,
    private readonly clock: () => number = Date.now,
  ) {}

  static create(apiKey: string, model: string): AnthropicLlmAdapter {
    return new AnthropicLlmAdapter(new Anthropic({ apiKey, maxRetries: 0 }), model);
  }

  async complete(request: LlmRequest): Promise<LlmResult> {
    const started = this.clock();
    const elapsed = () => this.clock() - started;
    try {
      const response = await this.client.beta.messages.create(
        {
          model: this.model,
          max_tokens: request.maxTokens,
          system: request.system,
          messages: [{ role: 'user', content: renderUntrusted(request.userContent) }],
          // Piste courte et rapide : effort bas, la réflexion adaptative reste active.
          output_config: { effort: 'low' },
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
        },
        { timeout: request.timeoutMs, maxRetries: 0 },
      );

      if (response.stop_reason === 'refusal') {
        const category = response.stop_details?.category ?? 'inconnue';
        return { ok: false, reason: 'refusal', latencyMs: elapsed(), detail: category };
      }
      const text = response.content
        .flatMap((block) => (block.type === 'text' ? [block.text] : []))
        .join('\n');
      return {
        ok: true,
        text,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        latencyMs: elapsed(),
      };
    } catch (error) {
      if (error instanceof Anthropic.APIConnectionTimeoutError) {
        return { ok: false, reason: 'timeout', latencyMs: elapsed() };
      }
      if (error instanceof Anthropic.APIError) {
        return {
          ok: false,
          reason: 'error',
          latencyMs: elapsed(),
          detail: `${error.status ?? 'réseau'} ${error.constructor.name}`,
        };
      }
      throw error;
    }
  }
}
