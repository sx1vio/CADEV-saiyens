import {
  CreatePreflightRequest,
  type PreflightListItem,
  type PreflightReport,
  PREFLIGHT_HOURLY_QUOTA,
} from '@devhub/contracts';
import { z } from 'zod';
import { toMarkdown } from '../domain/report';
import {
  LoadTestBusyError,
  LoadTestNeedsUrlError,
  LoadTestQuotaError,
  NothingToCheckError,
  OwnershipRequiredError,
  PreflightBusyError,
  PreflightQuotaError,
} from './run-preflight';

// Serveur MCP du pré-vol (transport « Streamable HTTP », mode sans état, réponses JSON) :
// l'agent IA du développeur (Claude Code, Cursor, Codex…) lance un pré-vol, lit le rapport et
// corrige le projet, sans quitter son éditeur. Spécification : modelcontextprotocol.io.

export const MCP_PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];

export interface McpDeps {
  run(input: {
    userId: string;
    url: string | null;
    repo: string | null;
    loadTest?: boolean;
  }): Promise<string>;
  get(id: string): Promise<PreflightReport | null>;
  listMine(userId: string): Promise<PreflightListItem[]>;
  links(id: string): { page: string; json: string; markdown: string };
  version: string;
}

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

type JsonRpcResponse =
  | { jsonrpc: '2.0'; id: string | number | null; result: unknown }
  | { jsonrpc: '2.0'; id: string | number | null; error: { code: number; message: string } };

const INSTRUCTIONS = [
  'DevHub Africa Pré-vol : vérifie une application déployée (HTTPS) et son dépôt GitHub public',
  'avant la mise en production — sécurité, chargement sur réseau 3G, dépendances vulnérables',
  '(base OSV), licences et hébergement.',
  'Après chaque déploiement, appelle run_preflight avec l’adresse publique et le dépôt, puis',
  'applique les corrections de la section « À corriger » dans l’ordre, en commençant par la',
  'sécurité. Relance run_preflight pour vérifier : le score doit monter et le verdict passer à',
  '« prêt ». Chaque pré-vol compte dans un quota de ' +
    `${PREFLIGHT_HOURLY_QUOTA} par heure : ne relance pas sans avoir corrigé quelque chose.`,
].join(' ');

const TOOLS = [
  {
    name: 'run_preflight',
    title: 'Lancer un pré-vol',
    description:
      'Vérifie une application en ligne et/ou un dépôt GitHub public (sécurité, dépendances, Lighthouse mobile réel, tenue à la charge en option ; 15 s à 2 min) et renvoie le ' +
      'rapport en Markdown : score sur 100, verdict, puis chaque point à corriger avec la ' +
      'correction à appliquer. Donne au moins url ou repo.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Adresse HTTPS publique de l’application déployée (ex. https://monapp.com).',
        },
        repo: {
          type: 'string',
          description: 'Dépôt GitHub public : « owner/repo » ou https://github.com/owner/repo.',
        },
        loadTest: {
          type: 'boolean',
          description:
            'Ajoute un test de charge (montée de 2 à 50 visiteurs simultanés, 30 s au plus). Exige que l’auteur ait prouvé contrôler le domaine : fichier https://<domaine>/.well-known/devhub-verify.txt ou enregistrement DNS, à récupérer sur la page Pré-vol de DevHub.',
        },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: true, idempotentHint: false },
  },
  {
    name: 'get_preflight_report',
    title: 'Relire un rapport de pré-vol',
    description: 'Renvoie en Markdown un rapport de pré-vol existant, à partir de son identifiant.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Identifiant (UUID) du rapport.' } },
      required: ['id'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'list_preflights',
    title: 'Mes derniers pré-vols',
    description: 'Liste tes derniers pré-vols (identifiant, cible, score, verdict, date).',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
];

const GetArgs = z.object({ id: z.uuid() });

/** Message d'erreur d'un pré-vol, à l'intention de l'agent. */
export function preflightFailureText(err: unknown): string | null {
  if (err instanceof PreflightQuotaError)
    return `Limite atteinte : ${PREFLIGHT_HOURLY_QUOTA} pré-vols par heure. Corrige d’abord les points du dernier rapport, puis réessaie plus tard.`;
  if (err instanceof PreflightBusyError)
    return 'Un pré-vol est déjà en cours sur ce compte. Attends qu’il se termine.';
  if (err instanceof OwnershipRequiredError)
    return 'Test de charge refusé : le domaine n’est pas prouvé. Demande à l’auteur de créer le fichier .well-known/devhub-verify.txt (ou l’enregistrement DNS) indiqué sur la page Pré-vol de DevHub, puis relance. Sans test de charge, relance avec loadTest: false.';
  if (err instanceof LoadTestQuotaError)
    return 'Limite atteinte : 3 tests de charge par heure. Relance sans loadTest, ou réessaie plus tard.';
  if (err instanceof LoadTestBusyError)
    return 'Un autre test de charge tourne sur le serveur. Réessaie dans une minute, ou relance sans loadTest.';
  if (err instanceof LoadTestNeedsUrlError)
    return 'Le test de charge a besoin de l’adresse publique de l’application (url).';
  if (err instanceof NothingToCheckError) {
    if (err.reason === 'repo_not_found')
      return 'Dépôt introuvable ou privé : le pré-vol ne lit que les dépôts GitHub publics.';
    if (err.reason === 'github_rate_limited')
      return 'GitHub limite temporairement les requêtes. Réessaie dans quelques minutes, ou lance le pré-vol sur l’adresse du site seulement.';
    return 'L’application ne répond pas, ou son adresse n’est pas publique (HTTPS sur Internet requis).';
  }
  return null;
}

const text = (t: string, isError = false) => ({ content: [{ type: 'text', text: t }], isError });

export class PreflightMcpServer {
  constructor(private readonly deps: McpDeps) {}

  /** Traite un message JSON-RPC ; null pour une notification (aucune réponse attendue). */
  async handle(message: unknown, userId: string): Promise<JsonRpcResponse | null> {
    if (!isRequest(message)) {
      return { jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid Request' } };
    }
    if (message.id === undefined) return null; // notifications/initialized, notifications/cancelled…
    const id = message.id;
    try {
      const result = await this.dispatch(message, userId);
      if (result === undefined) {
        return { jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } };
      }
      return { jsonrpc: '2.0', id, result };
    } catch (err) {
      if (err instanceof InvalidParams) {
        return { jsonrpc: '2.0', id, error: { code: -32602, message: err.message } };
      }
      throw err;
    }
  }

  private async dispatch(req: JsonRpcRequest, userId: string): Promise<unknown> {
    switch (req.method) {
      case 'initialize': {
        const asked = req.params?.protocolVersion;
        return {
          protocolVersion:
            typeof asked === 'string' && MCP_PROTOCOL_VERSIONS.includes(asked)
              ? asked
              : MCP_PROTOCOL_VERSIONS[1],
          capabilities: { tools: { listChanged: false } },
          serverInfo: {
            name: 'devhub-preflight',
            title: 'DevHub Africa — Pré-vol',
            version: this.deps.version,
          },
          instructions: INSTRUCTIONS,
        };
      }
      case 'ping':
        return {};
      case 'tools/list':
        return { tools: TOOLS };
      case 'tools/call':
        return this.callTool(req.params ?? {}, userId);
      default:
        return undefined;
    }
  }

  private async callTool(params: Record<string, unknown>, userId: string) {
    const args = (params.arguments ?? {}) as Record<string, unknown>;
    switch (params.name) {
      case 'run_preflight': {
        const parsed = CreatePreflightRequest.safeParse(args);
        if (!parsed.success) {
          return text(
            'Paramètres invalides : donne url (adresse HTTPS publique) et/ou repo (« owner/repo » d’un dépôt GitHub public).',
            true,
          );
        }
        try {
          const id = await this.deps.run({
            userId,
            url: parsed.data.url ?? null,
            repo: parsed.data.repo ?? null,
            loadTest: parsed.data.loadTest ?? false,
          });
          return this.reportText(id);
        } catch (err) {
          const msg = preflightFailureText(err);
          if (msg) return text(msg, true);
          throw err;
        }
      }
      case 'get_preflight_report': {
        const parsed = GetArgs.safeParse(args);
        if (!parsed.success) return text('Identifiant de rapport invalide (UUID attendu).', true);
        return this.reportText(parsed.data.id);
      }
      case 'list_preflights': {
        const items = await this.deps.listMine(userId);
        if (!items.length) return text('Aucun pré-vol pour l’instant. Lance run_preflight.');
        return text(
          items
            .map(
              (i) =>
                `- ${i.createdAt.slice(0, 16).replace('T', ' ')} · ${i.score}/100 · ${i.verdict} · ` +
                `${[i.url, i.repo].filter(Boolean).join(' + ')} · id ${i.id}`,
            )
            .join('\n'),
        );
      }
      default:
        throw new InvalidParams(`Unknown tool: ${String(params.name)}`);
    }
  }

  private async reportText(id: string) {
    const report = await this.deps.get(id);
    if (!report) return text('Rapport introuvable.', true);
    const links = this.deps.links(id);
    return text(toMarkdown(report, { page: links.page, json: links.json }));
  }
}

class InvalidParams extends Error {}

function isRequest(m: unknown): m is JsonRpcRequest {
  if (typeof m !== 'object' || m === null) return false;
  const r = m as Record<string, unknown>;
  return (
    r.jsonrpc === '2.0' &&
    typeof r.method === 'string' &&
    (r.id === undefined || r.id === null || typeof r.id === 'string' || typeof r.id === 'number') &&
    (r.params === undefined || (typeof r.params === 'object' && r.params !== null))
  );
}
