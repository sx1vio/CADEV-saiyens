import { expect, test } from '@playwright/test';
import { signIn, uniqueLogin } from './support/session';

/**
 * Certifications : entraînement corrigé par l'API, puis examen blanc chronométré corrigé par
 * le serveur ; les erreurs rejoignent « Mes erreurs ». Les réponses ne sont jamais dans la page.
 */
test('entraînement, examen blanc et révision des erreurs', async ({ page }) => {
  await signIn(page, uniqueLogin('cert'), '/certifications/git-fondamentaux');
  await expect(page.getByRole('heading', { name: 'Git et GitHub — Fondamentaux' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Programme par thème' })).toBeVisible();

  await page.getByRole('tab', { name: 'S’entraîner' }).click();
  await page.getByRole('button', { name: /Tous les thèmes/ }).click();
  await page.getByRole('radiogroup', { name: 'Réponses' }).getByRole('radio').first().click();
  await page.getByRole('button', { name: 'Vérifier' }).click();
  await expect(page.getByRole('status')).toContainText(/Bonne réponse|Pas tout à fait/);
  await page.getByRole('button', { name: 'Arrêter' }).click();

  const start = page.waitForResponse((r) => r.url().includes('/attempts') && r.ok());
  await page.getByRole('button', { name: 'Passer un examen blanc' }).click();
  const attempt = (await (await start).json()) as { questions: unknown[] };
  expect(JSON.stringify(attempt)).not.toContain('"answer"');
  for (let i = 0; i < attempt.questions.length; i++) {
    // Toujours le dernier choix : une partie des réponses sera fausse.
    await page.getByRole('radiogroup', { name: 'Réponses' }).getByRole('radio').last().click();
    if (i < attempt.questions.length - 1)
      await page.getByRole('button', { name: 'Suivante' }).click();
  }
  await page.getByRole('button', { name: 'Terminer' }).click();
  await page.getByRole('button', { name: 'Envoyer', exact: true }).click();
  await expect(page.getByText('Examen blanc', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Score par thème' })).toBeVisible();

  await page.getByRole('button', { name: 'Retour à la fiche' }).click();
  await page.getByRole('tab', { name: /Mes erreurs/ }).click();
  await expect(page.getByText(/questions? à revoir/)).toBeVisible();
  // Aucun certificat pour un examen blanc.
  const mine = await page.request.get('/api/v1/certifications/me');
  const git = (await mine.json()).items.find(
    (i: { certId: string }) => i.certId === 'git-fondamentaux',
  );
  expect(git.certificate).toBeNull();
});
