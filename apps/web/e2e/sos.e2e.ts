import { expect, test } from '@playwright/test';
import { signIn, uniqueLogin } from './support/session';

/**
 * Parcours SOS Dev (S1, S4) : un dev pose une question, un second compte répond,
 * l'auteur valide la réponse, la question passe « Résolue ».
 */
test('poser, répondre avec un second compte, valider', async ({ browser }) => {
  const asker = await (await browser.newContext()).newPage();
  const helper = await (await browser.newContext()).newPage();
  const title = `nginx renvoie 502 devant mon API Node dans Docker ${Date.now()}`;

  // 1. Poser la question
  await signIn(asker, uniqueLogin('asker'));
  await asker.getByRole('button', { name: 'Je suis bloqué' }).click();
  const ask = asker.getByRole('dialog');
  await ask.getByLabel('En une phrase, ton problème').fill(title);
  // Stacks détectées dans le titre (S9)
  await ask.getByRole('button', { name: 'Docker', exact: true }).click();
  await ask.getByRole('button', { name: 'Continuer' }).click();
  await ask.getByLabel('Ce que tu veux faire').fill("Servir l'API Node derrière nginx.");
  // La page de la question s'abonne à son sujet SSE (Y8) : on attend l'ouverture du flux avant
  // la réponse, sinon une réponse publiée avant l'abonnement n'arrive pas (BUG-033).
  const subscribed = asker.waitForRequest((r) =>
    /\/api\/v1\/events\?.*topics=[^&]*question%3A/.test(r.url()),
  );
  await ask.getByRole('button', { name: 'Publier ma question' }).click();

  await expect(asker).toHaveURL(/\/sos\/[0-9a-f-]{36}$/);
  const questionUrl = new URL(asker.url()).pathname;
  expect((await subscribed).url()).toContain(`question%3A${questionUrl.split('/').pop()}`);
  await expect(asker.getByRole('heading', { name: title })).toBeVisible();
  await expect(asker.getByText('Ouverte', { exact: true })).toBeVisible();

  // 2. Répondre avec un second compte
  await signIn(helper, uniqueLogin('helper'), questionUrl);
  const answer = 'Le conteneur nginx vise localhost : utilise le nom du service Docker.';
  await helper.getByLabel('Ta réponse').fill(answer);
  await helper.getByRole('button', { name: 'Répondre' }).click();
  await expect(helper.locator('p', { hasText: answer })).toBeVisible();
  await expect(helper.getByLabel('Ta réponse')).toHaveValue('');
  await expect(helper.getByText('1 réponse')).toBeVisible();

  // 3. L'auteur voit la réponse arriver en temps réel (Y8, SSE), sans recharger la page
  await expect(asker.locator('p', { hasText: answer })).toBeVisible({ timeout: 15_000 });
  await asker.getByRole('button', { name: "M'a débloqué" }).click();
  await asker.getByRole('dialog').getByRole('button', { name: 'Confirmer' }).click();

  await expect(asker.getByText('Solution validée').first()).toBeVisible();
  await asker.reload();
  await expect(asker.getByText('Résolue', { exact: true }).first()).toBeVisible();

  // Le second compte ne peut pas valider : le bouton n'apparaît que pour l'auteur.
  await helper.reload();
  await expect(helper.getByRole('button', { name: "M'a débloqué" })).toHaveCount(0);
});
