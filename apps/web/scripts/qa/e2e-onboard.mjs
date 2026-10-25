// Parcours réel : inscription par e-mail → onboarding complet → première page du plan
import { chromium } from '@playwright/test';
const OUT = process.env.OUT ?? 'qa-shots';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 860 } });
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
await p.addInitScript(() => localStorage.setItem('dh-theme2', 'light'));
const email = `e2e.${Date.now()}@example.com`;
await p.goto(`http://127.0.0.1:5199/inscription?email=${email}`);
await p.getByLabel('Nom').fill('Aïcha Test');
await p.getByRole('textbox', { name: 'Mot de passe' }).fill('une phrase solide 2026');
await p.getByRole('checkbox').check();
await p.getByRole('button', { name: 'Créer mon compte' }).click();
await p.waitForURL('**/bienvenue');
const shot = async (n) => p.screenshot({ path: `${OUT}/ob-${n}.png` });
await shot(0);
await p.getByRole('button', { name: /Je débute/ }).click();
await p.getByRole('button', { name: 'Continuer' }).click();
await p.getByRole('button', { name: /Apprendre à coder/ }).click();
await p.getByRole('button', { name: /Me faire aider/ }).click();
await shot(1);
await p.getByRole('button', { name: 'Continuer' }).click();
await p.getByRole('button', { name: /^Web/ }).click();
await p.getByRole('button', { name: /IA et agents/ }).click();
await shot(2);
await p.getByRole('button', { name: 'Continuer' }).click();
await p.getByRole('button', { name: /Régulier/ }).click();
await shot(3);
await p.getByRole('button', { name: 'Continuer' }).click();
await shot(4);
await p.getByRole('button', { name: 'Continuer' }).click();
await shot(5);
await p.getByRole('checkbox').check();
await p.getByRole('button', { name: /C’est parti/ }).click();
await p.waitForURL((u) => !u.pathname.startsWith('/bienvenue'), { timeout: 15000 });
console.log('arrivée :', new URL(p.url()).pathname);
const me = await p.evaluate(() => fetch('/api/me').then((r) => r.json()));
console.log(
  'serveur :',
  me.handle,
  me.onboardedAt ? 'onboardé' : 'NON',
  JSON.stringify(me.prefs).slice(0, 120),
);
await shot(6);
console.log(errors.length ? 'ERREURS JS : ' + errors.join(' | ') : 'aucune erreur JS');
await b.close();
