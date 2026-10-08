// Essai manuel de la piste IA contre la vraie API Claude (docs/architecture/09-ia-integrations.md) :
//   pnpm --filter @devhub/api ai:try ["titre de la question"]
// Exige LLM_API_KEY dans le .env racine. Un appel coûte environ un centime.
import 'reflect-metadata';
import { loadEnv } from '../../infrastructure/config/env';
import { hintInputHash, prepareHintInput } from './domain/hint-input';
import { AnthropicLlmAdapter } from './infrastructure/anthropic-llm.adapter';
import { HINT_PROMPT_VERSION, hintSystemPrompt, hintUserContent } from './prompts/hint.v1';

async function main(): Promise<void> {
  const env = loadEnv();
  if (!env.LLM_API_KEY) throw new Error('LLM_API_KEY est vide dans le .env : rien à essayer.');

  const input = prepareHintInput({
    id: 'essai',
    authorId: 'essai',
    title: process.argv[2] ?? 'nginx renvoie 502 Bad Gateway devant mon API Node dans Docker',
    body: "En local l'API répond sur le port 3000, mais derrière nginx dans docker compose j'ai une 502.",
    codeSnippet: 'location / { proxy_pass http://localhost:3000; }',
    lang: 'fr',
    tags: ['nginx', 'Docker', 'Node.js'],
    aiStatus: 'pending',
  });
  const result = await AnthropicLlmAdapter.create(env.LLM_API_KEY, env.LLM_MODEL).complete({
    task: 'hint',
    promptVersion: HINT_PROMPT_VERSION,
    system: hintSystemPrompt(input.lang),
    userContent: hintUserContent(input),
    maxTokens: 1_024,
    timeoutMs: env.LLM_HINT_TIMEOUT_MS,
  });

  console.log(
    `Modèle ${env.LLM_MODEL} · prompt ${HINT_PROMPT_VERSION} · empreinte ${hintInputHash(input).slice(0, 12)}`,
  );
  if (!result.ok) {
    console.log(`Échec : ${result.reason} ${result.detail ?? ''} (${result.latencyMs} ms)`);
    process.exitCode = 1;
    return;
  }
  console.log(
    `${result.latencyMs} ms · ${result.inputTokens} jetons en entrée · ${result.outputTokens} en sortie\n`,
  );
  console.log(result.text);
}

void main();
