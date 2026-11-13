import { q } from '../devhub-1';
import type { QuizQuestion } from '../types';

/** Questions supplémentaires de git-fondamentaux (12/11/2026). */
export const EXTRA: QuizQuestion[] = [
  // ── Thème 0 : dépôt, commits et zone de préparation ──
  q(
    0,
    'Après git add app.js, tu modifies encore app.js puis tu lances git commit -m "Maj". Que contient le commit ?',
    [
      'La dernière version d’app.js',
      'La version d’app.js au moment du git add',
      'Rien, Git refuse de committer',
      'Les deux versions, l’une après l’autre',
    ],
    1,
    'Le commit enregistre l’index. Les modifications faites après git add restent dans le répertoire de travail ; git status -s affiche MM.',
  ),
  q(
    0,
    'Que fait git commit -am "Maj" sur un fichier que tu viens de créer et qui n’a jamais été ajouté ?',
    [
      'Il l’inclut dans le commit',
      'Il le supprime',
      'Il l’ignore : -a ne prend que les fichiers déjà suivis',
      'Il l’ajoute au .gitignore',
    ],
    2,
    '-a prépare les fichiers suivis modifiés ou supprimés. Un nouveau fichier doit passer une première fois par git add.',
  ),
  q(
    0,
    'Dans cette sortie de git status -s, quel fichier est préparé pour le prochain commit ?',
    ['style.css', 'notes.txt', 'Aucun', 'index.html'],
    3,
    'La colonne de gauche décrit l’index : M à gauche signifie modifié et préparé. «  M » est modifié mais non préparé, ?? est non suivi.',
    'M  index.html\n M style.css\n?? notes.txt',
  ),
  q(
    0,
    'Le fichier .env est déjà suivi par Git. Tu l’ajoutes au .gitignore. Que se passe-t-il ?',
    [
      'Il reste suivi : il faut git rm --cached .env puis committer',
      'Il est retiré de tout l’historique',
      'Il est supprimé de ton disque',
      'Git affiche une erreur',
    ],
    0,
    'Le .gitignore ne s’applique qu’aux fichiers non suivis. git rm --cached arrête le suivi sans effacer le fichier local.',
  ),
  q(
    0,
    'user.email vaut perso@exemple.com en --global et pro@entreprise.ci en --local. Quel e-mail signe les commits de ce dépôt ?',
    ['perso@exemple.com', 'pro@entreprise.ci', 'Aucun des deux', 'Celui du compte GitHub connecté'],
    1,
    'Le niveau le plus précis gagne : local (.git/config) > global (~/.gitconfig) > système.',
  ),

  // ── Thème 1 : historique et annulation ──
  q(
    1,
    'Ton dernier commit (non poussé) est mal découpé. Tu veux le défaire en gardant ses changements préparés. Quelle commande ?',
    [
      'git reset --hard HEAD~1',
      'git revert HEAD',
      'git reset --soft HEAD~1',
      'git restore --staged .',
    ],
    2,
    '--soft recule la branche sans toucher à l’index ni aux fichiers. --mixed (par défaut) garderait les changements mais non préparés ; --hard les effacerait.',
  ),
  q(
    1,
    'Après un git reset --hard HEAD~3 malheureux, comment retrouver les commits disparus ?',
    [
      'Impossible, ils sont effacés',
      'git log --oneline les montre toujours',
      'git revert HEAD~3',
      'git reflog pour retrouver l’ancienne position, puis git reset --hard ou git branch dessus',
    ],
    3,
    'Les commits existent encore dans .git ; seul le pointeur a bougé. Le reflog, local, garde les positions successives de HEAD.',
  ),
  q(
    1,
    'Tu as tout préparé avec git add. Quelle commande montre ce qui va partir dans le commit ?',
    ['git diff --staged', 'git diff', 'git log -p', 'git show HEAD'],
    0,
    'git diff compare le répertoire de travail à l’index (vide ici) ; git diff --staged (ou --cached) compare l’index au dernier commit.',
  ),
  q(
    1,
    'Quelle commande annule un commit de fusion déjà poussé, en gardant le côté de main ?',
    [
      'git reset --hard <fusion>',
      'git revert -m 1 <fusion>',
      'git merge --abort',
      'git revert --soft <fusion>',
    ],
    1,
    'Un commit de fusion a deux parents : -m 1 indique de garder le premier (la branche qui a reçu la fusion).',
  ),
  q(
    1,
    'Que fait git restore --source=HEAD~2 config.js ?',
    [
      'Supprime les deux derniers commits',
      'Restaure config.js depuis GitHub',
      'Remet dans le répertoire de travail config.js tel qu’il était deux commits plus tôt',
      'Crée une branche à partir de HEAD~2',
    ],
    2,
    'Seul le fichier change, dans le répertoire de travail. L’historique ne bouge pas ; il reste à committer cette version si tu veux la garder.',
  ),

  // ── Thème 2 : branches, fusion et conflits ──
  q(
    2,
    'main n’a reçu aucun commit depuis la création de feat/carte. Que produit git merge feat/carte depuis main ?',
    [
      'Un fast-forward : main avance simplement jusqu’à feat/carte',
      'Un commit de fusion à deux parents',
      'Un conflit à résoudre',
      'Une erreur : il faut d’abord rebaser',
    ],
    0,
    'L’historique est linéaire, il suffit de déplacer l’étiquette main. git merge --no-ff forcerait un commit de fusion.',
  ),
  q(
    2,
    'Pourquoi ne faut-il pas rebaser une branche que d’autres développeurs ont déjà récupérée ?',
    [
      'Le rebase supprime les fichiers',
      'GitHub bloque toujours les rebases',
      'Le rebase est plus lent qu’une fusion',
      'Il réécrit les commits avec de nouveaux identifiants, ce qui fait diverger les copies des autres',
    ],
    3,
    'C’est la règle d’or du rebase. Sur ta propre branche de PR, c’est permis, suivi d’un git push --force-with-lease.',
  ),
  q(
    2,
    'Pendant un rebase, un conflit est résolu et le fichier ajouté avec git add. Quelle commande poursuit ?',
    ['git commit --amend', 'git rebase --continue', 'git merge --continue', 'git rebase --skip'],
    1,
    '--continue rejoue le commit suivant. --skip abandonnerait le commit en cours, --abort annulerait tout le rebase.',
  ),
  q(
    2,
    'Tu dois changer de branche en urgence alors que tu as des modifications non committées, y compris un nouveau fichier. Quelle commande met tout de côté ?',
    ['git stash', 'git stash -u', 'git reset --hard', 'git clean -f'],
    1,
    'git stash seul ne prend que les fichiers suivis. -u (--include-untracked) inclut les nouveaux fichiers. git stash pop les réappliquera.',
  ),
  q(
    2,
    'Un correctif présent sur main doit être reporté seul sur la branche release/2.1. Quelle commande utiliser depuis release/2.1 ?',
    ['git merge main', 'git rebase main', 'git cherry-pick <commit>', 'git switch main'],
    2,
    'cherry-pick copie un commit précis, avec un nouvel identifiant, sans amener le reste de main.',
  ),

  // ── Thème 3 : remote, push, pull et pull requests ──
  q(
    3,
    'Quelle différence entre git fetch et git pull ?',
    [
      'fetch télécharge sans toucher à tes branches ; pull télécharge puis intègre dans la branche courante',
      'fetch envoie, pull récupère',
      'Aucune',
      'fetch ne récupère que les tags',
    ],
    0,
    'fetch met à jour les branches de suivi (origin/main…). pull = fetch + merge ou rebase selon la configuration.',
  ),
  q(
    3,
    'Que signifie cette ligne de git branch -vv ?',
    [
      'main est à jour avec origin/main',
      'main a 3 commits à pousser et rien à récupérer',
      'origin/main a été supprimée',
      'main a 1 commit non poussé et il lui manque 3 commits du remote',
    ],
    3,
    'ahead = commits locaux absents du remote, behind = commits distants absents en local. Les branches ont divergé : un pull (avec rebase ou fusion) est nécessaire.',
    '* main 4f2a91c [origin/main: ahead 1, behind 3] Ajoute la carte',
  ),
  q(
    3,
    'Après avoir rebasé ta branche de PR déjà poussée, quelle commande de push est la plus sûre ?',
    [
      'git push --force',
      'git push --tags',
      'git push --force-with-lease',
      'git pull puis git push',
    ],
    2,
    '--force-with-lease refuse d’écraser la branche distante si quelqu’un y a poussé entre-temps. git pull re-fusionnerait les anciens commits.',
  ),
  q(
    3,
    'Une PR dont la description contient « Closes #18 » est fusionnée dans la branche par défaut. Que devient l’issue 18 ?',
    [
      'Elle est supprimée',
      'Elle est fermée automatiquement',
      'Elle est assignée à l’auteur',
      'Rien ne change',
    ],
    1,
    'Les mots-clés close, fix et resolve (et leurs variantes) ferment l’issue liée quand la PR est fusionnée dans la branche par défaut.',
  ),
  q(
    3,
    'Dans un fork cloné, à quoi sert le remote nommé upstream ?',
    [
      'À pointer vers le dépôt d’origine pour récupérer ses nouveautés',
      'À pousser tes branches',
      'À stocker les tags',
      'C’est un autre nom d’origin',
    ],
    0,
    'origin est ton fork (où tu pousses) ; upstream est le projet d’origine (git fetch upstream pour te resynchroniser).',
  ),

  // ── Thème 4 : bonnes pratiques et secrets ──
  q(
    4,
    'Un .env contenant une clé d’API a été poussé, puis supprimé dans un nouveau commit. La clé est-elle protégée ?',
    [
      'Oui, le fichier n’existe plus',
      'Oui, si le dépôt est privé',
      'Oui, après un git pull de l’équipe',
      'Non : elle reste lisible dans l’historique et doit être révoquée',
    ],
    3,
    'Les commits précédents contiennent toujours le fichier. La rotation (révoquer, régénérer) est la seule vraie protection ; le nettoyage d’historique vient ensuite.',
  ),
  q(
    4,
    'Selon Conventional Commits, quel message signale un changement incompatible ?',
    [
      'fix: corrige la route /login',
      'feat!: remplace la route /v1/login par /v2/sessions',
      'chore: met à jour les dépendances',
      'docs: explique la connexion',
    ],
    1,
    'Le ! après le type (ou un pied de page BREAKING CHANGE:) indique une rupture de compatibilité, qui impose une version majeure en SemVer.',
  ),
  q(
    4,
    'La version actuelle est 2.3.1. Tu publies uniquement un correctif de bug. Quelle version en SemVer ?',
    ['2.3.2', '2.4.0', '3.0.0', '2.3.1.1'],
    0,
    'MAJEUR.MINEUR.CORRECTIF : un fix incrémente le correctif. Une fonctionnalité compatible donnerait 2.4.0, une rupture 3.0.0.',
  ),
  q(
    4,
    'Comment utiliser une clé de déploiement dans un workflow GitHub Actions ?',
    [
      'L’écrire dans le fichier YAML du workflow',
      'La committer dans un fichier .env',
      'La déclarer dans les secrets du dépôt et la lire avec ${{ secrets.NOM }}',
      'La mettre dans le README',
    ],
    2,
    'Les secrets Actions sont chiffrés, masqués dans les journaux et ne sont pas transmis aux workflows lancés par des PR venant de forks.',
  ),
  q(
    4,
    'Tu crées le tag annoté v1.0.0 puis tu lances git push. Le tag est-il sur GitHub ?',
    [
      'Oui, git push envoie tout',
      'Oui, mais seulement s’il est annoté',
      'Non, sauf si le dépôt est public',
      'Non : il faut git push origin v1.0.0 ou git push --tags',
    ],
    3,
    'Les tags se poussent explicitement. Une fois sur GitHub, tu peux créer une Release à partir du tag.',
  ),
];
