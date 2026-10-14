import { Logger, Module } from '@nestjs/common';
import { ENV } from '../../infrastructure/config/config.module';
import type { Env } from '../../infrastructure/config/env';
import { GenerateHint } from './application/generate-hint';
import { LLM_PORT, type LlmPort } from './domain/ports';
import { AnthropicLlmAdapter } from './infrastructure/anthropic-llm.adapter';
import { DisabledLlmAdapter, FakeLlmAdapter } from './infrastructure/fake-llm.adapter';
import { PrismaHintStore } from './infrastructure/prisma-hint.store';
import { AiHintJob } from './jobs/ai-hint.job';

function llmFor(env: Env): LlmPort {
  if (env.LLM_API_KEY) return AnthropicLlmAdapter.create(env.LLM_API_KEY, env.LLM_MODEL);
  if (env.NODE_ENV === 'production') {
    new Logger('AiModule').warn(
      'LLM_API_KEY absente : IA désactivée, les questions partent sans piste',
    );
    return new DisabledLlmAdapter();
  }
  return new FakeLlmAdapter();
}

// Module ai (propriétaire : Joachim, rôle 5) : piste IA (S2), puis les autres usages du modèle.
@Module({
  providers: [
    PrismaHintStore,
    AiHintJob,
    { provide: LLM_PORT, inject: [ENV], useFactory: llmFor },
    {
      provide: GenerateHint,
      inject: [PrismaHintStore, LLM_PORT, ENV],
      useFactory: (store: PrismaHintStore, llm: LlmPort, env: Env) =>
        new GenerateHint(store, llm, {
          hourlyQuotaPerUser: env.LLM_HOURLY_QUOTA_PER_USER,
          timeoutMs: env.LLM_HINT_TIMEOUT_MS,
        }),
    },
  ],
  exports: [GenerateHint],
})
export class AiModule {}
