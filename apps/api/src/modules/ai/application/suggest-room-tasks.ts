import type { LlmPort, RoomTaskSuggestion, RoomTasksStore } from '../domain/ports';
import {
  type RoomDiscussion,
  prepareRoomTasksInput,
  roomTasksInputHash,
} from '../domain/room-tasks-input';
import {
  ROOM_TASKS_PROMPT_VERSION,
  parseRoomTasks,
  roomTasksSystemPrompt,
  roomTasksUserContent,
} from '../prompts/room-tasks.v1';

export interface RoomTasksSettings {
  /** Quota commun à tous les usages de l'IA (LLM_HOURLY_QUOTA_PER_USER, §8). */
  hourlyQuotaPerUser: number;
  timeoutMs: number;
}

export type RoomTasksStatus = 'done' | 'cached' | 'empty' | 'quota' | 'disabled' | 'failed';

export interface RoomTasksOutcome {
  status: RoomTasksStatus;
  tasks: RoomTaskSuggestion[];
}

const HOUR_MS = 60 * 60 * 1000;
const ROOM_TASKS_MAX_TOKENS = 1_024;

/**
 * R5 : l'IA lit la discussion d'une salle et propose des tâches. Elle ne crée rien (règle 3 de
 * 09-ia-integrations) : un membre valide chaque proposition, qui passe alors par POST /tasks.
 */
export class SuggestRoomTasks {
  constructor(
    private readonly store: RoomTasksStore,
    private readonly llm: LlmPort,
    private readonly settings: RoomTasksSettings,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(userId: string, discussion: RoomDiscussion): Promise<RoomTasksOutcome> {
    const input = prepareRoomTasksInput(discussion);
    if (input.messages.length === 0) return { status: 'empty', tasks: [] };

    const inputHash = roomTasksInputHash(input);
    const base = {
      userId,
      kind: 'room_tasks' as const,
      inputHash,
      promptVer: ROOM_TASKS_PROMPT_VERSION,
    };

    const cached = await this.store.findCachedTasks(inputHash, ROOM_TASKS_PROMPT_VERSION);
    if (cached) {
      await this.store.recordRequest({ ...base, status: 'cache', output: { tasks: cached } });
      return { status: 'cached', tasks: cached };
    }

    const since = new Date(this.now().getTime() - HOUR_MS);
    if (
      (await this.store.countModelCallsSince(userId, since)) >= this.settings.hourlyQuotaPerUser
    ) {
      await this.store.recordRequest({ ...base, status: 'quota', output: null });
      return { status: 'quota', tasks: [] };
    }

    const result = await this.llm.complete({
      task: 'room_tasks',
      promptVersion: ROOM_TASKS_PROMPT_VERSION,
      system: roomTasksSystemPrompt(input.lang),
      userContent: roomTasksUserContent(input),
      maxTokens: ROOM_TASKS_MAX_TOKENS,
      timeoutMs: this.settings.timeoutMs,
    });

    if (!result.ok) {
      if (result.reason === 'disabled') return { status: 'disabled', tasks: [] };
      await this.store.recordRequest({
        ...base,
        status: result.reason,
        output: null,
        latencyMs: result.latencyMs,
      });
      return { status: 'failed', tasks: [] };
    }

    const tasks = parseRoomTasks(result.text);
    await this.store.recordRequest({
      ...base,
      status: tasks ? 'ok' : 'error',
      output: tasks ? { tasks } : null,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      latencyMs: result.latencyMs,
    });
    return tasks ? { status: 'done', tasks } : { status: 'failed', tasks: [] };
  }
}
