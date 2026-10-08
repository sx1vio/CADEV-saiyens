# Guide de démarrage

Ce guide permet à un nouvel arrivant d'installer, configurer, lancer et tester DevHub Africa sur son poste **en le suivant seul**, du clone jusqu'à une session connectée sur l'API.

> Vérifié pas à pas le **8 octobre 2026** sur `main` (`97ab8cd`), sous WSL2 (Ubuntu) : installation, migrations, 53 tests verts, build, démarrage de l'API, connexion factice et `GET /me`. Si une étape ne marche plus, corrige ce guide dans ta PR ou signale-le dans le [registre des anomalies](../suivi/anomalies.md).

## Sommaire

1. [Ce qui tourne aujourd'hui](#1-ce-qui-tourne-aujourdhui)
2. [Prérequis](#2-prérequis)
3. [Installation](#3-installation)
4. [Configuration (`.env`)](#4-configuration-env)
5. [Base de données](#5-base-de-données)
6. [Lancer en développement](#6-lancer-en-développement)
7. [Se connecter sans application GitHub](#7-se-connecter-sans-application-github)
8. [Tests et vérifications avant une PR](#8-tests-et-vérifications-avant-une-pr)
9. [Build et déploiement](#9-build-et-déploiement)
10. [Commandes utiles](#10-commandes-utiles)
11. [Problèmes fréquents](#11-problèmes-fréquents)

## 1. Ce qui tourne aujourd'hui

| Partie                                | État sur `main`                                      | Lancement                                      |
| ------------------------------------- | ---------------------------------------------------- | ---------------------------------------------- |
| API NestJS (`apps/api`)               | Fonctionne : santé, OpenAPI, connexion GitHub, `/me` | `pnpm --filter @devhub/api dev`                |
| Worker pg-boss                        | Démarre, pas encore de job métier                    | `pnpm --filter @devhub/api dev:worker`         |
| Front PWA (`apps/web`)                | **Pas encore sur `main`** (PR #97 en revue)          | Après fusion : `pnpm --filter @devhub/web dev` |
| `packages/core`, `packages/contracts` | Pas encore initialisés (issue #5)                    | —                                              |

Pour l'état complet du projet, voir [`context.md`](../../context.md).

## 2. Prérequis

| Outil            | Version                              | Vérifier                 | Installer                                                                 |
| ---------------- | ------------------------------------ | ------------------------ | ------------------------------------------------------------------------- |
| Git              | récent                               | `git --version`          | gestionnaire de paquets de l'OS                                           |
| Node.js          | **24** (fichier `.nvmrc`)            | `node -v`                | `nvm install 24 && nvm use` (depuis la racine du dépôt)                   |
| pnpm             | **10.34.6** (champ `packageManager`) | `pnpm -v`                | `corepack enable` (corepack télécharge la bonne version au premier appel) |
| Docker + Compose | Docker 24 ou plus                    | `docker compose version` | Docker Desktop (Windows, macOS) ou Docker Engine (Linux)                  |
| GitHub CLI       | facultatif, conseillé pour les PR    | `gh auth status`         | <https://cli.github.com>                                                  |
| OpenSSL          | pour générer les secrets             | `openssl version`        | présent sur Linux, macOS et WSL                                           |

Systèmes : Linux, macOS, ou Windows **avec WSL2**. Sous Windows, travailler dans WSL, et cloner le dépôt **dans le système de fichiers Linux** (`~/...`), pas sous `/mnt/c/...` (voir [problèmes fréquents](#11-problèmes-fréquents)).

> Node 22 permet aujourd'hui d'installer et de tester, mais ce n'est pas la version de référence ([BUG-007](../suivi/anomalies.md#bug-007)). Utilise Node 24 pour éviter les écarts avec la CI.

## 3. Installation

```bash
git clone git@github.com:sx1vio/CADEV-saiyens.git
cd CADEV-saiyens
nvm use                     # Node 24, lu dans .nvmrc
corepack enable             # active pnpm à la version du projet
pnpm install                # environ 1 minute ; installe aussi les hooks Git (Husky)
```

`pnpm install` affiche un encadré « Ignored build scripts » (Prisma, SWC, esbuild) : c'est attendu, rien à faire, le projet fonctionne sans.

Husky, lint-staged et commitlint sont installés, mais **aucun hook n'est encore commité** dans `.husky/` ([BUG-009](../suivi/anomalies.md#bug-009)) : rien ne vérifie tes messages de commit ni ne formate tes fichiers automatiquement. En attendant, vérifie toi-même :

```bash
pnpm format                                       # formate le dépôt avec Prettier
echo "docs(api): fix typo" | pnpm exec commitlint # vérifie un message de commit
```

## 4. Configuration (`.env`)

Toute la configuration passe par un fichier `.env` **à la racine du dépôt**, lu par l'API et par Prisma. Il est ignoré par Git : **ne jamais le commiter**.

```bash
cp .env.example .env
```

Puis remplir au minimum :

| Variable               | Valeur de développement                            | Comment l'obtenir                      |
| ---------------------- | -------------------------------------------------- | -------------------------------------- |
| `DATABASE_URL`         | `postgresql://devhub:devhub@localhost:5432/devhub` | déjà la bonne valeur pour Docker       |
| `SESSION_SECRET`       | au moins 32 caractères                             | `openssl rand -base64 48`              |
| `TOKEN_ENCRYPTION_KEY` | 32 octets en base64                                | `openssl rand -base64 32`              |
| `AUTH_FAKE_PROVIDER`   | `true`                                             | connexion sans application GitHub (§7) |

Commande pour générer les deux secrets d'un coup :

```bash
sed -i "s#^SESSION_SECRET=.*#SESSION_SECRET=$(openssl rand -base64 48)#; \
        s#^TOKEN_ENCRYPTION_KEY=.*#TOKEN_ENCRYPTION_KEY=$(openssl rand -base64 32)#; \
        s#^AUTH_FAKE_PROVIDER=.*#AUTH_FAKE_PROVIDER=true#" .env
```

L'API **refuse de démarrer** si une variable obligatoire manque ou est invalide, avec un message `Configuration invalide : …` qui nomme la variable. Règles vérifiées au démarrage (`apps/api/src/infrastructure/config/env.ts`) :

| Variable                                   | Règle                                              |
| ------------------------------------------ | -------------------------------------------------- |
| `APP_URL`, `API_URL`, `DATABASE_URL`       | URL valide, obligatoire                            |
| `SESSION_SECRET`                           | 32 caractères minimum                              |
| `TOKEN_ENCRYPTION_KEY`                     | exactement 32 octets une fois décodée du base64    |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | obligatoires **sauf** si `AUTH_FAKE_PROVIDER=true` |
| `AUTH_FAKE_PROVIDER`                       | `true` interdit quand `NODE_ENV=production`        |

Les autres variables (`LLM_*`, `SMTP_*`, `S3_*`, Telegram, VAPID) sont déjà prévues dans `.env.example` pour les modules à venir ; elles peuvent rester vides. Avec `LLM_API_KEY` vide, l'IA répondra par un adaptateur factice déterministe.

**Vraie connexion GitHub** (facultatif en local) : créer une OAuth App sur GitHub (_Settings → Developer settings → OAuth Apps_), avec l'URL de rappel `http://localhost:3000/api/v1/auth/github/callback`, puis renseigner `GITHUB_CLIENT_ID` et `GITHUB_CLIENT_SECRET` et passer `AUTH_FAKE_PROVIDER=false`. Les identifiants de production sont dans les secrets GitHub Actions, jamais dans le chat.

## 5. Base de données

PostgreSQL 16 et Mailpit (capture des e-mails) tournent dans Docker :

```bash
docker compose -f infra/docker-compose.dev.yml up -d
docker compose -f infra/docker-compose.dev.yml ps      # postgres doit être « healthy »
```

| Service    | Port   | Usage                                                      |
| ---------- | ------ | ---------------------------------------------------------- |
| PostgreSQL | `5432` | utilisateur `devhub`, mot de passe `devhub`, base `devhub` |
| Mailpit    | `8025` | interface web <http://localhost:8025>                      |
| Mailpit    | `1025` | SMTP local (`SMTP_HOST=localhost`, `SMTP_PORT=1025`)       |

Puis appliquer les migrations et charger les données de référence :

```bash
pnpm --filter @devhub/api exec prisma migrate deploy   # applique les migrations existantes
pnpm db:seed                                           # 52 étiquettes de référence (idempotent)
```

| Commande                                                 | Quand l'utiliser                                                                 |
| -------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `prisma migrate deploy`                                  | Rattraper `main` : applique les migrations sans en créer                         |
| `pnpm db:migrate` (`prisma migrate dev`)                 | Tu as modifié `schema.prisma` : crée une nouvelle migration à relire et commiter |
| `pnpm --filter @devhub/api exec prisma studio`           | Explorer les données dans le navigateur                                          |
| `docker compose -f infra/docker-compose.dev.yml down -v` | Repartir d'une base vide (**efface toutes les données locales**)                 |

Règles sur les migrations : [apps/api/README.md](../../apps/api/README.md#règles-pour-les-migrations). Modèle de données : [05-modele-donnees.md](../architecture/05-modele-donnees.md).

## 6. Lancer en développement

Dans deux terminaux, depuis la racine :

```bash
pnpm --filter @devhub/api dev           # API sur http://localhost:3000, rechargement à chaud
pnpm --filter @devhub/api dev:worker    # worker pg-boss (tâches de fond)
```

`pnpm dev` (Turborepo) lance le script `dev` de chaque application : aujourd'hui l'API seule, et le front une fois `apps/web` fusionné. Le worker se lance toujours à part.

| URL                                    | Attendu                                             |
| -------------------------------------- | --------------------------------------------------- |
| <http://localhost:3000/api/v1/healthz> | `{"status":"ok"}`                                   |
| <http://localhost:3000/readyz>         | la base répond                                      |
| <http://localhost:3000/api/docs>       | documentation OpenAPI interactive (hors production) |

Toutes les routes de l'API sont préfixées par `/api/v1`. Contrat complet : [06-api.md](../architecture/06-api.md).

## 7. Se connecter sans application GitHub

Avec `AUTH_FAKE_PROVIDER=true`, ouvrir dans le navigateur :

```text
http://localhost:3000/api/v1/auth/github?login=awa-dev
```

Le faux fournisseur crée (ou retrouve) le compte `awa-dev`, ouvre une session par cookie HttpOnly et redirige vers `APP_URL`. Ensuite, <http://localhost:3000/api/v1/me> renvoie le profil.

En ligne de commande :

```bash
curl -s -L -c jar -b jar -o /dev/null "localhost:3000/api/v1/auth/github?login=awa-dev"
curl -s -b jar localhost:3000/api/v1/me      # {"id":"…","handle":"awa-dev",…}
rm jar
```

Les requêtes qui modifient des données (par exemple `POST /api/v1/auth/logout`) exigent en plus les en-têtes `Origin: http://localhost:5173` et `X-DevHub-Client: web` (protection CSRF, [10-securite.md](../architecture/10-securite.md)).

## 8. Tests et vérifications avant une PR

La CI exécute exactement ces commandes ; lance-les en local avant de pousser :

```bash
pnpm format:check   # Prettier (corriger avec : pnpm format)
pnpm lint           # ne vérifie encore rien, voir BUG-001
pnpm typecheck      # TypeScript
pnpm test           # Vitest : unitaires + HTTP de bout en bout (base requise)
pnpm build          # prisma generate + compilation
```

Les tests de bout en bout de l'API (`apps/api/test/*.spec.ts`) écrivent dans la base désignée par `DATABASE_URL`. Pour ne pas mélanger avec tes données de développement, utilise une base dédiée :

```bash
docker compose -f infra/docker-compose.dev.yml exec postgres createdb -U devhub devhub_test
export DATABASE_URL=postgresql://devhub:devhub@localhost:5432/devhub_test
pnpm --filter @devhub/api exec prisma migrate deploy
pnpm test
```

Résultat attendu au 8 octobre : `Test Files 9 passed (9)`, `Tests 53 passed (53)`.

Ensuite, suivre le [workflow Git](../equipe/workflow-git.md) (branche, commits, PR) et la [définition de « terminé »](../equipe/definition-of-done.md).

## 9. Build et déploiement

| Étape                | Commande ou mécanisme                                                                                                                                                                           |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build local de l'API | `pnpm build`, puis `node apps/api/dist/main.js` (API) et `node apps/api/dist/worker.js` (worker)                                                                                                |
| Images Docker        | `infra/Dockerfile.api`, `infra/Dockerfile.web`                                                                                                                                                  |
| Déploiement          | Automatique à chaque fusion sur `main` par la CI, **si** la variable de dépôt `DEPLOY_ENABLED=true` ; script `infra/scripts/deploy.sh` (migrations, redémarrage, test de fumée, retour arrière) |
| Production           | VPS Systalink, Docker Compose + Caddy : [infra/README.md](../../infra/README.md), [11-infrastructure-deploiement.md](../architecture/11-infrastructure-deploiement.md)                          |

Le déploiement et les secrets de production relèvent d'Emmanuel (rôle 4), suppléant Caleb.

## 10. Commandes utiles

| Besoin                                  | Commande                                                                                                       |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Lancer une commande dans un seul paquet | `pnpm --filter @devhub/api <script>`                                                                           |
| Formater tout le dépôt                  | `pnpm format`                                                                                                  |
| Régénérer le client Prisma              | `pnpm --filter @devhub/api prisma:generate`                                                                    |
| Vérifier l'absence de dérive du schéma  | `pnpm --filter @devhub/api exec prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma` |
| Journaux de PostgreSQL                  | `docker compose -f infra/docker-compose.dev.yml logs -f postgres`                                              |
| Arrêter les services locaux             | `docker compose -f infra/docker-compose.dev.yml down`                                                          |
| Voir les PR ouvertes                    | `gh pr list`                                                                                                   |

## 11. Problèmes fréquents

| Symptôme                                                                | Cause                                                            | Solution                                                                                                                                          |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Configuration invalide : - SESSION_SECRET: …` au démarrage             | `.env` absent ou incomplet                                       | Reprendre le §4 ; le `.env` doit être à la **racine** du dépôt                                                                                    |
| `GITHUB_CLIENT_ID et GITHUB_CLIENT_SECRET sont obligatoires…`           | Ni identifiants OAuth ni fournisseur factice                     | `AUTH_FAKE_PROVIDER=true` en local                                                                                                                |
| `docker compose up` : `port is already allocated` sur 5432 ou 8025      | Un autre PostgreSQL ou Mailpit tourne déjà sur le poste          | Arrêter l'autre service, ou changer le port publié (par exemple `55432:5432`) dans une copie locale du fichier Compose, et adapter `DATABASE_URL` |
| `EACCES … rename` pendant `pnpm install`, installation très lente (WSL) | Dépôt cloné sous `/mnt/c/...`                                    | Recloner dans le système de fichiers Linux (`~/dev/CADEV-saiyens`)                                                                                |
| `Can't reach database server at localhost:5432`                         | Conteneur arrêté ou pas encore prêt                              | `docker compose -f infra/docker-compose.dev.yml ps`, attendre « healthy »                                                                         |
| Tests e2e en échec sur des tables manquantes                            | Migrations non appliquées sur la base de test                    | `prisma migrate deploy` avec le bon `DATABASE_URL` (§8)                                                                                           |
| `pnpm exec commitlint` refuse ton message                               | Type ou portée hors liste                                        | Portées autorisées : `commitlint.config.mjs` et [workflow Git](../equipe/workflow-git.md#commits--conventional-commits)                           |
| Fichier `AGENTS.md` non suivi apparu à la racine                        | Créé par `turbo` quand un agent IA lance une commande            | Ne pas le commiter ([BUG-008](../suivi/anomalies.md#bug-008))                                                                                     |
| `GET /me` renvoie `401 auth.required` juste après la connexion          | Cookie de session non conservé (client HTTP sans « cookie jar ») | Navigateur, ou `curl -L -c jar -b jar` comme au §7                                                                                                |
