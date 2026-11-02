import type { AgentSkill } from '../../types';
import { localMcp, remoteMcp } from './install';

/**
 * Skills, plugins, serveurs MCP et formats de règles publiés par leurs éditeurs officiels.
 * Chaque fiche renvoie vers le dépôt ou la documentation d'origine. Vérifié en novembre 2026.
 */

const ALL_LOCAL: AgentSkill['tools'] = ['claude', 'codex', 'cursor', 'antigravity'];
const ALL_REMOTE: AgentSkill['tools'] = ['claude', 'codex', 'cursor'];

const mcpReadme = (what: string, use: string, care: string) =>
  `${what}\n\n**Quand l’utiliser.** ${use}\n\n**Précautions.** ${care}`;

export const ECOSYSTEM: AgentSkill[] = [
  /* ---------------- Skills et plugins Anthropic ---------------- */
  {
    id: 'anthropic-document-skills',
    name: 'document-skills',
    kind: 'skill',
    tools: ['claude'],
    publisher: 'Anthropic',
    official: true,
    category: 'Documents',
    summary:
      'Les skills officiels d’Anthropic pour lire et produire des fichiers Word, PDF, PowerPoint et Excel.',
    readme:
      'Quatre skills (docx, pdf, pptx, xlsx) qui apprennent à Claude à créer, modifier et analyser des documents bureautiques : remplir un formulaire PDF, générer un rapport Word, construire une présentation, calculer dans un classeur avec de vraies formules.\n\n**Quand l’utiliser.** Dès qu’un livrable doit être un fichier bureautique plutôt que du texte.\n\n**Précautions.** Les skills exécutent des scripts Python : installe-les depuis le dépôt officiel uniquement.',
    repo: 'https://github.com/anthropics/skills',
    docs: 'https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview',
    install: {
      claude: [
        {
          where: 'Dans Claude Code',
          code: '/plugin marketplace add anthropics/skills\n/plugin install document-skills@anthropic-agent-skills',
          lang: 'bash',
        },
      ],
    },
    files: [],
  },
  {
    id: 'anthropic-example-skills',
    name: 'example-skills',
    kind: 'skill',
    tools: ['claude'],
    publisher: 'Anthropic',
    official: true,
    category: 'Productivité',
    summary:
      'Skills d’exemple d’Anthropic : créer un skill, construire un serveur MCP, tester une application web, design d’interfaces.',
    readme:
      'La collection d’exemples du dépôt officiel : **skill-creator** (écrire ses propres skills), **mcp-builder** (créer un serveur MCP de qualité), **webapp-testing** (tester une application avec Playwright), **frontend-design**, **canvas-design** et d’autres.\n\n**Quand l’utiliser.** Pour apprendre le format SKILL.md en partant de skills qui marchent, ou pour leurs usages directs.\n\n**Précautions.** Lis chaque SKILL.md avant de l’activer : un skill peut contenir des scripts.',
    repo: 'https://github.com/anthropics/skills',
    docs: 'https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview',
    install: {
      claude: [
        {
          where: 'Dans Claude Code',
          code: '/plugin marketplace add anthropics/skills\n/plugin install example-skills@anthropic-agent-skills',
          lang: 'bash',
        },
      ],
    },
    files: [],
  },
  {
    id: 'claude-code-plugins',
    name: 'Plugins officiels Claude Code',
    kind: 'plugin',
    tools: ['claude'],
    publisher: 'Anthropic',
    official: true,
    category: 'Flux de travail',
    summary:
      'Les plugins publiés avec Claude Code : développement guidé d’une fonctionnalité, revue de code, commits, conseils de sécurité.',
    readme:
      'Le dépôt de Claude Code contient une place de marché de plugins maintenus par Anthropic, par exemple **feature-dev** (explorer, concevoir puis implémenter une fonctionnalité), **code-review**, **pr-review-toolkit**, **commit-commands** et **security-guidance**. Un plugin regroupe commandes, sous-agents, skills et hooks.\n\n**Quand l’utiliser.** Pour donner à toute l’équipe les mêmes commandes et la même méthode.\n\n**Précautions.** Les hooks d’un plugin exécutent des commandes sur ta machine : n’installe que des sources de confiance.',
    repo: 'https://github.com/anthropics/claude-code/tree/main/plugins',
    docs: 'https://docs.claude.com/en/docs/claude-code/plugins',
    install: {
      claude: [
        {
          where: 'Dans Claude Code, puis choisis le plugin dans la liste',
          code: '/plugin marketplace add anthropics/claude-code\n/plugin',
          lang: 'bash',
        },
      ],
    },
    files: [],
  },

  /* ---------------- Serveurs MCP : navigateur et tests ---------------- */
  {
    id: 'mcp-playwright',
    name: 'Playwright MCP',
    kind: 'mcp',
    tools: ALL_LOCAL,
    publisher: 'Microsoft',
    official: true,
    category: 'Tests et navigateur',
    summary:
      'Pilote un vrai navigateur : ouvrir une page, cliquer, remplir un formulaire, lire la page via l’arbre d’accessibilité.',
    readme: mcpReadme(
      'Le serveur MCP officiel de Playwright donne à l’agent un navigateur Chromium, Firefox ou WebKit. Il lit la page à partir de son arbre d’accessibilité (pas de capture d’écran à deviner), ce qui le rend fiable et rapide.',
      'Vérifier qu’une fonctionnalité marche vraiment, reproduire un bug, écrire un test de bout en bout à partir d’un parcours réel.',
      'L’agent peut naviguer sur n’importe quel site : évite les comptes réels et les actions irréversibles (paiement, suppression).',
    ),
    repo: 'https://github.com/microsoft/playwright-mcp',
    install: localMcp({ name: 'playwright', command: 'npx', args: ['@playwright/mcp@latest'] }),
    files: [],
  },
  {
    id: 'mcp-chrome-devtools',
    name: 'Chrome DevTools MCP',
    kind: 'mcp',
    tools: ALL_LOCAL,
    publisher: 'Google · Chrome',
    official: true,
    category: 'Tests et navigateur',
    summary:
      'Donne à l’agent les outils de développement de Chrome : console, réseau, performances, captures.',
    readme: mcpReadme(
      'Le serveur MCP officiel de l’équipe Chrome : l’agent lance Chrome, lit la console et les requêtes réseau, enregistre une trace de performance et analyse les problèmes (LCP lent, erreurs JavaScript).',
      'Déboguer une page qui casse ou qui est lente, avec les mêmes outils que toi.',
      'Le navigateur piloté a accès à ce que tu y ouvres : utilise un profil sans données personnelles.',
    ),
    repo: 'https://github.com/ChromeDevTools/chrome-devtools-mcp',
    install: localMcp({
      name: 'chrome-devtools',
      command: 'npx',
      args: ['chrome-devtools-mcp@latest'],
    }),
    files: [],
  },

  /* ---------------- Code, documentation, données ---------------- */
  {
    id: 'mcp-github',
    name: 'GitHub MCP Server',
    kind: 'mcp',
    tools: ALL_REMOTE,
    publisher: 'GitHub',
    official: true,
    category: 'Code et collaboration',
    summary:
      'Issues, pull requests, revues, Actions et code des dépôts GitHub, directement depuis l’agent.',
    readme: mcpReadme(
      'Le serveur officiel de GitHub, hébergé : l’agent lit et crée des issues, ouvre et commente des pull requests, consulte les exécutions de GitHub Actions et cherche dans le code.',
      'Trier les issues, préparer une PR avec sa description, comprendre pourquoi la CI échoue.',
      'Accorde le moins de droits possible (jeton à portée limitée) et relis tout ce que l’agent publie en ton nom.',
    ),
    repo: 'https://github.com/github/github-mcp-server',
    install: remoteMcp({ name: 'github', url: 'https://api.githubcopilot.com/mcp/' }),
    files: [],
  },
  {
    id: 'mcp-context7',
    name: 'Context7',
    kind: 'mcp',
    tools: ALL_REMOTE,
    publisher: 'Upstash',
    official: true,
    category: 'Documentation',
    summary:
      'Injecte la documentation à jour d’une bibliothèque, à la bonne version, dans le contexte de l’agent.',
    readme: mcpReadme(
      'Context7 récupère la documentation officielle et des exemples de code récents pour des milliers de bibliothèques. L’agent cesse d’inventer des API disparues ou de mélanger les versions.',
      'Travailler avec une bibliothèque qui évolue vite (framework web, SDK) ou une version récente.',
      'La documentation vient d’un service tiers : en cas de doute, vérifie sur le site officiel de la bibliothèque.',
    ),
    repo: 'https://github.com/upstash/context7',
    install: remoteMcp({ name: 'context7', url: 'https://mcp.context7.com/mcp' }),
    files: [],
  },
  {
    id: 'mcp-supabase',
    name: 'Supabase MCP',
    kind: 'mcp',
    tools: ALL_REMOTE,
    publisher: 'Supabase',
    official: true,
    category: 'Bases de données',
    summary:
      'Gère un projet Supabase : tables, migrations, requêtes SQL, journaux, fonctions et types TypeScript.',
    readme: mcpReadme(
      'Le serveur officiel de Supabase connecte l’agent à tes projets : concevoir des tables, écrire des migrations, interroger les données, lire les journaux et générer les types.',
      'Développer un back-end Supabase sans quitter l’éditeur.',
      'Connecte-le à un projet de développement, jamais à la production, et active le mode lecture seule quand c’est possible.',
    ),
    repo: 'https://github.com/supabase-community/supabase-mcp',
    docs: 'https://supabase.com/docs/guides/getting-started/mcp',
    install: remoteMcp({ name: 'supabase', url: 'https://mcp.supabase.com/mcp' }),
    files: [],
  },
  {
    id: 'mcp-sentry',
    name: 'Sentry MCP',
    kind: 'mcp',
    tools: ALL_REMOTE,
    publisher: 'Sentry',
    official: true,
    category: 'Supervision',
    summary:
      'Lit les erreurs de production, leurs traces et leur contexte pour aider à les corriger.',
    readme: mcpReadme(
      'Le serveur officiel de Sentry : l’agent consulte les problèmes, la pile d’appels, les événements et les versions concernées.',
      'Passer d’une alerte de production à un correctif, avec le vrai contexte de l’erreur.',
      'Les événements peuvent contenir des données d’utilisateurs : respecte ta politique de confidentialité.',
    ),
    repo: 'https://github.com/getsentry/sentry-mcp',
    install: remoteMcp({ name: 'sentry', url: 'https://mcp.sentry.dev/mcp' }),
    files: [],
  },
  {
    id: 'mcp-cloudflare-docs',
    name: 'Cloudflare Docs MCP',
    kind: 'mcp',
    tools: ALL_REMOTE,
    publisher: 'Cloudflare',
    official: true,
    category: 'Documentation',
    summary: 'Cherche dans la documentation officielle de Cloudflare (Workers, Pages, R2, D1…).',
    readme: mcpReadme(
      'Un des serveurs MCP publiés par Cloudflare, sans compte nécessaire : l’agent cherche dans la documentation à jour de la plateforme.',
      'Déployer sur Workers ou utiliser R2, D1, KV avec les bonnes API.',
      'Lecture seule : aucun risque sur ton compte.',
    ),
    repo: 'https://github.com/cloudflare/mcp-server-cloudflare',
    install: remoteMcp({ name: 'cloudflare-docs', url: 'https://docs.mcp.cloudflare.com/mcp' }),
    files: [],
  },

  /* ---------------- Outils de travail ---------------- */
  {
    id: 'mcp-notion',
    name: 'Notion MCP',
    kind: 'mcp',
    tools: ALL_REMOTE,
    publisher: 'Notion',
    official: true,
    category: 'Productivité',
    summary: 'Lit et écrit dans un espace Notion : spécifications, notes, bases de données.',
    readme: mcpReadme(
      'Le serveur hébergé de Notion : l’agent cherche une page, lit une spécification, crée une note ou met à jour une base.',
      'Garder la documentation produit et le code alignés.',
      'L’agent agit avec tes droits Notion : limite les pages partagées.',
    ),
    docs: 'https://developers.notion.com/docs/mcp',
    install: remoteMcp({ name: 'notion', url: 'https://mcp.notion.com/mcp' }),
    files: [],
  },
  {
    id: 'mcp-linear',
    name: 'Linear MCP',
    kind: 'mcp',
    tools: ALL_REMOTE,
    publisher: 'Linear',
    official: true,
    category: 'Productivité',
    summary: 'Tickets, projets et cycles Linear : créer, lire, mettre à jour.',
    readme: mcpReadme(
      'Le serveur officiel de Linear : l’agent lit un ticket avant de coder, le met à jour et en crée de nouveaux.',
      'Partir d’un ticket pour implémenter, puis le documenter.',
      'Relis les tickets créés automatiquement avant de les assigner.',
    ),
    docs: 'https://linear.app/docs/mcp',
    install: remoteMcp({ name: 'linear', url: 'https://mcp.linear.app/mcp' }),
    files: [],
  },
  {
    id: 'mcp-figma',
    name: 'Figma MCP',
    kind: 'mcp',
    tools: ALL_REMOTE,
    publisher: 'Figma',
    official: true,
    category: 'Design',
    summary:
      'Donne à l’agent les maquettes Figma : composants, variables, mise en page, pour coder fidèlement.',
    readme: mcpReadme(
      'Le serveur officiel de Figma transmet la structure d’un cadre (composants, styles, variables) plutôt qu’une simple image.',
      'Transformer une maquette en composants qui respectent ton design system.',
      'Nécessite un accès aux fichiers concernés ; certaines fonctions dépendent de ton offre Figma.',
    ),
    docs: 'https://www.figma.com/developers',
    install: remoteMcp({ name: 'figma', url: 'https://mcp.figma.com/mcp' }),
    files: [],
  },
  {
    id: 'mcp-stripe',
    name: 'Stripe MCP',
    kind: 'mcp',
    tools: ALL_REMOTE,
    publisher: 'Stripe',
    official: true,
    category: 'Paiements',
    summary:
      'Interroge l’API et la documentation de Stripe : clients, produits, paiements, abonnements.',
    readme: mcpReadme(
      'Le serveur officiel de Stripe donne accès à l’API et à la base de connaissances de Stripe.',
      'Intégrer un paiement par carte ou un abonnement, et vérifier ce qui se passe en mode test.',
      'Utilise une clé du mode test et des clés restreintes ; jamais une clé secrète de production.',
    ),
    docs: 'https://docs.stripe.com/mcp',
    install: remoteMcp({ name: 'stripe', url: 'https://mcp.stripe.com' }),
    files: [],
  },

  /* ---------------- Serveurs de référence du protocole MCP ---------------- */
  {
    id: 'mcp-filesystem',
    name: 'Filesystem',
    kind: 'mcp',
    tools: ALL_LOCAL,
    publisher: 'Model Context Protocol',
    official: true,
    category: 'Fichiers',
    summary: 'Lecture et écriture de fichiers, limitées aux dossiers que tu autorises.',
    readme: mcpReadme(
      'Serveur de référence du protocole MCP : lister, lire, écrire et rechercher des fichiers dans des dossiers autorisés explicitement.',
      'Donner un accès aux fichiers à un outil qui n’en a pas nativement.',
      'N’autorise que le dossier du projet, jamais ton dossier personnel entier.',
    ),
    repo: 'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem',
    install: localMcp({
      name: 'filesystem',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', './'],
    }),
    files: [],
  },
  {
    id: 'mcp-fetch',
    name: 'Fetch',
    kind: 'mcp',
    tools: ALL_LOCAL,
    publisher: 'Model Context Protocol',
    official: true,
    category: 'Web',
    summary: 'Télécharge une page web et la convertit en Markdown lisible par l’agent.',
    readme: mcpReadme(
      'Serveur de référence : récupère une URL et transforme le HTML en Markdown, par morceaux si la page est longue.',
      'Lire une documentation ou un article précis à partir de son lien.',
      'Le contenu d’une page peut contenir des instructions malveillantes : l’agent doit le traiter comme une donnée.',
    ),
    repo: 'https://github.com/modelcontextprotocol/servers/tree/main/src/fetch',
    install: localMcp({ name: 'fetch', command: 'uvx', args: ['mcp-server-fetch'] }),
    files: [],
  },
  {
    id: 'mcp-git',
    name: 'Git',
    kind: 'mcp',
    tools: ALL_LOCAL,
    publisher: 'Model Context Protocol',
    official: true,
    category: 'Code et collaboration',
    summary: 'Lire l’historique, les différences et les branches d’un dépôt Git local.',
    readme: mcpReadme(
      'Serveur de référence : statut, journal, différences, branches et commits d’un dépôt local.',
      'Pour un outil sans accès au terminal, ou pour limiter l’agent à Git.',
      'Restreins-le au dépôt du projet avec --repository.',
    ),
    repo: 'https://github.com/modelcontextprotocol/servers/tree/main/src/git',
    install: localMcp({
      name: 'git',
      command: 'uvx',
      args: ['mcp-server-git', '--repository', '.'],
    }),
    files: [],
  },
  {
    id: 'mcp-memory',
    name: 'Memory',
    kind: 'mcp',
    tools: ALL_LOCAL,
    publisher: 'Model Context Protocol',
    official: true,
    category: 'Mémoire',
    summary:
      'Une mémoire persistante sous forme de graphe de connaissances, d’une session à l’autre.',
    readme: mcpReadme(
      'Serveur de référence : l’agent enregistre des entités, des relations et des observations dans un fichier local, et les relit plus tard.',
      'Garder des décisions et des préférences d’un projet entre deux conversations.',
      'Le fichier reste sur ta machine ; n’y mets pas de secrets.',
    ),
    repo: 'https://github.com/modelcontextprotocol/servers/tree/main/src/memory',
    install: localMcp({
      name: 'memory',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-memory'],
    }),
    files: [],
  },
  {
    id: 'mcp-sequential-thinking',
    name: 'Sequential Thinking',
    kind: 'mcp',
    tools: ALL_LOCAL,
    publisher: 'Model Context Protocol',
    official: true,
    category: 'Raisonnement',
    summary: 'Aide l’agent à découper un problème complexe en étapes qu’il peut réviser.',
    readme: mcpReadme(
      'Serveur de référence : un outil de réflexion structurée, étape par étape, avec retours en arrière possibles.',
      'Planifier une migration, analyser un bug difficile, comparer plusieurs approches.',
      'Inutile pour les tâches simples : il allonge les réponses.',
    ),
    repo: 'https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking',
    install: localMcp({
      name: 'sequential-thinking',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
    }),
    files: [],
  },

  /* ---------------- Formats de règles ---------------- */
  {
    id: 'agents-md',
    name: 'AGENTS.md',
    kind: 'rules',
    tools: ['codex', 'cursor'],
    publisher: 'Format ouvert',
    official: true,
    category: 'Règles de projet',
    summary:
      'Un fichier à la racine du dépôt qui explique aux agents comment construire, tester et contribuer.',
    readme:
      'AGENTS.md est un format ouvert, en Markdown, lu par de nombreux agents de code dont Codex et Cursor : commandes d’installation et de test, conventions de code, règles de sécurité, ce qu’il ne faut pas toucher.\n\n**Quand l’utiliser.** Dans tout dépôt où travaille un agent, comme un README pour les machines.\n\n**Précautions.** Garde-le court et à jour : des consignes obsolètes induisent l’agent en erreur.',
    docs: 'https://agents.md/',
    install: {
      codex: [
        {
          where: 'AGENTS.md, à la racine du dépôt',
          code: '# AGENTS.md\n\n## Installer et tester\n- pnpm install\n- pnpm test\n\n## Conventions\n- TypeScript strict, pas de any\n- Messages de commit au format Conventional Commits\n\n## Interdit\n- Ne jamais commiter de fichier .env',
          lang: 'markdown',
        },
      ],
      cursor: [
        {
          where: 'AGENTS.md, à la racine du dépôt',
          code: '# AGENTS.md\n\n## Installer et tester\n- pnpm install\n- pnpm test',
          lang: 'markdown',
        },
      ],
    },
    files: [],
  },
  {
    id: 'claude-md',
    name: 'CLAUDE.md',
    kind: 'rules',
    tools: ['claude'],
    publisher: 'Anthropic',
    official: true,
    category: 'Règles de projet',
    summary:
      'La mémoire de projet de Claude Code : commandes, conventions et contexte relus à chaque session.',
    readme:
      'Claude Code lit CLAUDE.md à la racine du projet (et ~/.claude/CLAUDE.md pour tes préférences). La commande /init en génère une première version à partir du dépôt.\n\n**Quand l’utiliser.** Dès le premier jour sur un projet.\n\n**Précautions.** Le fichier est commité : pas de secrets, et relis ce que /init écrit.',
    docs: 'https://docs.claude.com/en/docs/claude-code/memory',
    install: {
      claude: [{ where: 'Dans Claude Code, à la racine du projet', code: '/init', lang: 'bash' }],
    },
    files: [],
  },
  {
    id: 'cursor-rules',
    name: 'Cursor Rules',
    kind: 'rules',
    tools: ['cursor'],
    publisher: 'Cursor',
    official: true,
    category: 'Règles de projet',
    summary:
      'Des règles versionnées dans .cursor/rules, appliquées toujours, selon les fichiers ou à la demande.',
    readme:
      'Chaque règle est un fichier .mdc avec un en-tête : description, fichiers concernés (globs) et application automatique ou non.\n\n**Quand l’utiliser.** Pour des conventions par dossier (front, back, tests) dans Cursor.\n\n**Précautions.** Préfère quelques règles précises à un long fichier général.',
    docs: 'https://docs.cursor.com/context/rules',
    install: {
      cursor: [
        {
          where: '.cursor/rules/front.mdc',
          code: '---\ndescription: Conventions du front React\nglobs: src/**/*.tsx\nalwaysApply: false\n---\n\n- Composants fonctions, props typées\n- Pas de logique métier dans les composants',
          lang: 'markdown',
        },
      ],
    },
    files: [],
  },
];
