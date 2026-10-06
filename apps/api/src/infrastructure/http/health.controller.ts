import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// /api/v1/healthz : le process répond (le front s'en sert pour confirmer « en ligne »).
// /readyz : la base répond (utilisé par Docker et le script de déploiement).
@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('api/v1/healthz')
  healthz(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('readyz')
  async readyz(): Promise<{ status: 'ready' }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready' };
    } catch {
      throw new ServiceUnavailableException({
        code: 'database.unavailable',
        title: 'Database unavailable',
      });
    }
  }
}
