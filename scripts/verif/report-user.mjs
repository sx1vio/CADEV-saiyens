// M1 : signaler un compte depuis son Passport, puis le traiter dans la file de modération.
// Un compte ne se masque pas : « Retirer le contenu » doit être refusé (422), « Classer sans suite » accepté.
import { launch, loginAs, shot, api, WEB } from './lib.mjs';
const target = process.argv[2] ?? 'rt-e';
const b = await launch();
const T = await loginAs(b, target, `u/${target}`);
await T.page.waitForTimeout(1500);
console.log(
  'le compte voit « Signaler » sur son propre Passport :',
  await T.page.getByRole('button', { name: 'Signaler' }).count(),
);
const anon = await (await b.newContext({ locale: 'fr-FR' })).newPage();
await anon.goto(`${WEB}/u/${target}`);
await anon.waitForTimeout(1500);
console.log(
  'visiteur anonyme voit « Signaler » :',
  await anon.getByRole('button', { name: 'Signaler' }).count(),
);
const R = await loginAs(b, 'kofi-dev', `u/${target}`);
await R.page.waitForTimeout(1500);
await R.page.getByRole('button', { name: 'Signaler' }).click();
const sheet = R.page.getByRole('dialog', { name: 'Signaler ce compte' });
await sheet.getByLabel('Pourquoi ?').fill('Publie des liens de phishing dans ses réponses.');
await sheet.getByRole('button', { name: 'Signaler' }).click();
await R.page.waitForTimeout(1000);
console.log('toast :', await R.page.getByText('Signalement envoyé').isVisible());
const Ad = await loginAs(b, 'admin-dev', 'admin');
await Ad.page.waitForTimeout(2000);
await shot(Ad.page, 'report-user-admin');
const reports = (await api(Ad.page, 'GET', '/admin/reports')).json.data.filter(
  (r) => r.targetType === 'user',
);
console.log(
  'file : signalements de compte ouverts :',
  reports.length,
  JSON.stringify(
    reports.map((r) => [r.targetLabel ?? r.target?.label ?? r.targetId, r.reason?.slice(0, 25)]),
  ),
);
const card = Ad.page.locator('li, article, div').filter({ hasText: 'phishing' }).last();
console.log('boutons de la carte :', (await card.getByRole('button').allInnerTexts()).join(' | '));
const removeBtn = card.getByRole('button', { name: 'Retirer le contenu' });
if (await removeBtn.count()) {
  const resp = Ad.page.waitForResponse(
    (r) => r.url().includes('/admin/reports/') && r.request().method() === 'POST',
  );
  await removeBtn.click();
  const r = await resp;
  console.log('« Retirer le contenu » sur un compte →', r.status(), (await r.json()).code);
  await Ad.page.waitForTimeout(800);
  console.log(
    'message affiché :',
    (await Ad.page.locator('[data-sonner-toast]').allInnerTexts()).join(' / '),
  );
  await shot(Ad.page, 'report-user-remove');
}
const dismiss = Ad.page
  .locator('li, article, div')
  .filter({ hasText: 'phishing' })
  .last()
  .getByRole('button', { name: 'Classer sans suite' });
if (await dismiss.count()) {
  await dismiss.click();
  await Ad.page.waitForTimeout(1000);
  console.log(
    'après « Classer sans suite » : ouverts',
    (await api(Ad.page, 'GET', '/admin/reports')).json.data.filter((r) => r.targetType === 'user')
      .length,
  );
}
await b.close();
