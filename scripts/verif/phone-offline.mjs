// Jalon 3 (O1, O2, O3) en émulation téléphone : Moto G4, tactile, vraie coupure réseau du navigateur
// (context.setOffline), rechargement hors ligne servi par le service worker, synchronisation
// automatique au retour du réseau. Build de production obligatoire (vite preview).
import { createRequire } from 'node:module';
import { launch, shot, api, WEB } from './lib.mjs';
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { devices } = require('@playwright/test');
const b = await launch();
const ctx = await b.newContext({ ...devices['Moto G4'], locale: 'fr-FR' });
const page = await ctx.newPage();
const step = (m) => console.log(`• ${m}`);
await page.goto(`${WEB}/api/v1/auth/github?login=kofi-dev`);
await page.waitForLoadState('networkidle');
await page
  .waitForFunction(() => navigator.serviceWorker?.controller, null, { timeout: 15000 })
  .catch(() => page.reload());
// Une question ouverte d'un autre compte.
const asker = await (await b.newContext()).newPage();
await asker.goto(`${WEB}/api/v1/auth/github?login=awa-dev`);
const q = (
  await api(asker, 'POST', '/questions', {
    clientId: crypto.randomUUID(),
    title: `Téléphone : npm install échoue derrière un proxy ${Date.now() % 1e5}`,
    body: 'npm install renvoie ETIMEDOUT au bureau.',
    tagSlugs: ['nodejs'],
    urgency: 'normal',
    lang: 'fr',
  })
).json;
await page.goto(`${WEB}/sos/${q.id}`);
await page.waitForLoadState('networkidle');
step(`page ouverte en ligne (${page.viewportSize().width} px de large)`);

await ctx.setOffline(true);
await page.waitForTimeout(800);
step(
  `état réseau visible : « ${(await page.getByRole('status').allInnerTexts()).join(' / ').replace(/\s+/g, ' ').slice(0, 80)} »`,
);
const text = `Réponse du téléphone hors ligne ${Date.now() % 1e5} : configure npm config set proxy.`;
await page.fill('#answer', text);
await page.getByRole('button', { name: /^Répondre$/ }).tap();
await page.waitForTimeout(1000);
await shot(page, 'phone-1-queued');
const count = () =>
  page.evaluate(
    () =>
      new Promise((res) => {
        const o = indexedDB.open('devhub-queue');
        o.onsuccess = () => {
          const r = o.result.transaction('actions').objectStore('actions').count();
          r.onsuccess = () => res(r.result);
        };
        o.onerror = () => res(-1);
      }),
  );
step(`file hors ligne : ${await count()} action(s)`);

await page
  .reload()
  .catch((e) => step(`rechargement hors ligne impossible : ${e.message.split('\n')[0]}`));
await page.waitForTimeout(2500);
const main = (
  await page
    .locator('main')
    .innerText()
    .catch(() => '')
).replace(/\s+/g, ' ');
step(
  `après rechargement hors ligne : question lisible ${main.includes('npm install')} | réponse en attente visible ${main.includes(text.slice(0, 30))} | file ${await count()}`,
);
await shot(page, 'phone-2-reloaded-offline');

const synced = page
  .waitForResponse(
    (r) =>
      r.url().includes('/api/v1/sync') ||
      (r.url().includes('/answers') && r.request().method() === 'POST'),
    { timeout: 20000 },
  )
  .catch(() => null);
await ctx.setOffline(false);
const r = await synced;
step(
  `retour du réseau → ${r ? `${r.request().method()} ${new URL(r.url()).pathname} ${r.status()}` : 'aucun envoi en 20 s'}`,
);
await page.waitForTimeout(2500);
step(`file après retour : ${await count()}`);
const answers = (await api(asker, 'GET', `/questions/${q.id}`)).json.answers.filter(
  (a) => a.body === text,
);
step(`réponses identiques sur le serveur : ${answers.length} (attendu 1)`);
await shot(page, 'phone-3-synced');
await b.close();
