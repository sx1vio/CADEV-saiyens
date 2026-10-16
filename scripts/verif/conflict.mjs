// O4 : modification hors ligne (simulateur ?net=offline) pendant une modification en ligne,
// puis écran de conflit : « Garder celle en ligne » sur une question, « Fusionner à la main »
// sur une réponse. Le parcours « Garder la mienne » est couvert par apps/web/e2e/conflict.e2e.ts.
import { launch, loginAs, shot, api, WEB } from './lib.mjs';
const author = process.argv[2] ?? 'pr-author-42';
const helper = process.argv[3] ?? 'kofi-dev';
const b = await launch();
const queue = (page) =>
  page.evaluate(
    () =>
      new Promise((res) => {
        const o = indexedDB.open('devhub-queue');
        o.onsuccess = () => {
          const r = o.result.transaction('actions').objectStore('actions').count();
          r.onsuccess = () => res(r.result);
        };
      }),
  );
const step = (m) => console.log(`• ${m}`);

// Question de l'auteur, et une réponse de l'aidant.
const phone = await loginAs(b, author);
const laptop = await loginAs(b, author);
const q = (
  await api(laptop.page, 'POST', '/questions', {
    clientId: crypto.randomUUID(),
    title: `docker compose ne démarre pas la base ${Date.now() % 1e5}`,
    body: 'Le conteneur postgres redémarre en boucle au lancement.',
    tagSlugs: ['docker'],
    urgency: 'normal',
    lang: 'fr',
  })
).json;
const H1 = await loginAs(b, helper);
const H2 = await loginAs(b, helper);
const a = (
  await api(H1.page, 'POST', `/questions/${q.id}/answers`, {
    clientId: crypto.randomUUID(),
    body: 'Vérifie le volume de données : un ancien volume bloque l’initialisation.',
  })
).json;
step(`question ${q.id} v${q.version}, réponse ${a.id} v${a.version}`);

// 1. Question : modification hors ligne sur le « téléphone », en ligne sur le « portable ».
await phone.page.goto(`${WEB}/sos/${q.id}?net=offline`);
await phone.page.waitForTimeout(1500);
await phone.page.getByRole('button', { name: 'Modifier' }).first().click();
await phone.page
  .getByRole('dialog')
  .getByLabel('Titre')
  .fill('docker compose : postgres redémarre en boucle (hors ligne)');
await phone.page.getByRole('dialog').getByRole('button', { name: 'Enregistrer' }).click();
await phone.page.waitForTimeout(800);
step(
  `en attente : ${await phone.page.getByText('Modification en attente d’envoi').isVisible()} | file ${await queue(phone.page)}`,
);
const online = 'docker compose : postgres redémarre en boucle sous Windows';
step(
  `modification en ligne → ${(await api(laptop.page, 'PATCH', `/questions/${q.id}`, { title: online, baseVersion: q.version })).status}`,
);
await phone.page.getByRole('button', { name: 'Rétablir' }).click();
const banner = phone.page.getByRole('alert').filter({ hasText: 'Ce texte a changé en ligne' });
step(
  `bandeau de conflit : ${await banner
    .waitFor({ timeout: 10000 })
    .then(() => true)
    .catch(() => false)}`,
);
await banner.getByRole('button', { name: 'Choisir la version' }).click();
const dlg = phone.page.getByRole('dialog', { name: 'Conflit de version' });
step(
  `écran de conflit : ${await dlg.isVisible()} | « Version en ligne · v2 » ${await dlg.getByText('Version en ligne · v2').isVisible()}`,
);
await shot(phone.page, 'conflict-1-question');
await dlg.getByRole('button', { name: 'Garder celle en ligne' }).click();
await phone.page.waitForTimeout(1500);
const qs = (await api(laptop.page, 'GET', `/questions/${q.id}`)).json;
step(
  `garder celle en ligne → serveur « ${qs.title} » v${qs.version} | titre affiché « ${await phone.page.getByRole('heading', { level: 1 }).innerText()} » | file ${await queue(phone.page)}`,
);

// 2. Réponse : l'aidant n'a pas le bouton « Modifier » de la question.
await H1.page.goto(`${WEB}/sos/${q.id}?net=offline`);
await H1.page.waitForTimeout(1500);
const edits = await H1.page.getByRole('button', { name: 'Modifier' }).count();
step(`boutons « Modifier » visibles pour l'aidant : ${edits} (attendu 1 : sa réponse)`);
await H1.page.getByRole('button', { name: 'Modifier' }).first().click();
await H1.page
  .getByRole('dialog')
  .getByLabel('Texte')
  .fill('Supprime le volume pgdata (docker compose down -v), puis relance.');
await H1.page.getByRole('dialog').getByRole('button', { name: 'Enregistrer' }).click();
await H1.page.waitForTimeout(800);
step(
  `réponse modifiée en ligne → ${(await api(H2.page, 'PATCH', `/answers/${a.id}`, { body: 'Vérifie le volume : regarde les logs avec docker compose logs db.', baseVersion: a.version })).status}`,
);
await H1.page.getByRole('button', { name: 'Rétablir' }).click();
const banner2 = H1.page.getByRole('alert').filter({ hasText: 'Ce texte a changé en ligne' });
step(
  `bandeau (réponse) : ${await banner2
    .waitFor({ timeout: 10000 })
    .then(() => true)
    .catch(() => false)}`,
);
await banner2.getByRole('button', { name: 'Choisir la version' }).click();
const dlg2 = H1.page.getByRole('dialog', { name: 'Conflit de version' });
await dlg2.getByRole('button', { name: 'Fusionner à la main' }).click();
const merged =
  'Regarde les logs (docker compose logs db), puis supprime le volume pgdata (down -v).';
await dlg2.locator('textarea').last().fill(merged);
await shot(H1.page, 'conflict-2-merge');
await dlg2.getByRole('button', { name: 'Publier la fusion' }).click();
await H1.page.waitForTimeout(1500);
const ans = (await api(H2.page, 'GET', `/questions/${q.id}`)).json.answers.find(
  (x) => x.id === a.id,
);
step(
  `fusion publiée → serveur v${ans.version} identique : ${ans.body === merged} | file ${await queue(H1.page)}`,
);
step(
  `autre compte modifie la réponse → ${(await api(phone.page, 'PATCH', `/answers/${a.id}`, { body: 'Intrusion', baseVersion: ans.version })).status}`,
);
await b.close();
