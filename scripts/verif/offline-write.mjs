// O2, O3, O8 : rédiger sans réseau (simulateur ?net=offline), recharger, puis synchroniser
// par POST /sync au retour du réseau, sans doublon.
import { launch, loginAs, shot, api, WEB } from './lib.mjs';
const b = await launch();
const A = await loginAs(b, 'awa-dev');
const q = await api(A.page, 'POST', '/questions', {
  clientId: crypto.randomUUID(),
  title: `Prisma ne trouve pas DATABASE_URL en CI ${Date.now() % 1e5}`,
  body: 'Le job de CI échoue sur prisma migrate deploy : variable DATABASE_URL introuvable.',
  tagSlugs: ['docker'],
  urgency: 'normal',
  lang: 'fr',
});
console.log('question en ligne (awa)', q.status, q.json.id);
const K = await loginAs(b, 'kofi-dev');
const queue = () =>
  K.page.evaluate(
    () =>
      new Promise((res) => {
        const o = indexedDB.open('devhub-queue');
        o.onsuccess = () => {
          const r = o.result.transaction('actions').objectStore('actions').getAll();
          r.onsuccess = () => res(r.result.map((a) => `${a.type}:${a.status}`));
        };
        o.onerror = () => res(['indexeddb ?']);
      }),
  );
await K.page.goto(`${WEB}/sos/${q.json.id}?net=offline`);
await K.page.waitForTimeout(1500);
console.log('bannière :', await K.page.getByText('Réseau coupé par le simulateur.').isVisible());
const sent = [];
K.page.on(
  'request',
  (r) =>
    r.url().includes('/api/v1/') &&
    r.method() !== 'GET' &&
    sent.push(`${r.method()} ${new URL(r.url()).pathname}`),
);
await K.page.fill(
  '#answer',
  'Hors ligne : ajoute DATABASE_URL dans env: du job, pas seulement dans .env.',
);
await K.page.getByRole('button', { name: /^Répondre$/ }).click();
await K.page.waitForTimeout(800);
// Navigation interne : un rechargement complet perdrait ?net=offline (non mémorisé).
await K.page
  .getByRole('link', { name: /SOS Dev/ })
  .first()
  .click();
await K.page.waitForTimeout(1000);
await K.page
  .getByRole('button', { name: /Je suis bloqué/ })
  .first()
  .click();
await K.page.fill('#ask-title', `Question rédigée hors ligne ${Date.now() % 1e5}`);
await K.page.fill('#ask-tags', 'docker');
await K.page.press('#ask-tags', 'Enter');
await K.page.getByRole('button', { name: /^Continuer$/ }).click();
await K.page.fill('#ask-goal', 'Vérifier la file hors ligne.');
await K.page.getByRole('button', { name: /Publier ma question/ }).click();
await K.page.waitForTimeout(1000);
await shot(K.page, 'offline-write-1');
console.log('file après rédaction :', await queue(), '| écritures parties :', sent.length);
const sync = K.page
  .waitForResponse((r) => r.url().endsWith('/api/v1/sync'), { timeout: 15000 })
  .catch(() => null);
await K.page.getByRole('button', { name: 'Rétablir' }).click();
const r = await sync;
console.log(
  'POST /sync',
  r?.status(),
  r ? JSON.stringify((await r.json()).results?.map((x) => x.status)) : 'aucun',
);
await K.page.waitForTimeout(2000);
console.log('file après retour :', await queue());
const detail = (await api(K.page, 'GET', `/questions/${q.json.id}`)).json;
console.log('réponses sur la question :', detail.answers?.length);
const mine = (await api(K.page, 'GET', '/questions?mine=true')).json.data;
console.log(
  'questions de kofi :',
  mine.map((x) => x.title),
);
await K.page.reload();
await K.page.waitForTimeout(2000);
console.log(
  'après rechargement en ligne : réponses',
  (await api(K.page, 'GET', `/questions/${q.json.id}`)).json.answers?.length,
  '| questions',
  (await api(K.page, 'GET', '/questions?mine=true')).json.data.length,
);
await shot(K.page, 'offline-write-2');
await b.close();
