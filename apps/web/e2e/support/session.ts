import { execFileSync } from 'node:child_process';
import { expect, type APIRequestContext, type Page } from '@playwright/test';

/** Login GitHub unique par exécution : la base de test peut être réutilisée sans collision. */
export const uniqueLogin = (prefix: string) =>
  `e2e-${prefix}-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;

/** En-têtes exigés par l'API sur toute écriture (protection CSRF, 10-securite.md). */
export const writeHeaders = (page: Page) => ({
  'X-DevHub-Client': 'web',
  Origin: new URL(page.url()).origin,
});

/**
 * Connexion par le faux fournisseur GitHub : /auth/github?login=… revient directement sur le
 * callback, qui pose le cookie de session puis redirige vers `returnTo`. Le code de conduite
 * (M3) est accepté par l'API : l'onboarding n'est pas l'objet de ces parcours.
 */
export async function signIn(page: Page, login: string, returnTo = '/sos') {
  const landing = await page.goto(
    `/api/v1/auth/github?login=${login}&returnTo=${encodeURIComponent(returnTo)}`,
  );
  // Destination de la redirection du serveur : l'application envoie ensuite un compte neuf vers
  // /bienvenue tant que le code de conduite n'est pas accepté (course selon la vitesse).
  expect(landing?.url()).toMatch(new RegExp(`${returnTo.replace(/\//g, '\\/')}`));
  const res = await page.request.post('/api/v1/me/code-of-conduct', {
    headers: writeHeaders(page),
  });
  expect(res.ok()).toBeTruthy();
  await page.goto(returnTo);
}

export interface QuestionSummary {
  id: string;
  title: string;
}

/** Questions du compte connecté, lues directement sur l'API. */
export async function myQuestions(request: APIRequestContext): Promise<QuestionSummary[]> {
  const res = await request.get('/api/v1/questions?mine=true&limit=50');
  expect(res.ok()).toBeTruthy();
  return ((await res.json()) as { data: QuestionSummary[] }).data;
}

/** Nombre d'actions dans la file hors ligne de l'appareil (IndexedDB devhub-queue, offline/network.ts). */
export const queuedActions = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<number>((resolve, reject) => {
        const open = indexedDB.open('devhub-queue');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const count = open.result.transaction('actions').objectStore('actions').count();
          count.onsuccess = () => resolve(count.result);
          count.onerror = () => reject(count.error);
        };
      }),
  );

/**
 * Donne le rôle d'administrateur à un compte, directement en base (comme les tests de l'API) :
 * aucun écran ne le permet, c'est une décision d'exploitation.
 */
export function promoteAdmin(login: string) {
  if (!/^[a-zA-Z0-9-]+$/.test(login)) throw new Error(`login invalide : ${login}`);
  execFileSync('pnpm', ['--filter', '@devhub/api', 'exec', 'prisma', 'db', 'execute', '--stdin'], {
    input: `UPDATE users SET is_admin = true WHERE handle = '${login}';`,
    stdio: ['pipe', 'ignore', 'inherit'],
  });
}
