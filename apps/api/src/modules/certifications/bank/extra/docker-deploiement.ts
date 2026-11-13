import { q } from '../devhub-1';
import type { QuizQuestion } from '../types';

/** Questions supplémentaires de docker-deploiement (12/11/2026). */
export const EXTRA: QuizQuestion[] = [
  // 0 — Images et Dockerfile
  q(
    0,
    'Ce Dockerfile reconstruit les dépendances à chaque modification du code. Quelle correction appliquer ?',
    [
      'Ajouter --no-cache au build',
      'Copier package.json et package-lock.json, lancer npm ci, puis copier le reste du code',
      'Remplacer COPY par ADD',
      'Passer à l’image node:22 complète',
    ],
    1,
    'Une instruction modifiée invalide toutes les suivantes. Les manifestes de dépendances changent rarement : on les copie seuls avant le code pour garder npm ci en cache.',
    'FROM node:22-alpine\nWORKDIR /app\nCOPY . .\nRUN npm ci --omit=dev\nCMD ["node", "server.js"]',
  ),
  q(
    0,
    'Pourquoi écrire CMD ["node", "server.js"] plutôt que CMD node server.js ?',
    [
      'La forme JSON est plus rapide à construire',
      'La forme shell est interdite depuis Docker 20',
      'Node devient le PID 1 et reçoit SIGTERM, ce qui permet un arrêt propre',
      'La forme JSON active le cache',
    ],
    2,
    'La forme shell lance /bin/sh -c, qui ne relaie pas toujours les signaux : docker stop finit alors par un SIGKILL après le délai de grâce.',
  ),
  q(
    0,
    'Un développeur télécharge une archive de 300 Mo dans un RUN, puis la supprime dans le RUN suivant. Quel est l’effet sur la taille de l’image ?',
    [
      'Aucun gain : l’archive reste dans la couche du premier RUN',
      'L’image ne contient plus l’archive',
      'Docker fusionne automatiquement les deux couches',
      'L’image devient plus petite qu’avant le téléchargement',
    ],
    0,
    'Une couche ne peut pas alléger les précédentes. Il faut télécharger, utiliser et supprimer dans la même instruction RUN, ou passer par une construction multi-étapes.',
  ),
  q(
    0,
    'Quelle est la meilleure façon de fournir un jeton npm privé nécessaire seulement pendant la construction ?',
    [
      'ENV NPM_TOKEN=… dans le Dockerfile',
      'ARG NPM_TOKEN passé avec --build-arg',
      'Copier .npmrc puis le supprimer dans un RUN suivant',
      'Un secret de build monté avec RUN --mount=type=secret',
    ],
    3,
    'Le secret monté n’existe que pendant l’instruction et n’entre dans aucune couche. ENV, ARG et les fichiers copiés laissent des traces dans l’image ou son historique.',
  ),
  q(
    0,
    'Dans un Dockerfile multi-étapes sans option --target, quelle étape produit l’image finale ?',
    ['La première étape', 'La dernière étape', 'L’étape nommée final', 'L’étape la plus légère'],
    1,
    'Seule la dernière étape devient l’image ; on y copie avec COPY --from le strict nécessaire produit par les étapes précédentes.',
  ),

  // 1 — Conteneurs, volumes et réseau
  q(
    1,
    'Le conteneur tourne et le port est publié avec -p 8080:3000, mais curl localhost:8080 est refusé. Les journaux indiquent « listening on 127.0.0.1:3000 ». Quelle est la cause ?',
    [
      'L’application écoute sur la boucle locale du conteneur au lieu de 0.0.0.0',
      'Le pare-feu de l’hôte bloque le port 8080',
      'Il manque EXPOSE 3000 dans le Dockerfile',
      'Le conteneur doit tourner en root',
    ],
    0,
    'Le trafic publié arrive par l’interface réseau du conteneur. Une application liée à 127.0.0.1 ne reçoit rien de l’extérieur du conteneur.',
  ),
  q(
    1,
    'Un conteneur s’arrête avec le code de sortie 137. Quelle hypothèse vérifier en premier ?',
    [
      'Une erreur de syntaxe JavaScript',
      'Un port déjà utilisé',
      'Le processus a été tué par SIGKILL, souvent à cause d’un manque de mémoire',
      'Une image introuvable sur le registre',
    ],
    2,
    '137 = 128 + 9 (SIGKILL). docker inspect indique dans State.OOMKilled si le noyau a tué le processus faute de mémoire.',
  ),
  q(
    1,
    'Deux conteneurs lancés sur le réseau bridge par défaut n’arrivent pas à se joindre par leur nom. Quelle correction ?',
    [
      'Publier tous les ports avec -P',
      'Les placer sur un réseau créé avec docker network create',
      'Utiliser localhost dans les deux conteneurs',
      'Les lancer avec --rm',
    ],
    1,
    'Seuls les réseaux définis par l’utilisateur offrent la résolution DNS par nom de conteneur. Compose crée un tel réseau automatiquement.',
  ),
  q(
    1,
    'Quelle différence entre un volume nommé et un montage de dossier (bind mount) ?',
    [
      'Aucune, ce sont deux syntaxes du même mécanisme',
      'Le montage de dossier survit à docker volume prune, pas le volume',
      'Le volume nommé est stocké dans l’image',
      'Le volume nommé est géré par Docker ; le montage expose un chemin précis de l’hôte',
    ],
    3,
    'Le volume nommé convient aux données (base de données) ; le montage de dossier aux fichiers de configuration ou au code en développement.',
  ),
  q(
    1,
    'Pourquoi préférer un fichier monté (par exemple /run/secrets/db_password) à une variable d’environnement pour un mot de passe ?',
    [
      'Les variables d’environnement sont visibles avec docker inspect et fuient facilement dans les journaux',
      'Les variables d’environnement sont limitées à 8 caractères',
      'Un fichier monté est plus rapide à lire',
      'Docker chiffre automatiquement les variables d’environnement',
    ],
    0,
    'Un fichier en lecture seule, hors image et hors Git, limite les fuites. Beaucoup d’images officielles acceptent une variante _FILE, comme POSTGRES_PASSWORD_FILE.',
  ),

  // 2 — Docker Compose
  q(
    2,
    'L’API plante au premier démarrage car PostgreSQL n’accepte pas encore les connexions, malgré depends_on: [db]. Quelle correction ?',
    [
      'Ajouter restart: always à la base',
      'Ajouter un sleep 30 dans le CMD de l’API',
      'Un healthcheck pg_isready sur db et depends_on avec condition: service_healthy',
      'Publier le port 5432 de la base',
    ],
    2,
    'depends_on seul ne garantit que l’ordre de démarrage. La condition service_healthy attend que le healthcheck de la base soit au vert.',
  ),
  q(
    2,
    'Quelle commande arrête un projet Compose en supprimant aussi les volumes nommés, donc les données ?',
    ['docker compose stop', 'docker compose down -v', 'docker compose down', 'docker compose rm'],
    1,
    'down supprime conteneurs et réseau ; -v y ajoute les volumes déclarés. À ne jamais lancer machinalement en production.',
  ),
  q(
    2,
    'À quoi sert le fichier .env placé à côté de compose.yaml ?',
    [
      'À remplacer les ${VARIABLES} du fichier compose.yaml',
      'À être injecté automatiquement dans tous les conteneurs',
      'À configurer le démon Docker',
      'À stocker les journaux de Compose',
    ],
    0,
    'Il sert à l’interpolation. Pour passer des variables à un conteneur, on utilise environment ou env_file.',
  ),
  q(
    2,
    'Un service Adminer a profiles: [outils]. Comment le démarrer ?',
    [
      'docker compose up -d suffit',
      'docker compose run adminer --profile',
      'docker compose up -d --all',
      'docker compose --profile outils up -d',
    ],
    3,
    'Un service rattaché à un profil ne démarre que si ce profil est activé (option --profile ou variable COMPOSE_PROFILES).',
  ),
  q(
    2,
    'Que se passe-t-il si POSTGRES_PASSWORD est absent de l’environnement avec la syntaxe ${POSTGRES_PASSWORD:?requis} ?',
    [
      'Compose utilise une chaîne vide',
      'Compose utilise la valeur « requis »',
      'Compose refuse de démarrer et affiche « requis »',
      'La base démarre sans mot de passe',
    ],
    2,
    ':? rend la variable obligatoire. :- fournirait une valeur par défaut, risquée pour un secret.',
  ),

  // 3 — Déploiement et HTTPS
  q(
    3,
    'ufw n’autorise que 22, 80 et 443, mais la base publiée avec "5432:5432" est joignable depuis Internet. Pourquoi ?',
    [
      'ufw ne gère pas TCP',
      'Les ports publiés par Docker passent par des règles iptables traitées avant celles d’ufw',
      'PostgreSQL ouvre lui-même le pare-feu',
      'Le port 5432 est toujours ouvert sur Linux',
    ],
    1,
    'Docker contourne ufw pour les ports publiés. Il ne faut pas publier la base, ou la lier à 127.0.0.1.',
  ),
  q(
    3,
    'Caddy échoue à obtenir le certificat de api.exemple.com. Quelle vérification faire en premier ?',
    [
      'Que le DNS pointe vers le serveur et que les ports 80 et 443 sont joignables',
      'Que l’API utilise Node 22',
      'Que le Dockerfile contient EXPOSE 443',
      'Que le serveur a plus de 4 Go de RAM',
    ],
    0,
    'Let’s Encrypt valide le contrôle du domaine en contactant le serveur. dig +short et les journaux de Caddy montrent vite le problème.',
  ),
  q(
    3,
    'Pourquoi monter le dossier /data de Caddy dans un volume ?',
    [
      'Pour accélérer les requêtes',
      'Pour y stocker les journaux d’accès',
      'Parce que le Caddyfile doit s’y trouver',
      'Pour conserver certificats et clés et éviter de les redemander à chaque recréation',
    ],
    3,
    'Sans persistance, chaque redémarrage redemande des certificats et peut atteindre les limites de Let’s Encrypt.',
  ),
  q(
    3,
    'Quelle configuration SSH convient à un serveur de production ?',
    [
      'Connexion root par mot de passe fort',
      'Utilisateur dédié avec clé, PasswordAuthentication no et PermitRootLogin no',
      'Mot de passe et clé acceptés pour plus de souplesse',
      'Port SSH ouvert à tous sans pare-feu',
    ],
    1,
    'Les clés résistent à la force brute ; interdire root impose un compte nominatif et sudo, plus facile à tracer.',
  ),
  q(
    3,
    'Derrière un reverse proxy, une API Express enregistre la même adresse IP pour tous les visiteurs. Que faut-il configurer ?',
    [
      'Désactiver HTTPS',
      'Publier le port de l’API directement',
      'Faire confiance au proxy (trust proxy) pour lire X-Forwarded-For',
      'Changer l’enregistrement DNS en CNAME',
    ],
    2,
    'L’application voit l’IP du proxy. Le proxy transmet l’IP d’origine dans X-Forwarded-For, qu’Express ne lit que si trust proxy est réglé.',
  ),

  // 4 — CI/CD et exploitation
  q(
    4,
    'Dans GitHub Actions, que faut-il pour pousser une image sur ghcr.io avec GITHUB_TOKEN ?',
    [
      'La permission packages: write sur le job',
      'Un compte Docker Hub payant',
      'Rendre le dépôt public',
      'Écrire le mot de passe dans le workflow',
    ],
    0,
    'Le GITHUB_TOKEN a des droits limités par défaut. On accorde packages: write au seul job qui publie l’image.',
  ),
  q(
    4,
    'Un conteneur Docker (sans Swarm ni orchestrateur) passe à l’état unhealthy. Que fait Docker ?',
    [
      'Il le redémarre immédiatement',
      'Il le supprime et le recrée',
      'Il bascule le trafic vers un autre conteneur',
      'Il marque l’état, sans redémarrer : c’est à la supervision d’alerter',
    ],
    3,
    'La politique restart ne réagit qu’à l’arrêt du processus. Un healthcheck sert à l’ordre de démarrage dans Compose et à la supervision.',
  ),
  q(
    4,
    'Le disque d’un VPS se remplit alors que la base ne grossit pas. Quelle cause est la plus fréquente ?',
    [
      'Les certificats Let’s Encrypt',
      'Les journaux json-file sans rotation et les anciennes images accumulées',
      'Le fichier compose.yaml',
      'Le swap',
    ],
    1,
    'Configure max-size et max-file (ou le pilote local) dans daemon.json et nettoie les images inutilisées. docker system df montre la répartition.',
  ),
  q(
    4,
    'Pourquoi ajouter -T à docker compose exec db pg_dump … > sauvegarde.dump ?',
    [
      'Pour lancer la commande en arrière-plan',
      'Pour chiffrer la sauvegarde',
      'Pour ne pas allouer de pseudo-terminal, qui peut altérer une sortie binaire redirigée',
      'Pour sauvegarder toutes les bases',
    ],
    2,
    'Dans un script ou une tâche cron, -T évite qu’un terminal transforme les octets de la sortie, ce qui rendrait la sauvegarde inutilisable.',
  ),
  q(
    4,
    'Comment passer PostgreSQL de la version 16 à la version 17 en production ?',
    [
      'Exporter les données, lancer la 17 sur un nouveau volume, puis restaurer (ou utiliser pg_upgrade)',
      'Changer le tag de l’image et relancer sur le même volume',
      'Supprimer le volume : la 17 recrée les données',
      'Lancer docker compose pull seulement',
    ],
    0,
    'Le format des données change entre versions majeures : la nouvelle version refuse de démarrer sur l’ancien dossier. Sauvegarde et teste la restauration avant.',
  ),
];
