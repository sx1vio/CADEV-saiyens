import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { type ProofsResponse, ProofsQueryDto, ProofsResponseDto } from './dto';

interface Cursor {
  at: string;
  id: string;
}
const encode = (c: Cursor) => Buffer.from(JSON.stringify(c)).toString('base64url');
function decode(raw: string | undefined): Cursor | null {
  if (!raw) return null;
  try {
    const c = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as Cursor;
    return typeof c.at === 'string' && typeof c.id === 'string' && !Number.isNaN(Date.parse(c.at))
      ? c
      : null;
  } catch {
    return null;
  }
}

// X1 : le journal des Proof XP est public ; chaque point renvoie à sa source. La contrepartie
// (qui a validé, qui a voté) n'est pas exposée. Lecture seule : pas d'entité de domaine (CQRS léger).
@Controller('api/v1/u')
export class ProofsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':handle/proofs')
  @ApiOkResponse({ type: ProofsResponseDto })
  async proofs(
    @Param('handle') handle: string,
    @Query() query: ProofsQueryDto,
  ): Promise<ProofsResponse> {
    const user = await this.prisma.user.findFirst({
      where: { handle, deletedAt: null },
      select: { id: true, handle: true, displayName: true },
    });
    if (!user) throw new NotFoundException({ code: 'not_found', title: 'Passport not found' });

    const cursor = decode(query.cursor);
    const [rows, total] = await Promise.all([
      this.prisma.xpEvent.findMany({
        where: {
          userId: user.id,
          ...(cursor
            ? {
                OR: [
                  { createdAt: { lt: new Date(cursor.at) } },
                  { createdAt: new Date(cursor.at), id: { lt: cursor.id } },
                ],
              }
            : {}),
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: query.limit + 1,
        include: { tag: { select: { slug: true, label: true } } },
      }),
      this.prisma.xpEvent.aggregate({ where: { userId: user.id }, _sum: { points: true } }),
    ]);

    const page = rows.slice(0, query.limit);
    const last = page.at(-1);
    return {
      user: { handle: user.handle, displayName: user.displayName },
      totalXp: total._sum.points ?? 0,
      events: page.map((e) => ({
        id: e.id,
        kind: e.kind,
        points: e.points,
        tag: e.tag,
        source: { type: e.sourceType, id: e.sourceId },
        createdAt: e.createdAt.toISOString(),
        revertedAt: e.revertedAt?.toISOString() ?? null,
        revertsId: e.revertsId,
      })),
      page: {
        hasMore: rows.length > query.limit,
        nextCursor:
          rows.length > query.limit && last
            ? encode({ at: last.createdAt.toISOString(), id: last.id })
            : null,
      },
    };
  }
}
