import { describe, expect, it } from 'vitest';
import type {
  AiRequestRecord,
  HintQuestion,
  HintStatus,
  HintStore,
  LlmPort,
  LlmRequest,
  LlmResult,
} from '../domain/ports';
import { FakeLlmAdapter } from '../infrastructure/fake-llm.adapter';
import { HINT_PROMPT_VERSION } from '../prompts/hint.v1';
import { GenerateHint } from './generate-hint';

// Faux jeton construit à l'exécution : un littéral serait signalé par gitleaks en CI.
const FAKE_GITHUB_TOKEN = ['ghp', 'abcdefghijklmnopqrstuvwxyz0123456789'].join('_');

const now = new Date('2026-10-09T10:00:00Z');
const settings = { hourlyQuotaPerUser: 3, timeoutMs: 10_000 };

const question = (over: Partial<HintQuestion> = {}): HintQuestion => ({
  id: 'q1',
  authorId: 'awa',
  title: 'nginx renvoie 502 derrière Docker',
  body: 'Mon API répond en local mais pas derrière nginx.',
  codeSnippet: `proxy_pass http://localhost:3000; # token=${FAKE_GITHUB_TOKEN}`,
  lang: 'fr',
  tags: ['nginx', 'Docker'],
  aiStatus: 'pending',
  ...over,
});

class MemoryHintStore implements HintStore {
  saved: Array<{ status: HintStatus; hint: string | null }> = [];
  records: AiRequestRecord[] = [];
  constructor(
    private readonly questions: HintQuestion[],
    private readonly callsInLastHour = 0,
    private readonly cache = new Map<string, string>(),
  ) {}
  async findQuestion(id: string) {
    return this.questions.find((q) => q.id === id) ?? null;
  }
  async countModelCallsSince() {
    return this.callsInLastHour;
  }
  async findCachedHint(inputHash: string, promptVer: string) {
    return this.cache.get(`${inputHash}:${promptVer}`) ?? null;
  }
  async saveHint(id: string, status: HintStatus, hint: string | null) {
    const q = this.questions.find((x) => x.id === id);
    if (!q || q.aiStatus !== 'pending') return false;
    q.aiStatus = status;
    this.saved.push({ status, hint });
    return true;
  }
  async recordRequest(record: AiRequestRecord) {
    this.records.push(record);
    if (record.status === 'ok' && record.output) {
      this.cache.set(
        `${record.inputHash}:${record.promptVer}`,
        (record.output as { hint: string }).hint,
      );
    }
  }
}

class ScriptedLlm implements LlmPort {
  calls: LlmRequest[] = [];
  constructor(private readonly result: LlmResult) {}
  async complete(request: LlmRequest) {
    this.calls.push(request);
    return this.result;
  }
}

const run = (store: HintStore, llm: LlmPort) =>
  new GenerateHint(store, llm, settings, () => now).execute('q1');

describe('GenerateHint (S2)', () => {
  it('écrit la piste et journalise l’appel avec les jetons', async () => {
    const store = new MemoryHintStore([question()]);
    const llm = new ScriptedLlm({
      ok: true,
      text: '  **Causes probables** : le port.  ',
      inputTokens: 420,
      outputTokens: 80,
      latencyMs: 1_800,
    });

    expect(await run(store, llm)).toBe('done');
    expect(store.saved).toEqual([{ status: 'done', hint: '**Causes probables** : le port.' }]);
    expect(store.records[0]).toMatchObject({
      userId: 'awa',
      kind: 'hint',
      promptVer: HINT_PROMPT_VERSION,
      status: 'ok',
      inputTokens: 420,
      outputTokens: 80,
      latencyMs: 1_800,
    });
    expect(llm.calls[0]).toMatchObject({ task: 'hint', timeoutMs: 10_000 });
  });

  it('n’envoie jamais de secret au modèle (O9)', async () => {
    const llm = new FakeLlmAdapter();
    await run(new MemoryHintStore([question()]), llm);
    const sent = JSON.stringify(llm.requests[0]);
    expect(sent).not.toContain(FAKE_GITHUB_TOKEN);
    expect(sent).toContain('[secret masqué]');
  });

  it('réutilise le cache pour une question identique, sans appel', async () => {
    const first = new MemoryHintStore([question()]);
    await run(first, new FakeLlmAdapter());
    const cache = new Map(
      first.records.map((r) => [
        `${r.inputHash}:${r.promptVer}`,
        (r.output as { hint: string }).hint,
      ]),
    );
    const second = new MemoryHintStore([question()], 0, cache);
    const llm = new FakeLlmAdapter();

    expect(await run(second, llm)).toBe('cached');
    expect(llm.requests).toHaveLength(0);
    expect(second.records[0]?.status).toBe('cache');
  });

  it('quota atteint : ai_status = skipped, aucun appel', async () => {
    const store = new MemoryHintStore([question()], settings.hourlyQuotaPerUser);
    const llm = new FakeLlmAdapter();

    expect(await run(store, llm)).toBe('skipped');
    expect(llm.requests).toHaveLength(0);
    expect(store.saved).toEqual([{ status: 'skipped', hint: null }]);
    expect(store.records[0]?.status).toBe('quota');
  });

  it.each([
    ['timeout', 'failed'],
    ['error', 'failed'],
    ['refusal', 'failed'],
    ['disabled', 'skipped'],
  ] as const)('échec %s : ai_status = %s, la question continue', async (reason, expected) => {
    const store = new MemoryHintStore([question()]);
    const outcome = await run(store, new ScriptedLlm({ ok: false, reason, latencyMs: 10_000 }));

    expect(outcome).toBe(expected);
    expect(store.saved).toEqual([{ status: expected, hint: null }]);
    // L'IA désactivée n'est pas un appel : rien à journaliser.
    expect(store.records.map((r) => r.status)).toEqual(reason === 'disabled' ? [] : [reason]);
  });

  it('réponse vide du modèle : échec', async () => {
    const store = new MemoryHintStore([question()]);
    const llm = new ScriptedLlm({
      ok: true,
      text: '   ',
      inputTokens: 1,
      outputTokens: 0,
      latencyMs: 5,
    });
    expect(await run(store, llm)).toBe('failed');
    expect(store.records[0]?.status).toBe('error');
  });

  it('job rejoué ou question déjà traitée : rien ne change', async () => {
    const llm = new FakeLlmAdapter();
    expect(await run(new MemoryHintStore([question({ aiStatus: 'done' })]), llm)).toBe('ignored');
    expect(await run(new MemoryHintStore([]), llm)).toBe('ignored');
    expect(llm.requests).toHaveLength(0);
  });

  it('répond dans la langue de la question', async () => {
    const llm = new FakeLlmAdapter();
    await run(new MemoryHintStore([question({ lang: 'en' })]), llm);
    expect(llm.requests[0]?.system).toContain('in English');
  });
});
