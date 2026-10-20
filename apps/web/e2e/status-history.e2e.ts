import { execFileSync } from 'node:child_process';
import { expect, test } from '@playwright/test';

/**
 * Y5 : l'écran /systalink dessine la disponibilité des 7 derniers jours à partir de
 * GET /status/history. Un jour sans sonde s'affiche « pas de mesure », jamais 100 %.
 * Les sondes sont posées en base (le VPS il y a 2 jours : 2 réussies sur 3).
 */
test('disponibilité sur 7 jours : barres par jour et jours sans mesure', async ({ page }) => {
  execFileSync('pnpm', ['--filter', '@devhub/api', 'exec', 'prisma', 'db', 'execute', '--stdin'], {
    input: `DELETE FROM status_checks WHERE service = 'vps'
        AND checked_at >= date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' - interval '6 days';
      INSERT INTO status_checks (service, ok, checked_at) VALUES
        ('vps', true,  date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' - interval '2 days' + interval '1 hour'),
        ('vps', true,  date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' - interval '2 days' + interval '2 hours'),
        ('vps', false, date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' - interval '2 days' + interval '3 hours');`,
    stdio: ['pipe', 'ignore', 'inherit'],
  });

  await page.goto('/systalink');
  const section = page.locator('section', {
    has: page.getByRole('heading', { name: 'Disponibilité sur 7 jours' }),
  });
  await expect(section).toBeVisible();

  const vps = section.getByRole('list', { name: 'Disponibilité par jour' }).first();
  await expect(vps.getByRole('listitem')).toHaveCount(7);
  await expect(vps.getByTitle(/ : 66,7 % \(3 sondes\)$/)).toHaveCount(1);
  // Le VPS n'a aucune sonde il y a 6 jours : « pas de mesure », pas une journée parfaite.
  await expect(vps.getByRole('listitem').first()).toHaveAttribute('title', / : pas de mesure$/);

  await section.screenshot({ path: 'test-results/status-history.png' });
});
