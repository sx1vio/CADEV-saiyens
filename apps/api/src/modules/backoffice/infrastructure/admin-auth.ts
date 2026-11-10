import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { ScryptPasswordHasher, hashSessionToken, newSessionToken } from '../../identity';
import { ADMIN_MAX_MS, AdminSessionStore } from './admin-session.store';

// Empreinte d'un mot de passe quelconque : on vérifie toujours un hash, même pour une adresse
// inconnue, pour que le temps de réponse ne dise pas si le compte existe.
const DUMMY_HASH =
  'scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

export interface AdminSignIn {
  token: string;
  expiresAt: Date;
  userId: string;
}

/**
 * Connexion à l'administration : e-mail et mot de passe, sur un compte marqué administrateur
 * (créé uniquement par la CLI ou par un super-admin). Les tentatives sont limitées par le contrôleur.
 */
@Injectable()
export class AdminAuth {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: AdminSessionStore,
    private readonly hasher: ScryptPasswordHasher,
  ) {}

  async signIn(
    input: { email: string; password: string },
    ctx: { userAgent: string | null; ipHash: string | null },
    now = new Date(),
  ): Promise<AdminSignIn | null> {
    const user = await this.prisma.user.findFirst({
      where: { email: input.email, deletedAt: null },
      select: { id: true, isAdmin: true, passwordHash: true },
    });
    const passwordOk = await this.hasher.verify(input.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !passwordOk || !user.isAdmin) return null;

    const token = newSessionToken();
    const expiresAt = new Date(now.getTime() + ADMIN_MAX_MS);
    await this.sessions.create({
      idHash: hashSessionToken(token),
      userId: user.id,
      expiresAt,
      userAgent: ctx.userAgent,
      ipHash: ctx.ipHash,
    });
    await this.prisma.adminAction.create({
      data: {
        adminId: user.id,
        action: 'admin_sign_in',
        targetType: 'user',
        targetId: user.id,
        reason: 'Connexion à l’administration',
      },
    });
    return { token, expiresAt, userId: user.id };
  }
}
