import type { AgentSkill, AgentTool, SkillKind } from '../types'
import { ago } from './people'

const skillMd = (name: string, description: string, body: string) => `---
name: ${name}
description: ${description}
---

${body}`

/** Skills, plugins, serveurs MCP et règles publiés par la communauté (démo). */
export const SKILLS: AgentSkill[] = [
  {
    id: 'revue-de-code-fr',
    name: 'revue-de-code-fr',
    kind: 'skill',
    tools: ['claude', 'codex', 'cursor'],
    author: 'grace-uwase',
    category: 'Qualité',
    summary: 'Relit un diff comme un collègue senior : bugs, sécurité, lisibilité, avec des commentaires en français.',
    readme: "Demande « relis ma branche » : le skill lit le diff, classe les remarques (bloquant, important, suggestion) et propose un correctif pour chaque point bloquant. Il ne modifie jamais le code sans ton accord.",
    installs: 4820,
    stars: 612,
    version: '1.4.0',
    updatedAt: ago(30),
    verified: true,
    files: [
      {
        path: 'revue-de-code-fr/SKILL.md',
        content: skillMd(
          'revue-de-code-fr',
          'Relire un diff git et produire une revue classée par gravité, en français. Utiliser quand on demande une revue de code ou une relecture de branche.',
          "1. Lis `git diff main...HEAD`.\n2. Pour chaque fichier, cherche : erreurs de logique, cas limites, failles (injection, XSS, secrets), noms trompeurs.\n3. Classe chaque remarque : **bloquant**, **important**, **suggestion**.\n4. Pour chaque point bloquant, propose un correctif minimal.\n5. Ne modifie aucun fichier sans accord explicite.",
        ),
      },
    ],
  },
  {
    id: 'mobile-money',
    name: 'mobile-money-integration',
    kind: 'skill',
    tools: ['claude', 'codex', 'cursor', 'antigravity'],
    author: 'ousmane-sow',
    category: 'Paiements',
    summary: 'Les bons réflexes pour intégrer Wave, Orange Money, MTN MoMo ou M-Pesa : webhooks idempotents, rapprochement, sandbox.',
    readme: "Le skill guide l'agent pour : vérifier la signature des webhooks, rendre leur traitement idempotent (contrainte unique + événement métier), stocker les montants en entiers, et écrire les tests avec des webhooks rejoués.",
    installs: 2310,
    stars: 402,
    version: '0.9.2',
    updatedAt: ago(70),
    verified: true,
    files: [
      {
        path: 'mobile-money-integration/SKILL.md',
        content: skillMd(
          'mobile-money-integration',
          'Intégrer un opérateur de mobile money (Wave, Orange Money, MTN MoMo, M-Pesa) de façon sûre. Utiliser pour tout code de paiement, webhook ou remboursement.',
          "- Vérifie la signature de chaque webhook avant tout traitement.\n- Traitement idempotent : contrainte unique sur l'identifiant de l'opérateur, puis un événement « paiement confirmé » consommé une seule fois.\n- Montants en entiers (unité minimale), jamais en flottants.\n- Écris un test qui rejoue le même webhook 3 fois.\n- Aucune clé réelle dans le code ni dans les tests.",
        ),
      },
    ],
  },
  {
    id: 'pg-readonly',
    name: 'postgres-lecture-seule',
    kind: 'mcp',
    tools: ['claude', 'codex', 'cursor', 'antigravity'],
    author: 'kwame-dev',
    category: 'Données',
    summary: 'Serveur MCP qui donne à l’agent un accès en lecture seule à ta base PostgreSQL, avec limite de lignes et colonnes masquées.',
    readme: "Expose trois outils : lister les tables, décrire une table, exécuter un SELECT (limité à 200 lignes). Les colonnes listées dans MASKED_COLUMNS sont remplacées par « *** ». Utilise un rôle PostgreSQL en lecture seule dédié.",
    installs: 3150,
    stars: 520,
    version: '2.1.0',
    updatedAt: ago(15),
    verified: true,
    files: [
      { path: '.env.example', content: 'DATABASE_URL=postgres://lecteur:motdepasse@localhost:5432/app\nMASKED_COLUMNS=users.email,users.phone\nROW_LIMIT=200' },
    ],
  },
  {
    id: 'offline-pwa',
    name: 'offline-first-pwa',
    kind: 'skill',
    tools: ['claude', 'antigravity', 'codex'],
    author: 'mariam-k',
    category: 'Web',
    summary: 'Construire une PWA qui tient sans réseau : stratégie de cache, file d’attente IndexedDB, mise à jour du service worker.',
    readme: "Inclut une checklist de revue des service workers (pas de cache sur POST, versionnement, skipWaiting maîtrisé, budget de précache) et un script de test en mode avion avec Playwright.",
    installs: 1290,
    stars: 233,
    version: '1.0.3',
    updatedAt: ago(100),
    verified: false,
    files: [
      {
        path: 'offline-first-pwa/SKILL.md',
        content: skillMd(
          'offline-first-pwa',
          'Concevoir ou relire un service worker et une synchronisation hors ligne. Utiliser pour PWA, cache, IndexedDB ou mode avion.',
          "- Ne jamais mettre en cache une requête POST.\n- Versionner les caches et nettoyer les anciens à l'activation.\n- Précache limité au shell (objectif < 500 Ko).\n- Toute écriture hors ligne reçoit un identifiant unique (Idempotency-Key).\n- Tester en mode avion : écrire, recharger, se reconnecter, vérifier l'absence de doublon.",
        ),
      },
    ],
  },
  {
    id: 'deploy-vps',
    name: 'deploy-vps',
    kind: 'plugin',
    tools: ['claude'],
    author: 'moussa-diop',
    category: 'DevOps',
    summary: 'Plugin Claude Code : commandes /deploy et /rollback pour Docker Compose sur un VPS, avec vérification de santé.',
    readme: "Ajoute deux commandes et un hook. /deploy construit, pousse et redémarre les services, puis appelle /health. /rollback revient à l'image précédente. Le hook refuse un déploiement si des fichiers ne sont pas commités.",
    installs: 980,
    stars: 171,
    version: '0.6.0',
    updatedAt: ago(50),
    verified: true,
    files: [
      { path: 'commands/deploy.md', content: "Construis les images avec `docker compose build`, pousse-les, redémarre avec `docker compose up -d`, puis appelle l'URL de santé. Si elle ne répond pas en 60 s, propose /rollback." },
    ],
  },
  {
    id: 'secrets-guard',
    name: 'secrets-guard',
    kind: 'plugin',
    tools: ['claude'],
    author: 'thandi-d',
    category: 'Sécurité',
    summary: 'Hook qui bloque un commit ou une commande si un secret (clé d’API, jeton, mot de passe) est détecté.',
    readme: "Analyse les fichiers modifiés avant chaque commit proposé par l'agent. Motifs couverts : clés AWS, jetons GitHub, clés Stripe et opérateurs mobile money, chaînes de connexion. En cas de détection, l'agent doit déplacer la valeur dans un .env ignoré.",
    installs: 2740,
    stars: 488,
    version: '1.2.1',
    updatedAt: ago(20),
    verified: true,
    files: [],
  },
  {
    id: 'laravel-rules',
    name: 'laravel-conventions',
    kind: 'rules',
    tools: ['cursor', 'antigravity', 'codex'],
    author: 'yao-mensah',
    category: 'Backend',
    summary: 'Règles de projet Laravel : contrôleurs fins, Form Requests, politiques d’accès, migrations réversibles.',
    readme: "À placer dans les règles du projet (AGENTS.md pour Codex, règles du workspace pour Cursor et Antigravity). L'agent suit alors les conventions de l'équipe sans les répéter à chaque demande.",
    installs: 1670,
    stars: 205,
    version: '1.1.0',
    updatedAt: ago(130),
    verified: false,
    files: [{ path: 'AGENTS.md', content: '# Conventions Laravel\n\n- Validation dans des Form Requests, jamais dans le contrôleur.\n- Autorisation par Policies.\n- Toute migration a une méthode down() fonctionnelle.\n- Tests Pest pour chaque route.' }],
  },
  {
    id: 'flutter-lowend',
    name: 'flutter-telephones-entree-de-gamme',
    kind: 'rules',
    tools: ['cursor', 'antigravity', 'claude'],
    author: 'je-hounkpatin',
    category: 'Mobile',
    summary: 'Règles pour des apps Flutter rapides sur 2 Go de RAM : images, listes, taille de l’APK.',
    readme: 'Listes paresseuses, images redimensionnées côté serveur, pas d’animation lourde au démarrage, découpage de l’APK par architecture.',
    installs: 760,
    stars: 118,
    version: '0.4.0',
    updatedAt: ago(160),
    verified: false,
    files: [],
  },
  {
    id: 'i18n-fr-en',
    name: 'i18n-fr-en',
    kind: 'skill',
    tools: ['claude', 'codex', 'cursor'],
    author: 'nadia-benali',
    category: 'Web',
    summary: 'Externalise les textes d’une interface et produit les fichiers français et anglais, sans casser les pluriels.',
    readme: 'Repère les chaînes en dur, crée des clés stables, gère les pluriels et les variables, et signale les textes ambigus à faire relire par un humain.',
    installs: 1120,
    stars: 164,
    version: '1.0.0',
    updatedAt: ago(90),
    verified: true,
    files: [],
  },
  {
    id: 'playwright-e2e',
    name: 'tests-e2e-playwright',
    kind: 'skill',
    tools: ['claude', 'codex', 'antigravity'],
    author: 'cedric-nk',
    category: 'Qualité',
    summary: 'Écrit des tests de bout en bout Playwright à partir d’un parcours décrit en français.',
    readme: 'Tu décris le parcours (« un visiteur pose une question puis se reconnecte »), le skill écrit le test avec des sélecteurs accessibles, et le lance pour vérifier qu’il passe.',
    installs: 1430,
    stars: 197,
    version: '1.3.0',
    updatedAt: ago(40),
    verified: true,
    files: [],
  },
  {
    id: 'ussd-flows',
    name: 'ussd-sms-flows',
    kind: 'skill',
    tools: ['claude', 'codex'],
    author: 'fatou-nd',
    category: 'Mobile',
    summary: 'Concevoir des menus USSD et des parcours SMS : sessions, délais, messages de 160 caractères.',
    readme: "Aide l'agent à modéliser un menu USSD comme une machine à états, à gérer l'expiration de session et à tester les parcours sans téléphone.",
    installs: 540,
    stars: 92,
    version: '0.3.1',
    updatedAt: ago(200),
    verified: false,
    files: [],
  },
  {
    id: 'a11y-audit',
    name: 'audit-accessibilite',
    kind: 'skill',
    tools: ['claude', 'cursor', 'antigravity'],
    author: 'esi-owusu',
    category: 'Design',
    summary: 'Audit d’accessibilité d’une page : contrastes, navigation clavier, libellés, tailles de cible.',
    readme: 'Produit une liste priorisée de corrections avec le critère WCAG concerné et un correctif proposé pour chacune.',
    installs: 890,
    stars: 143,
    version: '1.0.2',
    updatedAt: ago(75),
    verified: true,
    files: [],
  },
  {
    id: 'commit-propre',
    name: 'commit-propre',
    kind: 'prompt',
    tools: ['claude', 'codex', 'cursor', 'antigravity'],
    author: 'koffi-ag',
    category: 'Outils',
    summary: 'Un prompt pour des messages de commit clairs : quoi, pourquoi, et rien d’autre.',
    readme: 'Copie ce prompt dans tes instructions : l’agent écrira des commits courts au format « type(portée): résumé », avec le pourquoi dans le corps.',
    installs: 3360,
    stars: 301,
    version: '1.0.0',
    updatedAt: ago(220),
    verified: false,
    files: [{ path: 'prompt.txt', content: 'Écris le message de commit : une ligne « type(portée): résumé » de moins de 72 caractères, puis une ligne vide, puis le pourquoi du changement en 1 à 3 phrases. Ne décris pas le diff ligne à ligne.' }],
  },
  {
    id: 'openapi-doc',
    name: 'doc-api-openapi',
    kind: 'skill',
    tools: ['claude', 'codex'],
    author: 'sam-mwangi',
    category: 'Backend',
    summary: 'Génère et tient à jour la spécification OpenAPI à partir des routes, avec exemples réalistes.',
    readme: 'Lit les routes et les schémas de validation, produit un fichier openapi.yaml, et signale les routes sans description ou sans code d’erreur documenté.',
    installs: 710,
    stars: 109,
    version: '0.8.0',
    updatedAt: ago(110),
    verified: false,
    files: [],
  },
]

export const TOOL_LABEL: Record<AgentTool, string> = { claude: 'Claude Code', codex: 'Codex', antigravity: 'Antigravity', cursor: 'Cursor' }
export const KIND_LABEL: Record<SkillKind, string> = { skill: 'Skill', plugin: 'Plugin', mcp: 'Serveur MCP', rules: 'Règles', prompt: 'Prompt' }

/** Où installer un élément selon l'outil (indicatif : la documentation de l'outil fait foi). */
export function installHint(kind: SkillKind, tool: AgentTool, name: string): { label: string; code: string } {
  if (kind === 'mcp') {
    if (tool === 'claude') return { label: 'Ajouter le serveur MCP', code: `claude mcp add ${name} -- npx ${name}` }
    if (tool === 'codex') return { label: 'Déclarer dans ~/.codex/config.toml', code: `[mcp_servers.${name}]\ncommand = "npx"\nargs = ["${name}"]` }
    if (tool === 'cursor') return { label: 'Déclarer dans .cursor/mcp.json', code: `{ "mcpServers": { "${name}": { "command": "npx", "args": ["${name}"] } } }` }
    return { label: 'Ajouter depuis les réglages MCP de l’éditeur', code: `npx ${name}` }
  }
  if (kind === 'plugin') return { label: 'Installer dans Claude Code', code: `/plugin marketplace add devhub/marketplace\n/plugin install ${name}@devhub` }
  if (kind === 'rules' || kind === 'prompt') {
    if (tool === 'codex') return { label: 'Ajouter au fichier AGENTS.md du dépôt', code: `curl -o AGENTS.md https://devhub.africa/s/${name}/AGENTS.md` }
    if (tool === 'cursor') return { label: 'Copier dans .cursor/rules/', code: `mkdir -p .cursor/rules && curl -o .cursor/rules/${name}.mdc https://devhub.africa/s/${name}` }
    if (tool === 'claude') return { label: 'Ajouter au fichier CLAUDE.md du projet', code: `curl https://devhub.africa/s/${name}/rules.md >> CLAUDE.md` }
    return { label: 'Copier dans les règles du workspace', code: `https://devhub.africa/s/${name}` }
  }
  if (tool === 'claude') return { label: 'Copier dans ~/.claude/skills/', code: `git clone https://github.com/devhub-skills/${name} ~/.claude/skills/${name}` }
  if (tool === 'codex') return { label: 'Copier dans ~/.codex/skills/', code: `git clone https://github.com/devhub-skills/${name} ~/.codex/skills/${name}` }
  if (tool === 'cursor') return { label: 'Copier dans les règles du projet', code: `git clone https://github.com/devhub-skills/${name} .cursor/skills/${name}` }
  return { label: 'Copier dans le dossier de l’agent du workspace', code: `git clone https://github.com/devhub-skills/${name} .agent/skills/${name}` }
}
