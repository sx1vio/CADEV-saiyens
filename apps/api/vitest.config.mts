import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// SWC conserve les métadonnées de décorateurs dont l'injection de dépendances NestJS a besoin.
export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
    environment: 'node',
    // Les tests de bout en bout démarrent l'application et la base : 5 s par défaut ne suffisent
    // pas à froid, quand les fichiers tournent en parallèle (BUG-014).
    testTimeout: 15_000,
    // Démarrer l'application complète dans un beforeAll peut dépasser 30 s quand toute la suite
    // tourne en parallèle avec les autres paquets sur une base neuve (BUG-034).
    hookTimeout: 60_000,
    // Chaque fichier e2e démarre l'application complète (pool Prisma, pg-boss) : au-delà de
    // quatre en parallèle, la base sature et des requêtes dépassent 15 s sous charge (BUG-023).
    maxWorkers: 4,
  },
  plugins: [swc.vite({ module: { type: 'es6' } })],
});
