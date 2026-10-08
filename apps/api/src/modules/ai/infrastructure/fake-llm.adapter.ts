import type { LlmPort, LlmRequest, LlmResult } from '../domain/ports';

/**
 * Faux modèle déterministe : tests, CI et développement sans LLM_API_KEY. Jamais en production
 * (on y désactive l'IA plutôt que de présenter une fausse piste comme réelle).
 * La réponse le dit explicitement, pour qu'aucune démo ne la confonde avec une vraie piste.
 */
export class FakeLlmAdapter implements LlmPort {
  readonly requests: LlmRequest[] = [];

  async complete(request: LlmRequest): Promise<LlmResult> {
    this.requests.push(request);
    const title = request.userContent.find((p) => p.label === 'title')?.text ?? '';
    const fr = request.system.includes('en français');
    const text = fr
      ? `**Piste de démonstration** (aucune clé d'IA configurée).\n\n1. **Causes probables** : à déterminer pour « ${title} ».\n2. **À vérifier** : le message d'erreur exact et la version utilisée.`
      : `**Demo hint** (no AI key configured).\n\n1. **Likely causes**: to be determined for "${title}".\n2. **To check**: the exact error message and the version in use.`;
    return { ok: true, text, inputTokens: 0, outputTokens: 0, latencyMs: 0 };
  }
}

/** IA désactivée (production sans clé) : la question part directement aux devs (ai_status = skipped). */
export class DisabledLlmAdapter implements LlmPort {
  async complete(): Promise<LlmResult> {
    return { ok: false, reason: 'disabled', latencyMs: 0 };
  }
}
