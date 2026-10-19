import type { LlmPort, TranslatableType, TranslatedText, TranslationStore } from '../domain/ports';
import {
  prepareTranslationInput,
  restoreCode,
  sourceHash,
  translationInputHash,
} from '../domain/translation-input';
import {
  TRANSLATE_PROMPT_VERSION,
  parseTranslation,
  translateSystemPrompt,
  translateUserContent,
} from '../prompts/translate.v1';

export interface TranslateSettings {
  /** Appels au modèle par utilisateur et par heure, partagés avec la piste IA (§8). */
  hourlyQuotaPerUser: number;
  /** Délai maximal d'une traduction (LLM_TRANSLATE_TIMEOUT_MS, 07-taches-fond : 15 s). */
  timeoutMs: number;
  /** Faux modèle (aucune clé d'IA) : la sortie est marquée « démo » et jamais prise pour réelle. */
  demo: boolean;
}

export interface TranslateCommand {
  type: TranslatableType;
  id: string;
  target: 'fr' | 'en';
  /** Personne qui demande la traduction : c'est son quota qui est décompté. */
  requesterId: string;
}

export type TranslateOutcome =
  | {
      kind: 'translated';
      text: TranslatedText;
      /** Rien n'a été envoyé au modèle. */
      cached: boolean;
      demo: boolean;
      createdAt: Date;
    }
  | { kind: 'not_found' } // contenu introuvable ou masqué par la modération
  | { kind: 'same_language' } // la question est déjà dans la langue demandée
  | { kind: 'quota' } // quota horaire atteint
  | { kind: 'unavailable' } // IA désactivée (production sans clé)
  | { kind: 'failed' }; // délai dépassé, erreur, refus ou sortie invalide

const HOUR_MS = 60 * 60 * 1000;
/** Un corps de 10 000 caractères (QUESTION_LIMITS.bodyMax) tient dans cette limite. */
const TRANSLATE_MAX_TOKENS = 6_000;

/**
 * S10 : pont bilingue FR ↔ EN. Mêmes garde-fous que la piste IA (S2) : secrets masqués, contenu
 * encadré comme une donnée (M2), quota horaire, cache. Le code n'est jamais envoyé au modèle.
 *
 * Deux niveaux de cache : la traduction enregistrée du contenu (`translations`, invalidée si
 * l'original change), puis le journal `ai_requests` (même texte dans un autre contenu).
 */
export class TranslateContent {
  constructor(
    private readonly store: TranslationStore,
    private readonly llm: LlmPort,
    private readonly settings: TranslateSettings,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(command: TranslateCommand): Promise<TranslateOutcome> {
    const { type, id, target, requesterId } = command;
    const source = await this.store.findSource(type, id);
    if (!source) return { kind: 'not_found' };
    if (source.lang === target) return { kind: 'same_language' };

    const promptVer = this.settings.demo
      ? `${TRANSLATE_PROMPT_VERSION}+demo`
      : TRANSLATE_PROMPT_VERSION;
    const input = prepareTranslationInput(source, target);
    const hash = sourceHash(input, promptVer);
    const { demo } = this.settings;

    const stored = await this.store.findTranslation(type, id, target);
    if (stored && stored.sourceHash === hash) {
      return {
        kind: 'translated',
        text: { title: stored.title, body: stored.body },
        cached: true,
        demo,
        createdAt: stored.createdAt,
      };
    }

    const inputHash = translationInputHash(input);
    const base = { userId: requesterId, kind: 'translate' as const, inputHash, promptVer };
    const save = async (text: TranslatedText, cached: boolean): Promise<TranslateOutcome> => {
      const createdAt = await this.store.saveTranslation(type, id, target, hash, text);
      return { kind: 'translated', text, cached, demo, createdAt };
    };

    const reused = await this.store.findCachedTranslation(inputHash, promptVer);
    if (reused) {
      await this.store.recordRequest({ ...base, status: 'cache', output: reused });
      return save(withCode(reused, input.codeBlocks), true);
    }

    const since = new Date(this.now().getTime() - HOUR_MS);
    const used = await this.store.countModelCallsSince(requesterId, since);
    if (used >= this.settings.hourlyQuotaPerUser) {
      await this.store.recordRequest({ ...base, status: 'quota', output: null });
      return { kind: 'quota' };
    }

    const result = await this.llm.complete({
      task: 'translate',
      promptVersion: promptVer,
      system: translateSystemPrompt(target),
      userContent: translateUserContent(input),
      maxTokens: TRANSLATE_MAX_TOKENS,
      timeoutMs: this.settings.timeoutMs,
    });
    if (!result.ok) {
      if (result.reason === 'disabled') return { kind: 'unavailable' };
      await this.store.recordRequest({
        ...base,
        status: result.reason,
        output: null,
        latencyMs: result.latencyMs,
      });
      return { kind: 'failed' };
    }

    const parsed = parseTranslation(result.text, input.title !== null);
    await this.store.recordRequest({
      ...base,
      status: parsed ? 'ok' : 'error',
      // Le journal garde la sortie sans le code : elle resservira pour un autre contenu.
      output: parsed,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      latencyMs: result.latencyMs,
    });
    if (!parsed) return { kind: 'failed' };
    return save(withCode(parsed, input.codeBlocks), false);
  }
}

const withCode = (text: TranslatedText, codeBlocks: string[]): TranslatedText => ({
  title: text.title,
  body: restoreCode(text.body, codeBlocks),
});
