import { expect, test } from '@playwright/test';
import { uniqueLogin } from './support/session';

/**
 * BUG-028 : une fois le service worker installé, la navigation vers /api/v1/auth/github doit
 * atteindre l'API (OAuth), et non le shell de l'application servi depuis le cache.
 */
test('la connexion GitHub passe par le serveur même avec le service worker actif', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  const login = uniqueLogin('sw');
  const res = await page.goto(`/api/v1/auth/github?login=${login}&returnTo=%2Fsos`);
  expect(
    res?.request().redirectedFrom(),
    'redirigée par l’API, pas servie par le cache',
  ).toBeTruthy();
  await expect(page).toHaveURL(/\/sos$/);

  const me = await page.request.get('/api/v1/me');
  expect(me.ok()).toBeTruthy();
  expect(((await me.json()) as { handle: string }).handle).toBe(login);
});
