import { Resolver } from 'node:dns/promises';
import { connect, type PeerCertificate, type TLSSocket } from 'node:tls';
import type { DomainFacts } from '../domain/facts';
import { apexOf } from '../domain/page';
import type { SafeFetcher } from './safe-fetch';

/** Sélecteurs DKIM courants (Google Workspace, Microsoft 365, Zoho, Resend, Mailgun…). */
const DKIM_SELECTORS = [
  'google',
  'selector1',
  'selector2',
  'default',
  'k1',
  'mail',
  'dkim',
  's1',
  's2',
  'zoho',
  'resend',
  'mx',
];

interface Handshake {
  protocol: string | null;
  alpn: string | null;
  cert: PeerCertificate | null;
  authorized: boolean;
  authError: string | null;
}

/** Poignée de main TLS sur une adresse publique déjà vérifiée (jamais de réseau interne). */
function handshake(
  ip: string,
  servername: string,
  opts: { minVersion?: 'TLSv1' | 'TLSv1.2'; maxVersion?: 'TLSv1.1' | 'TLSv1.3'; ciphers?: string },
): Promise<Handshake | null> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v: Handshake | null, s?: TLSSocket) => {
      if (done) return;
      done = true;
      s?.destroy();
      resolve(v);
    };
    const socket = connect({
      host: ip,
      port: 443,
      servername,
      rejectUnauthorized: false,
      ALPNProtocols: ['h2', 'http/1.1'],
      minVersion: opts.minVersion,
      maxVersion: opts.maxVersion,
      ciphers: opts.ciphers,
      timeout: 6_000,
    });
    socket.once('secureConnect', () =>
      finish(
        {
          protocol: socket.getProtocol(),
          alpn: socket.alpnProtocol || null,
          cert: socket.getPeerCertificate(),
          authorized: socket.authorized,
          authError: socket.authorizationError ? String(socket.authorizationError) : null,
        },
        socket,
      ),
    );
    socket.once('error', () => finish(null, socket));
    socket.once('timeout', () => finish(null, socket));
  });
}

const covers = (san: string, name: string) =>
  san
    .split(/,\s*/)
    .map((x) => x.replace(/^DNS:/, '').toLowerCase())
    .some(
      (d) =>
        d === name ||
        (d.startsWith('*.') &&
          name.endsWith(d.slice(1)) &&
          name.split('.').length === d.split('.').length),
    );

/** Certificat TLS, protocoles acceptés et DNS du domaine de l'application. */
export async function probeDomain(
  fetcher: SafeFetcher,
  url: string,
  now = new Date(),
): Promise<DomainFacts> {
  const host = new URL(url).hostname.toLowerCase();
  const apex = apexOf(host);
  const resolver = new Resolver({ timeout: 3_000, tries: 1 });
  const safe = <T>(p: Promise<T>, fallback: T) => p.catch(() => fallback);

  let tls: DomainFacts['tls'] = null;
  if (url.startsWith('https://')) {
    const [ip] = await fetcher.resolve(host); // lève si l'adresse est privée
    const main = ip ? await handshake(ip, host, {}) : null;
    if (main?.cert && Object.keys(main.cert).length) {
      const validTo = main.cert.valid_to ? new Date(main.cert.valid_to) : null;
      // Anciennes versions : on autorise côté client TLS 1.0/1.1 (sécurité OpenSSL abaissée) ;
      // si le serveur accepte la poignée de main, il les accepte aussi pour ses visiteurs.
      const legacy = ip
        ? await handshake(ip, host, {
            minVersion: 'TLSv1',
            maxVersion: 'TLSv1.1',
            ciphers: 'DEFAULT@SECLEVEL=0',
          })
        : null;
      const issuer = main.cert.issuer as Record<string, string | string[]> | undefined;
      // www. peut avoir son propre certificat (Caddy en émet un par nom) : on le vérifie lui-même.
      let coversWww: boolean | null =
        host === apex ? covers(main.cert.subjectaltname ?? '', `www.${apex}`) : null;
      if (coversWww === false) {
        const wwwIp = await fetcher
          .resolve(`www.${apex}`)
          .then((a) => a[0])
          .catch(() => undefined);
        const www = wwwIp ? await handshake(wwwIp, `www.${apex}`, {}) : null;
        if (www?.authorized) coversWww = true;
      }
      tls = {
        protocol: main.protocol,
        alpn: main.alpn,
        validTo: validTo?.toISOString() ?? null,
        daysLeft: validTo ? Math.floor((validTo.getTime() - now.getTime()) / 86_400_000) : null,
        issuer: issuer ? String(issuer.O ?? issuer.CN ?? '') || null : null,
        authorized: main.authorized,
        authError: main.authError,
        coversWww,
        legacyProtocols: legacy?.protocol ? [legacy.protocol.replace('TLSv', 'TLS ')] : [],
      };
    }
  }

  const txt = (name: string) =>
    safe(resolver.resolveTxt(name), [] as string[][]).then((r) => r.map((x) => x.join('')));
  const [ipv4, ipv6, caa, mx, apexTxt, dmarcTxt, www] = await Promise.all([
    safe(resolver.resolve4(host), [] as string[]),
    safe(resolver.resolve6(host), [] as string[]),
    safe(resolver.resolveCaa(apex), []).then((r) =>
      r.map((c) => `${c.critical ? '!' : ''}${c.issue ?? c.issuewild ?? c.iodef ?? ''}`),
    ),
    safe(resolver.resolveMx(apex), []).then((r) =>
      r.sort((a, b) => a.priority - b.priority).map((m) => m.exchange),
    ),
    txt(apex),
    txt(`_dmarc.${apex}`),
    host === apex || host === `www.${apex}`
      ? safe(resolver.resolve4(`www.${apex}`), [] as string[]).then((r) => r.length > 0)
      : Promise.resolve(null),
  ]);
  const dkim = (
    await Promise.all(
      DKIM_SELECTORS.map(async (s) =>
        (await txt(`${s}._domainkey.${apex}`)).some((t) => /v=DKIM1|k=rsa|p=/i.test(t)) ? s : null,
      ),
    )
  ).filter((s): s is string => s !== null);

  return {
    host,
    apex,
    tls,
    dns: {
      ipv4,
      ipv6,
      caa,
      mx,
      spf: apexTxt.find((t) => /^v=spf1\b/i.test(t)) ?? null,
      dmarc: dmarcTxt.find((t) => /^v=DMARC1\b/i.test(t)) ?? null,
      dkimSelectors: dkim,
      wwwResolves: www,
    },
  };
}
