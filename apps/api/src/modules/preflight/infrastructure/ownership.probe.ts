import { resolveTxt } from 'node:dns/promises';
import { containsToken } from '../domain/ownership';
import type { SafeFetcher } from './safe-fetch';

/**
 * Vérifie la preuve de propriété : le fichier https://<hôte>/.well-known/devhub-verify.txt,
 * ou un enregistrement TXT sur _devhub-verify.<hôte> (ou sur l'hôte lui-même).
 */
export async function verifyOwnership(
  fetcher: SafeFetcher,
  proof: { host: string; token: string; fileUrl: string; dnsName: string },
): Promise<'well-known' | 'dns' | null> {
  try {
    const res = await fetcher.get(proof.fileUrl, {
      maxBytes: 2048,
      timeoutMs: 6_000,
      maxRedirects: 2,
    });
    if (res.status === 200 && containsToken(res.body.toString('utf8'), proof.token)) {
      return 'well-known';
    }
  } catch {
    /* fichier absent ou site injoignable : on essaie le DNS */
  }
  for (const name of [proof.dnsName, proof.host]) {
    try {
      const records = await resolveTxt(name);
      if (records.some((r) => containsToken(r.join(''), proof.token))) return 'dns';
    } catch {
      /* pas d'enregistrement */
    }
  }
  return null;
}
