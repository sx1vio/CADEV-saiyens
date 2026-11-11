import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  Delete,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { Server } from 'node:http';
import type { Request, Response } from 'express';
import { ENV } from '../../../infrastructure/config/config.module';
import type { Env } from '../../../infrastructure/config/env';
import { AllowApiToken, type AuthenticatedUser, CurrentUser } from '../../identity';
import { type McpCaller, PreflightMcpServer } from '../application/mcp-server';
import { listeningPort, loopbackCaller } from '../infrastructure/api-loopback';
import { RunPreflight } from '../application/run-preflight';
import { PreflightRepository } from '../infrastructure/preflight.repository';
import { reportLinks } from './report-links';

const MAX_BATCH = 10;

/**
 * Serveur MCP distant de DevHub Africa : POST /api/v1/mcp, authentifié par un jeton d'API
 * personnel (« Authorization: Bearer dh_pat_… »). Portée « preflight » : outils du pré-vol ;
 * portée « platform » : toute la plateforme. Sans état : pas de flux SSE ni d'identifiant de session.
 */
@Controller('api/v1/mcp')
export class McpController {
  private readonly server: PreflightMcpServer;

  constructor(
    runner: RunPreflight,
    reports: PreflightRepository,
    @Inject(ENV) env: Env,
    private readonly adapter: HttpAdapterHost,
  ) {
    this.server = new PreflightMcpServer({
      run: (input) => runner.run(input),
      get: (id) => reports.get(id),
      listMine: (userId) => reports.listMine(userId),
      links: (id) => reportLinks(env, id),
      version: '2.0.0',
    });
  }

  @Post()
  @AllowApiToken()
  @HttpCode(HttpStatus.OK)
  async post(
    @CurrentUser() auth: AuthenticatedUser,
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<unknown> {
    const caller = this.caller(auth, req);
    if (Array.isArray(body)) {
      const out = (
        await Promise.all(body.slice(0, MAX_BATCH).map((m) => this.server.handle(m, caller)))
      ).filter((r) => r !== null);
      if (!out.length) res.status(HttpStatus.ACCEPTED);
      return out.length ? out : undefined;
    }
    const reply = await this.server.handle(body, caller);
    if (reply === null) {
      res.status(HttpStatus.ACCEPTED);
      return undefined;
    }
    return reply;
  }

  /** Jeton « platform » : les outils plateforme appellent l'API avec ce même jeton. */
  private caller(auth: AuthenticatedUser, req: Request): McpCaller {
    const port = listeningPort(this.adapter.httpAdapter?.getHttpServer() as Server | undefined);
    const authorization = req.headers.authorization;
    if (auth.tokenScope !== 'platform' || !authorization || port === null)
      return { userId: auth.userId, scope: 'preflight' };
    return {
      userId: auth.userId,
      scope: 'platform',
      api: loopbackCaller(port, { authorization, clientIp: req.ip }),
    };
  }

  /** Pas de flux serveur → client (mode sans état) : 405, comme le prévoit la spécification. */
  @Get()
  notStreaming(@Res() res: Response): void {
    res.status(HttpStatus.METHOD_NOT_ALLOWED).set('Allow', 'POST').end();
  }

  @Delete()
  noSession(@Res() res: Response): void {
    res.status(HttpStatus.METHOD_NOT_ALLOWED).set('Allow', 'POST').end();
  }
}
