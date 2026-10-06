import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ConfigModule } from '../src/infrastructure/config/config.module';
import { HealthController } from '../src/infrastructure/http/health.controller';
import { ProblemDetailsFilter } from '../src/infrastructure/http/problem-details.filter';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';

describe('santé', () => {
  let app: INestApplication;
  let dbUp = true;

  beforeAll(async () => {
    process.env.APP_URL ??= 'http://localhost:5173';
    process.env.DATABASE_URL ??= 'postgresql://devhub:devhub@localhost:5432/devhub';
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule],
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: async () => {
              if (!dbUp) throw new Error('down');
              return [{ '?column?': 1 }];
            },
          },
        },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/healthz répond ok', async () => {
    await request(app.getHttpServer()).get('/api/v1/healthz').expect(200, { status: 'ok' });
  });

  it('GET /readyz répond ready quand la base répond', async () => {
    dbUp = true;
    await request(app.getHttpServer()).get('/readyz').expect(200, { status: 'ready' });
  });

  it('GET /readyz renvoie un problem+json 503 quand la base est indisponible', async () => {
    dbUp = false;
    const res = await request(app.getHttpServer()).get('/readyz').expect(503);
    expect(res.headers['content-type']).toContain('application/problem+json');
    expect(res.body.code).toBe('database.unavailable');
  });
});
