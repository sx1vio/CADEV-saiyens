// A3 : suppression du compte (DELETE /me { confirmHandle }), anonymisation, effets visibles.
import { launch, loginAs, api, WEB } from './lib.mjs';
const login = process.argv[2] ?? `del-${Date.now() % 1e5}`;
const b = await launch();
const U = await loginAs(b, login);
await api(U.page, 'POST', '/me/code-of-conduct');
const H = await loginAs(b, 'kofi-dev');
const show = (l, r) => console.log(`${l} → ${r.status} ${r.json?.code ?? ''}`);
// Traces publiques du compte : une question, et une réponse validée chez un autre (XP).
const q = (
  await api(U.page, 'POST', '/questions', {
    clientId: crypto.randomUUID(),
    title: `Question avant suppression ${Date.now() % 1e5}`,
    body: 'Ce contenu doit rester lisible après la suppression du compte.',
    tagSlugs: ['docker'],
    urgency: 'low',
    lang: 'fr',
  })
).json;
const hq = (
  await api(H.page, 'POST', '/questions', {
    clientId: crypto.randomUUID(),
    title: `Question de kofi ${Date.now() % 1e5}`,
    body: 'Question à laquelle le compte supprimé répond.',
    tagSlugs: ['docker'],
    urgency: 'low',
    lang: 'fr',
  })
).json;
const a = (
  await api(U.page, 'POST', `/questions/${hq.id}/answers`, {
    clientId: crypto.randomUUID(),
    body: 'Réponse écrite avant la suppression du compte.',
  })
).json;
show('validation de sa réponse', await api(H.page, 'POST', `/answers/${a.id}/accept`));
const before = (await api(U.page, 'GET', `/u/${login}`)).json;
console.log(`avant : Passport ${before.user?.handle}, XP ${before.stats?.totalXp}`);

show('mauvais handle', await api(U.page, 'DELETE', '/me', { confirmHandle: 'quelqu-un-d-autre' }));
show('sans corps', await api(U.page, 'DELETE', '/me'));
const noCsrf = await U.page.request.fetch(`${WEB}/api/v1/me`, {
  method: 'DELETE',
  headers: { 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() },
  data: JSON.stringify({ confirmHandle: login }),
});
console.log(`sans en-tête X-DevHub-Client → ${noCsrf.status()}`);
const noKey = await U.page.request.fetch(`${WEB}/api/v1/me`, {
  method: 'DELETE',
  headers: { 'content-type': 'application/json', origin: WEB, 'x-devhub-client': 'web' },
  data: JSON.stringify({ confirmHandle: login }),
});
console.log(`sans Idempotency-Key → ${noKey.status()}`);
show(
  'autre compte qui tente de supprimer celui-ci',
  await api(H.page, 'DELETE', '/me', { confirmHandle: login }),
);

show('suppression', await api(U.page, 'DELETE', '/me', { confirmHandle: login }));
show('/me après suppression', await api(U.page, 'GET', '/me'));
show(
  'écriture après suppression',
  await api(U.page, 'POST', '/questions', {
    clientId: crypto.randomUUID(),
    title: 'Après suppression du compte',
    body: 'Ne doit pas être accepté.',
    tagSlugs: ['docker'],
    urgency: 'low',
    lang: 'fr',
  }),
);
show('Passport public', await api(H.page, 'GET', `/u/${login}`));
const og = await fetch(`http://localhost:3002/u/${login}`);
console.log(`aperçu de partage /u/${login} → ${og.status}`);
const qd = await api(H.page, 'GET', `/questions/${q.id}`);
console.log(`sa question → ${qd.status}, auteur ${JSON.stringify(qd.json.author)}`);
const hd = (await api(H.page, 'GET', `/questions/${hq.id}`)).json;
const ans = hd.answers?.find((x) => x.id === a.id);
console.log(
  `sa réponse validée → auteur ${JSON.stringify(ans?.author)}, validée ${ans?.isAccepted ?? ans?.accepted}`,
);
const devs = (await api(H.page, 'GET', '/discover/devs')).json.data.map(
  (d) => d.handle ?? d.user?.handle,
);
console.log(
  `dans la découverte : ${devs.includes(login)} | handles anonymisés visibles : ${devs.filter((h) => !/^(awa|kofi|admin|rt|demo|pr-author)/.test(h)).join(', ')}`,
);
// Reconnexion avec le même compte GitHub : nouveau compte vierge, ou ancien ressuscité ?
const U2 = await loginAs(b, login);
const me2 = (await api(U2.page, 'GET', '/me')).json;
console.log(
  `reconnexion GitHub du même login → handle ${me2.handle}, id identique : ${me2.id === before.user?.id}, XP ${(await api(U2.page, 'GET', `/u/${me2.handle}`)).json.stats?.totalXp}`,
);
await b.close();
