// Seed de développement : étiquettes du référentiel (@devhub/core). En production, l'API les
// synchronise elle-même au démarrage (BUG-026). Idempotent : peut être relancé sans doublon.
import { PrismaPg } from '@prisma/adapter-pg';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { TAG_REFERENCE } from '@devhub/core';
import { PrismaClient } from '../src/generated/prisma/client';

config({ path: resolve(__dirname, '../../../.env'), quiet: true });

async function main(): Promise<void> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    for (const { slug, label, aliases } of TAG_REFERENCE) {
      await prisma.tag.upsert({
        where: { slug },
        create: { slug, label, aliases: [...aliases] },
        update: { label, aliases: [...aliases] },
      });
    }
    console.log(`${TAG_REFERENCE.length} étiquettes à jour.`);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
