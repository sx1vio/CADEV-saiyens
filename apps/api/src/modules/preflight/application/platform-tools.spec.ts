import { describe, expect, it, vi } from 'vitest';
import { PreflightMcpServer } from './mcp-server';
import {
  buildPath,
  describeTool,
  inputSchemaOf,
  PLATFORM_TOOLS,
  resultText,
  toBody,
  toQuery,
} from './platform-tools';

const deps = {
  run: vi.fn(),
  get: () => Promise.resolve(null),
  listMine: () => Promise.resolve([]),
  links: (id: string) => ({ page: id, json: id, markdown: id }),
  version: '2.0.0',
};
const rpc = (method: string, params?: Record<string, unknown>) => ({
  jsonrpc: '2.0',
  id: 1,
  method,
  ...(params ? { params } : {}),
});
const tool = (name: string) => PLATFORM_TOOLS.find((t) => t.name === name)!;

describe('outils plateforme du serveur MCP', () => {
  it('a des noms uniques et un schéma d’entrée JSON pour chaque outil', () => {
    const names = PLATFORM_TOOLS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
    for (const t of PLATFORM_TOOLS) {
      const d = describeTool(t);
      expect(d.inputSchema.type).toBe('object');
      expect(JSON.stringify(d.inputSchema)).not.toContain('clientId');
    }
  });

  it('met les paramètres de chemin dans le schéma, obligatoires', () => {
    const s = inputSchemaOf(tool('answer_question')) as { required: string[]; properties: object };
    expect(s.required).toEqual(expect.arrayContaining(['id', 'body']));
    expect(Object.keys(s.properties)).toEqual(expect.arrayContaining(['id', 'body']));
  });

  it('construit le chemin en encodant les paramètres, refuse un paramètre manquant', () => {
    expect(buildPath(tool('get_passport'), { handle: 'awa dev/x' })).toBe('/u/awa%20dev%2Fx');
    expect(buildPath(tool('get_passport'), {})).toBeNull();
  });

  it('génère le clientId des écritures hors ligne et convertit la requête en chaînes', () => {
    const body = toBody(tool('ask_question'), { title: 'x' }) as { clientId: string };
    expect(body.clientId).toMatch(/^[0-9a-f-]{36}$/);
    expect(toQuery({ limit: 5, mine: true, q: 'vite', x: undefined })).toEqual({
      limit: '5',
      mine: 'true',
      q: 'vite',
    });
  });

  it('rend les erreurs de l’API lisibles pour l’agent', () => {
    const r = resultText(403, { code: 'auth.token_scope', title: 'scope' });
    expect(r.isError).toBe(true);
    expect(r.text).toContain('Plateforme');
    expect(resultText(204, undefined)).toEqual({ text: 'Fait.', isError: false });
  });
});

describe('PreflightMcpServer selon la portée du jeton', () => {
  it('portée pré-vol : trois outils, et les outils plateforme répondent par une consigne', async () => {
    const mcp = new PreflightMcpServer(deps);
    const list = (await mcp.handle(rpc('tools/list'), 'u1')) as {
      result: { tools: { name: string }[] };
    };
    expect(list.result.tools).toHaveLength(3);
    const call = (await mcp.handle(rpc('tools/call', { name: 'whoami', arguments: {} }), 'u1')) as {
      result: { isError: boolean; content: { text: string }[] };
    };
    expect(call.result.isError).toBe(true);
    expect(call.result.content[0]!.text).toContain('Plateforme');
  });

  it('portée plateforme : liste complète, appel de la vraie route avec le bon chemin', async () => {
    const api = vi.fn().mockResolvedValue({ status: 200, body: { handle: 'awa' } });
    const mcp = new PreflightMcpServer(deps);
    const who = { userId: 'u1', scope: 'platform' as const, api };
    const list = (await mcp.handle(rpc('tools/list'), who)) as {
      result: { tools: { name: string }[] };
    };
    expect(list.result.tools.length).toBe(3 + PLATFORM_TOOLS.length + 1);
    const call = (await mcp.handle(
      rpc('tools/call', { name: 'answer_question', arguments: { id: 'q1', body: 'Essaie ça' } }),
      who,
    )) as { result: { isError: boolean } };
    expect(call.result.isError).toBe(false);
    expect(api).toHaveBeenCalledWith({
      method: 'POST',
      path: '/questions/q1/answers',
      body: { body: 'Essaie ça', clientId: expect.any(String) },
    });
  });

  it('call_api refuse un chemin qui sort de /api/v1', async () => {
    const api = vi.fn();
    const mcp = new PreflightMcpServer(deps);
    const who = { userId: 'u1', scope: 'platform' as const, api };
    for (const path of ['/../admin', 'http://evil', '//evil.com/x']) {
      const r = (await mcp.handle(
        rpc('tools/call', { name: 'call_api', arguments: { method: 'GET', path } }),
        who,
      )) as { result: { isError: boolean } };
      expect(r.result.isError).toBe(true);
    }
    expect(api).not.toHaveBeenCalled();
  });
});
