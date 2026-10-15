// Parcours SOS Dev de bout en bout (S1 à S4, Y8) : poser, piste IA, répondre (2e compte), valider, XP,
// avec les deux navigateurs ouverts pour vérifier le temps réel.
import { launch, loginAs, shot, api } from './lib.mjs';
const [asker, helper] = [process.argv[2] ?? 'awa-dev', process.argv[3] ?? 'kofi-dev'];
const b = await launch();
const A = await loginAs(b, asker, 'sos');
const K = await loginAs(b, helper, 'sos');
const xpBefore =
  (await api(K.page, 'GET', `/u/${helper}`)).json?.stats?.proofXp ??
  (await api(K.page, 'GET', `/u/${helper}`)).json?.proofXp;

// 1. Poser la question depuis le bouton « Demander de l'aide ».
const t0 = Date.now();
await A.page
  .getByRole('button', { name: /Je suis bloqué/ })
  .first()
  .click();
const title = `nginx renvoie 502 derrière Docker Compose ${Date.now() % 100000}`;
await A.page.fill('#ask-title', title);
await A.page.fill(
  '#ask-code',
  'upstream api { server localhost:3000; }\nAWS_SECRET_ACCESS_KEY=abcd1234abcd1234abcd1234abcd1234abcd1234',
);
await A.page.fill('#ask-tags', 'docker');
await A.page.press('#ask-tags', 'Enter');
await shot(A.page, 'sos-1-form');
await A.page.getByRole('button', { name: /^Continuer$/ }).click();
await A.page.fill('#ask-goal', 'Exposer mon API Node derrière nginx, mais nginx répond 502.');
await A.page.getByRole('button', { name: /Publier ma question/ }).click();
await A.page.waitForURL(/\/sos\/[0-9a-f-]{36}/, { timeout: 15000 });
const qid = A.page.url().split('/sos/')[1];
console.log('question créée', qid, `en ${Date.now() - t0} ms`);

// 2. Piste IA (worker) affichée sans recharger.
const hint = A.page.getByText(/Piste/).first();
await hint
  .waitFor({ timeout: 15000 })
  .then(() => console.log(`piste IA visible à ${Date.now() - t0} ms`))
  .catch(() => console.log('piste IA NON visible après 15 s'));
const detail = (await api(A.page, 'GET', `/questions/${qid}`)).json;
console.log(
  'aiStatus',
  detail.aiStatus ?? detail.aiHint?.status,
  'secretsMasked',
  detail.secretsMasked,
  'code contient le secret ?',
  JSON.stringify(detail).includes('abcd1234abcd'),
);
await shot(A.page, 'sos-2-question');

// 3. Réponse du 2e compte ; l'auteur doit la voir arriver en direct.
await K.page.goto(`${process.env.WEB ?? 'http://localhost:5175'}/sos/${qid}`);
await K.page.fill(
  '#answer',
  'Dans le conteneur nginx, localhost désigne nginx lui-même. Utilise le nom du service : `server api:3000;`.',
);
await K.page.getByRole('button', { name: /^Répondre$/ }).click();
const live = await A.page
  .getByText(/le nom du service/)
  .waitFor({ timeout: 10000 })
  .then(() => true)
  .catch(() => false);
console.log("réponse visible en direct chez l'auteur :", live);
const notifsA = (await api(A.page, 'GET', '/notifications')).json;
console.log('notifications auteur', JSON.stringify(notifsA.data?.map((n) => n.type)));

// 4. Validation par l'auteur ; XP pour l'aidant.
await A.page
  .getByRole('button', { name: /M'a débloqué/ })
  .first()
  .click();
await A.page.getByRole('button', { name: /^Confirmer$/ }).click();
await A.page.waitForTimeout(1500);
await shot(A.page, 'sos-3-accepted');
const after = (await api(A.page, 'GET', `/questions/${qid}`)).json;
console.log('statut', after.status);
const proofs = (await api(K.page, 'GET', `/u/${helper}/proofs`)).json;
console.log(
  'preuves aidant',
  JSON.stringify(
    proofs.data
      ?.slice(0, 3)
      ?.map((p) => [p.kind ?? p.type, p.points ?? p.amount, p.tagSlug ?? p.tag]),
  ),
);
const notifsK = (await api(K.page, 'GET', '/notifications')).json;
console.log('notifications aidant', JSON.stringify(notifsK.data?.map((n) => n.type)));
await K.page.waitForTimeout(1000);
await shot(K.page, 'sos-4-helper');
console.log('XP avant', xpBefore);
await b.close();
