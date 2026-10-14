import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiProduces } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import {
  type AuthenticatedUser,
  OptionalSessionGuard,
  OptionalUser,
  PrismaSessionStore,
} from '../../identity';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { RealtimeHub } from '../../../infrastructure/realtime/realtime.hub';

const PING_MS = 25_000;
const REPLAY_LIMIT = 100;
const MAX_TOPICS = 5;
const TOPIC = /^(?:question|room):[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Format d'un événement SSE (https://html.spec.whatwg.org/multipage/server-sent-events.html). */
export function sseFrame(event: string, data: unknown, id?: string): string {
  return `${id ? `id: ${id}\n` : ''}event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

// Y8 : flux Server-Sent Events. Événements personnels (notifications, reprise par
// Last-Event-ID = notifications.seq) et sujets publics (?topics=question:<id>).
@Controller('api/v1/events')
export class EventsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hub: RealtimeHub,
    private readonly sessions: PrismaSessionStore,
  ) {}

  @Get()
  @UseGuards(OptionalSessionGuard)
  @ApiProduces('text/event-stream')
  async stream(
    @OptionalUser() viewer: AuthenticatedUser | null,
    @Query('topics') rawTopics: string | undefined,
    @Query('lastEventId') queryLastEventId: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const topics = new Set(
      (rawTopics ?? '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    );
    if (topics.size > MAX_TOPICS || [...topics].some((t) => !TOPIC.test(t))) {
      throw new BadRequestException({ code: 'validation.failed', title: 'Invalid topics' });
    }
    if (!viewer && topics.size === 0) {
      throw new UnauthorizedException({ code: 'auth.required', title: 'Authentication required' });
    }

    const userId = viewer?.userId ?? null;
    const resumeFrom = req.header('last-event-id') ?? queryLastEventId;
    let lastSeq: bigint | null = null;
    if (userId) {
      if (resumeFrom && /^\d+$/.test(resumeFrom)) {
        lastSeq = BigInt(resumeFrom);
      } else {
        // Première connexion : on part de maintenant ; l'historique est dans GET /notifications.
        const last = await this.prisma.notification.findFirst({
          where: { userId },
          orderBy: { seq: 'desc' },
          select: { seq: true },
        });
        lastSeq = last?.seq ?? 0n;
      }
    }

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    res.write('retry: 3000\n\n');

    let closed = false;
    let queue = Promise.resolve();
    let stop = () => undefined as void;
    // Une connexion longue ne survit pas à la déconnexion ni à l'expiration de la session :
    // on la revérifie avant chaque envoi personnel et à chaque ping.
    const sessionStillValid = async (): Promise<boolean> => {
      if (!viewer) return true;
      if (await this.sessions.findActive(viewer.sessionIdHash, new Date())) return true;
      if (!closed) {
        res.write(sseFrame('session.ended', {}));
        stop();
        res.end();
      }
      return false;
    };
    const flushUser = () => {
      if (!userId || closed) return;
      queue = queue
        .then(async () => {
          if (!(await sessionStillValid())) return;
          const rows = await this.prisma.notification.findMany({
            where: { userId, seq: { gt: lastSeq! } },
            orderBy: { seq: 'asc' },
            take: REPLAY_LIMIT,
          });
          for (const n of rows) {
            if (closed) return;
            res.write(
              sseFrame(
                'notification.created',
                {
                  id: n.id,
                  type: n.type,
                  payload: n.payload,
                  createdAt: n.createdAt.toISOString(),
                },
                n.seq.toString(),
              ),
            );
            lastSeq = n.seq;
          }
        })
        .catch(() => undefined);
    };

    const remove = this.hub.add({
      userId,
      topics,
      onUserEvent: flushUser,
      onPublicEvent: (event, data) => {
        if (!closed) res.write(sseFrame(event, data));
      },
    });
    const ping = setInterval(() => {
      res.write(': ping\n\n');
      void sessionStillValid().catch(() => undefined);
    }, PING_MS);
    stop = () => {
      closed = true;
      clearInterval(ping);
      remove();
    };
    req.on('close', stop);

    // Événements manqués pendant la coupure (Last-Event-ID).
    if (resumeFrom) flushUser();
  }
}
