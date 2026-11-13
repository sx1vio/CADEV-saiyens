import { fill, lesson, match, order, qcm, tip, unit, vf } from './dsl';
import type { CourseUnit } from './types';

/**
 * Cours « Docker et mise en ligne » : prépare à la certification DevHub docker-deploiement.
 * Programme : images et Dockerfile, conteneurs, volumes et réseau, Docker Compose,
 * déploiement et HTTPS, CI/CD et exploitation. Docker Engine et Compose v2 (12/11/2026).
 */
export const units: CourseUnit[] = [
  unit(
    'bases',
    'Conteneurs et images : les bases',
    'Expliquer ce qu’est un conteneur, une image et ses couches, et nommer une image pour un registre.',
    [
      lesson('conteneur-vs-vm', 'Conteneur ou machine virtuelle', [
        tip(
          'Le problème que Docker résout',
          '« Chez moi, ça marche. » Ton API tourne avec Node 22 sur ton portable, mais le serveur a Node 18, une autre version d’OpenSSL et des réglages différents. Docker règle ce problème en emballant l’application avec tout ce dont elle a besoin (environnement d’exécution, bibliothèques, fichiers, commande de démarrage) dans une image.\n\nCette image se lance à l’identique sur ton portable, sur la machine d’un collègue, dans la CI et sur le serveur de production. Un conteneur est un processus isolé lancé à partir d’une image : il voit son propre système de fichiers, ses propres processus et sa propre interface réseau, mais pour la machine hôte c’est un processus ordinaire. C’est pour cela qu’il démarre en une fraction de seconde.',
          'docker run --rm hello-world\ndocker run --rm -it alpine:3.20 sh',
        ),
        tip(
          'Conteneur contre machine virtuelle',
          'Une machine virtuelle (VM) émule un ordinateur complet : un hyperviseur lui fournit processeurs, mémoire et disques virtuels, et elle démarre son propre noyau et son propre système d’exploitation. Elle pèse souvent plusieurs gigaoctets et met des dizaines de secondes à démarrer.\n\nUn conteneur partage le noyau de la machine hôte. Son isolation vient de deux fonctionnalités du noyau Linux : les namespaces (ce que le processus voit : processus, réseau, points de montage, utilisateurs) et les cgroups (ce qu’il peut consommer : mémoire, CPU). Résultat : peu de mémoire en plus, un démarrage quasi instantané, et de la place pour plusieurs services sur un petit VPS de 2 Go.\n\n• Contrepartie : l’isolation est moins forte qu’une VM, puisque le noyau est partagé.\n• Un conteneur Linux a besoin d’un noyau Linux : sur Windows et macOS, Docker Desktop fait tourner une petite VM Linux en coulisse.',
        ),
        qcm(
          'Qu’est-ce que tous les conteneurs d’une même machine partagent ?',
          [
            'Leur système de fichiers',
            'Le noyau du système hôte',
            'Leurs variables d’environnement',
            'Leur table de processus',
          ],
          1,
          'Chaque conteneur a son propre système de fichiers, ses processus et son réseau grâce aux namespaces, mais tous s’exécutent sur le même noyau. C’est ce qui les rend si légers.',
        ),
        vf(
          'Un conteneur démarre son propre noyau Linux, comme une machine virtuelle.',
          false,
          'Seule la VM démarre un noyau. Le conteneur est un processus de l’hôte, isolé par les namespaces et limité par les cgroups.',
        ),
        match(
          'Associe chaque notion à son rôle.',
          [
            ['Namespaces', 'Limiter ce que le processus voit'],
            ['Cgroups', 'Limiter ce qu’il consomme (CPU, mémoire)'],
            ['Hyperviseur', 'Faire tourner des machines virtuelles'],
            ['Image', 'Modèle en lecture seule d’où part le conteneur'],
          ],
          'Namespaces et cgroups sont les deux briques du noyau Linux sur lesquelles reposent les conteneurs.',
        ),
        qcm(
          'Pourquoi peut-on faire tourner plusieurs conteneurs sur un VPS de 2 Go de RAM, alors que trois VM le satureraient ?',
          [
            'Les conteneurs compressent la mémoire',
            'Docker ajoute de la RAM virtuelle gratuite',
            'Les conteneurs ne chargent ni noyau ni système complet, seulement les processus de l’application',
            'Les conteneurs s’exécutent sur les serveurs de Docker Hub',
          ],
          2,
          'Une VM réserve de la mémoire pour son propre système. Un conteneur ne consomme que ce que consomment ses processus.',
        ),
        vf(
          'Sur macOS, Docker Desktop utilise une petite machine virtuelle Linux pour exécuter les conteneurs Linux.',
          true,
          'Les conteneurs Linux ont besoin d’un noyau Linux. Docker Desktop en fournit un dans une VM légère, presque invisible pour toi.',
        ),
        fill(
          'Lance un shell interactif dans un conteneur Alpine, supprimé à la sortie.',
          'docker run --rm ___ alpine:3.20 sh',
          ['-it', '-d', '-p', '-v'],
          '-it',
          '-i garde l’entrée standard ouverte et -t alloue un terminal : ensemble, ils donnent un shell utilisable. --rm supprime le conteneur à la sortie.',
        ),
      ]),

      lesson('images-couches', 'Images et couches', [
        tip(
          'Une image est une pile de couches',
          'Une image est un modèle en lecture seule : un système de fichiers (par exemple Alpine avec Node installé et ton code) et des métadonnées (commande de démarrage, variables d’environnement, port documenté, utilisateur). Elle est construite en couches : chaque instruction RUN, COPY ou ADD d’un Dockerfile ajoute une couche qui contient uniquement les fichiers ajoutés ou modifiés. Les autres instructions (ENV, CMD, EXPOSE, USER…) ne modifient que les métadonnées.\n\nLes couches sont partagées. Si trois de tes images partent de node:22-alpine, la couche de base n’est téléchargée et stockée qu’une fois. Sur une connexion lente, c’est précieux : un docker pull ne récupère que les couches qui manquent.\n\nQuand un conteneur démarre, Docker pose par-dessus une fine couche en écriture. Tout ce que le conteneur écrit va dans cette couche, qui disparaît quand on supprime le conteneur.',
          'docker image ls\ndocker history node:22-alpine\ndocker image inspect node:22-alpine',
        ),
        tip(
          'Ce qu’une couche ne peut pas faire',
          'Une couche peut ajouter des fichiers ou en masquer, mais jamais alléger les couches du dessous. Si tu télécharges une archive de 200 Mo dans une instruction RUN et que tu la supprimes dans la suivante, l’image garde ces 200 Mo : le fichier existe toujours dans la couche précédente.\n\nMême piège pour les secrets : un fichier .env copié puis supprimé reste lisible par quiconque récupère l’image et extrait ses couches.\n\nBonne pratique : télécharger, utiliser et nettoyer dans la même instruction RUN, et ne jamais faire entrer de secret dans une couche.',
          'RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*',
        ),
        qcm(
          'Quelles instructions d’un Dockerfile ajoutent une couche de fichiers à l’image ?',
          [
            'CMD et EXPOSE',
            'Uniquement FROM',
            'RUN, COPY et ADD',
            'Toutes les lignes, y compris les commentaires',
          ],
          2,
          'RUN, COPY et ADD modifient le système de fichiers. ENV, CMD, EXPOSE, USER ou LABEL ne changent que les métadonnées de l’image.',
        ),
        vf(
          'Supprimer un gros fichier dans une instruction RUN ultérieure réduit la taille de l’image.',
          false,
          'Le fichier reste dans la couche où il a été créé. Il faut le supprimer dans la même instruction RUN, ou utiliser une construction multi-étapes.',
        ),
        qcm(
          'Ce Dockerfile protège-t-il le fichier .env ?',
          [
            'Oui, rm le supprime définitivement',
            'Non : le fichier reste dans la couche créée par COPY et peut être extrait',
            'Oui, car l’image est privée',
            'Non, mais seulement si l’image est sur Docker Hub',
          ],
          1,
          'Chaque couche est conservée telle quelle. Les secrets se passent au lancement (variables, fichiers montés), jamais dans l’image.',
          'FROM node:22-alpine\nCOPY .env /app/.env\nRUN node /app/setup.js && rm /app/.env',
        ),
        fill(
          'Affiche les couches d’une image et l’instruction qui a créé chacune.',
          'docker ___ node:22-alpine',
          ['history', 'layers', 'top', 'logs'],
          'history',
          'docker history liste les couches avec leur taille et l’instruction d’origine : pratique pour repérer la couche qui alourdit l’image.',
        ),
        vf(
          'Deux images construites à partir de node:22-alpine partagent la couche de base sur le disque.',
          true,
          'Les couches sont identifiées par leur contenu. Une couche identique n’est stockée et téléchargée qu’une seule fois.',
        ),
        match(
          'Associe chaque terme à sa définition.',
          [
            ['Image', 'Modèle en lecture seule, fait de couches'],
            ['Conteneur', 'Instance en cours d’exécution, avec une couche en écriture'],
            ['Couche', 'Différence de fichiers produite par une instruction'],
            ['Registre', 'Serveur qui stocke et distribue les images'],
          ],
          'Une même image peut lancer autant de conteneurs que tu veux : chacun reçoit sa propre couche en écriture.',
        ),
        qcm(
          'Où va un fichier que l’application écrit pendant l’exécution, sans volume ?',
          [
            'Dans l’image, pour le prochain démarrage',
            'Sur Docker Hub',
            'Dans le dossier courant de la machine hôte',
            'Dans la couche en écriture du conteneur, perdue à sa suppression',
          ],
          3,
          'L’image ne change jamais. Pour conserver des données (base, fichiers envoyés), il faut un volume.',
        ),
      ]),

      lesson('registre-tags', 'Tags, registres et versions', [
        tip(
          'Nommer une image',
          'Le nom complet d’une image suit la forme registre/espace/nom:tag. Par exemple ghcr.io/awa-dev/api:1.4.2 désigne l’image api du compte awa-dev, version 1.4.2, sur le registre de GitHub (GHCR). Sans registre, Docker suppose Docker Hub (docker.io) ; sans tag, il suppose latest.\n\nUn tag est une étiquette mobile : rien n’empêche de pousser une autre image sous le même tag. latest n’a rien de magique, c’est seulement le tag par défaut ; il ne garantit pas « la plus récente ». Pour désigner une image de façon immuable, on utilise son digest (nom@sha256:…), l’empreinte de son contenu.\n\nEn production, étiquette tes images avec une version (1.4.2) ou le SHA du commit, et choisis une image de base précise (node:22-alpine plutôt que node). Tu sais alors exactement ce qui tourne, et revenir en arrière consiste à relancer le tag précédent.',
          'docker build -t ghcr.io/awa-dev/api:1.4.2 .\ndocker tag ghcr.io/awa-dev/api:1.4.2 ghcr.io/awa-dev/api:latest\ndocker login ghcr.io\ndocker push ghcr.io/awa-dev/api:1.4.2',
        ),
        tip(
          'Registres publics et privés',
          'Un registre stocke et distribue les images : Docker Hub, GitHub Container Registry (ghcr.io), GitLab, ou ceux des fournisseurs cloud. docker pull télécharge, docker push envoie (après docker login).\n\n• Préfère les images officielles ou d’éditeurs vérifiés comme base : elles sont maintenues et reçoivent les correctifs de sécurité.\n• Docker Hub limite les téléchargements anonymes : sur un serveur ou en CI, connecte-toi pour éviter les erreurs de quota.\n• Une image privée exige un docker login sur chaque machine qui la tire, y compris le serveur de production.\n• Ne pousse jamais une image qui contient un secret, même dans un dépôt privé.',
        ),
        qcm(
          'Quelle image Docker tire-t-il avec la commande docker pull postgres ?',
          [
            'docker.io/library/postgres:latest',
            'ghcr.io/postgres:stable',
            'La dernière version installée sur ta machine',
            'postgres:17, la version recommandée',
          ],
          0,
          'Sans registre, Docker utilise Docker Hub ; les images officielles vivent dans l’espace library ; sans tag, il prend latest.',
        ),
        vf(
          'Le tag latest désigne toujours la version la plus récente de l’image.',
          false,
          'latest est seulement le tag par défaut. L’éditeur peut le faire pointer où il veut, et il ne bouge pas tout seul quand une nouvelle version sort.',
        ),
        match(
          'Découpe le nom ghcr.io/awa-dev/api:1.4.2.',
          [
            ['ghcr.io', 'Le registre'],
            ['awa-dev', 'Le compte ou l’organisation'],
            ['api', 'Le nom du dépôt d’images'],
            ['1.4.2', 'Le tag (la version)'],
          ],
          'Sans la partie registre, Docker suppose docker.io (Docker Hub).',
        ),
        fill(
          'Envoie l’image vers le registre.',
          'docker ___ ghcr.io/awa-dev/api:1.4.2',
          ['push', 'pull', 'commit', 'save'],
          'push',
          'push envoie les couches qui manquent au registre ; pull les récupère. Il faut s’être connecté avant avec docker login.',
        ),
        qcm(
          'Comment désigner une image de façon totalement immuable ?',
          [
            'Avec le tag latest',
            'Avec le tag stable',
            'Avec un tag de version comme 1.4.2',
            'Avec son digest : api@sha256:…',
          ],
          3,
          'Un tag peut être réattribué ; le digest est l’empreinte du contenu, il ne peut désigner qu’une seule image.',
        ),
        order(
          'Remets dans l’ordre la publication d’une nouvelle version.',
          [
            'docker build -t ghcr.io/awa-dev/api:1.5.0 .',
            'docker login ghcr.io',
            'docker push ghcr.io/awa-dev/api:1.5.0',
            'Sur le serveur : docker pull ghcr.io/awa-dev/api:1.5.0',
          ],
          'On construit et on étiquette, on s’authentifie auprès du registre, on pousse, puis le serveur tire la version précise.',
        ),
        qcm(
          'Quelle étiquette choisir pour l’image que tu déploies en production ?',
          [
            'latest, pour être toujours à jour',
            'Le SHA du commit ou un numéro de version',
            'Le nom de la branche, par exemple main',
            'Aucune, Docker en génère une',
          ],
          1,
          'Une étiquette unique par version dit exactement quel code tourne et permet un retour arrière en relançant l’étiquette précédente.',
        ),
      ]),

      lesson('recap-bases', 'Récap et pratique', [
        tip(
          'Ce qu’il faut retenir',
          '• Une image est un modèle en lecture seule fait de couches ; un conteneur est un processus isolé lancé à partir d’une image, avec une couche en écriture jetable.\n• Les conteneurs partagent le noyau de l’hôte (namespaces + cgroups) : légers et rapides, mais moins isolés qu’une VM.\n• Les couches sont partagées et mises en cache : un pull ne télécharge que ce qui manque.\n• Ce qui entre dans une couche y reste : pas de secret, nettoyage dans la même instruction RUN.\n• Nom complet : registre/compte/nom:tag. Sans registre, Docker Hub ; sans tag, latest.\n• En production : versions précises (tag de version ou SHA, digest si besoin), jamais latest.',
        ),
        tip(
          'Tes premières commandes',
          'Ces commandes reviennent tout le temps. docker pull récupère une image, docker image ls liste celles que tu as, docker run crée et démarre un conteneur, docker ps liste ceux qui tournent (-a pour voir aussi les arrêtés), docker rmi supprime une image.\n\nSur un serveur au disque modeste, surveille la place prise avec docker system df : les vieilles images s’accumulent vite à chaque déploiement.',
          'docker pull node:22-alpine\ndocker image ls\ndocker run --rm node:22-alpine node -e "console.log(process.version)"\ndocker ps -a\ndocker system df',
        ),
        qcm(
          'Ton collègue dit : « Mon conteneur, c’est une petite VM. » Que corriges-tu ?',
          [
            'Rien, c’est exact',
            'Un conteneur est un processus isolé qui partage le noyau de l’hôte',
            'Un conteneur est une image compressée',
            'Un conteneur est un serveur distant',
          ],
          1,
          'Pas de noyau, pas de matériel virtuel : un conteneur reste un processus de l’hôte, isolé par le noyau.',
        ),
        vf(
          'On peut lancer plusieurs conteneurs à partir de la même image.',
          true,
          'Chacun reçoit sa propre couche en écriture ; l’image, elle, n’est jamais modifiée.',
        ),
        fill(
          'Liste tous les conteneurs, y compris ceux qui sont arrêtés.',
          'docker ps ___',
          ['-a', '-q', '-d', '--rm'],
          '-a',
          'Sans -a, docker ps n’affiche que les conteneurs en cours d’exécution. -q n’affiche que les identifiants.',
        ),
        qcm(
          'Ton image passe de 180 Mo à 900 Mo après l’ajout de ces deux lignes. Pourquoi ?',
          [
            'Le cache est désactivé',
            'Alpine ne sait pas supprimer les fichiers',
            'L’archive reste dans la couche du premier RUN',
            'curl alourdit toujours les images',
          ],
          2,
          'La suppression dans une autre couche ne libère rien. Il fallait télécharger, extraire et supprimer dans un seul RUN.',
          'RUN curl -fsSL -o /tmp/sdk.tar.gz https://exemple.com/sdk.tar.gz\nRUN tar -xzf /tmp/sdk.tar.gz -C /opt && rm /tmp/sdk.tar.gz',
        ),
        match(
          'Associe chaque commande à son effet.',
          [
            ['docker pull', 'Télécharger une image'],
            ['docker run', 'Créer et démarrer un conteneur'],
            ['docker ps', 'Lister les conteneurs actifs'],
            ['docker rmi', 'Supprimer une image'],
            ['docker system df', 'Voir l’espace disque utilisé par Docker'],
          ],
          'docker rm supprime un conteneur, docker rmi une image : ne les confonds pas.',
        ),
        vf(
          'Sans précision, docker run nginx utilise l’image nginx:latest de Docker Hub.',
          true,
          'Registre par défaut docker.io, tag par défaut latest. Pratique pour essayer, à éviter en production.',
        ),
        qcm(
          'Ta connexion est lente et tu mets à jour une image dont seule la dernière couche a changé. Que télécharge docker pull ?',
          [
            'Toute l’image à nouveau',
            'Rien, il faut supprimer l’ancienne image d’abord',
            'Toutes les couches sauf la base',
            'Uniquement la couche qui manque',
          ],
          3,
          'Docker compare les empreintes des couches et ne récupère que les nouvelles : un Dockerfile bien ordonné rend les mises à jour légères.',
        ),
        order(
          'Remets dans l’ordre le chemin d’une application, du code au conteneur.',
          [
            'Écrire le Dockerfile',
            'Construire l’image avec docker build',
            'Pousser l’image vers un registre',
            'Tirer l’image sur le serveur',
            'Lancer un conteneur avec docker run',
          ],
          'Code → Dockerfile → image → registre → serveur → conteneur : c’est le cycle que tu automatiseras plus tard avec la CI.',
        ),
      ]),
    ],
  ),

  unit(
    'dockerfile',
    'Écrire un bon Dockerfile',
    'Écrire un Dockerfile rapide à construire, léger, sûr et qui s’arrête proprement.',
    [
      lesson('instructions', 'Les instructions du Dockerfile', [
        tip(
          'Un Dockerfile pas à pas',
          'Un Dockerfile est la recette d’une image, lue de haut en bas.\n\n• FROM choisit l’image de base (toujours en premier).\n• WORKDIR fixe le dossier de travail (il est créé s’il n’existe pas) : évite les cd dans les RUN.\n• COPY copie des fichiers du contexte de construction vers l’image.\n• RUN exécute une commande pendant la construction (installer des dépendances, compiler).\n• ENV définit une variable d’environnement présente dans l’image et dans les conteneurs.\n• EXPOSE documente le port écouté par l’application : il ne publie rien.\n• USER choisit l’utilisateur qui exécute les instructions suivantes et le conteneur.\n• CMD donne la commande lancée au démarrage du conteneur.',
          'FROM node:22-alpine\nWORKDIR /app\nCOPY package.json package-lock.json ./\nRUN npm ci --omit=dev\nCOPY . .\nENV NODE_ENV=production\nEXPOSE 3000\nUSER node\nCMD ["node", "server.js"]',
        ),
        tip(
          'CMD, ENTRYPOINT et les signaux',
          'Écris CMD sous forme JSON (forme exec) : CMD ["node", "server.js"]. Node devient alors le processus principal (PID 1) et reçoit directement le signal SIGTERM envoyé par docker stop. Sous forme shell (CMD node server.js), Docker lance /bin/sh -c, qui ne transmet pas toujours le signal : ton serveur ne ferme pas proprement ses connexions et Docker le tue avec SIGKILL après 10 secondes.\n\nENTRYPOINT fixe l’exécutable ; CMD fournit les arguments par défaut. Les arguments passés à docker run remplacent CMD, pas ENTRYPOINT.\n\nPréfère COPY à ADD : ADD sait aussi télécharger une URL et extraire automatiquement une archive locale, un comportement implicite qui surprend. Enfin, n’utilise pas npm start comme CMD : npm s’intercale entre Docker et Node et gère mal les signaux.',
        ),
        match(
          'Associe chaque instruction à son rôle.',
          [
            ['FROM', 'Choisir l’image de base'],
            ['WORKDIR', 'Fixer le dossier de travail'],
            ['RUN', 'Exécuter une commande pendant la construction'],
            ['CMD', 'Commande lancée au démarrage du conteneur'],
            ['EXPOSE', 'Documenter le port écouté'],
          ],
          'RUN agit à la construction de l’image, CMD au lancement de chaque conteneur.',
        ),
        qcm(
          'Ton Dockerfile contient EXPOSE 3000. Que se passe-t-il au lancement avec docker run api ?',
          [
            'Le port 3000 est publié sur la machine hôte',
            'Rien n’est publié : EXPOSE documente seulement le port',
            'Le pare-feu ouvre le port 3000',
            'Docker choisit un port libre et le publie',
          ],
          1,
          'Pour publier, il faut -p 3000:3000 (ou -P, qui publie les ports exposés sur des ports aléatoires de l’hôte).',
        ),
        vf(
          'Avec CMD node server.js (forme shell), Node reçoit toujours directement le SIGTERM de docker stop.',
          false,
          'La forme shell lance /bin/sh -c, qui devient le PID 1. Utilise la forme JSON pour que Node reçoive le signal et s’arrête proprement.',
        ),
        fill(
          'Fixe le dossier de travail de l’image.',
          'FROM node:22-alpine\n___ /app\nCOPY . .',
          ['WORKDIR', 'CD', 'DIR', 'RUN cd'],
          'WORKDIR',
          'WORKDIR s’applique à toutes les instructions suivantes et au conteneur. Un RUN cd n’a d’effet que dans sa propre instruction.',
        ),
        qcm(
          'L’image a CMD ["node", "server.js"]. Que lance docker run api node migrate.js ?',
          [
            'server.js puis migrate.js',
            'Une erreur : CMD ne peut pas être remplacé',
            'migrate.js à la place de server.js',
            'server.js avec migrate.js en argument',
          ],
          2,
          'Les arguments après le nom de l’image remplacent CMD. S’il y avait un ENTRYPOINT, ils seraient ajoutés à sa suite.',
        ),
        qcm(
          'Pourquoi préférer COPY à ADD pour copier ton code ?',
          [
            'COPY est plus rapide à taper',
            'ADD est déprécié et refusé par Docker',
            'COPY compresse les fichiers',
            'ADD a des effets implicites (téléchargement d’URL, extraction d’archives) ; COPY fait seulement une copie',
          ],
          3,
          'La documentation officielle recommande COPY dans la grande majorité des cas : son comportement est prévisible.',
        ),
        order(
          'Remets ce Dockerfile dans un ordre qui fonctionne.',
          [
            'FROM node:22-alpine',
            'WORKDIR /app',
            'COPY package.json package-lock.json ./',
            'RUN npm ci --omit=dev',
            'COPY . .',
            'CMD ["node", "server.js"]',
          ],
          'FROM d’abord, puis le dossier, les dépendances, le code, et la commande de démarrage à la fin.',
        ),
      ]),

      lesson('cache-contexte', 'Cache de construction et .dockerignore', [
        tip(
          'Le cache de construction',
          'Docker garde le résultat de chaque instruction. Au build suivant, il réutilise une couche si l’instruction et ses entrées n’ont pas changé (pour COPY, le contenu des fichiers copiés). Dès qu’une instruction change, elle et toutes les suivantes sont reconstruites.\n\nD’où la règle d’or : ce qui change rarement en haut, ce qui change souvent en bas. Copie d’abord package.json et package-lock.json, installe les dépendances, puis copie le code. Modifier une ligne de code ne relance alors pas npm ci : le build passe de plusieurs minutes à quelques secondes, ce qui compte beaucoup sur une connexion lente.\n\nPiège : le cache d’un RUN dépend du texte de la commande, pas du monde extérieur. Un RUN apt-get update seul resterait en cache indéfiniment avec une liste de paquets périmée : enchaîne toujours update et install dans le même RUN. Pour forcer une reconstruction complète, utilise docker build --no-cache ; pour récupérer la dernière version de l’image de base, --pull.',
          '# Mauvais : chaque modification du code relance npm ci\nCOPY . .\nRUN npm ci\n\n# Bon : npm ci reste en cache tant que les dépendances ne changent pas\nCOPY package.json package-lock.json ./\nRUN npm ci\nCOPY . .',
        ),
        tip(
          'Le contexte de construction et .dockerignore',
          'Dans docker build -t api ., le point final est le contexte : le dossier dont le contenu est envoyé au moteur de construction. Seuls ses fichiers sont accessibles aux COPY.\n\nLe fichier .dockerignore, à la racine du contexte, exclut des fichiers avec une syntaxe proche de .gitignore. Sans lui, tu envoies node_modules (souvent des centaines de Mo), le dossier .git, et pire, ton fichier .env, qu’un COPY . . ferait entrer dans l’image.\n\nAutre bénéfice : un node_modules local, compilé pour ton système, n’écrase pas celui installé dans l’image, et un fichier de log modifié n’invalide plus le cache du COPY . .',
          'node_modules\n.git\n.env\n.env.*\ndist\ncoverage\n*.log\nDockerfile\ncompose*.yaml',
        ),
        qcm(
          'Dans ce Dockerfile, pourquoi chaque petite modification du code relance-t-elle l’installation des dépendances ?',
          [
            'Parce que npm ci ignore toujours le cache',
            'Parce que COPY . . change dès qu’un fichier change, et invalide les instructions suivantes',
            'Parce que WORKDIR désactive le cache',
            'Parce que l’image de base est alpine',
          ],
          1,
          'Une instruction invalidée entraîne la reconstruction de toutes celles qui suivent. Copie les manifestes de dépendances seuls avant le reste du code.',
          'FROM node:22-alpine\nWORKDIR /app\nCOPY . .\nRUN npm ci\nCMD ["node", "server.js"]',
        ),
        vf(
          'Quand une instruction du Dockerfile change, seule cette instruction est reconstruite ; les suivantes restent en cache.',
          false,
          'Toutes les instructions suivantes sont reconstruites, car chaque couche dépend de celle du dessous.',
        ),
        fill(
          'Copie seulement les manifestes de dépendances avant npm ci.',
          'COPY package.json ___ ./\nRUN npm ci',
          ['package-lock.json', '.', 'node_modules', '.env'],
          'package-lock.json',
          'npm ci exige le fichier de verrouillage et installe exactement les versions qu’il contient : des builds reproductibles.',
        ),
        qcm(
          'Que faut-il mettre dans .dockerignore en priorité pour une API Node ?',
          [
            'package.json et package-lock.json',
            'Le Dockerfile uniquement',
            'node_modules, .git et les fichiers .env',
            'Le dossier src',
          ],
          2,
          'Exclure node_modules et .git accélère l’envoi du contexte ; exclure .env évite d’embarquer un secret dans l’image.',
        ),
        qcm(
          'Pourquoi écrire RUN apt-get update && apt-get install -y curl en une seule instruction ?',
          [
            'Pour éviter qu’un apt-get update mis en cache fournisse une liste de paquets périmée',
            'Parce que Docker refuse deux RUN de suite',
            'Pour que le conteneur démarre plus vite',
            'Parce que && est obligatoire avec apt-get',
          ],
          0,
          'Séparés, le RUN apt-get update resterait en cache et l’installation utiliserait des index anciens, parfois introuvables sur les miroirs.',
        ),
        vf(
          'Le point à la fin de docker build -t api . désigne le contexte de construction.',
          true,
          'C’est le dossier envoyé au moteur. Le Dockerfile ne peut copier que des fichiers qui s’y trouvent (et qui ne sont pas exclus par .dockerignore).',
        ),
        order(
          'Range ces instructions pour profiter au mieux du cache.',
          [
            'FROM node:22-alpine',
            'RUN apk add --no-cache tini',
            'WORKDIR /app',
            'COPY package.json package-lock.json ./',
            'RUN npm ci --omit=dev',
            'COPY . .',
          ],
          'Paquets système (changent presque jamais), puis dépendances npm (changent parfois), puis le code (change à chaque commit).',
        ),
      ]),

      lesson('multi-etapes', 'Constructions multi-étapes', [
        tip(
          'Séparer la construction de l’exécution',
          'Pour compiler du TypeScript ou construire un front-end, il faut des outils (compilateur, dépendances de développement, parfois make et gcc) qui ne servent à rien une fois l’application lancée. Une construction multi-étapes enchaîne plusieurs FROM dans le même Dockerfile : une première étape construit, la dernière ne récupère que le résultat avec COPY --from.\n\nSeule la dernière étape devient l’image finale. Les outils de build, les sources TypeScript et les dépendances de développement restent dans l’étape intermédiaire : l’image est plus légère à pousser et à tirer, et la surface d’attaque diminue (moins de binaires qu’un attaquant pourrait utiliser).',
          '# Étape 1 : compiler\nFROM node:22-alpine AS build\nWORKDIR /app\nCOPY package.json package-lock.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\n\n# Étape 2 : exécuter\nFROM node:22-alpine\nWORKDIR /app\nENV NODE_ENV=production\nCOPY package.json package-lock.json ./\nRUN npm ci --omit=dev\nCOPY --from=build /app/dist ./dist\nUSER node\nCMD ["node", "dist/server.js"]',
        ),
        tip(
          'D’autres usages des étapes',
          '• Un site statique (React, Vue) se construit avec Node puis se sert avec un serveur web léger : la dernière étape part de nginx:alpine (ou caddy:alpine) et copie seulement le dossier dist. Plus du tout de Node dans l’image finale.\n• docker build --target build construit seulement jusqu’à l’étape nommée build : pratique pour lancer les tests en CI dans une image qui contient les dépendances de développement.\n• Nomme tes étapes avec AS : COPY --from=build est plus lisible et plus robuste que COPY --from=0.\n• Avec BuildKit (le moteur par défaut), les étapes indépendantes se construisent en parallèle et une étape inutile à la cible n’est pas construite.',
          'FROM node:22-alpine AS build\nWORKDIR /app\nCOPY package.json package-lock.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\n\nFROM nginx:1.27-alpine\nCOPY --from=build /app/dist /usr/share/nginx/html',
        ),
        qcm(
          'Quelle étape d’un Dockerfile multi-étapes devient l’image finale, sans option particulière ?',
          ['La première', 'La plus légère', 'Toutes, fusionnées', 'La dernière'],
          3,
          'Par défaut, l’image produite est la dernière étape. --target permet de s’arrêter sur une étape précise.',
        ),
        fill(
          'Récupère le dossier compilé depuis l’étape build.',
          'COPY ___ /app/dist ./dist',
          ['--from=build', '--stage=build', '--target=build', 'build:'],
          '--from=build',
          'COPY --from copie depuis une étape précédente (ou même depuis une autre image, par exemple COPY --from=nginx:alpine …).',
        ),
        vf(
          'Dans une construction multi-étapes, les dépendances de développement installées dans l’étape build se retrouvent dans l’image finale.',
          false,
          'Seul ce que tu copies explicitement avec COPY --from passe dans l’étape finale.',
        ),
        qcm(
          'Ta CI doit lancer les tests dans une image qui contient les dépendances de développement. Que fais-tu ?',
          [
            'docker build --target build puis lancer les tests dans cette image',
            'Ajouter les dépendances de développement dans l’image finale',
            'Lancer les tests sur le serveur de production',
            'Désactiver le cache',
          ],
          0,
          '--target s’arrête sur l’étape nommée : la même recette sert aux tests et à la production.',
        ),
        qcm(
          'Pour servir le build d’une application React, quelle image finale est la plus adaptée ?',
          [
            'node:22 avec npm run dev',
            'Une image Ubuntu complète',
            'nginx:alpine avec seulement le dossier dist',
            'L’étape build telle quelle',
          ],
          2,
          'Une fois construit, un front-end n’est que des fichiers statiques : un serveur web léger suffit, sans Node ni code source.',
        ),
        match(
          'Associe chaque élément à son rôle.',
          [
            ['AS build', 'Nommer une étape'],
            ['COPY --from=build', 'Copier depuis une étape précédente'],
            ['--target build', 'S’arrêter à une étape précise'],
            ['Dernière étape', 'Devient l’image finale'],
          ],
          'Ces quatre notions suffisent pour écrire 90 % des Dockerfile multi-étapes.',
        ),
        vf(
          'Une construction multi-étapes réduit aussi la surface d’attaque de l’image.',
          true,
          'Moins de paquets et d’outils dans l’image, c’est moins de failles connues à corriger et moins d’outils disponibles pour un attaquant.',
        ),
      ]),

      lesson('image-securisee', 'Images légères et utilisateur non root', [
        tip(
          'Choisir une base légère',
          'L’image de base pèse souvent plus que ton application. node:22 (Debian complète) dépasse 1 Go ; node:22-slim (Debian réduite) et node:22-alpine (Alpine Linux) tournent autour de 150 à 250 Mo. Une image plus petite se pousse et se tire plus vite, prend moins de disque sur un petit VPS et contient moins de paquets vulnérables.\n\nAlpine utilise la bibliothèque C musl au lieu de glibc : certains modules natifs ou binaires précompilés pour glibc posent problème. Si c’est le cas, slim est un bon compromis. Les images distroless vont plus loin : pas de shell ni de gestionnaire de paquets, seulement l’environnement d’exécution.\n\nBonnes habitudes : npm ci --omit=dev en production, apk add --no-cache ou rm -rf /var/lib/apt/lists/* après une installation, et aucun outil de compilation dans l’image finale.',
        ),
        tip(
          'Ne pas tourner en root',
          'Par défaut, le processus d’un conteneur tourne en root. Si un attaquant exploite une faille de ton application, il est root dans le conteneur : il peut modifier tous les fichiers, installer des outils, et une évasion du conteneur devient bien plus grave.\n\nLes images officielles node fournissent un utilisateur node (uid 1000). Ajoute USER node avant CMD, et donne-lui les fichiers dont il a besoin avec COPY --chown=node:node. Un utilisateur non root ne peut pas écouter sur un port inférieur à 1024 : fais écouter l’application sur 3000 ou 8080, et laisse le reverse proxy gérer 80 et 443.\n\nPour aller plus loin : docker run --read-only pour un système de fichiers en lecture seule, et un scan régulier de l’image (docker scout cves ou Trivy) pour repérer les vulnérabilités connues.',
          'FROM node:22-alpine\nWORKDIR /app\nCOPY --chown=node:node package.json package-lock.json ./\nRUN npm ci --omit=dev\nCOPY --chown=node:node . .\nUSER node\nEXPOSE 3000\nCMD ["node", "server.js"]',
        ),
        qcm(
          'Quel est le principal risque d’une application qui tourne en root dans son conteneur ?',
          [
            'Elle consomme plus de mémoire',
            'Une faille de l’application donne tous les droits dans le conteneur, et aggrave une éventuelle évasion',
            'Elle ne peut pas écrire de journaux',
            'Docker refuse de la démarrer',
          ],
          1,
          'Le principe du moindre privilège s’applique aussi aux conteneurs : USER node ne coûte rien et limite les dégâts.',
        ),
        fill(
          'Fais tourner l’application avec l’utilisateur prévu par l’image officielle.',
          'COPY --chown=node:node . .\n___ node\nCMD ["node", "server.js"]',
          ['USER', 'RUNAS', 'SU', 'ENV'],
          'USER',
          'USER s’applique aux instructions suivantes et au processus du conteneur. --chown donne la propriété des fichiers copiés à cet utilisateur.',
        ),
        vf(
          'Un utilisateur non root peut écouter directement sur le port 80 dans le conteneur, sans configuration particulière.',
          false,
          'Les ports inférieurs à 1024 sont privilégiés. Fais écouter l’application sur 3000 ou 8080 et publie le port voulu sur l’hôte, ou passe par un reverse proxy.',
        ),
        qcm(
          'Ton build échoue sur node:22-alpine avec une erreur sur un module natif compilé pour glibc. Quelle piste est la plus raisonnable ?',
          [
            'Passer à node:22-slim, basé sur Debian',
            'Passer l’image en root',
            'Ajouter EXPOSE 3000',
            'Supprimer package-lock.json',
          ],
          0,
          'Alpine utilise musl. slim reste léger tout en utilisant glibc, ce qui règle la plupart de ces incompatibilités.',
        ),
        match(
          'Associe chaque variante d’image à sa description.',
          [
            ['node:22', 'Debian complète, plus d’1 Go'],
            ['node:22-slim', 'Debian réduite, avec glibc'],
            ['node:22-alpine', 'Alpine Linux, très légère, avec musl'],
            ['Distroless', 'Sans shell ni gestionnaire de paquets'],
          ],
          'Commence par alpine ou slim ; garde la version complète pour les cas où il te faut beaucoup d’outils système.',
        ),
        qcm(
          'Quelle commande réduit le plus le poids des dépendances npm dans l’image de production ?',
          ['npm install', 'npm ci --omit=dev', 'npm update', 'npm audit fix'],
          1,
          'npm ci installe exactement le fichier de verrouillage, et --omit=dev écarte les outils de test, de lint et de compilation.',
        ),
        vf(
          'Scanner régulièrement ses images avec un outil comme docker scout ou Trivy permet de repérer des vulnérabilités connues dans les paquets.',
          true,
          'Les failles sont découvertes après coup : une image saine aujourd’hui peut être vulnérable le mois prochain. Reconstruis régulièrement avec --pull.',
        ),
      ]),

      lesson('recap-dockerfile', 'Récap et pratique', [
        tip(
          'La check-list du Dockerfile de production',
          '• Image de base précise et légère : node:22-alpine ou node:22-slim, jamais node tout court.\n• .dockerignore : node_modules, .git, .env, dist, journaux.\n• Ordre pour le cache : manifestes de dépendances, installation, puis code.\n• npm ci --omit=dev, nettoyage dans le même RUN que l’installation.\n• Multi-étapes dès qu’il y a une compilation : les outils restent dans l’étape build.\n• USER node et fichiers copiés avec --chown.\n• CMD en forme JSON pour recevoir SIGTERM ; pas de npm start.\n• Aucun secret dans le Dockerfile : ni ENV, ni ARG, ni fichier copié.',
        ),
        tip(
          'Exemple complet commenté',
          'Ce Dockerfile pour une API TypeScript coche toutes les cases. L’étape deps installe les dépendances de production seules ; l’étape build compile ; l’image finale ne reçoit que node_modules de production et le dossier dist. L’application écoute sur 3000, en tant que node, et s’arrête proprement.',
          'FROM node:22-alpine AS deps\nWORKDIR /app\nCOPY package.json package-lock.json ./\nRUN npm ci --omit=dev\n\nFROM node:22-alpine AS build\nWORKDIR /app\nCOPY package.json package-lock.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\n\nFROM node:22-alpine\nWORKDIR /app\nENV NODE_ENV=production\nCOPY --from=deps --chown=node:node /app/node_modules ./node_modules\nCOPY --from=build --chown=node:node /app/dist ./dist\nUSER node\nEXPOSE 3000\nCMD ["node", "dist/server.js"]',
        ),
        qcm(
          'Combien de problèmes vois-tu dans ce Dockerfile ?',
          ['Aucun', 'Un seul : latest', 'Deux : root et CMD', 'Au moins quatre'],
          3,
          'Image sans version, COPY . . avant l’installation (cache cassé), dépendances de développement installées, secret dans ENV, exécution en root, et npm start qui gère mal les signaux.',
          'FROM node\nCOPY . .\nRUN npm install\nENV DB_PASSWORD=motdepasse123\nCMD npm start',
        ),
        vf(
          'Un mot de passe passé avec ENV dans le Dockerfile est visible par toute personne qui peut tirer l’image.',
          true,
          'docker image inspect et docker history l’affichent. Les secrets se fournissent au lancement du conteneur.',
        ),
        fill(
          'Complète pour que Node reçoive bien SIGTERM.',
          '___ ["node", "dist/server.js"]',
          ['CMD', 'RUN', 'ENTRYPOINT sh -c', 'EXEC'],
          'CMD',
          'La forme JSON de CMD lance Node directement en PID 1, sans shell intermédiaire.',
        ),
        qcm(
          'Ton image fait 1,3 Go pour une petite API. Par quoi commences-tu ?',
          [
            'Ajouter plus de RAM au serveur',
            'Supprimer le .dockerignore',
            'Base alpine ou slim, multi-étapes et npm ci --omit=dev',
            'Passer en root',
          ],
          2,
          'La base complète et les outils de développement sont presque toujours les responsables. docker history te montre les couches les plus lourdes.',
        ),
        order(
          'Remets dans l’ordre l’étape finale d’un Dockerfile multi-étapes.',
          [
            'FROM node:22-alpine',
            'WORKDIR /app',
            'COPY --from=deps /app/node_modules ./node_modules',
            'COPY --from=build /app/dist ./dist',
            'USER node',
            'CMD ["node", "dist/server.js"]',
          ],
          'Base, dossier, fichiers récupérés des étapes précédentes, utilisateur non root, commande de démarrage.',
        ),
        match(
          'Associe chaque problème à sa correction.',
          [
            ['Build lent à chaque commit', 'Copier package*.json avant le code'],
            ['Image trop lourde', 'Multi-étapes et base alpine'],
            ['Application en root', 'USER node'],
            ['Arrêt brutal après 10 s', 'CMD en forme JSON'],
            ['Fichier .env dans l’image', 'Ajouter .env au .dockerignore'],
          ],
          'Ce sont les cinq défauts les plus fréquents des Dockerfile écrits à la va-vite.',
        ),
        vf(
          'Une variable passée avec ARG est un bon moyen de transmettre un secret au build, car elle n’apparaît pas dans l’image.',
          false,
          'Les valeurs d’ARG peuvent apparaître dans l’historique de l’image. Pour un secret de build (jeton npm privé), utilise RUN --mount=type=secret.',
        ),
        qcm(
          'Que fait docker build --pull -t api:2.0.0 . de plus qu’un build normal ?',
          [
            'Il pousse l’image après la construction',
            'Il télécharge la dernière version de l’image de base au lieu d’utiliser la copie locale',
            'Il désactive tout le cache',
            'Il tire les dépendances npm',
          ],
          1,
          '--pull récupère la version à jour de l’image de base (avec ses correctifs de sécurité). --no-cache, lui, désactive le cache.',
        ),
      ]),
    ],
  ),

  unit(
    'conteneurs',
    'Lancer et piloter des conteneurs',
    'Démarrer, observer, configurer et déboguer des conteneurs en ligne de commande.',
    [
      lesson('cycle-de-vie', 'Le cycle de vie d’un conteneur', [
        tip(
          'docker run et ses options',
          'docker run crée un conteneur à partir d’une image puis le démarre. Les options essentielles :\n\n• -d (detached) : en arrière-plan, le terminal te rend la main.\n• --name api : un nom lisible, au lieu d’un nom aléatoire.\n• --rm : supprimer le conteneur dès qu’il s’arrête (pratique pour les tâches ponctuelles).\n• -p 8080:3000 : publier un port.\n• -e et --env-file : passer des variables d’environnement.\n• -v : monter un volume.\n• --restart unless-stopped : redémarrer automatiquement.\n\nLes options se placent avant le nom de l’image ; ce qui suit l’image est la commande à exécuter dans le conteneur.',
          'docker run -d --name api -p 8080:3000 --restart unless-stopped ghcr.io/awa-dev/api:1.4.2',
        ),
        tip(
          'Arrêter, relancer, supprimer',
          'Un conteneur passe par plusieurs états : created, running, exited. docker ps liste ceux qui tournent, docker ps -a tous, y compris les arrêtés.\n\ndocker stop envoie SIGTERM au processus principal, attend 10 secondes par défaut, puis envoie SIGKILL. Une application bien écrite intercepte SIGTERM pour terminer les requêtes en cours et fermer ses connexions. docker kill envoie SIGKILL immédiatement.\n\ndocker start relance un conteneur arrêté (avec la même configuration et sa couche en écriture), docker restart enchaîne les deux, docker rm supprime un conteneur arrêté (docker rm -f force sur un conteneur actif).\n\nLe code de sortie aide au diagnostic : 0 = arrêt normal, 1 = erreur de l’application, 137 = tué par SIGKILL (souvent la mémoire épuisée ou un arrêt trop lent).',
          'docker ps\ndocker ps -a\ndocker stop api\ndocker start api\ndocker rm -f api',
        ),
        qcm(
          'Que fait l’option -d de docker run ?',
          [
            'Supprime le conteneur à l’arrêt',
            'Active le mode debug',
            'Lance le conteneur en arrière-plan',
            'Désactive le réseau',
          ],
          2,
          'detached : le conteneur tourne sans occuper ton terminal. Pour voir sa sortie, utilise docker logs.',
        ),
        vf(
          'docker stop envoie d’abord SIGTERM, puis SIGKILL si le processus ne s’est pas arrêté après le délai de grâce.',
          true,
          'Le délai est de 10 secondes par défaut, réglable avec docker stop -t (ou stop_grace_period dans Compose).',
        ),
        match(
          'Associe chaque commande à son effet.',
          [
            ['docker stop', 'Arrêt propre (SIGTERM puis SIGKILL)'],
            ['docker kill', 'Arrêt immédiat (SIGKILL)'],
            ['docker start', 'Relancer un conteneur arrêté'],
            ['docker rm', 'Supprimer un conteneur arrêté'],
          ],
          'stop puis rm, ou rm -f en une fois. docker rmi, lui, supprime une image.',
        ),
        qcm(
          'Ton conteneur s’est arrêté avec le code 137. Quelle est l’explication la plus probable ?',
          [
            'Il a été tué par SIGKILL, souvent faute de mémoire ou d’arrêt dans les délais',
            'Une erreur de syntaxe dans le Dockerfile',
            'Le port est déjà utilisé',
            'Il s’est terminé normalement',
          ],
          0,
          '137 = 128 + 9 (SIGKILL). Vérifie docker inspect (champ OOMKilled) et la consommation mémoire.',
        ),
        fill(
          'Donne un nom au conteneur pour le retrouver facilement.',
          'docker run -d ___ api -p 8080:3000 ghcr.io/awa-dev/api:1.4.2',
          ['--name', '--tag', '--id', '--label'],
          '--name',
          'Un nom fixe sert ensuite dans docker logs api, docker exec api… et comme nom DNS sur un réseau défini par l’utilisateur.',
        ),
        vf(
          'Dans docker run -d nginx:1.27-alpine -p 8080:80, le port est bien publié.',
          false,
          'Tout ce qui suit le nom de l’image est la commande du conteneur : -p 8080:80 est passé à nginx et non à Docker. Les options vont avant l’image.',
        ),
        qcm(
          'Tu lances une migration ponctuelle et ne veux pas garder le conteneur ensuite. Quelle option ajoutes-tu ?',
          ['-d', '--restart always', '--rm', '--name migration'],
          2,
          '--rm supprime le conteneur à sa sortie : pas d’accumulation de conteneurs arrêtés sur le serveur.',
        ),
      ]),

      lesson('observer', 'Observer et déboguer', [
        tip(
          'Lire les journaux',
          'Dans un conteneur, une application doit écrire ses journaux sur la sortie standard et la sortie d’erreur, pas dans des fichiers. Docker les récupère et docker logs les affiche, même pour un conteneur arrêté (tant qu’il n’est pas supprimé).\n\n• docker logs -f api : suivre en direct.\n• --tail 100 : seulement les 100 dernières lignes.\n• --since 30m : depuis 30 minutes.\n• -t : ajouter l’horodatage.\n\nPremier réflexe quand un conteneur s’arrête aussitôt démarré : docker ps -a pour voir le statut (Exited (1) il y a 3 secondes), puis docker logs pour lire l’erreur, souvent une variable d’environnement manquante ou une base injoignable.',
          'docker ps -a\ndocker logs --tail 100 -f api\ndocker logs --since 30m -t api',
        ),
        tip(
          'Entrer dans un conteneur et l’inspecter',
          'docker exec lance une commande dans un conteneur en cours d’exécution : docker exec -it api sh ouvre un shell (les images Alpine ont sh, pas bash). Tu peux y vérifier les fichiers, les variables, ou tester la connexion à la base. Ne corrige jamais un bug en modifiant un conteneur à la main : le changement disparaîtra au prochain déploiement. Corrige l’image.\n\ndocker inspect affiche toute la configuration en JSON : variables, montages, réseau, état, nombre de redémarrages. Avec --format, tu extrais un champ précis. docker stats montre la consommation CPU et mémoire en direct, docker top les processus, et docker cp copie un fichier entre le conteneur et l’hôte.',
          'docker exec -it api sh\ndocker exec api env\ndocker inspect --format "{{.State.Status}} {{.RestartCount}}" api\ndocker stats --no-stream',
        ),
        qcm(
          'Ton conteneur s’arrête une seconde après le démarrage. Quel est le premier réflexe ?',
          [
            'Réinstaller Docker',
            'Lire docker logs du conteneur',
            'Supprimer l’image',
            'Augmenter la RAM du serveur',
          ],
          1,
          'Les journaux restent lisibles tant que le conteneur n’est pas supprimé. L’erreur y est presque toujours écrite.',
        ),
        fill(
          'Ouvre un shell dans le conteneur api qui tourne.',
          'docker ___ -it api sh',
          ['exec', 'run', 'attach', 'start'],
          'exec',
          'docker exec lance une nouvelle commande dans un conteneur actif. docker run, lui, créerait un nouveau conteneur.',
        ),
        vf(
          'Une application conteneurisée devrait écrire ses journaux sur la sortie standard plutôt que dans un fichier.',
          true,
          'Docker les collecte, les fait tourner selon la configuration et les rend accessibles avec docker logs, sans gérer de fichiers dans le conteneur.',
        ),
        match(
          'Associe chaque besoin à la bonne commande.',
          [
            ['Suivre les journaux en direct', 'docker logs -f'],
            ['Voir CPU et mémoire', 'docker stats'],
            ['Lire la configuration complète', 'docker inspect'],
            ['Lancer une commande dans le conteneur', 'docker exec'],
            ['Copier un fichier vers l’hôte', 'docker cp'],
          ],
          'Ces cinq commandes couvrent la plupart des séances de débogage.',
        ),
        qcm(
          'docker exec -it api bash renvoie « executable file not found ». Pourquoi ?',
          [
            'Le conteneur est arrêté',
            'L’option -it est interdite',
            'Il faut être root sur l’hôte',
            'L’image Alpine ne contient pas bash ; utilise sh',
          ],
          3,
          'Les images légères ne contiennent que sh (BusyBox). Les images distroless n’ont même aucun shell.',
        ),
        vf(
          'Corriger un fichier de configuration directement dans le conteneur avec docker exec est une bonne façon de réparer la production durablement.',
          false,
          'La modification vit dans la couche en écriture du conteneur : elle disparaît dès qu’il est recréé. On corrige l’image ou la configuration montée, puis on redéploie.',
        ),
        qcm(
          'Quelle commande affiche les journaux de la dernière demi-heure ?',
          [
            'docker logs --since 30m api',
            'docker logs --last 30 api',
            'docker history api',
            'docker events api',
          ],
          0,
          '--since accepte une durée (30m, 2h) ou une date. Combine avec -t pour l’horodatage.',
        ),
      ]),

      lesson('ports-config', 'Ports, variables d’environnement et secrets', [
        tip(
          'Publier un port',
          '-p 8080:3000 se lit hôte:conteneur : les connexions sur le port 8080 de la machine sont envoyées au port 3000 du conteneur. Par défaut, Docker écoute sur toutes les interfaces de l’hôte, donc depuis Internet si rien ne bloque. Pour n’exposer qu’en local (derrière un reverse proxy sur la même machine), écris -p 127.0.0.1:8080:3000.\n\nPiège classique : dans le conteneur, l’application doit écouter sur 0.0.0.0, pas sur 127.0.0.1. Le localhost du conteneur n’est pas celui de l’hôte : une application liée à 127.0.0.1 ne reçoit rien de l’extérieur du conteneur, et tu obtiens une connexion refusée alors que tout semble démarré.\n\nDeux conteneurs ne peuvent pas publier le même port de l’hôte : « port is already allocated » signifie qu’un autre conteneur ou programme l’occupe.',
          'docker run -d -p 127.0.0.1:8080:3000 api:1.4.2\n\n// Dans server.js\napp.listen(3000, "0.0.0.0");',
        ),
        tip(
          'Variables d’environnement et secrets',
          'La même image doit tourner en test et en production : ce qui change (adresse de la base, clés d’API, niveau de journaux) se passe au lancement, sous forme de variables d’environnement. -e NOM=valeur pour une variable, --env-file prod.env pour un fichier entier.\n\nPour les secrets, sois prudent : les variables d’environnement sont visibles avec docker inspect par quiconque accède à Docker sur la machine, et peuvent fuiter dans un rapport d’erreur. Mieux : monter le secret comme fichier en lecture seule (Compose le fait avec secrets, dans /run/secrets/…). Beaucoup d’images officielles acceptent une variante _FILE, comme POSTGRES_PASSWORD_FILE.\n\nDans tous les cas : jamais de secret dans le Dockerfile ni dans Git. Le fichier prod.env vit sur le serveur, avec des droits restreints (chmod 600).',
          'docker run -d --name api --env-file /srv/api/prod.env -e LOG_LEVEL=info api:1.4.2',
        ),
        qcm(
          'Que signifie -p 8080:3000 ?',
          [
            'Le port 8080 du conteneur vers le port 3000 de l’hôte',
            'Le port 8080 de l’hôte vers le port 3000 du conteneur',
            'Les ports 8080 à 3000',
            'Une limite de 8080 connexions sur 3000 secondes',
          ],
          1,
          'Toujours hôte:conteneur. Moyen mnémotechnique : on part de l’extérieur pour aller vers l’intérieur.',
        ),
        qcm(
          'Le conteneur tourne, le port est publié, mais curl localhost:8080 répond « connexion refusée ». Les journaux disent « listening on 127.0.0.1:3000 ». Que corriges-tu ?',
          [
            'Publier le port 127.0.0.1',
            'Ouvrir le pare-feu',
            'Faire écouter l’application sur 0.0.0.0',
            'Passer l’application en root',
          ],
          2,
          'Le trafic publié arrive par l’interface réseau du conteneur, pas par sa boucle locale. Une application liée à 127.0.0.1 ne le reçoit jamais.',
        ),
        fill(
          'Publie le port seulement sur la boucle locale de l’hôte.',
          'docker run -d -p ___:8080:3000 api:1.4.2',
          ['127.0.0.1', '0.0.0.0', 'localhost:', 'host'],
          '127.0.0.1',
          'Seuls les programmes de la machine (comme un reverse proxy) peuvent alors joindre le port 8080 ; Internet non.',
        ),
        vf(
          'Les variables d’environnement d’un conteneur sont visibles avec docker inspect.',
          true,
          'C’est pour cela que les secrets sensibles sont mieux transmis sous forme de fichiers montés en lecture seule.',
        ),
        match(
          'Associe chaque méthode à son usage.',
          [
            ['-e LOG_LEVEL=info', 'Une variable ponctuelle'],
            ['--env-file prod.env', 'Plusieurs variables depuis un fichier du serveur'],
            ['ENV dans le Dockerfile', 'Valeur par défaut non secrète, inscrite dans l’image'],
            ['Fichier dans /run/secrets', 'Secret monté en lecture seule'],
          ],
          'Configuration non sensible : variables. Secrets : fichiers, hors image et hors Git.',
        ),
        qcm(
          'docker run renvoie « Bind for 0.0.0.0:80 failed: port is already allocated ». Que se passe-t-il ?',
          [
            'Un autre conteneur ou programme utilise déjà le port 80 de l’hôte',
            'L’image n’expose pas le port 80',
            'Le conteneur n’a pas d’adresse IP',
            'Le pare-feu bloque le port 80',
          ],
          0,
          'docker ps et ss -tlnp montrent qui occupe le port. Choisis un autre port hôte ou arrête l’autre service.',
        ),
        vf(
          'Pour passer d’une base de test à la base de production, il faut reconstruire l’image.',
          false,
          'La configuration se passe au lancement. Une seule image, testée en CI, est promue telle quelle en production : c’est le principe « build once, run anywhere ».',
        ),
        qcm(
          'Où ranger le fichier prod.env qui contient le mot de passe de la base ?',
          [
            'Dans le dépôt Git, dossier config',
            'Dans l’image, copié par le Dockerfile',
            'Dans le README pour l’équipe',
            'Sur le serveur, hors du dépôt, lisible seulement par l’utilisateur de déploiement',
          ],
          3,
          'chmod 600 et propriétaire dédié. Garde une copie chiffrée dans un gestionnaire de mots de passe d’équipe.',
        ),
      ]),

      lesson('recap-conteneurs', 'Récap et pratique', [
        tip(
          'Ce qu’il faut retenir',
          '• docker run [options] image [commande] : les options avant l’image, toujours.\n• -d, --name, --rm, -p hôte:conteneur, -e / --env-file, -v, --restart.\n• docker stop = SIGTERM puis SIGKILL après 10 s ; code 137 = tué par SIGKILL.\n• Diagnostic : docker ps -a → docker logs → docker exec / docker inspect → docker stats.\n• L’application écoute sur 0.0.0.0 dans le conteneur ; on restreint l’exposition côté hôte avec 127.0.0.1:port.\n• Une seule image pour tous les environnements ; la configuration arrive au lancement.\n• Secrets : fichiers montés de préférence, jamais dans l’image ni dans Git.',
        ),
        tip(
          'Scénario de débogage',
          'Tu déploies l’API, et le site affiche une erreur 502. Méthode : docker ps -a montre api en « Restarting (1) ». docker logs --tail 50 api affiche « DATABASE_URL is not defined ». Le fichier d’environnement n’a pas été passé au lancement. Tu recrées le conteneur avec --env-file, puis tu vérifies avec docker logs -f api que le serveur écoute bien, et avec curl depuis le serveur que la route de santé répond.\n\nRetiens l’ordre : état → journaux → configuration → test de bout en bout.',
          'docker ps -a\ndocker logs --tail 50 api\ndocker rm -f api\ndocker run -d --name api --env-file /srv/api/prod.env -p 127.0.0.1:8080:3000 --restart unless-stopped api:1.4.2\ncurl -fsS http://127.0.0.1:8080/health',
        ),
        order(
          'Remets dans l’ordre la démarche de diagnostic d’un conteneur qui plante.',
          [
            'docker ps -a pour voir l’état et le code de sortie',
            'docker logs pour lire l’erreur',
            'docker inspect pour vérifier variables et montages',
            'Corriger la configuration ou l’image',
            'Recréer le conteneur et vérifier avec curl',
          ],
          'On observe avant d’agir, et on termine toujours par un test réel du service.',
        ),
        qcm(
          'Quel est le défaut de cette commande ?',
          [
            'Le nom api est réservé',
            'Il manque --rm',
            'Le mot de passe apparaît dans l’historique du shell et dans docker inspect',
            'Le port 3000 est interdit',
          ],
          2,
          'Préfère --env-file avec un fichier protégé, ou un secret monté en fichier.',
          'docker run -d --name api -e DB_PASSWORD=Sup3rS3cret -p 3000:3000 api:1.4.2',
        ),
        vf(
          'docker logs fonctionne encore sur un conteneur arrêté mais pas supprimé.',
          true,
          'Les journaux sont liés au conteneur. Avec --rm, ils disparaissent dès l’arrêt : évite --rm pour un service que tu dois pouvoir diagnostiquer.',
        ),
        fill(
          'Suis les journaux de l’API en direct.',
          'docker logs ___ api',
          ['-f', '-d', '-it', '-a'],
          '-f',
          '-f (follow) garde le flux ouvert, comme tail -f. Ctrl+C pour quitter sans arrêter le conteneur.',
        ),
        qcm(
          'Tu veux que seule la machine puisse joindre l’API sur le port 8080, car Caddy tourne à côté et sert HTTPS. Quelle publication choisis-tu ?',
          ['-p 127.0.0.1:8080:3000', '-p 8080:3000', '-p 0.0.0.0:8080:3000', '-P'],
          0,
          'Sans adresse, Docker publie sur toutes les interfaces. Avec 127.0.0.1, le port reste interne à la machine.',
        ),
        match(
          'Associe chaque symptôme à sa cause probable.',
          [
            ['Exited (137)', 'Tué par SIGKILL, souvent manque de mémoire'],
            ['Exited (1) au démarrage', 'Erreur de l’application, par exemple variable manquante'],
            ['port is already allocated', 'Port de l’hôte déjà occupé'],
            [
              'Connexion refusée, conteneur actif',
              'Application liée à 127.0.0.1 dans le conteneur',
            ],
          ],
          'Avec ces quatre réflexes, tu résous la majorité des pannes de démarrage.',
        ),
        vf(
          'docker exec peut lancer une commande dans un conteneur arrêté.',
          false,
          'exec exige un conteneur en cours d’exécution. Pour un conteneur arrêté, lis ses journaux, ou relance l’image avec une autre commande pour explorer.',
        ),
        qcm(
          'Ton API met 20 secondes à terminer ses requêtes en cours lors d’un arrêt. Que fais-tu ?',
          [
            'Utiliser docker kill',
            'Ignorer SIGTERM dans le code',
            'Lancer en root',
            'Allonger le délai de grâce, par exemple docker stop -t 30',
          ],
          3,
          'Le délai par défaut est de 10 secondes. Dans Compose, l’équivalent est stop_grace_period: 30s.',
        ),
      ]),
    ],
  ),

  unit(
    'compose',
    'Volumes, réseaux et Docker Compose',
    'Garder les données, relier des conteneurs et décrire toute une application dans un compose.yaml.',
    [
      lesson('volumes-reseaux', 'Volumes et réseaux', [
        tip(
          'Volumes nommés ou montages de dossiers',
          'La couche en écriture d’un conteneur disparaît avec lui. Pour garder des données, on monte un stockage externe :\n\n• Volume nommé (-v pgdata:/var/lib/postgresql/data) : géré par Docker (sous /var/lib/docker/volumes), il survit à la suppression du conteneur. C’est le bon choix pour une base de données en production.\n• Montage de dossier, ou bind mount (-v ./Caddyfile:/etc/caddy/Caddyfile:ro) : un fichier ou dossier précis de l’hôte. Idéal pour un fichier de configuration (:ro = lecture seule) ou pour le code en développement.\n• tmpfs : en mémoire, effacé à l’arrêt, pour des fichiers temporaires.\n\nPièges : docker volume rm ou docker compose down -v effacent les données pour de bon ; un volume n’est pas une sauvegarde ; et lis la documentation de l’image pour connaître le bon chemin (à partir de postgres:18, l’image conseille de monter /var/lib/postgresql).',
          'docker volume create pgdata\ndocker run -d --name db -e POSTGRES_PASSWORD_FILE=/run/secrets/db -v pgdata:/var/lib/postgresql/data postgres:17-alpine\ndocker volume ls',
        ),
        tip(
          'Les réseaux Docker',
          'Sur le réseau bridge par défaut, les conteneurs ne se trouvent pas par leur nom. Sur un réseau que tu crées (docker network create app-net), Docker fournit un DNS interne : le conteneur api joint la base à l’adresse db:5432, quel que soit son IP.\n\nEntre conteneurs, on utilise le port interne du conteneur (5432), pas un port publié : la base n’a donc besoin d’aucun -p. Ne publie que ce qui doit être joint depuis l’extérieur, en général le reverse proxy sur 80 et 443. Compose crée automatiquement un réseau par projet, ce qui rend tout cela transparent.',
          'docker network create app-net\ndocker run -d --name db --network app-net postgres:17-alpine\ndocker run -d --name api --network app-net -e DATABASE_HOST=db api:1.4.2',
        ),
        qcm(
          'Quel stockage choisir pour les données PostgreSQL en production ?',
          [
            'La couche en écriture du conteneur',
            'Un tmpfs',
            'Un volume nommé',
            'Le dossier /tmp de l’image',
          ],
          2,
          'Le volume nommé survit à la recréation du conteneur et est géré par Docker. Ajoute des sauvegardes régulières : un volume peut être supprimé ou corrompu.',
        ),
        vf(
          'Sur un réseau créé avec docker network create, un conteneur peut joindre un autre conteneur par son nom.',
          true,
          'Les réseaux définis par l’utilisateur ont un DNS intégré. Le réseau bridge par défaut ne l’a pas.',
        ),
        fill(
          'Monte le fichier de configuration en lecture seule.',
          'docker run -d -v ./Caddyfile:/etc/caddy/Caddyfile:___ caddy:2-alpine',
          ['ro', 'rw', 'readonly=1', 'lock'],
          'ro',
          ':ro empêche le conteneur de modifier le fichier de l’hôte : un compromis du conteneur ne peut pas réécrire ta configuration.',
        ),
        qcm(
          'L’API et la base sont sur le même réseau Docker. Quelle adresse l’API doit-elle utiliser ?',
          ['localhost:5432', 'db:5432', 'IP publique du serveur:5432', '127.0.0.1:5433'],
          1,
          'localhost, dans le conteneur de l’API, désigne l’API elle-même. Le nom du conteneur (ou du service Compose) est résolu par le DNS de Docker.',
        ),
        match(
          'Associe chaque stockage à son usage typique.',
          [
            ['Volume nommé', 'Données de base de données'],
            ['Montage de dossier', 'Fichier de configuration ou code en développement'],
            ['tmpfs', 'Fichiers temporaires en mémoire'],
            ['Couche en écriture', 'Rien d’important : elle disparaît avec le conteneur'],
          ],
          'Règle simple : tout ce qui doit survivre au conteneur vit hors du conteneur.',
        ),
        vf(
          'Pour que l’API joigne la base sur le même réseau, il faut publier le port de la base avec -p 5432:5432.',
          false,
          'La publication ne sert qu’à l’accès depuis l’hôte ou l’extérieur. Publier la base l’expose inutilement, parfois à tout Internet.',
        ),
      ]),

      lesson('compose-bases', 'Un premier compose.yaml', [
        tip(
          'Décrire l’application dans un fichier',
          'Taper de longues commandes docker run devient vite ingérable. Docker Compose décrit tous les services (API, base, proxy) dans un fichier compose.yaml, versionné avec le code. La commande est docker compose (avec un espace), le plugin Compose v2 ; l’ancien binaire docker-compose (v1) n’est plus maintenu, et la clé version: en tête de fichier est obsolète.\n\nCompose crée un réseau pour le projet : chaque service est joignable par son nom. Les volumes nommés se déclarent dans la section volumes du haut. Le nom du projet est par défaut celui du dossier.\n\nCommandes de base : docker compose up -d (créer et démarrer), ps, logs -f api, exec api sh, down (arrêter et supprimer conteneurs et réseau, mais pas les volumes), up -d --build (reconstruire puis relancer), pull (tirer les nouvelles images).',
          'services:\n  api:\n    build: .\n    ports:\n      - "127.0.0.1:8080:3000"\n    environment:\n      DATABASE_URL: postgres://app:${POSTGRES_PASSWORD}@db:5432/app\n    restart: unless-stopped\n  db:\n    image: postgres:17-alpine\n    environment:\n      POSTGRES_USER: app\n      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}\n    volumes:\n      - pgdata:/var/lib/postgresql/data\n    restart: unless-stopped\n\nvolumes:\n  pgdata:',
        ),
        tip(
          'Variables et fichier .env',
          'Compose remplace ${POSTGRES_PASSWORD} par la valeur trouvée dans l’environnement du shell ou dans le fichier .env du dossier du projet. Attention : ce .env sert à l’interpolation du compose.yaml, il n’est pas injecté tel quel dans les conteneurs. Pour passer un fichier entier de variables à un service, utilise env_file.\n\nAvec ${POSTGRES_PASSWORD:?mot de passe requis}, Compose refuse de démarrer si la variable manque, au lieu de lancer une base sans mot de passe. Le .env de production reste sur le serveur, ajouté au .gitignore. docker compose config affiche le fichier final après interpolation, pratique pour vérifier.',
        ),
        qcm(
          'Quelle commande démarre tous les services du compose.yaml en arrière-plan ?',
          [
            'docker compose start all',
            'docker-compose run -d',
            'docker compose up -d',
            'docker compose build',
          ],
          2,
          'up crée les conteneurs manquants et les démarre ; -d les détache du terminal. build ne fait que construire les images.',
        ),
        vf(
          'docker compose down supprime aussi les volumes nommés, donc les données de la base.',
          false,
          'down supprime conteneurs et réseau. Il faut ajouter -v pour supprimer les volumes : à ne jamais taper machinalement en production.',
        ),
        fill(
          'Déclare le volume nommé utilisé par la base.',
          'services:\n  db:\n    image: postgres:17-alpine\n    volumes:\n      - pgdata:/var/lib/postgresql/data\n\n___:\n  pgdata:',
          ['volumes', 'storage', 'mounts', 'disks'],
          'volumes',
          'Un volume nommé utilisé par un service doit être déclaré dans la section volumes de premier niveau.',
        ),
        qcm(
          'Le fichier .env placé à côté de compose.yaml sert d’abord à…',
          [
            'Remplacer les ${VARIABLES} du compose.yaml',
            'Être copié dans l’image',
            'Configurer Docker Engine',
            'Stocker les journaux',
          ],
          0,
          'C’est le fichier d’interpolation par défaut. Pour injecter des variables dans un conteneur, on utilise environment ou env_file.',
        ),
        match(
          'Associe chaque commande Compose à son effet.',
          [
            ['docker compose ps', 'État des services'],
            ['docker compose logs -f api', 'Journaux de l’API en direct'],
            ['docker compose up -d --build', 'Reconstruire et relancer'],
            ['docker compose config', 'Afficher le fichier final interpolé'],
            ['docker compose pull', 'Tirer les nouvelles images'],
          ],
          'Toutes ces commandes se lancent depuis le dossier qui contient compose.yaml.',
        ),
        vf(
          'Dans un même projet Compose, le service api peut joindre la base à l’adresse db:5432.',
          true,
          'Compose crée un réseau par projet, et chaque nom de service y devient un nom DNS.',
        ),
      ]),

      lesson('healthcheck-profils', 'depends_on, healthcheck, secrets et profils', [
        tip(
          'Attendre que la base soit prête',
          'depends_on: [db] ne règle que l’ordre de démarrage : l’API démarre dès que le conteneur de la base est lancé, alors que PostgreSQL met quelques secondes à accepter des connexions. Résultat : l’API plante au premier démarrage.\n\nLa solution : un healthcheck sur la base et depends_on avec condition: service_healthy. Compose attend alors que la base soit déclarée saine. Les autres conditions sont service_started (le défaut) et service_completed_successfully (par exemple attendre la fin d’un service de migration). Garde quand même des tentatives de reconnexion dans ton code : la base peut redémarrer plus tard.',
          'services:\n  api:\n    build: .\n    depends_on:\n      db:\n        condition: service_healthy\n  db:\n    image: postgres:17-alpine\n    healthcheck:\n      test: ["CMD-SHELL", "pg_isready -U app -d app"]\n      interval: 10s\n      timeout: 5s\n      retries: 5\n      start_period: 20s',
        ),
        tip(
          'Secrets et profils',
          'Les secrets de Compose montent un fichier en lecture seule dans /run/secrets/<nom> : le mot de passe n’apparaît ni dans docker inspect ni dans l’environnement. L’image postgres lit POSTGRES_PASSWORD_FILE.\n\nLes profils servent aux services optionnels : un service avec profiles: [outils] (par exemple Adminer) ne démarre qu’avec docker compose --profile outils up -d. En production, il reste éteint.\n\nPour adapter le fichier à l’environnement, Compose fusionne automatiquement compose.override.yaml (pratique en développement), et on peut combiner des fichiers : docker compose -f compose.yaml -f compose.prod.yaml up -d.',
          'services:\n  db:\n    image: postgres:17-alpine\n    environment:\n      POSTGRES_PASSWORD_FILE: /run/secrets/db_password\n    secrets:\n      - db_password\n  adminer:\n    image: adminer\n    profiles: [outils]\n\nsecrets:\n  db_password:\n    file: ./secrets/db_password.txt',
        ),
        qcm(
          'Avec depends_on: [db] seul, que garantit Compose ?',
          [
            'Que la base accepte les connexions avant l’API',
            'Que le conteneur db est démarré avant l’API, sans plus',
            'Que l’API redémarre si la base tombe',
            'Que les deux services partagent un volume',
          ],
          1,
          'Démarré ne veut pas dire prêt. Pour attendre la disponibilité réelle, combine healthcheck et condition: service_healthy.',
        ),
        fill(
          'Fais attendre l’API jusqu’à ce que la base soit saine.',
          'depends_on:\n  db:\n    condition: ___',
          ['service_healthy', 'service_started', 'running', 'ready'],
          'service_healthy',
          'service_healthy s’appuie sur le healthcheck défini pour le service db.',
        ),
        vf(
          'Un service qui a profiles: [outils] démarre avec un simple docker compose up -d.',
          false,
          'Il ne démarre que si le profil est activé, avec --profile outils ou la variable COMPOSE_PROFILES.',
        ),
        qcm(
          'Où l’image reçoit-elle un secret déclaré dans la section secrets de Compose ?',
          [
            'Dans une variable d’environnement',
            'Dans le Dockerfile',
            'Dans l’historique de l’image',
            'Dans un fichier sous /run/secrets/',
          ],
          3,
          'Le fichier est monté en lecture seule au lancement. Il n’entre jamais dans l’image.',
        ),
        qcm(
          'Quelle commande de healthcheck convient à PostgreSQL ?',
          ['pg_isready', 'docker ps', 'curl http://db', 'ping db'],
          0,
          'pg_isready, fourni avec l’image, vérifie que le serveur accepte les connexions. ping ne vérifie que le réseau.',
        ),
        match(
          'Associe chaque condition de depends_on à sa signification.',
          [
            ['service_started', 'Le conteneur est lancé'],
            ['service_healthy', 'Le healthcheck est au vert'],
            ['service_completed_successfully', 'Le service s’est terminé avec le code 0'],
          ],
          'La dernière sert par exemple à lancer une migration avant l’API.',
        ),
      ]),

      lesson('recap-compose', 'Récap et pratique', [
        tip(
          'Ce qu’il faut retenir',
          '• Volume nommé pour les données, montage de dossier pour la configuration (:ro) ; down -v efface les volumes.\n• Sur un réseau Docker (et dans Compose), on se joint par le nom du service et le port interne.\n• Ne publie que le proxy ; la base n’a pas de ports.\n• docker compose (v2) et compose.yaml ; pas de clé version.\n• .env = interpolation du fichier ; env_file = variables du conteneur ; ${VAR:?} pour exiger une valeur.\n• depends_on + healthcheck + service_healthy pour attendre la base.\n• Secrets en fichiers dans /run/secrets ; profils pour les outils optionnels.\n• restart: unless-stopped sur les services de production.',
        ),
        qcm(
          'Que manque-t-il à ce compose.yaml de production ?',
          [
            'Rien, il est parfait',
            'Un volume pour les données, et ne pas publier le port de la base',
            'La clé version: "3"',
            'Un Dockerfile pour postgres',
          ],
          1,
          'Sans volume, les données disparaissent à la recréation du conteneur ; avec ports, la base est exposée à Internet.',
          'services:\n  db:\n    image: postgres:17-alpine\n    ports:\n      - "5432:5432"\n    environment:\n      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}',
        ),
        vf(
          'La clé version en tête de compose.yaml est obsolète avec Compose v2.',
          true,
          'Compose suit la Compose Specification et ignore cette clé, en affichant un avertissement.',
        ),
        order(
          'Remets dans l’ordre le démarrage d’une API qui attend la base.',
          [
            'Compose crée le réseau et le volume',
            'Le conteneur db démarre',
            'Le healthcheck de db passe au vert',
            'Le conteneur api démarre',
          ],
          'Avec condition: service_healthy, l’API n’est lancée qu’une fois la base prête.',
        ),
        fill(
          'Exige la variable : Compose refusera de démarrer si elle manque.',
          'POSTGRES_PASSWORD: ${POSTGRES_PASSWORD___}',
          [':?mot de passe requis', ':-postgres', '?', '!'],
          ':?mot de passe requis',
          ':? affiche le message et arrête Compose ; :- fournirait une valeur par défaut, dangereuse pour un mot de passe.',
        ),
        qcm(
          'Tu as modifié le code de l’API. Quelle commande reconstruit et relance seulement ce qui a changé ?',
          [
            'docker compose restart',
            'docker compose down -v && docker compose up',
            'docker compose start',
            'docker compose up -d --build',
          ],
          3,
          'restart ne reconstruit pas l’image. down -v effacerait les données de la base.',
        ),
        match(
          'Associe chaque besoin à la bonne clé Compose.',
          [
            ['Garder les données', 'volumes'],
            ['Attendre un service', 'depends_on'],
            ['Redémarrer après un plantage', 'restart'],
            ['Service optionnel', 'profiles'],
            ['Mot de passe en fichier', 'secrets'],
          ],
          'Ces cinq clés suffisent pour un compose.yaml de production solide.',
        ),
      ]),
    ],
  ),

  unit(
    'mise-en-ligne',
    'Serveur, domaine et HTTPS',
    'Préparer un VPS Linux sûr, relier un nom de domaine et servir l’application en HTTPS.',
    [
      lesson('vps-pare-feu', 'Préparer un VPS et son pare-feu', [
        tip(
          'Un VPS propre et sécurisé',
          'Un VPS de 2 Go de RAM sous Ubuntu LTS suffit largement pour une API, une base PostgreSQL et un reverse proxy. Choisis un centre de données proche de tes utilisateurs : moins de latence. Sur 2 Go, ajoute un fichier d’échange (swap) pour éviter que le système tue un processus au premier pic.\n\nPremières étapes :\n\n• Crée un utilisateur avec sudo et connecte-toi avec une clé SSH (ssh-keygen -t ed25519, puis ssh-copy-id).\n• Dans /etc/ssh/sshd_config : PasswordAuthentication no et PermitRootLogin no. Garde une session ouverte pendant que tu testes, pour ne pas t’enfermer dehors.\n• Installe Docker depuis le dépôt officiel de Docker, et active les mises à jour de sécurité automatiques (unattended-upgrades).\n• Attention : le groupe docker équivaut à root. N’y ajoute que l’utilisateur de déploiement.',
          'ssh-keygen -t ed25519 -C "deploiement"\nssh-copy-id deploy@203.0.113.10\nsudo systemctl reload ssh',
        ),
        tip(
          'Pare-feu : n’ouvrir que l’essentiel',
          'Avec ufw : tout refuser en entrée, puis autoriser SSH (avant d’activer le pare-feu !), 80 et 443.\n\nPiège majeur : les ports publiés par Docker contournent ufw. Docker écrit ses propres règles iptables, traitées avant celles d’ufw : un -p 5432:5432 expose la base à Internet même si ufw ne l’autorise pas. Donc : ne publie que le proxy (80 et 443), lie les autres ports à 127.0.0.1, ou ne les publie pas du tout. Vérifie avec ss -tlnp sur le serveur et un scan depuis l’extérieur.',
          'sudo ufw default deny incoming\nsudo ufw allow OpenSSH\nsudo ufw allow 80/tcp\nsudo ufw allow 443/tcp\nsudo ufw enable',
        ),
        qcm(
          'Ton compose.yaml publie "5432:5432" pour la base et ufw n’autorise que 22, 80 et 443. La base est-elle joignable depuis Internet ?',
          [
            'Non, ufw la bloque',
            'Seulement en IPv6',
            'Oui : les ports publiés par Docker contournent les règles d’ufw',
            'Non, PostgreSQL refuse les connexions externes par défaut dans Docker',
          ],
          2,
          'Docker insère ses règles iptables avant celles d’ufw. Retire la publication ou lie-la à 127.0.0.1.',
        ),
        order(
          'Remets dans l’ordre la configuration du pare-feu sans perdre l’accès SSH.',
          [
            'sudo ufw default deny incoming',
            'sudo ufw allow OpenSSH',
            'sudo ufw allow 80/tcp',
            'sudo ufw allow 443/tcp',
            'sudo ufw enable',
          ],
          'Autoriser SSH avant d’activer : sinon ta session suivante sera refusée.',
        ),
        vf(
          'Ajouter un utilisateur au groupe docker lui donne en pratique les droits de root sur la machine.',
          true,
          'Il peut lancer un conteneur qui monte / de l’hôte. Réserve ce groupe à l’utilisateur de déploiement.',
        ),
        fill(
          'Interdis la connexion SSH par mot de passe.',
          '# /etc/ssh/sshd_config\nPasswordAuthentication ___',
          ['no', 'yes', 'prohibit', 'keys'],
          'no',
          'Avec seulement des clés, les attaques par force brute sur les mots de passe deviennent inutiles.',
        ),
        qcm(
          'Ton VPS de 2 Go tue parfois PostgreSQL lors des pics. Quelle mesure simple aide d’abord ?',
          [
            'Ouvrir plus de ports',
            'Ajouter un fichier d’échange (swap) et limiter la mémoire des conteneurs',
            'Passer les conteneurs en root',
            'Désactiver le pare-feu',
          ],
          1,
          'Le swap absorbe les pics, et les limites mémoire empêchent un service de priver les autres.',
        ),
      ]),

      lesson('dns-https', 'Nom de domaine, reverse proxy et HTTPS', [
        tip(
          'DNS : relier le domaine au serveur',
          'Chez ton bureau d’enregistrement, crée un enregistrement A (adresse IPv4) et, si ton VPS en a une, AAAA (IPv6) qui pointent vers le serveur : api.exemple.com → 203.0.113.10. Un CNAME fait d’un nom un alias d’un autre nom (www → exemple.com). Le TTL indique combien de temps les résolveurs gardent la réponse en cache : baisse-le avant une migration pour que le changement se propage vite. Vérifie avec dig +short api.exemple.com.',
        ),
        tip(
          'Reverse proxy et Let’s Encrypt',
          'Le reverse proxy (Caddy ou Nginx) est le seul service exposé sur 80 et 443. Il termine HTTPS, redirige HTTP vers HTTPS, envoie chaque domaine vers le bon conteneur, compresse et ajoute des en-têtes de sécurité.\n\nCaddy obtient et renouvelle tout seul les certificats Let’s Encrypt, gratuits et de courte durée (90 jours, durée que Let’s Encrypt prévoit de raccourcir) : le renouvellement doit être automatique. Pour valider le domaine, Let’s Encrypt doit joindre ton serveur : le DNS doit pointer vers lui et les ports 80/443 doivent être ouverts. Persiste le dossier /data de Caddy dans un volume, sinon les certificats sont redemandés à chaque redémarrage et tu atteins les limites de Let’s Encrypt.\n\nAvec Nginx, on utilise certbot (certbot --nginx -d api.exemple.com) et son renouvellement programmé. Derrière un proxy, configure ton application pour faire confiance au proxy (trust proxy dans Express) afin de lire la vraie IP du client.',
          '# Caddyfile\napi.exemple.com {\n  reverse_proxy api:3000\n}\n\n# compose.yaml (extrait)\n  caddy:\n    image: caddy:2-alpine\n    ports:\n      - "80:80"\n      - "443:443"\n    volumes:\n      - ./Caddyfile:/etc/caddy/Caddyfile:ro\n      - caddy_data:/data\n    restart: unless-stopped',
        ),
        match(
          'Associe chaque enregistrement DNS à son rôle.',
          [
            ['A', 'Nom vers adresse IPv4'],
            ['AAAA', 'Nom vers adresse IPv6'],
            ['CNAME', 'Alias vers un autre nom'],
            ['TTL', 'Durée de mise en cache de la réponse'],
          ],
          'Avant de demander un certificat, vérifie avec dig que le nom pointe bien vers ton serveur.',
        ),
        qcm(
          'Caddy n’arrive pas à obtenir de certificat pour api.exemple.com. Quelle cause est la plus probable ?',
          [
            'Le DNS ne pointe pas encore vers le serveur, ou le port 80/443 est fermé',
            'L’API n’a pas d’EXPOSE',
            'L’image Caddy est trop récente',
            'Let’s Encrypt est payant pour les sous-domaines',
          ],
          0,
          'Let’s Encrypt valide le domaine en contactant le serveur. Vérifie dig, le pare-feu et les journaux de Caddy.',
        ),
        fill(
          'Envoie le trafic du domaine vers le service api.',
          'api.exemple.com {\n  ___ api:3000\n}',
          ['reverse_proxy', 'proxy_pass', 'forward', 'upstream'],
          'reverse_proxy',
          'reverse_proxy est la directive de Caddy ; proxy_pass est l’équivalent dans Nginx.',
        ),
        vf(
          'Il faut persister le dossier /data de Caddy dans un volume.',
          true,
          'Il contient les certificats et les clés. Sans volume, chaque recréation redemande des certificats et peut se heurter aux limites de Let’s Encrypt.',
        ),
        qcm(
          'Derrière Caddy, ton API Express enregistre toujours la même IP pour tous les clients. Pourquoi ?',
          [
            'Le DNS est mal configuré',
            'HTTPS masque les IP',
            'Docker change les IP au hasard',
            'L’application voit l’IP du proxy ; il faut lui dire de faire confiance au proxy (trust proxy)',
          ],
          3,
          'Le proxy transmet l’IP d’origine dans X-Forwarded-For ; Express ne la lit que si trust proxy est configuré.',
        ),
        qcm(
          'Quel service doit publier les ports 80 et 443 ?',
          ['L’API', 'La base de données', 'Le reverse proxy uniquement', 'Tous les services'],
          2,
          'Un seul point d’entrée, chiffré. Les autres services restent sur le réseau interne de Compose.',
        ),
      ]),

      lesson('recap-mise-en-ligne', 'Récap et pratique', [
        tip(
          'La mise en ligne en une page',
          '1. VPS Ubuntu LTS proche des utilisateurs, utilisateur sudo, clés SSH, mots de passe et root désactivés.\n2. Docker depuis le dépôt officiel, mises à jour de sécurité automatiques, swap sur les petites machines.\n3. ufw : 22, 80, 443 seulement, en sachant que Docker contourne ufw pour les ports publiés.\n4. DNS : A (et AAAA) vers le serveur, TTL raisonnable.\n5. Caddy (ou Nginx + certbot) seul exposé, certificats Let’s Encrypt renouvelés automatiquement, /data persistant.\n6. Vérification finale : https:// fonctionne, http:// redirige, le parcours principal marche depuis un vrai téléphone, hors du réseau de l’équipe.',
        ),
        order(
          'Remets dans l’ordre la première mise en ligne.',
          [
            'Créer l’utilisateur et installer la clé SSH',
            'Configurer le pare-feu',
            'Installer Docker',
            'Faire pointer le DNS vers le serveur',
            'Lancer docker compose up -d avec Caddy',
            'Tester l’adresse https depuis un téléphone',
          ],
          'Le DNS doit pointer vers le serveur avant le démarrage de Caddy, pour que le certificat puisse être obtenu.',
        ),
        vf(
          'Un certificat Let’s Encrypt est valable un an et se renouvelle à la main.',
          false,
          'Il est de courte durée (90 jours aujourd’hui) et se renouvelle automatiquement : Caddy le fait seul, certbot via une tâche programmée.',
        ),
        qcm(
          'Que vérifie dig +short api.exemple.com ?',
          [
            'Que le certificat est valide',
            'Que le nom pointe vers la bonne adresse IP',
            'Que le port 443 est ouvert',
            'Que l’API répond',
          ],
          1,
          'dig interroge le DNS. Pour HTTPS, teste ensuite avec curl -I https://api.exemple.com.',
        ),
        qcm(
          'Quelle configuration SSH est la plus sûre pour un serveur de production ?',
          [
            'Root avec mot de passe fort',
            'Mot de passe et clé acceptés',
            'Utilisateur dédié, clé ed25519, mots de passe et root interdits',
            'SSH désactivé, administration par le panneau web uniquement',
          ],
          2,
          'Les clés résistent à la force brute ; interdire root oblige à passer par un compte nominatif et sudo.',
        ),
        match(
          'Associe chaque outil à son rôle.',
          [
            ['ufw', 'Pare-feu de l’hôte'],
            ['Caddy', 'Reverse proxy avec HTTPS automatique'],
            ['certbot', 'Obtenir des certificats pour Nginx'],
            ['dig', 'Interroger le DNS'],
            ['ss -tlnp', 'Lister les ports en écoute'],
          ],
          'Ces outils couvrent la mise en ligne et sa vérification.',
        ),
      ]),
    ],
  ),

  unit(
    'cicd-exploitation',
    'CI/CD et exploitation',
    'Automatiser tests, images et déploiement avec GitHub Actions, puis faire vivre la production.',
    [
      lesson('github-actions', 'Tester et publier l’image avec GitHub Actions', [
        tip(
          'Un workflow en deux jobs',
          'Un workflow GitHub Actions est un fichier YAML dans .github/workflows/. Il se déclenche sur des événements (on: push, pull_request) et contient des jobs, faits d’étapes (steps) : uses pour une action existante, run pour une commande.\n\nÀ chaque pull request : installer (npm ci), lint, typage, tests, build. Sur main seulement : construire l’image et la pousser sur le registre. needs: test fait attendre le job image que les tests passent.\n\nPour GHCR, le jeton GITHUB_TOKEN suffit si le job a permissions: packages: write. Étiquette l’image avec le SHA du commit (github.sha). Attention : un nom d’image doit être en minuscules, alors qu’un nom de dépôt peut contenir des majuscules. Les secrets (secrets.X) sont chiffrés et masqués dans les journaux : jamais de mot de passe en clair dans le YAML.',
          "name: ci\non:\n  push:\n    branches: [main]\n  pull_request:\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 22\n          cache: npm\n      - run: npm ci\n      - run: npm run lint && npm test && npm run build\n  image:\n    needs: test\n    if: github.ref == 'refs/heads/main'\n    runs-on: ubuntu-latest\n    permissions:\n      contents: read\n      packages: write\n    steps:\n      - uses: actions/checkout@v4\n      - uses: docker/login-action@v3\n        with:\n          registry: ghcr.io\n          username: ${{ github.actor }}\n          password: ${{ secrets.GITHUB_TOKEN }}\n      - uses: docker/build-push-action@v6\n        with:\n          push: true\n          tags: ghcr.io/awa-dev/api:${{ github.sha }}",
        ),
        qcm(
          'Où se trouvent les fichiers de workflow GitHub Actions ?',
          ['.github/workflows/', '.actions/', 'ci/github.yml', 'À la racine, dans actions.yaml'],
          0,
          'Chaque fichier .yml de ce dossier est un workflow indépendant.',
        ),
        fill(
          'Fais attendre la construction de l’image jusqu’à la réussite des tests.',
          'image:\n  ___: test\n  runs-on: ubuntu-latest',
          ['needs', 'after', 'depends_on', 'requires'],
          'needs',
          'needs crée une dépendance entre jobs. Sans lui, les jobs tournent en parallèle.',
        ),
        vf(
          'Pour pousser sur GHCR depuis Actions, le job doit avoir la permission packages: write.',
          true,
          'Le GITHUB_TOKEN a des droits limités par défaut ; on les élargit seulement pour le job qui en a besoin.',
        ),
        qcm(
          'Que doit faire la CI à chaque pull request ?',
          [
            'Déployer en production',
            'Pousser l’image sous latest',
            'Supprimer les anciennes images du serveur',
            'Lint, typage, tests et build, sans déployer',
          ],
          3,
          'On vérifie avant de fusionner. Le déploiement part de main, une fois le code relu et testé.',
        ),
        qcm(
          'Le push de l’image échoue avec « repository name must be lowercase ». Le dépôt s’appelle Awa-Dev/API. Que fais-tu ?',
          [
            'Renommer le dépôt GitHub',
            'Écrire le nom de l’image en minuscules',
            'Utiliser Docker Hub',
            'Désactiver le cache',
          ],
          1,
          'Les noms d’images Docker n’acceptent que des minuscules ; le nom du dépôt GitHub, lui, peut garder ses majuscules.',
        ),
        match(
          'Associe chaque élément du workflow à son rôle.',
          [
            ['on', 'Événements déclencheurs'],
            ['jobs', 'Groupes d’étapes sur une machine'],
            ['uses', 'Réutiliser une action existante'],
            ['run', 'Exécuter une commande'],
            ['secrets', 'Valeurs chiffrées et masquées'],
          ],
          'Un job tourne sur un runner neuf : il recommence par actions/checkout.',
        ),
      ]),

      lesson('deploiement-ssh', 'Déployer par SSH', [
        tip(
          'Le job de déploiement',
          'Après le push de l’image, un dernier job se connecte au serveur en SSH et met à jour les conteneurs : docker compose pull puis docker compose up -d, qui ne recrée que les services dont l’image a changé.\n\n• Une clé SSH dédiée au déploiement, stockée dans les secrets du dépôt (SSH_KEY), et l’empreinte du serveur dans SSH_KNOWN_HOSTS, pour ne pas désactiver la vérification de l’hôte.\n• Le serveur se connecte au registre (docker login ghcr.io) s’il est privé.\n• Le tag à déployer passe en variable (IMAGE_TAG=${{ github.sha }}), utilisée par le compose.yaml : image: ghcr.io/awa-dev/api:${IMAGE_TAG}.\n• concurrency empêche deux déploiements simultanés ; un environnement GitHub (environment: production) peut exiger une approbation.\n• Termine par un test : curl -fsS https://api.exemple.com/health. S’il échoue, redéploie le tag précédent.',
          'deploy:\n  needs: image\n  runs-on: ubuntu-latest\n  environment: production\n  concurrency: production\n  steps:\n    - run: |\n        mkdir -p ~/.ssh\n        echo "${{ secrets.SSH_KEY }}" > ~/.ssh/id_ed25519\n        chmod 600 ~/.ssh/id_ed25519\n        echo "${{ secrets.SSH_KNOWN_HOSTS }}" > ~/.ssh/known_hosts\n        ssh deploy@${{ secrets.SSH_HOST }} "cd /srv/api && IMAGE_TAG=${{ github.sha }} docker compose pull && IMAGE_TAG=${{ github.sha }} docker compose up -d"\n    - run: curl -fsS https://api.exemple.com/health',
        ),
        qcm(
          'Sur le serveur, quelle séquence met à jour l’API vers la nouvelle image ?',
          [
            'docker compose down -v puis up',
            'docker compose restart',
            'docker compose pull puis docker compose up -d',
            'docker system prune -a',
          ],
          2,
          'pull récupère la nouvelle image, up -d recrée les conteneurs concernés. restart relance l’ancienne image.',
        ),
        vf(
          'Ajouter StrictHostKeyChecking=no est une bonne pratique pour éviter les erreurs SSH en CI.',
          false,
          'Cela désactive la protection contre l’usurpation du serveur. Enregistre plutôt l’empreinte du serveur dans un secret known_hosts.',
        ),
        qcm(
          'Le déploiement est fait, mais la route /health répond 500. Quel retour arrière est le plus simple ?',
          [
            'Redéployer le tag (SHA) précédent',
            'Corriger le code directement sur le serveur',
            'Supprimer le volume de la base',
            'Attendre que ça passe',
          ],
          0,
          'Avec des images étiquetées par SHA, revenir en arrière revient à relancer l’image d’avant : quelques secondes.',
        ),
        fill(
          'Empêche deux déploiements de tourner en même temps.',
          'deploy:\n  ___: production\n  runs-on: ubuntu-latest',
          ['concurrency', 'needs', 'lock', 'serial'],
          'concurrency',
          'Les jobs qui partagent le même groupe concurrency s’exécutent un par un.',
        ),
        match(
          'Associe chaque secret à son usage.',
          [
            ['SSH_KEY', 'Clé privée de déploiement'],
            ['SSH_KNOWN_HOSTS', 'Empreinte attendue du serveur'],
            ['SSH_HOST', 'Adresse du serveur'],
            ['GITHUB_TOKEN', 'Pousser l’image sur GHCR'],
          ],
          'GITHUB_TOKEN est fourni automatiquement ; les trois autres se créent dans les réglages du dépôt.',
        ),
        vf(
          'Une migration de base doit rester compatible avec l’ancienne version de l’application pendant le déploiement.',
          true,
          'Ancienne et nouvelle versions coexistent un instant : on ajoute d’abord (colonne, table), on retire plus tard.',
        ),
      ]),

      lesson('exploitation', 'Journaux, redémarrages, sauvegardes et mises à jour', [
        tip(
          'Garder le service debout',
          '• Redémarrage : restart: unless-stopped relance un conteneur qui plante et le redémarre avec le serveur, sauf si tu l’as arrêté volontairement (always le relancerait même dans ce cas au redémarrage de Docker). Attention : avec Docker seul, un conteneur marqué unhealthy n’est pas redémarré automatiquement ; le healthcheck sert à l’ordre de démarrage et à la supervision.\n• Journaux : le pilote json-file par défaut ne fait pas tourner les fichiers et peut remplir le disque. Limite-les (max-size et max-file, ou le pilote local) dans /etc/docker/daemon.json ; cela s’applique aux conteneurs créés ensuite.\n• Supervision : un service externe interroge /health chaque minute et t’alerte ; surveille aussi le disque (df -h, docker system df), la mémoire (docker stats) et les erreurs.\n• Mises à jour : reconstruis régulièrement avec --pull, applique les mises à jour de l’OS, nettoie les vieilles images (docker image prune). Une version majeure de PostgreSQL exige un export et une restauration (ou pg_upgrade), pas un simple changement de tag.',
          '{\n  "log-driver": "json-file",\n  "log-opts": { "max-size": "10m", "max-file": "3" }\n}',
        ),
        tip(
          'Sauvegarder et restaurer',
          'Un volume n’est pas une sauvegarde. Planifie chaque nuit un pg_dump (avec -T pour que la sortie binaire ne soit pas abîmée par un terminal), copie le fichier hors du serveur, chiffré, et garde plusieurs jours d’historique. Règle 3-2-1 : trois copies, deux supports, une hors site.\n\nUne sauvegarde jamais restaurée n’existe pas : teste régulièrement la restauration sur une base vide.',
          '# Sauvegarde (cron, chaque nuit)\ndocker compose exec -T db pg_dump -U app -Fc app > /srv/backups/app-$(date +%F).dump\n\n# Restauration\ndocker compose exec -T db pg_restore -U app -d app --clean < /srv/backups/app-2026-11-10.dump',
        ),
        qcm(
          'Le disque du serveur est plein après trois mois, sans que la base ait grossi. Cause fréquente ?',
          [
            'Les certificats HTTPS',
            'Le swap',
            'Les journaux des conteneurs et les vieilles images jamais nettoyés',
            'Le fichier compose.yaml',
          ],
          2,
          'Configure la rotation des journaux et nettoie les images inutilisées ; docker system df montre où part la place.',
        ),
        vf(
          'Avec Docker seul, un conteneur dont le healthcheck passe à unhealthy est redémarré automatiquement.',
          false,
          'Docker Engine marque seulement l’état. La politique restart ne réagit qu’à l’arrêt du processus. Une alerte de supervision doit prévenir.',
        ),
        fill(
          'Sauvegarde la base sans terminal interactif, pour ne pas corrompre la sortie.',
          'docker compose exec ___ db pg_dump -U app -Fc app > app.dump',
          ['-T', '-it', '-d', '--rm'],
          '-T',
          '-T désactive l’allocation d’un pseudo-terminal, qui peut altérer une sortie binaire redirigée vers un fichier.',
        ),
        qcm(
          'Qu’est-ce qu’une sauvegarde fiable ?',
          [
            'Une copie sur le même disque',
            'Un volume Docker',
            'Une copie hebdomadaire jamais relue',
            'Automatique, chiffrée, hors du serveur, avec restauration testée',
          ],
          3,
          'Si le serveur disparaît, une copie sur son disque disparaît avec lui.',
        ),
        match(
          'Associe chaque politique de redémarrage à son comportement.',
          [
            ['no', 'Jamais de redémarrage (défaut)'],
            ['on-failure', 'Seulement si le code de sortie est non nul'],
            ['unless-stopped', 'Toujours, sauf arrêt volontaire'],
            ['always', 'Toujours, même après un arrêt manuel au redémarrage du démon'],
          ],
          'unless-stopped est le choix habituel pour les services d’un petit serveur.',
        ),
        qcm(
          'Tu veux passer PostgreSQL de la version 16 à 17. Que fais-tu ?',
          [
            'Exporter avec pg_dump, lancer la 17 sur un nouveau volume, puis restaurer',
            'Changer le tag et relancer sur le même volume',
            'Supprimer le volume, la 17 recréera les données',
            'Copier le dossier de données dans l’image',
          ],
          0,
          'Le format des fichiers change entre versions majeures : la 17 refuse de démarrer sur des données de la 16.',
        ),
      ]),

      lesson('recap-final', 'Projet final : une API Node + PostgreSQL en ligne', [
        tip(
          'Le projet, du code à la production',
          'Tu mets en ligne une API Node avec PostgreSQL sur un VPS de 2 Go. Le dépôt contient un Dockerfile multi-étapes (node:22-alpine, USER node, CMD en JSON), un .dockerignore, et un compose.yaml de production avec trois services :\n\n• caddy : seul à publier 80 et 443, Caddyfile monté en :ro, volume caddy_data.\n• api : image ghcr.io/…:${IMAGE_TAG}, variables via env_file, depends_on db avec service_healthy, restart: unless-stopped.\n• db : postgres:17-alpine, volume pgdata, healthcheck pg_isready, mot de passe en secret, aucun port publié.\n\nLa CI teste chaque pull request ; sur main, elle pousse l’image étiquetée par SHA puis déploie par SSH avec pull + up -d et vérifie /health. Sur le serveur : ufw (22, 80, 443), DNS A vers l’IP, rotation des journaux, pg_dump chaque nuit copié hors site, et une alerte si /health ne répond plus.',
          'services:\n  caddy:\n    image: caddy:2-alpine\n    ports: ["80:80", "443:443"]\n    volumes:\n      - ./Caddyfile:/etc/caddy/Caddyfile:ro\n      - caddy_data:/data\n    restart: unless-stopped\n  api:\n    image: ghcr.io/awa-dev/api:${IMAGE_TAG:?tag requis}\n    env_file: api.env\n    depends_on:\n      db:\n        condition: service_healthy\n    restart: unless-stopped\n  db:\n    image: postgres:17-alpine\n    environment:\n      POSTGRES_USER: app\n      POSTGRES_DB: app\n      POSTGRES_PASSWORD_FILE: /run/secrets/db_password\n    secrets: [db_password]\n    volumes:\n      - pgdata:/var/lib/postgresql/data\n    healthcheck:\n      test: ["CMD-SHELL", "pg_isready -U app -d app"]\n      interval: 10s\n      retries: 5\n    restart: unless-stopped\n\nvolumes:\n  pgdata:\n  caddy_data:\n\nsecrets:\n  db_password:\n    file: ./secrets/db_password.txt',
        ),
        order(
          'Remets dans l’ordre le pipeline complet, du commit à la production.',
          [
            'Pull request : lint, tests et build',
            'Fusion sur main',
            'Construction de l’image étiquetée par SHA',
            'Push sur ghcr.io',
            'SSH : docker compose pull puis up -d',
            'Vérification de /health',
          ],
          'Chaque étape ne démarre que si la précédente a réussi : c’est ce qui rend le déploiement sans stress.',
        ),
        qcm(
          'Dans ce projet, quel service publie des ports sur l’hôte ?',
          ['api et db', 'Les trois', 'Seulement caddy', 'Seulement db'],
          2,
          'api et db ne sont joignables que par le réseau interne de Compose : caddy → api:3000, api → db:5432.',
        ),
        vf(
          'Si IMAGE_TAG n’est pas défini, ${IMAGE_TAG:?tag requis} fait échouer Compose au lieu de lancer une image inconnue.',
          true,
          'Mieux vaut un déploiement qui s’arrête avec un message clair qu’une image inattendue en production.',
        ),
        match(
          'Associe chaque risque à la protection mise en place dans le projet.',
          [
            ['Perte des données', 'Volume pgdata et pg_dump hors site'],
            ['Base exposée à Internet', 'Aucun port publié pour db'],
            ['Trafic en clair', 'Caddy et Let’s Encrypt'],
            ['API lancée avant la base', 'healthcheck et service_healthy'],
            ['Mauvaise version déployée', 'Tag par SHA et retour arrière'],
          ],
          'Chaque choix du compose.yaml répond à un risque concret de production.',
        ),
        qcm(
          'Après un redémarrage du VPS, tout revient sauf l’API, que tu avais arrêtée avec docker compose stop api la veille. Pourquoi ?',
          [
            'Le volume est corrompu',
            'unless-stopped ne relance pas un conteneur arrêté volontairement',
            'Caddy bloque l’API',
            'Le certificat a expiré',
          ],
          1,
          'C’est le comportement voulu d’unless-stopped. Relance-la avec docker compose up -d.',
        ),
        qcm(
          'Ton dernier déploiement a cassé l’API. Quelle commande, sur le serveur, revient à la version précédente ?',
          [
            'docker compose down -v',
            'git revert sur le serveur',
            'docker compose restart api',
            'IMAGE_TAG=<sha précédent> docker compose up -d',
          ],
          3,
          'L’image précédente existe encore sur le registre (et souvent en local) : le retour arrière prend quelques secondes.',
        ),
      ]),
    ],
  ),
];
