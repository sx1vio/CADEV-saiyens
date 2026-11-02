import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { AppModule } from './app.module';
import { ENV } from './infrastructure/config/config.module';
import type { Env } from './infrastructure/config/env';
import { isAdminPath } from './modules/identity';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();
  const env = app.get<Env>(ENV);

  // Derrière Caddy : faire confiance au proxy du réseau Docker pour l'IP cliente.
  app.set('trust proxy', 'loopback, uniquelocal');
  // L'application publique peut appeler l'API depuis son origine ; jamais les routes
  // d'administration, servies sur leur propre origine sans CORS.
  app.enableCors((req: { url?: string }, cb) =>
    cb(null, {
      origin: isAdminPath((req.url ?? '').split('?')[0] ?? '') ? false : env.APP_URL,
      credentials: true,
    }),
  );

  if (env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder().setTitle('DevHub Africa API').setVersion('v1').build();
    SwaggerModule.setup(
      'api/docs',
      app,
      cleanupOpenApiDoc(SwaggerModule.createDocument(app, config)),
    );
  }

  await app.listen(env.PORT);
}

void bootstrap();
