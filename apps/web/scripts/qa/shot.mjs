// Captures d'écran rapides : node shot.mjs <chemin> [largeur] [theme] [login]
import { chromium } from '@playwright/test';
const [, , path = '/', w = '1440', theme = 'light', login = '1', h = '900'] = process.argv;
const OUT = process.env.OUT ?? 'qa-shots';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.addInitScript((t) => {
  localStorage.setItem('dh-theme2', t);
  localStorage.setItem('dh-tour-done', '1');
}, theme);
if (login === '1') {
  await page.goto('http://127.0.0.1:5199/connexion');
  await page
    .getByRole('button', { name: /sans compte|démo/i })
    .first()
    .click();
  await page.waitForURL((u) => !u.pathname.startsWith('/connexion'), { timeout: 15000 });
}
await page.goto('http://127.0.0.1:5199' + path);
await page.waitForTimeout(1800);
const name = `${path.replace(/\W+/g, '_') || 'root'}-${w}-${theme}.png`;
await page.screenshot({ path: `${OUT}/${name}` });
console.log(name, errors.length ? 'ERRORS: ' + errors.join(' | ') : 'ok');
await browser.close();
