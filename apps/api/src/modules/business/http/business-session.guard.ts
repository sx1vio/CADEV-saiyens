import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ENV } from '../../../infrastructure/config/config.module';
import type { Env } from '../../../infrastructure/config/env';
import { hashSessionToken, readCookie } from '../../identity';
import {
  type ActiveBusinessSession,
  BusinessSessionStore,
} from '../infrastructure/business-session.store';

/** Cookie du portail entreprise, posé seulement sur son origine. */
export const BUSINESS_COOKIE = '__Host-dh-biz';

export type BusinessRequest = Request & { biz?: ActiveBusinessSession };

export const notFound = () => new NotFoundException({ code: 'not_found', title: 'Not found' });

/** Toute route /api/v1/business/* : portail activé, requête venue de son application. */
export function assertBusinessChannel(req: Request, env: Env): void {
  if (!env.BUSINESS_URL) throw notFound();
  if (req.headers['x-devhub-client'] !== 'business') throw notFound();
  const origin = req.headers.origin;
  if (origin && origin !== new URL(env.BUSINESS_URL).origin) throw notFound();
  const site = req.headers['sec-fetch-site'];
  if (site && site !== 'same-origin' && site !== 'none') throw notFound();
}

@Injectable()
export class BusinessSessionGuard implements CanActivate {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly sessions: BusinessSessionStore,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<BusinessRequest>();
    assertBusinessChannel(req, this.env);
    const token = readCookie(req, BUSINESS_COOKIE);
    if (!token) throw notFound();
    const session = await this.sessions.use(hashSessionToken(token), new Date());
    if (!session) throw notFound();
    req.biz = session;
    return true;
  }
}
