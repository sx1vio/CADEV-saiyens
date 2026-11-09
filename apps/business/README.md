# DevHub Business (`@devhub/business`)

Portail des entreprises qui recrutent sur DevHub, servi sur **sa propre adresse**
(`business.<domaine>` en production, port 5399 en local). Gratuit pendant le lancement.

## Parcours

1. L'entreprise s'inscrit (profil de l'entreprise + compte recruteur). Elle est **en attente**.
2. L'administration de DevHub la vérifie (onglet « Entreprises » de `apps/admin`) : validée,
   refusée (avec un motif) ou, plus tard, suspendue.
3. Une fois validée, ses offres « En ligne » apparaissent directement sur `/emplois`, avec une
   page publique `/entreprises/:slug`. En attente, elle prépare ses offres en brouillon.
4. Les devs postulent **avec leur Passport** et un message ; l'entreprise suit les candidatures
   (nouvelle, consultée, entretien, recrutée, non retenue). Le dev est notifié à chaque étape
   et suit l'avancement dans « Mes candidatures ».

## Compte et équipe

- **Équipe** : le propriétaire (le compte qui a inscrit l'entreprise) ajoute des recruteurs ; chacun
  a son propre accès. Le mot de passe provisoire n'est affiché qu'une fois, au propriétaire, qui le
  transmet ; le recruteur le change dans « Compte et équipe ». Retirer un recruteur ferme aussitôt
  ses sessions (le compte est désactivé, l'historique reste).
- **Mot de passe** : changement avec le mot de passe actuel (les autres sessions sont fermées) ;
  « Mot de passe oublié » envoie un lien valable une heure, à usage unique, dont le jeton est dans
  le fragment de l'adresse (`#reinitialiser=…`) : il n'atteint jamais un serveur ni un journal.
- **Tableau de bord** : chiffres des offres, dernières candidatures avec un lien direct vers les
  candidatures de l'offre.

## Sécurité

- Comptes recruteurs **séparés** des comptes devs (jamais dans l'annuaire ni le classement).
- Session propre (cookie `__Host-dh-biz`, SameSite=Strict, 14 jours glissants).
- Routes `/api/v1/business/*` : 404 hors de l'origine `BUSINESS_URL` et sans `X-DevHub-Client:
business` ; CORS fermé ; tentatives de connexion limitées.
- Une entreprise ne voit que ses offres et ses candidatures ; suspendue, ses sessions sont
  fermées et ses offres disparaissent.

## Lancer en local

```bash
# .env : BUSINESS_URL=http://localhost:5399
pnpm --filter @devhub/business dev   # http://localhost:5399
```

## Production

Caddy sert l'application sur `BUSINESS_ADDRESS` et ne relaie vers l'API que
`/api/v1/business/*`. Côté API : `BUSINESS_URL=https://business.<domaine>`.
