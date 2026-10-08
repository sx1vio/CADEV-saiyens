import { Inject, Injectable } from '@nestjs/common';
import { ENV } from '../../../infrastructure/config/config.module';
import type { Env } from '../../../infrastructure/config/env';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { AesGcmTokenCipher } from './aes-gcm-token-cipher';

/** Jeton GitHub déchiffré d'un utilisateur, pour les appels en lecture seule (import du profil, salles). */
@Injectable()
export class GithubTokenReader {
  private readonly cipher: AesGcmTokenCipher;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENV) env: Env,
  ) {
    this.cipher = new AesGcmTokenCipher(env.TOKEN_ENCRYPTION_KEY);
  }

  async tokenFor(userId: string): Promise<string | null> {
    const account = await this.prisma.oAuthAccount.findFirst({
      where: { userId, provider: 'github', user: { deletedAt: null } },
      select: { accessTokenEnc: true },
    });
    return account?.accessTokenEnc ? this.cipher.decrypt(account.accessTokenEnc) : null;
  }
}
