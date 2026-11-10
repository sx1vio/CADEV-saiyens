import { expect, test, type Page } from '@playwright/test';
import { uniqueLogin } from './support/session';

/** Étapes 1 à 4 de /bienvenue pour un débutant : niveau, objectifs, cours choisi, centres d'intérêt. */
async function walkToProfile(page: Page) {
  const next = page.getByRole('button', { name: 'Continuer' });
  await page.getByRole('button', { name: /Je débute/ }).click();
  await next.click();
  await page.getByRole('button', { name: /Prouver mes compétences/ }).click();
  await next.click();
  await page.getByRole('button', { name: /Créer des sites web/ }).click();
  await next.click();
  await page.getByRole('button', { name: /Développement web/ }).click();
  await next.click();
}

/**
 * BUG-027 puis 10/11/2026 : un compte neuf n'a pas encore de pays. L'étape « profil » l'affiche
 * comme « Ne pas préciser » (choix réel, qui laisse continuer) au lieu du premier pays de la liste.
 */
test('onboarding : pays « Ne pas préciser » par défaut, le premier pays se choisit', async ({
  page,
}) => {
  const login = uniqueLogin('onboarding');
  await page.goto(`/api/v1/auth/github?login=${login}&returnTo=${encodeURIComponent('/sos')}`);
  await page.goto('/bienvenue');
  await walkToProfile(page);

  const country = page.getByLabel('Pays');
  const next = page.getByRole('button', { name: 'Continuer' });
  await expect(country).toHaveValue('');
  await expect(country.locator('option:checked')).toHaveText('Ne pas préciser');
  await expect(next).toBeEnabled();

  await country.selectOption({ label: 'Bénin' });
  await expect(country).toHaveValue('BJ');
  await expect(next).toBeEnabled();
});

/** « Passer » saute toutes les questions : il ne reste que les règles, puis l'accueil. */
test('onboarding : « Passer » mène aux règles puis à l’accueil', async ({ page }) => {
  const login = uniqueLogin('skip');
  await page.goto(`/api/v1/auth/github?login=${login}&returnTo=${encodeURIComponent('/sos')}`);
  await page.goto('/bienvenue');
  await page.getByRole('button', { name: 'Passer' }).click();
  await expect(page.getByText('Les règles de la communauté')).toBeVisible();
  const go = page.getByRole('button', { name: /C’est parti/ });
  await expect(go).toBeDisabled();
  await page.getByRole('checkbox').check();
  await go.click();
  await page.waitForURL((url) => url.pathname === '/');
  const me = await page.request.get('/api/v1/me');
  expect((await me.json()).codeOfConductAcceptedAt).toBeTruthy();
});

/** Compte par e-mail : inscription, onboarding complet, arrivée sur la préparation du cours choisi. */
test('inscription par e-mail puis onboarding jusqu’au cours choisi', async ({ page }) => {
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
  // Le cours choisi mène à la fiche de sa certification : programme et leçons du cours.
  await page.waitForURL('**/certifications/web-fondamentaux');
  await expect(page.getByText('Leçons pour réviser : Créer des sites web')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Les balises' })).toBeVisible();

  const me = await page.request.get('/api/v1/me');
  expect(await me.json()).toMatchObject({ email, country: 'CI', githubLinked: false });
});

/** Un dev confirmé ne choisit pas de cours : compétences, puis « Comment veux-tu aider ? ». */
test('onboarding d’un dev confirmé : compétences, aide, fuseau dans une liste', async ({
  page,
}) => {
  const login = uniqueLogin('senior');
  await page.goto(`/api/v1/auth/github?login=${login}&returnTo=${encodeURIComponent('/sos')}`);
  await page.goto('/bienvenue');
  const next = page.getByRole('button', { name: 'Continuer' });
  await page.getByRole('button', { name: /Je suis dev confirmé/ }).click();
  await next.click();
  await page.getByRole('button', { name: /Aider d’autres devs/ }).click();
  await next.click();
  await expect(page.getByRole('button', { name: /Créer des sites web/ })).toHaveCount(0);
  await page.getByRole('button', { name: /Développement web/ }).click();
  for (const name of ['TypeScript', 'React', 'Node.js'])
    await page.getByRole('button', { name, exact: true }).first().click();
  await next.click();
  await expect(page.getByRole('heading', { name: 'Comment veux-tu aider ?' })).toBeVisible();
  await next.click();
  const tz = page.getByLabel('Fuseau horaire');
  await expect(tz).toHaveJSProperty('tagName', 'SELECT');
  await tz.selectOption('Africa/Lagos');
  await expect(tz).toHaveValue('Africa/Lagos');
});
