import type { PrismaService } from '../src/infrastructure/prisma/prisma.service';

export interface TagSeed {
  slug: string;
  label: string;
  aliases?: readonly string[];
}

/**
 * Crée les étiquettes manquantes et renvoie leurs identifiants par slug. Les fichiers de test
 * tournent en parallèle sur la même base : `upsert` n'y est pas atomique (deux créations
 * simultanées échouent sur `tags_slug_key`), alors que `createMany` + `skipDuplicates`
 * devient un seul `INSERT … ON CONFLICT DO NOTHING` (BUG-014).
 */
export async function ensureTags(
  prisma: PrismaService,
  tags: readonly TagSeed[],
): Promise<Map<string, string>> {
  await prisma.tag.createMany({
    data: tags.map((t) => ({ slug: t.slug, label: t.label, aliases: [...(t.aliases ?? [])] })),
    skipDuplicates: true,
  });
  const rows = await prisma.tag.findMany({
    where: { slug: { in: tags.map((t) => t.slug) } },
    select: { id: true, slug: true },
  });
  return new Map(rows.map((r) => [r.slug, r.id]));
}
