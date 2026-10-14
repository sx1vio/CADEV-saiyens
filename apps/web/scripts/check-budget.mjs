#!/usr/bin/env node
// Budget de performance de l'accueil (CDC §9, docs/architecture/03-frontend.md), vérifié en CI
// après `vite build`. Lit dist/.vite/manifest.json et additionne ce qu'un premier visiteur
// télécharge : le point d'entrée et la page d'accueil publique (Landing) avec leurs imports
// statiques, leurs feuilles de style, leurs images, et les polices du sous-ensemble latin
// (le seul que le navigateur charge pour du français ou de l'anglais).
// Les fichiers texte comptent compressés (gzip), les images et polices à leur taille réelle.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const KO = 1024;
const BUDGET = { initialJs: 150 * KO, total: 300 * KO };
const ENTRIES = ['index.html', 'src/pages/Landing.tsx'];

const dist = join(import.meta.dirname, '..', 'dist');
const manifest = JSON.parse(readFileSync(join(dist, '.vite', 'manifest.json'), 'utf8'));

const sizeOf = (file) => {
  const buf = readFileSync(join(dist, file));
  return /\.(js|css|html|svg)$/.test(file) ? gzipSync(buf, { level: 9 }).length : buf.length;
};

/** Fichiers chargés par une entrée : imports statiques (pas les imports dynamiques), CSS, images. */
function closure(key, seen = new Set()) {
  const chunk = manifest[key];
  if (!chunk || seen.has(key)) return seen;
  seen.add(key);
  for (const dep of chunk.imports ?? []) closure(dep, seen);
  return seen;
}

const filesOf = (keys) => {
  const files = new Set();
  for (const key of keys) {
    const c = manifest[key];
    files.add(c.file);
    for (const f of c.css ?? []) files.add(f);
    for (const f of c.assets ?? []) {
      // Polices : seul le sous-ensemble latin est téléchargé (unicode-range).
      if (f.endsWith('.woff2') && !/-latin-(?:opsz|wght)-normal-/.test(f)) continue;
      files.add(f);
    }
  }
  return files;
};

const initial = filesOf(closure('index.html'));
const all = filesOf(ENTRIES.reduce((s, e) => closure(e, s), new Set()));
all.add('index.html');

const sum = (files, filter = () => true) =>
  [...files].filter(filter).reduce((n, f) => n + sizeOf(f), 0);
const initialJs = sum(initial, (f) => f.endsWith('.js'));
const total = sum(all);

const ko = (n) => `${(n / KO).toFixed(1)} Ko`;
const rows = [
  ['JS initial (gzip)', initialJs, BUDGET.initialJs],
  ['Accueil, transfert total', total, BUDGET.total],
];
let failed = false;
for (const [label, value, max] of rows) {
  const ok = value <= max;
  failed ||= !ok;
  console.log(`${ok ? 'ok ' : 'KO '} ${label} : ${ko(value)} / ${ko(max)}`);
}
if (failed) {
  console.error('Budget de performance dépassé (docs/architecture/03-frontend.md).');
  process.exit(1);
}
