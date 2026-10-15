// Y8, BUG-033 : réponse publiée N ms après l'ouverture de /sos/:id, reçue en direct ou non.
// Les questions sont créées par trois comptes (limite de 10 questions par heure et par compte).
// Usage : node scripts/verif/realtime.mjs 2000,1000,500,0  (build de production conseillé : vite preview)
import { launch, loginAs, api, WEB } from './lib.mjs';
const delays = (process.argv[2] ?? '2000,2000,2000,500,200,50').split(',').map(Number);
const b = await launch();
const A = await loginAs(b, 'awa-dev');
const K = await loginAs(b, 'kofi-dev');
const askers = [
  await loginAs(b, 'admin-dev'),
  await loginAs(b, 'pr-author-42'),
  await loginAs(b, 'demo-dev'),
];
let n = 0;
let opens = [];
A.page.on('request', (r) => {
  if (r.url().includes('/api/v1/events')) opens.push({ t: Date.now(), u: new URL(r.url()).search });
});
for (const d of delays) {
  const qr = await api(askers[n++ % 3].page, 'POST', '/questions', {
    clientId: crypto.randomUUID(),
    title: `Essai temps réel ${Date.now() % 1e6}`,
    body: 'Vérifier la réception des réponses en direct.',
    tagSlugs: ['docker'],
    urgency: 'low',
    lang: 'fr',
  });
  const q = qr.json;
  if (qr.status !== 201) {
    console.log(`création refusée : ${qr.status} ${q.code}`);
    continue;
  }
  opens = [];
  const t0 = Date.now();
  await A.page.goto(`${WEB}/sos/${q.id}`, { waitUntil: 'domcontentloaded' });
  await A.page.waitForTimeout(d);
  const marker = `marqueur-${Date.now()}`;
  const tA = Date.now();
  const ar = await api(K.page, 'POST', `/questions/${q.id}/answers`, {
    clientId: crypto.randomUUID(),
    body: `Réponse ${marker} en direct.`,
  });
  if (ar.status !== 201) console.log(`réponse refusée : ${ar.status} ${ar.json.code}`);
  const ok = await A.page
    .getByText(marker)
    .waitFor({ timeout: 10000 })
    .then(() => Date.now() - tA)
    .catch(() => null);
  console.log(
    `délai ${d} ms → ${ok === null ? 'NON reçue en 10 s' : `reçue en ${ok} ms`} | connexions /events : ${opens.map((o) => `+${o.t - t0}ms ${o.u.includes('question') ? 'avec sujet' : 'sans sujet'}`).join(', ')}`,
  );
}
await b.close();
