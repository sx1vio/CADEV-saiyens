// Requêtes sortantes des collecteurs : agent poli, délai maximal, erreur sur toute réponse non 2xx.

const UA = 'Mozilla/5.0 (compatible; DevHubBot/0.1; +https://devhub.africa/bot)';

export async function fetchText(
  url: string,
  accept = 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
  timeoutMs = 12_000,
): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: accept },
    signal: AbortSignal.timeout(timeoutMs),
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

export async function fetchJson<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json', ...headers },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}
