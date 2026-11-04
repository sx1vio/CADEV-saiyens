import { expect, test } from '@playwright/test';
import { signIn, uniqueLogin } from './support/session';

/**
 * PR4 : Awa se déclare « Disponible pour une mission » dans ses réglages ; Moussa voit le badge
 * sur son Passport et lui écrit par la messagerie. Awa est notifiée et lit le message en direct.
 */
test('« Disponible pour une mission » puis message privé depuis le Passport', async ({
  browser,
}) => {
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
  await moussa.getByRole('button', { name: 'Envoyer un message' }).click();
  await expect(moussa).toHaveURL(/\/messages\/[0-9a-f-]{36}$/);
  const send = moussa.getByRole('button', { name: 'Envoyer', exact: true });
  await expect(send).toBeDisabled();
  const message = `Bonjour, une mission React à Dakar (${moussaLogin}) ?`;
  await moussa.getByLabel('Écrire un message').fill(message);
  await send.click();
  await expect(moussa.getByText(message)).toBeVisible();
  await expect(moussa.getByText('Envoi…')).toHaveCount(0);
  await moussa.screenshot({ path: 'test-results/contact-thread.png' });

  await awa.goto('/sos');
  await awa.getByRole('button', { name: 'Notifications' }).first().click();
  await expect(awa.getByText(/t’a envoyé un message/).first()).toBeVisible();
  await awa.goto('/messages');
  await awa
    .getByRole('link', { name: new RegExp(moussaLogin) })
    .first()
    .click();
  await expect(awa.getByText(message)).toBeVisible();
  await awa.screenshot({ path: 'test-results/contact-notification.png' });
});
