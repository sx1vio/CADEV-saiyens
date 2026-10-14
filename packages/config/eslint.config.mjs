// Preset ESLint partagé (docs/architecture/01-structure-monorepo.md). Chaque application l'étend
// dans son propre eslint.config.mjs au lieu de dupliquer les règles.
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** Règles communes à tous les paquets TypeScript. */
export const base = tseslint.config(
  { ignores: ['**/dist/**', '**/coverage/**', '**/generated/**', '**/node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports', disallowTypeAnnotations: false },
      ],
      'no-console': 'error', // journaliser avec le logger (pino), jamais console.log
      'no-debugger': 'error',
    },
  },
);

// Frontières du back-end (docs/architecture/02-backend.md) : un module n'entre chez un autre
// que par son index.ts, et les couches ne dépendent que vers l'intérieur.
const otherModuleInternals = {
  regex: String.raw`^\.\./\.\./(?!\.\.)[^/]+/.+`,
  message:
    'Importer un autre module uniquement par son index (« ../../github »), jamais ses fichiers internes.',
};
const outerLayers = (layer) => ({
  group: [
    '**/infrastructure/**',
    '**/http/**',
    '**/jobs/**',
    '@prisma/*',
    '**/generated/prisma/**',
  ],
  message: `La couche ${layer} ne dépend ni de l'infrastructure, ni de HTTP, ni de Prisma : passer par un port.`,
});

/** Preset pour une application NestJS (apps/api). */
export const nestApi = tseslint.config(
  ...base,
  {
    languageOptions: { globals: globals.node },
    rules: {
      // NestJS injecte par les métadonnées de type : un import « type » casserait l'injection.
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
  {
    files: ['src/modules/*/*/*.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: [otherModuleInternals] }] },
  },
  {
    files: ['src/modules/*/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            otherModuleInternals,
            outerLayers('domaine'),
            {
              group: ['**/application/**', '@nestjs/*'],
              message: 'Le domaine est du TypeScript pur.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/modules/*/application/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [otherModuleInternals, outerLayers('application')] },
      ],
    },
  },
  {
    // Scripts en ligne de commande (seed, collecte manuelle) : la sortie console est leur interface.
    files: ['prisma/**/*.ts', '**/cli.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    files: ['**/*.spec.ts', 'test/**/*.ts'],
    rules: {
      // Les tests assemblent volontairement des adaptateurs réels ou factices.
      'no-restricted-imports': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
);
