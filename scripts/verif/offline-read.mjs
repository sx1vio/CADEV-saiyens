// O1 : contenus déjà ouverts relus sans réseau (build de production + service worker, vite preview),
// et confidentialité du cache (déconnexion, changement de compte, session expirée).
import { launch, loginAs, shot, WEB } from './lib.mjs';
const qid = process.argv[2];
const b = await launch();
const { ctx, page } = await loginAs(b, 'awa-dev');
await page
  .waitForFunction(() => navigator.serviceWorker?.controller, null, { timeout: 15000 })
  .catch(async () => {
    await page.reload();
    await page.waitForFunction(() => navigator.serviceWorker?.controller, null, { timeout: 15000 });
  });
const pages = [`sos/${qid}`, 'sos', 'u/kofi-dev', 'projets', 'classement', 'systalink'];
for (const p of pages) {
  await page.goto(`${WEB}/${p}`);
  await page.waitForLoadState('networkidle');
}
const entries = () =>
  page.evaluate(async () => {
    if (!(await caches.has('api-content'))) return [];
    const c = await caches.open('api-content');
    return (await c.keys()).map((r) => new URL(r.url).pathname + new URL(r.url).search);
  });
console.log('en cache :', (await entries()).join(' '));

await ctx.setOffline(true);
for (const p of pages) {
  await page
    .goto(`${WEB}/${p}`)
    .catch((e) =>
      console.log(`${p} : navigation hors ligne impossible (${e.message.split('\n')[0]})`),
    );
  await page.waitForTimeout(2500);
  const text = await page
    .locator('main')
    .innerText()
    .catch(() => '');
  console.log(
    `hors ligne ${p} : ${text.length} caractères ; extrait « ${text.replace(/\s+/g, ' ').slice(0, 90)} »`,
  );
  await shot(page, `offline-${p.replace(/\//g, '_')}`);
}
await ctx.setOffline(false);

// Session expirée : le cookie disparaît sans déconnexion ni événement session.ended.
await ctx.clearCookies();
await page.goto(`${WEB}/sos`);
await page.waitForLoadState('networkidle');
console.log(
  'après expiration de session (visiteur anonyme), entrées en cache :',
  (await entries()).length,
);

// Changement de compte sur le même appareil.
await page.goto(`${WEB}/api/v1/auth/github?login=awa-dev`);
await page.waitForLoadState('networkidle');
await page.goto(`${WEB}/u/awa-dev`);
await page.waitForLoadState('networkidle');
console.log('awa reconnectée, entrées :', (await entries()).length);
await page.goto(`${WEB}/api/v1/auth/github?login=kofi-dev`);
await page.waitForLoadState('networkidle');
await page.waitForTimeout(1500);
console.log('kofi connecté sur le même appareil, entrées :', (await entries()).join(' '));
await b.close();
