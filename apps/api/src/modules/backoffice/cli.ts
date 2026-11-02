import 'reflect-metadata';
import { randomBytes } from 'node:crypto';
import { parseArgs } from 'node:util';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigModule, ENV } from '../../infrastructure/config/config.module';
import type { Env } from '../../infrastructure/config/env';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AesGcmTokenCipher, ScryptPasswordHasher } from '../identity';
import { newTotpSecret, otpauthUrl } from './domain/totp';

/*
 * Comptes de l'espace d'administration : la SEULE façon d'en créer. À lancer sur le serveur.
 *
 *   pnpm --filter @devhub/api admin create --email admin@exemple.com --name "Prénom Nom"
 *   pnpm --filter @devhub/api admin reset-2fa --email admin@exemple.com
 *   pnpm --filter @devhub/api admin revoke --email admin@exemple.com
 *   pnpm --filter @devhub/api admin list
 *
 * En production (image Docker) : docker compose exec api node dist/modules/backoffice/cli.js create …
 * Le mot de passe s'affiche une seule fois (ou --password pour le choisir, 16 caractères minimum).
 */

@Module({ imports: [ConfigModule, PrismaModule] })
class AdminCliModule {}

function fail(message: string): never {
  console.error(`Erreur : ${message}`);
  process.exit(1);
}

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);
  const { values } = parseArgs({
    args: rest,
    options: {
      email: { type: 'string' },
      name: { type: 'string' },
      password: { type: 'string' },
    },
  });
  const app = await NestFactory.createApplicationContext(AdminCliModule, { logger: ['error'] });
  const prisma = app.get(PrismaService);
  const env = app.get<Env>(ENV);
  const cipher = new AesGcmTokenCipher(env.TOKEN_ENCRYPTION_KEY);
  const hasher = new ScryptPasswordHasher();
  const email = values.email?.trim().toLowerCase();

  try {
    switch (command) {
      case 'create': {
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('--email valide requis');
        const password = values.password ?? randomBytes(18).toString('base64url');
        if (password.length < 16) fail('mot de passe trop court (16 caractères minimum)');
        const secret = newTotpSecret();
        const existing = await prisma.user.findFirst({ where: { email, deletedAt: null } });
        const data = {
          isAdmin: true,
          passwordHash: await hasher.hash(password),
          adminTotpSecret: Buffer.from(cipher.encrypt(secret)),
        };
        if (existing) {
          await prisma.user.update({ where: { id: existing.id }, data });
        } else {
          const name = values.name?.trim() || email.split('@')[0]!;
          const base = name
            .normalize('NFKD')
            .replace(/[̀-ͯ]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 24);
          await prisma.user.create({
            data: {
              ...data,
              email,
              emailVerified: true,
              displayName: name,
              handle: `${base || 'admin'}-${randomBytes(3).toString('hex')}`,
              // Compte de service : il n'apparaît pas dans l'annuaire des devs.
              privacy: { unlisted: true },
            },
          });
        }
        // Une seule session à la fois : on ferme les anciennes.
        await prisma.adminSession.deleteMany({ where: { user: { email } } });
        console.log(`\nCompte administrateur prêt : ${email}`);
        if (!values.password) console.log(`Mot de passe (affiché une seule fois) : ${password}`);
        console.log('\nDouble facteur : ajoute ce compte dans ton application d’authentification');
        console.log('(Google Authenticator, Aegis, 1Password…) avec ce lien ou ce secret :\n');
        console.log(`  ${otpauthUrl(secret, email)}`);
        console.log(`  Secret : ${secret.replace(/(.{4})/g, '$1 ').trim()}\n`);
        break;
      }
      case 'reset-2fa': {
        if (!email) fail('--email requis');
        const user = await prisma.user.findFirst({ where: { email, isAdmin: true } });
        if (!user) fail('aucun administrateur avec cette adresse');
        const secret = newTotpSecret();
        await prisma.user.update({
          where: { id: user.id },
          data: { adminTotpSecret: Buffer.from(cipher.encrypt(secret)) },
        });
        await prisma.adminSession.deleteMany({ where: { userId: user.id } });
        console.log(`\nNouveau secret pour ${email} (anciennes sessions fermées) :\n`);
        console.log(`  ${otpauthUrl(secret, email)}\n`);
        break;
      }
      case 'revoke': {
        if (!email) fail('--email requis');
        const { count } = await prisma.user.updateMany({
          where: { email },
          data: { isAdmin: false, adminTotpSecret: null },
        });
        await prisma.adminSession.deleteMany({ where: { user: { email } } });
        console.log(count ? `Accès retiré à ${email}.` : 'Aucun compte avec cette adresse.');
        break;
      }
      case 'list': {
        const admins = await prisma.user.findMany({
          where: { isAdmin: true, deletedAt: null },
          select: { email: true, handle: true, adminTotpSecret: true },
        });
        for (const a of admins)
          console.log(
            `${a.email ?? '(sans e-mail)'}  @${a.handle}  2FA : ${a.adminTotpSecret ? 'oui' : 'NON'}`,
          );
        if (!admins.length) console.log('Aucun administrateur.');
        break;
      }
      default:
        fail('commande attendue : create | reset-2fa | revoke | list');
    }
  } finally {
    await app.close();
  }
}

void main();
