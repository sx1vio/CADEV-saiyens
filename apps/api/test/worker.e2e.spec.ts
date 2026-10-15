import { NestFactory } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { JobQueue } from '../src/infrastructure/jobs/job-queue';
import { CheckServices } from '../src/modules/platform';
import { WorkerModule } from '../src/worker.module';
import { applyTestEnv } from './env.fixture';

// BUG-025 : la CI ne démarrait jamais le worker ; une dépendance manquante le faisait planter
// au démarrage (aucune piste IA, aucun matching, aucune sonde Systalink en production).
applyTestEnv({
  AUTH_FAKE_PROVIDER: 'true',
  NODE_ENV: 'test',
  LOG_LEVEL: 'warn',
  PROCESS_ROLE: 'worker',
});

describe('process worker', () => {
  // Démarrage complet (tous les modules, pg-boss, files) : jusqu'à 25 s quand toute la suite
  // tourne en parallèle sur une base neuve (BUG-029). Délai propre à ce test.
  it('démarre avec tous ses modules et enregistre ses jobs', { timeout: 60_000 }, async () => {
    const app = await NestFactory.createApplicationContext(WorkerModule, { logger: false });
    try {
      expect(app.get(JobQueue)).toBeDefined();
      expect(app.get(CheckServices)).toBeDefined();
    } finally {
      await app.close();
    }
  });
});
