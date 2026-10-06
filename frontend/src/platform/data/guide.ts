import type { BuildTrack, GuideStep } from '../types'

export const TRACKS: { id: BuildTrack; title: string; text: string; icon: string }[] = [
  { id: 'webapp', title: 'Application web', text: 'Un outil avec comptes, données et tableau de bord (SaaS, back-office, plateforme).', icon: 'layout-dashboard' },
  { id: 'website', title: 'Site web', text: 'Site vitrine, portfolio, landing page ou blog, sans compte utilisateur.', icon: 'globe' },
  { id: 'mobile', title: 'Application mobile', text: 'Une app Android et iOS, souvent avec un mode hors ligne.', icon: 'smartphone' },
  { id: 'agent', title: 'Agent ou outil IA', text: 'Un assistant, un chatbot métier ou une automatisation qui appelle un modèle.', icon: 'bot' },
]

/**
 * Guide complet « Créer une app avec l'IA ».
 * Chaque étape : objectif, actions, prompts types, points d'attention, checklist de sortie.
 * Principe : l'IA écrit vite, toi tu décides, tu vérifies et tu restes responsable du résultat.
 */
export const GUIDE: GuideStep[] = [
  {
    id: 'idee',
    title: 'Clarifier l’idée et le problème',
    goal: 'Savoir pour qui tu construis, quel problème tu règles et comment tu sauras que ça marche.',
    duration: '1 à 2 h',
    actions: [
      'Écris le problème en une phrase, du point de vue de l’utilisateur.',
      'Décris 1 ou 2 utilisateurs précis (qui, où, avec quel téléphone, quelle connexion).',
      'Liste ce qu’ils font aujourd’hui sans ton app, et ce que ça leur coûte.',
      'Fixe un critère de réussite mesurable (ex. : « 20 commerçants l’utilisent chaque semaine »).',
      'Parle à 3 utilisateurs potentiels avant d’écrire une ligne de code.',
    ],
    prompts: [
      { label: 'Challenger l’idée', text: "Voici mon idée d'application : [idée]. Pose-moi 10 questions difficiles pour vérifier qu'elle répond à un vrai problème. Ne propose pas encore de solution technique." },
      { label: 'Trouver les concurrents', text: 'Quelles solutions existent déjà pour [problème] en [pays] ? Pour chacune, ce qu’elle fait bien et ce qui manque. Indique clairement ce que tu n’es pas sûr de savoir.' },
    ],
    pitfalls: [
      { title: 'Construire pour un utilisateur imaginaire', detail: 'Une idée validée seulement par l’IA ne l’est pas. Les modèles ont tendance à trouver toutes les idées bonnes : confronte-la à de vraies personnes.', severity: 'critique' },
      { title: 'Croire les chiffres de marché donnés par l’IA', detail: 'Les statistiques, prix et noms de concurrents peuvent être inventés ou dépassés. Vérifie chaque chiffre à la source.', severity: 'important' },
      { title: 'Vouloir tout faire', detail: 'Une app qui règle un problème précis bat une app qui en survole dix.', severity: 'conseil' },
    ],
    checklist: ['Le problème tient en une phrase', 'J’ai parlé à au moins 3 utilisateurs potentiels', 'J’ai un critère de réussite chiffré'],
    trackNotes: {
      agent: 'Demande-toi d’abord si une IA est nécessaire : un formulaire et des règles simples suffisent parfois, pour moins cher et plus fiable.',
      mobile: 'Vérifie le parc de téléphones de tes utilisateurs : version d’Android, mémoire, données mobiles disponibles.',
    },
    resources: [{ label: 'Communauté « Montre ton projet »', to: '/c/showcase' }],
  },
  {
    id: 'cahier',
    title: 'Écrire le cahier des charges du MVP',
    goal: 'Un document court que l’agent et toi pouvez suivre : fonctionnalités, priorités, critères d’acceptation.',
    duration: '2 à 4 h',
    actions: [
      'Liste les parcours utilisateurs principaux (3 à 5 maximum pour un MVP).',
      'Pour chaque fonctionnalité : une user story et un critère d’acceptation testable.',
      'Classe en P0 (indispensable), P1 (souhaité), P2 (plus tard).',
      'Écris ce que l’app ne fera PAS dans cette version.',
      'Garde le document dans le dépôt (docs/specs.md) : l’agent pourra le lire.',
    ],
    prompts: [
      { label: 'Structurer le cahier des charges', text: "À partir de ces notes : [notes], rédige un cahier des charges de MVP : parcours principaux, user stories avec critères d'acceptation testables, priorités P0/P1/P2 et liste explicite de ce qui est hors périmètre. Maximum 2 pages." },
      { label: 'Chasser les zones floues', text: 'Relis ce cahier des charges et liste les ambiguïtés, les cas limites oubliés et les règles métier non précisées. Pose une question par point.' },
    ],
    pitfalls: [
      { title: 'Un cahier des charges trop long', detail: 'Au-delà de 2 pages pour un MVP, personne ne le suit, ni toi ni l’agent. Coupe.', severity: 'important' },
      { title: 'Des critères d’acceptation invérifiables', detail: '« L’app doit être rapide » ne se teste pas. « La liste s’affiche en moins de 2 s sur une connexion 3G » se teste.', severity: 'important' },
      { title: 'Oublier les cas d’erreur', detail: 'Pas de réseau, paiement refusé, champ vide, double clic : c’est là que les apps générées cassent.', severity: 'critique' },
    ],
    checklist: ['Chaque fonctionnalité P0 a un critère d’acceptation testable', 'La liste « hors périmètre » existe', 'Le document est dans le dépôt'],
    resources: [{ label: 'Parcours « Développer avec l’IA »', to: '/apprendre/dev-ia' }],
  },
  {
    id: 'stack',
    title: 'Choisir la stack et l’outil IA',
    goal: 'Des technologies que tu peux relire et maintenir, et un agent adapté à ta façon de travailler.',
    duration: '1 h',
    actions: [
      'Choisis une stack que tu comprends, même si l’IA en propose une plus « moderne ».',
      'Préfère des technologies très utilisées : l’IA les connaît mieux et la communauté peut t’aider.',
      'Choisis ton agent : Claude Code (terminal, skills, plugins), Codex (CLI open source), Antigravity (éditeur orienté agents), Cursor (éditeur).',
      'Pars d’un template éprouvé plutôt que d’une page blanche.',
      'Estime le coût mensuel : hébergement, base, nom de domaine, API d’IA.',
    ],
    prompts: [
      { label: 'Comparer deux stacks', text: 'Pour ce cahier des charges [lien], compare [stack A] et [stack B] : temps de développement, coût d’hébergement, facilité de maintenance pour un dev seul, maturité. Recommande-en une et justifie.' },
    ],
    pitfalls: [
      { title: 'Une stack que tu ne sais pas relire', detail: 'Si tu ne comprends pas le code produit, tu ne pourras ni le corriger ni le sécuriser. L’IA ne remplace pas la compréhension.', severity: 'critique' },
      { title: 'Des versions dépassées', detail: 'Les modèles ont une date de connaissance : ils peuvent proposer des API obsolètes. Vérifie la documentation officielle de chaque version installée.', severity: 'important' },
      { title: 'Multiplier les services', detail: 'Chaque service externe est un compte, une facture et une panne possible. Commence simple.', severity: 'conseil' },
    ],
    checklist: ['Je sais lire le langage principal de la stack', 'Les versions sont vérifiées dans la doc officielle', 'Le coût mensuel est estimé'],
    trackNotes: {
      website: 'Un générateur de site statique (Astro, Next.js en export) suffit souvent : pas de serveur à maintenir.',
      mobile: 'Flutter ou React Native pour une seule base de code ; Kotlin natif si la performance sur petits téléphones est critique.',
      agent: 'Choisis le modèle selon la tâche et le coût par requête ; prévois un plafond de dépense dès le début.',
    },
    resources: [{ label: 'Templates', to: '/templates' }, { label: 'Hub Skills & plugins', to: '/skills' }],
  },
  {
    id: 'setup',
    title: 'Préparer le projet et l’agent',
    goal: 'Un dépôt propre où l’agent connaît les règles du projet et ne peut pas fuir tes secrets.',
    duration: '1 à 2 h',
    actions: [
      'Crée le dépôt git et fais un premier commit avant toute génération.',
      'Ajoute un .gitignore qui exclut .env, node_modules, les builds et les fichiers locaux.',
      'Écris le fichier d’instructions de l’agent (CLAUDE.md, AGENTS.md ou règles du workspace) : stack, commandes, conventions, interdits.',
      'Place les clés dans un fichier .env non commité, et fournis un .env.example sans valeur.',
      'Installe les skills utiles depuis le hub (revue de code, tests, sécurité).',
    ],
    prompts: [
      { label: 'Écrire le fichier d’instructions', text: 'Rédige un fichier AGENTS.md pour ce projet : stack [stack], commandes de test, lint et build, conventions de nommage, et une liste d’interdits (pas de secret dans le code, pas de nouvelle dépendance sans le signaler, ne jamais modifier un test pour le faire passer). Maximum 40 lignes.' },
    ],
    pitfalls: [
      { title: 'Coller une clé d’API dans le prompt', detail: 'Ce que tu écris à l’agent peut être journalisé. Une clé collée dans une conversation doit être considérée comme compromise : révoque-la.', severity: 'critique' },
      { title: 'Donner tous les droits à l’agent', detail: 'Garde la validation manuelle pour les commandes qui suppriment, déploient ou écrivent hors du projet.', severity: 'critique' },
      { title: 'Pas de git avant de commencer', detail: 'Sans historique, impossible de revenir en arrière quand l’agent casse quelque chose.', severity: 'important' },
    ],
    checklist: ['Le dépôt a un premier commit', '.env est ignoré par git', 'Le fichier d’instructions existe', 'Les permissions de l’agent sont limitées'],
    resources: [{ label: 'Skill secrets-guard', to: '/skills/secrets-guard' }, { label: 'Skill revue-de-code-fr', to: '/skills/revue-de-code-fr' }],
  },
  {
    id: 'design',
    title: 'Concevoir les écrans et le parcours',
    goal: 'Savoir à quoi ressemble chaque écran et dans quel ordre l’utilisateur les traverse, avant de coder.',
    duration: '3 à 6 h',
    actions: [
      'Dessine les écrans des parcours P0 (papier, Figma ou maquette générée).',
      'Fixe un petit design system : couleurs en variables, 2 tailles de rayon, une échelle typographique.',
      'Une seule action principale par écran.',
      'Prévois les états : chargement, vide, erreur, hors ligne.',
      'Teste la maquette avec 2 utilisateurs.',
    ],
    prompts: [
      { label: 'Lister les états d’un écran', text: 'Pour l’écran [nom], liste tous les états à concevoir (chargement, vide, erreur, partiel, hors ligne, permissions) et ce que l’utilisateur doit voir dans chacun.' },
    ],
    pitfalls: [
      { title: 'L’interface « template IA »', detail: 'Dégradés violets, cartes partout, icônes décoratives : les interfaces générées se ressemblent toutes. Donne des références précises et un design system à respecter.', severity: 'important' },
      { title: 'Oublier le mobile et l’accessibilité', detail: 'Vérifie le contraste, la navigation au clavier et des zones tactiles d’au moins 44 px.', severity: 'important' },
      { title: 'Oublier les états vides et d’erreur', detail: 'Ce sont les premiers écrans que verra un nouvel utilisateur.', severity: 'conseil' },
    ],
    checklist: ['Chaque écran P0 a une maquette', 'Les états vide, chargement et erreur sont prévus', 'Les couleurs sont des variables'],
    resources: [{ label: 'Vidéo : 7 règles de design pour les devs', to: '/videos/v-design-devs' }, { label: 'Skill audit-accessibilite', to: '/skills/a11y-audit' }],
  },
  {
    id: 'data',
    title: 'Modèle de données et architecture',
    goal: 'Des tables et des contrats d’API stables, sur lesquels l’agent peut construire sans tout casser.',
    duration: '2 à 4 h',
    actions: [
      'Liste les entités (utilisateur, commande, produit…) et leurs relations.',
      'Écris le schéma de base avec ses contraintes (clés étrangères, UNIQUE, NOT NULL).',
      'Décris les routes d’API ou les actions serveur, avec entrées et sorties.',
      'Décide où vit chaque règle métier (base, serveur, client).',
      'Fais relire le schéma par un dev de la communauté.',
    ],
    prompts: [
      { label: 'Proposer un schéma', text: 'À partir de ce cahier des charges [lien], propose un schéma PostgreSQL : tables, colonnes, types, contraintes et index. Explique chaque contrainte UNIQUE. Ne génère pas encore de code applicatif.' },
    ],
    pitfalls: [
      { title: 'Des montants en nombres à virgule', detail: 'Stocke l’argent en entiers (centimes, francs) : les flottants produisent des erreurs d’arrondi.', severity: 'critique' },
      { title: 'Des migrations irréversibles', detail: 'Chaque migration doit pouvoir être annulée. Ne laisse jamais l’agent modifier une migration déjà appliquée en production.', severity: 'important' },
      { title: 'Pas de contrainte d’unicité', detail: 'Sans UNIQUE, un double clic ou un webhook rejoué crée des doublons.', severity: 'important' },
    ],
    checklist: ['Le schéma est relu', 'Les montants sont en entiers', 'Les contrats d’API sont écrits'],
    trackNotes: {
      website: 'Souvent pas de base : un CMS headless ou des fichiers Markdown suffisent.',
      mobile: 'Décide tout de suite ce qui vit sur le téléphone et comment ça se synchronise.',
      agent: 'Stocke les conversations et les appels d’outils : tu en auras besoin pour déboguer et évaluer.',
    },
    resources: [{ label: 'Certification SQL', to: '/certifications/sql-pratique' }, { label: 'Serveur MCP Postgres lecture seule', to: '/skills/pg-readonly' }],
  },
  {
    id: 'build',
    title: 'Construire par petites étapes',
    goal: 'Avancer fonctionnalité par fonctionnalité, avec à chaque fois un diff que tu comprends et des tests qui passent.',
    duration: 'Plusieurs jours',
    actions: [
      'Pour chaque fonctionnalité : demande un plan, valide-le, puis fais exécuter.',
      'Une étape = un changement relisible en moins de 10 minutes.',
      'Lance les tests et l’app toi-même après chaque étape.',
      'Relis le diff entier, puis commite avec un message clair.',
      'Quand l’agent tourne en rond, arrête : reformule, réduis l’étape ou demande de l’aide à la communauté.',
    ],
    prompts: [
      { label: 'Demander un plan', text: 'Lis docs/specs.md et la fonctionnalité [nom]. Propose un plan en étapes courtes, chacune testable. N’écris pas de code tant que je n’ai pas validé le plan.' },
      { label: 'Exécuter une étape', text: 'Réalise uniquement l’étape 2 du plan. Ajoute ou mets à jour les tests. Lance-les et montre-moi le résultat. Ne touche à aucun autre fichier sans me le dire.' },
      { label: 'Débloquer', text: 'Tu as échoué deux fois sur ce bug. Arrête de modifier le code. Liste les hypothèses possibles, classe-les par probabilité et propose comment vérifier chacune.' },
    ],
    pitfalls: [
      { title: 'Accepter un diff sans le lire', detail: 'C’est la source n°1 de bugs et de failles dans les apps générées. Si tu ne comprends pas une ligne, demande une explication avant d’accepter.', severity: 'critique' },
      { title: 'Des paquets inconnus ou inventés', detail: 'Vérifie que chaque nouvelle dépendance existe, est maintenue et fait ce qu’on croit. Les noms inventés sont une porte d’entrée pour des paquets malveillants.', severity: 'critique' },
      { title: 'Des tests modifiés pour passer', detail: 'Un agent peut affaiblir un test au lieu de corriger le code. Surveille les changements dans les fichiers de test.', severity: 'important' },
      { title: 'Laisser grossir le contexte', detail: 'Une conversation trop longue rend l’agent moins précis et plus coûteux. Repars d’une session neuve à chaque fonctionnalité.', severity: 'conseil' },
    ],
    checklist: ['Chaque étape a son commit', 'Les tests passent chez moi, pas seulement selon l’agent', 'Aucune dépendance non vérifiée'],
    resources: [{ label: 'Vidéo : une app complète avec un agent IA', to: '/videos/v-claude-code' }, { label: 'Entraide SOS Dev', to: '/sos' }],
  },
  {
    id: 'securite',
    title: 'Authentification, sécurité et données personnelles',
    goal: 'Que personne ne puisse lire, modifier ou voler ce qui ne lui appartient pas.',
    duration: '1 à 2 jours',
    actions: [
      'Utilise une solution d’authentification éprouvée plutôt qu’un système maison.',
      'Vérifie côté serveur, sur chaque route, que l’utilisateur a le droit d’accéder à la ressource.',
      'Valide toutes les entrées avec un schéma.',
      'Active HTTPS, des cookies HttpOnly et SameSite, et une limite de requêtes.',
      'Liste les données personnelles collectées et pourquoi ; permets la suppression du compte.',
    ],
    prompts: [
      { label: 'Audit de sécurité', text: 'Fais un audit de sécurité de ce dépôt selon l’OWASP Top 10 : contrôle d’accès, injection, XSS, secrets, dépendances vulnérables. Pour chaque problème : fichier, gravité, correctif. Ne modifie rien.' },
    ],
    pitfalls: [
      { title: 'Le contrôle d’accès côté client uniquement', detail: 'Cacher un bouton ne protège rien. Le serveur doit refuser la requête.', severity: 'critique' },
      { title: 'Des clés d’API dans le front', detail: 'Tout ce qui est dans le navigateur ou l’app mobile est lisible. Les appels à l’IA et aux paiements passent par ton serveur.', severity: 'critique' },
      { title: 'Collecter plus de données que nécessaire', detail: 'Chaque donnée stockée est une responsabilité légale (protection des données selon ton pays).', severity: 'important' },
    ],
    checklist: ['Chaque route vérifie les droits', 'Aucune clé dans le front', 'Audit de sécurité fait et corrigé', 'Suppression de compte possible'],
    trackNotes: { agent: 'Protège-toi des injections de prompt : un document lu par l’agent ne doit jamais pouvoir déclencher une action sensible sans validation humaine.' },
    resources: [{ label: 'Certification Sécurité web', to: '/certifications/securite-web' }],
  },
  {
    id: 'tests',
    title: 'Tests et qualité',
    goal: 'Pouvoir modifier l’app demain sans peur de casser ce qui marche aujourd’hui.',
    duration: '1 à 2 jours',
    actions: [
      'Tests unitaires sur les règles métier (calculs, droits, états).',
      'Tests de bout en bout sur les parcours P0.',
      'Teste sur un vrai téléphone d’entrée de gamme et une connexion lente.',
      'Fais tester par une personne qui n’a pas construit l’app, sans lui expliquer.',
      'Branche les tests dans une CI à chaque pull request.',
    ],
    prompts: [{ label: 'Écrire les tests d’un parcours', text: 'Écris un test Playwright pour ce parcours : [parcours]. Utilise des sélecteurs accessibles (rôle, libellé). Lance-le et corrige le test s’il est mal écrit, pas l’application, sans me demander.' }],
    pitfalls: [
      { title: 'Des tests qui testent l’implémentation', detail: 'Un bon test vérifie ce que voit l’utilisateur, pas le détail du code : il survit aux refactorisations.', severity: 'important' },
      { title: 'Ne tester que le cas heureux', detail: 'Ajoute au moins un test d’erreur par parcours : réseau coupé, donnée invalide, droit refusé.', severity: 'important' },
    ],
    checklist: ['Les parcours P0 ont un test de bout en bout', 'La CI bloque une PR qui casse les tests', 'Un testeur externe a fait le parcours'],
    resources: [{ label: 'Skill tests-e2e-playwright', to: '/skills/playwright-e2e' }],
  },
  {
    id: 'deploy',
    title: 'Déployer',
    goal: 'Une URL publique stable, en HTTPS, avec des sauvegardes que tu as déjà restaurées.',
    duration: '0,5 à 1 jour',
    actions: [
      'Choisis l’hébergement (VPS, plateforme managée, hébergeur africain pour la latence et les données).',
      'Configure les variables d’environnement de production, différentes de celles de développement.',
      'Mets en place le déploiement automatique depuis la branche principale.',
      'Active les sauvegardes de la base et fais une restauration de test.',
      'Ajoute une route de santé et une alerte si elle ne répond plus.',
    ],
    prompts: [{ label: 'Préparer la mise en production', text: 'Prépare une checklist de mise en production pour cette app : variables d’environnement, migrations, HTTPS, sauvegardes, supervision, retour arrière. Indique pour chaque point comment le vérifier.' }],
    pitfalls: [
      { title: 'Une sauvegarde jamais restaurée', detail: 'Tant que tu n’as pas restauré une sauvegarde, tu ne sais pas si elle marche.', severity: 'critique' },
      { title: 'Le mode debug en production', detail: 'Il affiche des traces, des chemins et parfois des secrets. Vérifie la configuration de production.', severity: 'critique' },
      { title: 'Pas de retour arrière', detail: 'Garde la version précédente prête à être redéployée en une commande.', severity: 'important' },
    ],
    checklist: ['HTTPS actif', 'Sauvegarde restaurée avec succès', 'Debug désactivé', 'Retour arrière testé'],
    trackNotes: {
      mobile: 'Prévois la fiche du store, la politique de confidentialité et des versions de test (bêta fermée) avant la publication.',
      website: 'Vérifie les aperçus de partage (Open Graph) : c’est ce que verront les gens sur WhatsApp et LinkedIn.',
    },
    resources: [{ label: 'Vidéo : Docker Compose + nginx jusqu’à HTTPS', to: '/videos/v-docker-nginx' }, { label: 'Plugin deploy-vps', to: '/skills/deploy-vps' }],
  },
  {
    id: 'launch',
    title: 'Lancer, mesurer et maintenir',
    goal: 'Avoir de vrais utilisateurs, comprendre ce qu’ils font et garder l’app en bonne santé.',
    duration: 'En continu',
    actions: [
      'Présente ton projet dans la communauté « Montre ton projet » avec une démo et ce que tu attends comme retour.',
      'Mesure ton critère de réussite défini à l’étape 1.',
      'Mets en place un suivi des erreurs et regarde-le chaque semaine.',
      'Mets à jour les dépendances régulièrement et relis les changements.',
      'Surveille les coûts (hébergement, API d’IA) avec un plafond et une alerte.',
    ],
    prompts: [{ label: 'Analyser les retours', text: 'Voici 30 retours d’utilisateurs [retours]. Regroupe-les par thème, estime la fréquence de chacun et propose les 3 améliorations au meilleur rapport effet / effort.' }],
    pitfalls: [
      { title: 'Des coûts d’IA qui explosent', detail: 'Un robot ou une boucle peut générer des milliers d’appels en une nuit. Plafonne par utilisateur et par jour.', severity: 'critique' },
      { title: 'Ignorer les premiers retours', detail: 'Les 10 premiers utilisateurs t’apprennent plus que n’importe quel prompt.', severity: 'conseil' },
    ],
    checklist: ['Le projet est présenté à la communauté', 'Le suivi des erreurs est actif', 'Un plafond de coûts est configuré'],
    resources: [{ label: 'Publier dans « Montre ton projet »', to: '/c/showcase' }, { label: 'Trouver des contributeurs', to: '/projets' }],
  },
]
