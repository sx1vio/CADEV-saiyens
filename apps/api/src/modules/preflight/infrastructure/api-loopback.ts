import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import type { ApiCaller } from '../application/platform-tools';

// Les outils plateforme du serveur MCP appellent l'API par la boucle locale, avec le jeton de
// l'appelant : chaque appel repasse par les gardes (portée du jeton, routes fermées), les
// validations, les quotas et la modération, exactement comme depuis l'application.

const TIMEOUT_MS = 30_000;

/** Port d'écoute du serveur HTTP de l'API ; null s'il n'écoute pas (tests sans listen). */
export function listeningPort(server: Server | undefined): number | null {
  const addr = server?.address();
  return addr && typeof addr === 'object' ? addr.port : null;
}

export function loopbackCaller(
  port: number,
  opts: { authorization: string; clientIp?: string },
): ApiCaller {
  return async ({ method, path, query, body }) => {
    const qs = query && Object.keys(query).length ? `?${new URLSearchParams(query)}` : '';
    const headers: Record<string, string> = {
      authorization: opts.authorization,
      accept: 'application/json',
      'x-devhub-client': 'mcp',
    };
    if (opts.clientIp) headers['x-forwarded-for'] = opts.clientIp;
    if (method !== 'GET') {
      headers['content-type'] = 'application/json';
      // Les écritures exigent une clé d'idempotence : une par appel d'outil.
      headers['idempotency-key'] = randomUUID();
    }
    const res = await fetch(`http://127.0.0.1:${port}/api/v1${path}${qs}`, {
      method,
      headers,
      body: method === 'GET' || body === undefined ? undefined : JSON.stringify(body),
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const raw = await res.text();
    let parsed: unknown = raw;
    if (raw && (res.headers.get('content-type') ?? '').includes('json')) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = raw;
      }
    }
    return { status: res.status, body: parsed };
  };
}
