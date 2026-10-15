import { launch, loginAs, shot, api } from './lib.mjs';
const b = await launch();
const { page } = await loginAs(b, 'awa-dev');
console.log('url après connexion', page.url());
console.log('me', JSON.stringify((await api(page, 'GET', '/me')).json).slice(0, 300));
await shot(page, '00-accueil');
await b.close();
