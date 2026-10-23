import { expect, test } from '@playwright/test';
import { signIn, uniqueLogin, writeHeaders } from './support/session';

/**
 * D4 : la carte colore le pays d'un dev inscrit, un clic (ou Entrée) ouvre ses chiffres et le
 * lien vers ses devs ; le tableau reprend les mêmes données pour les lecteurs d'écran.
 */
test('carte de l’Afrique : pays cliquable, panneau et tableau', async ({ page }) => {
  await signIn(page, uniqueLogin('map'), '/carte');
  const me = await page.request.patch('/api/v1/me', {
    headers: { ...writeHeaders(page), 'Idempotency-Key': crypto.randomUUID() },
    data: { country: 'SN' },
  });
  expect(me.ok()).toBeTruthy();

  await page.goto('/carte');
  await expect(page.getByRole('heading', { name: "Carte de l'Afrique" })).toBeVisible();
  const table = page.getByRole('table', { name: 'Tous les pays' });
  await expect(table.getByRole('rowheader', { name: 'Sénégal' })).toBeVisible();

  const senegal = page.getByRole('button', { name: /^Sénégal : / });
  await senegal.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Sénégal', level: 2 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Voir les devs du pays' })).toHaveAttribute(
    'href',
    '/decouvrir?country=SN',
  );

  await page.getByRole('tab', { name: 'Proof XP' }).click();
  await expect(page.getByRole('button', { name: /^Sénégal : .* Proof XP$/ })).toBeVisible();
  await page.screenshot({ path: 'test-results/africa-map.png', fullPage: true });
});
