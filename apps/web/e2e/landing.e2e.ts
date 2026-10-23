import { expect, test } from '@playwright/test';
import { signIn, uniqueLogin, writeHeaders } from './support/session';

/**
 * T1 : un visiteur sans compte arrive sur « / » et voit l'activité réelle : compteurs de
 * l'écran d'impact et dernières questions publiques, sans nom d'auteur.
 */
test('page publique « en direct » : compteurs réels et question récente', async ({ browser }) => {
  const login = uniqueLogin('live');
  const author = await (await browser.newContext()).newPage();
  await signIn(author, login);
  const title = `Docker refuse de démarrer après la mise à jour (${login.slice(-6)})`;
  const asked = await author.request.post('/api/v1/questions', {
    headers: { ...writeHeaders(author), 'Idempotency-Key': crypto.randomUUID() },
    data: {
      clientId: crypto.randomUUID(),
      title,
      body: 'Le démon Docker s’arrête aussitôt lancé.',
      tagSlugs: ['docker'],
      lang: 'fr',
    },
  });
  expect(asked.ok()).toBeTruthy();

  const visitor = await (await browser.newContext()).newPage();
  await visitor.goto('/');
  const live = visitor.getByRole('region', { name: 'En direct sur DevHub' });
  await expect(live).toBeVisible();
  await expect(live.getByText('Devs inscrits')).toBeVisible();
  await expect(live.getByRole('link', { name: title })).toBeVisible();
  await expect(live.getByText(login)).toHaveCount(0);
  await visitor.screenshot({ path: 'test-results/landing-live.png', fullPage: true });

  await live.getByRole('link', { name: title }).click();
  await expect(visitor).toHaveURL(/\/sos\//);
});
