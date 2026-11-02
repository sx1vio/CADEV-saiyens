import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import {
  AesGcmTokenCipher,
  ScryptPasswordHasher,
  hashSessionToken,
  newSessionToken,
} from '../../identity';
import { verifyTotp } from '../domain/totp';
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
 * Connexion à l'administration : e-mail, mot de passe ET code TOTP, sur un compte marqué
 * administrateur qui a un secret TOTP (posé uniquement par la CLI). Un code ne sert qu'une fois.
 */
@Injectable()
export class AdminAuth {
  private readonly usedCodes = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: AdminSessionStore,
    private readonly hasher: ScryptPasswordHasher,
    private readonly cipher: AesGcmTokenCipher,
  ) {}

  async signIn(
    input: { email: string; password: string; code: string },
    ctx: { userAgent: string | null; ipHash: string | null },
    now = new Date(),
  ): Promise<AdminSignIn | null> {
    const user = await this.prisma.user.findFirst({
      where: { email: input.email, deletedAt: null },
      select: { id: true, isAdmin: true, passwordHash: true, adminTotpSecret: true },
    });
    const passwordOk = await this.hasher.verify(input.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !passwordOk || !user.isAdmin || !user.adminTotpSecret) return null;

    let secret: string;
    try {
      secret = this.cipher.decrypt(user.adminTotpSecret);
    } catch {
      return null;
    }
    if (!verifyTotp(secret, input.code, now)) return null;

    // Anti-rejeu : un code accepté ne peut pas être réutilisé pendant sa fenêtre de validité.
    this.forgetOldCodes(now);
    const replayKey = `${user.id}:${input.code}`;
    if (this.usedCodes.has(replayKey)) return null;
    this.usedCodes.set(replayKey, now.getTime());

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

  private forgetOldCodes(now: Date): void {
    for (const [k, at] of this.usedCodes)
      if (now.getTime() - at > 120_000) this.usedCodes.delete(k);
  }
}
