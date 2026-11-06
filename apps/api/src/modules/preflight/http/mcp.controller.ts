import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Res,
  Delete,
} from '@nestjs/common';
import type { Response } from 'express';
import { ENV } from '../../../infrastructure/config/config.module';
import type { Env } from '../../../infrastructure/config/env';
import { AllowApiToken, type AuthenticatedUser, CurrentUser } from '../../identity';
import { PreflightMcpServer } from '../application/mcp-server';
import { RunPreflight } from '../application/run-preflight';
import { PreflightRepository } from '../infrastructure/preflight.repository';
import { reportLinks } from './report-links';

const MAX_BATCH = 10;

/**
 * Serveur MCP distant du pré-vol : POST /api/v1/mcp, authentifié par un jeton d'API personnel
 * (« Authorization: Bearer dh_pat_… »). Sans état : pas de flux SSE, pas d'identifiant de session.
 */
@Controller('api/v1/mcp')
export class McpController {
  private readonly server: PreflightMcpServer;

  constructor(runner: RunPreflight, reports: PreflightRepository, @Inject(ENV) env: Env) {
    this.server = new PreflightMcpServer({
      run: (input) => runner.run(input),
      get: (id) => reports.get(id),
      listMine: (userId) => reports.listMine(userId),
      links: (id) => reportLinks(env, id),
      version: '1.0.0',
    });
  }

  @Post()
  @AllowApiToken()
  @HttpCode(HttpStatus.OK)
  async post(
    @CurrentUser() auth: AuthenticatedUser,
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ): Promise<unknown> {
    if (Array.isArray(body)) {
      const out = (
        await Promise.all(body.slice(0, MAX_BATCH).map((m) => this.server.handle(m, auth.userId)))
      ).filter((r) => r !== null);
      if (!out.length) res.status(HttpStatus.ACCEPTED);
      return out.length ? out : undefined;
    }
    const reply = await this.server.handle(body, auth.userId);
    if (reply === null) {
      res.status(HttpStatus.ACCEPTED);
      return undefined;
    }
    return reply;
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
