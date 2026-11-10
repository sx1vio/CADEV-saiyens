# Espace d'administration DevHub (`@devhub/admin`)

Application à part, servie sur **sa propre adresse** (sous-domaine en production, port 5299 en local).
Le site public n'en contient aucune trace : pas de page `/admin`, pas d'entrée de menu, et l'API répond
**404** à toutes les routes `/api/v1/admin/*` sans session d'administration.

## Ce qu'on y fait

- **Vue d'ensemble** : chiffres réels de la plateforme (membres, questions, salles, signalements, offres).
  Bloc « À traiter » : signalements ouverts, entreprises à vérifier, worker arrêté, tâches en échec,
  réglage dangereux, erreurs serveur récentes, chacun avec un lien vers l'onglet concerné.
- **Supervision** : santé technique actualisée toutes les 15 s. API (démarrage, version déployée
  `APP_RELEASE`, mémoire, retard de la boucle d'événements), trafic HTTP sur 5 min et 1 h (volumes,
  erreurs, latences médiane et p95, routes les plus lentes, 30 dernières erreurs 500), base de
  données (latence, taille, connexions, migrations, tables les plus remplies), worker pg-boss
  (vivant ou non, files, réussites et échecs sur 24 h, derniers échecs), sondes Systalink, réglages
  de production (présents ou non, jamais leur valeur ; connexion de test active = danger) et accès
  (sessions admin, connexions admin et membres actifs sur 24 h, comptes suspendus).
- **Activité** : courbes des 30 derniers jours (inscriptions, questions, réponses, publications,
  projets, candidatures), membres actifs, et fil de tout ce qui se passe (filtrable, actualisé en direct).
- **Utilisateurs** : recherche, filtres (nouveaux, suspendus, admins, démo, supprimés), Proof XP et
  activité de chaque compte ; suspendre (sessions fermées, reconnexion refusée), réactiver, marquer
  démo, supprimer (anonymisation, super-admin uniquement).
- **Contenus** : publications, commentaires, questions, réponses, projets et messages de projet ;
  chercher, masquer, rétablir sans attendre un signalement.
- **Signalements** : file des signalements (masquer, rétablir, rejeter) et journal de toutes les décisions.
- **Entreprises** : vérifier les entreprises du portail `apps/business` (valider, refuser, suspendre).
- **Offres d'emploi** : créer, modifier, publier, archiver ou supprimer une offre de l'équipe (lien vers
  l'annonce officielle obligatoire) ; retirer une offre d'entreprise.
- **Flux** : volumes collectés, derniers passages du worker et erreurs par source ; relance d'une collecte.
- **Annonces** : bandeau en haut du site, avec période, ton et lien.
- **Administrateurs** : rôles (super-admin, modérateur), ajout d’un administrateur avec mot de passe
  affiché une seule fois, retrait d’accès.

Toutes les actions qui modifient quelque chose sont inscrites au journal (`admin_actions`).

## Sécurité

| Protection      | Détail                                                                                       |
| --------------- | -------------------------------------------------------------------------------------------- |
| Connexion       | E-mail + mot de passe (16 caractères minimum, générés par la CLI), 10 échecs → 15 min bloqué |
| Comptes         | Créés **uniquement en ligne de commande** sur le serveur, jamais depuis le web               |
| Session séparée | Cookie `__Host-dh-adm` (HttpOnly, Secure, SameSite=Strict), 30 min d'inactivité, 8 h au plus |
| Invisible       | Toute requête sans session valide reçoit un 404, comme une route qui n'existe pas            |
| Origine         | Écritures acceptées seulement depuis `ADMIN_URL` avec `X-DevHub-Client: admin` ; pas de CORS |
| Réseau (option) | `ADMIN_ALLOWED_IPS` : plages CIDR autorisées (vide = toutes)                                 |
| Traçabilité     | Connexions et actions écrites dans le journal (`admin_actions`)                              |
| Révocation      | Retirer le droit ferme aussitôt toutes les sessions                                          |

## Créer un compte administrateur

```bash
# En local (depuis la racine du dépôt)
pnpm --filter @devhub/api admin create --email admin@exemple.com --name "Prénom Nom"

# En production, sur le VPS (dans /srv/devhub, avec le TAG déployé)
TAG=<sha> docker compose -f infra/docker-compose.yml --env-file /srv/devhub/.env \
  exec api node dist/modules/backoffice/cli.js create --email admin@exemple.com --name "Prénom Nom"
```

Ordre conseillé le jour du déploiement : créer le compte de Sylvio (super-admin), se connecter sur
l'administration, ouvrir **Supervision** et vérifier que tout est vert (connexion de test
désactivée, OAuth GitHub, SMTP, worker actif), puis inviter les autres membres depuis l'onglet
**Administrateurs**. Un mot de passe d'administrateur oublié se réinitialise par la CLI
(`reset-password`) : le lien « mot de passe oublié » du site ne touche jamais un compte
d'administration.

La connexion se fait par e-mail et mot de passe, sans double facteur (choix de l'équipe, 10/11/2026).
La commande affiche le mot de passe **une seule fois** (ou `--password` pour le choisir).
Autres commandes : `reset-password`, `revoke`, `list`.

## Lancer en local

```bash
# .env : ADMIN_URL=http://localhost:5299
pnpm --filter @devhub/admin dev   # http://localhost:5299 (l'API doit tourner sur le port 3000)
```

## Production

- Caddy sert l'application sur `ADMIN_ADDRESS` (ex. `admin.devhub.africa`) et ne relaie vers l'API que
  `/api/v1/admin/*` ; en-têtes `X-Robots-Tag: noindex`, CSP stricte, `Cache-Control: no-store`.
- Côté API : `ADMIN_URL=https://admin.devhub.africa` (doit être une origine distincte de `APP_URL`).
- Sans `ADMIN_ADDRESS`, le bloc Caddy écoute sur `127.0.0.1:8081` (non publié) ; sans `ADMIN_URL`,
  l'administration est entièrement désactivée.
