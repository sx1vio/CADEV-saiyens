#!/usr/bin/env node
// D4 : génère apps/web/src/components/africa-map/shapes.ts à partir des frontières Natural Earth
// (domaine public, https://www.naturalearthdata.com/about/terms-of-use/).
//
// Usage (une seule fois, le résultat est versionné) :
//   curl -sSfL -o ne50.geojson \
//     https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_admin_0_countries.geojson
//   node scripts/generate-africa-map.mjs ne50.geojson > apps/web/src/components/africa-map/shapes.ts
//
// Aucune dépendance : projection équirectangulaire, simplification de Douglas-Peucker, coordonnées
// arrondies. Les territoires sans code ISO (Somaliland, Sahara occidental) sont dessinés en neutre.
import { readFileSync } from 'node:fs';

const WIDTH = 1000;
const TOLERANCE = 0.6; // en unités du viewBox
const BOUNDS = { west: -26, east: 64, north: 38, south: -36 };

const scale = WIDTH / (BOUNDS.east - BOUNDS.west);
const HEIGHT = Math.round((BOUNDS.north - BOUNDS.south) * scale);
const project = ([lon, lat]) => [(lon - BOUNDS.west) * scale, (BOUNDS.north - lat) * scale];

function perpendicular(p, a, b) {
  const [x, y] = p;
  const [x1, y1] = a;
  const [x2, y2] = b;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len === 0) return Math.hypot(x - x1, y - y1);
  return Math.abs(dy * x - dx * y + x2 * y1 - y2 * x1) / len;
}

function simplify(points, tolerance) {
  if (points.length < 3) return points;
  let max = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicular(points[i], points[0], points[points.length - 1]);
    if (d > max) {
      max = d;
      index = i;
    }
  }
  if (max <= tolerance) return [points[0], points[points.length - 1]];
  const left = simplify(points.slice(0, index + 1), tolerance);
  return [...left.slice(0, -1), ...simplify(points.slice(index), tolerance)];
}

const round = (n) => Math.round(n * 10) / 10;

function ringPath(ring) {
  const pts = simplify(ring.map(project), TOLERANCE).map(([x, y]) => [round(x), round(y)]);
  const unique = pts.filter((p, i) => i === 0 || p[0] !== pts[i - 1][0] || p[1] !== pts[i - 1][1]);
  if (unique.length < 4) return '';
  return `M${unique.map(([x, y]) => `${x} ${y}`).join('L')}Z`;
}

function featurePath(geometry) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  return polygons.map((rings) => rings.map(ringPath).join('')).join('');
}

const file = process.argv[2];
if (!file) {
  console.error('Usage : node scripts/generate-africa-map.mjs ne_50m_admin_0_countries.geojson');
  process.exit(1);
}
const geo = JSON.parse(readFileSync(file, 'utf8'));
const shapes = geo.features
  // Maurice et les Seychelles sont rangées par Natural Earth dans « Seven seas (open ocean) ».
  .filter(
    (f) => f.properties.CONTINENT === 'Africa' || ['MU', 'SC'].includes(f.properties.ISO_A2_EH),
  )
  .map((f) => {
    const code = f.properties.ISO_A2_EH;
    return {
      code: /^[A-Z]{2}$/.test(code) && code !== 'EH' ? code : null,
      name: f.properties.NAME_EN,
      d: featurePath(f.geometry),
    };
  })
  .filter((s) => s.d)
  .sort((a, b) => a.name.localeCompare(b.name));

const lines = [
  '// Généré par scripts/generate-africa-map.mjs à partir de Natural Earth 1:50m v5.1.2',
  '// (domaine public). Ne pas modifier à la main : relancer le script.',
  '',
  `export const MAP_VIEWBOX = '0 0 ${WIDTH} ${HEIGHT}';`,
  '',
  '/** `code` : ISO 3166-1 alpha-2 ; null pour un territoire sans code (dessiné en neutre). */',
  'export const AFRICA_SHAPES: ReadonlyArray<{ code: string | null; name: string; d: string }> = [',
  ...shapes.map(
    (s) => `  { code: ${JSON.stringify(s.code)}, name: ${JSON.stringify(s.name)}, d: '${s.d}' },`,
  ),
  '];',
  '',
];
process.stdout.write(lines.join('\n'));
