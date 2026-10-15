// M1, M4 : signaler un contenu depuis l'interface, puis le retirer avec un compte admin.
// Prérequis : UPDATE users SET is_admin = true WHERE handle = 'admin-dev'.
import { launch, loginAs, shot, api, WEB } from './lib.mjs';
const b = await launch();
const A = await loginAs(b, 'awa-dev');
const q = (
  await api(A.page, 'POST', '/questions', {
    clientId: crypto.randomUUID(),
    title: `Achetez des followers pas chers ${Date.now() % 1e5}`,
    body: 'Contenu indésirable publié pour tester la modération de la plateforme.',
    tagSlugs: ['javascript'],
    urgency: 'low',
    lang: 'fr',
  })
).json;
console.log('question à signaler', q.id);
const K = await loginAs(b, 'kofi-dev');
await K.page.goto(`${WEB}/sos/${q.id}`);
await K.page.getByRole('button', { name: 'Signaler' }).first().click();
await K.page.fill('#report-reason', 'Spam publicitaire sans rapport avec le développement.');
await K.page
  .getByRole('dialog')
  .getByRole('button', { name: /Signaler|Envoyer/ })
  .last()
  .click();
await K.page.waitForTimeout(1000);
console.log(
  'signalement envoyé (toast) :',
  await K.page
    .getByText('Signalement envoyé')
    .isVisible()
    .catch(() => false),
);
console.log('kofi ouvre /admin →', (await api(K.page, 'GET', '/admin/reports')).status);
const Ad = await loginAs(b, 'admin-dev', 'admin');
await Ad.page.waitForTimeout(1500);
await shot(Ad.page, 'admin-1-queue');
const reports = (await api(Ad.page, 'GET', '/admin/reports')).json.data;
console.log(
  'file de modération :',
  JSON.stringify(reports.map((r) => [r.targetType, r.status, r.reason?.slice(0, 20)])),
);
await Ad.page.getByRole('button', { name: 'Retirer le contenu' }).first().click();
await Ad.page.waitForTimeout(1500);
await shot(Ad.page, 'admin-2-removed');
const after = await api(K.page, 'GET', `/questions/${q.id}`);
console.log('question après retrait (vue publique) →', after.status, after.json?.code ?? '');
const list = (await api(K.page, 'GET', '/questions?limit=50')).json.data.map((x) => x.id);
console.log('encore dans la liste publique :', list.includes(q.id));
const authorView = await api(A.page, 'GET', `/questions/${q.id}`);
console.log("vue de l'auteur →", authorView.status);
console.log(
  'statut des signalements :',
  JSON.stringify(
    (await api(Ad.page, 'GET', '/admin/reports?status=all')).json.data?.map((r) => r.status),
  ),
);
await b.close();
