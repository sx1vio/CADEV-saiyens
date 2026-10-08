import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

export const APP_ORIGIN = 'http://localhost:5173';

/** Écritures : en-têtes exigés par la protection CSRF (OriginGuard). */
export const WRITE_HEADERS = { Origin: APP_ORIGIN, 'X-DevHub-Client': 'web' };

export function cookieValue(res: request.Response, name: string): string | undefined {
  const raw = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
  return raw
    .find((c) => c.startsWith(`${name}=`))
    ?.slice(name.length + 1)
    .split(';')[0];
}

/** Connexion complète avec le faux fournisseur GitHub ; renvoie le cookie de session prêt à l'emploi. */
export async function signInAs(app: INestApplication, login: string): Promise<string> {
  const start = await request(app.getHttpServer())
    .get('/api/v1/auth/github')
    .query({ login })
    .expect(302);
  const callback = new URL(start.headers.location as string);
  const done = await request(app.getHttpServer())
    .get(callback.pathname + callback.search)
    .set('Cookie', `__Host-oauth=${cookieValue(start, '__Host-oauth')}`)
    .expect(302);
  return `__Host-sid=${cookieValue(done, '__Host-sid')}`;
}
