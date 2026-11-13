import { expect, test } from '@playwright/test';
import { signIn, uniqueLogin } from './support/session';

/** #204 : l'ancien lien vers l'entraide (/sos) ne laisse pas un visiteur sur la page d'accueil. */
test('visiteur : /sos mène à la connexion, avec retour vers les questions', async ({ page }) => {
  await page.goto('/sos');
  await expect(page).toHaveURL(/\/connexion\?next=%2F%3Ff%3Dquestions$/);
});

test('connecté : /sos ouvre l’onglet Questions du fil', async ({ page }) => {
  await signIn(page, uniqueLogin('sos-legacy'), '/');
  await page.goto('/sos');
  await expect(page).toHaveURL(/\/\?f=questions$/);
  await expect(page.locator('[aria-current="page"]', { hasText: 'Questions' })).toBeVisible();
});
