import type { PreflightReport } from '@devhub/contracts';
import { describe, expect, it, vi } from 'vitest';
import { PreflightMcpServer } from './mcp-server';
import { NothingToCheckError, PreflightQuotaError } from './run-preflight';

const ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

const report: PreflightReport = {
  id: ID,
  url: 'https://app.exemple.sn',
  repo: null,
  createdAt: '2026-11-04T10:00:00.000Z',
  durationMs: 1200,
  score: 80,
  verdict: 'review',
  counts: { pass: 3, warn: 2, fail: 0, info: 0 },
  metrics: null,
  repoSummary: null,
  checks: [
    {
      id: 'site.security_headers',
      category: 'security',
      status: 'warn',
      title: 'En-têtes de sécurité incomplets',
      detail: 'Il manque Content-Security-Policy.',
      fix: 'Ajoute un en-tête Content-Security-Policy.',
      evidence: [],
    },
  ],
  author: { handle: 'awa-dev', displayName: 'Awa' },
};

function server(run = vi.fn().mockResolvedValue(ID)) {
  return {
    run,
    mcp: new PreflightMcpServer({
      run,
      get: (id) => Promise.resolve(id === ID ? report : null),
      listMine: () =>
        Promise.resolve([
          {
            id: ID,
            url: report.url,
            repo: null,
            createdAt: report.createdAt,
            score: 80,
            verdict: 'review',
            counts: report.counts,
          },
        ]),
      links: (id) => ({
        page: `https://devhub.africa/prevol/${id}`,
        json: `https://devhub.africa/api/v1/preflight/${id}`,
        markdown: `https://devhub.africa/api/v1/preflight/${id}/report.md`,
      }),
      version: '1.0.0',
    }),
  };
}

const rpc = (method: string, params?: Record<string, unknown>) => ({
  jsonrpc: '2.0',
  id: 1,
  method,
  ...(params ? { params } : {}),
});

describe('PreflightMcpServer', () => {
  it('négocie la version du protocole et annonce les outils', async () => {
    const { mcp } = server();
    const init = await mcp.handle(rpc('initialize', { protocolVersion: '2025-06-18' }), 'u1');
    expect(init).toMatchObject({
      id: 1,
      result: { protocolVersion: '2025-06-18', capabilities: { tools: {} } },
    });
    const unknown = await mcp.handle(rpc('initialize', { protocolVersion: '1999-01-01' }), 'u1');
    expect(unknown).toMatchObject({ result: { protocolVersion: '2025-06-18' } });
    const list = (await mcp.handle(rpc('tools/list'), 'u1')) as {
      result: { tools: { name: string }[] };
    };
    expect(list.result.tools.map((t) => t.name)).toEqual([
      'run_preflight',
      'get_preflight_report',
      'list_preflights',
    ]);
  });

  it('ne répond pas aux notifications et refuse les messages invalides', async () => {
    const { mcp } = server();
    const notification = { jsonrpc: '2.0', method: 'notifications/initialized' };
    expect(await mcp.handle(notification, 'u1')).toBe(null);
    expect(await mcp.handle({ hello: 'world' }, 'u1')).toMatchObject({
      error: { code: -32600 },
    });
    expect(await mcp.handle(rpc('resources/list'), 'u1')).toMatchObject({
      error: { code: -32601 },
    });
    expect(await mcp.handle(rpc('tools/call', { name: 'rm_rf' }), 'u1')).toMatchObject({
      error: { code: -32602 },
    });
  });

  it('lance un pré-vol au nom du titulaire du jeton et renvoie le rapport Markdown', async () => {
    const { mcp, run } = server();
    const res = (await mcp.handle(
      rpc('tools/call', {
        name: 'run_preflight',
        arguments: { url: 'https://app.exemple.sn', repo: 'https://github.com/awa/app.git' },
      }),
      'u1',
    )) as { result: { content: { text: string }[]; isError: boolean } };
    expect(run).toHaveBeenCalledWith({
      userId: 'u1',
      url: 'https://app.exemple.sn',
      repo: 'awa/app',
    });
    expect(res.result.isError).toBe(false);
    expect(res.result.content[0]!.text).toContain('Consigne pour l’agent IA');
    expect(res.result.content[0]!.text).toContain('Content-Security-Policy');
  });

  it('signale les erreurs du pré-vol comme résultat d’outil, lisible par l’agent', async () => {
    const quota = server(vi.fn().mockRejectedValue(new PreflightQuotaError()));
    const r1 = (await quota.mcp.handle(
      rpc('tools/call', { name: 'run_preflight', arguments: { url: 'https://a.sn' } }),
      'u1',
    )) as { result: { content: { text: string }[]; isError: boolean } };
    expect(r1.result.isError).toBe(true);
    expect(r1.result.content[0]!.text).toMatch(/par heure/);

    const privateRepo = server(
      vi.fn().mockRejectedValue(new NothingToCheckError('repo_not_found')),
    );
    const r2 = (await privateRepo.mcp.handle(
      rpc('tools/call', { name: 'run_preflight', arguments: { repo: 'awa/secret' } }),
      'u1',
    )) as { result: { content: { text: string }[]; isError: boolean } };
    expect(r2.result.content[0]!.text).toMatch(/publics/);

    const { mcp, run } = server();
    const r3 = (await mcp.handle(
      rpc('tools/call', { name: 'run_preflight', arguments: { url: 'http://pas-https.sn' } }),
      'u1',
    )) as { result: { isError: boolean } };
    expect(r3.result.isError).toBe(true);
    expect(run).not.toHaveBeenCalled();
  });

  it('relit un rapport et liste les pré-vols', async () => {
    const { mcp } = server();
    const got = (await mcp.handle(
      rpc('tools/call', { name: 'get_preflight_report', arguments: { id: ID } }),
      'u1',
    )) as { result: { content: { text: string }[] } };
    expect(got.result.content[0]!.text).toContain(`https://devhub.africa/prevol/${ID}`);
    const list = (await mcp.handle(
      rpc('tools/call', { name: 'list_preflights', arguments: {} }),
      'u1',
    )) as { result: { content: { text: string }[] } };
    expect(list.result.content[0]!.text).toContain('80/100');
  });
});
