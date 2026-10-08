import { describe, expect, it } from 'vitest';
import { FakeGithubClient } from '../../github/infrastructure/fake-github.client';
import type { TagSignal } from '@devhub/core';
import type { ImportSummary, SkillStore } from '../domain/ports';
import {
  GithubNotLinkedError,
  ImportGithubProfile,
  REFRESH_INTERVAL_MS,
} from './import-github-profile';

const now = new Date('2026-10-08T12:00:00Z');

class MemorySkillStore implements SkillStore {
  signals: TagSignal[] = [];
  imports: Array<{ summary: ImportSummary; at: Date }> = [];
  constructor(private readonly last: Date | null = null) {}
  async tagIndex() {
    return new Map([
      ['typescript', 'ts'],
      ['css', 'css'],
      ['html', 'html'],
      ['python', 'py'],
      ['dockerfile', 'docker'],
      ['javascript', 'js'],
      ['go', 'go'],
    ] as const);
  }
  async replaceGithubSignals(_userId: string, signals: TagSignal[]) {
    this.signals = signals;
  }
  async lastImportAt() {
    return this.imports.at(-1)?.at ?? this.last;
  }
  async recordImport(_userId: string, summary: ImportSummary, at: Date) {
    this.imports.push({ summary, at });
  }
}

const tokens = { tokenFor: async (id: string) => (id === 'sans-github' ? null : 'fake-token-awa') };

describe('ImportGithubProfile (PR1, X3)', () => {
  it('propose au moins 3 compétences depuis le profil GitHub', async () => {
    const store = new MemorySkillStore();
    const summary = await new ImportGithubProfile(
      tokens,
      new FakeGithubClient(() => now),
      store,
      () => now,
    ).execute('u1');

    expect(summary).toEqual({ reposListed: 5, reposAnalysed: 3, skills: store.signals.length });
    expect(store.signals.length).toBeGreaterThanOrEqual(3);
    const by = Object.fromEntries(store.signals.map((s) => [s.tagId, s]));
    // devhub-web (TS 70 %, CSS 20 %) et paylink-api (Python 90 %) sont récents : qualifiés.
    expect(by.ts?.githubSignal).toBe(5);
    expect(by.css?.githubSignal).toBe(5);
    expect(by.py?.githubSignal).toBe(5);
    // Dockerfile à 10 %, JavaScript dans un dépôt de 3 ans : proposés éventuellement, jamais qualifiés.
    expect(by.docker?.githubSignal ?? 0).toBe(0);
    expect(by.js?.githubSignal ?? 0).toBe(0);
    // Le dépôt forké (Go) n'est jamais lu.
    expect(by.go).toBeUndefined();
  });

  it('refuse un compte sans GitHub lié', async () => {
    const useCase = new ImportGithubProfile(
      tokens,
      new FakeGithubClient(),
      new MemorySkillStore(),
      () => now,
    );
    await expect(useCase.execute('sans-github')).rejects.toBeInstanceOf(GithubNotLinkedError);
  });

  it('limite le réimport manuel à une fois par heure', async () => {
    const recent = new Date(now.getTime() - 10 * 60 * 1000);
    const useCase = new ImportGithubProfile(
      tokens,
      new FakeGithubClient(),
      new MemorySkillStore(recent),
      () => now,
    );
    await expect(useCase.refresh('u1')).rejects.toMatchObject({ retryAfterSeconds: 50 * 60 });

    const old = new Date(now.getTime() - REFRESH_INTERVAL_MS - 1);
    const store = new MemorySkillStore(old);
    await new ImportGithubProfile(
      tokens,
      new FakeGithubClient(() => now),
      store,
      () => now,
    ).refresh('u1');
    expect(store.imports).toHaveLength(1);
  });

  it('n’analyse que les 30 dépôts personnels les plus récents', async () => {
    const calls: string[] = [];
    const github = {
      listOwnedRepos: async () =>
        Array.from({ length: 40 }, (_, i) => ({
          fullName: `awa/r${i}`,
          fork: false,
          sizeKb: 10,
          pushedAt: new Date(now.getTime() - i * 86_400_000),
          topics: [],
        })),
      repoLanguages: async (_t: string, fullName: string) => {
        calls.push(fullName);
        return { TypeScript: 100 };
      },
    };
    const store = new MemorySkillStore();
    await new ImportGithubProfile(tokens, github, store, () => now).execute('u1');
    expect(calls).toHaveLength(30);
    expect(calls).not.toContain('awa/r35');
    expect(store.signals[0]).toMatchObject({ tagId: 'ts', qualifiedRepos: 30, githubSignal: 40 });
  });
});
