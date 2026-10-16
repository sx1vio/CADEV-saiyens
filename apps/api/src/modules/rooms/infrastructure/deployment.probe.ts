import { lookup } from 'node:dns/promises';
import { Injectable } from '@nestjs/common';
import { isPrivateAddress } from '../../../infrastructure/http/public-address';
import { DeploymentUnreachableError } from '../domain/deployment';
import type { DeploymentProbe, ProbeResponse } from '../domain/ports';

/** Jeton à lire dans les premiers octets : un fichier texte ou l'en-tête d'une page. */
const MAX_BYTES = 64 * 1024;
const TIMEOUT_MS = 8_000;

/**
 * Appelle l'URL d'une application déployée, en refusant le réseau interne (anti-SSRF) à
 * chaque redirection. Renvoie les adresses IP résolues : elles disent si l'application
 * tourne chez Systalink.
 */
@Injectable()
export class HttpDeploymentProbe implements DeploymentProbe {
  async fetch(raw: string): Promise<ProbeResponse> {
    let url = new URL(raw);
    const started = Date.now();
    for (let hop = 0; hop < 4; hop++) {
      const ips = await this.publicIps(url);
      let res: Response;
      try {
        res = await fetch(url, {
          signal: AbortSignal.timeout(TIMEOUT_MS),
          redirect: 'manual',
          headers: { 'User-Agent': 'DevHubProof/1.0 (+https://devhub.africa)', Accept: '*/*' },
        });
      } catch {
        throw new DeploymentUnreachableError();
      }
      const location = res.headers.get('location');
      if (res.status >= 300 && res.status < 400 && location) {
        await res.body?.cancel();
        url = new URL(location, url);
        continue;
      }
      return {
        status: res.status,
        body: await readStart(res),
        ips,
        latencyMs: Date.now() - started,
      };
    }
    throw new DeploymentUnreachableError();
  }

  private async publicIps(url: URL): Promise<string[]> {
    if (url.protocol !== 'https:') throw new DeploymentUnreachableError();
    const addrs = await lookup(url.hostname, { all: true }).catch(() => []);
    if (!addrs.length || addrs.some((a) => isPrivateAddress(a.address))) {
      throw new DeploymentUnreachableError();
    }
    return addrs.map((a) => a.address);
  }
}

async function readStart(res: Response): Promise<string> {
  if (!res.body) return '';
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.byteLength;
  }
  await reader.cancel().catch(() => undefined);
  return new TextDecoder().decode(Buffer.concat(chunks).subarray(0, MAX_BYTES));
}
