// API publique du module ai. Pour demander une piste (S1) : jobs.send(JOBS.aiHint, { questionId }, questionId).
export { AiModule } from './ai.module';
export { GenerateHint, type HintOutcome } from './application/generate-hint';
export { SuggestRoomTasks, type RoomTasksOutcome } from './application/suggest-room-tasks';
