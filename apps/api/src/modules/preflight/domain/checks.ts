import type { PreflightCheck } from '@devhub/contracts';
import type { RepoFacts, Severity, SiteFacts } from './facts';
import { estimateLoad, formatBytes, formatMs } from './network';

// Règles pures : des faits mesurés aux contrôles du rapport. Chaque correction est rédigée
// pour qu'un agent de codage puisse l'appliquer sans autre contexte.

const KB = 1024;
const MB = 1024 * 1024;

const SECRET_LABELS: Record<string, string> = {
  private_key: 'clé privée',
  aws_access_key: 'clé d’accès AWS',
  github_token: 'jeton GitHub',
  stripe_key: 'clé secrète Stripe',
  anthropic_key: 'clé d’API Anthropic',
  openai_key: 'clé d’API OpenAI',
  slack_token: 'jeton Slack',
};

const check = (c: PreflightCheck): PreflightCheck => ({
  ...c,
  evidence: c.evidence.slice(0, 12),
});

/** Même site : même nom d'hôte, ou sous-domaine du même domaine (cdn.exemple.com pour exemple.com). */
export function sameSite(url: string, page: string): boolean {
  try {
    const root = (h: string) => h.split('.').slice(-2).join('.');
    return root(new URL(url).hostname) === root(new URL(page).hostname);
  } catch {
    return false;
  }
}

const path = (url: string) => {
  try {
    const u = new URL(url);
    return u.pathname + (u.search ? u.search.slice(0, 30) : '');
  } catch {
    return url;
  }
};

export function siteChecks(site: SiteFacts): PreflightCheck[] {
  const out: PreflightCheck[] = [];
  const load = estimateLoad(site);

  // ── Sécurité ──
  if (site.status >= 400) {
    out.push(
      check({
        id: 'site.status',
        category: 'security',
        status: 'fail',
        title: `La page répond ${site.status}`,
        detail: `${site.finalUrl} renvoie le code HTTP ${site.status} : un visiteur ne voit pas l’application.`,
        fix: 'Vérifier que l’application est démarrée et que la route / est servie (fichier index.html, ou route racine du serveur).',
        evidence: [site.finalUrl],
      }),
    );
  }

  out.push(
    site.exposedFiles.length
      ? check({
          id: 'site.exposed_files',
          category: 'security',
          status: 'fail',
          title: 'Fichiers sensibles téléchargeables',
          detail: `N’importe qui peut lire ${site.exposedFiles.join(', ')} sur le site. Ces fichiers contiennent en général des mots de passe, des clés d’API ou l’historique du code.`,
          fix: 'Retirer ces fichiers du dossier servi publiquement (dist/, public/, racine du serveur web), bloquer les chemins commençant par /. dans la configuration du serveur, puis changer TOUS les secrets qu’ils contenaient : ils doivent être considérés comme volés.',
          evidence: site.exposedFiles,
        })
      : check({
          id: 'site.exposed_files',
          category: 'security',
          status: 'pass',
          title: 'Aucun fichier sensible exposé',
          detail: '/.env, /.env.local, /.env.production et /.git/config ne sont pas lisibles.',
          fix: null,
          evidence: [],
        }),
  );

  out.push(
    site.clientSecrets.length
      ? check({
          id: 'site.client_secrets',
          category: 'security',
          status: 'fail',
          title: 'Secret visible dans le JavaScript envoyé au navigateur',
          detail: `Le code téléchargé par chaque visiteur contient : ${[
            ...new Set(site.clientSecrets.map((s) => SECRET_LABELS[s.kind] ?? s.kind)),
          ].join(', ')}. Tout ce qui est dans le bundle front est public.`,
          fix: 'Révoquer immédiatement ces clés chez le fournisseur, puis déplacer les appels qui en ont besoin côté serveur (route d’API ou fonction serverless) et ne garder dans le front que des clés publiques prévues pour cela.',
          evidence: site.clientSecrets.map(
            (s) => `${SECRET_LABELS[s.kind] ?? s.kind} dans ${path(s.file)}`,
          ),
        })
      : check({
          id: 'site.client_secrets',
          category: 'security',
          status: 'pass',
          title: 'Pas de secret dans le JavaScript public',
          detail: `${site.assets.filter((a) => a.type === 'script').length} fichier(s) JavaScript analysé(s) : aucune clé privée, AWS, GitHub, Stripe, OpenAI, Anthropic ou Slack.`,
          fix: null,
          evidence: [],
        }),
  );

  if (site.httpRedirectsToHttps === false) {
    out.push(
      check({
        id: 'site.https_redirect',
        category: 'security',
        status: 'fail',
        title: 'Le site répond aussi en HTTP non chiffré',
        detail:
          'Une visite en http:// n’est pas redirigée vers https:// : les données circulent en clair sur le réseau.',
        fix: 'Rediriger tout le trafic du port 80 vers HTTPS avec une redirection 301 (Caddy le fait par défaut ; avec Nginx : `return 301 https://$host$request_uri;`).',
        evidence: [`http://${new URL(site.finalUrl).host}/`],
      }),
    );
  } else {
    out.push(
      check({
        id: 'site.https_redirect',
        category: 'security',
        status: 'pass',
        title: 'HTTPS imposé',
        detail:
          site.httpRedirectsToHttps === null
            ? 'Le port 80 ne répond pas : le site n’est accessible qu’en HTTPS.'
            : 'Les visites en http:// sont redirigées vers https://.',
        fix: null,
        evidence: [],
      }),
    );
  }

  const h = site.headers;
  const csp = h['content-security-policy'] ?? '';
  const missing = [
    !h['strict-transport-security'] && 'Strict-Transport-Security',
    !csp && 'Content-Security-Policy',
    h['x-content-type-options']?.toLowerCase() !== 'nosniff' && 'X-Content-Type-Options: nosniff',
    !h['x-frame-options'] &&
      !/frame-ancestors/i.test(csp) &&
      'X-Frame-Options (ou frame-ancestors)',
    !h['referrer-policy'] && 'Referrer-Policy',
  ].filter((x): x is string => Boolean(x));
  out.push(
    missing.length
      ? check({
          id: 'site.security_headers',
          category: 'security',
          status: 'warn',
          title: `${missing.length} en-tête(s) de sécurité absent(s)`,
          detail:
            'Ces en-têtes protègent les visiteurs contre l’injection de scripts, l’intégration du site dans une page piégée et les connexions non chiffrées.',
          fix: `Ajouter dans la configuration du serveur web (exemple Caddy) :\nheader {\n  Strict-Transport-Security "max-age=31536000; includeSubDomains"\n  Content-Security-Policy "default-src 'self'; frame-ancestors 'none'"\n  X-Content-Type-Options "nosniff"\n  X-Frame-Options "DENY"\n  Referrer-Policy "strict-origin-when-cross-origin"\n}\nAdapter la Content-Security-Policy aux domaines réellement utilisés (API, polices, images).`,
          evidence: missing,
        })
      : check({
          id: 'site.security_headers',
          category: 'security',
          status: 'pass',
          title: 'En-têtes de sécurité en place',
          detail:
            'HSTS, CSP, nosniff, protection contre l’intégration et Referrer-Policy sont présents.',
          fix: null,
          evidence: [],
        }),
  );

  if (site.sourceMaps.length) {
    out.push(
      check({
        id: 'site.source_maps',
        category: 'security',
        status: 'warn',
        title: 'Code source lisible en production',
        detail:
          'Les cartes de source (.map) sont publiques : le code d’origine, commentaires compris, se lit dans le navigateur.',
        fix: 'Désactiver les cartes de source publiques au build de production (Vite : `build.sourcemap: false` ou `"hidden"` ; webpack : `devtool: false`), ou ne pas déployer les fichiers .map.',
        evidence: site.sourceMaps.map(path),
      }),
    );
  }

  const powered = h['x-powered-by'];
  const server = h.server && /\d/.test(h.server) ? h.server : null;
  if (powered || server) {
    out.push(
      check({
        id: 'site.tech_disclosure',
        category: 'security',
        status: 'warn',
        title: 'Le serveur annonce sa technologie et sa version',
        detail:
          'Ces en-têtes aident un attaquant à cibler les failles connues de la version utilisée.',
        fix: 'Retirer X-Powered-By (Express : `app.disable("x-powered-by")`) et masquer la version du serveur (Nginx : `server_tokens off;`).',
        evidence: [powered && `X-Powered-By: ${powered}`, server && `Server: ${server}`].filter(
          (x): x is string => Boolean(x),
        ),
      }),
    );
  }

  // ── Réseau lent et téléphones ──
  out.push(
    check({
      id: 'net.first_load_3g',
      category: 'network',
      status: load.estimated3gMs <= 5000 ? 'pass' : load.estimated3gMs <= 10_000 ? 'warn' : 'fail',
      title: `Premier affichage en 3G : environ ${formatMs(load.estimated3gMs)}`,
      detail: `Estimation sur le profil « 3G rapide » (1,6 Mbit/s, 562 ms d’aller-retour) : ${formatBytes(load.criticalBytes)} de HTML, CSS et JavaScript à télécharger avant d’afficher la page. Au-delà de 5 s, une bonne partie des visiteurs abandonne.`,
      fix:
        load.estimated3gMs <= 5000
          ? null
          : 'Réduire le JavaScript chargé au démarrage : découper par route (import() dynamique), retirer les bibliothèques lourdes ou inutilisées, charger les composants secondaires après l’affichage, et servir les fichiers compressés (Brotli ou gzip).',
      evidence: [
        `HTML + CSS + JS : ${formatBytes(load.criticalBytes)}`,
        `Requêtes : ${load.requests}`,
        `Temps de réponse du serveur : ${formatMs(site.ttfbMs)}`,
      ],
    }),
  );

  out.push(
    check({
      id: 'net.page_weight',
      category: 'network',
      status: load.totalBytes <= MB ? 'pass' : load.totalBytes <= 2.5 * MB ? 'warn' : 'fail',
      title: `Poids de la page : ${formatBytes(load.totalBytes)}`,
      detail: `Sur un forfait mobile prépayé, chaque mégaoctet compte. Objectif : moins de 1 Mo pour la page d’accueil.${site.assetsSkipped ? ` ${site.assetsSkipped} ressource(s) supplémentaire(s) non mesurée(s) : le poids réel est plus élevé.` : ''}`,
      fix:
        load.totalBytes <= MB
          ? null
          : 'Commencer par les plus gros fichiers listés : compresser les images (WebP ou AVIF, largeur adaptée à l’écran, attribut loading="lazy" sous la ligne de flottaison), puis alléger le JavaScript.',
      evidence: [...site.assets]
        .sort((a, b) => b.bytes - a.bytes)
        .slice(0, 5)
        .map((a) => `${formatBytes(a.bytes)} · ${path(a.url)}`),
    }),
  );

  const own = site.assets.filter((a) => sameSite(a.url, site.finalUrl));
  const uncompressed = [
    ...(site.html.bytes > 10 * KB && !site.html.encoded ? [`${site.finalUrl} (HTML)`] : []),
    ...own
      .filter((a) => (a.type === 'script' || a.type === 'style') && a.bytes > 10 * KB && !a.encoded)
      .map((a) => path(a.url)),
  ];
  out.push(
    uncompressed.length
      ? check({
          id: 'net.compression',
          category: 'network',
          status: 'warn',
          title: 'Fichiers texte envoyés sans compression',
          detail:
            'Le HTML, le CSS et le JavaScript compressés pèsent en général trois à cinq fois moins lourd.',
          fix: 'Activer la compression Brotli et gzip sur le serveur (Caddy : `encode zstd gzip` ; Nginx : `gzip on; gzip_types text/css application/javascript;`).',
          evidence: uncompressed,
        })
      : check({
          id: 'net.compression',
          category: 'network',
          status: 'pass',
          title: 'Compression active',
          detail: 'Les fichiers texte de plus de 10 Ko sont compressés.',
          fix: null,
          evidence: [],
        }),
  );

  const heavyImages = site.assets.filter((a) => a.type === 'image' && a.bytes > 200 * KB);
  if (heavyImages.length) {
    out.push(
      check({
        id: 'net.images',
        category: 'network',
        status: 'warn',
        title: `${heavyImages.length} image(s) de plus de 200 Ko`,
        detail: 'Les images lourdes ralentissent la page et consomment le forfait des visiteurs.',
        fix: 'Convertir en WebP ou AVIF, redimensionner à la taille affichée (srcset), et ajouter loading="lazy" aux images hors du premier écran.',
        evidence: heavyImages.map((a) => `${formatBytes(a.bytes)} · ${path(a.url)}`),
      }),
    );
  }

  // Les scripts tiers (mesure d'audience, widgets) ne dépendent pas de l'auteur du site.
  const statics = own.filter((a) => a.type === 'script' || a.type === 'style');
  const uncached = statics.filter((a) => {
    const m = /max-age=(\d+)/i.exec(a.cacheControl ?? '');
    return !m || Number(m[1]) < 86_400 || /no-store/i.test(a.cacheControl ?? '');
  });
  if (statics.length) {
    out.push(
      uncached.length
        ? check({
            id: 'net.caching',
            category: 'network',
            status: 'warn',
            title: 'Fichiers statiques re-téléchargés à chaque visite',
            detail: `${uncached.length} fichier(s) CSS ou JavaScript n’ont pas de cache d’au moins un jour : un visiteur qui revient paie à nouveau le téléchargement.`,
            fix: 'Servir les fichiers dont le nom contient une empreinte (ex. index-3f9a1c.js) avec `Cache-Control: public, max-age=31536000, immutable`, et garder index.html sans cache long.',
            evidence: uncached.map(
              (a) => `${path(a.url)} · ${a.cacheControl ?? 'aucun Cache-Control'}`,
            ),
          })
        : check({
            id: 'net.caching',
            category: 'network',
            status: 'pass',
            title: 'Cache navigateur en place',
            detail: 'Le CSS et le JavaScript sont mis en cache au moins un jour.',
            fix: null,
            evidence: [],
          }),
    );
  }

  out.push(
    site.html.hasViewport
      ? check({
          id: 'net.mobile_viewport',
          category: 'network',
          status: 'pass',
          title: 'Page adaptée aux téléphones',
          detail: 'La balise viewport est présente.',
          fix: null,
          evidence: [],
        })
      : check({
          id: 'net.mobile_viewport',
          category: 'network',
          status: 'fail',
          title: 'Page non adaptée aux téléphones',
          detail: 'Sans balise viewport, le téléphone affiche la version ordinateur en tout petit.',
          fix: 'Ajouter dans le <head> : <meta name="viewport" content="width=device-width, initial-scale=1">',
          evidence: [],
        }),
  );

  out.push(
    check({
      id: 'net.server_response',
      category: 'network',
      status: site.ttfbMs <= 800 ? 'pass' : site.ttfbMs <= 1800 ? 'warn' : 'fail',
      title: `Réponse du serveur : ${formatMs(site.ttfbMs)}`,
      detail:
        'Temps entre la requête et le premier octet de la page, mesuré depuis le serveur de DevHub.',
      fix:
        site.ttfbMs <= 800
          ? null
          : 'Mettre en cache le rendu de la page, vérifier les requêtes lentes à la base de données, ou héberger plus près des visiteurs (Systalink : centre de données à Dakar).',
      evidence: site.redirects.length ? [`Redirections : ${site.redirects.join(' → ')}`] : [],
    }),
  );

  // ── Hébergement ──
  out.push(
    site.hostedOnSystalink
      ? check({
          id: 'host.systalink',
          category: 'hosting',
          status: 'pass',
          title: 'Hébergé chez Systalink',
          detail:
            'L’adresse IP du site appartient au réseau de Systalink : données et visiteurs restent sur le continent.',
          fix: null,
          evidence: site.hostIps,
        })
      : check({
          id: 'host.systalink',
          category: 'hosting',
          status: 'info',
          title: 'Hébergé hors de Systalink',
          detail:
            'Héberger en Afrique (Systalink, Dakar) rapproche l’application de ses visiteurs et réduit le temps de réponse.',
          fix: 'Déployer sur un serveur ou une offre serverless Systalink : https://platform.systalink.com/serverless',
          evidence: site.hostIps,
        }),
  );

  return out;
}

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 4,
  high: 3,
  moderate: 2,
  low: 1,
  unknown: 0,
};
const SEVERITY_LABEL: Record<Severity, string> = {
  critical: 'critique',
  high: 'élevée',
  moderate: 'moyenne',
  low: 'faible',
  unknown: 'non précisée',
};

export function isStrongCopyleft(licence: string): boolean {
  return /\b(A?GPL|EUPL|OSL|SSPL)/i.test(licence) && !/\bLGPL/i.test(licence);
}

export function repoChecks(repo: RepoFacts): PreflightCheck[] {
  const out: PreflightCheck[] = [];

  out.push(
    repo.committedSecretFiles.length
      ? check({
          id: 'repo.committed_secrets',
          category: 'security',
          status: 'fail',
          title: 'Fichiers de secrets publiés dans le dépôt',
          detail: `${repo.committedSecretFiles.length} fichier(s) qui contiennent d’habitude des secrets sont dans le dépôt public, donc lisibles par tout le monde.`,
          fix: 'Changer les secrets concernés chez chaque fournisseur, supprimer les fichiers du dépôt (`git rm --cached <fichier>`), les ajouter au .gitignore et ne publier qu’un .env.example sans valeurs. L’historique Git les garde : purger avec git filter-repo si nécessaire.',
          evidence: repo.committedSecretFiles,
        })
      : check({
          id: 'repo.committed_secrets',
          category: 'security',
          status: 'pass',
          title: 'Aucun fichier de secrets dans le dépôt',
          detail: `Pas de .env, de clé privée ni de fichier d’identifiants dans ${repo.treeTruncated ? 'la partie analysée de ' : ''}l’arborescence.`,
          fix: null,
          evidence: [],
        }),
  );

  if (!repo.manifest && !repo.lockfile) {
    out.push(
      check({
        id: 'deps.vulnerabilities',
        category: 'dependencies',
        status: 'info',
        title: 'Dépendances non analysées',
        detail:
          'Aucun package.json, fichier de verrouillage npm, pnpm, Yarn ou requirements.txt trouvé.',
        fix: null,
        evidence: [],
      }),
    );
  } else if (repo.vulnLookupFailed) {
    out.push(
      check({
        id: 'deps.vulnerabilities',
        category: 'dependencies',
        status: 'info',
        title: 'Base de failles injoignable',
        detail: 'La base OSV n’a pas répondu : relancer le pré-vol dans quelques minutes.',
        fix: null,
        evidence: [],
      }),
    );
  } else {
    const worst = repo.vulnerable.reduce((w, v) => Math.max(w, SEVERITY_RANK[v.severity]), 0);
    out.push(
      repo.vulnerable.length
        ? check({
            id: 'deps.vulnerabilities',
            category: 'dependencies',
            status: worst >= SEVERITY_RANK.high ? 'fail' : 'warn',
            title: `${repo.vulnerable.length} dépendance(s) avec des failles connues`,
            detail: `Sur ${repo.dependencies} dépendances (${repo.lockfile ?? repo.manifest}), d’après la base OSV.${repo.approximateVersions ? ' Versions déduites de package.json, sans fichier de verrouillage : résultat approximatif.' : ''}`,
            fix: 'Mettre à jour chaque paquet listé vers la version corrigée indiquée (`npm install <paquet>@<version>` ou équivalent), relancer les tests, puis relancer le pré-vol. Pour une dépendance indirecte, mettre à jour le paquet qui l’importe ou utiliser `overrides` (npm) / `pnpm.overrides`.',
            evidence: [...repo.vulnerable]
              .sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity])
              .map(
                (v) =>
                  `${v.name}@${v.version} · gravité ${SEVERITY_LABEL[v.severity]}${v.fixedIn ? ` · corrigé en ${v.fixedIn}` : ''} · ${v.ids.slice(0, 2).join(', ')}${v.summary ? ` · ${v.summary.slice(0, 90)}` : ''}`,
              ),
          })
        : check({
            id: 'deps.vulnerabilities',
            category: 'dependencies',
            status: 'pass',
            title: 'Aucune faille connue dans les dépendances',
            detail: `${repo.dependencies} dépendances vérifiées dans la base OSV (${repo.lockfile ?? repo.manifest}).`,
            fix: null,
            evidence: [],
          }),
    );
  }

  if (repo.manifest && !repo.lockfile && repo.ecosystems.includes('npm')) {
    out.push(
      check({
        id: 'deps.lockfile',
        category: 'dependencies',
        status: 'warn',
        title: 'Pas de fichier de verrouillage',
        detail:
          'Sans package-lock.json, pnpm-lock.yaml ou yarn.lock, chaque installation peut récupérer des versions différentes, y compris compromises.',
        fix: 'Lancer `npm install` (ou pnpm, yarn) et committer le fichier de verrouillage généré.',
        evidence: [repo.manifest],
      }),
    );
  }

  out.push(
    !repo.licence
      ? check({
          id: 'lic.repo',
          category: 'licences',
          status: 'warn',
          title: 'Le dépôt n’a pas de licence',
          detail:
            'Sans licence, personne n’a légalement le droit de réutiliser, modifier ou contribuer au code, même public.',
          fix: 'Ajouter un fichier LICENSE à la racine (MIT ou Apache-2.0 pour un projet ouvert et réutilisable).',
          evidence: [],
        })
      : check({
          id: 'lic.repo',
          category: 'licences',
          status: isStrongCopyleft(repo.licence) ? 'info' : 'pass',
          title: `Licence du dépôt : ${repo.licence}`,
          detail: isStrongCopyleft(repo.licence)
            ? 'Licence copyleft : toute version modifiée et distribuée doit être publiée sous la même licence. Certains concours et entreprises l’interdisent.'
            : 'Licence détectée par GitHub.',
          fix: null,
          evidence: [],
        }),
  );

  if (repo.ecosystems.includes('npm')) {
    const strong = repo.copyleftDependencies.filter((d) => isStrongCopyleft(d.licence));
    const weak = repo.copyleftDependencies.filter((d) => !isStrongCopyleft(d.licence));
    if (repo.licenceLookupFailed) {
      out.push(
        check({
          id: 'lic.dependencies',
          category: 'licences',
          status: 'info',
          title: 'Licences des dépendances non vérifiées',
          detail: 'Le registre npm n’a pas répondu.',
          fix: null,
          evidence: [],
        }),
      );
    } else if (repo.licencesChecked) {
      out.push(
        strong.length
          ? check({
              id: 'lic.dependencies',
              category: 'licences',
              status: 'warn',
              title: `${strong.length} dépendance(s) sous licence copyleft forte`,
              detail:
                'GPL, AGPL et licences proches imposent de publier votre propre code sous la même licence dès que vous distribuez l’application (et, pour l’AGPL, dès qu’elle est accessible en ligne).',
              fix: 'Remplacer ces paquets par des équivalents sous licence permissive (MIT, Apache-2.0, BSD, ISC), ou vérifier que leurs conditions sont compatibles avec votre projet.',
              evidence: strong.map((d) => `${d.name} · ${d.licence}`),
            })
          : check({
              id: 'lic.dependencies',
              category: 'licences',
              status: weak.length ? 'info' : 'pass',
              title: weak.length
                ? 'Dépendances sous copyleft faible uniquement'
                : 'Licences des dépendances compatibles',
              detail: weak.length
                ? 'LGPL, MPL ou équivalent : utilisables sans publier votre code, à condition de ne pas modifier ces paquets eux-mêmes.'
                : `${repo.licencesChecked} dépendance(s) directe(s) vérifiée(s) : aucune licence GPL ou AGPL.`,
              fix: null,
              evidence: weak.map((d) => `${d.name} · ${d.licence}`),
            }),
      );
    }
  }

  if (repo.archived) {
    out.push(
      check({
        id: 'repo.archived',
        category: 'dependencies',
        status: 'info',
        title: 'Dépôt archivé',
        detail: 'Le dépôt est en lecture seule sur GitHub.',
        fix: null,
        evidence: [],
      }),
    );
  }

  return out;
}

export const siteUnreachableCheck = (url: string, reason: string): PreflightCheck => ({
  id: 'site.unreachable',
  category: 'security',
  status: 'fail',
  title: 'Application injoignable',
  detail: `${url} n’a pas répondu (${reason}). Le pré-vol n’analyse que les adresses publiques en HTTPS.`,
  fix: 'Vérifier que l’application est en ligne, que le nom de domaine pointe vers le bon serveur et que le certificat HTTPS est valide.',
  evidence: [url],
});
