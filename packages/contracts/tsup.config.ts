import { defineConfig } from 'tsup';

// Double format : ESM pour le front (Vite), CommonJS pour l'API (NestJS).
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  // tsup injecte baseUrl, déprécié en TypeScript 6 : on l'autorise pour la seule génération des types.
  dts: { compilerOptions: { ignoreDeprecations: '6.0' } },
  clean: true,
  sourcemap: true,
  target: 'es2022',
});
