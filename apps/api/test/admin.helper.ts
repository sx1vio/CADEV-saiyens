import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ScryptPasswordHasher } from '../src/modules/identity';
import type { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { cookieValue } from './sign-in.helper';

export const ADMIN_ORIGIN = 'http://localhost:5299';
/** En-têtes envoyés par l'application d'administration (apps/admin). */
export const ADMIN_HEADERS = { Origin: ADMIN_ORIGIN, 'X-DevHub-Client': 'admin' };

export interface AdminAccount {
  email: string;
  password: string;
}

/** Fait d'un compte existant un administrateur, comme la CLI : e-mail et mot de passe. */
export async function makeAdmin(prisma: PrismaService, handle: string): Promise<AdminAccount> {
  const email = `${handle}@admin.test`;
  const password = 'une phrase de passe admin 2026';
  await prisma.user.update({
    where: { handle },
    data: {
      email,
      isAdmin: true,
      passwordHash: await new ScryptPasswordHasher().hash(password),
    },
  });
  return { email, password };
}

/** Ouvre une session d'administration ; renvoie le cookie prêt à l'emploi. */
export async function adminSignIn(app: INestApplication, a: AdminAccount): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/v1/admin/session')
    .set(ADMIN_HEADERS)
    .send({ email: a.email, password: a.password })
    .expect(204);
  return `__Host-dh-adm=${cookieValue(res, '__Host-dh-adm')}`;
}
