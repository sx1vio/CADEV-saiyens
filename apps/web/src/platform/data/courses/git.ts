import { fill, lesson, match, order, qcm, tip, unit, vf } from './dsl';
import type { CourseUnit } from './types';

export const units: CourseUnit[] = [
  unit('premiers-commits', 'Tes premiers commits', 'Suivre les versions de ton projet avec Git.', [
    lesson('pourquoi', 'Pourquoi Git ?', [
      tip(
        'Une machine à remonter le temps',
        'Git enregistre l’histoire de ton projet sous forme de commits : des photos de tes fichiers à un instant donné, avec un message. Tu peux revenir en arrière, comparer des versions et travailler à plusieurs sans écraser le travail des autres. GitHub, c’est un site qui héberge des dépôts Git en ligne.',
      ),
      vf(
        'Git et GitHub sont la même chose.',
        false,
        'Git est l’outil installé sur ton ordinateur ; GitHub est un service en ligne qui héberge des dépôts Git.',
      ),
      qcm(
        'Qu’est-ce qu’un commit ?',
        ['Un fichier supprimé', 'Une version enregistrée du projet, avec un message', 'Un serveur'],
        1,
        'Chaque commit a un identifiant unique, un auteur, une date et un message.',
      ),
      qcm(
        'Comment s’appelle un projet suivi par Git ?',
        ['Un dépôt (repository)', 'Un paquet', 'Un conteneur'],
        0,
        'On dit aussi « repo ».',
      ),
      match('Associe chaque notion à sa définition.', [
        ['Dépôt', 'Le projet et tout son historique'],
        ['Commit', 'Une version enregistrée'],
        ['Branche', 'Une ligne de travail parallèle'],
        ['Remote', 'La copie en ligne du dépôt'],
      ]),
      vf(
        'Git fonctionne sans connexion Internet.',
        true,
        'Tout l’historique est sur ton ordinateur ; Internet ne sert qu’à envoyer ou récupérer.',
      ),
    ]),
    lesson('init', 'Créer un dépôt', [
      tip(
        'git init et git status',
        'Dans le dossier de ton projet, git init crée un dépôt. git status est la commande à taper sans modération : elle dit quels fichiers ont changé et ce qui sera enregistré au prochain commit. Avant le premier commit, configure ton nom et ton e-mail.',
        'git config --global user.name "Awa Diop"\ngit config --global user.email "awa@exemple.com"\ncd mon-projet\ngit init\ngit status',
      ),
      fill(
        'Crée un dépôt dans le dossier courant.',
        'git ___',
        ['init', 'start', 'new'],
        'init',
        'git init crée un dossier caché .git qui contient l’historique.',
      ),
      qcm(
        'Quelle commande montre l’état des fichiers ?',
        ['git log', 'git status', 'git show'],
        1,
        'git status liste les fichiers modifiés, prêts ou non suivis.',
      ),
      vf(
        'Le dossier caché .git contient tout l’historique du projet.',
        true,
        'Le supprimer efface l’historique : ne le touche pas.',
      ),
      order(
        'Démarre un nouveau projet suivi par Git.',
        ['mkdir portfolio', 'cd portfolio', 'git init', 'git status'],
        'Créer le dossier, y entrer, initialiser, vérifier.',
      ),
      qcm(
        'Pourquoi configurer user.name et user.email ?',
        ['Pour signer tes commits', 'Pour créer un compte GitHub', 'Pour accélérer Git'],
        0,
        'Chaque commit enregistre son auteur.',
      ),
    ]),
    lesson('add-commit', 'Enregistrer une version', [
      tip(
        'add puis commit',
        'Enregistrer se fait en deux temps. git add choisit les changements à inclure (on dit qu’on les met dans la zone de préparation). git commit -m enregistre la version avec un message qui explique pourquoi.',
        'git add index.html style.css\ngit commit -m "Ajoute la page d’accueil"\n\n# Tout ajouter :\ngit add .',
      ),
      order(
        'Enregistre une modification de index.html.',
        ['git status', 'git add index.html', 'git commit -m "Corrige le titre"'],
        'Vérifier, préparer, enregistrer.',
      ),
      fill(
        'Prépare tous les fichiers modifiés.',
        'git add ___',
        ['.', '*all', '-A-all'],
        '.',
        'Le point désigne le dossier courant et tout son contenu.',
      ),
      qcm(
        'Quel message de commit est le plus utile ?',
        ['« modifs »', '« Corrige le calcul du total du panier »', '« ok »'],
        1,
        'Un bon message dit ce qui change et pourquoi : ton futur toi te remerciera.',
      ),
      vf(
        'git commit enregistre aussi les changements qui n’ont pas été ajoutés avec git add.',
        false,
        'Seul ce qui est dans la zone de préparation est enregistré.',
      ),
      qcm(
        'Que fait l’option -m ?',
        ['Fusionne', 'Donne le message du commit', 'Modifie le dernier commit'],
        1,
        'Sans -m, Git ouvre un éditeur pour écrire le message.',
      ),
    ]),
  ]),

  unit('historique', 'Naviguer dans l’historique', 'Comparer et annuler des changements.', [
    lesson('log', 'Lire l’historique', [
      tip(
        'git log et git diff',
        'git log liste les commits du plus récent au plus ancien. git log --oneline les résume sur une ligne. git diff montre les lignes modifiées qui ne sont pas encore préparées : en rouge ce qui est retiré, en vert ce qui est ajouté.',
        'git log --oneline\n# a1b2c3d Ajoute le formulaire de contact\n# 9f8e7d6 Ajoute la page d’accueil\n\ngit diff',
      ),
      qcm(
        'Quelle commande affiche les commits sur une ligne chacun ?',
        ['git log --oneline', 'git status -s', 'git show --short'],
        0,
        'Pratique pour retrouver rapidement un commit.',
      ),
      fill(
        'Montre les changements pas encore préparés.',
        'git ___',
        ['diff', 'changes', 'compare'],
        'diff',
        'git diff --staged montre ce qui est déjà préparé.',
      ),
      vf(
        'Chaque commit a un identifiant unique, comme a1b2c3d.',
        true,
        'C’est un hachage (SHA) ; les 7 premiers caractères suffisent en général.',
      ),
      qcm(
        'Dans git diff, que signifient les lignes en vert commençant par + ?',
        ['Des lignes ajoutées', 'Des lignes supprimées', 'Des erreurs'],
        0,
        'Les + sont ajoutées, les - retirées.',
      ),
      match('Associe chaque commande à ce qu’elle montre.', [
        ['git log', 'La liste des commits'],
        ['git diff', 'Les lignes modifiées'],
        ['git status', 'L’état des fichiers'],
        ['git show a1b2c3d', 'Le détail d’un commit'],
      ]),
    ]),
    lesson('annuler', 'Annuler sans paniquer', [
      tip(
        'Revenir en arrière',
        'git restore fichier annule les changements non enregistrés d’un fichier. git restore --staged le retire de la préparation. Pour annuler un commit déjà partagé, git revert crée un nouveau commit inverse : l’historique reste intact.',
        'git restore index.html          # jette mes modifs locales\ngit restore --staged index.html # retire de la préparation\ngit revert a1b2c3d              # annule un commit proprement',
      ),
      qcm(
        'Comment annuler un commit déjà poussé sur GitHub sans réécrire l’historique ?',
        ['git revert', 'git delete', 'git reset --hard'],
        0,
        'revert ajoute un commit qui défait l’ancien : sûr pour les autres.',
      ),
      vf(
        'git restore fichier supprime définitivement tes modifications non enregistrées.',
        true,
        'Ce qui n’a jamais été commité ne peut pas être récupéré : vérifie avant.',
      ),
      fill(
        'Retire le fichier de la zone de préparation.',
        'git restore ___ config.js',
        ['--staged', '--undo', '--remove'],
        '--staged',
        'Le fichier garde tes modifications, il n’est simplement plus préparé.',
      ),
      qcm(
        'Tu as oublié un fichier dans ton dernier commit (pas encore poussé). Que faire ?',
        ['git add fichier puis git commit --amend', 'Supprimer le dépôt', 'git revert'],
        0,
        '--amend modifie le dernier commit. À éviter s’il a déjà été partagé.',
      ),
      vf(
        'git reset --hard est sans danger.',
        false,
        'Il efface les modifications non enregistrées : à utiliser en connaissance de cause.',
      ),
    ]),
    lesson('gitignore', 'Ignorer des fichiers', [
      tip(
        '.gitignore',
        'Certains fichiers ne doivent jamais aller dans Git : dépendances (node_modules, .venv), fichiers générés (dist), et surtout les secrets (.env avec mots de passe et clés d’API). On les liste dans un fichier .gitignore à la racine.',
        '# .gitignore\nnode_modules/\ndist/\n.env\n*.log',
      ),
      qcm(
        'Lequel ne doit jamais être commité ?',
        ['README.md', '.env avec ta clé d’API', 'index.html'],
        1,
        'Un secret poussé sur GitHub est trouvé par des robots en quelques minutes.',
      ),
      vf(
        'Ajouter .env au .gitignore retire aussi le fichier des anciens commits.',
        false,
        'Le .gitignore n’agit que pour l’avenir. Une clé déjà poussée doit être révoquée et remplacée.',
      ),
      fill(
        'Ignore le dossier des dépendances.',
        '# .gitignore\n___/',
        ['node_modules', 'src', 'public'],
        'node_modules',
        'Les dépendances se réinstallent avec npm install : inutile de les versionner.',
      ),
      qcm(
        'Ta clé d’API a été poussée par erreur. Première chose à faire ?',
        [
          'La révoquer et en créer une nouvelle',
          'Supprimer le commit et attendre',
          'Rendre le dépôt privé',
        ],
        0,
        'Considère-la comme volée : révoque-la tout de suite.',
      ),
      match('Associe chaque entrée à ce qu’elle ignore.', [
        ['*.log', 'Tous les fichiers de logs'],
        ['dist/', 'Le dossier de build'],
        ['.env', 'Les variables secrètes'],
        ['.DS_Store', 'Un fichier système de macOS'],
      ]),
    ]),
  ]),

  unit('branches', 'Les branches', 'Développer une fonctionnalité sans casser le reste.', [
    lesson('branch', 'Créer une branche', [
      tip(
        'Travailler à côté',
        'Une branche est une ligne de travail parallèle. main reste stable pendant que tu développes une fonctionnalité sur une autre branche. git switch -c crée une branche et s’y place.',
        'git switch -c ajout-formulaire\n# … modifications et commits …\ngit switch main\ngit branch   # liste les branches',
      ),
      fill(
        'Crée la branche et place-toi dessus.',
        'git switch ___ page-contact',
        ['-c', '-n', '--new'],
        '-c',
        '-c pour create.',
      ),
      vf(
        'Les commits faits sur une branche n’apparaissent pas sur main tant qu’on ne fusionne pas.',
        true,
        'C’est tout l’intérêt : main reste stable.',
      ),
      qcm(
        'Quelle commande liste les branches ?',
        ['git branch', 'git list', 'git switch'],
        0,
        'L’astérisque indique la branche courante.',
      ),
      qcm(
        'Quel nom de branche est le plus clair ?',
        ['test2', 'fix/total-panier-negatif', 'branche-awa'],
        1,
        'Un préfixe (feat/, fix/) et une description courte disent à quoi sert la branche.',
      ),
      order(
        'Développe une fonctionnalité sur sa propre branche.',
        [
          'git switch -c feat/recherche',
          'git add .',
          'git commit -m "Ajoute la recherche"',
          'git switch main',
        ],
        'Créer la branche, enregistrer le travail, revenir sur main.',
      ),
    ]),
    lesson('merge', 'Fusionner', [
      tip(
        'Ramener le travail sur main',
        'Quand la fonctionnalité est prête, on se place sur main et on fusionne la branche avec git merge. Les commits de la branche rejoignent main.',
        'git switch main\ngit merge feat/recherche\ngit branch -d feat/recherche  # supprime la branche fusionnée',
      ),
      order(
        'Fusionne la branche feat/recherche dans main.',
        ['git switch main', 'git merge feat/recherche', 'git branch -d feat/recherche'],
        'On se place sur la branche qui reçoit, puis on fusionne.',
      ),
      qcm(
        'Sur quelle branche faut-il être pour fusionner feat/recherche dans main ?',
        ['feat/recherche', 'main', 'N’importe laquelle'],
        1,
        'git merge ramène l’autre branche dans la branche courante.',
      ),
      vf(
        'git branch -d refuse de supprimer une branche non fusionnée.',
        true,
        'C’est une sécurité ; -D force la suppression.',
      ),
      fill(
        'Fusionne la branche dans la branche courante.',
        'git ___ fix/login',
        ['merge', 'join', 'pull'],
        'merge',
        'merge combine les historiques.',
      ),
      qcm(
        'Après la fusion, à quoi sert encore la branche ?',
        [
          'À rien, on peut la supprimer',
          'Elle est obligatoire',
          'Elle contient une copie de secours',
        ],
        0,
        'Son travail est dans main ; la supprimer garde le dépôt lisible.',
      ),
    ]),
    lesson('conflits', 'Résoudre un conflit', [
      tip(
        'Quand deux changements se croisent',
        'Si deux branches modifient la même ligne, Git ne peut pas choisir : c’est un conflit. Il marque la zone avec <<<<<<<, ======= et >>>>>>>. Tu gardes la bonne version, tu supprimes les marqueurs, puis tu fais add et commit.',
        '<<<<<<< HEAD\n<h1>Bienvenue</h1>\n=======\n<h1>Bienvenue sur DevHub</h1>\n>>>>>>> feat/titre',
      ),
      vf(
        'Un conflit signifie que Git a perdu ton travail.',
        false,
        'Les deux versions sont là : Git te demande seulement de choisir.',
      ),
      qcm(
        'Que représente la partie entre <<<<<<< HEAD et ======= ?',
        [
          'La version de ta branche courante',
          'La version de l’autre branche',
          'Un commentaire de Git',
        ],
        0,
        'HEAD est ta branche courante ; la partie suivante vient de la branche fusionnée.',
      ),
      order(
        'Termine la résolution d’un conflit.',
        [
          'Choisir la bonne version dans le fichier',
          'Supprimer les marqueurs <<<<<<< ======= >>>>>>>',
          'git add index.html',
          'git commit',
        ],
        'Corriger, nettoyer, préparer, enregistrer.',
      ),
      qcm(
        'Comment éviter beaucoup de conflits ?',
        [
          'Des branches courtes et fusionnées souvent',
          'Ne jamais faire de branches',
          'Travailler tous sur le même fichier',
        ],
        0,
        'Plus une branche vit longtemps, plus elle s’éloigne de main.',
      ),
      vf(
        'On peut annuler une fusion en conflit avec git merge --abort.',
        true,
        'Tout revient comme avant la fusion.',
      ),
    ]),
  ]),

  unit('github', 'Collaborer sur GitHub', 'Publier ton code et contribuer à des projets.', [
    lesson('push', 'Envoyer sur GitHub', [
      tip(
        'remote, push et pull',
        'Un remote est l’adresse de la copie en ligne (souvent appelée origin). git push envoie tes commits, git pull récupère ceux des autres. git clone télécharge un dépôt existant.',
        'git remote add origin https://github.com/awa/portfolio.git\ngit push -u origin main\n\ngit pull            # récupérer les nouveautés\ngit clone https://github.com/awa/portfolio.git',
      ),
      match('Associe chaque commande à son rôle.', [
        ['git push', 'Envoyer mes commits'],
        ['git pull', 'Récupérer les commits des autres'],
        ['git clone', 'Télécharger un dépôt'],
        ['git remote -v', 'Voir les adresses en ligne'],
      ]),
      fill(
        'Envoie la branche main vers GitHub.',
        'git ___ origin main',
        ['push', 'send', 'upload'],
        'push',
        'push envoie les commits locaux vers le remote.',
      ),
      vf(
        'Il faut faire git pull avant de commencer à travailler pour partir de la dernière version.',
        true,
        'Moins de conflits et pas de mauvaise surprise au push.',
      ),
      qcm(
        'Que veut dire origin ?',
        ['Le nom habituel du remote principal', 'La première branche', 'Le premier commit'],
        0,
        'C’est un simple nom, donné par défaut par git clone.',
      ),
      qcm(
        'git push est refusé car le remote a des commits que tu n’as pas. Que faire ?',
        ['git pull, puis git push', 'git push --force sans réfléchir', 'Supprimer le dépôt'],
        0,
        '--force écraserait le travail des autres.',
      ),
    ]),
    lesson('pull-request', 'La pull request', [
      tip(
        'Proposer un changement',
        'Une pull request (PR) propose de fusionner ta branche dans main. Tes coéquipiers relisent le code, commentent, et la CI lance les tests automatiquement. Une fois approuvée, la PR est fusionnée.',
        'git switch -c fix/menu-mobile\n# … commits …\ngit push -u origin fix/menu-mobile\n# Puis sur GitHub : « Compare & pull request »',
      ),
      order(
        'Remets les étapes d’une contribution dans l’ordre.',
        [
          'Créer une branche',
          'Faire des commits',
          'Pousser la branche',
          'Ouvrir une pull request',
          'Fusionner après relecture',
        ],
        'C’est le cycle de travail de la plupart des équipes.',
      ),
      qcm(
        'À quoi sert la relecture d’une PR ?',
        [
          'Trouver des bugs et partager les connaissances',
          'Ralentir l’équipe',
          'Changer l’auteur du code',
        ],
        0,
        'Deux paires d’yeux valent mieux qu’une.',
      ),
      vf(
        'Une petite PR est plus facile et plus rapide à relire qu’une énorme.',
        true,
        'Vise une PR par sujet.',
      ),
      qcm(
        'Pour contribuer à un projet open source dont tu n’es pas membre, tu commences par…',
        ['Un fork du dépôt', 'Un push direct sur main', 'Un e-mail au créateur'],
        0,
        'Le fork est ta copie ; tu ouvres ensuite une PR vers le projet d’origine.',
      ),
      fill(
        'Pousse ta nouvelle branche et suis-la.',
        'git push ___ origin fix/menu-mobile',
        ['-u', '-f', '-m'],
        '-u',
        '-u relie la branche locale à la branche distante pour les prochains push.',
      ),
    ]),
    lesson('readme', 'Un projet présentable', [
      tip(
        'README et bonnes pratiques',
        'Le README.md est la vitrine de ton dépôt : ce que fait le projet, une capture, comment l’installer et le lancer. Ajoute une licence (MIT est courante) pour dire ce que les autres ont le droit de faire. Un portfolio GitHub soigné aide vraiment à trouver un emploi.',
        '# Mon portfolio\n\nSite personnel en HTML et CSS.\n\n## Lancer\n\nOuvre index.html dans ton navigateur.\n\n## Licence\n\nMIT',
      ),
      qcm(
        'Que doit contenir un bon README ?',
        [
          'À quoi sert le projet et comment le lancer',
          'Ton mot de passe',
          'Uniquement le nom du projet',
        ],
        0,
        'Quelqu’un qui découvre le dépôt doit pouvoir le lancer seul.',
      ),
      vf(
        'Le README s’écrit en Markdown : # pour un titre, - pour une liste.',
        true,
        'GitHub l’affiche mis en forme sur la page du dépôt.',
      ),
      qcm(
        'Pourquoi ajouter une licence ?',
        [
          'Pour dire ce que les autres peuvent faire de ton code',
          'Pour que GitHub l’accepte',
          'Pour le rendre plus rapide',
        ],
        0,
        'Sans licence, personne n’a légalement le droit de réutiliser ton code.',
      ),
      match('Associe chaque fichier à son rôle.', [
        ['README.md', 'Présenter le projet'],
        ['LICENSE', 'Les droits de réutilisation'],
        ['.gitignore', 'Les fichiers à ignorer'],
        ['CONTRIBUTING.md', 'Comment contribuer'],
      ]),
      vf(
        'GitHub Pages peut héberger gratuitement un site statique depuis ton dépôt.',
        true,
        'Idéal pour mettre en ligne ton portfolio HTML/CSS.',
      ),
    ]),
  ]),
];
