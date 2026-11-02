import { expect, test } from '@playwright/test';
import { promoteAdmin, signIn, uniqueLogin } from './support/session';

/**
 * L'administration vit dans une application à part (apps/admin, sa propre origine, double facteur).
 * Le site public n'en contient aucune trace : pas de page /admin, pas d'entrée de menu, et l'API
 * répond 404 aux routes d'administration, même pour un compte administrateur connecté au site.
 */
test('le site public ne donne aucun accès à l’administration', async ({ page }) => {
  const login = uniqueLogin('admin');
  await signIn(page, login, '/sos');
  promoteAdmin(login);
  await page.reload();

  await page.goto('/admin');
  await expect(page.getByText('Page introuvable')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Modération' })).toHaveCount(0);

  const res = await page.request.get('/api/v1/admin/reports');
  expect(res.status()).toBe(404);
  const write = await page.request.post('/api/v1/admin/jobs', {
    headers: { 'X-DevHub-Client': 'web' },
    data: {},
  });
  expect(write.status()).toBe(404);
});

/** Un signalement part toujours du site ; il est traité dans l'application d'administration. */
test('signaler un compte depuis son Passport', async ({ browser }) => {
  const target = uniqueLogin('spam');
  const spammer = await (await browser.newContext()).newPage();
  await signIn(spammer, target, `/u/${target}`);

  const reporter = await (await browser.newContext()).newPage();
  await signIn(reporter, uniqueLogin('witness'), `/u/${target}`);
  await reporter.getByRole('button', { name: 'Signaler' }).click();
  const sheet = reporter.getByRole('dialog', { name: 'Signaler ce compte' });
  await sheet.getByLabel('Pourquoi ?').fill(`Messages promotionnels en série ${Date.now()}`);
  await sheet.getByRole('button', { name: 'Signaler' }).click();
  await expect(reporter.getByText('Signalement envoyé.')).toBeVisible();
});
