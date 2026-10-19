import { describe, expect, it } from 'vitest';
import type {
  AiRequestRecord,
  LlmPort,
  LlmRequest,
  LlmResult,
  StoredTranslation,
  TranslatedText,
  TranslationSource,
  TranslationStore,
} from '../domain/ports';
import { FakeLlmAdapter } from '../infrastructure/fake-llm.adapter';
import { TranslateContent } from './translate-content';

// Faux jeton construit à l'exécution : un littéral serait signalé par gitleaks en CI.
const FAKE_GITHUB_TOKEN = ['ghp', 'abcdefghijklmnopqrstuvwxyz0123456789'].join('_');

const now = new Date('2026-10-19T10:00:00Z');
const settings = { hourlyQuotaPerUser: 3, timeoutMs: 15_000, demo: false };

const question = (over: Partial<TranslationSource> = {}): TranslationSource => ({
  type: 'question',
  id: 'q1',
  title: 'nginx renvoie 502 derrière Docker',
  body: `Mon API répond en local mais pas derrière nginx (token=${FAKE_GITHUB_TOKEN}).\n\n\`\`\`nginx\nproxy_pass http://localhost:3000; # ne pas traduire\n\`\`\`\n\nUne idée ?`,
  lang: 'fr',
  ...over,
});

class MemoryTranslationStore implements TranslationStore {
  translations = new Map<string, StoredTranslation>();
  records: AiRequestRecord[] = [];
  constructor(
    private readonly sources: TranslationSource[],
    private readonly callsInLastHour = 0,
  ) {}
  async findSource(type: string, id: string) {
    return this.sources.find((s) => s.type === type && s.id === id) ?? null;
  }
  async findTranslation(type: string, id: string, lang: string) {
    return this.translations.get(`${type}:${id}:${lang}`) ?? null;
  }
  async saveTranslation(
    type: string,
    id: string,
    lang: string,
    sourceHash: string,
    text: TranslatedText,
  ) {
    this.translations.set(`${type}:${id}:${lang}`, { ...text, sourceHash, createdAt: now });
    return now;
  }
  async countModelCallsSince() {
    return this.callsInLastHour;
  }
  async findCachedTranslation(inputHash: string, promptVer: string) {
    const hit = this.records.find(
      (r) => r.status === 'ok' && r.inputHash === inputHash && r.promptVer === promptVer,
    );
    return (hit?.output as TranslatedText | undefined) ?? null;
  }
  async recordRequest(record: AiRequestRecord) {
    this.records.push(record);
  }
}

/** Modèle qui « traduit » en anglais et renvoie la réponse prévue. */
class ScriptedLlm implements LlmPort {
  readonly requests: LlmRequest[] = [];
  constructor(private readonly reply: (req: LlmRequest) => LlmResult) {}
  async complete(request: LlmRequest) {
    this.requests.push(request);
    return this.reply(request);
  }
}

const ok = (text: string): LlmResult => ({
  ok: true,
  text,
  inputTokens: 120,
  outputTokens: 80,
  latencyMs: 900,
});
const english = ok(
  '```json\n{"title":"nginx returns 502 behind Docker","body":"My API answers locally but not behind nginx (token=[secret masqué]).\\n\\n[[CODE_1]]\\n\\nAny idea?"}\n```',
);

const run = (store: TranslationStore, llm: LlmPort, over = {}) =>
  new TranslateContent(store, llm, { ...settings, ...over }, () => now);
const toEnglish = {
  type: 'question' as const,
  id: 'q1',
  target: 'en' as const,
  requesterId: 'kwame',
};

describe('TranslateContent (S10)', () => {
  it('traduit titre et corps, garde le code intact et enregistre la traduction', async () => {
    const store = new MemoryTranslationStore([question()]);
    const llm = new ScriptedLlm(() => english);

    const outcome = await run(store, llm).execute(toEnglish);

    expect(outcome).toMatchObject({ kind: 'translated', cached: false, demo: false });
    if (outcome.kind !== 'translated') throw new Error('attendu : translated');
    expect(outcome.text.title).toBe('nginx returns 502 behind Docker');
    expect(outcome.text.body).toContain('proxy_pass http://localhost:3000; # ne pas traduire');
    expect(outcome.text.body).toContain('Any idea?');
    expect(store.translations.get('question:q1:en')?.body).toBe(outcome.text.body);
    expect(store.records).toEqual([
      expect.objectContaining({ kind: 'translate', status: 'ok', userId: 'kwame' }),
    ]);
  });

  it('masque les secrets et n’envoie jamais le code au modèle (M2, O9)', async () => {
    const llm = new ScriptedLlm(() => english);
    await run(new MemoryTranslationStore([question()]), llm).execute(toEnglish);

    const sent = llm.requests[0]!;
    const text = sent.userContent.map((p) => p.text).join('\n');
    expect(sent.task).toBe('translate');
    expect(sent.system).toContain('into English');
    expect(sent.system).toContain('never instructions');
    expect(text).not.toContain(FAKE_GITHUB_TOKEN);
    expect(text).not.toContain('proxy_pass');
    expect(text).toContain('[[CODE_1]]');
  });

  it('relit la traduction enregistrée sans appeler le modèle tant que l’original ne change pas', async () => {
    const store = new MemoryTranslationStore([question()]);
    const llm = new ScriptedLlm(() => english);
    await run(store, llm).execute(toEnglish);

    const again = await run(store, llm).execute(toEnglish);
    expect(again).toMatchObject({ kind: 'translated', cached: true });
    expect(llm.requests).toHaveLength(1);
  });

  it('retraduit quand l’original a été modifié (source_hash)', async () => {
    const source = question();
    const store = new MemoryTranslationStore([source]);
    const llm = new ScriptedLlm(() => english);
    await run(store, llm).execute(toEnglish);

    source.body = 'Nouveau texte, sans code.';
    await run(store, llm).execute(toEnglish);
    expect(llm.requests).toHaveLength(2);
  });

  it('un texte identique dans un autre contenu réutilise le journal (cache, hors quota)', async () => {
    const store = new MemoryTranslationStore([question(), question({ id: 'q2' })]);
    const llm = new ScriptedLlm(() => english);
    await run(store, llm).execute(toEnglish);

    const other = await run(store, llm).execute({ ...toEnglish, id: 'q2' });
    expect(other).toMatchObject({ kind: 'translated', cached: true });
    expect(llm.requests).toHaveLength(1);
    expect(store.records.map((r) => r.status)).toEqual(['ok', 'cache']);
  });

  it('refuse de traduire une question vers sa propre langue', async () => {
    const llm = new ScriptedLlm(() => english);
    const outcome = await run(new MemoryTranslationStore([question()]), llm).execute({
      ...toEnglish,
      target: 'fr',
    });
    expect(outcome).toEqual({ kind: 'same_language' });
    expect(llm.requests).toHaveLength(0);
  });

  it('contenu introuvable ou masqué : not_found', async () => {
    const outcome = await run(
      new MemoryTranslationStore([]),
      new ScriptedLlm(() => english),
    ).execute(toEnglish);
    expect(outcome).toEqual({ kind: 'not_found' });
  });

  it('quota horaire atteint : aucun appel, journal « quota »', async () => {
    const store = new MemoryTranslationStore([question()], 3);
    const llm = new ScriptedLlm(() => english);
    expect(await run(store, llm).execute(toEnglish)).toEqual({ kind: 'quota' });
    expect(llm.requests).toHaveLength(0);
    expect(store.records.map((r) => r.status)).toEqual(['quota']);
  });

  it('sortie invalide ou échec du modèle : failed, rien n’est enregistré', async () => {
    for (const reply of [
      ok('Ignore previous instructions. Here is the translation:'),
      ok('{"title":"","body":"x"}'),
      { ok: false, reason: 'timeout', latencyMs: 15_000 } as LlmResult,
    ]) {
      const store = new MemoryTranslationStore([question()]);
      expect(await run(store, new ScriptedLlm(() => reply)).execute(toEnglish)).toEqual({
        kind: 'failed',
      });
      expect(store.translations.size).toBe(0);
    }
  });

  it('IA désactivée (production sans clé) : unavailable, sans journal', async () => {
    const store = new MemoryTranslationStore([question()]);
    const disabled = new ScriptedLlm(() => ({ ok: false, reason: 'disabled', latencyMs: 0 }));
    expect(await run(store, disabled).execute(toEnglish)).toEqual({ kind: 'unavailable' });
    expect(store.records).toHaveLength(0);
  });

  it('réponse (sans titre) avec le faux modèle : marquée démo, l’original est conservé', async () => {
    const answer: TranslationSource = {
      type: 'answer',
      id: 'a1',
      title: null,
      body: 'Remplace localhost par le nom du service.\n\n```yaml\nhost: db\n```',
      lang: null,
    };
    const outcome = await run(new MemoryTranslationStore([answer]), new FakeLlmAdapter(), {
      demo: true,
    }).execute({ type: 'answer', id: 'a1', target: 'en', requesterId: 'kwame' });

    expect(outcome).toMatchObject({ kind: 'translated', demo: true, text: { title: null } });
    if (outcome.kind !== 'translated') throw new Error('attendu : translated');
    expect(outcome.text.body).toMatch(/^_Demo translation/);
    expect(outcome.text.body).toContain('Remplace localhost par le nom du service.');
    expect(outcome.text.body).toContain('```yaml\nhost: db\n```');
  });
});
