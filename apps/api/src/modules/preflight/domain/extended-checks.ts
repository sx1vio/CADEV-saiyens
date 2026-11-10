import type { PreflightArchitecture, PreflightCheck } from '@devhub/contracts';
import type { DomainFacts, ProjectFacts, SiteFacts } from './facts';
import { estimateLoad, formatBytes } from './network';
import { dataCostFcfa, FCFA_PER_GB } from './page';

// Pré-vol v2 (10/11/2026) : contrôles mesurés de l'extérieur (domaine, en-têtes, cookies, CORS,
// bases ouvertes, référencement, vie privée) et lus dans le dépôt (historique, registre npm,
// Docker, runtime, architecture). Même contrat que checks.ts : une correction applicable telle
// quelle par un agent de codage.

type C = PreflightCheck;
const check = (c: C): C => ({ ...c, evidence: c.evidence.slice(0, 12) });
const ok = (id: string, category: C['category'], title: string, detail: string): C =>
  check({ id, category, status: 'pass', title, detail, fix: null, evidence: [] });
const fr = (n: number) => n.toLocaleString('fr-FR');

const SECRET_LABEL: Record<string, string> = {
  private_key: 'clé privée',
  aws_access_key: 'clé AWS',
  github_token: 'jeton GitHub',
  stripe_key: 'clé Stripe',
  anthropic_key: 'clé Anthropic',
  openai_key: 'clé OpenAI',
  slack_token: 'jeton Slack',
  connection_string: 'mot de passe de base de données',
};

/* ═══════════════════════════ Domaine : TLS et DNS ═══════════════════════════ */

export function domainChecks(d: DomainFacts): C[] {
  const out: C[] = [];
  const t = d.tls;
  if (t) {
    if (!t.authorized) {
      out.push(
        check({
          id: 'tls.invalid',
          category: 'infra',
          status: 'fail',
          title: 'Certificat HTTPS refusé par les navigateurs',
          detail: `Le certificat présenté pour ${d.host} n’est pas valide (${t.authError ?? 'chaîne incomplète'}) : les visiteurs voient une alerte de sécurité.`,
          fix: 'Servir la chaîne complète (certificat + intermédiaires) et un certificat qui couvre exactement ce nom d’hôte. Avec Caddy ou Certbot (Let’s Encrypt), le renouvellement et la chaîne sont automatiques.',
          evidence: [t.authError ?? 'non reconnu'],
        }),
      );
    }
    if (t.daysLeft !== null) {
      out.push(
        t.daysLeft < 14
          ? check({
              id: 'tls.expiry',
              category: 'infra',
              status: t.daysLeft < 0 ? 'fail' : 'warn',
              title:
                t.daysLeft < 0
                  ? 'Certificat HTTPS expiré'
                  : `Le certificat expire dans ${t.daysLeft} jour(s)`,
              detail: `Expiration le ${t.validTo?.slice(0, 10)} (${t.issuer ?? 'émetteur inconnu'}). Passé cette date, le site est bloqué par les navigateurs.`,
              fix: 'Vérifier que le renouvellement automatique tourne (Caddy le fait seul ; avec Certbot : `certbot renew --dry-run` et la tâche planifiée) et que le port 80 reste ouvert pour la validation.',
              evidence: [t.validTo ?? ''],
            })
          : ok(
              'tls.expiry',
              'infra',
              `Certificat valide encore ${t.daysLeft} jours`,
              `Émis par ${t.issuer ?? '—'}, expire le ${t.validTo?.slice(0, 10)}.`,
            ),
      );
    }
    out.push(
      t.legacyProtocols.length
        ? check({
            id: 'tls.legacy',
            category: 'infra',
            status: 'warn',
            title: 'Anciennes versions de TLS acceptées',
            detail: `Le serveur accepte encore ${t.legacyProtocols.join(', ')}, abandonnées depuis 2020 pour leurs failles. Aucun navigateur récent n’en a besoin.`,
            fix: 'N’autoriser que TLS 1.2 et 1.3. Nginx : `ssl_protocols TLSv1.2 TLSv1.3;` ; Apache : `SSLProtocol -all +TLSv1.2 +TLSv1.3` ; Caddy le fait par défaut.',
            evidence: t.legacyProtocols,
          })
        : ok(
            'tls.legacy',
            'infra',
            `Seulement TLS moderne (${t.protocol ?? 'TLS 1.2+'})`,
            'TLS 1.0 et 1.1 sont refusés.',
          ),
    );
    out.push(
      t.alpn === 'h2'
        ? ok(
            'net.http2',
            'network',
            'HTTP/2 activé',
            'Les fichiers se chargent en parallèle sur une seule connexion : précieux sur un réseau mobile lent.',
          )
        : check({
            id: 'net.http2',
            category: 'network',
            status: 'warn',
            title: 'Pas de HTTP/2',
            detail:
              'Le serveur ne parle que HTTP/1.1 : chaque fichier attend son tour, ce qui pèse lourd en 3G où chaque aller-retour coûte 300 à 600 ms.',
            fix: 'Activer HTTP/2 : Nginx `listen 443 ssl http2;` (ou `http2 on;`), Apache `Protocols h2 http/1.1` ; Caddy l’active par défaut.',
            evidence: [t.alpn ?? 'http/1.1'],
          }),
    );
    if (t.coversWww === false && d.dns.wwwResolves) {
      out.push(
        check({
          id: 'tls.www',
          category: 'infra',
          status: 'warn',
          title: `www.${d.apex} n’est pas couvert par le certificat`,
          detail:
            'Le nom www. pointe vers le serveur, mais le certificat ne le couvre pas : un visiteur qui tape www. voit une alerte.',
          fix: `Ajouter www.${d.apex} au certificat (Caddy : déclarer \`www.${d.apex}\` et rediriger vers le domaine nu ; Certbot : \`-d ${d.apex} -d www.${d.apex}\`).`,
          evidence: [`www.${d.apex}`],
        }),
      );
    }
  }

  const dns = d.dns;
  out.push(
    dns.ipv6.length
      ? ok(
          'dns.ipv6',
          'infra',
          'Joignable en IPv6',
          `${dns.ipv6.length} adresse(s) IPv6 : les réseaux mobiles qui passent en IPv6 accèdent directement au site.`,
        )
      : check({
          id: 'dns.ipv6',
          category: 'infra',
          status: 'info',
          title: 'Pas d’adresse IPv6',
          detail:
            'Le site n’a qu’une adresse IPv4. De plus en plus d’opérateurs mobiles africains passent en IPv6 ; sans AAAA, leur trafic transite par une traduction d’adresses plus lente.',
          fix: 'Ajouter un enregistrement AAAA vers l’adresse IPv6 du serveur (la plupart des VPS en ont une) et ouvrir le port 443 en IPv6 dans le pare-feu.',
          evidence: dns.ipv4,
        }),
  );
  if (dns.wwwResolves === false) {
    out.push(
      check({
        id: 'dns.www',
        category: 'infra',
        status: 'warn',
        title: `www.${d.apex} ne mène nulle part`,
        detail: 'Beaucoup de gens tapent encore « www. » : ils tombent sur une erreur.',
        fix: `Créer un enregistrement A (ou CNAME) pour www.${d.apex} vers le même serveur, puis le rediriger vers ${d.apex}.`,
        evidence: [`www.${d.apex}`],
      }),
    );
  }
  out.push(
    dns.caa.length
      ? ok(
          'dns.caa',
          'infra',
          'Autorités de certification restreintes (CAA)',
          `Seules ${dns.caa.join(', ')} peuvent émettre un certificat pour ce domaine.`,
        )
      : check({
          id: 'dns.caa',
          category: 'infra',
          status: 'info',
          title: 'Aucune restriction CAA',
          detail:
            'N’importe quelle autorité peut émettre un certificat pour ce domaine. Un enregistrement CAA réduit le risque de certificat frauduleux.',
          fix: `Ajouter dans le DNS : ${d.apex}. CAA 0 issue "letsencrypt.org" (adapter à l’autorité réellement utilisée).`,
          evidence: [],
        }),
  );

  // E-mails : usurpation du domaine et délivrabilité des e-mails transactionnels.
  const sendsMail = dns.mx.length > 0;
  out.push(
    dns.spf
      ? /[-~]all\b/.test(dns.spf)
        ? ok('mail.spf', 'infra', 'SPF en place', dns.spf)
        : check({
            id: 'mail.spf',
            category: 'infra',
            status: 'warn',
            title: 'SPF trop permissif',
            detail: `L’enregistrement SPF se termine par « +all » ou « ?all » : il n’empêche personne d’envoyer au nom du domaine.`,
            fix: 'Terminer l’enregistrement SPF par `-all` (refus) ou `~all` (suspect), après avoir listé tous les services qui envoient vraiment (ex. `include:_spf.google.com`).',
            evidence: [dns.spf],
          })
      : check({
          id: 'mail.spf',
          category: 'infra',
          status: 'warn',
          title: 'Pas d’enregistrement SPF',
          detail: sendsMail
            ? 'Sans SPF, les e-mails envoyés par l’application (inscription, mot de passe oublié) finissent souvent en indésirables, et n’importe qui peut envoyer au nom du domaine.'
            : 'Le domaine ne reçoit pas d’e-mails, mais sans SPF n’importe qui peut en envoyer en se faisant passer pour lui (hameçonnage).',
          fix: sendsMail
            ? `Ajouter un TXT sur ${d.apex} : "v=spf1 include:<service d’envoi> -all" (ex. include:_spf.google.com pour Google Workspace, include:spf.resend.com pour Resend).`
            : `Ajouter un TXT sur ${d.apex} : "v=spf1 -all" (le domaine n’envoie aucun e-mail).`,
          evidence: [],
        }),
  );
  out.push(
    dns.dmarc
      ? /p=(reject|quarantine)/i.test(dns.dmarc)
        ? ok('mail.dmarc', 'infra', 'DMARC protège le domaine', dns.dmarc)
        : check({
            id: 'mail.dmarc',
            category: 'infra',
            status: 'info',
            title: 'DMARC en observation seulement',
            detail:
              'La politique DMARC est « p=none » : les e-mails usurpés sont signalés mais toujours délivrés.',
            fix: 'Après quelques semaines de rapports sans faux positif, passer à `p=quarantine` puis `p=reject`.',
            evidence: [dns.dmarc],
          })
      : check({
          id: 'mail.dmarc',
          category: 'infra',
          status: 'warn',
          title: 'Pas de DMARC',
          detail:
            'Gmail et Yahoo exigent DMARC des expéditeurs depuis 2024 ; sans lui, les e-mails de l’application risquent d’être refusés, et le domaine peut être usurpé.',
          fix: `Ajouter un TXT sur _dmarc.${d.apex} : "v=DMARC1; p=quarantine; rua=mailto:dmarc@${d.apex}" (p=reject si le domaine n’envoie jamais d’e-mail).`,
          evidence: [],
        }),
  );
  if (sendsMail) {
    out.push(
      dns.dkimSelectors.length
        ? ok(
            'mail.dkim',
            'infra',
            'Signature DKIM trouvée',
            `Sélecteur(s) : ${dns.dkimSelectors.join(', ')}.`,
          )
        : check({
            id: 'mail.dkim',
            category: 'infra',
            status: 'info',
            title: 'Aucune signature DKIM trouvée',
            detail:
              'Aucun sélecteur DKIM courant ne répond. S’il en existe un autre, ignorer ; sinon les e-mails ne sont pas signés.',
            fix: 'Activer DKIM chez le service d’envoi (Google Workspace, Microsoft 365, Resend, Mailgun…) et publier l’enregistrement TXT qu’il fournit.',
            evidence: [],
          }),
    );
  }
  return out;
}

/* ═══════════════════════════ Site : sécurité, référencement, vie privée ═══════════════════════════ */

export function siteExtraChecks(site: SiteFacts): C[] {
  const x = site.extra;
  if (!x) return [];
  const out: C[] = [];
  const h = site.headers;
  const p = x.page;

  // ── Sécurité ──
  const csp = h['content-security-policy'];
  if (csp) {
    const weak = [
      /'unsafe-eval'/.test(csp) && "'unsafe-eval'",
      /script-src[^;]*'unsafe-inline'/.test(csp) &&
        !/'nonce-|'strict-dynamic'/.test(csp) &&
        "'unsafe-inline' dans script-src",
      /(script-src|default-src)[^;]*\s\*(\s|;|$)/.test(csp) && 'joker * pour les scripts',
      !/frame-ancestors/.test(csp) && !h['x-frame-options'] && 'pas de frame-ancestors',
    ].filter((w): w is string => typeof w === 'string');
    out.push(
      weak.length
        ? check({
            id: 'site.csp_quality',
            category: 'security',
            status: 'warn',
            title: 'Content-Security-Policy trop permissive',
            detail:
              'La CSP existe mais laisse passer l’injection de scripts : elle ne protège presque plus.',
            fix: "Retirer 'unsafe-eval' et 'unsafe-inline' des scripts (utiliser des nonces ou 'strict-dynamic'), remplacer * par les domaines réellement utilisés et ajouter frame-ancestors 'none'.",
            evidence: weak,
          })
        : ok(
            'site.csp_quality',
            'security',
            'CSP stricte',
            'Pas d’eval, pas de script inline sans nonce, pas de joker.',
          ),
    );
  }
  const hsts = h['strict-transport-security'];
  if (hsts) {
    const age = Number(/max-age=(\d+)/i.exec(hsts)?.[1] ?? 0);
    if (age < 15_552_000)
      out.push(
        check({
          id: 'site.hsts_quality',
          category: 'security',
          status: 'warn',
          title: 'HSTS trop court',
          detail: `max-age=${fr(age)} s (moins de 6 mois) : le navigateur oublie vite qu’il doit rester en HTTPS.`,
          fix: 'Strict-Transport-Security: max-age=31536000; includeSubDomains',
          evidence: [hsts],
        }),
      );
  }
  if (!h['permissions-policy']) {
    out.push(
      check({
        id: 'site.permissions_policy',
        category: 'security',
        status: 'info',
        title: 'Pas de Permissions-Policy',
        detail: 'Un script tiers compromis pourrait demander la caméra, le micro ou la position.',
        fix: 'Ajouter : Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=() (en autorisant seulement ce que l’application utilise).',
        evidence: [],
      }),
    );
  }

  if (x.cors) {
    const bad = (x.cors.reflected || x.cors.allowOrigin === '*') && x.cors.allowCredentials;
    out.push(
      bad
        ? check({
            id: 'site.cors',
            category: 'security',
            status: 'fail',
            title: 'CORS ouvert à tous avec les cookies',
            detail:
              'Le serveur renvoie l’origine de n’importe quel site avec Access-Control-Allow-Credentials: true : une page piégée peut lire les données d’un visiteur connecté.',
            fix: 'Ne jamais renvoyer l’en-tête Origin tel quel : comparer à une liste blanche (origines de l’application) et ne mettre Allow-Credentials que pour elles.',
            evidence: [
              `Access-Control-Allow-Origin: ${x.cors.allowOrigin}`,
              'Access-Control-Allow-Credentials: true',
            ],
          })
        : x.cors.reflected
          ? check({
              id: 'site.cors',
              category: 'security',
              status: 'warn',
              title: 'CORS renvoie n’importe quelle origine',
              detail:
                'Le serveur accepte les requêtes de tous les sites. Sans cookies c’est moins grave, mais une API privée ne devrait répondre qu’à ses propres origines.',
              fix: 'Remplacer le renvoi de l’en-tête Origin par une liste blanche explicite.',
              evidence: [`Access-Control-Allow-Origin: ${x.cors.allowOrigin}`],
            })
          : ok(
              'site.cors',
              'security',
              'CORS fermé aux sites inconnus',
              'Une origine étrangère n’obtient pas l’autorisation de lire les réponses.',
            ),
    );
  }

  const weakCookies = x.cookies.filter((c) => !c.secure || !c.httpOnly || !c.sameSite);
  if (x.cookies.length) {
    out.push(
      weakCookies.length
        ? check({
            id: 'site.cookies',
            category: 'security',
            status: weakCookies.some(
              (c) => /sess|token|auth|sid|jwt/i.test(c.name) && (!c.httpOnly || !c.secure),
            )
              ? 'fail'
              : 'warn',
            title: `${weakCookies.length} cookie(s) mal protégé(s)`,
            detail:
              'Sans Secure, le cookie peut partir en clair ; sans HttpOnly, un script injecté peut le voler ; sans SameSite, il suit les requêtes venues d’autres sites.',
            fix: 'Poser les cookies avec `Secure; HttpOnly; SameSite=Lax` (Strict pour une session d’administration).',
            evidence: weakCookies.map(
              (c) =>
                `${c.name} : ${[!c.secure && 'Secure', !c.httpOnly && 'HttpOnly', !c.sameSite && 'SameSite'].filter(Boolean).join(', ')} manquant`,
            ),
          })
        : ok(
            'site.cookies',
            'security',
            'Cookies bien protégés',
            `${x.cookies.length} cookie(s) : Secure, HttpOnly et SameSite.`,
          ),
    );
  }

  if (x.openFirebase.length) {
    out.push(
      check({
        id: 'site.firebase_open',
        category: 'security',
        status: 'fail',
        title: 'Base Firebase lisible par tout le monde',
        detail:
          'L’adresse de la base Realtime Database est dans le JavaScript, et elle répond sans authentification : n’importe qui peut télécharger toutes les données.',
        fix: 'Dans la console Firebase, règles de la Realtime Database : remplacer `".read": true` par des règles qui exigent `auth != null` et limitent chaque utilisateur à ses propres données ; vérifier aussi les règles d’écriture.',
        evidence: x.openFirebase,
      }),
    );
  } else if (x.firebaseChecked) {
    out.push(
      ok(
        'site.firebase_open',
        'security',
        'Base Firebase protégée',
        'La Realtime Database trouvée dans le code refuse la lecture anonyme.',
      ),
    );
  }
  if (x.graphqlIntrospection) {
    out.push(
      check({
        id: 'site.graphql_introspection',
        category: 'security',
        status: 'warn',
        title: 'Schéma GraphQL public',
        detail: `${x.graphqlIntrospection} répond à l’introspection : tout le schéma (types, mutations, champs internes) est lisible par un attaquant.`,
        fix: 'Désactiver l’introspection en production (Apollo : `introspection: false` ; graphql-yoga : plugin `useDisableIntrospection`).',
        evidence: [x.graphqlIntrospection],
      }),
    );
  }
  if (x.directoryListing.length) {
    out.push(
      check({
        id: 'site.directory_listing',
        category: 'security',
        status: 'fail',
        title: 'Liste des fichiers visible',
        detail:
          'Ces dossiers affichent tout leur contenu : fichiers envoyés par les utilisateurs, sauvegardes, documents internes.',
        fix: 'Désactiver l’index automatique (Nginx `autoindex off;`, Apache `Options -Indexes`).',
        evidence: x.directoryListing,
      }),
    );
  }
  if (x.notFound) {
    if (x.notFound.leak) {
      out.push(
        check({
          id: 'site.error_leak',
          category: 'security',
          status: 'fail',
          title: 'Les pages d’erreur révèlent l’intérieur du serveur',
          detail: `Une adresse inexistante affiche une ${x.notFound.leak} : chemins, versions et requêtes deviennent visibles.`,
          fix: 'Désactiver le mode debug en production (DEBUG=False, APP_DEBUG=false, NODE_ENV=production) et servir une page 404 générique.',
          evidence: [x.notFound.leak],
        }),
      );
    }
    if (x.notFound.status === 200) {
      out.push(
        check({
          id: 'seo.soft_404',
          category: 'seo',
          status: 'info',
          title: 'Les pages inexistantes répondent 200',
          detail:
            'Une adresse qui n’existe pas renvoie le code 200 (normal pour une application monopage) : Google peut indexer des pages vides.',
          fix: 'Pour les routes inconnues, renvoyer 404 côté serveur, ou ajouter `<meta name="robots" content="noindex">` sur la page « introuvable » de l’application.',
          evidence: [],
        }),
      );
    }
  }
  if (x.apiDocs.length) {
    out.push(
      check({
        id: 'site.api_docs',
        category: 'security',
        status: 'info',
        title: 'Documentation d’API publique',
        detail:
          'La documentation Swagger/OpenAPI est accessible à tous. Normal pour une API publique ; sinon elle décrit toutes les routes à un attaquant.',
        fix: 'Si l’API est privée : servir la documentation seulement en développement ou derrière une authentification.',
        evidence: x.apiDocs,
      }),
    );
  }
  if (p.mixedContent.length) {
    out.push(
      check({
        id: 'site.mixed_content',
        category: 'security',
        status: 'fail',
        title: 'Contenu chargé en HTTP sur une page HTTPS',
        detail:
          'Les navigateurs bloquent ces fichiers (la page casse) ou affichent un cadenas barré.',
        fix: 'Remplacer http:// par https:// (ou par un chemin relatif) pour chacune de ces ressources.',
        evidence: p.mixedContent,
      }),
    );
  }
  if (p.insecureForms) {
    out.push(
      check({
        id: 'site.insecure_form',
        category: 'security',
        status: 'fail',
        title: 'Mot de passe envoyé en clair',
        detail: `${p.insecureForms} formulaire(s) avec un champ mot de passe envoient vers une adresse http://.`,
        fix: 'Faire pointer l’attribut action du formulaire vers https:// (ou un chemin relatif sur un site en HTTPS).',
        evidence: [],
      }),
    );
  }
  if (p.withoutIntegrity.length) {
    out.push(
      check({
        id: 'site.sri',
        category: 'security',
        status: 'warn',
        title: 'Scripts tiers sans vérification d’intégrité',
        detail:
          'Si ce CDN est piraté, le script modifié s’exécute chez tous les visiteurs. L’attribut integrity (SRI) bloque toute version altérée.',
        fix: 'Ajouter integrity="sha384-…" et crossorigin="anonymous" à ces balises (srihash.org calcule l’empreinte), ou servir ces fichiers depuis l’application elle-même.',
        evidence: p.withoutIntegrity,
      }),
    );
  }
  if (x.tokenInLocalStorage) {
    out.push(
      check({
        id: 'site.token_storage',
        category: 'security',
        status: 'warn',
        title: 'Jeton de connexion rangé dans localStorage',
        detail:
          'Le JavaScript enregistre un jeton (token, jwt, auth) dans localStorage : la moindre faille XSS permet de le voler et de se connecter à la place du visiteur.',
        fix: 'Garder la session dans un cookie HttpOnly; Secure; SameSite=Lax posé par le serveur, que le JavaScript ne peut pas lire.',
        evidence: [],
      }),
    );
  }
  out.push(
    x.securityTxt
      ? ok(
          'site.security_txt',
          'security',
          'security.txt présent',
          'Un chercheur qui trouve une faille sait qui prévenir.',
        )
      : check({
          id: 'site.security_txt',
          category: 'security',
          status: 'info',
          title: 'Pas de security.txt',
          detail: 'Un chercheur qui trouve une faille ne sait pas à qui la signaler.',
          fix: 'Créer /.well-known/security.txt avec au moins :\nContact: mailto:securite@votre-domaine\nExpires: 2027-12-31T23:59:59Z',
          evidence: [],
        }),
  );

  // ── Référencement et partage ──
  const desc = p.description;
  out.push(
    !desc
      ? check({
          id: 'seo.description',
          category: 'seo',
          status: 'warn',
          title: 'Pas de meta description',
          detail:
            'Google invente un extrait au hasard de la page, et le lien partagé n’a pas de texte.',
          fix: 'Ajouter dans <head> : <meta name="description" content="Ce que fait l’application, pour qui, en 150 caractères.">',
          evidence: [],
        })
      : desc.length < 50 || desc.length > 170
        ? check({
            id: 'seo.description',
            category: 'seo',
            status: 'info',
            title: `Description de ${desc.length} caractères`,
            detail:
              'Idéalement entre 50 et 160 caractères : trop courte elle ne dit rien, trop longue Google la coupe.',
            fix: 'Réécrire la meta description en une phrase de 120 à 160 caractères.',
            evidence: [desc.slice(0, 180)],
          })
        : ok('seo.description', 'seo', 'Meta description', desc),
  );
  const title = site.html.title;
  if (!title || title.length < 10 || title.length > 65) {
    out.push(
      check({
        id: 'seo.title',
        category: 'seo',
        status: title ? 'info' : 'warn',
        title: title ? `Titre de ${title.length} caractères` : 'Page sans titre',
        detail:
          'Le titre est la ligne bleue de Google et le nom de l’onglet : idéalement 30 à 60 caractères.',
        fix: 'Mettre un <title> du type « Nom — ce que fait l’application » (30 à 60 caractères).',
        evidence: title ? [title] : [],
      }),
    );
  }
  const ogMissing = ['title', 'description', 'image'].filter((k) => !p.og[k]);
  out.push(
    ogMissing.length
      ? check({
          id: 'seo.open_graph',
          category: 'seo',
          status: ogMissing.includes('image') ? 'warn' : 'info',
          title: 'Aperçu de partage incomplet',
          detail:
            'Partagé sur WhatsApp, LinkedIn, Facebook ou X, le lien s’affiche sans image ni description : beaucoup moins de clics.',
          fix: `Ajouter dans <head> :\n<meta property="og:title" content="…">\n<meta property="og:description" content="…">\n<meta property="og:image" content="https://…/apercu-1200x630.png">\n<meta name="twitter:card" content="summary_large_image">`,
          evidence: ogMissing.map((k) => `og:${k} manquant`),
        })
      : ok(
          'seo.open_graph',
          'seo',
          'Aperçu de partage complet',
          'Titre, description et image Open Graph : le lien est beau sur WhatsApp et LinkedIn.',
        ),
  );
  if (!p.canonical) {
    out.push(
      check({
        id: 'seo.canonical',
        category: 'seo',
        status: 'info',
        title: 'Pas d’URL canonique',
        detail:
          'Les variantes de l’adresse (avec ou sans www, paramètres) peuvent être vues comme des pages en double.',
        fix: '<link rel="canonical" href="https://votre-domaine/"> sur chaque page, avec son adresse définitive.',
        evidence: [],
      }),
    );
  }
  out.push(
    x.robots.present
      ? x.robots.disallowAll || /noindex/i.test(p.robotsMeta ?? '')
        ? check({
            id: 'seo.robots',
            category: 'seo',
            status: 'fail',
            title: 'Le site interdit l’indexation',
            detail:
              'robots.txt (Disallow: /) ou la balise robots (noindex) demande à Google de ne pas référencer le site. Souvent oublié après la préproduction.',
            fix: 'En production, robots.txt doit autoriser l’exploration (User-agent: *\\nAllow: /\\nSitemap: https://…/sitemap.xml) et la page ne doit pas porter noindex.',
            evidence: [
              x.robots.disallowAll ? 'robots.txt : Disallow: /' : `meta robots : ${p.robotsMeta}`,
            ],
          })
        : ok(
            'seo.robots',
            'seo',
            'robots.txt en place',
            x.robots.sitemaps.length
              ? `Il annonce ${x.robots.sitemaps.length} sitemap(s).`
              : 'L’exploration est autorisée.',
          )
      : check({
          id: 'seo.robots',
          category: 'seo',
          status: 'info',
          title: 'Pas de robots.txt',
          detail: 'Les moteurs explorent quand même, mais ne trouvent pas le plan du site.',
          fix: 'Créer /robots.txt :\nUser-agent: *\nAllow: /\nSitemap: https://votre-domaine/sitemap.xml',
          evidence: [],
        }),
  );
  if (!x.sitemap) {
    out.push(
      check({
        id: 'seo.sitemap',
        category: 'seo',
        status: 'info',
        title: 'Pas de sitemap.xml',
        detail:
          'Le plan du site aide Google à trouver toutes les pages publiques (profils, offres, articles).',
        fix: 'Générer /sitemap.xml avec les pages publiques (la plupart des frameworks ont un module : next-sitemap, vite-plugin-sitemap, django.contrib.sitemaps).',
        evidence: [],
      }),
    );
  }
  if (p.h1 !== 1) {
    out.push(
      check({
        id: 'seo.h1',
        category: 'seo',
        status: 'info',
        title: p.h1 === 0 ? 'Aucun titre h1 dans le HTML' : `${p.h1} titres h1`,
        detail:
          p.h1 === 0
            ? 'Le HTML envoyé n’a pas de h1 (souvent une application monopage qui l’ajoute après coup) : les moteurs et lecteurs d’écran perdent le sujet principal.'
            : 'Une page devrait avoir un seul h1 : le sujet principal.',
        fix: 'Un seul <h1> par page, qui dit ce qu’elle contient. Pour une application monopage, le pré-rendu (SSR/SSG) des pages publiques résout aussi le référencement.',
        evidence: [],
      }),
    );
  }
  if (!p.favicon || !p.appleTouchIcon) {
    out.push(
      check({
        id: 'seo.icons',
        category: 'seo',
        status: 'info',
        title: !p.favicon ? 'Pas de favicon' : 'Pas d’icône pour l’écran d’accueil',
        detail:
          'L’icône apparaît dans l’onglet, les favoris et sur l’écran d’accueil du téléphone quand on « ajoute » le site.',
        fix: '<link rel="icon" href="/favicon.svg" type="image/svg+xml">\n<link rel="apple-touch-icon" href="/apple-touch-icon.png"> (180 × 180)',
        evidence: [!p.favicon && 'favicon', !p.appleTouchIcon && 'apple-touch-icon'].filter(
          (v): v is string => !!v,
        ),
      }),
    );
  }

  // ── Hors ligne et installation (PWA) ──
  const installable = !!x.manifest && x.manifest.name && x.manifest.icons > 0 && x.serviceWorker;
  out.push(
    installable
      ? ok(
          'net.pwa',
          'network',
          'Installable et utilisable hors ligne',
          'Manifeste avec nom et icônes, service worker enregistré : l’application s’installe et tient quand le réseau coupe.',
        )
      : check({
          id: 'net.pwa',
          category: 'network',
          status: 'info',
          title: x.serviceWorker
            ? 'Manifeste d’installation incomplet'
            : 'Rien ne marche sans réseau',
          detail:
            'Sans service worker, la moindre coupure affiche la page d’erreur du navigateur. Avec, l’application se rouvre instantanément et peut garder des actions en attente : décisif là où le réseau coupe souvent.',
          fix: 'Ajouter un manifeste (nom, icônes 192 et 512 px, display standalone) et un service worker qui met en cache l’interface (Vite : vite-plugin-pwa ; Next : next-pwa ou Serwist).',
          evidence: [
            !x.manifest && 'pas de manifeste',
            x.manifest && !x.manifest.icons && 'manifeste sans icône',
            !x.serviceWorker && 'aucun service worker enregistré',
          ].filter((v): v is string => !!v),
        }),
  );

  // ── Réseau et données mobiles ──
  if (p.blockingScripts.length) {
    out.push(
      check({
        id: 'net.blocking_scripts',
        category: 'network',
        status: 'warn',
        title: `${p.blockingScripts.length} script(s) bloquent l’affichage`,
        detail:
          'Ces scripts sont dans <head> sans async ni defer : rien ne s’affiche tant qu’ils ne sont pas téléchargés et exécutés. En 3G, plusieurs secondes d’écran blanc.',
        fix: 'Ajouter defer (ou async pour un script indépendant comme une mesure d’audience) à ces balises <script src>, ou les charger en type="module".',
        evidence: p.blockingScripts,
      }),
    );
  }
  if (x.fonts.withoutSwap) {
    out.push(
      check({
        id: 'net.font_display',
        category: 'network',
        status: 'warn',
        title: `${x.fonts.withoutSwap} police(s) sans font-display`,
        detail:
          'Le texte reste invisible tant que la police n’est pas téléchargée : sur un réseau lent, la page paraît vide.',
        fix: 'Ajouter `font-display: swap;` dans chaque @font-face (Google Fonts : paramètre &display=swap).',
        evidence: [`${x.fonts.faces} @font-face, dont ${x.fonts.withoutSwap} sans swap`],
      }),
    );
  }
  const imgs = x.imageFormats.modern + x.imageFormats.legacy;
  if (imgs >= 3 && x.imageFormats.legacy > x.imageFormats.modern) {
    out.push(
      check({
        id: 'net.image_formats',
        category: 'network',
        status: 'warn',
        title: 'Images en JPEG/PNG plutôt qu’en WebP/AVIF',
        detail: `${x.imageFormats.legacy} image(s) sur ${imgs} sont dans un format ancien : WebP pèse 25 à 35 % de moins à qualité égale, AVIF jusqu’à 50 %.`,
        fix: 'Convertir les images en WebP (ou AVIF) au build (vite-imagetools, next/image, sharp), avec <picture> pour un repli.',
        evidence: [],
      }),
    );
  }
  if (p.images >= 4 && p.imagesLazy === 0) {
    out.push(
      check({
        id: 'net.lazy_images',
        category: 'network',
        status: 'warn',
        title: 'Toutes les images se chargent tout de suite',
        detail: `${p.images} images dans la page, aucune en chargement différé : le visiteur paie en data des images qu’il ne verra peut-être jamais.`,
        fix: 'Ajouter loading="lazy" à toutes les images sous la ligne de flottaison (pas à l’image principale du haut de page).',
        evidence: [],
      }),
    );
  }
  if (p.imagesWithoutSize >= 3) {
    out.push(
      check({
        id: 'net.image_dimensions',
        category: 'network',
        status: 'info',
        title: `${p.imagesWithoutSize} image(s) sans largeur ni hauteur`,
        detail:
          'Sans dimensions, la page saute pendant le chargement (CLS) : le visiteur clique à côté.',
        fix: 'Donner width et height (ou aspect-ratio en CSS) à chaque <img>.',
        evidence: [],
      }),
    );
  }
  const load = estimateLoad(site);
  const cost = dataCostFcfa(load.totalBytes);
  out.push(
    check({
      id: 'net.data_cost',
      category: 'network',
      status: load.totalBytes > 5 * 1024 * 1024 ? 'warn' : 'info',
      title: `Une visite coûte ≈ ${cost < 1 ? cost.toFixed(1).replace('.', ',') : fr(Math.round(cost))} FCFA de data`,
      detail: `La première visite télécharge ${formatBytes(load.totalBytes)}. Pour 1 000 visiteurs, ils paient ensemble ≈ ${fr(Math.round(cost * 1000))} FCFA de forfait mobile (hypothèse : 1 Go ≈ ${fr(FCFA_PER_GB)} FCFA en prépayé). Chaque Mo économisé, c’est de l’argent rendu aux utilisateurs.`,
      fix:
        load.totalBytes > 2 * 1024 * 1024
          ? 'Réduire le poids : images en WebP et en lazy, découpage du JavaScript par page, suppression des bibliothèques inutilisées, compression Brotli.'
          : null,
      evidence: [`${formatBytes(load.totalBytes)} par visite`],
    }),
  );
  if (x.http3)
    out.push(
      ok(
        'net.http3',
        'network',
        'HTTP/3 disponible',
        'Plus rapide et plus stable sur les réseaux mobiles qui perdent des paquets.',
      ),
    );

  // ── Vie privée ──
  out.push(
    p.trackers.length
      ? check({
          id: 'privacy.trackers',
          category: 'privacy',
          status: 'warn',
          title: `${p.trackers.length} traceur(s) publicitaire(s) ou analytique(s)`,
          detail:
            'Ces services reçoivent les visites de tes utilisateurs. La loi (RGPD, et dans la CEDEAO les lois sur les données personnelles : Sénégal, Côte d’Ivoire, Bénin, Nigeria NDPA…) demande leur consentement et une politique de confidentialité.',
          fix: 'Afficher une demande de consentement avant de charger ces scripts, les citer dans la politique de confidentialité, ou passer à une mesure d’audience sans cookie (Plausible, Umami, Matomo auto-hébergé).',
          evidence: p.trackers,
        })
      : ok(
          'privacy.trackers',
          'privacy',
          'Aucun traceur publicitaire',
          'Aucun script de Google Analytics, Meta Pixel, Hotjar, Clarity ou TikTok détecté.',
        ),
  );
  if (p.thirdPartyHosts.length > 4) {
    out.push(
      check({
        id: 'privacy.third_parties',
        category: 'privacy',
        status: 'info',
        title: `Scripts chargés depuis ${p.thirdPartyHosts.length} domaines tiers`,
        detail:
          'Chaque domaine tiers voit l’adresse IP et la page de chaque visiteur, ajoute une connexion (lent en 3G) et peut tomber en panne.',
        fix: 'Héberger les bibliothèques avec l’application (npm + bundler) plutôt que via des CDN, et supprimer les scripts tiers inutiles.',
        evidence: p.thirdPartyHosts,
      }),
    );
  }
  return out;
}

/* ═══════════════════════════ Dépôt : hygiène, chaîne d'approvisionnement ═══════════════════════════ */

const EOL: Record<'node' | 'python', [string, string][]> = {
  // Version, fin de support (dates officielles nodejs.org et python.org).
  node: [
    ['14', '2023-04-30'],
    ['16', '2023-09-11'],
    ['18', '2025-04-30'],
    ['19', '2023-06-01'],
    ['20', '2026-04-30'],
    ['21', '2024-06-01'],
    ['22', '2027-04-30'],
    ['23', '2025-06-01'],
    ['24', '2028-04-30'],
  ],
  python: [
    ['3.7', '2023-06-27'],
    ['3.8', '2024-10-07'],
    ['3.9', '2025-10-31'],
    ['3.10', '2026-10-31'],
    ['3.11', '2027-10-31'],
    ['3.12', '2028-10-31'],
    ['3.13', '2029-10-31'],
  ],
};

export function eolOf(kind: 'node' | 'python', version: string, now: Date): string | null {
  const v = kind === 'node' ? String(Number.parseInt(version, 10)) : version;
  if (kind === 'node' && Number(v) < 14) return '2022-04-30';
  const hit = EOL[kind].find(([k]) => k === v);
  return hit && Date.parse(hit[1]) < now.getTime() ? hit[1] : null;
}

export function projectChecks(p: ProjectFacts, now = new Date()): C[] {
  const out: C[] = [];

  // ── Secrets ──
  out.push(
    p.contentSecrets.length
      ? check({
          id: 'repo.content_secrets',
          category: 'security',
          status: 'fail',
          title: 'Secret écrit en clair dans le code',
          detail: `Le dépôt est public : ces clés sont lisibles par tout le monde (et les robots qui fouillent GitHub les trouvent en quelques minutes).`,
          fix: 'Révoquer et régénérer chaque clé chez son fournisseur MAINTENANT, puis la déplacer dans une variable d’environnement (fichier .env ignoré par git, secrets du serveur ou de la CI). Retirer la valeur du code ne suffit pas : elle reste dans l’historique.',
          evidence: p.contentSecrets.map((s) => `${SECRET_LABEL[s.kind] ?? s.kind} dans ${s.file}`),
        })
      : ok(
          'repo.content_secrets',
          'security',
          'Aucun secret dans le code',
          `${p.filesScanned} fichier(s) lus : ni clé privée, ni clé AWS, GitHub, Stripe, OpenAI, Anthropic, Slack, ni mot de passe de base de données.`,
        ),
  );
  if (p.historySecrets === null) {
    out.push(
      check({
        id: 'repo.history_secrets',
        category: 'security',
        status: 'info',
        title: 'Historique git non vérifié',
        detail:
          'Sans jeton GitHub côté serveur, le pré-vol ne lit pas les derniers commits. Un secret supprimé du code reste dans l’historique.',
        fix: 'Vérifier localement : `npx gitleaks detect --source . --log-opts="--all"`.',
        evidence: [],
      }),
    );
  } else {
    out.push(
      p.historySecrets.length
        ? check({
            id: 'repo.history_secrets',
            category: 'security',
            status: 'fail',
            title: 'Secret présent dans l’historique git',
            detail:
              'Ces clés ont été ajoutées dans des commits récents. Même supprimées depuis, elles restent visibles dans l’historique public.',
            fix: 'Révoquer et régénérer chaque clé (c’est la seule vraie correction), puis, si besoin, réécrire l’historique avec `git filter-repo` et forcer le push.',
            evidence: p.historySecrets.map(
              (s) => `${SECRET_LABEL[s.kind] ?? s.kind} · commit ${s.commit} · ${s.file}`,
            ),
          })
        : ok(
            'repo.history_secrets',
            'security',
            'Historique récent propre',
            `${p.commitsScanned} commit(s) récents relus : aucun secret ajouté.`,
          ),
    );
  }
  if (!p.gitignore.present || !p.gitignore.ignoresEnv || p.gitignore.ignoresNodeModules === false) {
    out.push(
      check({
        id: 'repo.gitignore',
        category: 'security',
        status:
          !p.gitignore.present || (!p.gitignore.ignoresEnv && p.usesEnvVars) ? 'warn' : 'info',
        title: !p.gitignore.present ? 'Pas de .gitignore' : '.gitignore incomplet',
        detail:
          'Sans règle, le prochain `git add .` publie le fichier .env (mots de passe, clés) ou des centaines de Mo de node_modules.',
        fix: 'Ajouter au .gitignore :\n.env\n.env.*\n!.env.example\nnode_modules/\ndist/',
        evidence: [
          !p.gitignore.present && 'fichier absent',
          p.gitignore.present && !p.gitignore.ignoresEnv && '.env non ignoré',
          p.gitignore.ignoresNodeModules === false && 'node_modules non ignoré',
        ].filter((v): v is string => !!v),
      }),
    );
  }
  if (p.usesEnvVars && !p.envExample) {
    out.push(
      check({
        id: 'repo.env_example',
        category: 'quality',
        status: 'info',
        title: 'Pas de .env.example',
        detail:
          'Le code lit des variables d’environnement, mais rien n’indique lesquelles : un nouveau développeur (ou le serveur) ne peut pas démarrer l’application.',
        fix: 'Créer .env.example avec chaque variable et une valeur factice ou un commentaire (jamais les vraies valeurs).',
        evidence: [],
      }),
    );
  }

  // ── Chaîne d'approvisionnement (registre npm) ──
  if (p.registryChecked) {
    out.push(
      p.deprecated.length
        ? check({
            id: 'deps.deprecated',
            category: 'dependencies',
            status: 'warn',
            title: `${p.deprecated.length} dépendance(s) dépréciée(s)`,
            detail:
              'Leurs auteurs les ont officiellement abandonnées : plus de correctif de sécurité.',
            fix: 'Remplacer chaque paquet par l’alternative indiquée dans le message de dépréciation.',
            evidence: p.deprecated.map((d) => `${d.name} : ${d.message}`),
          })
        : ok(
            'deps.deprecated',
            'dependencies',
            'Aucune dépendance dépréciée',
            `${p.registryChecked} dépendances directes vérifiées sur le registre npm.`,
          ),
    );
    const far = p.outdated.filter((o) => o.majorsBehind >= 2);
    if (p.outdated.length) {
      out.push(
        check({
          id: 'deps.outdated',
          category: 'dependencies',
          status: far.length ? 'warn' : 'info',
          title: `${p.outdated.length} dépendance(s) en retard de version majeure`,
          detail:
            'Les anciennes versions majeures ne reçoivent souvent plus de correctifs, et plus on attend, plus la mise à jour est longue.',
          fix: 'Mettre à jour une dépendance à la fois en lisant son guide de migration (`npm outdated`, puis `npm install paquet@latest`), tests à l’appui.',
          evidence: p.outdated.map(
            (o) =>
              `${o.name} ${o.current} → ${o.latest} (${o.majorsBehind} version${o.majorsBehind > 1 ? 's' : ''} majeure${o.majorsBehind > 1 ? 's' : ''} de retard)`,
          ),
        }),
      );
    }
    if (p.abandoned.length) {
      out.push(
        check({
          id: 'deps.abandoned',
          category: 'dependencies',
          status: 'info',
          title: `${p.abandoned.length} dépendance(s) sans publication depuis 2 ans`,
          detail:
            'Un paquet immobile n’est pas forcément mauvais, mais une faille découverte demain ne serait peut-être jamais corrigée.',
          fix: 'Vérifier que ces paquets sont encore maintenus (dépôt GitHub, issues) et prévoir une alternative pour ceux qui ne le sont plus.',
          evidence: p.abandoned.map((a) => `${a.name} (dernière publication ${a.lastPublish})`),
        }),
      );
    }
    if (p.installScripts.length) {
      out.push(
        check({
          id: 'deps.install_scripts',
          category: 'dependencies',
          status: 'info',
          title: `${p.installScripts.length} dépendance(s) exécutent du code à l’installation`,
          detail:
            'Ces paquets lancent un script (postinstall) sur la machine de chaque développeur et du serveur de build. C’est le vecteur favori des attaques de la chaîne d’approvisionnement.',
          fix: 'Vérifier que chacun en a réellement besoin (binaires natifs) ; avec pnpm, n’autoriser que ceux-là via `onlyBuiltDependencies`.',
          evidence: p.installScripts,
        }),
      );
    }
  }
  if (p.lockfiles.length > 1) {
    out.push(
      check({
        id: 'deps.multiple_lockfiles',
        category: 'dependencies',
        status: 'warn',
        title: 'Plusieurs gestionnaires de paquets',
        detail:
          'Plusieurs fichiers de verrouillage coexistent : selon la commande lancée, les versions installées diffèrent (bugs « ça marche chez moi »).',
        fix: 'Choisir un seul gestionnaire, supprimer les autres fichiers de verrouillage et fixer `packageManager` dans package.json.',
        evidence: p.lockfiles,
      }),
    );
  }

  // ── Runtime en fin de vie ──
  for (const kind of ['node', 'python'] as const) {
    const v = p.runtime[kind];
    if (!v) continue;
    const eol = eolOf(kind, v, now);
    out.push(
      eol
        ? check({
            id: `runtime.${kind}`,
            category: 'quality',
            status: 'warn',
            title: `${kind === 'node' ? 'Node.js' : 'Python'} ${v} n’est plus maintenu`,
            detail: `Fin de support le ${eol} : plus aucun correctif de sécurité pour le moteur qui fait tourner l’application.`,
            fix:
              kind === 'node'
                ? 'Passer à Node.js 22 ou 24 (LTS) : image Docker node:24-alpine, champ engines et .nvmrc.'
                : 'Passer à Python 3.12 ou plus récent (image python:3.12-slim, requires-python).',
            evidence: [`${kind} ${v}`],
          })
        : ok(
            `runtime.${kind}`,
            'quality',
            `${kind === 'node' ? 'Node.js' : 'Python'} ${v} encore maintenu`,
            'Le moteur reçoit encore des correctifs de sécurité.',
          ),
    );
  }

  // ── Docker ──
  if (p.docker) {
    const f = p.docker.findings;
    const serious = f.filter((x) => x.code !== 'no_healthcheck');
    out.push(
      serious.length
        ? check({
            id: 'docker.hardening',
            category: 'quality',
            status: f.some((x) => x.code === 'secret_env') ? 'fail' : 'warn',
            title: `Dockerfile : ${serious.length} point(s) à durcir`,
            detail:
              'L’image de production embarque des risques évitables (droits root, versions flottantes, secrets ou fichiers en trop).',
            fix: 'Ajouter un utilisateur non root (`RUN adduser -D app` puis `USER app`), fixer les versions des images (`node:24.11-alpine`), passer les secrets à l’exécution (variables du serveur) et créer un .dockerignore (.git, .env, node_modules).',
            evidence: serious.map((x) => x.detail),
          })
        : ok(
            'docker.hardening',
            'quality',
            'Dockerfile propre',
            'Utilisateur non root, versions fixées, aucun secret dans l’image.',
          ),
    );
  }

  // ── Qualité du projet ──
  out.push(
    p.ci.length
      ? ok('quality.ci', 'quality', 'Intégration continue en place', p.ci.join(', '))
      : check({
          id: 'quality.ci',
          category: 'quality',
          status: 'warn',
          title: 'Aucune intégration continue',
          detail:
            'Rien ne vérifie automatiquement que le code compile et que les tests passent avant la mise en ligne.',
          fix: 'Ajouter .github/workflows/ci.yml qui installe les dépendances, lance le lint, les tests et le build à chaque push (et ajouter l’action DevHub Pré-vol pour vérifier chaque PR).',
          evidence: [],
        }),
  );
  const ratio = p.sourceFiles ? p.testFiles / p.sourceFiles : 0;
  out.push(
    p.testFiles === 0
      ? check({
          id: 'quality.tests',
          category: 'quality',
          status: 'warn',
          title: 'Aucun test automatisé',
          detail: `${fr(p.sourceFiles)} fichiers de code, aucun fichier de test : chaque modification peut casser une fonctionnalité sans que personne ne le voie.`,
          fix: 'Commencer par tester ce qui coûte le plus cher quand ça casse (paiement, inscription, calculs) : Vitest ou Jest en JavaScript, pytest en Python.',
          evidence: [],
        })
      : ok(
          'quality.tests',
          'quality',
          `${fr(p.testFiles)} fichier(s) de test`,
          `Environ ${Math.round(ratio * 100)} fichiers de test pour 100 fichiers de code.`,
        ),
  );
  if (p.tsStrict === false) {
    out.push(
      check({
        id: 'quality.ts_strict',
        category: 'quality',
        status: 'info',
        title: 'TypeScript sans mode strict',
        detail:
          'Sans "strict", TypeScript laisse passer les valeurs null et les types implicites : il rate une bonne partie des bugs qu’il est censé attraper.',
        fix: 'Activer "strict": true dans tsconfig.json, puis corriger les erreurs dossier par dossier.',
        evidence: [],
      }),
    );
  }
  if (!p.linters.length) {
    out.push(
      check({
        id: 'quality.lint',
        category: 'quality',
        status: 'info',
        title: 'Pas de linter configuré',
        detail:
          'Un linter attrape les erreurs courantes (variables inutilisées, promesses oubliées) avant qu’elles n’arrivent en production.',
        fix: 'JavaScript/TypeScript : ESLint ou Biome ; Python : Ruff. Le brancher dans la CI.',
        evidence: [],
      }),
    );
  }
  out.push(
    !p.readme.present
      ? check({
          id: 'quality.readme',
          category: 'quality',
          status: 'warn',
          title: 'Pas de README',
          detail:
            'Personne ne sait ce que fait le projet ni comment le lancer : ni un recruteur, ni un contributeur, ni toi dans six mois.',
          fix: 'Créer README.md : ce que fait le projet, capture d’écran, installation (commandes exactes), variables d’environnement, lancement, licence.',
          evidence: [],
        })
      : !p.readme.hasSetup || p.readme.bytes < 400
        ? check({
            id: 'quality.readme',
            category: 'quality',
            status: 'info',
            title: 'README sans instructions d’installation',
            detail: 'Le README ne dit pas comment installer et lancer le projet.',
            fix: 'Ajouter une section « Lancer le projet » avec les commandes exactes (installation, variables, démarrage).',
            evidence: [`${fr(p.readme.bytes)} caractères`],
          })
        : ok(
            'quality.readme',
            'quality',
            'README utile',
            'Il explique comment installer et lancer le projet.',
          ),
  );
  if (p.pushedAt) {
    const months = Math.floor((now.getTime() - Date.parse(p.pushedAt)) / (30 * 86_400_000));
    if (months >= 12)
      out.push(
        check({
          id: 'quality.activity',
          category: 'quality',
          status: 'info',
          title: `Aucun commit depuis ${months} mois`,
          detail:
            'Les dépendances vieillissent même quand le code ne bouge pas : des failles ont pu apparaître depuis.',
          fix: 'Relancer `npm audit` (ou ce pré-vol) et mettre à jour les dépendances avant toute remise en ligne.',
          evidence: [p.pushedAt.slice(0, 10)],
        }),
      );
  }
  return out;
}

/* ═══════════════════════════ Architecture du code ═══════════════════════════ */

export function architectureChecks(a: PreflightArchitecture): C[] {
  const out: C[] = [];
  if (a.analysedFiles < 5) return out;
  out.push(
    a.cycles.length
      ? check({
          id: 'arch.cycles',
          category: 'quality',
          status: 'warn',
          title: `${a.cycles.length} cycle(s) d’imports`,
          detail:
            'Ces fichiers s’importent en boucle : l’ordre de chargement devient fragile (valeurs undefined au démarrage), les tests et le découpage du code se compliquent.',
          fix: 'Casser chaque boucle : déplacer le code partagé dans un fichier commun que les deux importent, ou inverser une dépendance (injection, événement).',
          evidence: a.cycles.map((c) => c.join(' → ')),
        })
      : ok(
          'arch.cycles',
          'quality',
          'Aucun cycle d’imports',
          `${fr(a.analysedFiles)} fichiers et ${fr(a.imports)} imports analysés : le graphe est propre.`,
        ),
  );
  if (a.hubs.length) {
    out.push(
      check({
        id: 'arch.hubs',
        category: 'quality',
        status: 'info',
        title: 'Fichiers critiques du projet',
        detail:
          'Ces fichiers sont importés par beaucoup d’autres : une erreur dedans casse tout le projet. Ce sont eux qui méritent le plus de tests et de relectures.',
        fix: 'Couvrir ces fichiers par des tests unitaires en priorité et exiger une relecture pour toute modification.',
        evidence: a.hubs.map((h) => `${h.file} · utilisé par ${h.dependents} fichiers`),
      }),
    );
  }
  const huge = a.largest.filter((l) => l.lines >= 600);
  if (huge.length) {
    out.push(
      check({
        id: 'arch.large_files',
        category: 'quality',
        status: 'info',
        title: `${huge.length} fichier(s) de plus de 600 lignes`,
        detail:
          'Les très gros fichiers mélangent plusieurs responsabilités : difficiles à relire, à tester et à modifier sans effet de bord (et ils saturent le contexte des agents IA).',
        fix: 'Découper par responsabilité (composants, hooks, services) en fichiers de moins de 300 lignes.',
        evidence: huge.map((l) => `${l.file} · ${fr(l.lines)} lignes`),
      }),
    );
  }
  if (a.orphans.length >= 3) {
    out.push(
      check({
        id: 'arch.orphans',
        category: 'quality',
        status: 'info',
        title: `${a.orphans.length} fichier(s) que rien n’importe`,
        detail:
          'Code probablement mort (ou chargé autrement, par convention de framework) : il alourdit le projet et trompe les relecteurs.',
        fix: 'Vérifier chacun ; supprimer ceux qui ne servent plus (un outil comme knip le fait automatiquement en JavaScript).',
        evidence: a.orphans,
      }),
    );
  }
  if (a.consoleLogs >= 10) {
    out.push(
      check({
        id: 'arch.console_logs',
        category: 'quality',
        status: 'info',
        title: `${a.consoleLogs} console.log dans le code`,
        detail:
          'Des traces de débogage restent dans le code livré : elles polluent la console et peuvent afficher des données privées.',
        fix: 'Les retirer, ou passer par un logger avec des niveaux (pino, consola) désactivé en production ; la règle ESLint no-console les bloque.',
        evidence: [],
      }),
    );
  }
  if (a.anyTypes >= 20) {
    out.push(
      check({
        id: 'arch.any',
        category: 'quality',
        status: 'info',
        title: `${a.anyTypes} « any » dans le TypeScript`,
        detail:
          'Chaque any désactive la vérification des types à cet endroit : les bugs passent comme en JavaScript.',
        fix: 'Remplacer any par le vrai type, ou unknown suivi d’une vérification ; la règle @typescript-eslint/no-explicit-any aide à ne pas en rajouter.',
        evidence: [],
      }),
    );
  }
  return out;
}
