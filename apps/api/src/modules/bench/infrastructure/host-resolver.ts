import { lookup } from 'node:dns/promises';

/** Adresses IP d'un nom d'hôte ; injectable pour les tests. */
export type HostResolver = (hostname: string) => Promise<string[]>;
export const BENCH_HOST_RESOLVER = Symbol('BENCH_HOST_RESOLVER');

const TIMEOUT_MS = 3_000;

/** Résolution DNS bornée à 3 s : la publication d'une demande n'attend jamais plus. */
export const dnsResolver: HostResolver = async (hostname) => {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('dns timeout')), TIMEOUT_MS);
  });
  try {
    const addrs = await Promise.race([lookup(hostname, { all: true }), timeout]);
    return addrs.map((a) => a.address);
  } finally {
    clearTimeout(timer);
  }
};
