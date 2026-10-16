import { execFileSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { signIn, uniqueLogin, writeHeaders } from './support/session';

/**
 * Idées A et B (Systalink) : le créateur prouve que son application est en production, la
 * salle affiche le badge, l'écran /systalink la met en vitrine, et chaque bouton « Déployer sur
 * Systalink » passe par le compteur de l'API. La lecture réelle de l'application (réseau) est
 * couverte par les tests de l'API ; ici, la vérification est posée en base.
 */
test('preuve « en production sur Systalink » et bouton de déploiement', async ({ page }) => {
  const login = uniqueLogin('systalink');
  await signIn(page, login);
  const created = await page.request.post('/api/v1/rooms', {
    headers: { ...writeHeaders(page), 'Idempotency-Key': crypto.randomUUID() },
    data: {
      name: `Paylink ${login.slice(-6)}`,
      description: 'Paiements mobile money pour les petits commerces.',
      stackTagSlugs: ['docker'],
    },
  });
  expect(created.ok()).toBeTruthy();
  const room = (await created.json()) as { id: string; code: string };

  await page.goto(`/p/${room.code}`);
  await expect(page.getByText('Prouve que ton application tourne vraiment')).toBeVisible();
  await page.getByLabel("Adresse publique de l'application").fill('https://paylink.example.sn');
  await page.getByRole('button', { name: "Enregistrer l'adresse" }).click();
  await expect(page.getByText('Publie ce jeton dans un fichier à cette adresse :')).toBeVisible();
  await expect(page.getByText(/^devhub-[0-9a-f]{24}$/).first()).toBeVisible();

  const deploy = page.getByRole('link', { name: 'Déployer sur Systalink' });
  await expect(deploy).toHaveAttribute(
    'href',
    `/api/v1/go/systalink?to=deploy&from=room&room=${room.code}`,
  );
  await page.screenshot({ path: 'test-results/systalink-room-pending.png', fullPage: true });

  // Vérification réussie sur Systalink, comme après POST /deployment/verify.
  execFileSync('pnpm', ['--filter', '@devhub/api', 'exec', 'prisma', 'db', 'execute', '--stdin'], {
    input: `UPDATE room_deployments SET verified_at = now(), hosted_on_systalink = true,
      checks_total = 4, checks_up = 4, last_up = true, last_check_at = now()
      WHERE room_id = '${room.id}';`,
    stdio: ['pipe', 'ignore', 'inherit'],
  });
  await page.reload();
  await expect(page.getByText('En production sur Systalink').first()).toBeVisible();
  await expect(page.getByText('100 %')).toBeVisible();
  await page.screenshot({ path: 'test-results/systalink-room-verified.png', fullPage: true });

  await page.goto('/systalink');
  await expect(page.getByRole('link', { name: `Paylink ${login.slice(-6)}` })).toBeVisible();
  await page.screenshot({ path: 'test-results/systalink-screen.png', fullPage: true });

  const go = await page.request.get(`/api/v1/go/systalink?to=deploy&from=room&room=${room.code}`, {
    maxRedirects: 0,
  });
  expect(go.status()).toBe(302);
  expect(go.headers().location).toContain('https://platform.systalink.com/serverless');
});

/** Idée C : l'aide Systalink, publique ; « Poser une question » pré-remplit l'étiquette. */
test('aide Systalink : FAQ publique et question pré-étiquetée', async ({ page }) => {
  await signIn(page, uniqueLogin('sysaide'));
  await page.goto('/systalink/aide');
  await expect(page.getByRole('heading', { name: 'Aide Systalink', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Réponses validées' })).toBeVisible();
  await page.getByRole('button', { name: 'Poser une question sur Systalink' }).click();
  const ask = page.getByRole('dialog');
  await expect(ask).toBeVisible();
  await expect(ask.getByRole('button', { name: 'Systalink ×' })).toBeVisible();
  await page.screenshot({ path: 'test-results/systalink-help.png', fullPage: true });
});
