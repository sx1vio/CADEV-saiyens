import { expect, test, type Page } from '@playwright/test';
import { queuedActions, signIn, uniqueLogin, writeHeaders } from './support/session';

/**
 * O4 (04-hors-ligne-sync.md § 5) : l'auteur modifie sa question hors ligne sur un appareil,
 * pendant qu'elle est modifiée en ligne depuis un autre. Au retour du réseau, /sync signale le
 * conflit ; l'écran compare les deux versions et l'auteur garde la sienne.
 */
async function askQuestion(page: Page, title: string) {
  await page.getByRole('button', { name: 'Je suis bloqué' }).click();
  const ask = page.getByRole('dialog');
  await ask.getByLabel('En une phrase, ton problème').fill(title);
  await ask.getByRole('button', { name: 'Docker', exact: true }).click();
  await ask.getByRole('button', { name: 'Continuer' }).click();
  await ask.getByLabel('Ce que tu veux faire').fill('Lancer la base avec docker compose.');
  await ask.getByRole('button', { name: 'Publier ma question' }).click();
  await expect(page).toHaveURL(/\/sos\/[0-9a-f-]{36}$/);
  return page.url().split('/').pop()!;
}

test('modifier hors ligne, conflit au retour du réseau, garder sa version', async ({ browser }) => {
  const login = uniqueLogin('editor');
  const phoneContext = await browser.newContext();
  const phone = await phoneContext.newPage();
  const laptop = await (await browser.newContext()).newPage();

  await signIn(phone, login);
  const id = await askQuestion(phone, `docker compose ne démarre pas la base ${Date.now()}`);
  await signIn(laptop, login, `/sos/${id}`);

  // 1. Téléphone hors ligne : l'auteur corrige son titre, la modification attend dans la file.
  await phoneContext.setOffline(true);
  await phone.getByRole('button', { name: 'Modifier' }).first().click();
  const edit = phone.getByRole('dialog');
  const mine = 'docker compose ne démarre pas Postgres en local';
  await edit.getByLabel('Titre').fill(mine);
  await edit.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(phone.getByText('Modification en attente d’envoi')).toBeVisible();
  await expect.poll(() => queuedActions(phone)).toBe(1);

  // 2. Pendant ce temps, le portable modifie la même question en ligne (version 1 → 2).
  const online = 'docker compose ne démarre pas Postgres sur Windows';
  const patched = await laptop.request.patch(`/api/v1/questions/${id}`, {
    headers: { ...writeHeaders(laptop), 'Idempotency-Key': crypto.randomUUID() },
    data: { title: online, baseVersion: 1 },
  });
  expect(patched.ok()).toBeTruthy();

  // 3. Retour du réseau : /sync répond « conflict » et garde l'action pour l'auteur.
  const synced = phone.waitForResponse(
    (r) => r.url().endsWith('/api/v1/sync') && r.request().method() === 'POST',
  );
  await phoneContext.setOffline(false);
  const body = (await (await synced).json()) as { results: Array<{ status: string }> };
  expect(body.results.map((r) => r.status)).toEqual(['conflict']);
  const banner = phone.getByRole('alert').filter({ hasText: 'Ce texte a changé en ligne' });
  await expect(banner).toBeVisible();

  // 4. Écran de conflit : deux colonnes, différences surlignées.
  await banner.getByRole('button', { name: 'Choisir la version' }).click();
  const conflict = phone.getByRole('dialog', { name: 'Conflit de version' });
  await expect(conflict.getByText('Version en ligne · v2')).toBeVisible();
  await expect(conflict.getByTestId('conflict-mine').first()).toHaveText(mine);
  await expect(conflict.getByTestId('conflict-server').first()).toHaveText(online);
  await expect(conflict.getByTestId('conflict-mine').first().locator('mark')).toHaveText(
    'en local',
  );
  await expect(conflict.getByTestId('conflict-server').first().locator('mark')).toHaveText(
    'sur Windows',
  );

  // 5. Garder la mienne : renvoyée avec la version en ligne comme base.
  await conflict.getByRole('button', { name: 'Garder la mienne' }).click();
  await expect(phone.getByText('Ta version est publiée.')).toBeVisible();
  await expect(phone.getByRole('heading', { level: 1 })).toHaveText(mine);
  await expect.poll(() => queuedActions(phone)).toBe(0);

  const server = await laptop.request.get(`/api/v1/questions/${id}`);
  expect(await server.json()).toMatchObject({ title: mine, version: 3 });
});
