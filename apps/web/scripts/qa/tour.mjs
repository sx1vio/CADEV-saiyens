// Visite guidée : capture chaque étape. node scripts/qa/tour.mjs [largeur] [hauteur]
import { chromium } from '@playwright/test';
const [, , w = '1920', h = '956'] = process.argv;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
await page.addInitScript(() => localStorage.setItem('dh-theme2', 'dark'));
await page.goto('http://127.0.0.1:5199/connexion');
await page
  .getByRole('button', { name: /sans compte|démo/i })
  .first()
  .click();
await page.waitForURL((u) => !u.pathname.startsWith('/connexion'), { timeout: 15000 });
await page.waitForTimeout(1500);
const started = await page.locator('#tour-title').count();
if (!started) {
  await page.keyboard.press('Control+k');
  await page.waitForTimeout(400);
  await page.keyboard.type('visite');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(800);
}
for (let i = 0; i < 6; i++) {
  await page.waitForTimeout(700);
  const box = await page.locator('#tour-title').locator('xpath=../..').boundingBox();
  console.log(i + 1, JSON.stringify(box));
  await page.screenshot({ path: `qa-shots/tour-${w}-${i + 1}.png` });
  await page.keyboard.press('ArrowRight');
}
await browser.close();
