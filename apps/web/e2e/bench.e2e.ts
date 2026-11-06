import { expect, test } from '@playwright/test';
import { ageAccount, signIn, uniqueLogin } from './support/session';

/**
 * Banc d'essai : un dev publie une demande de test, un autre rend un rapport sur son vrai
 * téléphone, le demandeur le confirme et le testeur gagne 8 Proof XP.
 */
test('demande de test, rapport sur un vrai appareil, confirmation', async ({ browser }) => {
  const ownerLogin = uniqueLogin('bench-owner');
  const testerLogin = uniqueLogin('bench-tester');
  const owner = await (await browser.newContext()).newPage();
  await signIn(owner, ownerLogin, '/banc');
  ageAccount(ownerLogin);

  const title = `Boutique Paylink ${ownerLogin.slice(-6)}`;
  await owner.goto('/banc/nouvelle');
  await owner.getByLabel('Titre').fill(title);
  await owner.getByLabel('Adresse de l’app en ligne').fill('paylink.example');
  await owner
    .getByLabel('Ce qu’il faut tester')
    .fill('Ajouter un article au panier puis payer avec Wave en mode test.');
  await owner.getByRole('button', { name: 'Hors ligne' }).click();
  await owner.getByRole('button', { name: 'Publier la demande' }).click();
  await owner.waitForURL(/\/banc\/[0-9a-f-]{36}$/);
  const url = owner.url();
  await expect(owner.getByRole('heading', { name: title })).toBeVisible();

  const tester = await (await browser.newContext()).newPage();
  await signIn(tester, testerLogin, '/banc');
  await expect(tester.getByRole('link', { name: new RegExp(title) })).toBeVisible();
  await tester.goto(new URL(url).pathname);
  await tester.getByLabel('Modèle exact').fill('Tecno Spark 10');
  await tester.getByLabel('Système').fill('Android 13');
  await tester.getByLabel('Navigateur').fill('Chrome 131');
  await tester.getByRole('radio', { name: 'Des problèmes' }).click();
  await tester.getByLabel('Titre du problème').fill('Le bouton Payer reste grisé en 3G');
  await tester.getByRole('button', { name: 'Envoyer mon rapport' }).click();
  await expect(tester.getByRole('heading', { name: 'Mon rapport' })).toBeVisible();
  await expect(tester.getByText('En attente de l’auteur')).toBeVisible();

  await owner.reload();
  await expect(owner.getByText('Le bouton Payer reste grisé en 3G')).toBeVisible();
  await owner.getByRole('button', { name: /Confirmer/ }).click();
  await expect(owner.getByText('Confirmé · +8 Proof XP')).toBeVisible();

  const proofs = await tester.request.get(`/api/v1/u/${testerLogin}/proofs`);
  expect((await proofs.json()).events[0]).toMatchObject({
    kind: 'field_test_confirmed',
    points: 8,
  });
});
