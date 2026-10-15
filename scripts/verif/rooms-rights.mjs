// Droits d'accès des salles vérifiés côté serveur (revue-de-code.md, checklist sécurité).
import { launch, loginAs, api } from './lib.mjs';
const code = process.argv[2];
const b = await launch();
const O = await loginAs(b, 'awa-dev');
const M = await loginAs(b, 'pr-author-42'); // membre
const X = await loginAs(b, 'kofi-dev'); // non-membre
const room = (await api(O.page, 'GET', `/rooms/${code}`)).json;
const t = (
  await api(O.page, 'POST', `/rooms/${room.id}/tasks`, {
    title: 'Tâche de contrôle des droits',
    description: 'Ne pas prendre.',
    level: 'first_step',
  })
).json;
const show = (label, r) => console.log(`${label} → ${r.status} ${r.json?.code ?? ''}`);
show(
  'non-membre crée une tâche',
  await api(X.page, 'POST', `/rooms/${room.id}/tasks`, {
    title: 'Intrus',
    description: 'Tâche ajoutée sans être membre.',
    level: 'first_step',
  }),
);
show('non-membre prend une tâche', await api(X.page, 'POST', `/tasks/${t.id}/take`));
show('membre prend la tâche', await api(M.page, 'POST', `/tasks/${t.id}/take`));
show(
  'membre clôture (owner seul)',
  await api(M.page, 'POST', `/tasks/${t.id}/complete`, {
    prUrl: 'https://github.com/awa-dev/devhub-demo/pull/44',
  }),
);
const jr = await api(X.page, 'POST', `/rooms/${room.id}/join`, { message: 'Je veux entrer' });
show('non-membre demande à rejoindre', jr);
const reqId = jr.json?.id ?? jr.json?.request?.id;
show(
  'membre décide de la demande (owner seul)',
  await api(M.page, 'POST', `/join-requests/${reqId}/decide`, { decision: 'accept' }),
);
show('non-connecté crée une tâche', {
  status: await (
    await fetch(`${process.env.WEB ?? 'http://localhost:5175'}/api/v1/rooms/${room.id}/tasks`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-devhub-client': 'web',
        'idempotency-key': crypto.randomUUID(),
        origin: 'http://localhost:5175',
      },
      body: '{}',
    })
  ).status,
  json: {},
});
show(
  'owner clôture avec une PR non fusionnée (n° impair)',
  await api(O.page, 'POST', `/tasks/${t.id}/complete`, {
    prUrl: 'https://github.com/awa-dev/devhub-demo/pull/43',
  }),
);
show('écriture sans en-tête CSRF', {
  status: (
    await O.page.request.fetch(
      `${process.env.WEB ?? 'http://localhost:5175'}/api/v1/rooms/${room.id}/tasks`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() },
        data: JSON.stringify({
          title: 'CSRF',
          description: 'Sans X-DevHub-Client.',
          level: 'first_step',
        }),
      },
    )
  ).status(),
  json: {},
});
await b.close();
