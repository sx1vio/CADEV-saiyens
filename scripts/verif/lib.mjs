// Outils des essais réels de la session de vérification (navigateur Playwright).
// Usage : WEB=http://localhost:5175 node scripts/verif/<parcours>.mjs
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { chromium } = require('@playwright/test');

export const WEB = process.env.WEB ?? 'http://localhost:5175';
export const OUT = process.env.OUT ?? '/tmp/verif';
mkdirSync(OUT, { recursive: true });

export async function launch() {
  return chromium.launch({ channel: 'chromium', headless: true });
}

/** Ouvre un contexte connecté au compte `login` par le faux fournisseur OAuth. */
export async function loginAs(browser, login, query = '') {
  const ctx = await browser.newContext({ locale: 'fr-FR' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log(`[${login}] pageerror: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && console.log(`[${login}] console: ${m.text()}`));
  await page.goto(`${WEB}/api/v1/auth/github?login=${login}`);
  await page.waitForLoadState('networkidle');
  if (query) await page.goto(`${WEB}/${query}`, { waitUntil: 'domcontentloaded' });
  return { ctx, page };
}

export async function shot(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
}

/** Requête JSON sur l'API avec la session du contexte (en-têtes CSRF et idempotence). */
export async function api(page, method, path, body) {
  const res = await page.request.fetch(`${WEB}/api/v1${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      origin: WEB,
      'x-devhub-client': 'web',
      ...(method === 'GET' ? {} : { 'idempotency-key': crypto.randomUUID() }),
    },
    data: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status(), json };
}
