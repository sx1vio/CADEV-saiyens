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
  await page.goto(`/api/v1/auth/github?login=${login}&returnTo=${encodeURIComponent(returnTo)}`);
  await expect(page).toHaveURL(new RegExp(`${returnTo.replace(/\//g, '\\/')}`));
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
