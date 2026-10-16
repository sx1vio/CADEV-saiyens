import { expect, test } from '@playwright/test';
import { promoteAdmin, signIn, uniqueLogin } from './support/session';

/**
 * M1, M4 : un compte signalé arrive dans la file de modération ; l'admin ne peut que classer
 * (un compte n'est pas un contenu à masquer, BUG-036) ; la décision apparaît dans le journal.
 */
test('modérer un compte signalé, puis retrouver la décision dans le journal', async ({
  browser,
}) => {
  const target = uniqueLogin('spam');
  const reason = `Messages promotionnels en série ${Date.now()}`;

  const spammer = await (await browser.newContext()).newPage();
  await signIn(spammer, target, `/u/${target}`);

  const reporter = await (await browser.newContext()).newPage();
  await signIn(reporter, uniqueLogin('witness'), `/u/${target}`);
  await reporter.getByRole('button', { name: 'Signaler' }).click();
  const sheet = reporter.getByRole('dialog', { name: 'Signaler ce compte' });
  await sheet.getByLabel('Pourquoi ?').fill(reason);
  await sheet.getByRole('button', { name: 'Signaler' }).click();
  await expect(reporter.getByText('Signalement envoyé.')).toBeVisible();

  const adminLogin = uniqueLogin('admin');
  const admin = await (await browser.newContext()).newPage();
  await signIn(admin, adminLogin, '/sos');
  promoteAdmin(adminLogin);
  await admin.goto('/admin');

  const report = admin.getByRole('listitem').filter({ hasText: reason });
  await expect(report).toBeVisible();
  await expect(report.getByText('Compte', { exact: true })).toBeVisible();
  await expect(report.getByRole('button', { name: 'Retirer le contenu' })).toHaveCount(0);
  await report.getByRole('button', { name: 'Classer sans suite' }).click();
  await expect(admin.getByText('Signalement classé.')).toBeVisible();

  await admin.getByRole('tab', { name: 'Journal' }).click();
  // Le journal garde la décision de l'admin (son motif), pas le texte du signalement.
  const entry = admin.getByRole('listitem').filter({ hasText: adminLogin });
  await expect(entry.getByText('Signalement classé', { exact: true })).toBeVisible();
  await expect(entry.getByText('Compte', { exact: true })).toBeVisible();
  await expect(entry.getByText('« Signalement rejeté »')).toBeVisible();
});
