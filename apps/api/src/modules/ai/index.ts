// API publique du module ai. Pour demander une piste (S1) : jobs.send(JOBS.aiHint, { questionId }, questionId).
export { AiModule, aiAvailable } from './ai.module';
export { GenerateHint, type HintOutcome } from './application/generate-hint';
export {
  TranslateContent,
  type TranslateCommand,
  type TranslateOutcome,
} from './application/translate-content';
