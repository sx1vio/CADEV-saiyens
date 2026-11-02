import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AesGcmTokenCipher, ScryptPasswordHasher } from '../src/modules/identity';
import { newTotpSecret, totpAt } from '../src/modules/backoffice/domain/totp';
import type { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { cookieValue } from './sign-in.helper';
import { testEnvSource } from './env.fixture';

export const ADMIN_ORIGIN = 'http://localhost:5299';
/** En-têtes envoyés par l'application d'administration (apps/admin). */
export const ADMIN_HEADERS = { Origin: ADMIN_ORIGIN, 'X-DevHub-Client': 'admin' };

export interface AdminAccount {
  email: string;
  password: string;
  secret: string;
}

/** Fait d'un compte existant un administrateur, comme la CLI : mot de passe et secret TOTP chiffré. */
export async function makeAdmin(prisma: PrismaService, handle: string): Promise<AdminAccount> {
  const email = `${handle}@admin.test`;
  const password = 'une phrase de passe admin 2026';
  const secret = newTotpSecret();
  const key = process.env.TOKEN_ENCRYPTION_KEY || testEnvSource.TOKEN_ENCRYPTION_KEY;
  await prisma.user.update({
    where: { handle },
    data: {
      email,
      isAdmin: true,
      passwordHash: await new ScryptPasswordHasher().hash(password),
      adminTotpSecret: Buffer.from(new AesGcmTokenCipher(key).encrypt(secret)),
    },
  });
  return { email, password, secret };
}

/** Ouvre une session d'administration ; renvoie le cookie prêt à l'emploi. */
export async function adminSignIn(app: INestApplication, a: AdminAccount): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/v1/admin/session')
    .set(ADMIN_HEADERS)
    .send({ email: a.email, password: a.password, code: totpAt(a.secret, new Date()) })
    .expect(204);
  return `__Host-dh-adm=${cookieValue(res, '__Host-dh-adm')}`;
}
