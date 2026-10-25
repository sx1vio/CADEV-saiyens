// Capture pleine page : node shot-full.mjs <chemin> <largeur> <theme> <login>
import { chromium } from '@playwright/test';
const [, , path = '/', w = '1440', theme = 'light', login = '0'] = process.argv;
const OUT = process.env.OUT ?? 'qa-shots';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: +w, height: 900 } });
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
await p.addInitScript((t) => {
  localStorage.setItem('dh-theme2', t);
  localStorage.setItem('dh-tour-done', '1');
}, theme);
if (login === '1') {
  await p.goto('http://127.0.0.1:5199/connexion');
  await p
    .getByRole('button', { name: /sans compte/i })
    .first()
    .click();
  await p.waitForURL((u) => !u.pathname.startsWith('/connexion'));
}
await p.goto('http://127.0.0.1:5199' + path, { waitUntil: 'networkidle' });
await p.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 600) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 120));
  }
  window.scrollTo(0, 0);
});
await p.waitForTimeout(800);
const name = `full${path.replace(/\W+/g, '_')}-${w}-${theme}.png`;
await p.screenshot({ path: `${OUT}/${name}`, fullPage: true });
console.log(name, errors.length ? errors.join(' | ') : 'ok');
await b.close();
