import type { Community } from '../types';

/**
 * Les communautés du fil : sujet, description et règles. Leur activité (publications, auteurs)
 * vient de l'API (GET /api/v1/communities) ; les slugs suivent COMMUNITY_SLUGS de @devhub/contracts.
 */
/** Publication libre, sans sujet (12/11/2026) : visible dans tous les fils, absente des sujets. */
export const GENERAL_COMMUNITY: Community = {
  slug: 'general',
  name: 'Tout le monde',
  description: 'Publication visible par toute la communauté, quel que soit le sujet suivi.',
  color: '#64748b',
  icon: 'users',
  rules: [],
};

export const COMMUNITIES: Community[] = [
  {
    slug: 'ia',
    name: 'Intelligence artificielle',
    description:
      'Agents de code, modèles, prompts, MCP, skills : ce qui marche vraiment en production.',
    color: '#0ea5e9',
    icon: 'sparkles',
    rules: [
      'Cite tes sources quand tu annonces une nouveauté',
      'Pas de prompt « miracle » sans exemple reproductible',
      'Les captures de code doivent masquer les clés',
    ],
  },
  {
    slug: 'web',
    name: 'Développement web',
    description: 'React, Vue, Next.js, Laravel, CSS et tout ce qui finit dans un navigateur.',
    color: '#4f7cff',
    icon: 'globe',
    rules: ['Un problème = un exemple minimal', 'Pas de liens raccourcis'],
  },
  {
    slug: 'mobile',
    name: 'Mobile',
    description:
      'Flutter, React Native, Kotlin, Swift. Des apps qui tiennent sur un téléphone à 2 Go de RAM.',
    color: '#3ccf8e',
    icon: 'smartphone',
    rules: ['Précise l’appareil et la version de l’OS', 'Pas d’APK sans code source'],
  },
  {
    slug: 'backend',
    name: 'Backend & API',
    description: 'Node, Go, Python, PHP, bases de données, files d’attente, idempotence.',
    color: '#f0b232',
    icon: 'server',
    rules: [
      'Donne les versions (langage, framework, base)',
      'Pas de données personnelles dans les extraits',
    ],
  },
  {
    slug: 'devops',
    name: 'DevOps & Cloud',
    description:
      'Docker, Kubernetes, CI/CD, hébergement en Afrique, sauvegardes qui se restaurent.',
    color: '#f2575a',
    icon: 'container',
    rules: ['Masque tes adresses IP et tes secrets', 'Indique ton hébergeur'],
  },
  {
    slug: 'opensource',
    name: 'Open source',
    description: 'Tes dépôts, tes premières contributions, les projets qui cherchent de l’aide.',
    color: '#e879f9',
    icon: 'git-fork',
    rules: ['Lien vers le dépôt obligatoire', 'Licence indiquée'],
  },
  {
    slug: 'carriere',
    name: 'Carrière & salaires',
    description: 'Entretiens, salaires réels, freelance, premier emploi, reconversion.',
    color: '#22d3ee',
    icon: 'briefcase',
    rules: ['Les chiffres de salaire sont anonymes', 'Pas de démarchage'],
  },
  {
    slug: 'fintech',
    name: 'Paiements & mobile money',
    description: 'Wave, Orange Money, MTN MoMo, M-Pesa, webhooks et rapprochements.',
    color: '#fb923c',
    icon: 'wallet',
    rules: ['Jamais de vraie clé ni de vrai numéro', 'Précise l’opérateur et le pays'],
  },
  {
    slug: 'data',
    name: 'Data & ML',
    description: 'SQL, pandas, modèles, données agricoles et de santé, MLOps.',
    color: '#a3e635',
    icon: 'database',
    rules: [
      'Partage le schéma, pas les données',
      'Les jeux de données doivent être publics ou anonymisés',
    ],
  },
  {
    slug: 'showcase',
    name: 'Montre ton projet',
    description:
      'Lancements, démos, retours honnêtes. On applaudit, puis on critique avec bienveillance.',
    color: '#f472b6',
    icon: 'rocket',
    rules: ['Un lancement par projet et par mois', 'Dis ce que tu attends comme retour'],
  },
];
