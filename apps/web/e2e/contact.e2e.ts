import { expect, test } from '@playwright/test';
import { signIn, uniqueLogin } from './support/session';

/**
 * PR4 : Awa se déclare « Disponible pour une mission » dans ses réglages ; Moussa voit le badge
 * sur son Passport, lui écrit avec le bouton Contacter, et Awa reçoit le message en notification.
 */
test('« Disponible pour une mission » puis Contacter depuis le Passport', async ({ browser }) => {
  const awaLogin = uniqueLogin('awa');
  const moussaLogin = uniqueLogin('moussa');
  const awa = await (await browser.newContext()).newPage();
  const moussa = await (await browser.newContext()).newPage();

  await signIn(awa, awaLogin, '/reglages');
  const mission = awa.getByRole('tablist', { name: 'Disponible pour une mission' });
  await mission.getByRole('tab', { name: 'Oui' }).click();
  await expect(awa.getByText('Disponibilité enregistrée.')).toBeVisible();

  await signIn(moussa, moussaLogin, `/u/${awaLogin}`);
  await expect(moussa.getByText('Disponible pour une mission').first()).toBeVisible();
  await moussa.getByRole('button', { name: 'Contacter' }).click();
  const send = moussa.getByRole('button', { name: 'Envoyer' });
  await expect(send).toBeDisabled();
  const message = `Bonjour, une mission React à Dakar (${moussaLogin}) ?`;
  await moussa.getByLabel('Ton message').fill(message);
  await moussa.screenshot({ path: 'test-results/contact-sheet.png' });
  await send.click();
  await expect(moussa.getByText(/^Message envoyé à /)).toBeVisible();

  await awa.goto('/sos');
  await awa.getByRole('button', { name: 'Notifications' }).first().click();
  await expect(awa.getByText(message, { exact: false })).toBeVisible();
  await awa.screenshot({ path: 'test-results/contact-notification.png' });
});
