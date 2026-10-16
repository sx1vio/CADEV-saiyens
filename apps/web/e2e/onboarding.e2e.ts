import { expect, test } from '@playwright/test';
import { uniqueLogin } from './support/session';

/**
 * BUG-027 : un compte neuf n'a pas encore de pays. L'étape 1 de /bienvenue doit le dire
 * (« Choisis ton pays ») au lieu d'afficher le premier pays de la liste sans le retenir.
 */
test('onboarding : le premier pays de la liste se choisit comme les autres', async ({ page }) => {
  const login = uniqueLogin('onboarding');
  await page.goto(`/api/v1/auth/github?login=${login}&returnTo=${encodeURIComponent('/sos')}`);
  await page.goto('/bienvenue');

  const country = page.getByLabel('Pays');
  const next = page.getByRole('button', { name: 'Continuer' });
  await expect(country).toHaveValue('');
  await expect(country.locator('option:checked')).toHaveText('Choisis ton pays');
  await expect(next).toBeDisabled();

  await country.selectOption({ label: 'Bénin' });
  await expect(next).toBeEnabled();
});
