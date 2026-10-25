import type { BuildTrack, GuideStep } from '../types'
import { GUIDE } from './guide'

/**
 * Le parcours change selon ce que l'on construit : certaines étapes disparaissent
 * (pas de base de données pour un site vitrine), d'autres sont réécrites
 * (« Déployer » devient « Publier sur les stores » pour le mobile) et d'autres s'ajoutent
 * (évaluation des réponses pour un agent IA).
 */

type Override = Partial<Omit<GuideStep, 'id'>>
const base = (id: string) => GUIDE.find((s) => s.id === id)!
const step = (id: string, o: Override = {}): GuideStep => ({ ...base(id), ...o })

/* ---------------- Site web ---------------- */

const SITE_CONTENT: GuideStep = {
  id: 'site-contenu',
  title: 'Contenus, textes et référencement',
  goal: 'Des pages qui disent clairement qui tu es, ce que tu proposes, et que Google sait lire.',
  duration: '3 à 6 h',
  actions: [
    'Écris le texte de chaque page avant de la coder : titre, sous-titre, appel à l’action.',
    'Un seul h1 par page, des titres h2/h3 dans l’ordre, des liens au texte explicite.',
    'Renseigne le titre et la description de chaque page (balises title et meta description).',
    'Prépare des images légères (WebP, 1600 px de large maximum) avec un texte alternatif.',
    'Ajoute un sitemap.xml et un fichier robots.txt.',
  ],
  prompts: [
    { label: 'Relire les textes', text: 'Voici le texte de ma page d’accueil : [texte]. Réécris-le pour un visiteur pressé sur mobile : phrases courtes, un bénéfice par paragraphe, un seul appel à l’action. Garde mon ton et ne rajoute aucune promesse que je n’ai pas faite.' },
    { label: 'Audit SEO', text: 'Analyse ce HTML : [code]. Liste les problèmes de référencement et d’accessibilité (titres, balises meta, textes alternatifs, liens) par ordre d’importance, avec la correction pour chacun.' },
  ],
  pitfalls: [
    { title: 'Du texte généré qui ne dit rien', detail: '« Solutions innovantes pour votre succès » : les visiteurs repartent. Parle de ton offre, de tes prix, de tes résultats concrets.', severity: 'important' },
    { title: 'Des images de 5 Mo', detail: 'Sur une connexion mobile, la page met 20 secondes à s’afficher. Compresse tout avant de publier.', severity: 'critique' },
    { title: 'Des avis ou chiffres inventés', detail: 'Un témoignage fictif peut être sanctionné et détruit la confiance. Publie seulement ce qui est vrai.', severity: 'critique' },
  ],
  checklist: ['Chaque page a un titre et une description', 'Toutes les images ont un texte alternatif', 'Le sitemap est en ligne'],
  resources: [{ label: 'Templates de landing page', to: '/templates' }],
}

const SITE_PERF: GuideStep = {
  id: 'site-perf',
  title: 'Vitesse, accessibilité et formulaires',
  goal: 'Un site qui s’affiche vite sur un petit téléphone et que tout le monde peut utiliser.',
  duration: '0,5 à 1 jour',
  actions: [
    'Mesure la page avec Lighthouse (onglet de Chrome) en mode mobile.',
    'Vise moins de 2,5 s pour l’affichage du contenu principal.',
    'Teste la navigation au clavier et le contraste des textes.',
    'Protège le formulaire de contact contre le spam (champ caché ou captcha léger).',
    'Vérifie que les e-mails du formulaire arrivent bien, y compris dans les spams.',
  ],
  prompts: [{ label: 'Accélérer la page', text: 'Voici le rapport Lighthouse de ma page : [rapport]. Propose les 5 corrections qui gagnent le plus de temps d’affichage, dans l’ordre, avec le code à changer.' }],
  pitfalls: [
    { title: 'Charger 4 polices et 3 bibliothèques', detail: 'Chaque fichier ajoute du poids. Une police système ou une seule police variable suffit souvent.', severity: 'important' },
    { title: 'Un formulaire sans retour', detail: 'Le visiteur doit voir que son message est parti, ou pourquoi il ne l’est pas.', severity: 'important' },
  ],
  checklist: ['Score Lighthouse mobile ≥ 90', 'Le site se parcourt au clavier', 'Le formulaire de contact a été testé de bout en bout'],
  resources: [],
}

/* ---------------- Application mobile ---------------- */

const MOBILE_DEVICE: GuideStep = {
  id: 'mobile-device',
  title: 'Permissions, notifications et hors ligne',
  goal: 'Une app qui demande seulement ce dont elle a besoin et reste utilisable sans réseau.',
  duration: '1 à 2 jours',
  actions: [
    'Liste les permissions (caméra, position, notifications) et demande chacune au moment où elle sert, avec une explication.',
    'Garde les dernières données sur le téléphone pour un affichage immédiat, même hors ligne.',
    'Mets les actions de l’utilisateur en file d’attente quand le réseau tombe, puis renvoie-les.',
    'Configure les notifications push (Firebase Cloud Messaging) et laisse l’utilisateur les régler.',
    'Teste sur un téléphone d’entrée de gamme avec la 3G simulée.',
  ],
  prompts: [
    { label: 'Mode hors ligne', text: 'Mon app [Flutter/React Native] affiche [liste]. Propose une stratégie hors ligne : cache local, file d’attente des actions, résolution des conflits au retour du réseau. Montre le code de la file d’attente et ses tests.' },
  ],
  pitfalls: [
    { title: 'Demander toutes les permissions au lancement', detail: 'L’utilisateur refuse tout, et les stores peuvent rejeter l’app. Demande au bon moment.', severity: 'critique' },
    { title: 'Une app blanche sans réseau', detail: 'Dans beaucoup de régions, la connexion est intermittente. L’écran doit toujours montrer quelque chose.', severity: 'important' },
    { title: 'Des notifications trop fréquentes', detail: 'C’est la première cause de désinstallation.', severity: 'conseil' },
  ],
  checklist: ['Chaque permission est justifiée à l’écran', 'L’app s’ouvre et affiche des données en mode avion', 'Les actions hors ligne sont renvoyées au retour du réseau'],
  resources: [{ label: 'Parcours « Mobile avec Flutter »', to: '/apprendre/mobile-flutter' }],
}

const MOBILE_STORE: GuideStep = {
  id: 'mobile-store',
  title: 'Publier sur Google Play et l’App Store',
  goal: 'Une app signée, acceptée par les stores, avec une fiche qui donne envie de l’installer.',
  duration: '2 à 5 jours (avec la relecture des stores)',
  actions: [
    'Crée les comptes développeur (Google Play : paiement unique ; Apple : abonnement annuel).',
    'Génère la clé de signature Android et garde-la en lieu sûr : sans elle, plus de mise à jour possible.',
    'Prépare la fiche : icône, 4 à 8 captures, description courte, politique de confidentialité en ligne.',
    'Publie d’abord en test interne ou TestFlight auprès de 10 à 20 personnes.',
    'Remplis le formulaire sur les données collectées (Data safety / App Privacy) honnêtement.',
  ],
  prompts: [{ label: 'Fiche du store', text: 'Rédige la fiche Google Play de mon app [description] : titre (30 caractères), description courte (80 caractères), description longue structurée. Pas de superlatifs ni de promesses invérifiables.' }],
  pitfalls: [
    { title: 'Perdre la clé de signature', detail: 'Sans la clé, tu ne peux plus publier de mise à jour de la même app. Sauvegarde-la hors de ton ordinateur.', severity: 'critique' },
    { title: 'Une politique de confidentialité absente', detail: 'C’est une cause fréquente de rejet. Elle doit être accessible par une URL publique.', severity: 'critique' },
    { title: 'Publier sans test interne', detail: 'Un crash au premier lancement se paie en notes d’une étoile, difficiles à remonter.', severity: 'important' },
  ],
  checklist: ['La clé de signature est sauvegardée à deux endroits', 'La version de test a tourné chez 10 personnes', 'La fiche et la politique de confidentialité sont prêtes'],
  resources: [],
}

/* ---------------- Agent ou outil IA ---------------- */

const AGENT_PROMPT: GuideStep = {
  id: 'agent-prompt',
  title: 'Instructions, modèle et évaluation',
  goal: 'Savoir mesurer si ton agent répond bien, avant de le mettre devant des utilisateurs.',
  duration: '1 à 2 jours',
  actions: [
    'Écris les instructions système : rôle, ton, ce que l’agent doit refuser, format de réponse.',
    'Constitue un jeu de 30 à 50 questions réelles avec la réponse attendue.',
    'Compare 2 ou 3 modèles sur ce jeu : qualité, temps de réponse, coût par conversation.',
    'Relance ce jeu à chaque changement d’instructions ou de modèle.',
    'Garde les échanges (anonymisés) pour enrichir le jeu de tests.',
  ],
  prompts: [
    { label: 'Créer le jeu de tests', text: 'Mon agent aide [public] à [tâche]. Propose 30 questions de test variées : cas simples, cas ambigus, demandes hors sujet et tentatives de lui faire dire n’importe quoi. Pour chacune, la réponse attendue en une phrase.' },
  ],
  pitfalls: [
    { title: 'Juger un agent sur 3 essais', detail: 'Les réponses varient. Sans jeu de tests, tu ne sais pas si un changement améliore ou dégrade.', severity: 'critique' },
    { title: 'Un agent qui invente', detail: 'Demande-lui de citer ses sources et de dire « je ne sais pas » ; vérifie qu’il le fait vraiment.', severity: 'critique' },
    { title: 'Prendre le plus gros modèle partout', detail: 'Un modèle plus petit suffit souvent pour classer ou résumer, pour 10 fois moins cher.', severity: 'conseil' },
  ],
  checklist: ['Le jeu de tests compte au moins 30 cas', 'Le taux de bonnes réponses est mesuré', 'Le coût moyen d’une conversation est connu'],
  resources: [{ label: 'Skills et serveurs MCP', to: '/skills' }],
}

const AGENT_TOOLS: GuideStep = {
  id: 'agent-tools',
  title: 'Outils, connaissances et garde-fous',
  goal: 'Un agent qui agit seulement dans son périmètre, avec une validation humaine pour ce qui compte.',
  duration: '1 à 3 jours',
  actions: [
    'Liste les outils de l’agent (recherche, base de données, e-mail) et donne à chacun les droits minimum.',
    'Pour les documents de ton entreprise : découpe-les, indexe-les, et fais citer le passage utilisé (RAG).',
    'Exige une confirmation humaine avant toute action irréversible : paiement, envoi, suppression.',
    'Plafonne les appels par utilisateur et par jour.',
    'Journalise chaque appel d’outil pour pouvoir expliquer une décision.',
  ],
  prompts: [{ label: 'Revoir les droits', text: 'Voici les outils de mon agent et leurs paramètres : [liste]. Pour chacun, quel est le pire usage possible si un utilisateur malveillant manipule l’agent ? Propose la restriction qui l’empêche.' }],
  pitfalls: [
    { title: 'L’injection de prompt', detail: 'Un document ou une page web lue par l’agent peut contenir des instructions. Rien de ce qui est lu ne doit pouvoir déclencher une action sensible seul.', severity: 'critique' },
    { title: 'Des clés d’API dans l’app', detail: 'Les appels au modèle passent toujours par ton serveur, jamais directement depuis le navigateur ou le téléphone.', severity: 'critique' },
  ],
  checklist: ['Chaque outil a des droits minimum', 'Les actions irréversibles demandent une confirmation', 'Un plafond d’usage est en place'],
  resources: [],
}

/* ---------------- Parcours par type de projet ---------------- */

const TRACK_STEPS: Record<BuildTrack, () => GuideStep[]> = {
  webapp: () => GUIDE,
  website: () => [
    step('idee', { trackNotes: undefined }),
    step('cahier', { title: 'Plan du site et pages', goal: 'Savoir quelles pages existent, ce que chacune doit faire faire au visiteur, et ce qui n’est pas prévu.', duration: '1 à 2 h' }),
    step('stack', {
      goal: 'Un outil adapté à un site sans comptes : générateur statique ou constructeur de site, que tu sais mettre à jour.',
      actions: [
        'Pour un site vitrine ou un blog : un générateur statique (Astro, Next.js en export) ou un constructeur visuel.',
        'Pour un contenu mis à jour par quelqu’un qui ne code pas : un CMS simple.',
        'Choisis l’agent avec lequel tu es à l’aise et vérifie qu’il connaît la version de ton outil.',
      ],
    }),
    step('setup'),
    step('design'),
    SITE_CONTENT,
    step('build', { title: 'Construire les pages', goal: 'Une page après l’autre, avec un rendu vérifié sur mobile à chaque fois.', duration: '1 à 3 jours' }),
    SITE_PERF,
    step('deploy', {
      goal: 'Ton site en ligne en HTTPS, sur ton nom de domaine.',
      duration: '1 à 3 h',
      actions: ['Achète ou relie ton nom de domaine.', 'Publie sur un hébergement statique ou chez Systalink (hébergement web).', 'Active le HTTPS et la redirection du www.', 'Vérifie le site sur 2 navigateurs et 2 téléphones.'],
    }),
    step('launch', { trackNotes: undefined }),
  ],
  mobile: () => [
    step('idee'),
    step('cahier'),
    step('stack', {
      goal: 'Un framework mobile que tu sais relire : Flutter ou React Native (Expo), et un agent qui le connaît.',
      actions: [
        'Flutter : une seule base de code, très performant sur les téléphones modestes.',
        'React Native avec Expo : idéal si tu connais déjà React et JavaScript.',
        'Prévois le back-end dès maintenant (API, authentification) : l’app ne doit contenir aucun secret.',
        'Installe Android Studio et un émulateur ; pour iOS, il faut un Mac ou un service de build en ligne.',
      ],
    }),
    step('setup'),
    step('design', { title: 'Écrans, navigation et gestes', goal: 'Des écrans pensés pour le pouce, la lumière du soleil et les petits écrans.' }),
    step('data', { title: 'Données, API et synchronisation', goal: 'Un back-end stable et un stockage local qui se synchronise sans perdre de données.' }),
    step('build'),
    MOBILE_DEVICE,
    step('securite'),
    step('tests', { title: 'Tests sur de vrais téléphones', goal: 'Être sûr que l’app marche sur les téléphones de tes utilisateurs, pas seulement sur l’émulateur.' }),
    MOBILE_STORE,
    step('launch'),
  ],
  agent: () => [
    step('idee'),
    step('cahier', { title: 'Cadrer ce que l’agent fait et ne fait pas', goal: 'Une liste claire des tâches de l’agent, de ses limites et du moment où il passe la main à un humain.' }),
    step('stack', {
      goal: 'Un modèle, un framework et un hébergement adaptés à ton usage et à ton budget.',
      actions: [
        'Choisis le fournisseur de modèle selon la qualité sur TES cas, la latence et le prix.',
        'Commence avec un appel direct à l’API avant d’ajouter un framework d’agents.',
        'Prévois un serveur (même petit) : les clés et la logique ne vivent jamais dans le client.',
      ],
    }),
    step('setup'),
    AGENT_PROMPT,
    AGENT_TOOLS,
    step('design', { title: 'Interface de conversation', goal: 'Une conversation claire : réponses en flux, sources visibles, possibilité de corriger ou d’arrêter l’agent.' }),
    step('build'),
    step('securite'),
    step('tests', { title: 'Tests et évaluation continue', goal: 'Relancer automatiquement le jeu de tests de l’agent à chaque changement.' }),
    step('deploy'),
    step('launch'),
  ],
}

export function guideFor(track: BuildTrack | null): GuideStep[] {
  return TRACK_STEPS[track ?? 'webapp']()
}
