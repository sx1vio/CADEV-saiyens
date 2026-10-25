/**
 * Sources réelles agrégées par DevHub. Chaque flux a été vérifié (réponse 200 et articles présents).
 * Les identifiants de chaînes YouTube ont été résolus depuis leur @pseudo officiel.
 * On publie le titre, un court extrait et le lien vers l'article d'origine (comme un agrégateur).
 */

export type Category =
  | 'ia'
  | 'tech'
  | 'apple'
  | 'google'
  | 'samsung'
  | 'mobile'
  | 'dev'
  | 'afrique'
  | 'cloud'
  | 'securite';

export interface FeedSource {
  id: string;
  name: string;
  url: string;
  homepage: string;
  category: Category;
  lang: 'en' | 'fr';
}

export interface ChannelSource {
  id: string;
  name: string;
  channelId: string;
  category: Category;
  lang: 'en' | 'fr';
}

export const FEEDS: FeedSource[] = [
  // Intelligence artificielle
  {
    id: 'openai',
    name: 'OpenAI',
    url: 'https://openai.com/news/rss.xml',
    homepage: 'https://openai.com/news',
    category: 'ia',
    lang: 'en',
  },
  {
    id: 'google-ai',
    name: 'Google AI',
    url: 'https://blog.google/technology/ai/rss/',
    homepage: 'https://blog.google/technology/ai/',
    category: 'ia',
    lang: 'en',
  },
  {
    id: 'deepmind',
    name: 'Google DeepMind',
    url: 'https://deepmind.google/blog/rss.xml',
    homepage: 'https://deepmind.google/discover/blog/',
    category: 'ia',
    lang: 'en',
  },
  {
    id: 'huggingface',
    name: 'Hugging Face',
    url: 'https://huggingface.co/blog/feed.xml',
    homepage: 'https://huggingface.co/blog',
    category: 'ia',
    lang: 'en',
  },
  {
    id: 'verge-ai',
    name: 'The Verge · IA',
    url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml',
    homepage: 'https://www.theverge.com/ai-artificial-intelligence',
    category: 'ia',
    lang: 'en',
  },
  {
    id: 'techcrunch-ai',
    name: 'TechCrunch · IA',
    url: 'https://techcrunch.com/category/artificial-intelligence/feed/',
    homepage: 'https://techcrunch.com/category/artificial-intelligence/',
    category: 'ia',
    lang: 'en',
  },
  {
    id: 'mit-ai',
    name: 'MIT Technology Review',
    url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed',
    homepage: 'https://www.technologyreview.com/topic/artificial-intelligence/',
    category: 'ia',
    lang: 'en',
  },
  {
    id: 'simonw',
    name: 'Simon Willison',
    url: 'https://simonwillison.net/atom/everything/',
    homepage: 'https://simonwillison.net',
    category: 'ia',
    lang: 'en',
  },

  // Tech générale
  {
    id: 'verge',
    name: 'The Verge',
    url: 'https://www.theverge.com/rss/index.xml',
    homepage: 'https://www.theverge.com',
    category: 'tech',
    lang: 'en',
  },
  {
    id: 'techcrunch',
    name: 'TechCrunch',
    url: 'https://techcrunch.com/feed/',
    homepage: 'https://techcrunch.com',
    category: 'tech',
    lang: 'en',
  },
  {
    id: 'ars',
    name: 'Ars Technica',
    url: 'https://feeds.arstechnica.com/arstechnica/index',
    homepage: 'https://arstechnica.com',
    category: 'tech',
    lang: 'en',
  },
  {
    id: 'wired',
    name: 'Wired',
    url: 'https://www.wired.com/feed/rss',
    homepage: 'https://www.wired.com',
    category: 'tech',
    lang: 'en',
  },
  {
    id: 'engadget',
    name: 'Engadget',
    url: 'https://www.engadget.com/rss.xml',
    homepage: 'https://www.engadget.com',
    category: 'tech',
    lang: 'en',
  },
  {
    id: 'numerama',
    name: 'Numerama',
    url: 'https://www.numerama.com/feed/',
    homepage: 'https://www.numerama.com',
    category: 'tech',
    lang: 'fr',
  },
  {
    id: '01net',
    name: '01net',
    url: 'https://www.01net.com/actualites/feed/',
    homepage: 'https://www.01net.com',
    category: 'tech',
    lang: 'fr',
  },
  {
    id: 'jdg',
    name: 'Journal du Geek',
    url: 'https://www.journaldugeek.com/feed/',
    homepage: 'https://www.journaldugeek.com',
    category: 'tech',
    lang: 'fr',
  },
  {
    id: 'korben',
    name: 'Korben',
    url: 'https://korben.info/feed',
    homepage: 'https://korben.info',
    category: 'tech',
    lang: 'fr',
  },
  {
    id: 'lmi',
    name: 'Le Monde Informatique',
    url: 'https://www.lemondeinformatique.fr/flux-rss/thematique/toutes-les-actualites/rss.xml',
    homepage: 'https://www.lemondeinformatique.fr',
    category: 'tech',
    lang: 'fr',
  },

  // Apple
  {
    id: '9to5mac',
    name: '9to5Mac',
    url: 'https://9to5mac.com/feed/',
    homepage: 'https://9to5mac.com',
    category: 'apple',
    lang: 'en',
  },
  {
    id: 'macrumors',
    name: 'MacRumors',
    url: 'https://feeds.macrumors.com/MacRumors-All',
    homepage: 'https://www.macrumors.com',
    category: 'apple',
    lang: 'en',
  },
  {
    id: 'apple-newsroom',
    name: 'Apple Newsroom',
    url: 'https://www.apple.com/newsroom/rss-feed.rss',
    homepage: 'https://www.apple.com/newsroom/',
    category: 'apple',
    lang: 'en',
  },

  // Google et Android
  {
    id: '9to5google',
    name: '9to5Google',
    url: 'https://9to5google.com/feed/',
    homepage: 'https://9to5google.com',
    category: 'google',
    lang: 'en',
  },
  {
    id: 'android-authority',
    name: 'Android Authority',
    url: 'https://www.androidauthority.com/feed/',
    homepage: 'https://www.androidauthority.com',
    category: 'google',
    lang: 'en',
  },
  {
    id: 'google-blog',
    name: 'Google Blog',
    url: 'https://blog.google/rss/',
    homepage: 'https://blog.google',
    category: 'google',
    lang: 'en',
  },

  // Samsung et mobile
  {
    id: 'sammobile',
    name: 'SamMobile',
    url: 'https://www.sammobile.com/feed/',
    homepage: 'https://www.sammobile.com',
    category: 'samsung',
    lang: 'en',
  },
  {
    id: 'samsung-newsroom',
    name: 'Samsung Newsroom',
    url: 'https://news.samsung.com/global/feed',
    homepage: 'https://news.samsung.com/global/',
    category: 'samsung',
    lang: 'en',
  },
  {
    id: 'frandroid',
    name: 'Frandroid',
    url: 'https://www.frandroid.com/feed',
    homepage: 'https://www.frandroid.com',
    category: 'mobile',
    lang: 'fr',
  },
  {
    id: 'phonandroid',
    name: 'Phonandroid',
    url: 'https://www.phonandroid.com/feed',
    homepage: 'https://www.phonandroid.com',
    category: 'mobile',
    lang: 'fr',
  },

  // Développement
  {
    id: 'github-blog',
    name: 'GitHub Blog',
    url: 'https://github.blog/feed/',
    homepage: 'https://github.blog',
    category: 'dev',
    lang: 'en',
  },
  {
    id: 'smashing',
    name: 'Smashing Magazine',
    url: 'https://www.smashingmagazine.com/feed/',
    homepage: 'https://www.smashingmagazine.com',
    category: 'dev',
    lang: 'en',
  },
  {
    id: 'stackoverflow',
    name: 'Stack Overflow Blog',
    url: 'https://stackoverflow.blog/feed/',
    homepage: 'https://stackoverflow.blog',
    category: 'dev',
    lang: 'en',
  },
  {
    id: 'chrome-dev',
    name: 'Chrome for Developers',
    url: 'https://developer.chrome.com/static/blog/feed.xml',
    homepage: 'https://developer.chrome.com/blog',
    category: 'dev',
    lang: 'en',
  },

  // Cloud et infrastructure
  {
    id: 'cloudflare',
    name: 'Cloudflare Blog',
    url: 'https://blog.cloudflare.com/rss/',
    homepage: 'https://blog.cloudflare.com',
    category: 'cloud',
    lang: 'en',
  },

  // Tech en Afrique
  {
    id: 'techcabal',
    name: 'TechCabal',
    url: 'https://techcabal.com/feed/',
    homepage: 'https://techcabal.com',
    category: 'afrique',
    lang: 'en',
  },
];

export const CHANNELS: ChannelSource[] = [
  // Dev et IA (anglais)
  {
    id: 'fireship',
    name: 'Fireship',
    channelId: 'UCsBjURrPoezykLs9EqgamOA',
    category: 'dev',
    lang: 'en',
  },
  {
    id: 'theo',
    name: 'Theo - t3.gg',
    channelId: 'UCbRP3c757lWg9M-U7TyEkXA',
    category: 'dev',
    lang: 'en',
  },
  {
    id: 'primeagen',
    name: 'ThePrimeTime',
    channelId: 'UCUyeluBRhGPCW4rPe_UvBZQ',
    category: 'dev',
    lang: 'en',
  },
  {
    id: 'bytebytego',
    name: 'ByteByteGo',
    channelId: 'UCZgt6AzoyjslHTC9dz0UoTw',
    category: 'dev',
    lang: 'en',
  },
  {
    id: 'webdevsimplified',
    name: 'Web Dev Simplified',
    channelId: 'UCFbNIlppjAuEX4znoulh0Cw',
    category: 'dev',
    lang: 'en',
  },
  {
    id: 'freecodecamp',
    name: 'freeCodeCamp.org',
    channelId: 'UC8butISFwT-Wl7EV0hUK0BQ',
    category: 'dev',
    lang: 'en',
  },
  {
    id: 'google-devs',
    name: 'Google for Developers',
    channelId: 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
    category: 'dev',
    lang: 'en',
  },
  {
    id: 'vscode',
    name: 'Visual Studio Code',
    channelId: 'UCs5Y5_7XK8HLDX0SLNwkd3w',
    category: 'dev',
    lang: 'en',
  },
  {
    id: 'github-yt',
    name: 'GitHub',
    channelId: 'UC7c3Kb6jYCRj4JOHHZTxKsQ',
    category: 'dev',
    lang: 'en',
  },
  {
    id: 'networkchuck',
    name: 'NetworkChuck',
    channelId: 'UC9x0AN7BWHpCDHSm9NiJFJQ',
    category: 'securite',
    lang: 'en',
  },
  {
    id: 'lowlevel',
    name: 'Low Level',
    channelId: 'UC6biysICWOJ-C3P4Tyeggzg',
    category: 'securite',
    lang: 'en',
  },
  {
    id: 'computerphile',
    name: 'Computerphile',
    channelId: 'UC9-y-6csu5WGm29I7JiwpnA',
    category: 'dev',
    lang: 'en',
  },
  {
    id: 'jeffgeerling',
    name: 'Jeff Geerling',
    channelId: 'UCR-DXc1voovS8nhAvccRZhg',
    category: 'cloud',
    lang: 'en',
  },
  {
    id: 'antonio',
    name: 'Code With Antonio',
    channelId: 'UCW_4e6sUTMWHxlF06aErH9w',
    category: 'dev',
    lang: 'en',
  },
  {
    id: 'techwithtim',
    name: 'Tech With Tim',
    channelId: 'UC4JX40jDee_tINbkjycV4Sg',
    category: 'dev',
    lang: 'en',
  },
  {
    id: 'nickchapsas',
    name: 'Nick Chapsas',
    channelId: 'UCrkPsvLGln62OMZRO6K-llg',
    category: 'dev',
    lang: 'en',
  },
  {
    id: 'joshtriedcoding',
    name: 'Josh tried coding',
    channelId: 'UCvGwM5woTl13I-qThI4YMCg',
    category: 'dev',
    lang: 'en',
  },
  // IA
  {
    id: 'anthropic-yt',
    name: 'Anthropic',
    channelId: 'UCrDwWp7EBBv4NwvScIpBDOA',
    category: 'ia',
    lang: 'en',
  },
  {
    id: 'openai-yt',
    name: 'OpenAI',
    channelId: 'UCXZCJLdBC09xxGZ6gcdrc6A',
    category: 'ia',
    lang: 'en',
  },
  {
    id: 'huggingface-yt',
    name: 'Hugging Face',
    channelId: 'UCHlNU7kIZhRgSbhHvFoy72w',
    category: 'ia',
    lang: 'en',
  },
  {
    id: 'twominutepapers',
    name: 'Two Minute Papers',
    channelId: 'UCbfYPyITQ-7l4upoX8nvctg',
    category: 'ia',
    lang: 'en',
  },
  {
    id: 'aiexplained',
    name: 'AI Explained',
    channelId: 'UCNJ1Ymd5yFuUPtn21xtRbbw',
    category: 'ia',
    lang: 'en',
  },
  // Tech grand public (Apple, Samsung, Google…)
  {
    id: 'mkbhd',
    name: 'Marques Brownlee',
    channelId: 'UCBJycsmduvYEL83R_U4JriQ',
    category: 'tech',
    lang: 'en',
  },
  {
    id: 'mrwhosetheboss',
    name: 'Mrwhosetheboss',
    channelId: 'UCMiJRAwDNSNzuYeN2uWa0pA',
    category: 'tech',
    lang: 'en',
  },
  {
    id: 'ltt',
    name: 'Linus Tech Tips',
    channelId: 'UCXuqSBlHAE6Xw-yeJA0Tunw',
    category: 'tech',
    lang: 'en',
  },
  {
    id: 'verge-yt',
    name: 'The Verge',
    channelId: 'UCddiUEpeqJcYeBxX1IVBKvQ',
    category: 'tech',
    lang: 'en',
  },
  {
    id: 'androidauthority-yt',
    name: 'Android Authority',
    channelId: 'UCgyqtNWZmIxTx3b6OxTSALw',
    category: 'google',
    lang: 'en',
  },
  {
    id: '9to5mac-yt',
    name: '9to5Mac',
    channelId: 'UChjRM_qQAaOAiLNbOGbYcRA',
    category: 'apple',
    lang: 'en',
  },
  // Francophones
  {
    id: 'grafikart',
    name: 'Grafikart',
    channelId: 'UCj_iGliGCkLcHSZ8eqVNPDQ',
    category: 'dev',
    lang: 'fr',
  },
  {
    id: 'micode',
    name: 'Micode',
    channelId: 'UCYnvxJ-PKiGXo_tYXpWAC-w',
    category: 'tech',
    lang: 'fr',
  },
  {
    id: 'underscore',
    name: 'Underscore_',
    channelId: 'UCWedHS9qKebauVIK2J7383g',
    category: 'tech',
    lang: 'fr',
  },
  {
    id: 'cocadmin',
    name: 'Cocadmin',
    channelId: 'UCVRJ6D343dX-x730MRP8tNw',
    category: 'cloud',
    lang: 'fr',
  },
  {
    id: 'benjamincode',
    name: 'Benjamin Code',
    channelId: 'UCLOAPb7ATQUs_nDs9ViLcMw',
    category: 'dev',
    lang: 'fr',
  },
  {
    id: 'melvynx',
    name: 'Melvynx',
    channelId: 'UC5HDIVwuqoIuKKw-WbQ4CvA',
    category: 'dev',
    lang: 'fr',
  },
];

/** Dépôts suivis pour le radar des nouvelles versions (GitHub Releases). */
export const RELEASE_REPOS = [
  'facebook/react',
  'vercel/next.js',
  'nodejs/node',
  'denoland/deno',
  'oven-sh/bun',
  'microsoft/TypeScript',
  'vitejs/vite',
  'tailwindlabs/tailwindcss',
  'vuejs/core',
  'sveltejs/svelte',
  'flutter/flutter',
  'JetBrains/kotlin',
  'laravel/framework',
  'django/django',
  'fastapi/fastapi',
  'prisma/prisma',
  'supabase/supabase',
  'docker/compose',
  'kubernetes/kubernetes',
  'rust-lang/rust',
  'microsoft/vscode',
  'anthropics/claude-code',
  'openai/codex',
  'ollama/ollama',
];

/**
 * Offres d'emploi publiées par les entreprises elles-mêmes, via l'API publique de leur outil de
 * recrutement (Greenhouse, Ashby). Aucune clé, aucun scraping.
 */
export interface JobBoard {
  id: string;
  name: string;
  ats: 'greenhouse' | 'ashby';
  slug: string;
  africa?: boolean;
}

export const JOB_BOARDS: JobBoard[] = [
  { id: 'jumia', name: 'Jumia', ats: 'greenhouse', slug: 'jumia', africa: true },
  { id: 'moniepoint', name: 'Moniepoint', ats: 'greenhouse', slug: 'moniepoint', africa: true },
  { id: 'andela', name: 'Andela', ats: 'ashby', slug: 'andela', africa: true },
  { id: 'cloudflare', name: 'Cloudflare', ats: 'greenhouse', slug: 'cloudflare' },
  { id: 'gitlab', name: 'GitLab', ats: 'greenhouse', slug: 'gitlab' },
  { id: 'datadog', name: 'Datadog', ats: 'greenhouse', slug: 'datadog' },
  { id: 'vercel', name: 'Vercel', ats: 'greenhouse', slug: 'vercel' },
  { id: 'elastic', name: 'Elastic', ats: 'greenhouse', slug: 'elastic' },
  { id: 'mongodb', name: 'MongoDB', ats: 'greenhouse', slug: 'mongodb' },
  { id: 'anthropic', name: 'Anthropic', ats: 'greenhouse', slug: 'anthropic' },
  { id: 'stripe', name: 'Stripe', ats: 'greenhouse', slug: 'stripe' },
  { id: 'twilio', name: 'Twilio', ats: 'greenhouse', slug: 'twilio' },
  { id: 'linear', name: 'Linear', ats: 'ashby', slug: 'linear' },
];

/** Annonces officielles de nouvelles certifications et formations (blogs des éditeurs). */
export const CERT_FEEDS: FeedSource[] = [
  {
    id: 'aws-training',
    name: 'AWS Training and Certification',
    url: 'https://aws.amazon.com/blogs/training-and-certification/feed/',
    homepage: 'https://aws.amazon.com/blogs/training-and-certification/',
    category: 'cloud',
    lang: 'en',
  },
  {
    id: 'cisco-learning',
    name: 'Cisco Learning',
    url: 'https://blogs.cisco.com/learning/feed',
    homepage: 'https://blogs.cisco.com/learning',
    category: 'cloud',
    lang: 'en',
  },
  {
    id: 'linux-foundation-training',
    name: 'Linux Foundation Training',
    url: 'https://training.linuxfoundation.org/feed/',
    homepage: 'https://training.linuxfoundation.org',
    category: 'cloud',
    lang: 'en',
  },
];

export const CATEGORY_LABEL: Record<Category, string> = {
  ia: 'Intelligence artificielle',
  tech: 'Tech',
  apple: 'Apple',
  google: 'Google et Android',
  samsung: 'Samsung',
  mobile: 'Mobile',
  dev: 'Développement',
  afrique: 'Tech en Afrique',
  cloud: 'Cloud et infra',
  securite: 'Sécurité',
};
