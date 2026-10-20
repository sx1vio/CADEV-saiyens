import { expect, test } from '@playwright/test';
import { signIn, uniqueLogin, writeHeaders } from './support/session';

/**
 * R6 : le créateur d'une salle demande une revue de code ; un autre dev la trouve dans le flux
 * « Revues demandées », la prend ; le créateur confirme et le relecteur gagne +8 Proof XP.
 */
test('demander une revue, la prendre depuis le flux, la confirmer', async ({ browser }) => {
  const owner = await (await browser.newContext()).newPage();
  const reviewer = await (await browser.newContext()).newPage();
  const ownerLogin = uniqueLogin('review-owner');
  const name = `Kora ${ownerLogin.slice(-6)}`;

  await signIn(owner, ownerLogin);
  const created = await owner.request.post('/api/v1/rooms', {
    headers: { ...writeHeaders(owner), 'Idempotency-Key': crypto.randomUUID() },
    data: {
      name,
      description: 'Carnet de commandes pour les couturiers.',
      stackTagSlugs: ['docker'],
    },
  });
  expect(created.ok()).toBeTruthy();
  const room = (await created.json()) as { code: string };

  // 1. Demander une revue de code depuis la salle
  await owner.goto(`/p/${room.code}`);
  await owner.getByRole('button', { name: 'Demander un retour' }).click();
  await owner.getByRole('menuitem', { name: 'Demander une revue de code' }).click();
  const sheet = owner.getByRole('dialog');
  await sheet
    .getByLabel('Lien à relire (PR, commit, démo)')
    .fill('https://github.com/awa/kora/pull/12');
  await sheet.getByLabel('Ce que tu veux faire relire').fill('La gestion des erreurs du paiement.');
  await sheet.getByRole('button', { name: 'Envoyer' }).click();
  await expect(owner.getByText('Demande publiée dans le flux de la stack.')).toBeVisible();
  await expect(owner.getByText('La gestion des erreurs du paiement.')).toBeVisible();

  // 2. Un autre dev la prend depuis le flux de la stack
  await signIn(reviewer, uniqueLogin('reviewer'), '/projets');
  await reviewer.goto('/projets?tab=reviews');
  const card = reviewer.getByRole('listitem').filter({ hasText: name });
  await expect(card).toBeVisible();
  await reviewer.screenshot({ path: 'test-results/review-feed.png', fullPage: true });
  await card.getByRole('button', { name: 'Je relis' }).click();
  // Une demande prise quitte le flux (demandes ouvertes seulement).
  await expect(
    reviewer.getByText('À toi de relire : le demandeur confirmera ta revue.'),
  ).toBeVisible();
  await expect(card).toBeHidden();

  // 3. Le créateur confirme : +8 Proof XP au relecteur
  await owner.reload();
  await owner.getByRole('button', { name: 'Confirmer la relecture' }).click();
  await expect(
    owner.getByText('Relecture confirmée : +8 Proof XP pour le relecteur.'),
  ).toBeVisible();
  await expect(owner.getByText('Confirmée', { exact: true })).toBeVisible();
  await owner.screenshot({ path: 'test-results/review-room.png', fullPage: true });
});
