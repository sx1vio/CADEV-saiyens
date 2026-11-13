import { expect, test } from '@playwright/test';
import { signIn, uniqueLogin } from './support/session';

/**
 * #200 : une fois connecté, les pages d'information du site public (règles, impact, Systalink,
 * sources, confidentialité, agents IA) restent accessibles depuis l'interface (carte « Aide et
 * infos » des Réglages depuis le 13/11/2026), pas seulement en tapant leur adresse.
 */
const INFO = [
  ['Règles', '/regles'],
  ['Impact', '/impact'],
  ['Systalink', '/systalink'],
  ['Nos sources', '/sources'],
  ['Confidentialité', '/confidentialite'],
] as const;

test.use({ viewport: { width: 1280, height: 768 } });

test('connecté : pages d’information accessibles depuis les Réglages', async ({ page }) => {
  await signIn(page, uniqueLogin('info'), '/');
  // Depuis le 13/11/2026, ces liens ne sont plus sous la carte du profil.
  await expect(page.getByRole('navigation', { name: 'Informations sur DevHub' })).toHaveCount(0);

  for (const [label, path] of INFO) {
    await page.goto('/reglages');
    const info = page.getByRole('navigation', { name: 'Informations sur DevHub' });
    await info.getByRole('link', { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
  }

  const side = page.getByRole('navigation', { name: 'Navigation' });
  await side.getByRole('link', { name: 'Héberger', exact: true }).click();
  await expect(page).toHaveURL(/\/systalink$/);
  await side.getByRole('link', { name: 'Agents IA (MCP)', exact: true }).click();
  await expect(page).toHaveURL(/\/mcp$/);
});

test('connecté : menu du compte, recherche et liens en contexte', async ({ page }) => {
  const login = uniqueLogin('info-menu');
  await signIn(page, login, '/');

  // Menu du compte : section « Aide et infos ».
  await page.getByRole('banner').getByRole('button', { name: login }).click();
  await expect(page.getByText('Aide et infos')).toBeVisible();
  await page.getByRole('menuitem', { name: 'Confidentialité' }).click();
  await expect(page).toHaveURL(/\/confidentialite$/);

  // Recherche Ctrl K : Sources et Confidentialité y figurent.
  for (const [label, path] of [
    ['Nos sources', '/sources'],
    ['Confidentialité', '/confidentialite'],
  ] as const) {
    await page.goto('/');
    await page.getByRole('button', { name: /Rechercher une question/ }).click();
    await page.getByRole('combobox').fill(label);
    await page.getByRole('option', { name: label }).first().click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
  }

  // Réglages : politique de confidentialité et jetons des agents IA.
  await page.goto('/reglages');
  await expect(page.getByRole('link', { name: 'Gérer mes jetons' })).toHaveAttribute(
    'href',
    '/mcp#jeton',
  );

  // Fil, onglet Actualité : d'où viennent les actus.
  await page.goto('/?f=actu');
  await page.getByRole('link', { name: 'D’où viennent ces actus ?' }).click();
  await expect(page).toHaveURL(/\/sources$/);
});
