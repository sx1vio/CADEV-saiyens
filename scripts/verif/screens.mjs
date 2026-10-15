// PR2, PR3, D1, D2, Y1, Y2 : écrans publics, lus en visiteur anonyme puis connecté,
// comparés aux réponses de l'API (aucune donnée inventée, CDC §6.6).
import { launch, shot, api, WEB } from './lib.mjs';
const b = await launch();
const ctx = await b.newContext({ locale: 'fr-FR' });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log(`pageerror: ${e.message}`));
const text = async () =>
  (
    await page
      .locator('main')
      .innerText()
      .catch(() => '')
  ).replace(/\s+/g, ' ');
const visit = async (path, name) => {
  await page.goto(`${WEB}/${path}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  await shot(page, `screen-${name}`);
  const t = await text();
  console.log(`\n[${path}] ${t.length} car. « ${t.slice(0, 260)} »`);
  return t;
};
const p = await visit('u/pr-author-42', 'passport');
const pp = (await api(page, 'GET', '/u/pr-author-42')).json;
console.log(
  'API passport : XP',
  pp.stats?.totalXp,
  '| compétences',
  pp.skills.map((s) => `${s.tag.label}:${s.score}`).join(', '),
);
console.log('écran mentionne 30 XP :', /30/.test(p), '| « Voir les preuves » :', /preuve/i.test(p));
const proofsLink = page.getByRole('link', { name: /preuve/i }).first();
if (await proofsLink.count()) {
  await proofsLink.click();
  await page.waitForLoadState('networkidle');
  console.log('preuves →', page.url(), '|', (await text()).slice(0, 200));
}
await visit('decouvrir', 'decouvrir');
console.log(
  'API discover/devs :',
  (await api(page, 'GET', '/discover/devs')).json.data
    ?.map((d) => d.handle ?? d.user?.handle)
    .join(', '),
);
await visit('classement', 'classement');
console.log(
  'API leaderboard :',
  JSON.stringify((await api(page, 'GET', '/leaderboard')).json).slice(0, 300),
);
await visit('systalink', 'systalink');
console.log('API status :', JSON.stringify((await api(page, 'GET', '/status')).json).slice(0, 400));
await visit('impact', 'impact');
console.log('API impact :', JSON.stringify((await api(page, 'GET', '/impact')).json).slice(0, 400));
await b.close();
