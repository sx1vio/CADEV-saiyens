import { expect, test } from '@playwright/test';
import { signIn, uniqueLogin } from './support/session';

/**
 * BUG-031 : le mode avion simulé activé par ?net=offline tient au rechargement, comme quand on
 * l'active depuis l'interface ; ?net=off le désactive. Sinon la file partait par surprise.
 */
test('?net=offline tient au rechargement, ?net=off le retire', async ({ page }) => {
  await signIn(page, uniqueLogin('netsim'));
  const banner = page.getByText('Réseau coupé par le simulateur.');

  await page.goto('/sos?net=offline');
  await expect(banner).toBeVisible();
  await page.goto('/sos');
  await expect(banner).toBeVisible();

  await page.goto('/sos?net=off');
  await expect(banner).toBeHidden();
  await page.goto('/sos');
  await expect(banner).toBeHidden();
});
