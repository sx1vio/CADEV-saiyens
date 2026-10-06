/**
 * Jeu de données de démonstration.
 * Règle du CDC (§6.6, §13) : tous ces comptes sont marqués « Démo » partout où ils apparaissent,
 * et leurs chiffres ne sont jamais présentés comme réels.
 * Les actions sont rejouées par le moteur : les Proof XP sont calculés par les mêmes règles que pour un vrai membre.
 */
import { countryByCode } from '@/lib/geo'
import { uuid } from '@/lib/utils'
import type { Lang, LookingFor, Tag, User } from '../types'
import { Engine, emptyState, type State } from './engine'

const TAGS: [string, string][] = [
  ['javascript', 'JavaScript'], ['typescript', 'TypeScript'], ['react', 'React'], ['nextjs', 'Next.js'], ['vue', 'Vue'],
  ['react-native', 'React Native'], ['nodejs', 'Node.js'], ['express', 'Express'], ['nestjs', 'NestJS'], ['python', 'Python'],
  ['django', 'Django'], ['fastapi', 'FastAPI'], ['php', 'PHP'], ['laravel', 'Laravel'], ['java', 'Java'], ['spring', 'Spring'],
  ['kotlin', 'Kotlin'], ['android', 'Android'], ['flutter', 'Flutter'], ['dart', 'Dart'], ['swift', 'Swift'], ['ios', 'iOS'],
  ['go', 'Go'], ['rust', 'Rust'], ['postgresql', 'PostgreSQL'], ['mysql', 'MySQL'], ['mongodb', 'MongoDB'], ['redis', 'Redis'],
  ['sql', 'SQL'], ['prisma', 'Prisma'], ['supabase', 'Supabase'], ['firebase', 'Firebase'], ['docker', 'Docker'], ['nginx', 'nginx'],
  ['kubernetes', 'Kubernetes'], ['linux', 'Linux'], ['git', 'Git'], ['ci-cd', 'CI/CD'], ['aws', 'AWS'], ['graphql', 'GraphQL'],
  ['http', 'HTTP & API'], ['websocket', 'WebSocket'], ['pwa', 'PWA'], ['tailwind', 'Tailwind CSS'], ['css', 'CSS'],
  ['security', 'Sécurité'], ['mobile-money', 'Mobile money'], ['ussd-sms', 'USSD & SMS'], ['ml', 'Machine learning'], ['ux', 'UX design'],
]

interface DevSeed {
  handle: string
  name: string
  country: string
  city: string
  langs: Lang[]
  bio: string
  /** [slug, dépôts qualifiés] */
  repos: [string, number][]
  status: User['availability']['status']
  slots: string[]
  mission?: boolean
  looking: LookingFor[]
  canHelp?: string[]
  learn?: string[]
  ghYears: number
  admin?: boolean
}

const DEVS: DevSeed[] = [
  { handle: 'awa-kone', name: 'Awa Koné', country: 'CI', city: 'Abidjan', langs: ['fr', 'en'], bio: "Dev full-stack JS chez une fintech d'Abidjan. J'apprends Docker en ce moment.", repos: [['react', 5], ['typescript', 4], ['nodejs', 3], ['docker', 1]], status: 'now', slots: ['Lun-Ven 19h-23h'], looking: ['help', 'project'], learn: ['docker', 'nginx'], ghYears: 3 },
  { handle: 'moussa-diop', name: 'Moussa Diop', country: 'SN', city: 'Dakar', langs: ['fr', 'en'], bio: "SRE le jour, mentor le soir. Docker, nginx et PostgreSQL n'ont plus de secrets pour moi (ou presque).", repos: [['docker', 7], ['nginx', 5], ['nodejs', 6], ['postgresql', 4], ['linux', 6]], status: 'now', slots: ['Tous les soirs 20h-23h'], mission: true, looking: ['helping', 'team'], canHelp: ['docker', 'nginx', 'postgresql'], ghYears: 7 },
  { handle: 'kwame-dev', name: 'Kwame Asante', country: 'GH', city: 'Accra', langs: ['en'], bio: 'Backend & infra. Go, Kubernetes and a lot of coffee. Happy to help in English.', repos: [['go', 8], ['docker', 6], ['kubernetes', 5], ['nginx', 4], ['postgresql', 3]], status: 'today', slots: ['Mon-Fri 18:00-22:00'], mission: true, looking: ['helping'], canHelp: ['go', 'kubernetes', 'docker'], ghYears: 6 },
  { handle: 'chiamaka-o', name: 'Chiamaka Okafor', country: 'NG', city: 'Lagos', langs: ['en'], bio: 'Mobile engineer. React Native, Expo and Firebase. Building a savings app for tontines.', repos: [['react-native', 6], ['typescript', 5], ['firebase', 4], ['react', 4]], status: 'now', slots: ['Weekends'], looking: ['team', 'helping'], canHelp: ['react-native', 'firebase'], ghYears: 5 },
  { handle: 'yao-mensah', name: 'Yao Mensah', country: 'TG', city: 'Lomé', langs: ['fr'], bio: 'Laravel depuis la v5. Je construis des outils pour les commerçants de Lomé.', repos: [['laravel', 6], ['php', 7], ['mysql', 5], ['vue', 2]], status: 'today', slots: ['Mar, Jeu 20h-22h'], looking: ['team', 'helping'], canHelp: ['laravel', 'php', 'mysql'], ghYears: 6 },
  { handle: 'fatou-nd', name: 'Fatou Ndiaye', country: 'SN', city: 'Saint-Louis', langs: ['fr', 'en'], bio: 'Python, Django et FastAPI. Je travaille sur la santé numérique et les rendez-vous par SMS.', repos: [['python', 8], ['django', 5], ['fastapi', 3], ['postgresql', 4], ['ussd-sms', 2]], status: 'now', slots: ['Lun-Sam 9h-12h'], mission: true, looking: ['helping', 'team'], canHelp: ['django', 'python'], ghYears: 5 },
  { handle: 'je-hounkpatin', name: 'Jean-Eudes Hounkpatin', country: 'BJ', city: 'Cotonou', langs: ['fr'], bio: 'Flutter et Dart. Je fais des apps qui marchent même quand le réseau ne marche pas.', repos: [['flutter', 6], ['dart', 6], ['firebase', 3]], status: 'today', slots: ['Soirs et week-ends'], looking: ['team', 'help'], learn: ['nodejs'], ghYears: 4 },
  { handle: 'amina-bello', name: 'Amina Bello', country: 'NG', city: 'Abuja', langs: ['en'], bio: 'ML engineer. Weather and crop models for smallholder farmers.', repos: [['python', 9], ['ml', 6], ['fastapi', 2]], status: 'busy', slots: ['Sat 10:00-13:00'], looking: ['team'], canHelp: ['ml', 'python'], ghYears: 6 },
  { handle: 'ibra-traore', name: 'Ibrahim Traoré', country: 'ML', city: 'Bamako', langs: ['fr'], bio: 'Android natif (Kotlin) et Spring Boot. Ancien prof de maths.', repos: [['kotlin', 5], ['android', 5], ['java', 6], ['spring', 3]], status: 'today', slots: ['Lun-Ven 21h-23h'], looking: ['helping'], canHelp: ['android', 'kotlin'], ghYears: 5 },
  { handle: 'nadia-benali', name: 'Nadia Benali', country: 'MA', city: 'Casablanca', langs: ['fr', 'en'], bio: 'Vue, Node et MongoDB. Lead front dans une startup de logistique.', repos: [['vue', 6], ['nodejs', 5], ['mongodb', 4], ['javascript', 7]], status: 'now', slots: ['Lun-Ven 18h-21h'], looking: ['helping', 'project'], ghYears: 8 },
  { handle: 'sam-mwangi', name: 'Samuel Mwangi', country: 'KE', city: 'Nairobi', langs: ['en'], bio: 'Payments engineer. M-Pesa, Go and PostgreSQL. Idempotency is my love language.', repos: [['go', 6], ['postgresql', 5], ['mobile-money', 4], ['http', 4]], status: 'today', slots: ['Mon-Thu 19:00-22:00'], mission: true, looking: ['helping'], canHelp: ['mobile-money', 'go'], ghYears: 7 },
  { handle: 'grace-uwase', name: 'Grace Uwase', country: 'RW', city: 'Kigali', langs: ['en', 'fr'], bio: 'Front-end engineer. React, Next.js and accessible design systems.', repos: [['react', 6], ['nextjs', 4], ['tailwind', 4], ['typescript', 5]], status: 'now', slots: ['Weekdays 17:00-20:00'], looking: ['helping', 'team'], canHelp: ['react', 'nextjs'], ghYears: 4 },
  { handle: 'cedric-nk', name: 'Cédric Nkoulou', country: 'CM', city: 'Douala', langs: ['fr', 'en'], bio: 'Dev Android, passionné de performances sur téléphones à 2 Go de RAM.', repos: [['kotlin', 4], ['android', 4]], status: 'today', slots: ['Soirs'], looking: ['project'], learn: ['flutter'], ghYears: 3 },
  { handle: 'thandi-d', name: 'Thandiwe Dlamini', country: 'ZA', city: 'Johannesburg', langs: ['en'], bio: 'Platform engineer. AWS, Kubernetes, CI/CD. I like boring, reliable infra.', repos: [['aws', 6], ['kubernetes', 5], ['ci-cd', 5], ['docker', 5]], status: 'busy', slots: ['Fri 18:00-20:00'], looking: ['helping'], canHelp: ['ci-cd', 'aws'], ghYears: 9 },
  { handle: 'ousmane-sow', name: 'Ousmane Sow', country: 'SN', city: 'Dakar', langs: ['fr'], bio: "J'intègre Wave, Orange Money et Free Money pour des marchands. Je construis PayLink.", repos: [['nodejs', 6], ['nestjs', 4], ['typescript', 5], ['mobile-money', 5]], status: 'now', slots: ['Lun-Ven 20h-23h'], looking: ['team'], canHelp: ['mobile-money', 'nestjs'], ghYears: 6 },
  { handle: 'esi-owusu', name: 'Esi Owusu', country: 'GH', city: 'Kumasi', langs: ['en'], bio: 'Product designer who codes. CSS, React and usability tests in the field.', repos: [['css', 5], ['react', 3], ['ux', 4]], status: 'today', slots: ['Weekends'], looking: ['team', 'project'], ghYears: 4 },
  { handle: 'koffi-ag', name: 'Koffi Agbeko', country: 'TG', city: 'Lomé', langs: ['fr', 'en'], bio: 'Rust et Go. Je contribue à des outils CLI open source.', repos: [['rust', 5], ['go', 4], ['linux', 4]], status: 'today', slots: ['Mer, Sam'], looking: ['helping', 'project'], ghYears: 5 },
  { handle: 'aicha-sanogo', name: 'Aïcha Sanogo', country: 'BF', city: 'Ouagadougou', langs: ['fr'], bio: "Data analyst devenue dev Python. J'aime les données propres et les SQL lisibles.", repos: [['python', 4], ['sql', 4], ['postgresql', 2]], status: 'now', slots: ['Lun-Ven 18h-21h'], looking: ['help', 'helping'], learn: ['fastapi'], ghYears: 2 },
  { handle: 'pat-kabongo', name: 'Patrick Kabongo', country: 'CD', city: 'Kinshasa', langs: ['fr'], bio: 'PHP/Laravel et Vue. Je forme des juniors à Kinshasa.', repos: [['php', 5], ['laravel', 4], ['vue', 3]], status: 'today', slots: ['Mar-Jeu 19h-21h'], looking: ['helping'], ghYears: 6 },
  { handle: 'mariam-k', name: 'Mariam Kouyaté', country: 'GN', city: 'Conakry', langs: ['fr'], bio: "PWA, service workers et IndexedDB : je fais des apps qui tiennent sans réseau.", repos: [['pwa', 4], ['javascript', 6], ['typescript', 3]], status: 'now', slots: ['Soirs'], looking: ['helping', 'team'], canHelp: ['pwa'], ghYears: 4 },
  { handle: 'devhub-admin', name: 'Équipe DevHub', country: 'BJ', city: 'Cotonou', langs: ['fr', 'en'], bio: 'Compte de modération de la plateforme.', repos: [], status: 'busy', slots: [], looking: [], ghYears: 1, admin: true },
]

const M = 60_000
const H = 60 * M
const D = 24 * H

export function buildSeed(now = Date.now()): State {
  const s = emptyState()
  const e = new Engine(s)
  const tagId: Record<string, string> = {}
  s.tags = TAGS.map(([slug, label]): Tag => {
    const id = uuid()
    tagId[slug] = id
    return { id, slug, label }
  })
  const T = (...slugs: string[]) => slugs.map((x) => tagId[x])

  const uid: Record<string, string> = {}
  DEVS.forEach((d, i) => {
    const c = countryByCode(d.country)!
    const id = uuid()
    uid[d.handle] = id
    s.users.push({
      id,
      githubId: 9_000_000 + i,
      handle: d.handle,
      displayName: d.name,
      avatarUrl: null,
      country: d.country,
      city: d.city,
      timezone: c.tz,
      utcOffset: c.utc,
      languages: d.langs,
      availability: { status: d.status, slots: d.slots, forMission: !!d.mission },
      lookingFor: d.looking,
      canHelpWith: T(...(d.canHelp ?? [])),
      wantsToLearn: T(...(d.learn ?? [])),
      bio: d.bio,
      lastSeenAt: new Date(now - (i % 5) * H).toISOString(),
      createdAt: new Date(now - (210 - i * 3) * D).toISOString(),
      githubCreatedAt: new Date(now - d.ghYears * 365 * D).toISOString(),
      isAdmin: !!d.admin,
      isDemo: true,
      isFounder: true,
      emailVerified: true,
      codeOfConductAcceptedAt: new Date(now - (210 - i * 3) * D).toISOString(),
    })
    for (const [slug, n] of d.repos) e.setGithubSkill(id, tagId[slug], n)
  })
  const U = (h: string) => uid[h]

  /* ------------ Questions SOS Dev, rejouées dans le temps ------------ */
  type QA = {
    by: string
    ago: number
    title: string
    body: string
    tried?: string
    env?: string
    code: string
    lang: string
    tags: string[]
    urgency?: 'low' | 'normal' | 'high'
    answers?: { by: string; after: number; body: string; accepted?: boolean; votes?: string[] }[]
  }

  const QUESTIONS: QA[] = [
    {
      by: 'awa-kone', ago: 21 * D, title: 'nginx renvoie 502 Bad Gateway devant mon API Node dans Docker Compose',
      body: "Mon API Express répond bien sur `localhost:3000` quand je la lance hors Docker. Dans Compose, nginx renvoie systématiquement 502. Je veux exposer l'API derrière nginx sur le port 80.",
      tried: "J'ai vérifié que le conteneur api tourne (`docker ps`) et relancé nginx plusieurs fois.",
      env: 'Docker 27.1, nginx 1.27, Node 20.11', lang: 'nginx', tags: ['docker', 'nginx', 'nodejs'], urgency: 'high',
      code: "server {\n  listen 80;\n  location / {\n    proxy_pass http://localhost:3000;\n  }\n}",
      answers: [
        { by: 'moussa-diop', after: 6 * M, accepted: true, votes: ['kwame-dev', 'nadia-benali', 'grace-uwase'],
          body: "Dans le conteneur nginx, `localhost` désigne **nginx lui-même**, pas ton API. Utilise le nom du service Compose :\n\n```nginx\nlocation / {\n  proxy_pass http://api:3000;\n  proxy_set_header Host $host;\n}\n```\n\nEt vérifie qu'Express écoute sur `0.0.0.0` : `app.listen(3000, '0.0.0.0')`. Si ça ne passe toujours pas, `docker compose logs api` te dira si l'app a planté au démarrage." },
        { by: 'kwame-dev', after: 14 * M, votes: ['moussa-diop'], body: "Agree with Moussa. Also add a `depends_on: [api]` with a healthcheck so nginx doesn't start before the API is ready — you'll get 502s for the first seconds otherwise." },
      ],
    },
    {
      by: 'aicha-sanogo', ago: 18 * D, title: 'ModuleNotFoundError: No module named "psycopg2" alors que je l\'ai installé',
      body: "Je lance mon script d'import de données et Python ne trouve pas psycopg2, pourtant `pip install psycopg2-binary` a réussi.",
      tried: "J'ai réinstallé deux fois et redémarré VS Code.", env: 'Python 3.12, Ubuntu 22.04 (WSL)',
      lang: 'python', tags: ['python', 'postgresql'], urgency: 'normal',
      code: 'Traceback (most recent call last):\n  File "import_ventes.py", line 2, in <module>\n    import psycopg2\nModuleNotFoundError: No module named \'psycopg2\'',
      answers: [
        { by: 'fatou-nd', after: 11 * M, accepted: true, votes: ['awa-kone', 'pat-kabongo'],
          body: "Ton `pip` et ton `python` ne sont sûrement pas le même interpréteur. Installe avec le Python qui exécute le script :\n\n```bash\npython -m pip install psycopg2-binary\npython import_ventes.py\n```\n\nDans VS Code, vérifie aussi l'interpréteur choisi en bas à droite : il doit pointer vers ton `.venv`." },
      ],
    },
    {
      by: 'je-hounkpatin', ago: 15 * D, title: 'Webhook Kkiapay jamais reçu en local alors que le paiement passe',
      body: "Le paiement de test est validé côté Kkiapay mais mon endpoint `/webhooks/kkiapay` n'est jamais appelé. Mon serveur tourne en local sur le port 8000.",
      env: 'Flutter 3.24, backend FastAPI 0.115', lang: 'python', tags: ['mobile-money', 'fastapi', 'http'], urgency: 'high',
      code: '@app.post("/webhooks/kkiapay")\nasync def kkiapay_webhook(request: Request):\n    payload = await request.json()\n    print(payload)\n    return {"ok": True}',
      answers: [
        { by: 'ousmane-sow', after: 9 * M, accepted: true, votes: ['sam-mwangi', 'awa-kone'],
          body: "Kkiapay ne peut pas appeler `localhost`. Expose ton serveur avec un tunnel HTTPS (cloudflared ou ngrok) et mets cette URL publique dans le tableau de bord **sandbox** :\n\n```bash\ncloudflared tunnel --url http://localhost:8000\n```\n\nEnsuite vérifie la signature avec la clé secrète **sandbox**, et rends le traitement idempotent : le même événement peut arriver deux fois." },
        { by: 'sam-mwangi', after: 25 * M, votes: ['ousmane-sow'], body: 'Same pattern with M-Pesa callbacks. Store the transaction reference with a unique constraint and return 200 quickly, then process in a background job.' },
      ],
    },
    {
      by: 'cedric-nk', ago: 13 * D, title: "L'app Android plante au démarrage sur les téléphones 2 Go (OutOfMemoryError)",
      body: "Sur un Tecno avec 2 Go de RAM, l'app plante dès l'écran d'accueil qui affiche une liste de produits avec images.",
      env: 'Kotlin 2.0, minSdk 24, Coil 2.6', lang: 'kotlin', tags: ['android', 'kotlin'], urgency: 'normal',
      code: 'java.lang.OutOfMemoryError: Failed to allocate a 33177612 byte allocation with 16777216 free bytes\n  at android.graphics.BitmapFactory.decodeStream',
      answers: [
        { by: 'ibra-traore', after: 32 * M, accepted: true, votes: ['cedric-nk'],
          body: "Tes images sont décodées en pleine résolution. Demande à Coil la taille réelle de la vue :\n\n```kotlin\nAsyncImage(\n  model = ImageRequest.Builder(context)\n    .data(url)\n    .size(300, 300)\n    .build(),\n  contentDescription = null,\n)\n```\n\nEt côté serveur, sers des miniatures (300 px suffisent pour une liste)." },
      ],
    },
    {
      by: 'grace-uwase', ago: 11 * D, title: 'Hydration failed: le texte du serveur ne correspond pas au client (Next.js 15)',
      body: 'I display "il y a 3 min" next to each post and Next throws a hydration error in production only.',
      env: 'Next.js 15.1, React 19', lang: 'tsx', tags: ['nextjs', 'react'], urgency: 'low',
      code: "export function TimeAgo({ date }: { date: string }) {\n  return <span>{formatDistanceToNow(new Date(date))}</span>\n}",
      answers: [
        { by: 'nadia-benali', after: 18 * M, accepted: true, votes: ['grace-uwase', 'esi-owusu'],
          body: "Le serveur et le client calculent l'heure à des instants différents. Rends la date relative seulement côté client :\n\n```tsx\n'use client'\nexport function TimeAgo({ date }: { date: string }) {\n  const [text, setText] = useState<string | null>(null)\n  useEffect(() => setText(formatDistanceToNow(new Date(date))), [date])\n  return <time dateTime={date}>{text ?? new Date(date).toLocaleDateString()}</time>\n}\n```" },
      ],
    },
    {
      by: 'pat-kabongo', ago: 9 * D, title: 'Laravel : SQLSTATE[HY000] [2002] Connection refused avec Sail',
      body: "Mes migrations échouent dans Sail alors que la base MySQL tourne bien dans son conteneur.",
      env: 'Laravel 11, Sail, MySQL 8', lang: 'bash', tags: ['laravel', 'mysql', 'docker'], urgency: 'normal',
      code: 'SQLSTATE[HY000] [2002] Connection refused (SQL: select * from information_schema.tables where table_schema = laravel)',
      answers: [
        { by: 'yao-mensah', after: 7 * M, accepted: true, votes: ['pat-kabongo', 'moussa-diop'],
          body: "Dans `.env`, mets `DB_HOST=mysql` (le nom du service Sail) et non `127.0.0.1`. Puis lance les migrations **dans** Sail :\n\n```bash\n./vendor/bin/sail artisan migrate\n```" },
      ],
    },
    {
      by: 'chiamaka-o', ago: 7 * D, title: 'Firestore offline persistence duplicates writes after reconnect',
      body: 'When users add a contribution offline in our tontine app, we sometimes get two documents after the network comes back.',
      env: 'Expo SDK 52, Firebase JS SDK 11', lang: 'ts', tags: ['react-native', 'firebase'], urgency: 'high',
      code: "await addDoc(collection(db, 'contributions'), { groupId, amount, userId, createdAt: serverTimestamp() })",
      answers: [
        { by: 'mariam-k', after: 13 * M, accepted: true, votes: ['chiamaka-o', 'je-hounkpatin'],
          body: "`addDoc` génère un nouvel id à chaque appel ; si ton code relance l'action (retry ou double tap), tu obtiens deux documents. Génère l'identifiant **côté client** une seule fois et utilise `setDoc` : la seconde écriture devient idempotente.\n\n```ts\nconst id = crypto.randomUUID()\nawait setDoc(doc(db, 'contributions', id), { groupId, amount, userId })\n```" },
      ],
    },
    {
      by: 'koffi-ag', ago: 5 * D, title: 'Rust : borrow checker E0502 en modifiant un HashMap pendant une itération',
      body: "Je veux incrémenter un compteur pour chaque clé voisine pendant que je parcours la map.",
      env: 'rustc 1.82', lang: 'rust', tags: ['rust'], urgency: 'low',
      code: 'error[E0502]: cannot borrow `counts` as mutable because it is also borrowed as immutable',
      answers: [
        { by: 'kwame-dev', after: 41 * M, accepted: true, votes: ['koffi-ag'],
          body: "Collect the keys first, then mutate:\n\n```rust\nlet keys: Vec<_> = counts.keys().cloned().collect();\nfor k in keys {\n    *counts.entry(neighbour(&k)).or_insert(0) += 1;\n}\n```" },
      ],
    },
    {
      by: 'awa-kone', ago: 3 * D, title: 'Prisma : P2002 Unique constraint failed sur un webhook Wave rejoué',
      body: "Wave rejoue parfois le même webhook et mon `create` explose avec P2002. Comment rendre ça propre ?",
      env: 'Prisma 5.22, PostgreSQL 16, NestJS 10', lang: 'ts', tags: ['prisma', 'mobile-money', 'nestjs'], urgency: 'normal',
      code: "await prisma.payment.create({ data: { waveId: event.id, amount: event.amount, status: 'paid' } })",
      answers: [
        { by: 'sam-mwangi', after: 12 * M, accepted: true, votes: ['awa-kone', 'ousmane-sow'],
          body: "Treat the provider event id as an idempotency key and use `upsert`:\n\n```ts\nawait prisma.payment.upsert({\n  where: { waveId: event.id },\n  update: {},\n  create: { waveId: event.id, amount: event.amount, status: 'paid' },\n})\n```\nReturn 200 even when it already exists — the provider only needs to know you received it." },
        { by: 'ousmane-sow', after: 20 * M, votes: ['awa-kone'], body: "Et pense à vérifier la signature `Wave-Signature` avant tout traitement, sinon n'importe qui peut marquer un paiement comme payé." },
      ],
    },
    {
      by: 'je-hounkpatin', ago: 2 * D, title: 'Flutter : comment détecter le retour du réseau pour relancer une file de requêtes ?',
      body: "Je stocke les actions hors ligne dans Hive. Je veux les renvoyer automatiquement quand le réseau revient.",
      env: 'Flutter 3.24, connectivity_plus 6', lang: 'dart', tags: ['flutter', 'dart'], urgency: 'normal',
      code: "Connectivity().onConnectivityChanged.listen((results) {\n  // ??? \n});",
      answers: [
        { by: 'mariam-k', after: 22 * M, votes: ['je-hounkpatin'],
          body: "Attention : `connectivity_plus` te dit qu'il y a une interface (Wi-Fi, données), pas qu'Internet répond. Au changement, fais un petit `HEAD` vers ton API avant de vider la file, et vide-la **dans l'ordre**, en t'arrêtant à la première erreur réseau." },
      ],
    },
    {
      by: 'nadia-benali', ago: 30 * H, title: 'MongoDB : requête lente sur un filtre par date et statut (COLLSCAN)',
      body: "La liste des livraisons met 4 secondes à charger depuis qu'on a passé 2 millions de documents.",
      env: 'MongoDB 7, Mongoose 8', lang: 'js', tags: ['mongodb', 'nodejs'], urgency: 'normal',
      code: "Delivery.find({ status: 'pending', createdAt: { $gte: since } }).sort({ createdAt: -1 }).limit(50)",
    },
    {
      by: 'aicha-sanogo', ago: 20 * H, title: 'FastAPI : comment valider un numéro de téléphone africain avec Pydantic v2 ?',
      body: "Je veux accepter les formats +225, +221, +229… et refuser le reste, avec un message d'erreur clair en français.",
      env: 'FastAPI 0.115, Pydantic 2.9', lang: 'python', tags: ['fastapi', 'python'], urgency: 'low',
      code: 'class Inscription(BaseModel):\n    telephone: str',
    },
    {
      by: 'cedric-nk', ago: 9 * H, title: 'GitHub Actions : le build Gradle dépasse le temps limite à chaque PR',
      body: "Notre workflow Android prend 25 minutes et finit souvent en timeout. Comment mettre le cache Gradle correctement ?",
      env: 'actions/setup-java@v4, Gradle 8.9', lang: 'yaml', tags: ['ci-cd', 'android'], urgency: 'normal',
      code: "- uses: actions/setup-java@v4\n  with:\n    distribution: temurin\n    java-version: 17\n- run: ./gradlew assembleDebug",
    },
    {
      by: 'esi-owusu', ago: 4 * H, title: 'CSS: sticky header jumps on mobile Safari when the keyboard opens',
      body: 'Our signup form has a sticky header that jumps half off-screen when the iOS keyboard appears.',
      env: 'iOS 18 Safari', lang: 'css', tags: ['css', 'ux'], urgency: 'low',
      code: 'header { position: sticky; top: 0; height: 64px; }\nmain { height: 100vh; overflow: auto; }',
    },
    {
      by: 'yao-mensah', ago: 95 * M, title: 'Laravel Queue : les jobs restent bloqués en "processing" après un redémarrage du serveur',
      body: "Après chaque redémarrage du VPS, quelques jobs d'envoi de SMS ne repartent jamais.",
      env: 'Laravel 11, Redis 7, Supervisor', lang: 'php', tags: ['laravel', 'redis', 'ussd-sms'], urgency: 'high',
      code: "php artisan queue:work redis --tries=3 --timeout=60",
    },
    {
      by: 'chiamaka-o', ago: 38 * M, title: 'Expo: push notifications not received on Android 14 release builds',
      body: 'Works in Expo Go and dev builds, nothing arrives in the production APK.',
      env: 'Expo SDK 52, expo-notifications 0.29', lang: 'ts', tags: ['react-native', 'firebase'], urgency: 'high',
      code: "const token = await Notifications.getExpoPushTokenAsync({ projectId })",
    },
  ]

  for (const q of QUESTIONS) {
    const t0 = now - q.ago
    const question = e.createQuestion(
      U(q.by),
      { title: q.title, body: q.body, tried: q.tried, environment: q.env, codeSnippet: q.code, codeLang: q.lang, urgency: q.urgency ?? 'normal', tagIds: T(...q.tags) },
      uuid(),
      t0,
    )
    e.computeHint(question.id)
    for (const a of q.answers ?? []) {
      const at = t0 + a.after
      e.claim(question.id, U(a.by), at - 2 * M)
      const ans = e.answer(question.id, U(a.by), a.body, uuid(), at)
      for (const v of a.votes ?? []) e.vote(ans.id, U(v), at + 30 * M)
      if (a.accepted) e.accept(ans.id, U(q.by), at + 20 * M)
    }
  }


  /* ------------ Historique : questions résolues plus anciennes (6 mois) ------------ */
  type H = [by: string, helper: string, days: number, title: string, tags: string[], lang: string, code: string, answer: string, minutes: number]
  const HISTORY: H[] = [
    ['aicha-sanogo', 'fatou-nd', 170, "Django : « CSRF verification failed » sur un formulaire envoyé en fetch", ['django', 'python'], 'js', "fetch('/api/vote/', { method: 'POST', body: data })", "Ajoute l'en-tête `X-CSRFToken` lu depuis le cookie `csrftoken`, et `credentials: 'same-origin'` dans fetch.", 9],
    ['cedric-nk', 'ibra-traore', 162, 'Room (Android) : migration qui plante après ajout d’une colonne', ['android', 'kotlin'], 'kotlin', 'java.lang.IllegalStateException: Room cannot verify the data integrity', "Incrémente `version` dans `@Database` et fournis une `Migration(1, 2)` avec `ALTER TABLE … ADD COLUMN … DEFAULT …`. Évite `fallbackToDestructiveMigration` en production.", 14],
    ['awa-kone', 'grace-uwase', 150, 'React : useEffect qui s’exécute deux fois en développement', ['react'], 'tsx', 'useEffect(() => { fetchOrders() }, [])', "C'est StrictMode en dev : il monte, démonte puis remonte. Rends l'effet idempotent et annule la requête dans le cleanup avec un AbortController.", 6],
    ['je-hounkpatin', 'chiamaka-o', 141, 'Firebase Auth : la session se perd au redémarrage de l’app', ['firebase', 'flutter'], 'dart', 'await FirebaseAuth.instance.signInWithEmailAndPassword(...)', "La persistance est automatique sur mobile : vérifie que tu n'appelles pas `signOut()` dans ton `initState`, et écoute `authStateChanges()` au lieu de lire `currentUser` trop tôt.", 22],
    ['pat-kabongo', 'yao-mensah', 133, 'Laravel : erreur 419 Page Expired après déploiement derrière un proxy', ['laravel', 'php', 'nginx'], 'php', 'TrustProxies', "Configure `TrustProxies` (`protected $proxies = '*'`) et `SESSION_SECURE_COOKIE=true` : le cookie de session était refusé en HTTPS derrière le proxy.", 11],
    ['nadia-benali', 'moussa-diop', 126, 'Docker : l’image Node fait 1,2 Go, comment la réduire ?', ['docker', 'nodejs'], 'dockerfile', 'FROM node:20\nCOPY . .\nRUN npm install', "Build multi-étapes : installe et compile dans `node:20`, puis copie seulement `dist` et `node_modules --omit=dev` dans `node:20-alpine`. Ajoute un `.dockerignore`. Tu passes sous 200 Mo.", 8],
    ['aicha-sanogo', 'fatou-nd', 118, 'Pandas : lire un CSV en UTF-8 avec des accents cassés', ['python'], 'python', "pd.read_csv('ventes.csv')", "Le fichier vient d'Excel en Windows-1252 : `pd.read_csv('ventes.csv', encoding='cp1252')`, puis réécris-le en UTF-8.", 5],
    ['esi-owusu', 'grace-uwase', 110, 'Tailwind classes not applied in production build', ['tailwind', 'react'], 'js', "content: ['./src/**/*.js']", 'Your `content` globs miss `.tsx` files, so the classes are purged. Use `./src/**/*.{js,ts,jsx,tsx}`.', 12],
    ['cedric-nk', 'thandi-d', 104, 'GitHub Actions : secret vide dans un workflow déclenché par une PR de fork', ['ci-cd', 'security'], 'yaml', 'on: pull_request', 'Secrets are never exposed to fork PRs on `pull_request`, by design. Run the deploy only on `push` to main, or use a manual approval environment.', 17],
    ['awa-kone', 'nadia-benali', 97, 'Node : « Cannot set headers after they are sent to the client »', ['nodejs', 'express'], 'js', "if (!user) res.status(404).json(...)\nres.json(user)", "Il manque un `return` après la première réponse : `return res.status(404).json(...)`.", 4],
    ['chiamaka-o', 'mariam-k', 90, 'Service worker keeps serving the old version after deploy', ['pwa', 'javascript'], 'js', "self.addEventListener('install', ...)", "Appelle `self.skipWaiting()` à l'installation et `clients.claim()` à l'activation, puis propose « Mettre à jour » à l'utilisateur quand un nouveau worker attend.", 19],
    ['yao-mensah', 'pat-kabongo', 83, 'MySQL : les emojis des clients deviennent des « ???? »', ['mysql', 'laravel'], 'sql', "SHOW VARIABLES LIKE 'character_set%';", "Passe la base et les tables en `utf8mb4` / `utf8mb4_unicode_ci` ; `utf8` en MySQL ne stocke que 3 octets.", 10],
    ['koffi-ag', 'kwame-dev', 76, 'Go: goroutine leak when the HTTP client times out', ['go'], 'go', 'resp, err := http.Get(url)', 'Use a context with timeout and always `defer resp.Body.Close()`; drain the body if you reuse connections.', 15],
    ['je-hounkpatin', 'mariam-k', 70, 'Flutter : la liste saute quand de nouvelles données arrivent hors ligne', ['flutter', 'dart'], 'dart', 'ListView.builder(itemCount: items.length, ...)', "Donne une `Key` stable (l'id) à chaque élément et fusionne les nouvelles données par id au lieu de remplacer la liste.", 26],
    ['amina-bello', 'aicha-sanogo', 64, 'Pandas: rolling mean ignores missing days in rainfall data', ['python', 'ml'], 'python', "df['rain'].rolling(7).mean()", "Réindexe d'abord sur toutes les dates (`asfreq('D')`) puis utilise `rolling('7D', min_periods=4)`.", 31],
    ['ousmane-sow', 'sam-mwangi', 58, 'Orange Money : le statut reste « PENDING » plusieurs minutes', ['mobile-money', 'nodejs'], 'ts', 'await getTransactionStatus(orderId)', 'Never poll aggressively: rely on the notification URL, and poll with exponential backoff (5 s, 15 s, 45 s) as a fallback. Mark as failed after the provider timeout.', 13],
    ['grace-uwase', 'esi-owusu', 51, 'Accessible modal: focus escapes to the page behind', ['react', 'ux'], 'tsx', '<div className="modal">', 'Use a dialog primitive with focus trap (Radix Dialog) or the native `<dialog>` element with `showModal()`; return focus to the trigger on close.', 9],
    ['aicha-sanogo', 'moussa-diop', 44, 'PostgreSQL : requête lente sur un LIKE avec %texte%', ['postgresql', 'sql'], 'sql', "SELECT * FROM produits WHERE nom ILIKE '%riz%'", "Active `pg_trgm` et crée un index GIN : `CREATE INDEX ON produits USING gin (nom gin_trgm_ops);`.", 7],
    ['cedric-nk', 'ibra-traore', 37, 'Kotlin coroutines : l’écran gèle pendant le chargement', ['kotlin', 'android'], 'kotlin', 'runBlocking { repo.load() }', "`runBlocking` bloque le thread principal. Lance `viewModelScope.launch { }` et fais le travail réseau dans `withContext(Dispatchers.IO)`.", 12],
    ['nadia-benali', 'kwame-dev', 29, 'Kubernetes: pods restart because of OOMKilled', ['kubernetes', 'nodejs'], 'yaml', 'resources:\n  limits:\n    memory: 256Mi', 'Node ignores container limits by default: set `--max-old-space-size` to ~75 % of the limit, and raise the limit after profiling.', 21],
    ['pat-kabongo', 'yao-mensah', 24, 'Laravel : envoyer des SMS en file sans bloquer la requête', ['laravel', 'ussd-sms', 'redis'], 'php', 'Sms::send($to, $msg);', "Crée un Job `SendSms` qui implémente `ShouldQueue`, `dispatch()` le dans le contrôleur, et lance `queue:work` sous Supervisor.", 8],
    ['awa-kone', 'moussa-diop', 16, 'nginx : servir une SPA React sans 404 au rafraîchissement', ['nginx', 'react'], 'nginx', 'location / { root /var/www/app; }', "Ajoute `try_files $uri /index.html;` dans le bloc `location /`.", 5],
  ]
  HISTORY.forEach(([by, helper, days, title, tags, lang, code, answer, minutes], i) => {
    const t0 = now - days * D - (i % 7) * H
    const q = e.createQuestion(U(by), { title, body: title, codeSnippet: code, codeLang: lang, urgency: 'normal', tagIds: T(...tags) }, uuid(), t0)
    e.computeHint(q.id)
    const at = t0 + minutes * M
    const a = e.answer(q.id, U(helper), answer, uuid(), at)
    const voters = DEVS.map((d) => d.handle).filter((h) => h !== helper && h !== 'devhub-admin')
    for (let k = 0; k < 2; k++) e.vote(a.id, U(voters[(i * 3 + k * 5) % voters.length]), at + 40 * M)
    e.accept(a.id, U(by), at + 25 * M)
  })

  /* ------------ Salles de projet ------------ */
  type RS = {
    owner: string
    ago: number
    name: string
    tagline: string
    desc: string
    state: 'idea' | 'building' | 'beta' | 'live'
    repo: string
    demo?: string
    tags: string[]
    roles: string[]
    members: string[]
    tasks: { title: string; desc: string; level: 'starter' | 'intermediate' | 'advanced'; by?: string; status?: 'taken' | 'review' | 'done'; pr?: string }[]
    messages: { by: string; ago: number; body: string }[]
    pending?: { by: string; msg: string }[]
  }
  const ROOMS: RS[] = [
    {
      owner: 'ousmane-sow', ago: 40 * D, name: 'PayLink', tagline: 'Un SDK unique pour Wave, Orange Money, MTN MoMo et Free Money',
      desc: "PayLink unifie les API de paiement mobile d'Afrique de l'Ouest derrière une seule interface TypeScript : initier un paiement, vérifier un webhook, rembourser. Objectif : qu'un dev intègre trois opérateurs en une après-midi.",
      state: 'beta', repo: 'ousmane-sow/paylink', demo: 'https://paylink-demo.vercel.app', tags: ['typescript', 'nodejs', 'mobile-money'],
      roles: ['Back-end Node', 'Rédacteur de documentation', 'Testeur en conditions réelles'], members: ['awa-kone', 'sam-mwangi', 'nadia-benali'],
      tasks: [
        { title: 'Adaptateur MTN MoMo (collections)', desc: "Implémenter `initiatePayment` et `verifyWebhook` pour l'API Collections de MTN MoMo.", level: 'advanced', by: 'sam-mwangi', status: 'done', pr: 'https://github.com/ousmane-sow/paylink/pull/31' },
        { title: 'Exemples Next.js dans la documentation', desc: 'Un exemple complet App Router : bouton de paiement, page de retour, route webhook.', level: 'intermediate', by: 'awa-kone', status: 'review' },
        { title: 'Tests du rejeu de webhooks (idempotence)', desc: 'Vérifier que le même événement envoyé 3 fois ne crée qu’un seul paiement.', level: 'intermediate', by: 'nadia-benali', status: 'taken' },
        { title: 'Traduire le README en anglais', desc: 'Le README est en français ; une version anglaise ouvrira le projet au Ghana et au Nigeria.', level: 'starter' },
        { title: 'Adaptateur Free Money', desc: "Même interface que les autres opérateurs, avec la sandbox Free Money.", level: 'advanced' },
      ],
      messages: [
        { by: 'ousmane-sow', ago: 3 * D, body: "Bienvenue Sam et Awa ! La tâche MoMo est la plus urgente, ensuite la doc Next.js." },
        { by: 'sam-mwangi', ago: 2 * D, body: "MoMo adapter is up for review in #31. I used the same idempotency pattern as our M-Pesa code." },
        { by: 'awa-kone', ago: 20 * H, body: "J'ai poussé l'exemple Next.js, il reste la page de retour à styliser." },
      ],
      pending: [{ by: 'mariam-k', msg: 'Je peux écrire le mode hors ligne du SDK côté client (file + rejeu).' }],
    },
    {
      owner: 'je-hounkpatin', ago: 33 * D, name: 'Kalanda', tagline: "Révisions du bac hors ligne, sur n'importe quel téléphone Android",
      desc: "Application Flutter de fiches et de quiz pour le bac béninois, utilisable sans connexion. Synchronisation des progrès quand le réseau revient.",
      state: 'building', repo: 'je-hounkpatin/kalanda', tags: ['flutter', 'dart', 'firebase'],
      roles: ['Dev Flutter', 'Enseignant pour relire les fiches', 'Designer'], members: ['cedric-nk', 'mariam-k'],
      tasks: [
        { title: 'File de synchronisation des progrès', desc: 'Stocker les résultats de quiz localement (Hive) et les envoyer dans l’ordre au retour du réseau.', level: 'advanced', by: 'mariam-k', status: 'taken' },
        { title: 'Écran de quiz accessible', desc: 'Grosses cibles tactiles, lecture du texte à voix haute.', level: 'intermediate', by: 'cedric-nk', status: 'done', pr: 'https://github.com/je-hounkpatin/kalanda/pull/12' },
        { title: 'Importer les fiches de SVT', desc: 'Convertir 40 fiches Markdown au format de l’app.', level: 'starter' },
        { title: 'Mode sombre', desc: 'Respecter le thème du système.', level: 'starter' },
      ],
      messages: [
        { by: 'je-hounkpatin', ago: 4 * D, body: "Merci Cédric pour l'écran de quiz, les testeurs de Porto-Novo adorent." },
        { by: 'mariam-k', ago: 26 * H, body: 'La file Hive marche, il me reste la reprise progressive en cas d’échec.' },
      ],
    },
    {
      owner: 'fatou-nd', ago: 28 * D, name: 'RDV Santé', tagline: 'Prendre rendez-vous au dispensaire par SMS ou USSD',
      desc: "Les patients envoient un SMS ou composent un code USSD ; le dispensaire voit une file d'attente sur une tablette. Django + PostgreSQL.",
      state: 'building', repo: 'fatou-nd/rdv-sante', tags: ['django', 'python', 'ussd-sms', 'postgresql'],
      roles: ['Back-end Django', 'Intégration agrégateur SMS'], members: ['aicha-sanogo'],
      tasks: [
        { title: 'Parser les SMS entrants', desc: 'Reconnaître « RDV 12/10 matin » et répondre avec un créneau.', level: 'intermediate', by: 'aicha-sanogo', status: 'done', pr: 'https://github.com/fatou-nd/rdv-sante/pull/7' },
        { title: 'Menu USSD à 3 niveaux', desc: 'Choisir le dispensaire, le jour, la demi-journée.', level: 'advanced' },
        { title: 'Tableau de la file pour tablette', desc: 'Grande police, rafraîchissement toutes les 30 s.', level: 'starter' },
      ],
      messages: [{ by: 'fatou-nd', ago: 2 * D, body: "Aïcha, ton parser gère même les fautes de frappe, bravo !" }],
    },
    {
      owner: 'chiamaka-o', ago: 22 * D, name: 'Esusu', tagline: 'Tontines digitales transparentes pour les groupes d’épargne',
      desc: 'React Native app to run rotating savings groups (esusu, tontine, susu): contributions, payout order and reminders, with offline support.',
      state: 'beta', repo: 'chiamaka-o/esusu', demo: 'https://esusu.app', tags: ['react-native', 'typescript', 'firebase'],
      roles: ['React Native dev', 'Translator (FR)'], members: ['grace-uwase', 'esi-owusu'],
      tasks: [
        { title: 'Onboarding redesign', desc: 'Three screens explaining how a tontine works.', level: 'intermediate', by: 'esi-owusu', status: 'done', pr: 'https://github.com/chiamaka-o/esusu/pull/44' },
        { title: 'French translation', desc: 'Translate the app for francophone groups.', level: 'starter' },
        { title: 'Idempotent contributions', desc: 'Use client-generated ids to avoid duplicates after reconnect.', level: 'intermediate', by: 'grace-uwase', status: 'taken' },
      ],
      messages: [{ by: 'chiamaka-o', ago: 3 * D, body: 'Mariam’s answer on SOS fixed our duplicate contributions. Grace is turning it into a proper task.' }],
    },
    {
      owner: 'yao-mensah', ago: 16 * D, name: 'Boutik', tagline: 'Un catalogue en ligne pour les commerçants, partageable sur WhatsApp',
      desc: 'Laravel + Vue. Le commerçant photographie ses produits, Boutik génère une page légère et un lien à partager dans les statuts WhatsApp.',
      state: 'building', repo: 'yao-mensah/boutik', tags: ['laravel', 'php', 'vue', 'mysql'],
      roles: ['Dev Vue', 'Dev Laravel'], members: ['pat-kabongo'],
      tasks: [
        { title: 'Compression des photos à l’envoi', desc: 'Réduire les images à 800 px et en WebP avant stockage.', level: 'intermediate', by: 'pat-kabongo', status: 'review' },
        { title: 'Aperçu WhatsApp (Open Graph)', desc: 'Titre, prix et photo dans l’aperçu du lien.', level: 'starter' },
      ],
      messages: [{ by: 'yao-mensah', ago: 30 * H, body: 'Patrick, je relis ta PR de compression ce soir.' }],
    },
    {
      owner: 'amina-bello', ago: 12 * D, name: 'AgriAlert', tagline: 'Weather and pest alerts for farmers, by SMS in local languages',
      desc: 'Python service that turns forecast data into short SMS alerts in Hausa, Yoruba and English.',
      state: 'idea', repo: 'amina-bello/agrialert', tags: ['python', 'ml', 'ussd-sms'],
      roles: ['Python dev', 'Hausa / Yoruba translator'], members: [],
      tasks: [
        { title: 'Prototype forecast-to-SMS rules', desc: 'Rain > 30 mm in 24 h triggers an alert.', level: 'intermediate' },
        { title: 'Collect sample messages in Hausa', desc: 'Ten short alert templates.', level: 'starter' },
      ],
      messages: [],
    },
  ]

  for (const r of ROOMS) {
    const t0 = now - r.ago
    const room = e.createRoom(U(r.owner), { name: r.name, tagline: r.tagline, description: r.desc, state: r.state, repoFullName: r.repo, demoUrl: r.demo, tagIds: T(...r.tags), wantedRoles: r.roles }, t0, true)
    r.members.forEach((m, i) => {
      const jr = e.requestJoin(room.id, U(m), 'Je veux contribuer !', t0 + (i + 1) * D)
      e.respondJoin(jr.id, U(r.owner), true, t0 + (i + 1) * D + 2 * H)
    })
    r.tasks.forEach((tk, i) => {
      const task = e.createTask(room.id, U(r.owner), { title: tk.title, description: tk.desc, level: tk.level }, t0 + (i + 2) * D)
      if (tk.by && tk.status) {
        e.takeTask(task.id, U(tk.by), t0 + (i + 3) * D)
        if (tk.status === 'review') e.moveTask(task.id, U(tk.by), 'review', t0 + (i + 4) * D)
        if (tk.status === 'done') {
          const doneAt = Math.min(now - 6 * H, t0 + (i + 5) * D)
          e.completeTask(task.id, U(r.owner), tk.pr!, true, doneAt)
        }
      }
    })
    for (const m of r.messages) e.postMessage(room.id, U(m.by), m.body, 'message', uuid(), now - m.ago)
    for (const p of r.pending ?? []) e.requestJoin(room.id, U(p.by), p.msg, now - 5 * H)
  }

  s.notifications = []
  s.lastBackupAt = new Date(now - 3 * H - 12 * M).toISOString()
  return s
}
