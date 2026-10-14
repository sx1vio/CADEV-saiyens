import type { TaskWriter } from '../domain/ports';
import type { TaskState } from '../domain/task';
import { describe, expect, it } from 'vitest';
import { Tasks, levelFromLabels } from './tasks';

describe('levelFromLabels (import des issues, R2)', () => {
  it.each([
    [['good first issue'], 'first_step'],
    [['First-Timers-Only'], 'first_step'],
    [['easy'], 'easy'],
    [['beginner friendly'], 'easy'],
    [['hard'], 'hard'],
    [['complex'], 'hard'],
    [['bug'], 'medium'],
    [[], 'medium'],
  ] as const)('%j → %s', (labels, level) => {
    expect(levelFromLabels([...labels])).toBe(level);
  });
});

class TaskMemory implements TaskWriter {
  completed: Array<{ prUrl: string | null; verification: string }> = [];
  constructor(private readonly state: TaskState) {}
  async findRoom() {
    return {
      id: 'r1',
      ownerId: 'awa',
      repoFullName: 'awa/paylink',
      stackTagIds: [],
      hidden: false,
    };
  }
  async roleOf(_r: string, userId: string) {
    return userId === 'awa' ? ('owner' as const) : ('member' as const);
  }
  async lockTask() {
    return this.state;
  }
  async createTask() {
    return { id: 'x' };
  }
  async importedIssueIds() {
    return new Set<bigint>();
  }
  async take() {}
  async submit() {}
  async complete(_id: string, prUrl: string | null, verification: 'github_verified' | 'declared') {
    this.completed.push({ prUrl, verification });
  }
  async touch() {}
}

describe('Tasks.complete (R8, R9)', () => {
  const deps = () =>
    new Tasks(
      {
        taskCompleted: async (i) => ({
          events: [{ userId: i.contributorId, points: 15 }],
          withheld: [],
        }),
      },
      { notify: async () => undefined },
    );
  const state: TaskState = {
    id: 't1',
    roomId: 'r1',
    status: 'in_review',
    assigneeId: 'moussa',
    prUrl: 'https://github.com/awa/paylink/pull/2',
  };

  it('vérification à jour : « Vérifié par GitHub » conservé', async () => {
    const writer = new TaskMemory(state);
    const out = await deps().complete(writer, 'tx', {
      taskId: 't1',
      actorId: 'awa',
      prUrl: null,
      pull: null,
      verification: 'github_verified',
      checked: { prUrl: state.prUrl, assigneeId: 'moussa' },
    });
    expect(writer.completed[0]?.verification).toBe('github_verified');
    expect(out).toMatchObject({ points: 15, recheck: false });
  });

  it('PR changée entre la vérification et le verrou : « déclarée », revérification planifiée', async () => {
    const writer = new TaskMemory(state);
    const out = await deps().complete(writer, 'tx', {
      taskId: 't1',
      actorId: 'awa',
      prUrl: null,
      pull: null,
      verification: 'github_verified',
      checked: { prUrl: 'https://github.com/awa/paylink/pull/4', assigneeId: 'moussa' },
    });
    expect(writer.completed[0]?.verification).toBe('declared');
    expect(out.recheck).toBe(true);
  });
});
