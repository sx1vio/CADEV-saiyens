import type { LearnPath, Lesson } from '../types';

const L = (
  id: string,
  title: string,
  minutes: number,
  kind: Lesson['kind'],
  body: string,
  code?: string,
  quiz?: Lesson['quiz'],
): Lesson => ({ id, title, minutes, kind, body, code, quiz });

export const PATHS: LearnPath[] = [
  {
    stack: ['HTML', 'CSS', 'JavaScript', 'React'],
    author: 'grace-uwase',
    id: 'dev-web',
    title: 'Devenir développeur·se web',
    tagline: 'De ta première page HTML à une app React en ligne.',
    level: 'debutant',
    hours: 60,
    color: '#4f7cff',
    icon: 'globe',
    learners: 8420,
    certId: 'react-essentiel',
    outcomes: [
      'Construire des pages accessibles et responsives',
      'Écrire du JavaScript moderne',
      'Créer une app React connectée à une API',
      'Mettre ton projet en ligne',
    ],
    modules: [
      {
        id: 'html-css',
        title: 'HTML et CSS',
        lessons: [
          L(
            'structure',
            'La structure d’une page',
            12,
            'lecture',
            "Une page HTML décrit le sens du contenu, pas son apparence : titre (h1), sections, listes, liens, formulaires. Un lecteur d'écran et Google lisent cette structure. Utilise la bonne balise avant de penser au style.",
            '<main>\n  <h1>Mon portfolio</h1>\n  <section aria-labelledby="projets">\n    <h2 id="projets">Projets</h2>\n  </section>\n</main>',
          ),
          L(
            'flex-grid',
            'Mise en page avec Flexbox et Grid',
            18,
            'lecture',
            'Flexbox aligne des éléments sur un axe (une barre de navigation), Grid organise en lignes et colonnes (une galerie). Commence toujours par le mobile, puis élargis avec des media queries.',
            '.galerie {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));\n  gap: 16px;\n}',
          ),
          L(
            'portfolio',
            'Exercice : ta page de portfolio',
            45,
            'exercice',
            'Construis une page avec ton nom, une courte bio, 3 projets en grille et un formulaire de contact. Elle doit être lisible sur un écran de 360 px.',
          ),
        ],
      },
      {
        id: 'javascript',
        title: 'JavaScript',
        lessons: [
          L(
            'variables',
            'Variables, types et fonctions',
            15,
            'lecture',
            'const pour ce qui ne change pas, let pour le reste, jamais var. Les fonctions fléchées sont pratiques pour les petites transformations.',
            'const prix = [1200, 800, 450]\nconst total = prix.reduce((s, p) => s + p, 0)',
          ),
          L(
            'async',
            'Appeler une API avec fetch et async/await',
            20,
            'lecture',
            'fetch renvoie une promesse. await attend la réponse sans bloquer la page. Vérifie toujours response.ok et prévois un message en cas d’erreur réseau.',
            "async function charger() {\n  const res = await fetch('/api/projets')\n  if (!res.ok) throw new Error('Serveur indisponible')\n  return res.json()\n}",
          ),
          L(
            'quiz-js',
            'Quiz : les bases',
            8,
            'quiz',
            'Vérifie que les notions sont acquises avant de passer à React.',
            undefined,
            [
              {
                q: 'Quelle déclaration utiliser pour une valeur qui ne sera pas réaffectée ?',
                choices: ['var', 'let', 'const'],
                answer: 2,
                explain: 'const empêche la réaffectation.',
              },
              {
                q: 'Que faut-il vérifier après un fetch ?',
                choices: ['response.ok', 'response.css', 'Rien'],
                answer: 0,
                explain: 'Un statut 404 ou 500 ne lève pas d’erreur tout seul.',
              },
            ],
          ),
        ],
      },
      {
        id: 'react',
        title: 'React',
        lessons: [
          L(
            'composants',
            'Composants et props',
            20,
            'lecture',
            'Un composant est une fonction qui reçoit des props et renvoie de l’interface. Découpe ton écran en petits composants nommés d’après ce qu’ils affichent.',
            'function CarteProjet({ titre, stack }) {\n  return <article><h3>{titre}</h3><p>{stack.join(", ")}</p></article>\n}',
          ),
          L(
            'etat',
            'État et événements',
            20,
            'lecture',
            'useState garde une valeur entre deux rendus. Change-la dans un gestionnaire d’événement, jamais directement.',
            'const [filtre, setFiltre] = useState("")',
          ),
          L(
            'projet-react',
            'Projet : l’annuaire de devs',
            120,
            'projet',
            'Construis une app qui charge une liste de devs depuis une API, permet de filtrer par stack et garde le filtre dans l’URL. Publie-la et partage le lien dans la communauté « Montre ton projet ».',
          ),
        ],
      },
    ],
  },
  {
    stack: ['Claude', 'Cursor', 'MCP', 'GitHub'],
    author: 'mariam-k',
    id: 'dev-ia',
    title: 'Développer avec l’IA',
    tagline: 'Cadrer un agent de code, relire ses changements et livrer sans dette.',
    level: 'intermediaire',
    hours: 12,
    color: '#8b7cf8',
    icon: 'sparkles',
    learners: 11230,
    certId: 'dev-avec-ia',
    outcomes: [
      'Écrire des instructions de projet efficaces',
      'Découper une fonctionnalité pour un agent',
      'Relire un diff généré',
      'Brancher des outils avec MCP et des skills',
    ],
    modules: [
      {
        id: 'cadrer',
        title: 'Cadrer l’agent',
        lessons: [
          L(
            'instructions',
            'Le fichier d’instructions du projet',
            15,
            'lecture',
            'CLAUDE.md, AGENTS.md ou les règles du workspace : c’est la mémoire de l’agent. Mets-y la stack, les commandes (tests, lint, build), les conventions et ce qu’il ne doit jamais faire. Court et concret.',
            '# Projet Boutik\n- Laravel 11, Vue 3, MySQL\n- Tests : php artisan test\n- Jamais de migration sans down()\n- Ne jamais commiter .env',
          ),
          L(
            'decouper',
            'Découper le travail',
            15,
            'lecture',
            'Une demande = un changement relisible. Demande d’abord un plan, valide-le, puis fais exécuter étape par étape avec un commit à chaque fois.',
          ),
        ],
      },
      {
        id: 'verifier',
        title: 'Vérifier',
        lessons: [
          L(
            'relire',
            'Relire un diff généré',
            20,
            'lecture',
            'Lis le diff comme celui d’un collègue : logique, cas limites, sécurité, dépendances ajoutées. Méfie-toi des paquets inconnus et des tests modifiés pour passer.',
          ),
          L(
            'tests',
            'Les tests comme garde-fou',
            20,
            'exercice',
            'Écris d’abord un test qui échoue pour le comportement attendu, puis demande à l’agent de le faire passer sans modifier le test.',
          ),
        ],
      },
      {
        id: 'outiller',
        title: 'Outiller l’agent',
        lessons: [
          L(
            'mcp',
            'MCP : brancher tes outils',
            20,
            'lecture',
            'Un serveur MCP expose des outils (lire une base, créer un ticket). Donne-lui les droits minimaux : un rôle en lecture seule suffit souvent.',
          ),
          L(
            'skills',
            'Skills et plugins',
            15,
            'lecture',
            'Un skill est une procédure que l’agent charge à la demande. Installe-en depuis le hub DevHub, ou écris le tien pour les tâches répétées de ton équipe.',
          ),
        ],
      },
    ],
  },
  {
    stack: ['Node.js', 'PostgreSQL', 'NestJS', 'Docker'],
    author: 'ousmane-sow',
    id: 'backend-node',
    title: 'Backend avec Node.js',
    tagline: 'API REST, base de données, authentification et déploiement.',
    level: 'intermediaire',
    hours: 40,
    color: '#f0b232',
    icon: 'server',
    learners: 5310,
    certId: 'sql-pratique',
    outcomes: [
      'Concevoir une API REST claire',
      'Modéliser une base PostgreSQL',
      'Sécuriser l’authentification',
      'Déployer avec Docker',
    ],
    modules: [
      {
        id: 'api',
        title: 'Concevoir une API',
        lessons: [
          L(
            'rest',
            'Routes, verbes et codes HTTP',
            20,
            'lecture',
            'GET lit, POST crée, PATCH modifie, DELETE supprime. Renvoie 201 à la création, 404 si la ressource n’existe pas, 422 si les données sont invalides.',
          ),
          L(
            'validation',
            'Valider les entrées',
            15,
            'lecture',
            'Chaque route valide son entrée avec un schéma (zod, class-validator). On ne fait jamais confiance au client.',
          ),
        ],
      },
      {
        id: 'db',
        title: 'Base de données',
        lessons: [
          L(
            'modele',
            'Modéliser avec PostgreSQL',
            25,
            'lecture',
            'Une table par entité, des clés étrangères, des contraintes UNIQUE là où le métier l’exige.',
          ),
          L(
            'transactions',
            'Transactions et idempotence',
            20,
            'lecture',
            'Une opération qui touche plusieurs tables va dans une transaction. Une écriture rejouable porte une clé d’idempotence.',
          ),
        ],
      },
      {
        id: 'deploy',
        title: 'Déployer',
        lessons: [
          L(
            'docker',
            'Conteneuriser l’API',
            25,
            'exercice',
            'Écris un Dockerfile multi-étapes et un docker-compose avec l’API, PostgreSQL et un volume de données.',
          ),
        ],
      },
    ],
  },
  {
    stack: ['Linux', 'Docker', 'Kubernetes', 'GitHub Actions'],
    author: 'thandi-d',
    id: 'cloud-devops',
    title: 'Cloud & DevOps',
    tagline: 'Linux, Docker, CI/CD et cloud : faire tourner la prod sereinement.',
    level: 'intermediaire',
    hours: 45,
    color: '#f2575a',
    icon: 'container',
    learners: 3980,
    certId: 'docker-deploiement',
    outcomes: [
      'Administrer un serveur Linux',
      'Déployer avec Docker Compose',
      'Automatiser avec une CI',
      'Préparer AWS Cloud Practitioner',
    ],
    modules: [
      {
        id: 'linux',
        title: 'Linux',
        lessons: [
          L(
            'ssh',
            'Se connecter et sécuriser un serveur',
            20,
            'lecture',
            'Clé SSH plutôt que mot de passe, utilisateur non root, pare-feu qui n’ouvre que 22, 80 et 443.',
          ),
        ],
      },
      {
        id: 'ci',
        title: 'Intégration continue',
        lessons: [
          L(
            'pipeline',
            'Un pipeline simple et utile',
            20,
            'lecture',
            'À chaque pull request : lint, tests, build. À chaque fusion sur main : déploiement automatique, puis vérification de santé.',
          ),
        ],
      },
    ],
  },
  {
    stack: ['Python', 'Pandas', 'PostgreSQL', 'Kaggle'],
    author: 'amina-bello',
    id: 'data-ia',
    title: 'Data & ML avec Python',
    tagline: 'pandas, SQL, visualisation et premiers modèles.',
    level: 'debutant',
    hours: 50,
    color: '#a3e635',
    icon: 'database',
    learners: 4620,
    outcomes: [
      'Nettoyer des données avec pandas',
      'Écrire des requêtes SQL d’analyse',
      'Entraîner et évaluer un modèle simple',
    ],
    modules: [
      {
        id: 'pandas',
        title: 'pandas',
        lessons: [
          L(
            'dataframe',
            'Charger et nettoyer un jeu de données',
            25,
            'lecture',
            'read_csv, types de colonnes, valeurs manquantes, doublons. Garde une trace de chaque transformation.',
            "df = pd.read_csv('pluies.csv', parse_dates=['date'])\ndf = df.dropna(subset=['mm'])",
          ),
        ],
      },
      {
        id: 'ml',
        title: 'Premiers modèles',
        lessons: [
          L(
            'evaluer',
            'Évaluer honnêtement un modèle',
            20,
            'lecture',
            'Sépare les données d’entraînement et de test avant tout. Compare toujours à une référence simple (la moyenne, la veille).',
          ),
        ],
      },
    ],
  },
  {
    stack: ['Flutter', 'Dart', 'Firebase', 'SQLite'],
    author: 'je-hounkpatin',
    id: 'mobile-flutter',
    title: 'Mobile avec Flutter',
    tagline: 'Des apps rapides, même hors ligne et sur des téléphones modestes.',
    level: 'intermediaire',
    hours: 40,
    color: '#3ccf8e',
    icon: 'smartphone',
    learners: 3540,
    outcomes: [
      'Construire des écrans Flutter',
      'Gérer l’état',
      'Stocker et synchroniser hors ligne',
      'Publier sur le Play Store',
    ],
    modules: [
      {
        id: 'widgets',
        title: 'Widgets',
        lessons: [
          L(
            'bases',
            'Penser en widgets',
            20,
            'lecture',
            'Tout est widget. Compose de petits widgets sans état, et garde l’état au plus près de là où il sert.',
          ),
        ],
      },
      {
        id: 'offline',
        title: 'Hors ligne',
        lessons: [
          L(
            'sync',
            'File d’attente et synchronisation',
            25,
            'lecture',
            'Chaque écriture locale reçoit un identifiant unique, part dans une file, et est envoyée au retour du réseau. Le serveur ignore les doublons.',
          ),
        ],
      },
    ],
  },
];

export const lessonCount = (p: LearnPath) => p.modules.reduce((n, m) => n + m.lessons.length, 0);
