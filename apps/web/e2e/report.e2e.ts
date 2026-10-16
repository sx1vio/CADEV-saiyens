import { expect, test } from '@playwright/test';
import { signIn, uniqueLogin } from './support/session';

/** M1 : signaler un compte depuis son Passport ; l'API reçoit l'identifiant interne du compte. */
test('signaler un compte depuis son Passport', async ({ browser }) => {
  const target = uniqueLogin('target');
  const reported = await (await browser.newContext()).newPage();
  await signIn(reported, target, `/u/${target}`);
  // On ne se signale pas soi-même.
  await expect(reported.getByRole('button', { name: 'Signaler' })).toHaveCount(0);

  const reporter = await (await browser.newContext()).newPage();
  await signIn(reporter, uniqueLogin('reporter'), `/u/${target}`);
  const passport = (await (await reporter.request.get(`/api/v1/u/${target}`)).json()) as {
    user: { id: string };
  };

  await reporter.getByRole('button', { name: 'Signaler' }).click();
  const sheet = reporter.getByRole('dialog', { name: 'Signaler ce compte' });
  await sheet.getByLabel('Pourquoi ?').fill('Publie des liens de phishing dans les réponses.');
  const sent = reporter.waitForRequest(
    (r) => r.url().endsWith('/api/v1/reports') && r.method() === 'POST',
  );
  await sheet.getByRole('button', { name: 'Signaler' }).click();

  const request = await sent;
  expect(request.postDataJSON()).toMatchObject({ targetType: 'user', targetId: passport.user.id });
  expect((await request.response())?.ok()).toBeTruthy();
  await expect(reporter.getByText('Signalement envoyé.')).toBeVisible();
});
