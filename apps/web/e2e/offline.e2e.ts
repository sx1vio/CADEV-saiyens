import { expect, test } from '@playwright/test';
import { myQuestions, queuedActions, signIn, uniqueLogin } from './support/session';

/**
 * Hors ligne d'abord (O2, O3, 04-hors-ligne-sync.md) : une question rédigée sans réseau
 * attend dans la file IndexedDB, puis part par POST /sync au retour du réseau, une seule fois.
 */
test('rédiger hors ligne, puis synchroniser au retour du réseau', async ({ page, context }) => {
  const title = `docker compose ne démarre pas la base en CI ${Date.now()}`;
  await signIn(page, uniqueLogin('offline'));
  await page.getByRole('button', { name: 'Je suis bloqué' }).click();
  const ask = page.getByRole('dialog');
  await expect(ask).toBeVisible();

  // Coupure du réseau pendant la rédaction
  await context.setOffline(true);
  await expect(ask.getByText('Tu es hors ligne : ta question sera publiée')).toBeVisible();
  await ask.getByLabel('En une phrase, ton problème').fill(title);
  await ask.getByRole('button', { name: 'Docker', exact: true }).click();
  await ask.getByRole('button', { name: 'Continuer' }).click();
  await ask.getByRole('button', { name: 'Publier ma question' }).click();

  await expect(
    page.getByText('Enregistré sur ton appareil. Envoi au retour du réseau.'),
  ).toBeVisible();
  await expect(page.getByRole('status').getByText('Tu es hors ligne.')).toBeVisible();
  await expect.poll(() => queuedActions(page)).toBe(1);
  // Rien n'est arrivé au serveur (les requêtes de test ne passent pas par le navigateur coupé).
  expect(await myQuestions(page.request)).toHaveLength(0);

  // Retour du réseau : la file part par lot via POST /sync
  const synced = page.waitForResponse(
    (r) => r.url().endsWith('/api/v1/sync') && r.request().method() === 'POST',
  );
  await context.setOffline(false);
  const res = await synced;
  expect(res.status()).toBe(200);
  const body = (await res.json()) as { results: Array<{ status: string }> };
  expect(body.results.map((r) => r.status)).toEqual(['applied']);

  await expect.poll(() => queuedActions(page)).toBe(0);
  const mine = await myQuestions(page.request);
  expect(mine.map((q) => q.title)).toEqual([title]);

  // Un rechargement ne rejoue rien : toujours une seule question, visible dans « Mes questions ».
  await page.goto('/sos');
  await page.getByRole('tab', { name: 'Mes questions' }).click();
  await expect(page.getByText(title)).toBeVisible();
  expect(await myQuestions(page.request)).toHaveLength(1);
});
