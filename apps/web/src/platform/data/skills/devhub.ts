import type { AgentSkill } from '../../types';
import { rulesInstall, skillInstall } from './install';

/**
 * Skills et règles rédigés par l'équipe DevHub. Chaque fiche contient le fichier complet,
 * prêt à télécharger : rien n'est simulé, le contenu est celui qui sera utilisé par l'agent.
 */

const md = (name: string, description: string, body: string) =>
  `---\nname: ${name}\ndescription: ${description}\n---\n\n${body.trim()}\n`;

const skill = (
  name: string,
  category: string,
  summary: string,
  readme: string,
  description: string,
  body: string,
): AgentSkill => ({
  id: name,
  name,
  kind: 'skill',
  tools: ['claude', 'codex', 'cursor'],
  publisher: 'DevHub',
  official: false,
  category,
  summary,
  readme,
  install: skillInstall(name),
  files: [{ path: `${name}/SKILL.md`, content: md(name, description, body) }],
});

const rules = (
  name: string,
  category: string,
  summary: string,
  readme: string,
  body: string,
): AgentSkill => ({
  id: name,
  name,
  kind: 'rules',
  tools: ['cursor', 'codex', 'claude'],
  publisher: 'DevHub',
  official: false,
  category,
  summary,
  readme,
  install: rulesInstall(name),
  files: [{ path: `${name}.md`, content: body.trim() + '\n' }],
});

export const DEVHUB_SKILLS: AgentSkill[] = [
  skill(
    'revue-de-code-fr',
    'Qualité',
    'Relit une branche comme un collègue senior : bugs, sécurité, lisibilité, remarques classées en français.',
    'Demande « relis ma branche » : l’agent lit le diff, classe ses remarques (bloquant, important, suggestion) et propose un correctif minimal pour chaque point bloquant. Il ne modifie rien sans ton accord.',
    'Relire un diff git et produire une revue classée par gravité, en français. Utiliser quand on demande une revue de code, une relecture de branche ou un avis avant une pull request.',
    `
# Revue de code

## Quand l'utiliser
Avant d'ouvrir une pull request, ou quand on te demande de relire une branche.

## Étapes
1. Récupère le diff : \`git diff main...HEAD\` (ou la branche de base indiquée).
2. Lis chaque fichier modifié en entier autour des changements, pas seulement les lignes du diff.
3. Cherche dans cet ordre :
   - erreurs de logique et cas limites (liste vide, valeur absente, double appel, fuseau horaire) ;
   - sécurité : injection SQL, XSS, contrôle d'accès manquant, secret dans le code ;
   - données : migrations non réversibles, montants en flottants, perte possible ;
   - lisibilité : noms trompeurs, fonctions trop longues, code mort.
4. Classe chaque remarque : **bloquant**, **important** ou **suggestion**, avec fichier et ligne.
5. Pour chaque point bloquant, propose un correctif minimal sous forme de diff.

## Format de la réponse
- Un résumé de trois lignes : ce que fait la branche, le risque principal, ton avis (prête ou non).
- Puis les remarques, regroupées par gravité.

## À ne pas faire
- Ne modifie aucun fichier sans accord explicite.
- Ne signale pas de préférences de style déjà réglées par le formateur ou le linter.
`,
  ),
  skill(
    'mobile-money-integration',
    'Paiements',
    'Les bons réflexes pour intégrer Wave, Orange Money, MTN MoMo ou M-Pesa : webhooks signés et idempotents, montants entiers, rapprochement.',
    'Guide l’agent pour toute intégration de mobile money : vérification de signature, traitement idempotent des webhooks, montants en entiers, statuts intermédiaires et tests qui rejouent les notifications.',
    'Intégrer un opérateur de mobile money (Wave, Orange Money, MTN MoMo, M-Pesa, agrégateurs comme CinetPay, FedaPay, Kkiapay, Paystack) de façon sûre. Utiliser pour tout code de paiement, webhook, remboursement ou rapprochement.',
    `
# Intégration mobile money

## Principes
- Le client ne décide jamais qu'un paiement est réussi : seule la notification serveur (webhook) ou un appel de vérification à l'API de l'opérateur fait foi.
- Les montants sont des **entiers** dans l'unité de la devise (FCFA sans décimale, centimes pour les autres). Jamais de flottants.
- Toute opération a une référence unique côté application, envoyée à l'opérateur.

## Webhooks
1. Vérifie la signature (HMAC ou clé publique selon l'opérateur) **avant** de lire le contenu. Rejette en 401 sinon.
2. Rends le traitement idempotent : contrainte unique sur l'identifiant de transaction de l'opérateur, puis un seul passage à l'état « payé ».
3. Réponds 2xx vite ; fais le travail lent (e-mail, livraison) dans une file de tâches.
4. Gère les statuts intermédiaires (en attente, expiré, échoué) : un paiement mobile peut être confirmé plusieurs minutes plus tard.

## Rapprochement
- Une tâche planifiée interroge l'API de l'opérateur pour les paiements restés « en attente » plus de 15 minutes.

## Tests
- Rejoue le même webhook trois fois : un seul paiement enregistré.
- Teste une signature invalide, un montant différent de la commande, une devise inattendue.

## Interdits
- Aucune clé réelle dans le code, les tests ou les journaux. Utilise les environnements bac à sable.
- Ne journalise jamais un numéro de téléphone complet : masque-le (+229 •••• 12 34).
`,
  ),
  skill(
    'offline-first-pwa',
    'Web',
    'Concevoir une PWA qui tient sans réseau : stratégie de cache, file d’attente IndexedDB, mise à jour du service worker.',
    'Une méthode et une liste de vérification pour les applications utilisées sur des réseaux mobiles instables : ce qui se met en cache, comment rejouer les écritures sans doublon, comment publier une nouvelle version sans casser les anciennes.',
    'Concevoir ou relire un service worker et une synchronisation hors ligne. Utiliser pour une PWA, une stratégie de cache, IndexedDB, une file d’écritures hors ligne ou un test en mode avion.',
    `
# PWA hors ligne d'abord

## Cache
- Shell de l'application en précache (HTML, JS, CSS) ; objectif : moins de 500 Ko.
- Lectures d'API : « stale-while-revalidate » avec une durée maximale, jamais de cache sur les réponses privées d'un autre utilisateur.
- Ne mets **jamais** en cache une requête POST, PUT ou DELETE.
- Versionne les caches et supprime les anciens à l'activation.

## Écritures hors ligne
1. Chaque action reçoit un identifiant unique côté client (UUID) envoyé comme clé d'idempotence.
2. L'action est enregistrée dans IndexedDB avant l'appel réseau ; l'interface l'affiche tout de suite comme « en attente ».
3. Au retour du réseau, rejoue les actions **dans l'ordre**, une par une ; retire chaque action dès que le serveur l'a acceptée.
4. Le serveur ignore une clé déjà traitée et renvoie la même réponse.

## Mises à jour
- Pas de skipWaiting automatique en pleine saisie : propose « Nouvelle version disponible, recharger ».

## Test obligatoire
Mode avion → créer un élément → recharger la page → il est toujours là → réseau rétabli → il est synchronisé **une seule fois**.
`,
  ),
  skill(
    'secrets-guard',
    'Sécurité',
    'Empêche qu’un secret (clé d’API, jeton, mot de passe, chaîne de connexion) parte dans un commit ou un message.',
    'Avant chaque commit proposé, l’agent cherche des secrets dans les fichiers modifiés et refuse de continuer tant qu’ils ne sont pas déplacés dans des variables d’environnement.',
    'Vérifier qu’aucun secret n’est commité ou partagé. Utiliser avant tout commit, push, création de fichier de configuration ou quand du code contient une clé, un jeton ou un mot de passe.',
    `
# Garde des secrets

## Avant chaque commit
1. Liste les fichiers préparés : \`git diff --cached --name-only\`.
2. Cherche dans leur contenu :
   - clés AWS (\`AKIA[0-9A-Z]{16}\`), jetons GitHub (\`ghp_\`, \`github_pat_\`), clés Stripe (\`sk_live_\`), clés privées (\`-----BEGIN ... PRIVATE KEY-----\`) ;
   - chaînes de connexion avec mot de passe (\`postgres://user:motdepasse@\`) ;
   - variables nommées \`*_SECRET\`, \`*_TOKEN\`, \`*_PASSWORD\`, \`*_API_KEY\` avec une valeur littérale.
3. Si tu trouves un secret : arrête, explique où il est, propose de le déplacer dans \`.env\` (ignoré par Git) et de le lire depuis l'environnement.

## Fichiers
- \`.env\` doit être dans \`.gitignore\` ; un \`.env.example\` sans valeurs réelles est commité à la place.

## Si un secret est déjà parti
- Dis-le clairement : il doit être **révoqué** et remplacé chez le fournisseur. Réécrire l'historique ne suffit pas.

## À ne pas faire
- Ne recopie jamais la valeur d'un secret dans ta réponse ; masque-la (\`sk_live_••••\`).
`,
  ),
  skill(
    'commit-conventionnel',
    'Git',
    'Écrit des messages de commit au format Conventional Commits, en anglais ou en français selon le projet.',
    'L’agent lit le diff préparé, choisit le bon type (feat, fix, refactor…), écrit un titre court à l’impératif et un corps qui explique le pourquoi.',
    'Rédiger un message de commit clair au format Conventional Commits. Utiliser quand on demande de commiter ou de proposer un message de commit.',
    `
# Message de commit

## Étapes
1. Lis \`git diff --cached\`. S'il est vide, demande quoi préparer.
2. Choisis le type : \`feat\` (fonctionnalité), \`fix\` (correction), \`refactor\`, \`test\`, \`docs\`, \`chore\`, \`perf\`, \`ci\`.
3. Ajoute une portée si le dépôt en utilise : \`feat(api): …\`.
4. Titre : 72 caractères au plus, à l'impératif, sans point final. Il dit **ce que fait** le commit.
5. Corps (si utile) : **pourquoi** ce changement, ce qui change pour l'utilisateur, les limites connues. Lignes de 72 caractères.

## Exemples
- \`fix(panier): empêcher un total négatif quand la remise dépasse le prix\`
- \`feat(paiements): ajouter le remboursement partiel Wave\`

## À ne pas faire
- Pas de « wip », « modifs », « fix bug ».
- Un commit = un sujet : propose de découper si le diff mélange plusieurs changements.
`,
  ),
  skill(
    'tests-e2e-playwright',
    'Tests',
    'Écrit des tests de bout en bout Playwright robustes : sélecteurs accessibles, attentes automatiques, données isolées.',
    'Une méthode pour des tests e2e qui ne clignotent pas : sélecteurs par rôle et libellé, aucun délai fixe, un compte de test par scénario, captures en cas d’échec.',
    'Écrire ou corriger des tests de bout en bout avec Playwright. Utiliser pour un parcours utilisateur à tester, un test instable ou une mise en place de Playwright.',
    `
# Tests de bout en bout avec Playwright

## Sélecteurs
- Priorité : \`getByRole('button', { name: 'Envoyer' })\`, \`getByLabel('E-mail')\`, \`getByText\`.
- Évite les sélecteurs CSS fragiles (\`.btn-primary > span\`) et les index.
- Si rien n'est accessible, c'est aussi un défaut d'accessibilité : signale-le.

## Attentes
- Jamais de \`waitForTimeout\`. Utilise les assertions qui attendent : \`await expect(locator).toBeVisible()\`, \`toHaveURL\`, \`toHaveText\`.

## Données
- Un utilisateur unique par test (suffixe aléatoire), créé par l'API ou une fixture, pas par l'interface quand ce n'est pas le sujet du test.
- Les tests ne dépendent pas de leur ordre d'exécution.

## Structure
1. Un test = un parcours qui a du sens pour un utilisateur (« publier une question et recevoir une réponse »).
2. Nom du test en phrase claire.
3. Configure \`trace: 'retain-on-failure'\` et les captures d'écran en cas d'échec.

## Réseau
- Teste aussi l'absence de réseau quand l'application le gère : \`context.setOffline(true)\`.
`,
  ),
  skill(
    'audit-accessibilite',
    'Accessibilité',
    'Audite une page selon les WCAG 2.2 : clavier, contrastes, libellés, titres, et propose les corrections.',
    'L’agent passe en revue une page ou un composant avec une grille WCAG 2.2 niveau AA et classe les problèmes par impact, avec le correctif.',
    'Auditer et corriger l’accessibilité d’une page ou d’un composant web (WCAG 2.2 AA). Utiliser pour une revue d’accessibilité, un formulaire, une navigation clavier ou des contrastes.',
    `
# Audit d'accessibilité (WCAG 2.2 AA)

## Grille
1. **Clavier** : tout est atteignable avec Tab, dans un ordre logique ; le focus est toujours visible ; pas de piège.
2. **Structure** : un seul \`h1\`, titres hiérarchisés, repères (\`header\`, \`nav\`, \`main\`, \`footer\`).
3. **Libellés** : chaque champ a un \`label\` relié ; chaque bouton icône a un nom accessible ; les images ont un \`alt\` pertinent (vide si décoratives).
4. **Contrastes** : texte normal ≥ 4,5:1, grand texte et éléments d'interface ≥ 3:1.
5. **Cibles** : zones cliquables d'au moins 24 × 24 px.
6. **Erreurs** : messages en texte, reliés au champ (\`aria-describedby\`), pas seulement en couleur.
7. **Mouvement** : animations réduites si \`prefers-reduced-motion\`.
8. **Langue** : \`lang\` sur la page et sur les passages dans une autre langue.

## Réponse
- Liste les problèmes par impact (bloquant, majeur, mineur), avec l'élément concerné et le correctif en code.
- Préfère les éléments HTML natifs aux rôles ARIA.
`,
  ),
  skill(
    'i18n-fr-en',
    'Internationalisation',
    'Rend une interface bilingue français-anglais proprement : clés de traduction, pluriels, dates et nombres localisés.',
    'L’agent extrait les textes en dur vers des fichiers de traduction, gère les pluriels et formate dates, nombres et devises avec Intl.',
    'Internationaliser une interface en français et en anglais. Utiliser pour extraire des textes en dur, ajouter une langue, gérer les pluriels ou formater dates, nombres et devises.',
    `
# Interface bilingue français et anglais

## Textes
1. Aucun texte visible en dur dans les composants : clés de traduction par écran (\`settings.title\`).
2. Les deux fichiers ont exactement les mêmes clés ; idéalement le type du fichier anglais est dérivé du français pour qu'une clé manquante casse la compilation.
3. Pas de concaténation de morceaux de phrase : une phrase entière avec des variables (\`{{count}} réponses\`).

## Pluriels et genres
- Utilise les formes plurielles de la bibliothèque (\`_one\`, \`_other\`). En français, 0 est singulier.

## Formats
- Dates : \`Intl.DateTimeFormat(lang, { dateStyle: 'medium' })\`.
- Nombres : \`Intl.NumberFormat(lang)\` ; en français, l'espace insécable sépare les milliers.
- Devises : \`Intl.NumberFormat(lang, { style: 'currency', currency: 'XOF' })\` ; le franc CFA n'a pas de décimales.

## Typographie française
- Espace insécable avant \`: ; ! ?\` et à l'intérieur des guillemets « ».

## Langue
- Mets à jour l'attribut \`lang\` du document quand l'utilisateur change de langue.
`,
  ),
  skill(
    'doc-api-openapi',
    'API',
    'Documente une API HTTP en OpenAPI 3.1 à partir du code : routes, schémas, erreurs, exemples.',
    'L’agent parcourt les routes, décrit chaque opération avec ses paramètres, ses réponses et ses erreurs, et ajoute des exemples réalistes.',
    'Rédiger ou compléter la documentation OpenAPI d’une API HTTP. Utiliser pour documenter des routes, générer un fichier openapi.yaml ou vérifier qu’une documentation correspond au code.',
    `
# Documenter une API en OpenAPI 3.1

## Étapes
1. Liste les routes depuis le code (contrôleurs, routeur) : méthode, chemin, authentification.
2. Pour chaque opération : \`summary\` court, \`operationId\` unique, paramètres de chemin et de requête, corps attendu.
3. Décris **toutes** les réponses : succès et erreurs (400, 401, 403, 404, 409, 422, 429) avec un schéma d'erreur commun (Problem Details, RFC 9457).
4. Réutilise les schémas dans \`components/schemas\` ; pas de copier-coller.
5. Ajoute un exemple réaliste par réponse, sans données personnelles réelles.

## Vérifications
- Chaque route du code est documentée, et chaque route documentée existe.
- Les champs obligatoires (\`required\`) correspondent à la validation réelle.
- Valide le fichier avec un linter OpenAPI.

## À ne pas faire
- N'invente pas de route ni de champ : si un comportement est ambigu, signale-le.
`,
  ),
  skill(
    'deploiement-vps-docker',
    'DevOps',
    'Déploie une application sur un VPS avec Docker Compose et Caddy : HTTPS, santé, sauvegardes et retour arrière.',
    'Une procédure de mise en production sur un serveur (par exemple un VPS Systalink à Dakar) : images étiquetées, secrets hors du dépôt, vérification de santé et retour arrière en une commande.',
    'Mettre en production ou mettre à jour une application sur un VPS avec Docker Compose. Utiliser pour un déploiement, un retour arrière, la configuration HTTPS ou les sauvegardes.',
    `
# Déployer sur un VPS avec Docker Compose

## Préparer
1. Les images sont construites par la CI et étiquetées avec le SHA du commit (jamais \`latest\` en production).
2. Les secrets sont dans \`/srv/app/.env\` sur le serveur (droits 600), pas dans le dépôt.
3. Caddy sert l'application en HTTPS (certificats automatiques) ; seuls les ports 80 et 443 sont ouverts ; la base n'est pas exposée.

## Déployer
1. \`git status\` doit être propre et la CI verte.
2. Sur le serveur : \`TAG=<sha> docker compose pull && TAG=<sha> docker compose up -d\`.
3. Applique les migrations de base compatibles avec l'ancienne version (ajouter avant de retirer).
4. Vérifie la santé : l'URL de santé répond 200 en moins de 60 s ; sinon, retour arrière.

## Retour arrière
- \`TAG=<sha précédent> docker compose up -d\`. Note toujours le SHA en production avant de déployer.

## Après
- Ouvre le parcours principal depuis un téléphone, hors du réseau de l'équipe.
- Vérifie que la sauvegarde de la nuit s'est faite et qu'une restauration a été testée ce mois-ci.
`,
  ),
  rules(
    'flutter-telephones-entree-de-gamme',
    'Mobile',
    'Règles pour des apps Flutter fluides sur des téléphones à 1 ou 2 Go de RAM et des réseaux lents.',
    'Des consignes à donner à l’agent pour toute app Flutter destinée à un large public africain : poids, mémoire, réseau, batterie.',
    `
# Flutter sur téléphones d'entrée de gamme

- Cible : Android 8 et plus, 1 à 2 Go de RAM, connexion 3G instable.
- Taille de l'APK : vise moins de 20 Mo ; active la réduction du code (R8) et découpe par ABI (\`flutter build apk --split-per-abi\`).
- Images : WebP redimensionnées côté serveur à la taille affichée ; \`cacheWidth\` / \`cacheHeight\` sur \`Image.network\`.
- Listes : toujours \`ListView.builder\`, jamais une \`Column\` de centaines d'éléments.
- Widgets : \`const\` partout où c'est possible ; évite les reconstructions inutiles (état local, \`select\` du gestionnaire d'état).
- Réseau : délai d'expiration explicite, nouvelle tentative avec attente croissante, état « hors ligne » visible ; garde les dernières données en cache local.
- Animations : courtes, désactivables ; pas de flou en temps réel.
- Batterie : pas de minuteur qui tourne en arrière-plan ; regroupe les synchronisations.
- Teste sur un vrai téléphone d'entrée de gamme avant chaque version.
`,
  ),
  rules(
    'laravel-conventions',
    'Back-end',
    'Conventions pour un projet Laravel propre : contrôleurs fins, validation par Form Requests, Eloquent sans requêtes N+1.',
    'Des règles courtes que l’agent applique à chaque modification d’un projet Laravel.',
    `
# Conventions Laravel

- Contrôleurs fins : la logique métier va dans des classes dédiées (actions ou services).
- Validation : toujours une Form Request ; jamais de données de \`$request->all()\` envoyées directement à un modèle.
- Modèles : \`$fillable\` explicite ; pas de \`$guarded = []\`.
- Requêtes : charge les relations avec \`with()\` pour éviter les requêtes N+1 ; pagine les listes.
- Autorisations : Policies et \`authorize()\` dans chaque action qui modifie une ressource.
- Migrations : réversibles, une migration par changement ; jamais de modification d'une migration déjà déployée.
- Montants : entiers (unité minimale), jamais de float.
- Files d'attente pour les tâches lentes (e-mails, appels à des API externes).
- Tests : un test de fonctionnalité par route, avec la base en transaction.
- Secrets : uniquement dans \`.env\`, lus via \`config()\` et jamais \`env()\` hors des fichiers de configuration.
`,
  ),
];
