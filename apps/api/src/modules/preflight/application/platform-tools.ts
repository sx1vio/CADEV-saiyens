import { randomUUID } from 'node:crypto';
import {
  ApplyRequest,
  AskQuestionRequest,
  CreateBenchRequest,
  CreatePostCommentRequest,
  CreatePostRequest,
  CreateRoomRequest,
  CreateTaskRequest,
  DiscoverDevsQuery,
  JoinRoomRequest,
  LeaderboardQuery,
  ListBenchQuery,
  ListNotificationsQuery,
  ListPostsQuery,
  ListQuestionsQuery,
  ListRoomsQuery,
  PostAnswerRequest,
  PostMessageRequest,
  PostVoteRequest,
  SendDirectMessageRequest,
  StartConversationRequest,
  SubmitTaskRequest,
  UpdateMeRequest,
} from '@devhub/contracts';
import { z } from 'zod';

// Outils « plateforme » du serveur MCP de DevHub Africa (11/11/2026) : l'agent IA du développeur
// lit et agit sur la plateforme en son nom (questions, réponses, publications, emplois, projets,
// messages, banc d'essai…). Chaque outil appelle la vraie route de l'API avec le jeton de
// l'appelant : mêmes validations, mêmes droits, mêmes quotas et même modération que l'application.
// Les schémas d'entrée sont générés depuis les contrats (packages/contracts) : ils restent exacts.

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export interface PlatformTool {
  name: string;
  title: string;
  description: string;
  method: Method;
  /** Chemin sous /api/v1, avec des paramètres « :nom » pris dans les arguments. */
  path: string;
  /** Description des paramètres de chemin (tous obligatoires, chaînes). */
  params?: Record<string, string>;
  /** Paramètres de requête (GET) ou corps (écritures). */
  input?: z.ZodType;
  /** Le corps porte un `clientId` (UUID) que l'outil génère : l'agent n'a pas à le fournir. */
  clientId?: boolean;
  readOnly: boolean;
  /** Action irréversible ou visible par d'autres (publication, candidature, message). */
  destructive?: boolean;
}

/** Appel de l'API au nom de l'appelant (boucle locale, même jeton). */
export type ApiCaller = (req: {
  method: Method;
  path: string;
  query?: Record<string, string>;
  body?: unknown;
}) => Promise<{ status: number; body: unknown }>;

const omitClientId = <T extends z.ZodObject>(s: T) => s.omit({ clientId: true } as never);

const NewsQuery = z.object({
  kind: z
    .enum(['article', 'video', 'hn', 'devto', 'repo', 'release', 'job', 'cert', 'skill'])
    .optional()
    .describe('Type de contenu'),
  lang: z.enum(['fr', 'en', 'all']).optional(),
  q: z.string().max(80).optional().describe('Recherche plein texte'),
  limit: z.number().int().min(1).max(100).optional(),
});

export const PLATFORM_TOOLS: PlatformTool[] = [
  // ── Moi et les autres devs ──────────────────────────────────────────────────────────────
  {
    name: 'whoami',
    title: 'Mon compte',
    description: 'Renvoie le compte DevHub au nom duquel l’agent agit (pseudo, nom, pays, XP).',
    method: 'GET',
    path: '/me',
    readOnly: true,
  },
  {
    name: 'update_my_profile',
    title: 'Modifier mon profil',
    description:
      'Met à jour le profil (nom affiché, bio, pays ISO à 2 lettres, disponibilité, « Je peux aider sur », langues…). Ne fournir que les champs à changer.',
    method: 'PATCH',
    path: '/me',
    input: UpdateMeRequest,
    readOnly: false,
  },
  {
    name: 'get_passport',
    title: 'Passport d’un dev',
    description:
      'Profil public vérifiable d’un dev : compétences prouvées, XP, preuves, projets, certifications.',
    method: 'GET',
    path: '/u/:handle',
    params: { handle: 'Pseudo DevHub (ex. awa-dev)' },
    readOnly: true,
  },
  {
    name: 'search_devs',
    title: 'Trouver des devs',
    description:
      'Cherche des développeurs par compétence (tag), pays (code ISO, ex. SN, BJ, CI), fuseau horaire ou disponibilité pour une mission.',
    method: 'GET',
    path: '/discover/devs',
    input: DiscoverDevsQuery,
    readOnly: true,
  },
  {
    name: 'leaderboard',
    title: 'Classement',
    description: 'Classement des pays ou des devs par Proof XP.',
    method: 'GET',
    path: '/leaderboard',
    input: LeaderboardQuery,
    readOnly: true,
  },

  // ── Entraide (questions et réponses) ────────────────────────────────────────────────────
  {
    name: 'list_questions',
    title: 'Questions d’entraide',
    description:
      'Liste les questions des devs : recherche (q), étiquette (tag), sans réponse (unanswered: "true"), adaptées à mes stacks (forMe: "true"), les miennes (mine: "true").',
    method: 'GET',
    path: '/questions',
    input: ListQuestionsQuery,
    readOnly: true,
  },
  {
    name: 'get_question',
    title: 'Lire une question',
    description: 'Question complète avec son code, la piste IA et toutes les réponses.',
    method: 'GET',
    path: '/questions/:id',
    params: { id: 'Identifiant (UUID) de la question' },
    readOnly: true,
  },
  {
    name: 'ask_question',
    title: 'Poser une question',
    description:
      'Publie une question d’entraide quand le dev est bloqué. Titre précis, contexte dans body, code dans codeSnippet (les secrets sont masqués), 1 à 5 étiquettes (tagSlugs, ex. ["react","vite"]). Visible par toute la communauté.',
    method: 'POST',
    path: '/questions',
    input: omitClientId(AskQuestionRequest),
    clientId: true,
    readOnly: false,
    destructive: true,
  },
  {
    name: 'answer_question',
    title: 'Répondre à une question',
    description:
      'Publie une réponse à une question (Markdown). Une réponse validée par l’auteur rapporte des Proof XP.',
    method: 'POST',
    path: '/questions/:id/answers',
    params: { id: 'Identifiant (UUID) de la question' },
    input: omitClientId(PostAnswerRequest),
    clientId: true,
    readOnly: false,
    destructive: true,
  },
  {
    name: 'upvote_answer',
    title: 'Voter pour une réponse',
    description: 'Ajoute un vote utile à une réponse.',
    method: 'POST',
    path: '/answers/:id/vote',
    params: { id: 'Identifiant (UUID) de la réponse' },
    readOnly: false,
  },
  {
    name: 'accept_answer',
    title: 'Valider une réponse',
    description:
      'Marque la réponse comme celle qui a résolu ma question (réservé à l’auteur de la question).',
    method: 'POST',
    path: '/answers/:id/accept',
    params: { id: 'Identifiant (UUID) de la réponse' },
    readOnly: false,
  },

  // ── Fil et publications ─────────────────────────────────────────────────────────────────
  {
    name: 'list_posts',
    title: 'Fil des publications',
    description:
      'Publications des devs, par centre d’intérêt (community), auteur, récentes ou top.',
    method: 'GET',
    path: '/posts',
    input: ListPostsQuery,
    readOnly: true,
  },
  {
    name: 'get_post',
    title: 'Lire une publication',
    description: 'Publication et ses commentaires.',
    method: 'GET',
    path: '/posts/:id',
    params: { id: 'Identifiant (UUID) de la publication' },
    readOnly: true,
  },
  {
    name: 'create_post',
    title: 'Publier',
    description:
      'Publie dans le fil, comme sur LinkedIn : texte libre sans titre (kind "update", par défaut), projet ("showcase"), mise en ligne ou nouvelle version ("release"), célébration ("celebration"), article ou tutoriel ("article"), discussion, question, actu, projet open source. Les photos s’envoient avant par POST /media. Visible par toute la communauté.',
    method: 'POST',
    path: '/posts',
    input: CreatePostRequest,
    readOnly: false,
    destructive: true,
  },
  {
    name: 'comment_post',
    title: 'Commenter une publication',
    description: 'Ajoute un commentaire (ou une réponse à un commentaire avec parentId).',
    method: 'POST',
    path: '/posts/:id/comments',
    params: { id: 'Identifiant (UUID) de la publication' },
    input: CreatePostCommentRequest,
    readOnly: false,
    destructive: true,
  },
  {
    name: 'vote_post',
    title: 'Voter sur une publication',
    description: 'value : 1 (j’aime), -1 (pas utile) ou 0 (retirer mon vote).',
    method: 'PUT',
    path: '/posts/:id/vote',
    params: { id: 'Identifiant (UUID) de la publication' },
    input: PostVoteRequest,
    readOnly: false,
  },

  // ── Actualité tech ──────────────────────────────────────────────────────────────────────
  {
    name: 'list_news',
    title: 'Actualité tech',
    description:
      'Actualités tech et IA, vidéos, dépôts et versions qui montent, offres, certifications : sources réelles, mises à jour en continu.',
    method: 'GET',
    path: '/news',
    input: NewsQuery,
    readOnly: true,
  },

  // ── Emplois ─────────────────────────────────────────────────────────────────────────────
  {
    name: 'list_jobs',
    title: 'Offres d’emploi',
    description:
      'Sélection DevHub : offres des entreprises vérifiées et offres choisies par l’équipe. Une offre sans applyUrl se postule directement sur DevHub (apply_job) ; avec un applyUrl, la candidature se fait sur ce lien. Les offres collectées en direct (Remotive, Jobicy…) sont dans list_news avec kind: "job".',
    method: 'GET',
    path: '/jobs',
    readOnly: true,
  },
  {
    name: 'get_job',
    title: 'Lire une offre',
    description: 'Détail d’une offre d’emploi.',
    method: 'GET',
    path: '/jobs/:id',
    params: { id: 'Identifiant (UUID) de l’offre' },
    readOnly: true,
  },
  {
    name: 'apply_job',
    title: 'Postuler',
    description:
      'Postule directement sur DevHub à une offre sans applyUrl (entreprise vérifiée) : message de 30 à 3 000 caractères, Passport joint ; shareEmail: true pour que l’entreprise voie l’e-mail du dev (seulement s’il l’accepte), links: jusqu’à 3 liens https (portfolio, dépôt). Les recruteurs sont prévenus par e-mail. Une offre avec applyUrl renvoie l’erreur job.external : donne alors le lien au dev. Montre toujours le message au dev et attends son accord avant.',
    method: 'POST',
    path: '/jobs/:id/apply',
    params: { id: 'Identifiant (UUID) de l’offre' },
    input: ApplyRequest,
    readOnly: false,
    destructive: true,
  },
  {
    name: 'my_applications',
    title: 'Mes candidatures',
    description:
      'Mes candidatures : statut (envoyée, consultée, entretien, non retenue, acceptée, retirée) et dernier mot de l’entreprise (note).',
    method: 'GET',
    path: '/me/applications',
    readOnly: true,
  },

  {
    name: 'withdraw_application',
    title: 'Retirer une candidature',
    description:
      'Retire une de mes candidatures (identifiant donné par my_applications). Demande confirmation au dev avant.',
    method: 'DELETE',
    path: '/me/applications/:id',
    params: { id: 'Identifiant (UUID) de la candidature' },
    readOnly: false,
    destructive: true,
  },

  // ── Projets (salles) ────────────────────────────────────────────────────────────────────
  {
    name: 'list_projects',
    title: 'Projets',
    description:
      'Projets de la communauté (salles) : recherche, stack, état, les miens (mine: "true").',
    method: 'GET',
    path: '/rooms',
    input: ListRoomsQuery,
    readOnly: true,
  },
  {
    name: 'get_project',
    title: 'Lire un projet',
    description: 'Détail d’un projet à partir de son code court (ex. « k3x9p2 »).',
    method: 'GET',
    path: '/rooms/:code',
    params: { code: 'Code court du projet' },
    readOnly: true,
  },
  {
    name: 'create_project',
    title: 'Créer un projet',
    description:
      'Crée un projet (salle) pour trouver des contributeurs : nom, description, stack (stackTagSlugs), dépôt GitHub public « owner/repo » facultatif.',
    method: 'POST',
    path: '/rooms',
    input: CreateRoomRequest,
    readOnly: false,
    destructive: true,
  },
  {
    name: 'join_project',
    title: 'Demander à rejoindre un projet',
    description: 'Envoie une demande pour rejoindre un projet, avec un message facultatif.',
    method: 'POST',
    path: '/rooms/:id/join',
    params: { id: 'Identifiant (UUID) du projet' },
    input: JoinRoomRequest,
    readOnly: false,
  },
  {
    name: 'list_project_tasks',
    title: 'Tâches d’un projet',
    description: 'Tableau des tâches (Kanban) d’un projet.',
    method: 'GET',
    path: '/rooms/:id/tasks',
    params: { id: 'Identifiant (UUID) du projet' },
    readOnly: true,
  },
  {
    name: 'create_project_task',
    title: 'Ajouter une tâche',
    description: 'Ajoute une tâche à un projet (responsable du projet).',
    method: 'POST',
    path: '/rooms/:id/tasks',
    params: { id: 'Identifiant (UUID) du projet' },
    input: CreateTaskRequest,
    readOnly: false,
  },
  {
    name: 'take_task',
    title: 'Prendre une tâche',
    description: 'Je prends cette tâche (membre du projet).',
    method: 'POST',
    path: '/tasks/:id/take',
    params: { id: 'Identifiant (UUID) de la tâche' },
    readOnly: false,
  },
  {
    name: 'submit_task',
    title: 'Livrer une tâche',
    description:
      'Rend une tâche avec l’adresse de la pull request GitHub ; fusionnée, elle rapporte des Proof XP.',
    method: 'POST',
    path: '/tasks/:id/submit',
    params: { id: 'Identifiant (UUID) de la tâche' },
    input: SubmitTaskRequest,
    readOnly: false,
  },
  {
    name: 'post_project_message',
    title: 'Écrire dans un projet',
    description: 'Envoie un message dans la discussion d’un projet (membres).',
    method: 'POST',
    path: '/rooms/:id/messages',
    params: { id: 'Identifiant (UUID) du projet' },
    input: omitClientId(PostMessageRequest),
    clientId: true,
    readOnly: false,
    destructive: true,
  },

  // ── Messages et notifications ───────────────────────────────────────────────────────────
  {
    name: 'list_conversations',
    title: 'Mes conversations',
    description: 'Conversations privées, avec le nombre de messages non lus.',
    method: 'GET',
    path: '/conversations',
    readOnly: true,
  },
  {
    name: 'read_conversation',
    title: 'Lire une conversation',
    description: 'Messages d’une conversation privée.',
    method: 'GET',
    path: '/conversations/:id/messages',
    params: { id: 'Identifiant (UUID) de la conversation' },
    readOnly: true,
  },
  {
    name: 'start_conversation',
    title: 'Ouvrir une conversation',
    description: 'Ouvre (ou retrouve) une conversation privée avec un dev, par son pseudo.',
    method: 'POST',
    path: '/conversations',
    input: StartConversationRequest,
    readOnly: false,
  },
  {
    name: 'send_message',
    title: 'Envoyer un message privé',
    description:
      'Envoie un message privé dans une conversation. Demande confirmation au dev avant.',
    method: 'POST',
    path: '/conversations/:id/messages',
    params: { id: 'Identifiant (UUID) de la conversation' },
    input: omitClientId(SendDirectMessageRequest),
    clientId: true,
    readOnly: false,
    destructive: true,
  },
  {
    name: 'list_notifications',
    title: 'Mes notifications',
    description:
      'Notifications (réponses, mentions, candidatures…) ; unread: "true" pour les non lues.',
    method: 'GET',
    path: '/notifications',
    input: ListNotificationsQuery,
    readOnly: true,
  },

  // ── Livrer : banc d'essai et certifications ─────────────────────────────────────────────
  {
    name: 'list_test_requests',
    title: 'Banc d’essai',
    description:
      'Demandes de test sur vrais téléphones et vrais réseaux africains (scope "open", "mine" ou "tested").',
    method: 'GET',
    path: '/bench',
    input: ListBenchQuery,
    readOnly: true,
  },
  {
    name: 'request_device_tests',
    title: 'Faire tester mon app',
    description:
      'Demande à des devs de tester l’application sur leurs téléphones et réseaux (appareils, réseaux 2G/3G/4G, consignes).',
    method: 'POST',
    path: '/bench',
    input: CreateBenchRequest,
    readOnly: false,
    destructive: true,
  },
  {
    name: 'my_certifications',
    title: 'Mes certifications',
    description: 'Certifications DevHub obtenues et tentatives en cours.',
    method: 'GET',
    path: '/certifications/me',
    readOnly: true,
  },
];

/** Schéma JSON d'entrée d'un outil : paramètres de chemin + champs de requête ou de corps. */
export function inputSchemaOf(tool: PlatformTool): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  for (const [name, description] of Object.entries(tool.params ?? {})) {
    properties[name] = { type: 'string', description };
    required.push(name);
  }
  if (tool.input) {
    const json = z.toJSONSchema(tool.input, { io: 'input', unrepresentable: 'any' }) as {
      properties?: Record<string, unknown>;
      required?: string[];
    };
    Object.assign(properties, json.properties ?? {});
    required.push(...(json.required ?? []));
  }
  return {
    type: 'object',
    properties,
    ...(required.length ? { required } : {}),
    additionalProperties: false,
  };
}

/** Descripteur MCP (tools/list) d'un outil plateforme. */
export function describeTool(tool: PlatformTool) {
  return {
    name: tool.name,
    title: tool.title,
    description: tool.description,
    inputSchema: inputSchemaOf(tool),
    annotations: {
      readOnlyHint: tool.readOnly,
      destructiveHint: tool.destructive ?? false,
      openWorldHint: false,
    },
  };
}

/** Le chemin d'un outil, avec ses paramètres remplacés et encodés. */
export function buildPath(tool: PlatformTool, args: Record<string, unknown>): string | null {
  let missing = false;
  const path = tool.path.replace(/:([A-Za-z]+)/g, (_, name: string) => {
    const v = args[name];
    if (typeof v !== 'string' || !v.trim()) {
      missing = true;
      return '';
    }
    return encodeURIComponent(v.trim());
  });
  return missing ? null : path;
}

/** Arguments restants, après retrait des paramètres de chemin. */
export function restArgs(tool: PlatformTool, args: Record<string, unknown>) {
  const rest: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(args)) if (!(k in (tool.params ?? {}))) rest[k] = v;
  return rest;
}

/** Arguments de requête GET en chaînes (les booléens deviennent "true" / "false"). */
export function toQuery(rest: Record<string, unknown>): Record<string, string> {
  const q: Record<string, string> = {};
  for (const [k, v] of Object.entries(rest)) {
    if (v === undefined || v === null) continue;
    q[k] = typeof v === 'string' ? v : typeof v === 'object' ? JSON.stringify(v) : String(v);
  }
  return q;
}

/** Corps d'une écriture, avec le clientId généré si l'outil en porte un. */
export function toBody(tool: PlatformTool, rest: Record<string, unknown>): unknown {
  if (!tool.input && !tool.clientId) return undefined;
  return tool.clientId ? { ...rest, clientId: randomUUID() } : rest;
}

const MAX_TEXT = 24_000;

/** Réponse de l'API, lisible par l'agent : JSON indenté, tronqué au-delà de 24 000 caractères. */
export function resultText(status: number, body: unknown): { text: string; isError: boolean } {
  if (status >= 400) {
    const p = (body ?? {}) as { title?: string; detail?: string; code?: string };
    const why = [p.title, p.detail].filter(Boolean).join(' — ') || 'Erreur';
    const hint =
      status === 401
        ? ' (jeton invalide ou révoqué)'
        : status === 403 && p.code === 'auth.token_scope'
          ? ' (crée un jeton de portée « Plateforme » sur DevHub)'
          : status === 429
            ? ' (limite atteinte : réessaie plus tard)'
            : '';
    return { text: `Erreur ${status}${p.code ? ` ${p.code}` : ''} : ${why}${hint}`, isError: true };
  }
  if (status === 204 || body === undefined || body === null || body === '')
    return { text: 'Fait.', isError: false };
  const json = typeof body === 'string' ? body : JSON.stringify(body, null, 2);
  return {
    text:
      json.length > MAX_TEXT
        ? `${json.slice(0, MAX_TEXT)}\n… (réponse tronquée : affine la recherche ou baisse limit)`
        : json,
    isError: false,
  };
}
