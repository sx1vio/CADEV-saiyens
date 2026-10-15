// R7 : aperçus de partage /u/:handle et /p/:code servis par l'API (port API direct).
// Injection HTML par le nom affiché et la description, salle masquée, statistiques privées.
import { launch, loginAs, api } from './lib.mjs';
const API = process.env.API ?? 'http://localhost:3002';
const XSS = '"><script>alert(1)</script>';
const b = await launch();
const { page } = await loginAs(b, 'kofi-dev');
console.log(
  'PATCH /me',
  (await api(page, 'PATCH', '/me', { displayName: `Kofi ${XSS}`.slice(0, 50) })).status,
);
const room = await api(page, 'POST', '/rooms', {
  name: `Salle ${XSS}`.slice(0, 60),
  description: `Paiements mobile money ${XSS} pour Dakar`,
  stackTagSlugs: ['docker'],
});
console.log('POST /rooms', room.status, room.json.code ?? JSON.stringify(room.json).slice(0, 200));
const get = async (p) => {
  const r = await fetch(`${API}${p}`);
  const html = await r.text();
  return {
    status: r.status,
    cc: r.headers.get('cache-control'),
    html,
    head: html.match(/<title>[\s\S]*?<\/head>/)?.[0] ?? '',
  };
};
for (const p of ['/u/kofi-dev', `/p/${room.json.code}`]) {
  const r = await get(p);
  console.log(
    p,
    r.status,
    r.cc,
    '| script injecté :',
    r.html.includes('<script>alert(1)'),
    '|',
    r.head.match(/og:description" content="[^"]*"/)?.[0],
  );
}
console.log(
  'privacy hideStats',
  (await api(page, 'PATCH', '/me', { privacy: { hideStats: true } })).status,
);
console.log(
  '/u/kofi-dev après hideStats :',
  (await get('/u/kofi-dev')).head.match(/og:description" content="[^"]*"/)?.[0],
);
await api(page, 'PATCH', '/me', { privacy: { hideStats: false } });
console.log('ROOM_ID', room.json.id, 'CODE', room.json.code);
await b.close();
