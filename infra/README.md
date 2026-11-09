# Infrastructure et serveurs de production

Propriétaire : **Emmanuel OKORIE** (rôle 4, DevOps et sécurité). Serveurs installés le **09/11/2026**.
Architecture générale : [docs/architecture/11-infrastructure-deploiement.md](../docs/architecture/11-infrastructure-deploiement.md).

Sommaire :

1. [Les serveurs](#1-les-serveurs)
2. [Architecture](#2-architecture)
3. [Accès et clés](#3-accès-et-clés)
4. [Sécurité en place](#4-sécurité-en-place)
5. [Base de données](#5-base-de-données)
6. [Sauvegardes et restauration](#6-sauvegardes-et-restauration)
7. [Déploiement automatique](#7-déploiement-automatique)
8. [Mise en ligne : ce qui reste à faire, dans l'ordre](#8-mise-en-ligne--ce-qui-reste-à-faire-dans-lordre)
9. [Exploitation courante et dépannage](#9-exploitation-courante-et-dépannage)
10. [Fichiers de ce dossier](#10-fichiers-de-ce-dossier)

---

## 1. Les serveurs

Deux VPS Systalink achetés le 09/11/2026 (plan **DEV-1xCPU-2GB** : 1 cœur, 2 Go de mémoire, 30 Go de
disque, Ubuntu 24.04). La console Systalink les appelle tous les deux « server-test » et ne permet pas de
les renommer : on les reconnaît à leur **IP** et à leur **ID de service**. Le nom réel de la machine
(`hostname`) a été changé sur le serveur.

| Nom (machine) | Rôle                                  | IP publique     | IP privée  | ID de service Systalink                |
| ------------- | ------------------------------------- | --------------- | ---------- | -------------------------------------- |
| `devhub-app`  | Caddy (HTTPS), API, worker            | 213.163.192.66  | 10.10.5.66 | `00140825-d42f-4b61-8579-1d18a990cdbb` |
| `devhub-data` | PostgreSQL 16, copies des sauvegardes | 213.163.201.178 | 10.10.3.62 | `002226fa-99ce-4d50-b37f-e7f270ac9ff1` |

**Où sont-ils vraiment ?** Les deux IP appartiennent à **UpCloud, Singapour** (AS202053, `sg-sin1`) :
Systalink revend des serveurs UpCloud. Ils ne sont donc pas à Dakar, contrairement à ce qu'annonce
systalink.com pour son centre de données. À demander à Systalink (cadev@systalink.com) : peut-on avoir
la région de Dakar ? Sinon, ne pas dire « hébergé à Dakar » dans le pitch.

**Le troisième serveur, `vps-cadev-044`**, acheté avec le code promo CADEV (c'est lui qui valide la
recevabilité, étape « Produit Systalink actif » = Fait), n'apparaît pas dans cette console : ses accès
sont à demander au support Systalink. La clé `privatekey_153621820.pem` (téléchargée le 09/11 à 15 h 36,
juste avant cet achat) n'ouvre aucun des deux serveurs ci-dessus : c'est très probablement la sienne.
Quand on l'aura, il pourra devenir le serveur d'application ou une préproduction (lancer `socle.sh`
puis `role-app.sh`, voir §9).

## 2. Architecture

```
            Internet (80, 443)
                   │
        ┌──────────▼───────────┐   réseau privé 10.10.x.x    ┌──────────────────────┐
        │ devhub-app           │  PostgreSQL en TLS vérifié  │ devhub-data          │
        │ Docker : Caddy, API, ├────────────────────────────►│ PostgreSQL 16        │
        │ worker               │  sauvegardes (rsync, écriture│ /srv/backups/devhub  │
        │ /srv/devhub          ├────────────────────────────►│ (30 jours)           │
        └──────────────────────┘   seule)                    └──────────────────────┘
```

Pourquoi deux serveurs et pas un : avec 2 Go chacun, API + worker + PostgreSQL sur une seule machine
seraient à l'étroit. Séparés, chacun a sa mémoire ; un plantage ou un déploiement raté de l'application
ne touche pas la base ; et chaque sauvegarde existe sur deux machines.

## 3. Accès et clés

On entre toujours avec le compte **`devops`** (sudo sans mot de passe). **Root ne peut plus se connecter
en SSH**, et aucun mot de passe n'est accepté (la console Systalink n'affiche d'ailleurs aucun identifiant).

```bash
ssh -i ~/.ssh/systalink/devhub-admin devops@213.163.192.66   # devhub-app
ssh -i ~/.ssh/systalink/devhub-admin devops@213.163.201.178  # devhub-data
```

Les clés `.pem` téléchargées depuis la console Systalink marchent aussi pour `devops` (sous Windows,
elles sont dans `Musique`). Clés, sur le poste de Sylvio, dans `~/.ssh/systalink/` (droits 600) :

| Fichier                                                | Sert à                                                                           |
| ------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `devhub-admin`                                         | Entrer en `devops` sur les deux serveurs                                         |
| `privatekey_225427783.pem`, `privatekey_225541343.pem` | Clés Systalink, entrent aussi en `devops` sur les deux                           |
| `privatekey_153621820.pem`                             | Probablement `vps-cadev-044` (pas encore d'accès)                                |
| `devhub-ci-deploy`                                     | Clé de la CI (secret `VPS_SSH_KEY`) : ne peut que lancer `deploy <sha>`          |
| `devhub-app.known_hosts`                               | Empreinte de devhub-app (secret `VPS_KNOWN_HOSTS`)                               |
| `devhub-backup`                                        | Clé de copie des sauvegardes (déjà installée sur devhub-app)                     |
| `devhub-backup-key`                                    | **Clé de chiffrement des sauvegardes** : sans elle, aucune restauration possible |
| `devhub-pg-ca.crt`                                     | Autorité TLS privée de la base (publique, rien de secret)                        |

**À faire une fois** : ranger `devhub-admin` et `devhub-backup-key` dans un gestionnaire de mots de
passe de l'équipe. Pour donner l'accès à un membre (Emmanuel…), ajouter sa clé publique à
`/home/devops/.ssh/authorized_keys` sur les deux serveurs ; ne jamais partager une clé privée.

Comptes sur les serveurs :

| Serveur       | Compte          | Peut faire                                                                                                                 |
| ------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------- |
| les deux      | `devops`        | Administration (sudo)                                                                                                      |
| `devhub-app`  | `deploy`        | Propriétaire de `/srv/devhub`, lance Docker ; en SSH, **seulement** `deploy <sha> <acteur>`                                |
| `devhub-data` | `devhub-backup` | En SSH, seulement **déposer** des fichiers dans `/srv/backups/devhub` (ni lire ni effacer), et seulement depuis 10.10.5.66 |

## 4. Sécurité en place

Tout est installé par les scripts de `scripts/serveurs/` (rejouables sans danger) et a été vérifié le
09/11/2026, y compris après un redémarrage des deux machines.

- **SSH** : clés seulement, root fermé, `AllowUsers` limité aux comptes du rôle, 3 essais par connexion.
  La clé de gestion de Systalink reste dans `/root/.ssh/authorized_keys` (rien n'a été supprimé) ;
  pour rouvrir root : effacer `/etc/ssh/sshd_config.d/11-root.conf` puis `sudo systemctl reload ssh`.
- **fail2ban** : 5 échecs SSH en 10 minutes = 1 heure de bannissement.
- **Pare-feu (ufw)**, tout est fermé en entrée sauf :
  - devhub-app : 22, 80, 443 (TCP et UDP pour HTTP/3) ;
  - devhub-data : 22, et 5432 **seulement depuis 10.10.5.66** (vérifié : 5432 est fermé depuis Internet).
- **Le réseau privé n'est pas considéré comme sûr** : chez UpCloud, il peut être partagé avec d'autres
  clients de Systalink. D'où le filtrage par IP, le mot de passe fort et le **TLS vérifié** (certificat
  signé par notre autorité, nom contrôlé : `sslmode=verify-full`).
- **CI** : la clé SSH de la CI est enfermée dans une commande forcée (`/usr/local/bin/devhub-deploy-gate`) :
  pas de shell, pas de tunnel, pas d'autre commande (tout vérifié). L'empreinte du serveur est contrôlée
  (`VPS_KNOWN_HOSTS`). Le jeton qui tire les images est le `GITHUB_TOKEN` du job, passé par l'entrée
  standard et jamais écrit sur le disque : **aucun jeton GitHub durable sur le serveur**.
- **Docker** : `no-new-privileges`, journaux limités (10 Mo × 5), conteneurs relancés au redémarrage.
- **Mises à jour de sécurité** automatiques chaque nuit (`unattended-upgrades`, sans redémarrage auto).
- **Mémoire** : 2 Go de swap sur chaque serveur (`vm.swappiness = 10`).
- **Secrets** : `/srv/devhub/.env` (600, `deploy`) ; `SESSION_SECRET`, `TOKEN_ENCRYPTION_KEY` et le
  mot de passe de la base ont été générés sur les serveurs et ne sont jamais passés par un écran.

## 5. Base de données

- PostgreSQL 16 (paquet Ubuntu) sur devhub-data, base `devhub`, rôle `devhub`, extensions `citext` et
  `pgcrypto` déjà créées. Réglages pour 2 Go : `/etc/postgresql/16/main/conf.d/devhub.conf`.
- Accès : `hostssl devhub devhub 10.10.5.66/32 scram-sha-256` (dans `pg_hba.conf`), rien d'autre.
- URL utilisée par l'application (dans `/srv/devhub/.env`, entre guillemets à cause du `&`) :
  `postgresql://devhub:<mot de passe>@10.10.3.62:5432/devhub?sslmode=verify-full&sslrootcert=/srv/devhub/pg-ca.crt`.
  Testée avec `psql`, avec `pg` (l'API) et avec Prisma (migrations) : connexion en **TLS 1.3**.
- Mot de passe : `/root/devhub-db-password` sur devhub-data. Autorité TLS : `/root/pg-ca/` (la clé de
  l'autorité ne quitte pas devhub-data ; certificat valable 10 ans).
- Les migrations sont appliquées par `deploy.sh` au premier déploiement (`prisma migrate deploy`).

Ouvrir une console SQL :

```bash
ssh -i ~/.ssh/systalink/devhub-admin devops@213.163.201.178 'sudo -u postgres psql devhub'
```

## 6. Sauvegardes et restauration

- **Chaque nuit à 02:30 UTC**, `scripts/backup.sh` (cron de `deploy` sur devhub-app) : `pg_dump` →
  chiffrement AES-256 (`/srv/devhub/.backup-key`) → gardé 7 jours dans `/srv/devhub/backups` →
  **copié sur devhub-data** (`/srv/backups/devhub`, 30 jours). Journal : `/srv/devhub/backups/backup.log`.
- `status.json` indique la date, le fichier et si la copie a réussi (`replicated`) ; le worker le lit
  pour la page `/systalink` et la Supervision de l'administration.
- Testé le 09/11/2026 : sauvegarde, copie, puis déchiffrement et lecture du contenu (`pg_restore -l`).

Lancer une sauvegarde à la main :

```bash
ssh -i ~/.ssh/systalink/devhub-admin devops@213.163.192.66 'sudo -u deploy /srv/devhub/infra/scripts/backup.sh'
```

Restaurer (toujours d'abord dans une base **de test**, jamais directement la production) :

```bash
# sur devhub-app, en deploy ; le fichier peut venir de /srv/devhub/backups ou de devhub-data
/srv/devhub/infra/scripts/restore.sh /srv/devhub/backups/devhub-<date>.dump.enc "<url-de-la-base-cible>"
```

Si devhub-app est perdu : les copies sont sur devhub-data et la clé de chiffrement est dans
`~/.ssh/systalink/devhub-backup-key` (et dans le gestionnaire de mots de passe).

## 7. Déploiement automatique

À chaque push sur `main` (quand `DEPLOY_ENABLED=true`), la CI (`.github/workflows/ci.yml`) :

1. teste, puis construit les images `api` et `web` sur ghcr.io, étiquetées avec le SHA du commit ;
2. se connecte en SSH à `deploy@213.163.192.66` et envoie `deploy <sha> <acteur>` ;
3. sur le serveur, `devhub-deploy-gate` vérifie la commande, se connecte à ghcr.io avec le jeton du job,
   puis lance `scripts/deploy.sh <sha>` : `infra/` au même commit, images, migrations, redémarrage,
   attente de `/readyz`, test de l'URL publique, **retour automatique à la version précédente** en cas
   d'échec.

Secrets du dépôt (Settings → Secrets and variables → Actions, au niveau du dépôt) :

| Nom               | Valeur                                               |
| ----------------- | ---------------------------------------------------- |
| `VPS_HOST`        | `213.163.192.66`                                     |
| `VPS_SSH_KEY`     | contenu de `~/.ssh/systalink/devhub-ci-deploy`       |
| `VPS_KNOWN_HOSTS` | contenu de `~/.ssh/systalink/devhub-app.known_hosts` |

Variable du dépôt : `DEPLOY_ENABLED=true` (**seulement quand le domaine est prêt**, sinon le test de
l'URL publique échoue).

## 8. Mise en ligne : ce qui reste à faire, dans l'ordre

Fait le 09/11/2026 : les deux serveurs sont installés, sécurisés, redémarrés et vérifiés ; la base est
prête ; les sauvegardes tournent ; `/srv/devhub/.env` existe avec les secrets générés.

1. **Clé de lecture du dépôt** (le dépôt est privé ; le serveur doit pouvoir lire `infra/`). Depuis la
   racine du dépôt, sur le poste de Sylvio :

   ```bash
   ssh -i ~/.ssh/systalink/devhub-admin devops@213.163.192.66 'sudo cat /home/deploy/.ssh/github.pub' > /tmp/devhub-app.pub
   gh repo deploy-key add /tmp/devhub-app.pub --title "devhub-app (lecture seule)"
   ```

   Puis cloner sur le serveur :

   ```bash
   ssh -i ~/.ssh/systalink/devhub-admin devops@213.163.192.66 'sudo -u deploy sh -c "cd /srv/devhub && git init -q && git remote add origin git@github.com:sx1vio/CADEV-saiyens.git && git fetch -q origin main && git checkout -q -f main"'
   ```

2. **Secrets GitHub de la CI** (§7) :

   ```bash
   gh secret set VPS_HOST --body 213.163.192.66
   gh secret set VPS_SSH_KEY < ~/.ssh/systalink/devhub-ci-deploy
   gh secret set VPS_KNOWN_HOSTS < ~/.ssh/systalink/devhub-app.known_hosts
   ```

3. **Nom de domaine** (acheté sur la console Systalink, −40 %) : créer les enregistrements DNS `A` vers
   `213.163.192.66` pour `<domaine>`, `admin.<domaine>` et `business.<domaine>`.
4. **Remplir `/srv/devhub/.env`** : remplacer chaque `A_REMPLIR` (`SITE_ADDRESS`, `APP_URL`, `API_URL`,
   `MAIL_FROM`) et décommenter `ADMIN_ADDRESS`/`ADMIN_URL` et `BUSINESS_ADDRESS`/`BUSINESS_URL`.

   ```bash
   ssh -t -i ~/.ssh/systalink/devhub-admin devops@213.163.192.66 'sudo -u deploy nano /srv/devhub/.env'
   ```

5. **Application OAuth GitHub de production** (callback sur le domaine) → `GITHUB_CLIENT_ID` et
   `GITHUB_CLIENT_SECRET` dans `.env`. Facultatif : SMTP pro Systalink, `PAGESPEED_API_KEY`,
   `PREFLIGHT_GITHUB_TOKEN`, `LLM_API_KEY`.
6. **Activer le déploiement** : `gh variable set DEPLOY_ENABLED --body true`, puis un push sur `main`
   (ou relancer la CI). Suivre le job « déploiement Systalink ».
7. **Compte administrateur** de production (procédure dans `apps/admin/README.md`, section Production),
   puis onglet **Supervision** : tout doit être vert.
8. **Vérifier le badge Systalink** : `.env` contient déjà `SYSTALINK_IP_RANGES` avec les plages réelles
   des VPS (213.163.192.0/22 et 213.163.200.0/22). Lancer un pré-vol sur l'URL publique.
9. **Tester sur un vrai téléphone**, hors du réseau de l'équipe.

## 9. Exploitation courante et dépannage

```bash
# État des conteneurs et journaux (devhub-app)
ssh -i ~/.ssh/systalink/devhub-admin devops@213.163.192.66
sudo -u deploy docker compose -f /srv/devhub/infra/docker-compose.yml --env-file /srv/devhub/.env ps
sudo -u deploy docker compose -f /srv/devhub/infra/docker-compose.yml --env-file /srv/devhub/.env logs -f --tail 100 api

# Redéployer une version précise (sans passer par la CI) : TAG = SHA d'un commit déjà construit
sudo -u deploy /srv/devhub/infra/scripts/deploy.sh <sha>

# Base (devhub-data)
sudo systemctl status postgresql
sudo tail -f /var/log/postgresql/postgresql-16-main.log

# Sécurité
sudo ufw status verbose
sudo fail2ban-client status sshd
```

- **Installer un nouveau serveur** (ex. `vps-cadev-044`) : copier `scripts/serveurs/` dessus, puis en
  root `socle.sh <nom> <clés-admin.pub>`, `role-app.sh` ou `role-data.sh`, et enfin `fermer-root.sh`
  **après** avoir vérifié `ssh devops@<ip> sudo true`. Penser à ajouter sa clé de déploiement GitHub,
  et, si c'est un nouveau serveur app, sa ligne `pg_hba.conf` et sa règle `ufw` sur devhub-data.
- **L'IP privée change** (peu probable) : mettre à jour `pg_hba.conf` et `ufw` sur devhub-data, le
  certificat (`role-data.sh` le refait tout seul) et `DATABASE_URL`.
- **Serveur injoignable en SSH** : la console Systalink (« Connexion à la console ») donne un écran
  direct ; sans mot de passe affiché, passer par le support Systalink.

## 10. Fichiers de ce dossier

| Fichier                           | Rôle                                                                      |
| --------------------------------- | ------------------------------------------------------------------------- |
| `docker-compose.dev.yml`          | PostgreSQL et Mailpit pour le développement local                         |
| `docker-compose.yml`              | Production sur devhub-app (Caddy, API, worker ; base sur devhub-data)     |
| `Caddyfile`                       | TLS, en-têtes de sécurité, routage, front statique                        |
| `Dockerfile.api`                  | Image de l'API et du worker                                               |
| `Dockerfile.web`                  | Image Caddy avec le build des fronts                                      |
| `scripts/deploy.sh`               | Migrations, redémarrage, smoke test, retour arrière automatique           |
| `scripts/backup.sh`               | Sauvegarde chiffrée quotidienne, copie sur devhub-data, fichier de statut |
| `scripts/restore.sh`              | Restauration dans une base cible + comptage des lignes                    |
| `scripts/serveurs/socle.sh`       | Socle commun : nom, mises à jour, swap, `devops`, SSH, fail2ban, pare-feu |
| `scripts/serveurs/role-app.sh`    | Docker, compte `deploy` et sa commande forcée, sauvegardes, ports web     |
| `scripts/serveurs/role-data.sh`   | PostgreSQL 16 en TLS, accès limité au serveur app, dépôt des sauvegardes  |
| `scripts/serveurs/fermer-root.sh` | Ferme root en SSH et limite SSH aux comptes du rôle                       |
