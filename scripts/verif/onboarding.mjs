// Parcours d'accueil (5 étapes) pour un compte neuf. Usage : node onboarding.mjs <login> [pays]
import { launch, loginAs, shot, api } from './lib.mjs';
const login = process.argv[2] ?? 'awa-dev';
const country = process.argv[3] ?? 'CI';
const b = await launch();
const { page } = await loginAs(b, login);
const next = page.getByRole('button', { name: /Continuer/ });
console.log('étape 1, Continuer actif avant choix du pays :', await next.isEnabled());
await page.selectOption('#ob-country', country);
console.log('étape 1, Continuer actif après choix :', await next.isEnabled());
await next.click();
// Étape 2 : au moins 3 compétences.
for (const name of ['Docker', 'Node.js', 'React', 'TypeScript', 'PostgreSQL']) {
  const c = page
    .getByRole('button', { name: new RegExp(`^${name.replace('.', '\\.')}$`, 'i') })
    .first();
  if (await c.count()) await c.click();
}
await shot(page, `${login}-onb-2`);
console.log('étape 2, Continuer actif :', await next.isEnabled());
for (let i = 0; i < 3; i++) {
  await next.click();
  await page.waitForTimeout(300);
}
await page.locator('input[type=checkbox]').check();
await shot(page, `${login}-onb-5`);
await page.locator('button[type=button]').last().click();
await page
  .waitForURL((u) => !u.pathname.startsWith('/bienvenue'), { timeout: 10000 })
  .catch(() => {});
console.log('après fin :', page.url());
const me = (await api(page, 'GET', '/me')).json;
console.log(
  'me.country',
  me.country,
  'timezone',
  me.timezone,
  'coc',
  me.codeOfConductAcceptedAt ?? me.trust?.codeOfConductAcceptedAt,
);
console.log('skills', JSON.stringify((await api(page, 'GET', '/me/skills')).json).slice(0, 200));
await shot(page, `${login}-home`);
await b.close();
