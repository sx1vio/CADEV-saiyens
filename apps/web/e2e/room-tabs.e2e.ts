import { expect, test } from '@playwright/test';
import { signIn, uniqueLogin, writeHeaders } from './support/session';

/**
 * BUG-041 : sur ordinateur (viewport Desktop Chrome, 1280 px), la salle affiche ses onglets ;
 * la discussion (R4) et les demandes pour rejoindre (R3) restent joignables.
 */
test('les onglets de la salle sont visibles sur grand écran', async ({ page }) => {
  const login = uniqueLogin('room-tabs');
  await signIn(page, login);
  const created = await page.request.post('/api/v1/rooms', {
    headers: { ...writeHeaders(page), 'Idempotency-Key': crypto.randomUUID() },
    data: {
      name: `Tabs ${login.slice(-6)}`,
      description: 'Salle de vérification des onglets.',
      stackTagSlugs: ['docker'],
    },
  });
  expect(created.ok()).toBeTruthy();
  const room = (await created.json()) as { code: string };

  await page.goto(`/p/${room.code}`);
  expect(page.viewportSize()?.width).toBeGreaterThanOrEqual(1024);
  await page.getByRole('tab', { name: 'Discussion' }).click();
  await expect(page).toHaveURL(/tab=discussion/);
  await expect(page.getByRole('tab', { name: /Demandes/ })).toBeVisible();
});
