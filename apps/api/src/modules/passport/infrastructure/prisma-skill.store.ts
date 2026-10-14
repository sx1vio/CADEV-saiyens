import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { ImportSummary, SkillStore } from '../domain/ports';
import { type TagSignal, skillScore } from '@devhub/core';

const importKey = (userId: string) => `profile-import:${userId}`;

@Injectable()
export class PrismaSkillStore implements SkillStore {
  constructor(private readonly prisma: PrismaService) {}

  async tagIndex(): Promise<Map<string, string>> {
    const tags = await this.prisma.tag.findMany({
      select: { id: true, slug: true, label: true, aliases: true },
    });
    const index = new Map<string, string>();
    for (const tag of tags) {
      for (const name of [tag.slug, tag.label, ...tag.aliases])
        index.set(name.toLowerCase(), tag.id);
    }
    return index;
  }

  async replaceGithubSignals(userId: string, signals: TagSignal[]): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.userSkill.findMany({ where: { userId } });
      const xpByTag = new Map(existing.map((s) => [s.tagId, s.xpTag]));
      const kept = new Set(signals.map((s) => s.tagId));

      for (const s of signals) {
        const xp = xpByTag.get(s.tagId) ?? 0;
        await tx.userSkill.upsert({
          where: { userId_tagId: { userId, tagId: s.tagId } },
          create: {
            userId,
            tagId: s.tagId,
            githubRepos: s.qualifiedRepos,
            githubSignal: s.githubSignal,
            score: skillScore(s.githubSignal, 0),
          },
          update: {
            githubRepos: s.qualifiedRepos,
            githubSignal: s.githubSignal,
            score: skillScore(s.githubSignal, xp),
          },
        });
      }
      // Compétences qui ne viennent plus de GitHub : on garde celles prouvées sur la plateforme.
      for (const s of existing) {
        if (kept.has(s.tagId)) continue;
        if (s.xpTag > 0) {
          await tx.userSkill.update({
            where: { userId_tagId: { userId, tagId: s.tagId } },
            data: { githubRepos: 0, githubSignal: 0, score: skillScore(0, s.xpTag) },
          });
        } else {
          await tx.userSkill.delete({ where: { userId_tagId: { userId, tagId: s.tagId } } });
        }
      }
    });
  }

  async lastImportAt(userId: string): Promise<Date | null> {
    const row = await this.prisma.githubCache.findUnique({
      where: { key: importKey(userId) },
      select: { fetchedAt: true },
    });
    return row?.fetchedAt ?? null;
  }

  async recordImport(userId: string, summary: ImportSummary, at: Date): Promise<void> {
    const data = {
      body: { ...summary },
      fetchedAt: at,
      expiresAt: new Date(at.getTime() + 6 * 3600 * 1000),
    };
    await this.prisma.githubCache.upsert({
      where: { key: importKey(userId) },
      create: { key: importKey(userId), ...data },
      update: data,
    });
  }

  async listSkills(userId: string) {
    return this.prisma.userSkill.findMany({
      where: { userId },
      include: { tag: { select: { slug: true, label: true } } },
      orderBy: [{ score: 'desc' }, { githubSignal: 'desc' }],
    });
  }
}
