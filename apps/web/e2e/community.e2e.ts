import { expect, test } from '@playwright/test';
import { signIn, uniqueLogin } from './support/session';

/** Fil de la communauté : publier, retrouver la publication, commenter et répondre. */
test('publier dans une communauté, puis commenter et répondre', async ({ page }) => {
  const title = `Éviter les doublons au retour du réseau ${Date.now()}`;
  await signIn(page, uniqueLogin('poster'), '/publier');
  await page.goto('/publier?c=web');

  await page.getByLabel('Titre').fill(title);
  await page
    .getByLabel('Texte')
    .fill('Je rejoue mes écritures hors ligne. Comment éviter les doublons ?');
  await page.getByLabel('Étiquettes').fill('PWA');
  await page.getByRole('button', { name: 'Publier', exact: true }).click();
  await page.waitForURL('**/post/**');
  await expect(page.getByRole('heading', { name: title })).toBeVisible();

  await page.getByLabel('Commentaire', { exact: true }).fill('Une clé d’idempotence par écriture.');
  await page.getByRole('button', { name: 'Commenter' }).click();
  await expect(page.getByText('Une clé d’idempotence par écriture.')).toBeVisible();
  await page.getByRole('button', { name: 'Répondre' }).first().click();
  await page.getByLabel('Réponse', { exact: true }).fill('Et une contrainte unique en base.');
  await page.getByRole('button', { name: 'Répondre' }).last().click();
  await expect(page.getByText('Et une contrainte unique en base.')).toBeVisible();
  await expect(page.getByText('2 commentaires')).toBeVisible();

  await page.goto('/c/web');
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
});
