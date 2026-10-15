// R1, R2, R3, R8, R9 : créer une salle liée à un dépôt, demander à la rejoindre, accepter,
// créer une tâche, la prendre, l'envoyer en revue et la clôturer avec une PR vérifiée (+XP).
// Le faux client GitHub attribue la PR n° N au login « pr-author-N » (fusionnée si N est pair).
import { launch, loginAs, shot, api, WEB } from './lib.mjs';
const owner = process.argv[2] ?? 'awa-dev';
const N = Number(process.argv[3] ?? 42);
const contributor = `pr-author-${N}`;
const b = await launch();
const O = await loginAs(b, owner);
const C = await loginAs(b, contributor);
const step = (m) => console.log(`• ${m}`);

// R1 : créer la salle depuis l'interface.
await O.page.goto(`${WEB}/projets/nouvelle`);
await O.page.fill('#nr-repo', `${owner}/devhub-demo`);
await O.page.getByRole('button', { name: /Vérifier/ }).click();
await O.page.waitForTimeout(1500);
step(
  `dépôt vérifié : ${await O.page
    .getByText(/Vérifié|vérifié/)
    .first()
    .isVisible()}`,
);
const name = `Paiements mobile money ${Date.now() % 1e5}`;
await O.page.fill('#nr-name', name);
await O.page.fill('#nr-desc', 'SDK open source pour Wave et Orange Money, avec exemples Node.');
await O.page.fill('#nr-tags', 'nodejs');
await O.page.press('#nr-tags', 'Enter');
await O.page.getByRole('button', { name: 'Ouvrir la salle' }).click();
await O.page.waitForURL(/\/p\/[a-z0-9]+/, { timeout: 15000 });
const code = new URL(O.page.url()).pathname.split('/p/')[1];
const room = (await api(O.page, 'GET', `/rooms/${code}`)).json;
step(
  `salle créée ${code} (repo ${room.repo?.fullName} vérifié ${room.repo?.verified}, visibilité ${room.visibility})`,
);
await shot(O.page, 'room-1-created');

// R3 : le contributeur demande à rejoindre ; l'owner accepte.
await C.page.goto(`${WEB}/p/${code}`);
await C.page.getByRole('button', { name: 'Demander à rejoindre' }).first().click();
await C.page.fill('#join-msg', "Je connais l'API Wave, je peux aider sur les webhooks.");
await C.page.getByRole('dialog').getByRole('button', { name: 'Envoyer' }).click();
await C.page.waitForTimeout(1000);
const notifO = (await api(O.page, 'GET', '/notifications')).json.data.map((n) => n.type);
step(`notifications owner : ${notifO.join(', ')}`);
// Sur grand écran, l'onglet se choisit par ?tab= (pas de barre d'onglets).
await O.page.goto(`${WEB}/p/${code}?tab=requests`);
await O.page.getByRole('button', { name: 'Accepter' }).first().click();
await O.page.waitForTimeout(1500);
const roleC = (await api(C.page, 'GET', `/rooms/${code}`)).json.viewer;
step(`rôle du contributeur après acceptation : ${JSON.stringify(roleC)}`);
step(
  `notifications contributeur : ${(await api(C.page, 'GET', '/notifications')).json.data.map((n) => n.type).join(', ')}`,
);

// R2 : l'owner crée une tâche, le contributeur la prend et l'envoie en revue.
await O.page.goto(`${WEB}/p/${code}?tab=tasks`);
await O.page.getByRole('button', { name: 'Nouvelle tâche' }).first().click();
const taskTitle = `Webhook de confirmation Wave ${Date.now() % 1e4}`;
await O.page.fill('#task-title', taskTitle);
await O.page.fill('#task-desc', 'Vérifier la signature et mettre à jour la commande.');
await O.page.getByRole('button', { name: 'Publier la tâche' }).click();
await O.page.waitForTimeout(1200);
await C.page.reload();
const takeBtn = C.page.getByRole('button', { name: 'Je la prends' }).first();
step(`tâche visible chez le contributeur : ${await takeBtn.isVisible().catch(() => false)}`);
await takeBtn.click();
await C.page.waitForTimeout(1200);
const toReview = C.page.getByRole('button', { name: 'Envoyer en revue' }).first();
if (await toReview.isVisible().catch(() => false)) {
  await toReview.click();
  await C.page.waitForTimeout(800);
  const pr = C.page.locator('input[id*=pr], input[placeholder*=github]').first();
  if (await pr.isVisible().catch(() => false)) {
    await pr.fill(`https://github.com/${owner}/devhub-demo/pull/${N}`);
    await C.page.getByRole('dialog').getByRole('button').last().click();
  }
  await C.page.waitForTimeout(1000);
}
await shot(C.page, 'room-2-taken');
const tasks = (await api(O.page, 'GET', `/rooms/${room.id}/tasks`)).json.data;
step(`tâches : ${JSON.stringify(tasks.map((t) => [t.title, t.status, t.assignee?.handle]))}`);

// R8, R9 : l'owner clôture avec le lien de PR, vérification GitHub et +15 XP.
await O.page.goto(`${WEB}/p/${code}?tab=tasks`);
await O.page.getByRole('button', { name: 'Marquer terminée' }).first().click();
await O.page.fill('#pr-url', `https://github.com/${owner}/devhub-demo/pull/${N}`);
await O.page
  .getByRole('dialog')
  .getByRole('button', { name: /Valider|Marquer|Confirmer/ })
  .last()
  .click();
await O.page.waitForTimeout(2000);
await shot(O.page, 'room-3-completed');
const done = (await api(O.page, 'GET', `/rooms/${room.id}/tasks`)).json.data.find(
  (t) => t.title === taskTitle,
);
step(
  `tâche clôturée : ${JSON.stringify({ status: done?.status, verified: done?.verified ?? done?.prVerified, pr: done?.prUrl })}`,
);
const proofs = (await api(C.page, 'GET', `/u/${contributor}/proofs`)).json;
step(
  `XP contributeur : total ${proofs.totalXp} ; ${JSON.stringify(proofs.events.map((e) => [e.kind, e.points]))}`,
);
step(
  `notifications contributeur : ${(await api(C.page, 'GET', '/notifications')).json.data.map((n) => n.type).join(', ')}`,
);
await b.close();
