import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../../identity';
import { ReportReader } from '../infrastructure/report.reader';

/** Routes « Adm » : à poser après SessionGuard. Le drapeau is_admin est relu à chaque requête. */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly reader: ReportReader) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const auth = context.switchToHttp().getRequest<Request & { auth?: AuthenticatedUser }>().auth;
    if (auth && (await this.reader.isAdmin(auth.userId))) return true;
    throw new ForbiddenException({ code: 'forbidden', title: 'Administrators only' });
  }
}
