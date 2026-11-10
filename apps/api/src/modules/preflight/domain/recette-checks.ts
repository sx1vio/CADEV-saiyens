import type { PreflightCheck } from '@devhub/contracts';
import type { SiteFacts } from './facts';

// Contrôles de recette (10/11/2026) tirés du skill recette-qa de l'équipe : smoke des pages,
// matrice des routes en anonyme, divulgation de la pile, zoom, langue, manifeste PWA, cache du
// service worker, Brotli. Même contrat que checks.ts : une correction applicable telle quelle.

type C = PreflightCheck;
const check = (c: C): C => ({ ...c, evidence: c.evidence.slice(0, 12) });
const ok = (id: string, category: C['category'], title: string, detail: string): C =>
  check({ id, category, status: 'pass', title, detail, fix: null, evidence: [] });
const path = (u: string) => {
  try {
    return new URL(u).pathname;
  } catch {
    return u;
  }
};

export function recetteSiteChecks(site: SiteFacts): C[] {
  const r = site.extra?.recette;
  const out: C[] = [];

  // ── Accessibilité lisible dans le HTML (vaut même sans Lighthouse) ──
  if (!site.html.lang) {
    out.push(
      check({
        id: 'a11y.lang',
        category: 'accessibility',
        status: 'warn',
        title: 'Langue de la page non déclarée',
        detail:
          'Sans attribut lang sur <html>, le lecteur d’écran lit le français avec l’accent de la langue du téléphone (WCAG 3.1.1, RGAA 8.3).',
        fix: 'Ajouter la langue sur la balise racine : <html lang="fr"> (et la changer quand l’utilisateur passe en anglais : document.documentElement.lang = "en").',
        evidence: [],
      }),
    );
  } else {
    out.push(
      ok(
        'a11y.lang',
        'accessibility',
        `Langue déclarée (${site.html.lang})`,
        'Le lecteur d’écran prononce la page dans la bonne langue.',
      ),
    );
  }
  if (!r) return out;

  if (r.zoomBlocked) {
    out.push(
      check({
        id: 'a11y.zoom',
        category: 'accessibility',
        status: 'fail',
        title: 'Le zoom est bloqué sur téléphone',
        detail: `La balise viewport contient ${r.zoomBlocked} : une personne malvoyante ne peut pas agrandir le texte (WCAG 1.4.4, niveau AA ; RGAA 10.4).`,
        fix: 'Garder seulement <meta name="viewport" content="width=device-width, initial-scale=1"> : retirer user-scalable=no et maximum-scale.',
        evidence: [r.zoomBlocked],
      }),
    );
  } else if (site.html.hasViewport) {
    out.push(
      ok(
        'a11y.zoom',
        'accessibility',
        'Zoom autorisé',
        'La balise viewport laisse agrandir la page jusqu’à 200 % et plus.',
      ),
    );
  }

  // ── Fonctionnel : les pages du sitemap répondent ──
  if (r.pages.length) {
    const broken = r.pages.filter((p) => p.status === 0 || p.status >= 500);
    const missing = r.pages.filter((p) => p.status >= 400 && p.status < 500);
    out.push(
      broken.length || missing.length
        ? check({
            id: 'func.pages',
            category: 'functional',
            status: broken.length ? 'fail' : 'warn',
            title: broken.length
              ? `${broken.length} page(s) du sitemap en erreur serveur`
              : `${missing.length} page(s) du sitemap introuvable(s)`,
            detail: `${r.pages.length} adresses du sitemap appelées une à une. ${broken.length ? 'Une erreur 5xx ou une absence de réponse veut dire que la page plante pour tout le monde. ' : ''}Une page listée dans le sitemap doit répondre 200 : Google la visite et la signale sinon.`,
            fix: broken.length
              ? 'Ouvrir chaque page en erreur, lire le journal du serveur à l’heure de l’appel (identifiant de requête), corriger l’exception, puis ajouter un test qui charge la page.'
              : 'Retirer du sitemap les pages qui n’existent plus, ou rediriger (301) leur ancienne adresse vers la nouvelle.',
            evidence: [...broken, ...missing].map(
              (p) => `${path(p.url)} · ${p.status || 'pas de réponse'}`,
            ),
          })
        : ok(
            'func.pages',
            'functional',
            `Les ${r.pages.length} pages du sitemap répondent`,
            'Chaque adresse listée dans le sitemap renvoie 200.',
          ),
    );
  }
  const total = r.routes.sitemap + r.routes.robotsDisallow + r.routes.bundle + r.routes.api;
  if (total) {
    out.push(
      check({
        id: 'func.routes',
        category: 'functional',
        status: 'info',
        title: `${r.routes.bundle + r.routes.sitemap} routes découvertes`,
        detail: `Sitemap : ${r.routes.sitemap} · robots.txt (Disallow) : ${r.routes.robotsDisallow} · routeur lu dans le JavaScript : ${r.routes.bundle} · adresses d’API dans le code : ${r.routes.api}. Ce sont les routes à couvrir par la recette (une ligne par route et par rôle : visiteur, membre, administrateur).`,
        fix: null,
        evidence: r.routeSamples,
      }),
    );
  }

  // ── Sécurité : routes d'API appelées sans session ──
  if (r.apiMatrix === 'needs_proof') {
    out.push(
      check({
        id: 'sec.anonymous_api',
        category: 'security',
        status: 'info',
        title: 'Routes d’API en anonyme : domaine à prouver',
        detail:
          'Le pré-vol appelle les routes d’API sans session (GET seulement) pour vérifier qu’aucune donnée réservée n’en sort. Il ne le fait que sur un domaine dont l’auteur a prouvé le contrôle : sinon l’outil servirait à repérer le site d’un autre.',
        fix: 'Publier https://<domaine>/.well-known/devhub-verify.txt (ou l’enregistrement DNS TXT) donné sur /prevol, section « Ajouter un test de charge », puis relancer le pré-vol.',
        evidence: [],
      }),
    );
  } else if (r.api.length) {
    const ok200 = r.api.filter((a) => a.status === 200 && a.json && !a.empty);
    const critical = ok200.filter(
      (a) => a.credentialKeys.length || (a.privatePath && a.personalKeys.length),
    );
    const doubtful = ok200.filter(
      (a) => !critical.includes(a) && (a.privatePath || a.personalKeys.length),
    );
    const closed = r.api.filter(
      (a) => [401, 403, 404, 405].includes(a.status) || (a.status >= 300 && a.status < 400),
    );
    const show = (a: (typeof r.api)[number]) =>
      `${a.path} · ${a.status}${a.credentialKeys.length ? ` · identifiants : ${a.credentialKeys.join(', ')}` : ''}${a.personalKeys.length ? ` · données personnelles : ${a.personalKeys.join(', ')}` : ''}`;
    out.push(
      critical.length
        ? check({
            id: 'sec.anonymous_api',
            category: 'security',
            status: 'fail',
            title: 'Des données réservées sont servies sans connexion',
            detail: `${critical.length} route(s) d’API répondent 200 à un visiteur sans session avec des identifiants ou des données personnelles. C’est le risque n° 1 de l’OWASP API Top 10 (contrôle d’accès cassé) et une gate éliminatoire de la recette. Seuls les noms des champs sont relevés, jamais les valeurs.`,
            fix: 'Protéger ces routes par la vérification de session côté serveur (middleware ou garde sur la route, pas seulement dans le front), répondre 401 sans session et 403 (ou 404) pour un rôle insuffisant. Ne jamais renvoyer mot de passe, hash ou jeton, même connecté. Si une clé a fuité, la révoquer.',
            evidence: critical.map(show),
          })
        : doubtful.length
          ? check({
              id: 'sec.anonymous_api',
              category: 'security',
              status: 'warn',
              title: 'Routes d’API à vérifier : elles répondent sans connexion',
              detail: `${doubtful.length} route(s) au nom réservé (me, admin, account…) ou contenant des champs personnels répondent 200 sans session. C’est peut-être voulu (profil public) : à confirmer route par route.`,
              fix: 'Pour chaque route listée : si elle doit être réservée, exiger la session côté serveur (401 sans session) ; si elle est publique, ne renvoyer que les champs publics (pas d’e-mail ni de téléphone).',
              evidence: doubtful.map(show),
            })
          : ok(
              'sec.anonymous_api',
              'security',
              `${r.api.length} routes d’API testées sans session : rien de réservé`,
              `${closed.length} répondent 401, 403, 404 ou redirigent ; les autres ne renvoient que des données publiques ou vides. Le cloisonnement entre deux comptes (IDOR) reste à tester avec deux comptes.`,
            ),
    );
  }
  if (r.apiPoweredBy || r.apiNotFoundLeak) {
    out.push(
      check({
        id: 'sec.api_disclosure',
        category: 'security',
        status: 'warn',
        title: 'L’API annonce sa technologie',
        detail: [
          r.apiPoweredBy &&
            `En-tête X-Powered-By: ${r.apiPoweredBy} : il indique la pile à qui cherche une faille connue.`,
          r.apiNotFoundLeak &&
            `Une route d’API inexistante affiche le ${r.apiNotFoundLeak} : la différence avec une route protégée (404 « Not found ») permet de cartographier les routes cachées.`,
        ]
          .filter(Boolean)
          .join(' '),
        fix: 'Express : app.disable("x-powered-by") et un gestionnaire 404 qui renvoie le même message générique pour toute route absente ou masquée. NestJS : app.disable("x-powered-by") et un filtre d’exceptions qui remplace « Cannot GET … » par « Not found ».',
        evidence: [r.apiPoweredBy && `X-Powered-By: ${r.apiPoweredBy}`, r.apiNotFoundLeak].filter(
          (v): v is string => !!v,
        ),
      }),
    );
  } else if (r.api.length) {
    out.push(
      ok(
        'sec.api_disclosure',
        'security',
        'L’API ne dit pas quelle technologie elle utilise',
        'Ni X-Powered-By, ni message 404 propre au framework.',
      ),
    );
  }

  // ── PWA : manifeste complet, cache du service worker ──
  if (r.manifest) {
    const m = r.manifest;
    const blocking = [
      !m.startUrl && 'start_url',
      !m.icon192 && 'icône 192 × 192',
      !m.icon512 && 'icône 512 × 512',
    ].filter((v): v is string => !!v);
    const minor = [
      !m.id && 'id',
      !m.scope && 'scope',
      !m.themeColor && 'theme_color',
      !m.maskable && 'icône « maskable »',
      !r.faviconIco && 'favicon.ico (le navigateur le demande quand même)',
    ].filter((v): v is string => !!v);
    out.push(
      blocking.length || minor.length
        ? check({
            id: 'pwa.manifest',
            category: 'network',
            status: blocking.length ? 'warn' : 'info',
            title: blocking.length
              ? 'Manifeste d’installation incomplet'
              : 'Manifeste : quelques champs à ajouter',
            detail:
              'Le manifeste décrit l’application installée sur l’écran d’accueil. Sans id, Chrome la considère comme une autre application dès que start_url change ; sans icône maskable, Android l’affiche dans un cercle blanc.',
            fix: `Compléter le manifeste : ${[...blocking, ...minor].join(', ')}. Exemple : "id": "/", "start_url": "/", "scope": "/", "theme_color": "#0E1730", icônes 192 et 512 px dont une avec "purpose": "maskable".`,
            evidence: [...blocking, ...minor],
          })
        : ok(
            'pwa.manifest',
            'network',
            'Manifeste d’installation complet',
            'id, start_url, scope, couleur, icônes 192 et 512 px et maskable, favicon.ico.',
          ),
    );
  }
  if (r.swApiCache.length) {
    out.push(
      check({
        id: 'pwa.api_cache',
        category: 'network',
        status: 'info',
        title: 'Le service worker garde des réponses d’API',
        detail:
          'Utile hors ligne, mais une réponse liée au compte (profil, messages) ne doit jamais être relue après la déconnexion, ni par un autre compte sur le même téléphone. Le pré-vol ne peut pas le vérifier sans compte : c’est une gate de la recette à tester à la main.',
        fix: 'Ne mettre en cache que des lectures publiques, ou vider ce cache à la déconnexion (caches.delete) et quand un autre compte se connecte. Jamais de réponse de /me, /auth ou /admin.',
        evidence: r.swApiCache,
      }),
    );
  }

  // ── Réseau : Brotli ──
  const enc = (site.headers['content-encoding'] ?? '').toLowerCase();
  if (enc === 'br') {
    out.push(
      ok(
        'net.brotli',
        'network',
        'Page servie en Brotli',
        'La compression la plus efficace lue par tous les navigateurs, Safari compris.',
      ),
    );
  } else if (enc === 'gzip' || enc === 'deflate') {
    out.push(
      check({
        id: 'net.brotli',
        category: 'network',
        status: 'info',
        title: 'Pas de Brotli : la page arrive en gzip',
        detail:
          'Brotli réduit le HTML, le CSS et le JavaScript de 15 à 25 % de plus que gzip. Chrome lit aussi zstd, mais Safari non : ses visiteurs téléchargent la version gzip.',
        fix: 'Nginx : module brotli (brotli on; brotli_types text/css application/javascript…). Caddy : écrire des copies .br au build et `file_server { precompressed br }`. Un CDN (Cloudflare) le fait seul.',
        evidence: [`Content-Encoding: ${enc}`],
      }),
    );
  }
  return out;
}
