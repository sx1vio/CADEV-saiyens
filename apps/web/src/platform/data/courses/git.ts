import { fill, lesson, match, order, qcm, tip, unit, vf } from './dsl';
import type { CourseUnit } from './types';

/**
 * Cours « Git et GitHub » : prépare à la certification DevHub git-fondamentaux.
 * Programme : 0 dépôt, commits et zone de préparation ; 1 historique et annulation ;
 * 2 branches, fusion et conflits ; 3 remote, push, pull et pull requests ; 4 bonnes pratiques et secrets.
 */
export const units: CourseUnit[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // Unité 1 — Les bases de Git (thème 0)
  // ─────────────────────────────────────────────────────────────────────────────
  unit(
    'bases-git',
    'Les bases de Git',
    'Comprendre ce que fait Git, le configurer et créer ton premier dépôt.',
    [
      lesson('pourquoi-git', 'Pourquoi Git ?', [
        tip(
          'Le problème que Git résout',
          'Sans outil de gestion de versions, on finit avec des dossiers « projet-final », « projet-final-v2 », « projet-final-VRAI » et des fichiers échangés par WhatsApp qui écrasent le travail des autres. Git règle ce problème : il enregistre l’histoire complète du projet, permet de revenir à n’importe quelle version et de travailler à plusieurs en parallèle sans se marcher dessus.\n\nGit est un système de gestion de versions distribué : chaque copie du dépôt contient tout l’historique. Tu peux donc enregistrer des versions, consulter l’historique ou créer des branches sans Internet. Le réseau ne sert qu’à échanger avec les autres copies, quand la connexion revient.\n\nGitHub, GitLab ou Bitbucket sont des services en ligne qui hébergent des dépôts Git et ajoutent des outils de collaboration : pull requests, issues, revue de code, automatisation. Git est l’outil installé sur ta machine ; GitHub est une plateforme construite autour.',
        ),
        vf(
          'Git et GitHub sont la même chose.',
          false,
          'Git est un logiciel libre qui tourne sur ton ordinateur. GitHub est un service en ligne qui héberge des dépôts Git ; tu peux utiliser Git sans GitHub (seul, ou avec GitLab, un serveur d’entreprise…).',
        ),
        vf(
          'Avec Git, tu peux créer des commits et consulter l’historique sans connexion Internet.',
          true,
          'C’est l’intérêt d’un système distribué : tout l’historique est dans le dossier .git de ta machine. Seuls push, pull, fetch et clone ont besoin du réseau.',
        ),
        qcm(
          'Que signifie « Git est distribué » ?',
          [
            'Le code est découpé entre plusieurs serveurs',
            'Il faut un serveur central pour chaque commit',
            'Chaque copie du dépôt contient l’historique complet',
            'Git ne fonctionne que sur les réseaux d’entreprise',
          ],
          2,
          'Chaque clone est un dépôt complet. Si le serveur tombe, n’importe quel clone à jour permet de tout reconstruire.',
        ),
        tip(
          'Ce qu’est vraiment un commit',
          'Un commit est un instantané (snapshot) de l’ensemble des fichiers suivis à un moment donné. Il contient aussi l’auteur, la date, un message et un lien vers le ou les commits parents : c’est cette chaîne de parents qui forme l’historique.\n\nChaque commit est identifié par un hachage SHA-1 de 40 caractères hexadécimaux, calculé à partir de son contenu, par exemple 9fceb02d0ae598e95dc970b74767f19372d61af8. On l’abrège en général à ses 7 premiers caractères : 9fceb02.\n\nSi tu changes quoi que ce soit dans un commit (message, contenu, parent), tu obtiens un autre hachage, donc un autre commit. C’est pour cela qu’on dit que l’historique est immuable : « réécrire l’historique » crée en réalité de nouveaux commits qui remplacent les anciens.',
        ),
        qcm(
          'Qu’est-ce qu’un commit ?',
          [
            'Un fichier de configuration de Git',
            'Un instantané du projet avec un auteur, une date, un message et un parent',
            'Une copie du dépôt sur GitHub',
            'La liste des fichiers ignorés',
          ],
          1,
          'Le commit est l’unité de base de l’historique. Ses métadonnées (auteur, date, message, parent) font partie de ce qui est haché.',
        ),
        vf(
          'Pour Git, un commit représente un instantané complet du projet, pas seulement les lignes modifiées.',
          true,
          'Conceptuellement, chaque commit pointe vers l’état complet des fichiers. Physiquement, Git ne stocke qu’une fois un fichier identique et compresse le reste, donc le dépôt reste léger.',
        ),
        qcm(
          'Tu corriges une faute dans le message d’un commit. Que devient son identifiant ?',
          [
            'Il change, car le message fait partie du contenu haché',
            'Il reste identique, seul le texte change',
            'Il prend le suffixe -v2',
            'Il est supprimé de l’historique',
          ],
          0,
          'Le hachage dépend de tout le contenu du commit, message compris. Modifier un commit en crée donc un nouveau, avec un nouvel identifiant.',
        ),
        match('Associe chaque notion à sa définition.', [
          ['Dépôt', 'Le projet et tout son historique'],
          ['Commit', 'Une version enregistrée du projet'],
          ['Branche', 'Une ligne de travail parallèle'],
          ['Remote', 'Une copie distante du dépôt, sur GitHub par exemple'],
        ]),
      ]),

      lesson('configurer', 'Installer et configurer Git', [
        tip(
          'Ton identité avant tout',
          'Après l’installation (git --version pour vérifier), la première chose à faire est de dire à Git qui tu es. Chaque commit enregistre un nom et un e-mail d’auteur : sans configuration, Git refuse de committer ou devine une identité bancale.\n\nUtilise sur ta machine l’e-mail associé à ton compte GitHub : c’est ainsi que GitHub relie tes commits à ton profil et à ton graphe de contributions. Si tu ne veux pas exposer ton adresse, GitHub fournit une adresse « noreply » dans les paramètres de ton compte.\n\nProfite-en pour choisir main comme nom de branche par défaut : sans réglage, Git 2.x nomme encore la première branche master (Git 3.0 passera à main), alors que GitHub utilise main.',
          'git --version\ngit config --global user.name "Awa Diop"\ngit config --global user.email "awa.diop@exemple.ci"\ngit config --global init.defaultBranch main\ngit config --global core.editor "code --wait"\n\ngit config --list --show-origin   # tout voir, et d’où ça vient',
        ),
        fill(
          'Configure ton nom pour tous tes dépôts.',
          'git config --global user.___ "Awa Diop"',
          ['name', 'username', 'author', 'login'],
          'name',
          'Les deux réglages indispensables sont user.name et user.email. Ce ne sont pas tes identifiants de connexion GitHub : ils ne servent qu’à signer tes commits.',
        ),
        vf(
          'L’e-mail configuré dans Git sert à relier tes commits à ton profil GitHub.',
          true,
          'GitHub associe un commit à un compte grâce à l’e-mail de l’auteur. Avec un e-mail inconnu, le commit apparaît sans avatar et ne compte pas dans tes contributions.',
        ),
        tip(
          'Trois niveaux de configuration',
          'Git lit sa configuration à trois niveaux, du plus général au plus précis :\n• --system : pour tous les utilisateurs de la machine ;\n• --global : pour ton utilisateur, dans ~/.gitconfig ;\n• --local : pour un seul dépôt, dans .git/config (niveau par défaut quand tu es dans un dépôt).\n\nLe niveau le plus précis gagne. Tu peux donc garder ton e-mail personnel en global et mettre ton e-mail professionnel en local dans le dépôt de ton employeur.\n\nSous Windows, pense aux fins de ligne : Windows utilise CRLF, Linux et macOS LF. Le réglage core.autocrlf=true (Windows) ou input (Linux, macOS) évite des fichiers entièrement « modifiés » pour rien. En équipe, un fichier .gitattributes avec « * text=auto » est encore plus fiable, car il voyage avec le dépôt.',
        ),
        qcm(
          'user.email vaut perso@exemple.com en global et awa@entreprise.ci en local dans un dépôt. Quel e-mail signera les commits de ce dépôt ?',
          ['perso@exemple.com', 'Les deux', 'Aucun : Git refuse de committer', 'awa@entreprise.ci'],
          3,
          'La configuration locale (.git/config) l’emporte sur la globale (~/.gitconfig), qui l’emporte sur celle du système.',
        ),
        match('Associe chaque niveau à l’endroit où il s’applique.', [
          ['--system', 'Tous les utilisateurs de la machine'],
          ['--global', 'Ton utilisateur, dans ~/.gitconfig'],
          ['--local', 'Un seul dépôt, dans .git/config'],
        ]),
        fill(
          'Fais de main le nom de la première branche de tes futurs dépôts.',
          'git config --global init.___ main',
          ['defaultBranch', 'mainBranch', 'branchName', 'firstBranch'],
          'defaultBranch',
          'init.defaultBranch est lu par git init. Les dépôts existants ne changent pas ; pour renommer une branche existante, on utilise git branch -m master main.',
        ),
        qcm(
          'Quelle commande affiche toute ta configuration et le fichier d’où vient chaque valeur ?',
          [
            'git config --list --show-origin',
            'git status --config',
            'git show config',
            'git log --config',
          ],
          0,
          '--show-origin est précieux pour comprendre pourquoi un réglage ne s’applique pas : tu vois s’il vient du système, du global ou du dépôt.',
        ),
        qcm(
          'Sous Windows, un collègue voit tous les fichiers « modifiés » alors qu’il n’a rien changé. Cause la plus probable ?',
          [
            'Un virus',
            'Une conversion des fins de ligne (CRLF/LF)',
            'Un fichier .gitignore manquant',
            'Une branche mal nommée',
          ],
          1,
          'Si les fins de ligne sont converties, chaque ligne diffère. core.autocrlf ou un .gitattributes partagé (* text=auto) règlent le problème pour toute l’équipe.',
        ),
      ]),

      lesson('creer-depot', 'Créer ou cloner un dépôt', [
        tip(
          'git init : partir de zéro',
          'Dans le dossier de ton projet, git init crée un sous-dossier caché .git. C’est lui, le dépôt : il contient tout l’historique, les branches et la configuration locale. Tes fichiers, eux, ne bougent pas : git init ne supprime ni ne modifie rien.\n\nSupprimer .git efface tout l’historique ; le dossier redevient un simple dossier. À l’inverse, attention à ne pas lancer git init dans un dossier trop large (ton dossier personnel, par exemple) : tous tes fichiers apparaîtraient comme « non suivis ». Évite aussi de créer un dépôt à l’intérieur d’un autre dépôt.\n\nAprès git init, git status affiche « No commits yet » : le dépôt est vide tant que tu n’as pas fait de premier commit.',
          'mkdir hackathon-abidjan\ncd hackathon-abidjan\ngit init\ngit status\n# On branch main\n# No commits yet\n# nothing to commit (create/copy files and use "git add" to track)',
        ),
        fill(
          'Crée un dépôt dans le dossier courant.',
          'git ___',
          ['init', 'start', 'new', 'create'],
          'init',
          'git init crée le dossier .git. Tu peux aussi écrire git init nom-du-dossier pour créer le dossier et le dépôt d’un coup.',
        ),
        order(
          'Démarre un nouveau projet suivi par Git.',
          ['mkdir portfolio', 'cd portfolio', 'git init', 'git status'],
          'Créer le dossier, y entrer, initialiser le dépôt, puis vérifier l’état avec git status.',
        ),
        vf(
          'git init dans un dossier qui contient déjà des fichiers les efface.',
          false,
          'git init ne touche pas à tes fichiers : il ajoute seulement .git. Tes fichiers apparaissent alors comme non suivis, prêts à être ajoutés.',
        ),
        tip(
          'git clone : récupérer un dépôt existant',
          'Pour travailler sur un projet qui existe déjà, on ne télécharge pas le ZIP : on le clone. git clone télécharge tout l’historique, crée le dossier, configure un remote nommé origin qui pointe vers l’adresse d’origine et se place sur la branche par défaut.\n\nLe ZIP proposé par GitHub ne contient que les fichiers d’une version, sans dossier .git : pas d’historique, pas de remote, impossible de faire un push. Pour un très gros dépôt dont tu n’as pas besoin de l’historique (une CI, par exemple), git clone --depth 1 ne récupère que le dernier commit.',
          'git clone https://github.com/devhub-africa/exemple.git\ngit clone https://github.com/devhub-africa/exemple.git mon-dossier\ncd exemple\ngit remote -v   # origin est déjà configuré',
        ),
        qcm(
          'Quelle différence entre télécharger le ZIP d’un dépôt et le cloner ?',
          [
            'Aucune, le ZIP est juste plus léger',
            'Le ZIP contient l’historique mais pas les fichiers',
            'Le clone ne récupère que la branche main',
            'Le clone apporte l’historique et le remote origin ; le ZIP n’a que les fichiers',
          ],
          3,
          'Sans .git, impossible de voir l’historique, de créer des branches suivies ou de pousser. Pour contribuer, clone toujours.',
        ),
        qcm(
          'Après git clone, comment s’appelle le remote configuré automatiquement ?',
          ['upstream', 'origin', 'github', 'main'],
          1,
          'origin est un simple nom par convention. On ajoute souvent un second remote, upstream, quand on travaille sur un fork.',
        ),
        vf(
          'Supprimer le dossier .git d’un projet efface son historique Git.',
          true,
          'Tout l’historique vit dans .git. Les fichiers du dossier restent, mais ils ne sont plus versionnés. Si le dépôt existe sur GitHub, tu peux le récupérer en clonant à nouveau.',
        ),
        fill(
          'Clone le dépôt dans un dossier nommé api.',
          'git clone https://github.com/devhub-africa/exemple.git ___',
          ['api', '--name api', '-o api', '--dir=api'],
          'api',
          'Le dernier argument de git clone est le dossier de destination. L’option -o sert à autre chose : elle renomme le remote (au lieu d’origin).',
        ),
      ]),

      lesson('trois-zones', 'Les trois zones de Git', [
        tip(
          'Répertoire de travail, index, dépôt',
          'Git manipule tes changements à travers trois zones :\n• le répertoire de travail (working tree) : les fichiers que tu modifies dans ton éditeur ;\n• la zone de préparation, aussi appelée index ou staging area : ce qui partira dans le prochain commit ;\n• le dépôt (.git) : les commits enregistrés.\n\nLe cycle est toujours le même : tu modifies, tu prépares avec git add, tu enregistres avec git commit. La zone de préparation peut sembler une étape en trop, mais elle est précieuse : elle te permet de composer un commit précis, par exemple n’enregistrer que la correction du bug et pas le console.log de débogage qui traîne dans le même fichier.',
          'echo "<h1>Hackathon</h1>" > index.html   # 1. répertoire de travail\ngit add index.html                         # 2. zone de préparation\ngit commit -m "Ajoute la page d’accueil"    # 3. dépôt',
        ),
        match('Associe chaque zone à son rôle.', [
          ['Répertoire de travail', 'Les fichiers que tu modifies'],
          ['Zone de préparation (index)', 'Ce qui partira dans le prochain commit'],
          ['Dépôt (.git)', 'Les commits enregistrés'],
        ]),
        order(
          'Remets dans l’ordre le trajet d’un changement.',
          [
            'Modifier le fichier dans l’éditeur',
            'git add le fichier',
            'git commit avec un message',
          ],
          'Modifier, préparer, enregistrer : un changement passe toujours par l’index avant d’entrer dans l’historique.',
        ),
        tip(
          'Les états d’un fichier et git status -s',
          'Un fichier peut être non suivi (Git ne le connaît pas encore), non modifié, modifié ou préparé. git status le dit en toutes lettres ; git status -s le résume sur deux colonnes : la gauche décrit l’index, la droite le répertoire de travail.\n\nPiège classique : si tu modifies un fichier après l’avoir ajouté, le commit prendra la version préparée, pas la dernière. git status -s affiche alors MM. Il faut refaire git add pour inclure les dernières modifications.',
          'git status -s\nM  index.html     # modifié et préparé\n M style.css      # modifié, pas encore préparé\nMM app.js         # préparé, puis modifié à nouveau\nA  contact.html   # nouveau fichier préparé\n?? notes.txt      # non suivi',
        ),
        qcm(
          'Dans git status -s, que signifie la ligne «  M style.css » (une espace, puis M) ?',
          [
            'Modifié et déjà préparé',
            'Fichier non suivi',
            'Modifié dans le répertoire de travail, pas encore préparé',
            'Fichier supprimé',
          ],
          2,
          'La colonne de gauche (vide ici) parle de l’index, celle de droite du répertoire de travail. M à droite seulement : modifié mais pas préparé.',
        ),
        qcm(
          'Que veut dire ?? devant un fichier dans git status -s ?',
          [
            'Le fichier n’est pas suivi par Git',
            'Le fichier est en conflit',
            'Git ne sait pas lire le fichier',
            'Le fichier est ignoré',
          ],
          0,
          '?? désigne un fichier non suivi. Les fichiers ignorés par .gitignore n’apparaissent pas du tout (sauf avec --ignored).',
        ),
        vf(
          'Après git add app.js puis une nouvelle modification d’app.js, git commit enregistre la toute dernière version du fichier.',
          false,
          'Le commit prend ce qui est dans l’index, c’est-à-dire la version au moment du git add. Refais git add app.js pour inclure la suite.',
        ),
        fill(
          'Affiche l’état des fichiers en format court.',
          'git status ___',
          ['-s', '--mini', '-c', '--one'],
          '-s',
          '-s (ou --short) donne une ligne par fichier. Ajoute -b pour voir aussi la branche et son avance ou son retard sur le remote.',
        ),
        vf(
          'La zone de préparation est stockée dans le fichier .git/index.',
          true,
          'C’est pourquoi on l’appelle aussi « l’index ». Ce fichier binaire décrit l’arborescence du prochain commit.',
        ),
      ]),
    ],
  ),

  // ─────────────────────────────────────────────────────────────────────────────
  // Unité 2 — Préparer, enregistrer, ignorer (thème 0)
  // ─────────────────────────────────────────────────────────────────────────────
  unit(
    'enregistrer',
    'Préparer, enregistrer, ignorer',
    'Composer des commits propres, bien les nommer et tenir les fichiers inutiles hors de Git.',
    [
      lesson('add-commit', 'add et commit en détail', [
        tip(
          'Préparer puis enregistrer',
          'git add accepte un fichier, un dossier ou un motif. git add . prépare tout ce qui a changé dans le dossier courant et ses sous-dossiers, suppressions comprises ; git add -A fait de même pour tout le dépôt, quel que soit le dossier où tu te trouves.\n\ngit commit -m "message" enregistre l’index. Sans -m, Git ouvre ton éditeur pour écrire un message plus long. git commit -a (ou -am) prépare automatiquement les fichiers déjà suivis qui ont été modifiés ou supprimés, mais jamais les nouveaux fichiers : un fichier créé doit toujours passer par git add la première fois.\n\nAvant de committer, relis ce qui part : git diff --staged montre exactement le contenu de l’index par rapport au dernier commit.',
          'git add index.html css/        # un fichier et un dossier\ngit add .                      # tout le dossier courant\ngit diff --staged              # relire ce qui est préparé\ngit commit -m "Ajoute le formulaire d’inscription"',
        ),
        tip(
          'Préparer avec précision',
          '• git add -p découpe tes modifications en morceaux (hunks) et te demande pour chacun : y pour l’ajouter, n pour le laisser, s pour le découper encore. Idéal pour séparer deux sujets mélangés dans un même fichier.\n• git restore --staged fichier retire un fichier de l’index sans perdre tes modifications.\n• git rm fichier supprime le fichier et prépare la suppression ; git rm --cached fichier arrête de le suivre mais le laisse sur ton disque.\n• git mv ancien nouveau renomme et prépare le changement. Git ne stocke pas les renommages : il les détecte en comparant les contenus.',
        ),
        order(
          'Enregistre une correction de index.html en vérifiant avant.',
          [
            'git status',
            'git add index.html',
            'git diff --staged',
            'git commit -m "Corrige le titre"',
          ],
          'Regarder l’état, préparer, relire ce qui est préparé, enregistrer.',
        ),
        vf(
          'git commit -am "..." inclut aussi les fichiers que tu viens de créer.',
          false,
          '-a ne prend que les fichiers déjà suivis. Un nouveau fichier reste « non suivi » tant que tu n’as pas fait git add dessus.',
        ),
        qcm(
          'Tu es dans le sous-dossier src/. Quelle commande prépare les changements de TOUT le dépôt ?',
          ['git add .', 'git add src', 'git add -A', 'git commit -a'],
          2,
          'git add . se limite au dossier courant (src/ ici). git add -A couvre tout l’arbre de travail, nouveaux fichiers et suppressions compris.',
        ),
        fill(
          'Retire config.js de la zone de préparation, sans perdre tes modifications.',
          'git restore ___ config.js',
          ['--staged', '--undo', '--hard', '--cached'],
          '--staged',
          'git restore --staged agit sur l’index uniquement. Ton fichier garde ses modifications dans le répertoire de travail.',
        ),
        qcm(
          'Un fichier contient une vraie correction et un console.log de débogage. Comment ne committer que la correction ?',
          [
            'git add -p puis choisir les morceaux',
            'git commit -a',
            'git add . puis git commit',
            'Impossible, il faut deux fichiers',
          ],
          0,
          'git add -p propose chaque morceau modifié un par un. Tu ajoutes la correction (y) et laisses le console.log (n).',
        ),
        match('Associe chaque commande à son effet.', [
          ['git rm fichier', 'Supprime le fichier et prépare la suppression'],
          ['git rm --cached fichier', 'Arrête de suivre le fichier mais le garde sur le disque'],
          ['git mv a b', 'Renomme et prépare le renommage'],
          ['git restore --staged fichier', 'Retire le fichier de l’index'],
        ]),
      ]),

      lesson('messages-commit', 'Des commits utiles', [
        tip(
          'Un commit, un sujet ; un message qui dit pourquoi',
          'Un bon commit est atomique : il fait une seule chose cohérente (corriger un bug, ajouter une fonctionnalité) et le projet fonctionne après lui. Un tel commit se relit, s’annule et se retrouve facilement ; un commit « modifs du jour » qui mélange trois sujets est impossible à annuler proprement.\n\nLe message suit une forme simple : une première ligne courte (environ 50 caractères) qui résume le changement à l’impératif ou au présent, une ligne vide, puis, si besoin, un corps qui explique pourquoi. Le « quoi », le diff le montre déjà ; le « pourquoi », seul le message peut le dire.\n\nBeaucoup d’équipes adoptent Conventional Commits : type(portée): description. Les types les plus courants sont feat (nouvelle fonctionnalité), fix (correction), docs, refactor, test, chore, ci, perf. Un ! après le type, ou un pied de page « BREAKING CHANGE: », signale un changement incompatible.',
          'fix(panier): empêche un total négatif avec une remise\n\nLa remise de 5 000 FCFA était appliquée même sur un panier\nde 3 000 FCFA. On plafonne désormais la remise au total.\n\nCloses #42',
        ),
        qcm(
          'Quel message de commit est le plus utile ?',
          [
            '« modifs »',
            '« wip »',
            '« update index.js »',
            '« fix(paiement): réessaie l’appel Mobile Money après un délai dépassé »',
          ],
          3,
          'Il dit ce qui change, où, et laisse deviner pourquoi. « update index.js » ne dit que ce que le diff montre déjà.',
        ),
        match('Associe chaque type Conventional Commits à son usage.', [
          ['feat', 'Nouvelle fonctionnalité'],
          ['fix', 'Correction de bug'],
          ['docs', 'Documentation seule'],
          ['refactor', 'Restructuration sans changement de comportement'],
          ['chore', 'Maintenance (dépendances, outillage)'],
        ]),
        fill(
          'Complète ce message pour une correction de bug dans le module auth.',
          '___(auth): corrige la déconnexion après 5 minutes',
          ['fix', 'feat', 'docs', 'style'],
          'fix',
          'fix pour une correction, feat pour une nouveauté. La portée entre parenthèses (auth) est facultative mais aide à se repérer.',
        ),
        vf(
          'Dans un message de commit, une ligne vide doit séparer le titre du corps.',
          true,
          'Git et GitHub considèrent la première ligne comme le titre. Sans ligne vide, tout le paragraphe devient le titre dans git log --oneline.',
        ),
        qcm(
          'Que signale feat!: supprime l’ancienne route /v1/login ?',
          [
            'Une fonctionnalité urgente',
            'Un changement incompatible (breaking change)',
            'Un commit à relire en priorité',
            'Une erreur de syntaxe dans le message',
          ],
          1,
          'Le ! indique que le changement casse la compatibilité : les clients de /v1/login devront s’adapter. En versionnage sémantique, cela impose une nouvelle version majeure.',
        ),
        qcm(
          'Pourquoi préférer plusieurs petits commits atomiques à un gros commit ?',
          [
            'Ils prennent moins de place sur le disque',
            'GitHub refuse les gros commits',
            'Chacun se relit, s’annule ou se retrouve sans toucher au reste',
            'Ils rendent les push plus rapides',
          ],
          2,
          'Si un commit introduit un bug, git revert sur ce seul commit suffit. Avec un commit fourre-tout, annuler retire aussi le bon travail.',
        ),
      ]),

      lesson('gitignore', 'Ignorer des fichiers', [
        tip(
          '.gitignore : ce qui ne doit jamais entrer',
          'Certains fichiers n’ont rien à faire dans Git : les dépendances (node_modules/, .venv/), les fichiers générés (dist/, build/), les journaux (*.log), les fichiers de ton éditeur ou de ton système (.DS_Store, .idea/) et surtout les secrets (.env). On les liste dans un fichier .gitignore à la racine, que l’on committe pour que toute l’équipe en profite.\n\nQuelques règles de syntaxe :\n• # commence un commentaire ;\n• dist/ ignore tout dossier nommé dist, à n’importe quel niveau ; /dist seulement celui de la racine ;\n• *.log ignore tous les fichiers .log ; !important.log fait une exception ;\n• on ne peut pas réinclure un fichier si son dossier parent est ignoré.',
          '# .gitignore\nnode_modules/\ndist/\n.env\n.env.*\n!.env.example\n*.log\n.DS_Store',
        ),
        tip(
          'Le piège du fichier déjà suivi',
          'Le .gitignore n’agit que sur les fichiers non suivis. Si .env a déjà été committé, l’ajouter au .gitignore ne change rien : Git continue de le suivre. Il faut d’abord l’ôter de l’index avec git rm --cached .env, puis committer. Et s’il contenait des secrets déjà poussés, ils restent dans l’historique : il faudra les révoquer (voir l’unité sur les secrets).\n\nPour comprendre pourquoi un fichier est ignoré, git check-ignore -v fichier indique la règle et le fichier qui la contient. GitHub propose des modèles de .gitignore par langage à la création d’un dépôt.',
          'git rm --cached .env\necho ".env" >> .gitignore\ngit add .gitignore\ngit commit -m "chore: arrête de suivre .env"',
        ),
        fill(
          'Ignore le dossier des dépendances JavaScript.',
          '# .gitignore\n___/',
          ['node_modules', 'src', 'public', 'package.json'],
          'node_modules',
          'Les dépendances se réinstallent avec npm install (ou npm ci) grâce à package.json et au fichier de verrouillage, qui eux sont versionnés.',
        ),
        match('Associe chaque ligne de .gitignore à ce qu’elle fait.', [
          ['*.log', 'Ignore tous les fichiers de logs'],
          ['/dist', 'Ignore seulement le dossier dist de la racine'],
          ['!.env.example', 'Fait une exception : ce fichier reste suivi'],
          ['# secrets', 'Un simple commentaire'],
        ]),
        vf(
          'Ajouter .env au .gitignore le retire des commits déjà poussés.',
          false,
          'Le .gitignore ne concerne que l’avenir et les fichiers non suivis. Un secret déjà poussé doit être considéré comme compromis.',
        ),
        qcm(
          'config.local.js est déjà suivi. Tu l’ajoutes au .gitignore, mais il apparaît toujours modifié. Que faire ?',
          [
            'Rien, il faut attendre le prochain push',
            'git rm --cached config.local.js puis committer',
            'Supprimer le .gitignore et le recréer',
            'git restore config.local.js',
          ],
          1,
          'git rm --cached arrête le suivi sans effacer le fichier de ton disque. Ensuite, la règle du .gitignore s’applique.',
        ),
        vf(
          'Le fichier .gitignore doit lui-même être committé.',
          true,
          'Ainsi toute l’équipe partage les mêmes règles. Pour des règles qui ne concernent que toi, utilise .git/info/exclude ou un fichier global (core.excludesFile).',
        ),
        qcm(
          'Quelle commande indique quelle règle ignore un fichier ?',
          [
            'git status --ignored',
            'git check-ignore -v fichier',
            'git log -- fichier',
            'git ignore --why',
          ],
          1,
          'git check-ignore -v affiche le fichier .gitignore, le numéro de ligne et le motif responsables.',
        ),
      ]),
    ],
  ),

  // ─────────────────────────────────────────────────────────────────────────────
  // Unité 3 — Historique et annulation (thème 1)
  // ─────────────────────────────────────────────────────────────────────────────
  unit(
    'historique',
    'Historique et annulation',
    'Lire l’historique, comparer des versions et annuler une erreur sans rien casser.',
    [
      lesson('lire-historique', 'git log, git show et git diff', [
        tip(
          'Explorer l’historique',
          'git log liste les commits du plus récent au plus ancien. Ses options les plus utiles :\n• --oneline : un commit par ligne (identifiant court et titre) ;\n• --graph --all : dessine les branches et leurs fusions ;\n• -n 5 : les 5 derniers ; --author="Awa", --since="2 weeks ago", --grep="panier" pour filtrer ;\n• -- chemin : seulement les commits qui touchent ce fichier ; -p : avec le diff de chaque commit.\n\ngit show <commit> affiche le détail d’un commit et son diff. On désigne un commit par son identifiant ou relativement à HEAD, qui pointe vers le commit sur lequel tu te trouves : HEAD~1 est son parent, HEAD~3 l’arrière-arrière-grand-parent. git blame fichier indique, ligne par ligne, le dernier commit qui l’a modifiée.',
          'git log --oneline --graph --all\ngit log --author="Fatou" --since="1 week ago"\ngit show HEAD~1\ngit blame -L 10,20 src/panier.js',
        ),
        tip(
          'Lire un git diff',
          'git diff compare deux états, selon ce que tu lui donnes :\n• git diff : répertoire de travail ↔ index (ce qui n’est pas encore préparé) ;\n• git diff --staged (ou --cached) : index ↔ dernier commit (ce qui va partir) ;\n• git diff HEAD : tout ce qui a changé depuis le dernier commit ;\n• git diff main feat/paiement : entre deux branches ; --stat pour un résumé par fichier.\n\nDans la sortie, les lignes qui commencent par - sont retirées, celles par + ajoutées. L’en-tête @@ -12,7 +12,8 @@ signifie : à partir de la ligne 12, 7 lignes avant et 8 après.',
        ),
        qcm(
          'Quelle commande affiche les commits sur une ligne chacun, avec le dessin des branches ?',
          [
            'git log --oneline --graph --all',
            'git status --graph',
            'git show --all',
            'git branch --log',
          ],
          0,
          '--graph dessine les lignes de branches et de fusions, --all inclut toutes les branches et pas seulement la courante.',
        ),
        match('Associe chaque commande à ce qu’elle compare.', [
          ['git diff', 'Répertoire de travail ↔ index'],
          ['git diff --staged', 'Index ↔ dernier commit'],
          ['git diff HEAD', 'Répertoire de travail ↔ dernier commit'],
          ['git diff main feat/x', 'Deux branches entre elles'],
        ]),
        vf(
          'Après git add sur tous tes fichiers, git diff (sans option) n’affiche plus rien.',
          true,
          'git diff compare le répertoire de travail à l’index : s’ils sont identiques, il n’y a rien à montrer. Utilise git diff --staged pour voir ce qui est préparé.',
        ),
        fill(
          'Affiche le détail du commit juste avant HEAD.',
          'git show HEAD___',
          ['~1', '+1', '-1', '..1'],
          '~1',
          'HEAD~1 (ou HEAD^) désigne le parent de HEAD, HEAD~2 le grand-parent. Les notations +1 et -1 n’existent pas.',
        ),
        qcm(
          'Comment lister seulement les commits qui ont touché src/paiement.js ?',
          [
            'git show src/paiement.js',
            'git log -- src/paiement.js',
            'git diff src/paiement.js',
            'git status src/paiement.js',
          ],
          1,
          'Le -- sépare les options des chemins. Ajoute --follow pour suivre le fichier à travers ses renommages.',
        ),
        qcm(
          'Une ligne de calcul de TVA est fausse. Quelle commande dit qui l’a modifiée en dernier, et dans quel commit ?',
          ['git log --oneline', 'git diff HEAD', 'git blame fichier', 'git status'],
          2,
          'git blame annote chaque ligne avec le commit, l’auteur et la date de sa dernière modification. Sers-t’en pour comprendre le contexte, pas pour accuser.',
        ),
      ]),

      lesson('restore-amend', 'Annuler des changements locaux', [
        tip(
          'git restore : revenir en arrière avant le commit',
          'git restore, introduit en 2019 (Git 2.23) avec git switch pour remplacer les usages confus de git checkout, annule des changements qui ne sont pas encore committés :\n• git restore fichier remet le fichier dans l’état de l’index (donc du dernier commit si rien n’est préparé). Les modifications non enregistrées sont perdues pour de bon ;\n• git restore --staged fichier retire le fichier de l’index sans toucher au répertoire de travail ;\n• git restore --source=HEAD~2 fichier récupère le fichier tel qu’il était deux commits plus tôt.\n\nL’ancienne forme git checkout -- fichier fait la même chose que git restore fichier ; tu la croiseras dans de vieux tutoriels. Pour les fichiers non suivis, git clean -n liste ce qui serait supprimé et git clean -f le supprime.',
        ),
        tip(
          'git commit --amend : corriger le dernier commit',
          'Une faute dans le message, un fichier oublié ? git commit --amend remplace le dernier commit par un nouveau qui intègre l’index actuel. --no-edit garde le message.\n\nAttention : comme le commit change, son identifiant change aussi. Si tu l’as déjà poussé et que d’autres l’ont récupéré, tu crées une divergence. Règle simple : amend seulement sur un commit qui n’a pas quitté ta machine (ou sur ta propre branche de PR, en sachant qu’il faudra un push forcé).',
          'git add oubli.css\ngit commit --amend --no-edit       # ajoute le fichier au dernier commit\ngit commit --amend -m "Nouveau message"',
        ),
        vf(
          'git restore fichier supprime définitivement les modifications non enregistrées de ce fichier.',
          true,
          'Ce qui n’a jamais été committé ni mis de côté (stash) n’est pas récupérable par Git. Vérifie avec git diff avant.',
        ),
        qcm(
          'Tu as oublié style.css dans ton dernier commit, pas encore poussé. Que fais-tu ?',
          [
            'git revert HEAD',
            'git add style.css puis git commit --amend --no-edit',
            'git reset --hard',
            'Supprimer le dépôt et recommencer',
          ],
          1,
          '--amend remplace le dernier commit par une version qui contient aussi style.css. --no-edit garde le message.',
        ),
        fill(
          'Récupère app.js tel qu’il était il y a 3 commits.',
          'git restore ___=HEAD~3 app.js',
          ['--source', '--from', '--commit', '--staged'],
          '--source',
          '--source choisit le commit de référence. Le fichier récupéré arrive dans le répertoire de travail ; il reste à le committer si tu veux garder cette version.',
        ),
        qcm(
          'Quelle commande ancienne fait la même chose que git restore index.html ?',
          [
            'git reset index.html',
            'git revert index.html',
            'git checkout -- index.html',
            'git rm index.html',
          ],
          2,
          'git checkout -- fichier annule les modifications locales. git reset fichier, lui, retire le fichier de l’index (comme restore --staged).',
        ),
        vf(
          'Il est sans risque de faire git commit --amend sur un commit que toute l’équipe a déjà récupéré.',
          false,
          'amend crée un nouveau commit avec un autre identifiant. Les autres ont toujours l’ancien : leurs historiques divergent du tien.',
        ),
        qcm(
          'Que fait git clean -n ?',
          [
            'Supprime tous les fichiers non suivis',
            'Liste les fichiers non suivis qui seraient supprimés, sans rien supprimer',
            'Nettoie l’historique',
            'Vide la zone de préparation',
          ],
          1,
          '-n (dry run) simule. git clean -f supprime vraiment, -d inclut les dossiers. Lance toujours -n d’abord.',
        ),
      ]),

      lesson('revert-reset', 'revert, reset et reflog', [
        tip(
          'revert ou reset ?',
          'git revert <commit> crée un nouveau commit qui applique l’inverse du commit visé. L’historique n’est pas réécrit : c’est la bonne méthode pour annuler un commit déjà poussé sur une branche partagée. Pour une fusion, il faut préciser le parent à garder : git revert -m 1 <commit-de-fusion>.\n\ngit reset <commit> déplace la branche courante vers un commit plus ancien ; les commits suivants disparaissent de la branche. Trois modes :\n• --soft : la branche recule, mais les changements restent préparés ;\n• --mixed (par défaut) : les changements restent dans tes fichiers, mais ne sont plus préparés ;\n• --hard : tout est effacé, index et répertoire de travail (les fichiers non suivis restent).\n\nreset réécrit l’historique : réserve-le aux commits non poussés.',
          'git revert a1b2c3d          # annule proprement un commit partagé\ngit reset --soft HEAD~1      # défait le commit, garde tout préparé\ngit reset HEAD~1             # défait le commit, garde les fichiers modifiés\ngit reset --hard HEAD~1      # défait le commit ET les modifications',
        ),
        tip(
          'git reflog : le filet de sécurité',
          'Tu as fait un reset --hard de trop ? Pas de panique : git reflog liste toutes les positions récentes de HEAD (commits, resets, changements de branche…), même vers des commits qui n’apparaissent plus dans git log. Tu retrouves l’identifiant, puis git reset --hard HEAD@{1} ou git branch sauvetage <id> pour le récupérer.\n\nLe reflog est local (il n’est jamais poussé) et ses entrées expirent (par défaut 90 jours, 30 pour les commits devenus inaccessibles). Il ne sauve pas les modifications qui n’ont jamais été committées.',
        ),
        qcm(
          'Un commit buggé est sur main et déjà poussé. Comment l’annuler proprement ?',
          [
            'git reset --hard HEAD~1 puis git push --force',
            'git commit --amend',
            'git revert <commit>',
            'git restore .',
          ],
          2,
          'revert ajoute un commit inverse : personne n’a à réécrire son historique. Forcer le push sur main effacerait des commits chez les autres.',
        ),
        match('Associe chaque mode de reset à son effet.', [
          ['git reset --soft HEAD~1', 'Changements gardés et préparés'],
          ['git reset --mixed HEAD~1', 'Changements gardés mais non préparés'],
          ['git reset --hard HEAD~1', 'Changements effacés'],
        ]),
        vf(
          'git reset --hard supprime aussi les fichiers non suivis.',
          false,
          'reset --hard remet l’index et les fichiers suivis à l’état du commit visé. Les fichiers non suivis restent ; c’est git clean qui les supprime.',
        ),
        qcm(
          'Après un git reset --hard HEAD~2 par erreur, comment retrouver les deux commits ?',
          [
            'Ils sont perdus pour toujours',
            'git log --all les affiche',
            'git revert HEAD~2',
            'git reflog, puis git reset --hard sur l’entrée d’avant',
          ],
          3,
          'Les commits existent toujours dans .git ; seul le pointeur de branche a bougé. Le reflog garde la trace de l’ancienne position.',
        ),
        fill(
          'Défais ton dernier commit (non poussé) en gardant les changements préparés.',
          'git reset ___ HEAD~1',
          ['--soft', '--hard', '--keep-all', '--staged'],
          '--soft',
          '--soft ne fait que reculer la branche. Pratique pour refaire le commit avec un autre découpage ou un autre message.',
        ),
        vf(
          'Le reflog est partagé avec l’équipe quand tu fais git push.',
          false,
          'Le reflog est propre à ton dépôt local. Chaque clone a le sien, et il ne contient que ce que tu as fait sur ta machine.',
        ),
      ]),
    ],
  ),

  // ─────────────────────────────────────────────────────────────────────────────
  // Unité 4 — Branches, fusion et conflits (thème 2)
  // ─────────────────────────────────────────────────────────────────────────────
  unit(
    'branches',
    'Branches, fusion et conflits',
    'Travailler en branches, fusionner, résoudre un conflit et choisir entre merge et rebase.',
    [
      lesson('branches-intro', 'Ce qu’est une branche', [
        tip(
          'Un simple pointeur',
          'Une branche n’est pas une copie du projet : c’est une étiquette légère qui pointe vers un commit. Quand tu committes, l’étiquette de la branche courante avance d’elle-même. HEAD indique sur quelle branche tu te trouves. Créer une branche est donc instantané, même sur un énorme projet.\n\nOn crée une branche par sujet pour garder main stable : feat/inscription, fix/total-panier. git switch -c crée une branche et s’y place (l’ancienne forme est git checkout -b), git switch nom change de branche, git switch - revient à la précédente, git branch liste les branches (l’astérisque marque la courante) et git branch -v montre le dernier commit de chacune.\n\nSi tu te places directement sur un commit ou un tag (git switch --detach v1.0.0), tu es en « HEAD détachée » : tu peux regarder et tester, mais pour garder des commits faits là, crée une branche avec git switch -c.',
          'git switch -c feat/inscription   # crée et bascule\ngit branch                        # liste\ngit switch main                   # revient sur main\ngit switch -                      # retourne à feat/inscription',
        ),
        tip(
          'Changer de branche avec du travail en cours : git stash',
          'Git refuse de changer de branche si tes modifications non committées seraient écrasées. Plutôt que de faire un commit bâclé, mets-les de côté : git stash range les modifications des fichiers suivis dans une pile et rend ton répertoire propre. git stash -u inclut aussi les fichiers non suivis.\n\ngit stash list montre la pile (stash@{0} est le plus récent), git stash pop réapplique le dernier et le retire de la pile, git stash apply le réapplique en le gardant. En cas de conflit, pop garde l’entrée dans la pile pour que rien ne soit perdu.',
          'git stash push -m "formulaire à moitié fait"\ngit switch main      # corriger l’urgence\ngit switch -\ngit stash pop',
        ),
        fill(
          'Crée la branche fix/menu-mobile et place-toi dessus.',
          'git switch ___ fix/menu-mobile',
          ['-c', '-n', '--new', '-b'],
          '-c',
          '-c pour create. Avec l’ancienne commande, c’est git checkout -b fix/menu-mobile.',
        ),
        vf(
          'Créer une branche copie tous les fichiers du projet.',
          false,
          'Une branche n’est qu’un pointeur vers un commit (un petit fichier qui contient un identifiant). C’est pourquoi on peut en créer autant qu’on veut.',
        ),
        qcm(
          'Koffi doit corriger un bug urgent sur main, mais son formulaire est à moitié écrit. Que faire ?',
          [
            'git stash, corriger sur main, revenir, puis git stash pop',
            'git reset --hard puis recommencer le formulaire',
            'Committer « wip » directement sur main',
            'Copier le dossier du projet',
          ],
          0,
          'stash met le travail de côté sans commit. Une alternative tout aussi valable : committer sur sa propre branche puis amender plus tard.',
        ),
        qcm(
          'git status affiche « HEAD detached at v1.0.0 ». Que signifie ce message ?',
          [
            'Le dépôt est corrompu',
            'Tu es placé sur un commit précis, pas sur une branche',
            'La branche main a été supprimée',
            'Tu dois faire git pull',
          ],
          1,
          'Tu peux tester l’ancienne version. Si tu committes ici, crée une branche (git switch -c nom) avant de partir, sinon ces commits ne seront plus accessibles que via le reflog.',
        ),
        match('Associe chaque commande à son effet.', [
          ['git stash', 'Met de côté les modifications en cours'],
          ['git stash pop', 'Réapplique le dernier stash et le retire de la pile'],
          ['git stash list', 'Liste les stashs'],
          ['git switch -', 'Revient à la branche précédente'],
        ]),
        vf(
          'Par défaut, git stash met aussi de côté les fichiers non suivis.',
          false,
          'Il faut ajouter -u (--include-untracked). Sans cette option, un nouveau fichier reste dans ton répertoire de travail.',
        ),
      ]),

      lesson('fusion', 'Fusionner une branche', [
        tip(
          'git merge : fast-forward ou commit de fusion',
          'Pour ramener une branche dans main, place-toi sur la branche qui reçoit (main), puis git merge feat/inscription.\n\nDeux cas se présentent :\n• si main n’a pas bougé depuis la création de la branche, Git avance simplement l’étiquette main : c’est un fast-forward, sans nouveau commit ;\n• si les deux branches ont avancé, Git crée un commit de fusion (merge commit) qui a deux parents.\n\ngit merge --no-ff force un commit de fusion même quand un fast-forward est possible, pour garder la trace de la branche. Une fois fusionnée, la branche peut être supprimée avec git branch -d ; Git refuse si elle n’est pas fusionnée (git branch -D force la suppression, à éviter sans être sûr de toi).',
          'git switch main\ngit merge feat/inscription\ngit branch -d feat/inscription\n\ngit log --oneline --graph   # voir la fusion',
        ),
        order(
          'Fusionne feat/recherche dans main puis fais le ménage.',
          ['git switch main', 'git merge feat/recherche', 'git branch -d feat/recherche'],
          'On se place sur la branche qui reçoit, on fusionne, puis on supprime la branche devenue inutile.',
        ),
        qcm(
          'Sur quelle branche faut-il être pour fusionner feat/recherche dans main ?',
          ['feat/recherche', 'N’importe laquelle', 'Une nouvelle branche', 'main'],
          3,
          'git merge X fait entrer X dans la branche courante.',
        ),
        qcm(
          'main n’a reçu aucun commit depuis la création de feat/x. Que fait git merge feat/x ?',
          [
            'Un fast-forward : main avance jusqu’au dernier commit de feat/x',
            'Un commit de fusion à deux parents',
            'Un conflit obligatoire',
            'Rien, il faut d’abord un rebase',
          ],
          0,
          'L’historique est linéaire : il suffit de déplacer l’étiquette main. Utilise --no-ff si tu veux quand même un commit de fusion.',
        ),
        vf(
          'git branch -d refuse de supprimer une branche dont le travail n’est pas fusionné.',
          true,
          'Git affiche « the branch is not fully merged ». C’est une sécurité ; -D force la suppression.',
        ),
        fill(
          'Force la création d’un commit de fusion, même si un fast-forward est possible.',
          'git merge ___ feat/paiement',
          ['--no-ff', '--ff-only', '--squash', '--force'],
          '--no-ff',
          '--ff-only fait l’inverse (refuse tout sauf un fast-forward) et --squash regroupe les changements sans créer de commit de fusion.',
        ),
        vf(
          'Un commit de fusion a deux parents.',
          true,
          'Le premier parent est la branche qui reçoit (main), le second la branche fusionnée. C’est pour cela qu’on écrit git revert -m 1 pour annuler une fusion.',
        ),
      ]),

      lesson('conflits', 'Résoudre un conflit', [
        tip(
          'Quand deux changements se croisent',
          'Si deux branches modifient les mêmes lignes d’un fichier, Git ne peut pas choisir : la fusion s’arrête en conflit. git status liste les fichiers concernés sous « Unmerged paths » (both modified). Dans chacun, Git place des marqueurs :\n• entre <<<<<<< HEAD et ======= : la version de ta branche courante ;\n• entre ======= et >>>>>>> nom-de-branche : la version de la branche fusionnée.\n\nPour résoudre : édite le fichier pour garder la bonne version (ou un mélange des deux), supprime tous les marqueurs, git add le fichier, puis git commit (ou git merge --continue). Si tu es perdu, git merge --abort remet tout comme avant la fusion. Ton éditeur (VS Code par exemple) propose des boutons « Accepter l’actuel / l’entrant / les deux ».',
          '<<<<<<< HEAD\n<h1>Bienvenue au hackathon</h1>\n=======\n<h1>Bienvenue au hackathon d’Abidjan</h1>\n>>>>>>> feat/titre',
        ),
        vf(
          'Un conflit signifie que Git a perdu une partie du travail.',
          false,
          'Les deux versions sont dans le fichier. Git te demande simplement de décider.',
        ),
        qcm(
          'Dans un conflit de fusion, que contient la partie entre <<<<<<< HEAD et ======= ?',
          [
            'La version de la branche fusionnée',
            'La version de ta branche courante',
            'L’ancêtre commun',
            'Un commentaire de Git',
          ],
          1,
          'HEAD désigne ta branche courante. La partie après ======= vient de la branche que tu fusionnes. (Attention : pendant un rebase, les rôles sont inversés.)',
        ),
        order(
          'Termine la résolution d’un conflit dans index.html.',
          [
            'Choisir la bonne version dans le fichier',
            'Supprimer les marqueurs <<<<<<< ======= >>>>>>>',
            'git add index.html',
            'git commit',
          ],
          'Corriger, nettoyer, marquer comme résolu avec add, puis enregistrer la fusion.',
        ),
        qcm(
          'Tu es au milieu d’une fusion pleine de conflits et tu veux tout annuler. Quelle commande ?',
          ['git revert HEAD', 'git stash drop', 'git merge --abort', 'git reset --soft'],
          2,
          'merge --abort remet la branche et les fichiers dans l’état d’avant la fusion.',
        ),
        qcm(
          'Quelle pratique réduit le plus les conflits dans une équipe de trois devs ?',
          [
            'Des branches courtes, fusionnées souvent, après avoir récupéré main',
            'Une branche par développeur pendant tout le projet',
            'Ne jamais faire de pull',
            'Tout coder dans un seul fichier',
          ],
          0,
          'Plus une branche vit longtemps, plus elle s’éloigne de main et plus les conflits sont gros. Intègre petit et souvent.',
        ),
        vf(
          'Après avoir corrigé un fichier en conflit, il faut faire git add pour le marquer comme résolu.',
          true,
          'git add indique à Git que le conflit est réglé. Tant qu’un fichier reste « unmerged », la fusion ne peut pas être terminée.',
        ),
      ]),

      lesson('rebase', 'Rebase ou merge ?', [
        tip(
          'git rebase : rejouer ses commits',
          'Au lieu de fusionner main dans ta branche, tu peux la rebaser : git rebase main, depuis ta branche, rejoue tes commits un par un au-dessus du dernier commit de main. Le résultat est un historique linéaire, sans commit de fusion. Mais les commits rejoués sont de nouveaux commits, avec de nouveaux identifiants.\n\nD’où la règle d’or : ne rebase jamais des commits que d’autres ont déjà récupérés, et jamais une branche partagée comme main. Sur ta propre branche de PR, c’est permis ; il faudra ensuite pousser avec git push --force-with-lease.\n\nEn cas de conflit pendant un rebase : corrige, git add, puis git rebase --continue ; ou git rebase --abort pour tout annuler. Le rebase interactif (git rebase -i HEAD~3) permet de nettoyer ses commits avant une PR : regrouper (squash, fixup), renommer (reword), supprimer (drop).\n\nEnfin, git cherry-pick <commit> copie un seul commit sur la branche courante, par exemple pour reporter un correctif sur une branche de version.',
          'git switch feat/paiement\ngit rebase main\n# conflit ? corriger, puis :\ngit add src/paiement.js\ngit rebase --continue\ngit push --force-with-lease',
        ),
        qcm(
          'Que fait git rebase main depuis la branche feat/paiement ?',
          [
            'Fusionne feat/paiement dans main',
            'Supprime les commits de main',
            'Crée un commit de fusion dans feat/paiement',
            'Rejoue les commits de feat/paiement au-dessus du dernier commit de main',
          ],
          3,
          'Ta branche repart du sommet de main. L’historique devient linéaire, mais les commits rejoués ont de nouveaux identifiants.',
        ),
        vf(
          'On peut rebaser main sans risque quand toute l’équipe l’a déjà récupérée.',
          false,
          'Rebaser réécrit les commits. Les autres auraient un historique qui ne correspond plus au tien : c’est la règle d’or à ne jamais enfreindre.',
        ),
        match('Associe chaque mot-clé du rebase interactif à son action.', [
          ['pick', 'Garde le commit tel quel'],
          ['reword', 'Garde le commit mais change son message'],
          ['squash', 'Fusionne avec le commit précédent en combinant les messages'],
          ['fixup', 'Fusionne avec le commit précédent en jetant ce message'],
          ['drop', 'Supprime le commit'],
        ]),
        fill(
          'Un conflit est résolu et le fichier ajouté. Poursuis le rebase.',
          'git rebase ___',
          ['--continue', '--next', '--commit', '--resume'],
          '--continue',
          'Git passe au commit suivant à rejouer. --skip ignore le commit courant, --abort annule tout le rebase.',
        ),
        qcm(
          'Après avoir rebasé ta branche de PR déjà poussée, git push est refusé. Quelle commande est la plus sûre ?',
          [
            'git push --force',
            'git push --force-with-lease',
            'git pull puis git push',
            'git push --tags',
          ],
          1,
          '--force-with-lease refuse d’écraser la branche distante si quelqu’un y a poussé entre-temps. Un git pull, lui, re-fusionnerait les anciens commits.',
        ),
        qcm(
          'Un correctif est sur main et tu dois le reporter seul sur la branche release/1.2. Quelle commande ?',
          ['git merge main', 'git rebase main', 'git cherry-pick <commit>', 'git revert <commit>'],
          2,
          'cherry-pick copie un commit précis (avec un nouvel identifiant) sans amener le reste de main.',
        ),
      ]),
    ],
  ),

  // ─────────────────────────────────────────────────────────────────────────────
  // Unité 5 — Remote, push, pull et pull requests (thème 3)
  // ─────────────────────────────────────────────────────────────────────────────
  unit(
    'github',
    'GitHub : remote, push, pull et PR',
    'Publier ton code, rester synchronisé avec l’équipe et contribuer par pull request.',
    [
      lesson('remote-push', 'Remotes et push', [
        tip(
          'Relier ton dépôt à GitHub',
          'Un remote est un nom court pour l’adresse d’un autre dépôt : origin par convention. git remote add origin <url> le déclare, git remote -v liste les remotes et leurs adresses, git remote set-url le modifie.\n\nPour t’authentifier, GitHub n’accepte plus le mot de passe de ton compte pour les opérations Git (depuis 2021). Deux options : en HTTPS avec un jeton d’accès personnel (personal access token) mémorisé par un gestionnaire d’identifiants ou par gh auth login ; ou en SSH avec une clé (ssh-keygen -t ed25519) dont tu ajoutes la partie publique (.pub) dans les paramètres de ton compte. La clé privée ne quitte jamais ta machine.\n\ngit push -u origin main envoie la branche et la relie à origin/main (-u, pour « upstream ») : ensuite, git push et git pull suffisent. Pour supprimer une branche distante : git push origin --delete feat/x.',
          'git remote add origin git@github.com:awa/hackathon-abidjan.git\ngit remote -v\ngit push -u origin main\n\n# nouvelle branche\ngit switch -c feat/carte\ngit push -u origin feat/carte',
        ),
        fill(
          'Envoie la branche main vers origin et relie-la pour les prochains push.',
          'git push ___ origin main',
          ['-u', '-f', '-m', '--all'],
          '-u',
          '-u (--set-upstream) mémorise le lien entre ta branche locale et origin/main. -f forcerait le push : à éviter.',
        ),
        vf(
          'On peut encore utiliser le mot de passe de son compte GitHub pour faire git push en HTTPS.',
          false,
          'GitHub exige un jeton d’accès personnel (ou une authentification via gh / un gestionnaire d’identifiants) en HTTPS, ou une clé SSH.',
        ),
        qcm(
          'Quelle partie d’une clé SSH ajoutes-tu dans les paramètres GitHub ?',
          [
            'La clé privée (id_ed25519)',
            'La clé publique (id_ed25519.pub)',
            'Les deux',
            'Aucune, GitHub la génère',
          ],
          1,
          'La clé publique peut être partagée sans risque. La clé privée reste sur ta machine et ne doit jamais être envoyée à personne.',
        ),
        match('Associe chaque commande à son rôle.', [
          ['git remote -v', 'Voir les remotes et leurs adresses'],
          ['git remote add origin <url>', 'Déclarer un remote'],
          ['git push -u origin feat/x', 'Publier une branche et la suivre'],
          ['git push origin --delete feat/x', 'Supprimer une branche distante'],
        ]),
        qcm(
          'git push est refusé avec « rejected (fetch first) ». Que se passe-t-il ?',
          [
            'Ta clé SSH a expiré',
            'Le dépôt est privé',
            'Ta branche locale n’existe pas',
            'Le remote contient des commits que tu n’as pas encore récupérés',
          ],
          3,
          'Git refuse d’écraser le travail des autres. Récupère d’abord (git pull), règle les éventuels conflits, puis pousse à nouveau.',
        ),
      ]),

      lesson('fetch-pull', 'fetch et pull', [
        tip(
          'Récupérer le travail des autres',
          'git fetch télécharge les nouveaux commits du remote et met à jour les branches de suivi (origin/main, origin/feat/x…), sans toucher à tes branches ni à tes fichiers. Tu peux ensuite regarder ce qui est arrivé : git log main..origin/main.\n\ngit pull = git fetch + intégration dans ta branche courante. Si ta branche et la branche distante ont toutes deux avancé, elles ont divergé : les versions récentes de git pull refusent de choisir à ta place tant que tu n’as pas réglé pull.rebase. Les choix possibles :\n• git pull --rebase (ou pull.rebase=true) : tes commits locaux sont rejoués au-dessus ;\n• git pull --no-rebase : un commit de fusion est créé ;\n• git pull --ff-only : accepte seulement une avance rapide.\n\ngit branch -vv montre, pour chaque branche, sa branche suivie et son avance ou son retard (ahead 1, behind 2). git fetch --prune nettoie les branches de suivi supprimées sur le remote.',
          "git fetch\ngit status        # Your branch is behind 'origin/main' by 2 commits\ngit pull --rebase\n\ngit config --global pull.rebase true   # choix par défaut",
        ),
        qcm(
          'Quelle différence entre git fetch et git pull ?',
          [
            'fetch télécharge sans intégrer ; pull télécharge puis intègre dans ta branche',
            'Aucune',
            'fetch envoie tes commits, pull les récupère',
            'fetch ne marche qu’avec SSH',
          ],
          0,
          'fetch est sans risque : il ne modifie que les branches de suivi origin/*. Pratique pour regarder avant d’intégrer.',
        ),
        qcm(
          'Que signifie cette ligne de git branch -vv ?',
          [
            'main est à jour',
            'main a 1 commit local non poussé et il lui manque 2 commits du remote',
            'main a 2 commits de plus que le remote',
            'origin/main a été supprimée',
          ],
          1,
          'ahead = commits locaux absents du remote ; behind = commits distants absents en local. Ici les branches ont divergé : un pull avec rebase ou fusion est nécessaire.',
          '* main 9b153bb [origin/main: ahead 1, behind 2] Ajoute la carte',
        ),
        vf(
          'git fetch modifie les fichiers de ton répertoire de travail.',
          false,
          'fetch ne met à jour que les références distantes (origin/main…). Tes fichiers et tes branches locales ne bougent pas.',
        ),
        fill(
          'Récupère et rejoue tes commits locaux au-dessus de ceux du remote.',
          'git pull ___',
          ['--rebase', '--force', '--all', '--merge-only'],
          '--rebase',
          'On obtient un historique linéaire, sans commit de fusion « Merge branch main of github.com… ».',
        ),
        vf(
          'Faire git pull avant de commencer à travailler réduit les conflits.',
          true,
          'Tu pars de la dernière version de l’équipe. Plus ta base est récente, moins tes changements risquent d’entrer en collision.',
        ),
        qcm(
          'git pull affiche « fatal: Need to specify how to reconcile divergent branches ». Que faire ?',
          [
            'Supprimer le dépôt local et recloner',
            'git push --force',
            'Choisir une stratégie : git pull --rebase ou --no-rebase (ou régler pull.rebase)',
            'Attendre que GitHub soit disponible',
          ],
          2,
          'Les deux branches ont avancé. Git veut savoir s’il doit fusionner ou rejouer tes commits. Le réglage pull.rebase évite la question à l’avenir.',
        ),
      ]),

      lesson('pull-request', 'Pull request, revue et issues', [
        tip(
          'Le cycle de la pull request',
          'Une pull request (PR) propose de fusionner une branche dans une autre, généralement main. Elle rassemble le diff, la discussion, la revue de code et les vérifications automatiques (CI). Le cycle : créer une branche, committer, pousser, ouvrir la PR avec une description claire (quoi, pourquoi, comment tester, captures si c’est visuel). Une PR en brouillon (draft) signale un travail en cours.\n\nLes relecteurs peuvent commenter, approuver (Approve) ou demander des changements (Request changes) ; ils peuvent proposer une modification exacte avec un bloc suggestion. On ne peut pas approuver sa propre PR. Avec une règle de protection de branche, main peut exiger une approbation et des tests verts avant toute fusion.\n\nÀ la fusion, GitHub propose trois méthodes : Create a merge commit, Squash and merge (tous les commits en un seul) et Rebase and merge.',
          'git switch -c fix/menu-mobile\ngit commit -am "fix(menu): ferme le menu après un clic"\ngit push -u origin fix/menu-mobile\n# GitHub : « Compare & pull request »',
        ),
        tip(
          'Issues et revue bienveillante',
          'Les issues servent à suivre bugs, idées et tâches : un titre précis, les étapes pour reproduire, le résultat attendu, des labels (bug, good first issue) et une personne assignée. Écrire « Closes #42 » (ou Fixes, Resolves) dans la description de la PR ferme automatiquement l’issue 42 quand la PR est fusionnée dans la branche par défaut.\n\nUne bonne revue porte sur le code, pas sur la personne : pose des questions (« que se passe-t-il si la liste est vide ? »), explique le pourquoi, distingue le bloquant du détail. Côté auteur, garde des PR petites et centrées sur un sujet : une PR de 100 lignes est relue sérieusement, une de 3 000 est survolée.',
        ),
        order(
          'Remets les étapes d’une contribution dans l’ordre.',
          [
            'Créer une branche',
            'Faire des commits',
            'Pousser la branche',
            'Ouvrir une pull request',
            'Corriger après la revue',
            'Fusionner',
          ],
          'C’est le cycle de travail de la plupart des équipes, de la startup de trois devs aux grands projets open source.',
        ),
        qcm(
          'Que se passe-t-il quand une PR contenant « Closes #12 » est fusionnée dans main (branche par défaut) ?',
          [
            'L’issue 12 est supprimée',
            'La PR 12 est rouverte',
            'Rien, c’est un simple texte',
            'L’issue 12 est fermée automatiquement',
          ],
          3,
          'Les mots-clés close, fix et resolve (et leurs variantes) relient la PR à l’issue et la ferment à la fusion dans la branche par défaut.',
        ),
        match('Associe chaque méthode de fusion GitHub à son résultat.', [
          ['Create a merge commit', 'Garde tous les commits et ajoute un commit de fusion'],
          ['Squash and merge', 'Regroupe toute la PR en un seul commit'],
          ['Rebase and merge', 'Rejoue les commits sur main, sans commit de fusion'],
        ]),
        vf(
          'Une petite PR centrée sur un seul sujet est plus vite et mieux relue qu’une énorme.',
          true,
          'Les relecteurs repèrent bien plus de problèmes sur un petit diff. Découpe les gros chantiers en plusieurs PR.',
        ),
        qcm(
          'Quel commentaire de revue est le plus utile ?',
          [
            '« C’est nul. »',
            '« Que se passe-t-il si panier est vide ? total vaudrait NaN ici. »',
            '« Je l’aurais fait autrement. »',
            '« LGTM » sans avoir lu',
          ],
          1,
          'Un bon commentaire est précis, actionnable et explique le risque. « LGTM » (looks good to me) n’a de valeur que si tu as vraiment relu.',
        ),
        vf(
          'L’auteur d’une PR peut l’approuver lui-même pour satisfaire une revue obligatoire.',
          false,
          'GitHub ne compte pas l’approbation de l’auteur. C’est tout l’intérêt de la revue : un second regard.',
        ),
      ]),

      lesson('fork-open-source', 'Fork et contribution open source', [
        tip(
          'Contribuer à un projet dont tu n’es pas membre',
          'Tu n’as pas le droit de pousser sur le dépôt d’un projet open source. La solution : le fork, une copie du dépôt sous ton compte GitHub, où tu as tous les droits. Tu clones ton fork, tu crées une branche, tu pousses sur ton fork, puis tu ouvres une PR de ta branche vers le dépôt d’origine.\n\nPour rester à jour, ajoute le dépôt d’origine comme second remote, nommé upstream par convention, et récupère régulièrement ses nouveautés (ou utilise le bouton « Sync fork » sur GitHub).\n\nAvant de contribuer, lis le README, le CONTRIBUTING.md et la licence ; cherche les issues étiquetées good first issue ; et pour un gros changement, discute d’abord dans une issue pour éviter de travailler pour rien.',
          'git clone git@github.com:moussa/projet-libre.git\ncd projet-libre\ngit remote add upstream https://github.com/organisation/projet-libre.git\ngit fetch upstream\ngit switch -c fix/traduction-wolof upstream/main\n# … commits …\ngit push -u origin fix/traduction-wolof\n# puis PR : moussa/projet-libre → organisation/projet-libre',
        ),
        order(
          'Remets dans l’ordre une première contribution open source.',
          [
            'Forker le dépôt sur GitHub',
            'Cloner ton fork',
            'Créer une branche',
            'Committer et pousser sur ton fork',
            'Ouvrir une PR vers le dépôt d’origine',
          ],
          'Le fork est ta copie avec droits d’écriture ; la PR traverse de ton fork vers le projet.',
        ),
        qcm(
          'Dans un fork cloné, comment nomme-t-on habituellement le remote du dépôt d’origine ?',
          ['origin', 'main', 'upstream', 'parent'],
          2,
          'origin pointe vers ton fork (où tu pousses), upstream vers le projet d’origine (d’où tu récupères les nouveautés).',
        ),
        fill(
          'Ajoute le dépôt d’origine comme remote upstream.',
          'git remote ___ upstream https://github.com/organisation/projet-libre.git',
          ['add', 'new', 'set', 'clone'],
          'add',
          'Ensuite, git fetch upstream récupère les nouveautés du projet sans toucher à ton fork.',
        ),
        vf(
          'Pour un gros changement, il vaut mieux ouvrir une issue et en discuter avant de coder.',
          true,
          'Les mainteneurs peuvent avoir d’autres plans. Une discussion préalable évite une PR refusée après des jours de travail.',
        ),
        qcm(
          'Où trouver les règles de contribution d’un projet ?',
          ['Dans CONTRIBUTING.md', 'Dans .gitignore', 'Dans package-lock.json', 'Dans le reflog'],
          0,
          'CONTRIBUTING.md explique comment installer le projet, les conventions de code et de commit, et le processus de PR.',
        ),
        vf(
          'Un fork est une copie du dépôt sur ton compte GitHub, sur laquelle tu peux pousser.',
          true,
          'Il garde un lien avec le dépôt d’origine, ce qui permet d’ouvrir des PR vers lui et de se resynchroniser.',
        ),
      ]),
    ],
  ),

  // ─────────────────────────────────────────────────────────────────────────────
  // Unité 6 — Bonnes pratiques et secrets (thème 4)
  // ─────────────────────────────────────────────────────────────────────────────
  unit(
    'bonnes-pratiques',
    'Bonnes pratiques et secrets',
    'Versionner proprement, automatiser les vérifications et protéger les secrets.',
    [
      lesson('tags-versions', 'Tags et versions', [
        tip(
          'Marquer une version avec un tag',
          'Un tag est une étiquette fixe posée sur un commit, par exemple v1.2.0 pour une mise en production. Contrairement à une branche, il ne bouge pas. Il en existe deux sortes : le tag léger (git tag v1.2.0), simple pointeur, et le tag annoté (git tag -a v1.2.0 -m "…"), un vrai objet avec auteur, date et message, recommandé pour les versions.\n\ngit push n’envoie pas les tags : il faut git push origin v1.2.0 (un tag) ou git push --tags (tous). Sur GitHub, une Release s’appuie sur un tag et ajoute des notes de version et des fichiers à télécharger.\n\nLe versionnage sémantique (SemVer) écrit MAJEUR.MINEUR.CORRECTIF : on incrémente le correctif pour un fix, le mineur pour une fonctionnalité compatible (feat), le majeur pour un changement incompatible. Avec Conventional Commits, des outils peuvent calculer la prochaine version et générer le changelog automatiquement.',
          'git tag -a v1.2.0 -m "Version 1.2.0 : paiement Mobile Money"\ngit push origin v1.2.0\ngit tag                 # liste les tags\ngit show v1.2.0',
        ),
        fill(
          'Crée un tag annoté pour la version 2.0.0.',
          'git tag ___ v2.0.0 -m "Version 2.0.0"',
          ['-a', '-b', '-v', '-n'],
          '-a',
          '-a crée un tag annoté, avec auteur, date et message. Sans -a ni -m, on obtient un tag léger.',
        ),
        vf(
          'git push envoie automatiquement les nouveaux tags.',
          false,
          'Les tags se poussent explicitement : git push origin v2.0.0 ou git push --tags. (--follow-tags envoie les tags annotés liés aux commits poussés.)',
        ),
        qcm(
          'La version actuelle est 1.4.2. Tu ajoutes une fonctionnalité compatible. Quelle est la prochaine version en SemVer ?',
          ['1.4.3', '2.0.0', '1.5.0', '1.4.2-feat'],
          2,
          'Une fonctionnalité compatible incrémente le mineur et remet le correctif à 0. Un simple fix aurait donné 1.4.3, un changement incompatible 2.0.0.',
        ),
        match('Associe chaque type de commit à la partie de version qu’il fait monter.', [
          ['fix', 'Correctif (1.4.2 → 1.4.3)'],
          ['feat', 'Mineur (1.4.2 → 1.5.0)'],
          ['feat! ou BREAKING CHANGE', 'Majeur (1.4.2 → 2.0.0)'],
        ]),
        qcm(
          'Quelle différence entre une branche et un tag ?',
          [
            'Aucune',
            'Un tag ne peut pas être poussé',
            'Une branche est fixe, un tag avance',
            'Une branche avance avec les nouveaux commits ; un tag reste sur son commit',
          ],
          3,
          'C’est ce qui rend le tag idéal pour marquer une version : v1.2.0 désignera toujours exactement le même code.',
        ),
      ]),

      lesson('github-actions', 'GitHub Actions en survol', [
        tip(
          'Automatiser les vérifications',
          'GitHub Actions exécute des tâches automatiquement quand un événement se produit : un push, l’ouverture d’une PR, un tag, un horaire. Un workflow est un fichier YAML placé dans .github/workflows/. Il contient des jobs (exécutés en parallèle par défaut, ou à la suite avec needs), qui tournent sur une machine (runs-on: ubuntu-latest) et enchaînent des étapes (steps) : des actions toutes faites (uses) ou des commandes (run).\n\nL’usage le plus courant est l’intégration continue (CI) : à chaque PR, installer les dépendances, lancer le lint et les tests. Avec une règle de protection, main n’accepte que des PR au statut vert.\n\nLes secrets (clés de déploiement, jetons) se déclarent dans Settings → Secrets and variables → Actions et se lisent avec ${{ secrets.NOM }} ; GitHub les masque dans les journaux. Ils ne sont pas transmis aux workflows lancés par une PR venant d’un fork.',
          '# .github/workflows/ci.yml\nname: CI\non: [push, pull_request]\njobs:\n  tests:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 22\n      - run: npm ci\n      - run: npm test',
        ),
        qcm(
          'Où place-t-on les fichiers de workflow GitHub Actions ?',
          ['.github/workflows/', '.git/hooks/', 'workflows/ à la racine', '.github/actions.json'],
          0,
          'Tout fichier .yml ou .yaml dans .github/workflows/ est un workflow. GitHub le détecte dès qu’il est poussé.',
        ),
        fill(
          'Déclenche le workflow à chaque ouverture ou mise à jour de pull request.',
          'on: [push, ___]',
          ['pull_request', 'merge', 'commit', 'review'],
          'pull_request',
          'push et pull_request sont les deux déclencheurs les plus courants pour la CI.',
        ),
        vf(
          'Pour utiliser une clé d’API dans un workflow, on l’écrit directement dans le fichier YAML.',
          false,
          'Le YAML est versionné, donc visible. On stocke la clé dans les secrets du dépôt et on la lit avec ${{ secrets.NOM }}.',
        ),
        match('Associe chaque mot-clé de workflow à son rôle.', [
          ['on', 'Les événements qui déclenchent le workflow'],
          ['runs-on', 'La machine qui exécute le job'],
          ['uses', 'Utilise une action toute faite'],
          ['run', 'Exécute une commande shell'],
        ]),
        qcm(
          'Par défaut, comment s’exécutent deux jobs d’un même workflow ?',
          [
            'Toujours l’un après l’autre',
            'En parallèle, sauf si l’un déclare needs vers l’autre',
            'Seulement si on clique sur « Run »',
            'Un seul job est autorisé par workflow',
          ],
          1,
          'needs: tests oblige un job (deploy, par exemple) à attendre la réussite du job tests.',
        ),
      ]),

      lesson('secrets', 'Secrets : prévenir et réagir', [
        tip(
          'Ne jamais committer un secret',
          'Mots de passe, clés d’API, jetons, clés privées : rien de tout cela ne doit entrer dans Git, même dans un dépôt privé (il peut devenir public, être cloné par un prestataire, fuiter). Le code lit les secrets dans des variables d’environnement, chargées en local depuis un fichier .env ignoré par Git. On committe à la place un .env.example avec les noms des variables et des valeurs factices, pour que les autres sachent quoi remplir.\n\nAjoute des garde-fous : .env dans le .gitignore dès le premier commit, git diff --staged avant de committer, un outil comme gitleaks en hook pre-commit ou en CI. Sur les dépôts publics, GitHub détecte de nombreux formats de secrets (secret scanning) et peut bloquer un push qui en contient (push protection).',
          '# .env.example (committé)\nDATABASE_URL=postgres://user:motdepasse@localhost:5432/app\nMOBILE_MONEY_API_KEY=a-remplir\n\n# .gitignore\n.env',
        ),
        tip(
          'Un secret a fuité : l’ordre des actions',
          'Des robots parcourent GitHub en continu à la recherche de clés : un secret poussé sur un dépôt public peut être exploité en quelques minutes. Considère-le comme compromis, même si tu supprimes le commit tout de suite.\n\n1. Révoque le secret et génère-en un nouveau chez le fournisseur (rotation). C’est l’étape qui protège vraiment.\n2. Remplace-le partout où il est utilisé (serveur, secrets de la CI).\n3. Vérifie les journaux du fournisseur pour repérer un usage frauduleux.\n4. Nettoie l’historique si nécessaire avec git filter-repo ou BFG, puis push forcé coordonné avec l’équipe. Mais les clones et forks existants gardent l’ancienne version : le nettoyage ne remplace jamais la rotation.\n\nUn simple commit qui supprime le fichier ne suffit pas : le secret reste lisible dans l’historique.',
        ),
        qcm(
          'Une clé d’API Mobile Money a été poussée sur un dépôt public. Quelle est la première action ?',
          [
            'Supprimer le fichier dans un nouveau commit',
            'Rendre le dépôt privé',
            'Ajouter le fichier au .gitignore',
            'Révoquer la clé et en générer une nouvelle',
          ],
          3,
          'Seule la rotation rend la clé volée inutilisable. Les autres actions n’effacent pas les copies déjà faites par des robots.',
        ),
        vf(
          'Un commit qui supprime .env suffit à protéger le secret qu’il contenait.',
          false,
          'Le fichier reste dans les commits précédents : n’importe qui peut le lire avec git log -p ou git show.',
        ),
        order(
          'Remets dans l’ordre la réaction à une fuite de secret.',
          [
            'Révoquer le secret chez le fournisseur',
            'Générer un nouveau secret et le déployer',
            'Vérifier les journaux d’utilisation',
            'Nettoyer l’historique avec git filter-repo et prévenir l’équipe',
          ],
          'Protéger d’abord (rotation), réparer ensuite, nettoyer en dernier.',
        ),
        qcm(
          'Que doit contenir le fichier .env.example committé ?',
          [
            'Les vrais secrets de production',
            'Les noms des variables avec des valeurs factices',
            'Rien, il doit être vide',
            'Une copie du .gitignore',
          ],
          1,
          'Il documente la configuration attendue sans rien exposer. Chaque dev copie .env.example en .env et y met ses propres valeurs.',
        ),
        vf(
          'Un dépôt privé peut contenir des mots de passe sans risque.',
          false,
          'Un dépôt privé peut être rendu public, partagé, cloné sur une machine volée. Les secrets restent hors de Git, partout.',
        ),
        match('Associe chaque outil à son rôle.', [
          ['.gitignore', 'Empêcher .env d’être suivi'],
          ['.env.example', 'Documenter les variables attendues'],
          ['gitleaks', 'Détecter des secrets avant ou après un commit'],
          ['git filter-repo', 'Réécrire l’historique pour retirer un fichier'],
        ]),
      ]),

      lesson('revision-hackathon', 'Récap et pratique : un hackathon à Abidjan', [
        tip(
          'Tout mettre ensemble',
          'Awa, Koffi et Fatou ont 48 heures pour un hackathon à Abidjan. Leur routine Git :\n• un dépôt sur GitHub, main protégée, une CI qui lance les tests à chaque PR ;\n• chaque tâche dans une issue, chaque issue dans une branche courte (feat/carte, fix/paiement) ;\n• git pull --rebase avant de commencer, commits atomiques au format Conventional Commits ;\n• PR petites, relues par un coéquipier, avec « Closes #n » ;\n• secrets dans .env (ignoré) et dans les secrets GitHub Actions, .env.example committé ;\n• un tag v1.0.0 annoté sur le commit présenté au jury.\n\nEn cas de pépin : git stash pour changer de branche en urgence, git revert pour annuler un commit partagé, git reflog si un reset a mal tourné, et rotation immédiate si un secret fuit.',
        ),
        qcm(
          'Fatou a poussé sur main un commit qui casse la démo, à 1 heure du jury. Que faire ?',
          [
            'git reset --hard HEAD~1 puis git push --force',
            'git revert <commit> puis git push',
            'Supprimer le dépôt GitHub',
            'git commit --amend',
          ],
          1,
          'Sur une branche partagée, revert est sûr : Awa et Koffi n’auront qu’à faire git pull. Un push forcé casserait leurs copies.',
        ),
        order(
          'Koffi démarre une nouvelle tâche. Remets ses commandes dans l’ordre.',
          [
            'git switch main',
            'git pull --rebase',
            'git switch -c feat/carte-points-relais',
            'git commit -am "feat(carte): affiche les points relais"',
            'git push -u origin feat/carte-points-relais',
          ],
          'Partir de la dernière version de main, créer une branche dédiée, committer, publier pour ouvrir une PR.',
        ),
        match('Associe chaque situation à la bonne commande.', [
          ['Mettre son travail de côté en urgence', 'git stash'],
          ['Annuler un commit déjà partagé', 'git revert'],
          ['Retrouver un commit perdu après un reset', 'git reflog'],
          ['Marquer la version présentée au jury', 'git tag -a v1.0.0'],
          ['Récupérer sans intégrer', 'git fetch'],
        ]),
        qcm(
          'Awa et Koffi ont modifié la même ligne de README.md. La fusion s’arrête en conflit. Quelle est la bonne suite ?',
          [
            'git merge --abort et abandonner la fonctionnalité',
            'git push --force',
            'Éditer README.md, retirer les marqueurs, git add README.md, puis git commit',
            'Supprimer README.md',
          ],
          2,
          'Un conflit se résout à la main : garder la bonne version, nettoyer les marqueurs, marquer comme résolu avec add, terminer avec commit.',
        ),
        vf(
          'Pendant le hackathon, mieux vaut une seule grosse PR finale que plusieurs petites.',
          false,
          'De petites PR fusionnées souvent limitent les conflits et se relisent en quelques minutes, même sous pression.',
        ),
        fill(
          'Pousse le tag de la version présentée au jury.',
          'git push origin ___',
          ['v1.0.0', '--all', 'main', 'HEAD~1'],
          'v1.0.0',
          'Un tag se pousse explicitement par son nom (ou avec --tags). Sur GitHub, tu peux ensuite créer une Release à partir de ce tag.',
        ),
        qcm(
          'Quel message de commit respecte Conventional Commits ?',
          [
            'Ajout carte',
            'feat(carte): affiche les points relais Mobile Money',
            'FEAT - carte',
            'carte: feat',
          ],
          1,
          'type(portée): description. Le type en minuscules, la portée facultative entre parenthèses, puis deux-points et une description courte.',
        ),
      ]),
    ],
  ),
];
