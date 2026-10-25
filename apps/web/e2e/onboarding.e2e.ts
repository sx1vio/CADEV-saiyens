import { expect, test, type Page } from '@playwright/test';
import { uniqueLogin } from './support/session';

/** Étapes 1 à 4 de /bienvenue : niveau, objectifs, domaines, rythme. */
async function walkToProfile(page: Page) {
  const next = page.getByRole('button', { name: 'Continuer' });
  await page.getByRole('button', { name: /Je débute/ }).click();
  await next.click();
  await page.getByRole('button', { name: /Apprendre à coder/ }).click();
  await next.click();
  await page.getByRole('button', { name: /^Web/ }).click();
  await next.click();
  await page.getByRole('button', { name: /Régulier/ }).click();
  await next.click();
}

/**
 * BUG-027 : un compte neuf n'a pas encore de pays. L'étape « profil » de /bienvenue doit le dire
 * (« Choisis ton pays ») au lieu d'afficher le premier pays de la liste sans le retenir.
 */
test('onboarding : le premier pays de la liste se choisit comme les autres', async ({ page }) => {
  const login = uniqueLogin('onboarding');
  await page.goto(`/api/v1/auth/github?login=${login}&returnTo=${encodeURIComponent('/sos')}`);
  await page.goto('/bienvenue');
  await walkToProfile(page);

  const country = page.getByLabel('Pays');
  const next = page.getByRole('button', { name: 'Continuer' });
  await expect(country).toHaveValue('');
  await expect(country.locator('option:checked')).toHaveText('Choisis ton pays');
  await expect(next).toBeDisabled();

  await country.selectOption({ label: 'Bénin' });
  await expect(next).toBeEnabled();
});

/** Compte par e-mail : inscription, onboarding complet, arrivée sur le parcours recommandé. */
test('inscription par e-mail puis onboarding jusqu’au premier parcours', async ({ page }) => {
  const email = `${uniqueLogin('email')}@example.test`;
  await page.goto(`/inscription?email=${encodeURIComponent(email)}`);
  await page.getByLabel('Nom').fill('Aïcha Test');
  await page.getByRole('textbox', { name: 'Mot de passe' }).fill('une phrase solide 2026');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  await page.waitForURL('**/bienvenue');

  await walkToProfile(page);
  await page.getByLabel('Pays').selectOption('CI');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /C’est parti/ }).click();
  await page.waitForURL('**/apprendre/dev-web');

  const me = await page.request.get('/api/v1/me');
  expect(await me.json()).toMatchObject({ email, country: 'CI', githubLinked: false });
});
