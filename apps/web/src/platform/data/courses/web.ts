import { fill, lesson, match, order, qcm, tip, unit, vf } from './dsl';
import type { CourseUnit } from './types';

export const units: CourseUnit[] = [
  unit(
    'html',
    'HTML : structure et sémantique',
    'Écrire une page HTML valide et bien structurée, compréhensible par les navigateurs, les moteurs de recherche et les lecteurs d’écran.',
    [
      lesson('squelette', 'Le squelette d’une page', [
        tip(
          'HTML décrit le contenu, pas l’apparence',
          'HTML (HyperText Markup Language) est un langage de balisage : il dit au navigateur ce qu’est chaque morceau de contenu (un titre, un paragraphe, un lien, un champ de formulaire). L’apparence, c’est le travail du CSS ; le comportement, celui de JavaScript. Garder ces trois rôles séparés rend un site plus simple à maintenir.\n\nUn élément s’écrit en général avec une balise ouvrante, un contenu et une balise fermante : <p>Bonjour</p>. Les éléments s’imbriquent, mais proprement : on ferme d’abord le dernier ouvert. <p><strong>Promo</strong></p> est correct, <p><strong>Promo</p></strong> ne l’est pas.\n\nCertains éléments sont vides (void) : ils n’ont pas de contenu, donc pas de balise fermante. Les plus courants : <img>, <br>, <hr>, <input>, <meta>, <link>, <source>.\n\nLes attributs précisent un élément : <a href="/contact">, <img src="pagne.jpg" alt="…">. Mets toujours leur valeur entre guillemets, même quand ce n’est pas obligatoire : tu éviteras des bugs dès qu’une valeur contiendra un espace.',
          '<p>Je vends des <strong>pagnes wax</strong> à Cotonou.</p>\n<img src="pagne.jpg" alt="Pagne wax bleu et orange">',
        ),
        tip(
          'Le squelette minimal',
          'Toute page commence par <!DOCTYPE html>. Cette ligne active le mode standard du navigateur ; sans elle, il passe en « quirks mode » et imite des comportements de très vieux navigateurs (calcul des boîtes différent, par exemple).\n\n<html lang="fr"> englobe tout. L’attribut lang indique la langue au lecteur d’écran (pour bien prononcer), aux traducteurs automatiques et aux moteurs de recherche.\n\n<head> contient les informations sur la page, qui ne s’affichent pas dans le contenu :\n• <meta charset="utf-8"> : l’encodage, à placer en tout premier pour que é, à, ç et tous les alphabets s’affichent bien ;\n• <meta name="viewport" content="width=device-width, initial-scale=1"> : indispensable pour que la page s’adapte à la largeur des téléphones ;\n• <title> : le texte de l’onglet, des favoris et du lien dans les résultats de recherche ;\n• <meta name="description"> : un résumé que les moteurs de recherche reprennent souvent sous le lien ;\n• <link rel="stylesheet" href="…"> pour relier le CSS.\n\n<body> contient tout ce qui s’affiche.',
          '<!DOCTYPE html>\n<html lang="fr">\n  <head>\n    <meta charset="utf-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1">\n    <title>Boutique Awa – Pagnes wax à Cotonou</title>\n    <meta name="description" content="Pagnes wax livrés à Cotonou et Porto-Novo.">\n    <link rel="stylesheet" href="style.css">\n  </head>\n  <body>\n    <h1>Boutique Awa</h1>\n  </body>\n</html>',
        ),
        order(
          'Remets ce squelette dans l’ordre.',
          [
            '<!DOCTYPE html>',
            '<html lang="fr">',
            '<head>',
            '<meta charset="utf-8">',
            '<title>Boutique Awa</title>',
            '</head>',
            '<body>',
            '</body>',
            '</html>',
          ],
          'Le doctype d’abord, puis <html> qui contient <head> (avec l’encodage en premier) puis <body>.',
        ),
        qcm(
          'Que se passe-t-il si tu oublies <!DOCTYPE html> ?',
          [
            'Le navigateur refuse d’afficher la page',
            'Le navigateur passe en mode de compatibilité (quirks) et peut afficher la page différemment',
            'La page disparaît des moteurs de recherche',
            'Le JavaScript ne s’exécute plus',
          ],
          1,
          'Les navigateurs tolèrent l’oubli mais basculent en « quirks mode », qui imite d’anciens bugs. Le rendu peut alors changer d’un navigateur à l’autre.',
        ),
        vf(
          'Le texte de <title> s’affiche en grand en haut de la page.',
          false,
          '<title> s’affiche dans l’onglet, les favoris et les résultats de recherche. Le grand titre visible, c’est <h1>.',
        ),
        fill(
          'Indique que la page est en français.',
          '<html ___="fr">',
          ['lang', 'language', 'locale', 'langue'],
          'lang',
          'L’attribut lang prend un code de langue (fr, en, wo, sw, ha…). Il permet au lecteur d’écran de choisir la bonne voix.',
        ),
        qcm(
          'Où doit se trouver <meta charset="utf-8"> ?',
          [
            'N’importe où dans <body>',
            'Juste avant </html>',
            'Au tout début de <head>, avant tout texte',
            'Dans le fichier CSS',
          ],
          2,
          'Le navigateur doit connaître l’encodage avant de lire du texte : la norme exige que cette balise apparaisse dans les 1024 premiers octets du document.',
        ),
        tip(
          'Commentaires et validation',
          'Un commentaire HTML s’écrit <!-- comme ceci -->. Il ne s’affiche pas, mais il est visible par tous dans le code source : n’y mets jamais de mot de passe ni d’information interne.\n\nLe navigateur corrige silencieusement beaucoup d’erreurs (balise non fermée, imbrication fausse). C’est pratique, mais chaque navigateur peut corriger à sa façon, et les lecteurs d’écran en souffrent. Passe ta page dans le validateur du W3C (validator.w3.org) : il liste les erreurs avec leur ligne.\n\nBonne pratique : indente ton code (deux espaces par niveau) pour voir d’un coup d’œil ce qui est dans quoi.',
        ),
        match('Associe chaque élément de <head> à son rôle.', [
          ['<meta charset="utf-8">', 'Encodage des caractères'],
          ['<title>', 'Texte de l’onglet et des résultats de recherche'],
          ['<link rel="stylesheet">', 'Relier une feuille CSS'],
          ['<meta name="viewport">', 'Adapter l’affichage aux mobiles'],
          ['<meta name="description">', 'Résumé pour les moteurs de recherche'],
        ]),
        vf(
          'Ce code est correctement imbriqué : <p><em>Livraison <strong>gratuite</em></strong></p>',
          false,
          '<strong> a été ouvert après <em> : il doit être fermé avant. La bonne version : <p><em>Livraison <strong>gratuite</strong></em></p>.',
        ),
        qcm(
          'Lequel de ces éléments est vide (il n’a pas de balise fermante) ?',
          ['<p>', '<label>', '<span>', '<input>'],
          3,
          '<input> n’a pas de contenu : sa valeur passe par des attributs. <p>, <label> et <span> entourent du contenu et se ferment.',
        ),
      ]),

      lesson('titres-texte', 'Titres, texte et listes', [
        tip(
          'Une hiérarchie de titres',
          'Les titres vont de <h1> à <h6>. Ils forment le plan de la page, comme la table des matières d’un livre. Les utilisateurs de lecteurs d’écran s’en servent pour naviguer : une touche (H avec NVDA ou JAWS) saute de titre en titre.\n\nLes règles :\n• un <h1> qui annonce le sujet de la page (un seul est recommandé) ;\n• des <h2> pour les grandes parties, des <h3> pour leurs sous-parties, etc. ;\n• ne saute pas de niveau (un <h2> suivi directement d’un <h4>) ;\n• ne choisis jamais un niveau pour sa taille : la taille se règle en CSS.\n\nUn texte en gras n’est pas un titre : s’il introduit une partie, c’est un <h2> ou un <h3>.',
          '<h1>Boutique Awa</h1>\n<h2>Nos pagnes</h2>\n<h3>Wax hollandais</h3>\n<h3>Bazin</h3>\n<h2>Livraison</h2>',
        ),
        tip(
          'Le texte qui a du sens',
          '<p> crée un paragraphe. Pour mettre un mot en valeur, choisis selon le sens :\n• <strong> : contenu important, urgent ou grave (« Attention : paiement à la livraison uniquement ») ;\n• <em> : accentuation qui change le sens de la phrase ;\n• <b> et <i> : simple style visuel (nom de produit, mot étranger), sans importance particulière.\n\nD’autres éléments décrivent précisément leur contenu : <code> pour du code, <abbr title="Franc de la Communauté financière africaine">FCFA</abbr> pour une abréviation, <time datetime="2026-11-15">15 novembre</time> pour une date lisible par une machine, <blockquote> pour une citation longue.\n\n<br> sert à revenir à la ligne à l’intérieur d’un contenu (une adresse, un poème), jamais à créer de l’espace : l’espacement, c’est le CSS (margin).\n\nPour écrire un caractère réservé, utilise une entité : &lt; pour <, &amp; pour &.',
        ),
        tip(
          'Les listes',
          '• <ul> : liste non ordonnée (puces), quand l’ordre n’a pas d’importance ;\n• <ol> : liste ordonnée (numéros), quand l’ordre compte : étapes d’une commande, classement ;\n• chaque élément est un <li>, et une liste ne contient directement que des <li> ;\n• <dl> associe des termes (<dt>) à leurs descriptions (<dd>), pratique pour une fiche technique.\n\nUn lecteur d’écran annonce « liste, 3 éléments » : l’utilisateur sait ce qui l’attend. C’est pour cela que les menus de navigation sont presque toujours des <ul> de liens.',
          '<ol>\n  <li>Choisis ton article</li>\n  <li>Paie par Mobile Money</li>\n  <li>Reçois ta livraison</li>\n</ol>',
        ),
        qcm(
          'Tu veux un sous-titre plus petit sous un <h2>. Que fais-tu ?',
          [
            'J’utilise <h5> parce qu’il s’affiche plus petit',
            'J’utilise <h3> et je règle la taille en CSS',
            'J’utilise un <p> en gras',
            'J’utilise <h2 size="small">',
          ],
          1,
          'Le niveau de titre décrit la place dans le plan, pas la taille. Une sous-partie d’un <h2> est un <h3> ; la taille se change en CSS.',
        ),
        vf(
          'Un lecteur d’écran permet de sauter de titre en titre : une hiérarchie propre aide donc à naviguer.',
          true,
          'C’est l’une des façons les plus utilisées de parcourir une page avec un lecteur d’écran. Des titres sautés ou faux rendent la page confuse.',
        ),
        match('Associe chaque élément à ce qu’il signifie.', [
          ['<strong>', 'Contenu important'],
          ['<em>', 'Accentuation qui change le sens'],
          ['<code>', 'Fragment de code'],
          ['<abbr>', 'Abréviation, avec sa forme longue'],
          ['<time>', 'Date ou heure lisible par une machine'],
        ]),
        fill(
          'Mets en valeur une information importante.',
          '<p>Prix : 5 000 F CFA. <___>Paiement à la livraison uniquement.</strong></p>',
          ['strong', 'b', 'bold', 'important'],
          'strong',
          '<strong> signale une importance réelle, que le lecteur d’écran peut restituer. <b> ne donne qu’un style.',
        ),
        order(
          'Écris la liste ordonnée des étapes d’une commande.',
          [
            '<ol>',
            '  <li>Choisis ton article</li>',
            '  <li>Paie par Mobile Money</li>',
            '  <li>Reçois ta livraison</li>',
            '</ol>',
          ],
          'L’ordre des étapes compte : <ol> numérote les <li> automatiquement.',
        ),
        vf(
          'Enchaîner plusieurs <br> est une bonne façon d’espacer deux paragraphes.',
          false,
          'Deux paragraphes, ce sont deux <p> ; l’espace entre eux se règle avec margin en CSS. Les <br> vides sont en plus annoncés comme des lignes vides.',
        ),
        qcm(
          'Comment afficher littéralement le texte <div> dans une page ?',
          ['<div>', '"<div>"', '&lt;div&gt;', '<code><div></code>'],
          2,
          '&lt; et &gt; sont les entités de < et >. Sans elles, le navigateur crée un vrai élément div, même entre guillemets ou dans <code>.',
        ),
        qcm(
          'Quel élément doit envelopper chaque élément d’une liste <ul> ?',
          ['<li>', '<p>', '<div>', '<item>'],
          0,
          '<ul> et <ol> attendent des <li> comme enfants directs. Un <p> ou un <div> peut aller à l’intérieur d’un <li>, pas à sa place.',
        ),
      ]),

      lesson('balises-semantiques', 'Les balises sémantiques', [
        tip(
          'Pourquoi la sémantique compte',
          '<div> et <span> n’ont aucun sens : ce sont des boîtes neutres. Les éléments sémantiques, eux, disent ce qu’ils contiennent. Cela profite à tout le monde :\n• le lecteur d’écran propose une liste des zones (« navigation », « principal ») pour y sauter directement ;\n• les moteurs de recherche comprennent mieux ta page ;\n• le mode lecture des navigateurs sait quoi garder ;\n• toi et ton équipe relisez un code qui se comprend tout seul.\n\nRègle simple : cherche d’abord l’élément qui décrit ton contenu. <div> et <span> restent utiles, mais seulement quand tu as besoin d’une boîte pour la mise en forme et qu’aucun élément ne correspond.',
        ),
        tip(
          'Les grandes zones de la page',
          '• <header> : l’en-tête (logo, titre, souvent la navigation) ;\n• <nav> : un bloc de liens de navigation importants (menu principal, fil d’Ariane) ;\n• <main> : le contenu principal, propre à cette page. Un seul <main> visible par page, jamais à l’intérieur d’un <article> ou d’un <aside> ;\n• <aside> : un contenu annexe (encadré, publicités, liens connexes) ;\n• <footer> : le pied (contacts, mentions légales).\n\nÀ l’intérieur :\n• <article> : un contenu autonome, qui aurait du sens publié seul (un billet, une fiche produit, un commentaire) ;\n• <section> : une partie thématique d’un tout, qui a normalement son propre titre.\n\n<header> et <footer> peuvent aussi apparaître dans un <article> : ils sont alors l’en-tête et le pied de cet article, pas de la page.',
          '<body>\n  <header>\n    <a href="/">Boutique Awa</a>\n    <nav>…</nav>\n  </header>\n  <main>\n    <h1>Nos pagnes</h1>\n    <article>\n      <h2>Wax « Fleurs de mariage »</h2>\n      <p>6 yards, 100 % coton.</p>\n    </article>\n  </main>\n  <footer>© 2026 Boutique Awa</footer>\n</body>',
        ),
        match('Associe chaque élément à son rôle.', [
          ['<header>', 'En-tête du site ou d’un article'],
          ['<nav>', 'Bloc de liens de navigation'],
          ['<main>', 'Contenu principal de la page'],
          ['<aside>', 'Contenu annexe, en marge'],
          ['<footer>', 'Pied : contacts, mentions légales'],
        ]),
        qcm(
          'Dans une liste de produits, quel élément convient le mieux pour chaque fiche produit ?',
          ['<section>', '<div>', '<aside>', '<article>'],
          3,
          'Une fiche produit est autonome : on pourrait la partager seule. C’est la définition d’<article>.',
        ),
        vf(
          'Une page peut contenir plusieurs éléments <main> visibles en même temps.',
          false,
          'Il ne doit y avoir qu’un seul <main> visible : c’est le repère « contenu principal » vers lequel le lecteur d’écran saute directement.',
        ),
        order(
          'Remets dans l’ordre la structure classique d’une page.',
          ['<header>', '  <nav>…</nav>', '</header>', '<main>…</main>', '<footer>…</footer>'],
          'L’en-tête (avec sa navigation), puis le contenu principal, puis le pied de page.',
        ),
        tip(
          'Images légendées et dates',
          '<figure> regroupe un contenu illustratif (image, schéma, extrait de code) et sa légende <figcaption>. La légende est alors liée à l’image pour les technologies d’assistance.\n\n<time datetime="2026-11-15T17:00"> affiche une date lisible par les humains (« samedi 15 novembre à 17 h ») tout en donnant aux machines une valeur normalisée.\n\n<address> contient les coordonnées de contact de l’auteur ou du propriétaire de la page ou de l’article, pas n’importe quelle adresse postale citée dans le texte.',
        ),
        fill(
          'Complète pour associer l’image à sa légende.',
          '<___>\n  <img src="carte.png" alt="Carte des 4 points de retrait à Lomé">\n  <figcaption>Nos points de retrait</figcaption>\n</figure>',
          ['figure', 'picture', 'div', 'caption'],
          'figure',
          '<figure> et <figcaption> vont ensemble. <picture> sert à proposer plusieurs sources d’une même image, pas à la légender.',
        ),
        vf(
          '<section> et <div> sont interchangeables : seul le nom change.',
          false,
          '<section> annonce une partie thématique (avec un titre) ; <div> n’a aucun sens. Une <section> qui a un nom accessible devient même un repère pour les lecteurs d’écran.',
        ),
        qcm(
          'Où ranger un encadré « Produits que tu pourrais aimer » à côté d’une fiche produit ?',
          ['<aside>', '<main>', '<nav>', '<footer>'],
          0,
          'Ce contenu est lié mais annexe : c’est le rôle d’<aside>. <nav> est réservé aux blocs de navigation importants.',
        ),
        qcm(
          'À quoi sert l’attribut datetime de <time> ?',
          [
            'À afficher la date en gras',
            'À mettre à jour la date automatiquement',
            'À donner une valeur de date normalisée lisible par les machines',
            'À traduire la date dans la langue du visiteur',
          ],
          2,
          'Le texte visible reste libre (« demain soir ») ; datetime fournit la valeur exacte (2026-11-15) aux moteurs de recherche, agendas et outils.',
        ),
      ]),

      lesson('liens-images', 'Liens, images et médias', [
        tip(
          'Les liens',
          '<a href="…"> crée un lien. La destination peut être :\n• une adresse absolue : https://exemple.com/prix ;\n• un chemin relatif : contact.html (même dossier), ../index.html (dossier parent), /contact (depuis la racine du site) ;\n• une ancre : #livraison (l’élément qui a id="livraison") ;\n• un schéma spécial : mailto:contact@exemple.com, tel:+221770000000.\n\nLe texte du lien doit dire où il mène, même lu seul : les lecteurs d’écran proposent une liste de tous les liens. « Cliquez ici » ne veut rien dire ; « Voir les tarifs de livraison » si.\n\ntarget="_blank" ouvre un nouvel onglet. Utilise-le avec parcimonie (ça désoriente) et préviens l’utilisateur. Les navigateurs récents appliquent d’office rel="noopener", qui empêche la page ouverte de contrôler la tienne ; l’écrire explicitement reste une bonne habitude.',
          '<a href="/livraison">Voir les tarifs de livraison</a>\n<a href="tel:+221770000000">Appeler la boutique</a>\n<a href="catalogue.pdf" download>Télécharger le catalogue (PDF, 2 Mo)</a>',
        ),
        tip(
          'Les images et leur texte alternatif',
          '<img src="…" alt="…"> affiche une image. L’attribut alt est obligatoire : il est lu par les lecteurs d’écran et s’affiche quand l’image ne charge pas (réseau 3G coupé, forfait épuisé).\n\nComment écrire alt :\n• image informative : décris ce qu’elle apporte (« Pagne wax bleu à motifs de fleurs ») ;\n• image dans un lien ou un bouton : décris la destination ou l’action (logo cliquable : « Boutique Awa – accueil ») ;\n• image décorative : alt="" (vide, mais présent), pour que le lecteur d’écran l’ignore ;\n• inutile de commencer par « Image de… » : le lecteur d’écran annonce déjà que c’est une image.\n\nDonne aussi width et height (les dimensions réelles) : le navigateur réserve la place avant le chargement et la page ne saute pas. Pour les images loin sous la ligne de flottaison, loading="lazy" retarde leur téléchargement jusqu’à ce que l’utilisateur s’en approche.',
          '<img src="pagne-bleu.webp" alt="Pagne wax bleu à motifs de fleurs"\n     width="800" height="600" loading="lazy">\n<img src="vague.svg" alt="">',
        ),
        tip(
          'Images adaptatives, vidéo et audio',
          'srcset propose plusieurs tailles d’une même image et sizes indique la largeur d’affichage : le téléphone télécharge la petite version, l’écran large la grande. Sur un forfait limité, c’est autant de mégaoctets économisés.\n\n<picture> permet de proposer des formats modernes (AVIF, WebP) avec une solution de repli : le navigateur prend la première <source> qu’il sait lire, sinon le <img>.\n\n<video controls> et <audio controls> intègrent des médias avec les commandes du navigateur. Ajoute des sous-titres avec <track kind="captions">, et évite l’autoplay avec le son.',
          '<picture>\n  <source srcset="pagne.avif" type="image/avif">\n  <source srcset="pagne.webp" type="image/webp">\n  <img src="pagne.jpg" alt="Pagne wax bleu" width="800" height="600">\n</picture>',
        ),
        fill(
          'Complète l’attribut qui donne la destination du lien.',
          '<a ___="/livraison">Tarifs de livraison</a>',
          ['href', 'src', 'link', 'to'],
          'href',
          'href (hypertext reference) indique la destination. src sert aux ressources intégrées dans la page : images, scripts, vidéos.',
        ),
        qcm(
          'Une image purement décorative (une vague en fond de bandeau) doit avoir :',
          ['Aucun attribut alt', 'alt="image"', 'alt="vague décorative"', 'alt=""'],
          3,
          'alt vide indique explicitement « à ignorer ». Sans alt du tout, certains lecteurs d’écran lisent le nom du fichier, ce qui est pire.',
        ),
        qcm(
          'Ton logo est un lien vers l’accueil. Quel alt choisir ?',
          ['alt="logo"', 'alt="Boutique Awa – accueil"', 'alt=""', 'Pas d’alt : le lien suffit'],
          1,
          'Dans un lien, l’image en est le seul texte : alt doit dire où mène le lien. Avec alt="" le lien n’aurait plus de nom.',
        ),
        match('Associe chaque valeur de href à sa destination.', [
          ['https://exemple.com/prix', 'Adresse absolue'],
          ['/contact', 'Chemin depuis la racine du site'],
          ['#livraison', 'Élément de la page avec id="livraison"'],
          ['tel:+221770000000', 'Appel téléphonique'],
          ['mailto:contact@exemple.com', 'Nouveau courriel'],
        ]),
        qcm(
          'Quel texte de lien est le plus accessible ?',
          [
            'Cliquez ici',
            'Plus d’infos',
            'Télécharger le catalogue (PDF, 2 Mo)',
            'https://exemple.com/catalogue.pdf',
          ],
          2,
          'Lu seul, il dit ce qu’on obtient, le format et le poids : précieux pour quelqu’un qui paie ses données au mégaoctet.',
        ),
        vf(
          'loading="lazy" est idéal pour la grande image tout en haut de la page.',
          false,
          'L’image visible dès l’ouverture doit charger au plus vite (c’est souvent elle qui compte pour le LCP). lazy est fait pour les images plus bas dans la page.',
        ),
        vf(
          'Indiquer width et height sur une image évite que le contenu saute pendant le chargement.',
          true,
          'Le navigateur calcule le ratio et réserve la place. Le CSS peut ensuite la redimensionner (max-width: 100%; height: auto) sans perdre cet avantage.',
        ),
      ]),
    ],
  ),

  unit(
    'accessibilite',
    'Formulaires et accessibilité',
    'Construire des formulaires clairs et des pages utilisables au clavier, au lecteur d’écran et par tous, selon les règles WCAG.',
    [
      lesson('formulaires', 'Des formulaires bien construits', [
        tip(
          'La structure d’un formulaire',
          '<form> regroupe des champs et dit où les envoyer : action (l’adresse) et method (get pour une recherche, post pour créer ou modifier des données).\n\nChaque champ a besoin de trois choses :\n• un <label> relié au champ (for="email" sur le label, id="email" sur le champ) : cliquer sur le texte active le champ, et le lecteur d’écran annonce le libellé ;\n• un attribut name : c’est la clé sous laquelle la valeur est envoyée au serveur (email=awa@exemple.com) ;\n• le bon type : il change le clavier proposé sur mobile et la validation automatique.\n\nLe placeholder n’est pas un libellé : il disparaît dès qu’on tape, il est souvent trop pâle et tout le monde ne l’entend pas. Utilise-le, si besoin, pour un exemple de format.',
          '<form action="/inscription" method="post">\n  <label for="email">Adresse e-mail</label>\n  <input id="email" name="email" type="email" autocomplete="email" required>\n\n  <label for="tel">Téléphone</label>\n  <input id="tel" name="tel" type="tel" autocomplete="tel">\n\n  <button type="submit">Créer mon compte</button>\n</form>',
        ),
        tip(
          'Les types de champs et l’autocomplétion',
          '• type="email" : clavier avec @, vérifie le format ;\n• type="tel" : pavé numérique de téléphone (aucune vérification de format, les numéros varient trop) ;\n• type="number" : pour des quantités ; pour un code PIN ou un numéro de carte, préfère type="text" avec inputmode="numeric" ;\n• type="password", type="date", type="url", type="search", type="checkbox", type="radio".\n\nautocomplete="email", "tel", "name", "street-address", "one-time-code"… permet au téléphone de remplir les champs : moins de fautes de frappe, moins de temps passé à taper. C’est aussi un critère WCAG (1.3.5).\n\nPour des boutons radio, donne le même name à toute l’option : c’est ce qui les rend exclusifs. Regroupe-les dans un <fieldset> avec une <legend> qui pose la question.',
          '<fieldset>\n  <legend>Moyen de paiement</legend>\n  <label><input type="radio" name="paiement" value="momo"> Mobile Money</label>\n  <label><input type="radio" name="paiement" value="livraison"> À la livraison</label>\n</fieldset>',
        ),
        qcm(
          'Pourquoi le placeholder ne remplace-t-il pas un <label> ?',
          [
            'Il est interdit par HTML5',
            'Il disparaît dès qu’on tape et n’est pas toujours annoncé ni assez contrasté',
            'Il n’est pas envoyé au serveur',
            'Il ralentit le chargement de la page',
          ],
          1,
          'Une fois le champ rempli, on ne sait plus ce qu’il demandait. Le label reste visible et il est fiable pour les technologies d’assistance.',
        ),
        fill(
          'Relie ce libellé au champ.',
          '<label ___="ville">Ville</label>\n<input id="ville" name="ville">',
          ['for', 'id', 'name', 'to'],
          'for',
          'for sur le label correspond à l’id du champ. Autre solution valable : mettre le champ à l’intérieur du <label>.',
        ),
        match('Associe chaque type de champ à son usage.', [
          ['type="email"', 'Clavier avec @ et vérification du format'],
          ['type="tel"', 'Pavé de numéro de téléphone'],
          ['type="password"', 'Saisie masquée'],
          ['type="date"', 'Sélecteur de date'],
          ['type="search"', 'Champ de recherche'],
        ]),
        qcm(
          'Quel attribut détermine la clé sous laquelle la valeur est envoyée au serveur ?',
          ['id', 'name', 'value', 'for'],
          1,
          'Un champ sans name n’est pas envoyé du tout. id sert à le relier au label et à le cibler en CSS ou en JavaScript.',
        ),
        vf(
          'Deux boutons radio qui portent le même name s’excluent l’un l’autre.',
          true,
          'Le name forme le groupe : cocher l’un décoche l’autre, et une seule valeur est envoyée.',
        ),
        tip(
          'La validation native',
          'HTML vérifie déjà beaucoup de choses sans une ligne de JavaScript :\n• required : champ obligatoire ;\n• minlength / maxlength : longueur du texte ;\n• min / max / step : bornes d’un nombre ou d’une date ;\n• pattern : une expression régulière que la valeur entière doit respecter ;\n• type="email" ou type="url" : format.\n\nTant qu’un champ est invalide, le formulaire ne part pas et le navigateur affiche un message. En CSS, :invalid et :user-invalid (seulement après interaction de l’utilisateur) permettent de styliser les erreurs.\n\nAttention : cette validation sert le confort de l’utilisateur, pas la sécurité. N’importe qui peut la contourner (outils de développement, requête directe). Le serveur doit toujours tout revérifier.',
          '<label for="code">Code de retrait (6 chiffres)</label>\n<input id="code" name="code" inputmode="numeric"\n       pattern="[0-9]{6}" required>',
        ),
        vf(
          'Avec required et pattern sur les champs, le serveur n’a plus besoin de vérifier les données.',
          false,
          'La validation HTML se contourne en une seconde. Elle évite les erreurs de bonne foi ; la sécurité, elle, se joue côté serveur.',
        ),
        qcm(
          'Dans un <form>, quel est le type par défaut d’un <button> sans attribut type ?',
          ['button', 'reset', 'submit', 'Aucun : il ne fait rien'],
          2,
          'Un <button> dans un formulaire envoie le formulaire par défaut. Pour un bouton qui fait autre chose (afficher le mot de passe), écris type="button".',
        ),
        order(
          'Écris un formulaire de paiement par téléphone.',
          [
            '<form action="/paiement" method="post">',
            '  <label for="numero">Numéro Mobile Money</label>',
            '  <input id="numero" name="numero" type="tel" autocomplete="tel" required>',
            '  <button type="submit">Payer 5 000 F CFA</button>',
            '</form>',
          ],
          'Le formulaire, le libellé, le champ (relié par id, nommé, bien typé, obligatoire), puis le bouton d’envoi.',
        ),
      ]),

      lesson('clavier-focus', 'Clavier, focus et boutons', [
        tip(
          'Tout doit marcher au clavier',
          'Beaucoup de gens n’utilisent pas de souris : personnes aveugles ou à mobilité réduite, utilisateurs d’un clavier Bluetooth sur tablette, développeurs pressés. Le critère WCAG 2.1.1 l’exige : toute fonction doit être utilisable au clavier.\n\nLes touches de base : Tab avance d’un élément interactif, Maj+Tab recule, Entrée active un lien ou un bouton, Espace active un bouton ou coche une case, les flèches se déplacent dans un groupe de radios ou une liste.\n\nLes éléments natifs (<a href>, <button>, <input>, <select>, <textarea>) sont focusables et activables au clavier sans effort. Un <div onclick> ne l’est pas : il n’est pas atteignable avec Tab et n’est pas annoncé comme un bouton.\n\nLa règle d’or : un lien pour aller ailleurs (changer d’URL), un bouton pour agir (ouvrir un menu, ajouter au panier, envoyer).',
          '<!-- Non : pas de clavier, pas de rôle -->\n<div class="btn" onclick="ajouter()">Ajouter</div>\n\n<!-- Oui -->\n<button type="button" class="btn">Ajouter au panier</button>',
        ),
        tip(
          'Un focus toujours visible',
          'Le focus, c’est l’élément qui reçoit le clavier. Le navigateur l’entoure d’un contour : sans lui, l’utilisateur au clavier est perdu, comme une souris sans curseur. Ne fais jamais outline: none sans proposer un autre style (critère WCAG 2.4.7).\n\nLa pseudo-classe :focus-visible ne s’applique que lorsque le navigateur juge utile de montrer le focus (navigation au clavier, champ de saisie), pas après un clic de souris sur un bouton. C’est le bon endroit pour un contour bien visible.\n\nL’ordre du focus suit l’ordre du HTML. Si le CSS réordonne visuellement (order en Flexbox, placement en Grid, flex-direction: row-reverse), le focus saute de façon incohérente : garde un ordre de code logique.',
          'button:focus-visible,\na:focus-visible {\n  outline: 3px solid #f59e0b;\n  outline-offset: 2px;\n}',
        ),
        qcm(
          'Un bouton « Ajouter au panier » est codé en <div onclick="…">. Quel est le problème principal ?',
          [
            'Il est plus lent à afficher',
            'Il n’est ni atteignable au clavier ni annoncé comme un bouton',
            'Le CSS ne peut pas le styliser',
            'Il ne marche pas sur mobile',
          ],
          1,
          'Il marche à la souris et au toucher, mais pas au clavier, et le lecteur d’écran ne dit pas que c’est un bouton. <button> règle tout d’un coup.',
        ),
        vf(
          'Mettre outline: none sur tous les éléments, sans autre style de focus, est une bonne pratique pour un design propre.',
          false,
          'C’est l’une des erreurs d’accessibilité les plus fréquentes : la navigation au clavier devient impossible à suivre. Remplace le contour, ne le supprime pas.',
        ),
        fill(
          'Montre un contour seulement quand le focus doit être visible.',
          'button:___ {\n  outline: 3px solid #f59e0b;\n}',
          ['focus-visible', 'hover', 'active', 'visited'],
          'focus-visible',
          ':focus-visible cible le focus utile (clavier), sans contour gênant après un clic de souris.',
        ),
        tip(
          'tabindex et lien d’évitement',
          'tabindex modifie la navigation au clavier :\n• tabindex="0" : rend focusable un élément qui ne l’est pas, à sa place dans l’ordre du HTML (utile pour un composant sur mesure… mais un élément natif est presque toujours mieux) ;\n• tabindex="-1" : l’élément n’est pas atteint par Tab, mais JavaScript peut lui donner le focus avec element.focus() (un titre après un changement de page, une boîte de dialogue) ;\n• une valeur positive (tabindex="3") impose un ordre manuel : à éviter, c’est ingérable et déroutant.\n\nLe lien d’évitement « Aller au contenu » est le premier lien de la page : il permet de sauter le menu à chaque page au lieu de faire Tab vingt fois. On le cache visuellement et on l’affiche quand il reçoit le focus.',
          '<a href="#contenu" class="evitement">Aller au contenu</a>\n<header>…menu…</header>\n<main id="contenu">…</main>',
        ),
        match('Associe chaque valeur de tabindex à son effet.', [
          ['tabindex="0"', 'Focusable, dans l’ordre naturel du HTML'],
          ['tabindex="-1"', 'Focusable seulement par JavaScript'],
          ['tabindex="4"', 'Ordre forcé, à éviter'],
          ['Pas de tabindex sur un <button>', 'Déjà focusable nativement'],
        ]),
        qcm(
          'Tu as un lien « Voir plus » qui charge des produits sans changer d’URL. Que choisir ?',
          [
            '<a href="#">Voir plus</a>',
            '<span onclick>Voir plus</span>',
            '<button type="button">Voir plus</button>',
            '<a>Voir plus</a>',
          ],
          2,
          'L’action ne mène nulle part : c’est un bouton. Un <a href="#"> remonte en haut de page et est annoncé comme un lien, ce qui trompe l’utilisateur.',
        ),
        vf(
          'Un bouton natif s’active au clavier avec Entrée et avec Espace.',
          true,
          '<button> gère les deux touches tout seul. Un div avec role="button" devrait reproduire ce comportement en JavaScript.',
        ),
        qcm(
          'À quoi sert un lien « Aller au contenu » en tout début de page ?',
          [
            'À améliorer le référencement',
            'À permettre aux utilisateurs du clavier de sauter le menu',
            'À recharger la page',
            'À afficher le plan du site',
          ],
          1,
          'Sans lui, il faut traverser tous les liens du menu sur chaque page. C’est le critère WCAG 2.4.1 (contourner les blocs).',
        ),
      ]),

      lesson('aria-contraste', 'ARIA, contraste et contenus pour tous', [
        tip(
          'ARIA : la première règle',
          'ARIA (Accessible Rich Internet Applications) ajoute des informations pour les technologies d’assistance : un rôle (role="dialog"), un nom (aria-label), un état (aria-expanded="true").\n\nPremière règle d’ARIA : si un élément HTML natif fait le travail, utilise-le. Un <button> vaut mieux qu’un <div role="button">, car ARIA ne change que ce qui est annoncé, jamais le comportement : pas de focus, pas de clavier, pas d’envoi de formulaire.\n\nLes attributs les plus utiles :\n• aria-label : donne un nom à un élément sans texte visible (bouton icône) ;\n• aria-labelledby / aria-describedby : relient un élément à un texte présent dans la page (titre, consigne, message d’erreur) ;\n• aria-expanded : indique si un menu ou un accordéon est ouvert ;\n• aria-hidden="true" : cache un élément décoratif aux lecteurs d’écran (jamais sur un élément focusable).\n\nRetiens : pas d’ARIA vaut mieux qu’un ARIA faux.',
          '<button type="button" aria-label="Fermer le panier">\n  <svg aria-hidden="true">…</svg>\n</button>\n\n<button type="button" aria-expanded="false" aria-controls="menu">Menu</button>',
        ),
        tip(
          'Annoncer ce qui change',
          'Quand JavaScript modifie la page sans la recharger (« Article ajouté au panier », « Paiement refusé »), un utilisateur aveugle ne voit pas le changement. Une région live le fait annoncer :\n• aria-live="polite" ou role="status" : annonce quand le lecteur d’écran a fini de parler (le cas courant) ;\n• role="alert" (équivalent à aria-live="assertive") : interrompt, à réserver aux erreurs urgentes.\n\nLa région doit exister dans la page avant que tu changes son contenu, sinon certains lecteurs d’écran ne l’annoncent pas.\n\nPour une erreur de champ, relie le message avec aria-describedby et marque le champ avec aria-invalid="true".',
          '<p role="status" id="info-panier"></p>\n\n<label for="tel">Téléphone</label>\n<input id="tel" type="tel" aria-invalid="true" aria-describedby="err-tel">\n<p id="err-tel">Le numéro doit contenir 10 chiffres.</p>',
        ),
        tip(
          'Contraste, couleur et confort',
          'Les règles WCAG 2.2 (niveau AA, celui que visent la plupart des lois) à connaître :\n• contraste du texte d’au moins 4.5:1 avec le fond, 3:1 pour le grand texte (24 px, ou environ 18,7 px en gras) ;\n• contraste de 3:1 pour les composants d’interface et les icônes utiles (bordure d’un champ, contour de focus) ;\n• l’information ne doit jamais passer uniquement par la couleur : un champ en erreur a aussi un message et une icône ;\n• le texte doit pouvoir être agrandi à 200 % sans perte de contenu (d’où les unités rem) ;\n• les cibles tactiles mesurent au moins 24 × 24 px (critère 2.5.8) ; 44 × 44 px est encore plus confortable sur un téléphone ;\n• respecte prefers-reduced-motion pour ceux que les animations rendent malades.\n\nUn gris clair sur blanc paraît élégant sur ton écran neuf, illisible sur un vieux téléphone en plein soleil.',
        ),
        qcm(
          'Un bouton ne contient qu’une icône de corbeille. Comment lui donner un nom accessible ?',
          [
            'title="corbeille" sur le svg',
            'aria-label="Supprimer l’article"',
            'role="icon"',
            'alt="corbeille" sur le bouton',
          ],
          1,
          'aria-label donne au bouton un nom qui décrit l’action. alt n’existe pas sur <button>, et title est mal pris en charge par les lecteurs d’écran et invisible au toucher.',
        ),
        vf(
          'Ajouter role="button" à un <div> le rend utilisable au clavier.',
          false,
          'ARIA change seulement l’annonce. Il faudrait aussi tabindex="0" et gérer Entrée et Espace en JavaScript : utilise plutôt <button>.',
        ),
        qcm(
          'Quel ratio de contraste minimal WCAG AA exige-t-on pour un texte de taille normale ?',
          ['2:1', '3:1', '4.5:1', '7:1'],
          2,
          '4.5:1 pour le texte normal, 3:1 pour le grand texte. 7:1 correspond au niveau AAA, plus exigeant.',
        ),
        match('Associe chaque attribut ARIA à son usage.', [
          ['aria-label', 'Nommer un élément sans texte visible'],
          ['aria-expanded', 'Dire si un menu est ouvert'],
          ['aria-describedby', 'Relier une consigne ou une erreur'],
          ['aria-hidden="true"', 'Masquer un décor aux lecteurs d’écran'],
          ['aria-live="polite"', 'Annoncer un changement dynamique'],
        ]),
        fill(
          'Fais annoncer poliment le message de confirmation du panier.',
          '<p aria-live="___" id="confirmation"></p>',
          ['polite', 'assertive', 'off', 'loud'],
          'polite',
          'polite attend une pause pour annoncer ; assertive interrompt et doit rester réservé à l’urgent ; off désactive l’annonce.',
        ),
        vf(
          'Signaler les champs en erreur uniquement par une bordure rouge est accessible.',
          false,
          'Les personnes daltoniennes ou qui utilisent un lecteur d’écran ne le perçoivent pas. Ajoute un texte d’erreur relié au champ (aria-describedby).',
        ),
        qcm(
          'Pourquoi ne jamais mettre aria-hidden="true" sur un bouton visible ?',
          [
            'Le bouton deviendrait invisible à l’écran',
            'Le bouton recevrait le focus sans être annoncé : l’utilisateur tomberait sur un élément muet',
            'Le formulaire ne serait plus envoyé',
            'Cela désactive le CSS du bouton',
          ],
          1,
          'aria-hidden ne retire ni l’affichage ni le focus : il retire seulement l’élément de l’arbre d’accessibilité. Un élément focusable caché ainsi devient un piège.',
        ),
      ]),

      lesson('recap-a11y', 'Récap et pratique', [
        tip(
          'Ce qu’il faut retenir',
          '• Chaque champ a un <label> relié, un name, le bon type et, si possible, un autocomplete.\n• La validation HTML aide l’utilisateur ; le serveur revérifie toujours.\n• Un lien pour naviguer, un bouton pour agir ; tout doit marcher au clavier, avec un focus visible.\n• tabindex="0" ou "-1" seulement si nécessaire, jamais de valeur positive.\n• ARIA en dernier recours : il change l’annonce, pas le comportement.\n• Contraste 4.5:1 pour le texte, information jamais portée par la seule couleur, cibles tactiles assez grandes.\n\nL’accessibilité n’est pas un bonus : en Afrique comme ailleurs, une part importante des visiteurs a un handicap, un vieil écran, une connexion faible ou une seule main libre.',
        ),
        tip(
          'Tester l’accessibilité',
          'Les outils automatiques (Lighthouse, axe DevTools, WAVE) trouvent vite les erreurs évidentes : alt manquant, contraste trop faible, champ sans libellé. Mais ils ne détectent qu’une partie des problèmes.\n\nComplète par des tests manuels :\n• débranche la souris et parcours la page avec Tab : tout est-il atteignable, dans un ordre logique, avec un focus visible ?\n• zoome à 200 % : le contenu reste-t-il lisible sans défilement horizontal ?\n• écoute la page avec un lecteur d’écran gratuit : NVDA sur Windows, VoiceOver sur Mac et iPhone, TalkBack sur Android.',
        ),
        qcm(
          'Quel test manuel révèle le mieux un problème de navigation au clavier ?',
          [
            'Lancer Lighthouse',
            'Parcourir toute la page avec Tab, sans souris',
            'Valider le HTML',
            'Tester sur un écran plus grand',
          ],
          1,
          'Un audit automatique ne sait pas si l’ordre du focus a du sens ou si un menu se ferme au clavier. Seule la pratique le montre.',
        ),
        match('Associe chaque problème à sa correction.', [
          ['Champ sans libellé', '<label for> relié à l’id du champ'],
          ['Bouton icône muet', 'aria-label qui décrit l’action'],
          ['Focus invisible', 'Style :focus-visible contrasté'],
          ['Erreur signalée en rouge seulement', 'Message texte relié au champ'],
          ['div cliquable', '<button type="button">'],
        ]),
        vf(
          'Un score de 100 en accessibilité dans Lighthouse garantit qu’une page est accessible.',
          false,
          'Les tests automatiques ne couvrent qu’une partie des critères WCAG. Un 100 signifie seulement « aucune erreur détectable automatiquement ».',
        ),
        fill(
          'Complète pour qu’un seul moyen de paiement puisse être choisi.',
          '<input type="___" name="paiement" value="momo">\n<input type="radio" name="paiement" value="carte">',
          ['radio', 'checkbox', 'option', 'select'],
          'radio',
          'Des boutons radio de même name s’excluent. Des checkbox permettraient de cocher plusieurs choix.',
        ),
        qcm(
          'Ton formulaire affiche « Commande envoyée » sans recharger la page. Comment le faire entendre aux utilisateurs de lecteur d’écran ?',
          [
            'Mettre le message en gras',
            'Ouvrir une alerte avec alert()',
            'Écrire le message dans un élément role="status" déjà présent dans la page',
            'Changer le <title> de la page',
          ],
          2,
          'Une région live (role="status" ou aria-live="polite") annonce son nouveau contenu sans voler le focus. alert() fonctionne mais bloque toute la page.',
        ),
        order(
          'Range ces solutions de la plus recommandée à la moins recommandée pour un bouton.',
          [
            '<button type="button">',
            '<div role="button" tabindex="0"> avec gestion du clavier en JS',
            '<div role="button"> sans tabindex',
            '<div onclick>',
          ],
          'Le natif d’abord. Un div avec rôle, focus et clavier peut marcher mais demande du travail ; sans tabindex il est inatteignable ; sans rôle il est en plus muet.',
        ),
        qcm(
          'Quel attribut fait proposer au téléphone le code reçu par SMS ?',
          [
            'autocomplete="one-time-code"',
            'type="sms"',
            'inputmode="sms"',
            'autocomplete="password"',
          ],
          0,
          'one-time-code permet aux téléphones de suggérer le code reçu par SMS au-dessus du clavier : un gain réel lors d’une validation de paiement.',
        ),
        vf(
          'Un texte gris #999 sur fond blanc respecte le contraste 4.5:1.',
          false,
          '#999999 sur blanc donne environ 2.8:1. Il faut descendre vers #767676 (environ 4.5:1) ou plus foncé pour du texte normal.',
        ),
      ]),
    ],
  ),

  unit(
    'css-cascade',
    'CSS : sélecteurs et cascade',
    'Cibler précisément les éléments et prévoir quelle règle s’applique quand plusieurs se contredisent.',
    [
      lesson('regles-css', 'Écrire et relier du CSS', [
        tip(
          'Une règle CSS',
          'Une règle dit : « pour ces éléments, applique ces styles ». Elle commence par un sélecteur, suivi d’un bloc de déclarations entre accolades. Chaque déclaration est une paire propriété: valeur; terminée par un point-virgule.\n\nTrois façons d’ajouter du CSS :\n• un fichier externe relié par <link rel="stylesheet" href="style.css"> dans <head> : la méthode recommandée, le fichier est mis en cache et partagé par toutes les pages ;\n• une balise <style> dans la page : pratique pour un petit style critique ;\n• l’attribut style="…" sur un élément : à éviter, il est difficile à maintenir et l’emporte sur presque tout.\n\nLes commentaires s’écrivent /* comme ceci */. Si une déclaration est invalide (faute de frappe, propriété inconnue), le navigateur l’ignore et passe à la suivante : le reste de la règle s’applique. Pratique, mais un style « qui ne marche pas » cache souvent une simple faute : l’onglet Styles des DevTools barre les déclarations ignorées.',
          '/* Carte produit */\n.carte {\n  background: white;\n  padding: 16px;\n  border-radius: 8px;\n}',
        ),
        tip(
          'Couleurs et texte',
          'Les couleurs s’écrivent de plusieurs façons :\n• un nom : white, navy ;\n• hexadécimal : #1d4ed8, ou #fff en version courte, #1d4ed880 avec transparence ;\n• rgb(29 78 216) ou rgb(29 78 216 / 50%) pour la transparence ;\n• hsl(224 76% 48%) : teinte, saturation, luminosité, pratique pour créer des nuances.\n\nPour le texte :\n• font-family prend une liste de polices, la dernière étant une famille générique de secours (sans-serif, serif, monospace) ;\n• line-height sans unité (1.5) se recalcule pour chaque taille de texte : c’est la forme recommandée ;\n• font-weight: 400 (normal) ou 700 (gras) ; text-align, text-decoration, text-transform, letter-spacing complètent la palette.',
          'body {\n  font-family: "Poppins", system-ui, sans-serif;\n  line-height: 1.5;\n  color: #1f2937;\n}',
        ),
        qcm(
          'Dans « .prix { color: green; } », comment s’appelle « color » ?',
          ['Le sélecteur', 'La valeur', 'La propriété', 'La classe'],
          2,
          '.prix est le sélecteur, color la propriété, green la valeur. L’ensemble color: green; forme une déclaration.',
        ),
        vf(
          'Si une règle contient une déclaration invalide, toute la règle est ignorée.',
          false,
          'Seule la déclaration fautive est ignorée ; les autres s’appliquent. C’est ce qui permet d’utiliser une propriété récente sans casser les vieux navigateurs.',
        ),
        fill(
          'Relie la feuille de style à la page.',
          '<link rel="___" href="style.css">',
          ['stylesheet', 'style', 'css', 'icon'],
          'stylesheet',
          'rel="stylesheet" indique que le fichier est une feuille de style. Cette balise se place dans <head>.',
        ),
        qcm(
          'Pourquoi un fichier CSS externe plutôt que des attributs style sur chaque élément ?',
          [
            'Les attributs style ne fonctionnent pas sur mobile',
            'Le fichier est mis en cache et partagé par toutes les pages, et les styles restent faciles à modifier',
            'Un fichier externe s’applique avant le HTML',
            'Les attributs style sont interdits en HTML5',
          ],
          1,
          'On change une couleur une fois au lieu de cent, et le visiteur ne retélécharge pas le style à chaque page : précieux sur une connexion lente.',
        ),
        tip(
          'Les variables CSS',
          'Les propriétés personnalisées (custom properties) stockent une valeur réutilisable. Elles commencent par deux tirets et se lisent avec var().\n\nOn les déclare souvent sur :root (l’élément <html>) pour qu’elles soient disponibles partout, car elles s’héritent. var() accepte une valeur de secours : var(--accent, orange).\n\nLeur force : elles peuvent changer selon le contexte. Une règle .theme-sombre ou une media query qui redéfinit --fond met à jour tous les éléments qui l’utilisent, sans toucher au reste. Attention, leur nom est sensible à la casse : --Accent et --accent sont deux variables différentes.',
          ':root {\n  --primaire: #1d4ed8;\n  --espace: 16px;\n}\n.bouton {\n  background: var(--primaire);\n  padding: var(--espace);\n}',
        ),
        fill(
          'Utilise la variable de couleur principale.',
          '.lien {\n  color: ___(--primaire);\n}',
          ['var', 'val', 'use', '$'],
          'var',
          'var(--nom) lit une propriété personnalisée. On peut ajouter une valeur de secours : var(--primaire, blue).',
        ),
        match('Associe chaque écriture à son format de couleur.', [
          ['#1d4ed8', 'Hexadécimal'],
          ['rgb(29 78 216 / 50%)', 'Rouge, vert, bleu avec transparence'],
          ['hsl(224 76% 48%)', 'Teinte, saturation, luminosité'],
          ['navy', 'Couleur nommée'],
        ]),
        qcm(
          'Pourquoi terminer font-family par une famille générique comme sans-serif ?',
          [
            'C’est obligatoire, sinon la règle est ignorée',
            'Pour que le navigateur ait une police de secours si les autres ne sont pas disponibles',
            'Pour charger la police plus vite',
            'Pour activer le gras',
          ],
          1,
          'Si la police web n’a pas pu se télécharger (réseau coupé), le navigateur utilise la première police disponible de la liste, et en dernier recours la famille générique.',
        ),
      ]),

      lesson('selecteurs', 'Les sélecteurs', [
        tip(
          'Les sélecteurs de base',
          '• p : tous les éléments <p> (sélecteur de type) ;\n• .carte : tous les éléments avec class="carte" ; un élément peut avoir plusieurs classes (class="carte promo") ;\n• #panier : l’élément avec id="panier" (un id est unique dans la page) ;\n• * : tous les éléments ;\n• [type="email"] : les éléments qui ont cet attribut avec cette valeur ; [href^="https"] commence par, [href$=".pdf"] finit par ;\n• h1, h2, h3 : la virgule groupe plusieurs sélecteurs pour une même règle.\n\nOn peut combiner sans espace : a.actif cible les <a> qui ont la classe actif, .carte.promo les éléments qui ont les deux classes.\n\nBonne pratique : style surtout avec des classes. Elles sont réutilisables et ont une spécificité modérée ; les id en CSS rendent les règles difficiles à surcharger.',
          'a[href$=".pdf"] {\n  font-weight: 700;\n}\n.carte.promo {\n  border-color: orange;\n}',
        ),
        tip(
          'Les combinateurs',
          'Ils ciblent un élément selon sa place par rapport à un autre :\n• nav a (espace) : les <a> descendants de nav, à n’importe quelle profondeur ;\n• ul > li : les <li> enfants directs de ul ;\n• h2 + p : le <p> placé juste après un h2 (frère adjacent) ;\n• h2 ~ p : tous les <p> frères placés après un h2.\n\nÉvite les chaînes trop longues comme body main .liste ul li a span : elles sont fragiles (le moindre changement de HTML les casse) et difficiles à surcharger.',
          '.menu > li {\n  display: inline-block;\n}\nh2 + p {\n  font-size: 1.125rem;\n}',
        ),
        match('Associe chaque sélecteur à ce qu’il cible.', [
          ['.carte', 'Les éléments de classe « carte »'],
          ['#panier', 'L’élément d’id « panier »'],
          ['nav a', 'Les liens n’importe où dans nav'],
          ['ul > li', 'Les li enfants directs d’un ul'],
          ['h2 + p', 'Le paragraphe juste après un h2'],
        ]),
        qcm(
          'Quel sélecteur cible les liens vers un fichier PDF ?',
          ['a[href="pdf"]', 'a[href$=".pdf"]', 'a.pdf', 'a[href^=".pdf"]'],
          1,
          '$= signifie « finit par ». ^= signifie « commence par » et = demande une égalité exacte.',
        ),
        vf(
          '.carte.promo et .carte .promo ciblent les mêmes éléments.',
          false,
          'Sans espace : un élément qui a les deux classes. Avec espace : un élément .promo situé à l’intérieur d’un élément .carte.',
        ),
        tip(
          'Pseudo-classes et pseudo-éléments',
          'Une pseudo-classe (un deux-points) cible un état ou une position :\n• :hover (survol), :focus-visible (focus clavier), :active (pendant le clic) ;\n• :checked, :disabled, :invalid, :user-invalid pour les formulaires ;\n• :first-child, :last-child, :nth-child(2n) ou :nth-child(odd) pour une position ;\n• :not(.actif) pour exclure ; :has(img) pour cibler un parent selon son contenu (.carte:has(img) : les cartes qui contiennent une image).\n\nUn pseudo-élément (deux deux-points) cible une partie d’un élément : ::before et ::after créent un contenu décoratif (la propriété content est obligatoire, même vide), ::placeholder stylise le texte indicatif, ::first-letter la première lettre.\n\nAttention : le texte placé dans content n’est pas sélectionnable et n’est pas toujours lu correctement par les lecteurs d’écran. N’y mets jamais d’information importante.',
          'tr:nth-child(even) {\n  background: #f3f4f6;\n}\n.obligatoire::after {\n  content: " *";\n  color: #b91c1c;\n}',
        ),
        fill(
          'Colore une ligne sur deux du tableau.',
          'tr:___(odd) {\n  background: #f3f4f6;\n}',
          ['nth-child', 'first-child', 'every', 'odd-child'],
          'nth-child',
          ':nth-child(odd) cible les 1er, 3e, 5e… enfants ; even ou 2n cible les pairs.',
        ),
        qcm(
          'Que manque-t-il pour que ce ::before s’affiche ?',
          ['display: block', 'Une propriété content', 'Un z-index', 'Rien, il s’affiche déjà'],
          1,
          'Sans content (même content: ""), ::before et ::after ne sont pas générés.',
          '.badge::before {\n  color: red;\n  margin-right: 4px;\n}',
        ),
        qcm(
          'Que cible .carte:has(.promo) ?',
          [
            'Les éléments .promo dans une carte',
            'Les cartes qui contiennent un élément .promo',
            'Les cartes qui n’ont pas de promo',
            'Les éléments qui ont les deux classes',
          ],
          1,
          ':has() cible l’élément de gauche selon ce qu’il contient : c’est le « sélecteur parent » longtemps attendu, disponible dans tous les navigateurs récents.',
        ),
        vf(
          'Un pseudo-élément s’écrit avec deux deux-points, comme ::after.',
          true,
          'Les deux deux-points distinguent les pseudo-éléments (une partie de l’élément) des pseudo-classes (un état). Les navigateurs acceptent encore :after par compatibilité.',
        ),
      ]),

      lesson('cascade-specificite', 'Cascade, spécificité et héritage', [
        tip(
          'Quand deux règles se contredisent',
          'Plusieurs règles peuvent viser le même élément avec la même propriété. La cascade décide laquelle gagne, en comparant dans cet ordre :\n• l’origine et l’importance : les styles de l’auteur battent ceux du navigateur, et !important passe devant les déclarations normales ;\n• la spécificité du sélecteur : la plus précise l’emporte ;\n• l’ordre d’apparition : à spécificité égale, la dernière règle lue gagne.\n\nUn attribut style="…" sur l’élément l’emporte sur toute règle d’une feuille de style (sauf !important).\n\n!important est une arme de dernier recours : il casse la logique normale et pousse à en ajouter d’autres pour le contrer. Si tu en as besoin, c’est souvent que tes sélecteurs sont trop spécifiques ailleurs.',
          'p { color: black; }\np { color: navy; }   /* gagne : même spécificité, plus loin */',
        ),
        tip(
          'Calculer la spécificité',
          'La spécificité se compte en trois colonnes (A, B, C), comparées de gauche à droite :\n• A : le nombre d’id ;\n• B : le nombre de classes, d’attributs et de pseudo-classes ;\n• C : le nombre d’éléments (types) et de pseudo-éléments.\n\nExemples :\n• p → (0, 0, 1) ;\n• .carte → (0, 1, 0) ;\n• ul li.actif → (0, 1, 2) ;\n• a:hover → (0, 1, 1) ;\n• #menu .lien → (1, 1, 0).\n\nUn seul id bat n’importe quel nombre de classes : (1, 0, 0) > (0, 12, 0). Le sélecteur universel * et les combinateurs (espace, >, +, ~) comptent zéro. :is() et :not() prennent la spécificité de leur argument le plus spécifique ; :where() compte toujours zéro, pratique pour des styles par défaut faciles à surcharger.',
        ),
        qcm(
          'Quelle couleur prend le lien ?',
          ['red', 'blue', 'green', 'black'],
          2,
          '#menu a vaut (1, 0, 1) et bat .menu a.lien (0, 2, 1) : l’id l’emporte, peu importe l’ordre.',
          '<nav id="menu" class="menu">\n  <a class="lien" href="/">Accueil</a>\n</nav>\n\n#menu a { color: green; }\n.menu a.lien { color: blue; }\na { color: red; }',
        ),
        qcm(
          'Quelle est la spécificité de « nav ul li.actif a » ?',
          ['(0, 1, 4)', '(0, 4, 1)', '(1, 1, 4)', '(0, 1, 5)'],
          0,
          'Une classe (.actif) en colonne B, quatre éléments (nav, ul, li, a) en colonne C.',
        ),
        vf(
          'À spécificité égale, c’est la règle écrite le plus tard qui l’emporte.',
          true,
          'L’ordre d’apparition départage les égalités, y compris entre fichiers : un fichier relié après l’autre passe devant.',
        ),
        tip(
          'L’héritage',
          'Certaines propriétés passent du parent aux enfants : color, font-family, font-size, line-height, text-align, visibility, cursor… C’est pour cela qu’on règle la police une fois sur body.\n\nD’autres ne s’héritent pas, sinon ce serait le chaos : margin, padding, border, background, width, height, display.\n\nUne valeur héritée a moins de poids que n’importe quelle règle qui cible directement l’élément, même un simple p { … }.\n\nMots-clés utiles :\n• inherit : prendre la valeur du parent ;\n• initial : revenir à la valeur initiale définie par la norme ;\n• unset : inherit si la propriété s’hérite, initial sinon.\n\nPiège classique : les champs de formulaire n’héritent pas de la police par défaut. Ajoute button, input, select, textarea { font: inherit; }.',
          'body {\n  font-family: system-ui, sans-serif;\n  color: #1f2937;\n}\nbutton,\ninput {\n  font: inherit;\n}',
        ),
        match('Indique si chaque propriété est héritée.', [
          ['color', 'Héritée : la couleur du texte vient du parent'],
          ['margin', 'Non héritée : chaque boîte a ses propres marges'],
          ['font-family', 'Héritée : on la règle une fois sur body'],
          ['background', 'Non héritée : le fond est transparent par défaut'],
        ]),
        qcm(
          'Le body a color: navy et le HTML est <p class="note"><em>Urgent</em></p>. Avec la seule règle .note { color: red; }, quelle couleur prend « Urgent » ?',
          ['navy', 'red', 'black', 'La couleur par défaut du navigateur'],
          1,
          '<em> n’a pas de règle propre : il hérite de son parent le plus proche, le <p class="note">, qui est rouge.',
        ),
        fill(
          'Fais hériter la police dans les boutons.',
          'button {\n  font: ___;\n}',
          ['inherit', 'initial', 'parent', 'auto'],
          'inherit',
          'inherit force la reprise de la valeur du parent. initial reviendrait à la police par défaut, sans rapport avec ton site.',
        ),
        vf(
          'Une seule règle avec un id bat une règle avec dix classes.',
          true,
          'Les colonnes se comparent de gauche à droite : (1, 0, 0) l’emporte sur (0, 10, 0). D’où le conseil d’éviter les id dans le CSS.',
        ),
      ]),

      lesson('recap-css', 'Récap et pratique', [
        tip(
          'Ce qu’il faut retenir',
          '• Une règle : sélecteur { propriété: valeur; }. Le CSS se place dans un fichier externe relié par <link>.\n• Sélecteurs : type, .classe, #id, [attribut], combinateurs (espace, >, +, ~), pseudo-classes (:hover, :focus-visible, :nth-child, :not, :has) et pseudo-éléments (::before, ::after avec content).\n• Cascade : importance, puis spécificité (id, classes, éléments), puis ordre d’apparition.\n• Héritage : le texte s’hérite (color, font), la boîte non (margin, padding, border).\n• Variables : --nom sur :root, lues avec var().\n\nPour débugger : clic droit, « Inspecter », onglet Styles. Les déclarations barrées ont perdu la cascade ; le panneau « Calculé » montre la valeur finale et d’où elle vient.',
        ),
        tip(
          'Organiser son CSS',
          'Quelques habitudes qui évitent les guerres de spécificité :\n• des noms de classes qui décrivent le rôle (.carte-produit, .bouton-principal), pas l’apparence (.rouge, .gauche) ;\n• des sélecteurs courts, à une ou deux classes ;\n• les styles généraux d’abord (éléments, variables), les composants ensuite, les exceptions à la fin ;\n• des variables pour les couleurs, espacements et rayons répétés.\n\nAinsi, une nouvelle règle n’a presque jamais besoin de !important pour s’appliquer.',
        ),
        qcm(
          'Quel sélecteur a la plus forte spécificité ?',
          ['.panier .article .prix', 'main section article p', '#panier', 'a:hover'],
          2,
          '#panier vaut (1, 0, 0) : un id bat les trois classes de .panier .article .prix (0, 3, 0).',
        ),
        order(
          'Range ces critères dans l’ordre où la cascade les examine.',
          ['Origine et importance (!important)', 'Spécificité du sélecteur', 'Ordre d’apparition'],
          'L’ordre d’apparition ne sert qu’à départager deux règles d’égale importance et d’égale spécificité.',
        ),
        fill(
          'Cible tous les champs de type e-mail.',
          'input[___="email"] {\n  border-color: #2563eb;\n}',
          ['type', 'name', 'class', 'kind'],
          'type',
          'Le sélecteur d’attribut [type="email"] cible tous les champs dont l’attribut type vaut email.',
        ),
        vf(
          'Un attribut style="color: red" sur un élément l’emporte sur la règle #id p { color: blue; }.',
          true,
          'Le style en ligne passe devant toutes les règles des feuilles de style. Seul !important pourrait le battre, ce qui montre pourquoi il faut éviter les deux.',
        ),
        match('Associe chaque sélecteur à sa spécificité.', [
          ['p', '(0, 0, 1)'],
          ['.carte p', '(0, 1, 1)'],
          ['#menu .lien', '(1, 1, 0)'],
          ['ul li.actif', '(0, 1, 2)'],
        ]),
        qcm(
          'Une règle .bouton { color: white; } ne s’applique pas. L’onglet Styles la montre barrée. Que signifie ce trait ?',
          [
            'La propriété n’existe pas',
            'Une autre règle plus forte dans la cascade définit la même propriété',
            'Le fichier CSS n’est pas chargé',
            'Le navigateur ne prend pas en charge la couleur blanche',
          ],
          1,
          'Barrée = écrasée par une règle plus spécifique, plus importante ou plus tardive. Une propriété invalide, elle, s’affiche avec une icône d’avertissement.',
        ),
        qcm(
          'Que fait ce code ?',
          [
            'Ajoute un astérisque rouge après les libellés de classe « requis »',
            'Rend les champs obligatoires',
            'Remplace le texte du libellé par *',
            'Ne fait rien : content est invalide',
          ],
          0,
          '::after insère un contenu décoratif après le contenu de l’élément. Le caractère obligatoire du champ, lui, reste à indiquer en HTML (required) et en texte.',
          'label.requis::after {\n  content: " *";\n  color: #b91c1c;\n}',
        ),
        vf(
          'Les champs <input> et <button> héritent automatiquement de la police du body.',
          false,
          'Par défaut, le navigateur leur applique sa propre police système. La règle font: inherit corrige ce piège.',
        ),
      ]),
    ],
  ),

  unit(
    'css-boite',
    'Boîte, unités et positionnement',
    'Maîtriser le modèle de boîte, choisir les bonnes unités et placer un élément exactement où il faut.',
    [
      lesson('modele-boite', 'Le modèle de boîte', [
        tip(
          'Chaque élément est une boîte',
          'Pour le navigateur, chaque élément est un rectangle composé de quatre couches, de l’intérieur vers l’extérieur :\n• le contenu (texte, image), dimensionné par width et height ;\n• le padding : l’espace intérieur, qui prend la couleur de fond de l’élément ;\n• la bordure (border) ;\n• la marge (margin) : l’espace extérieur, toujours transparent, qui écarte les voisins.\n\nPar défaut (box-sizing: content-box), width ne compte que le contenu : une boîte width: 300px avec 20px de padding et 1px de bordure occupe 342 px. Avec box-sizing: border-box, width inclut le padding et la bordure : la boîte fait 300 px, point. C’est tellement plus simple que presque tous les projets commencent par l’appliquer partout.',
          '*,\n*::before,\n*::after {\n  box-sizing: border-box;\n}\n.carte {\n  width: 300px;\n  padding: 20px;\n  border: 1px solid #d1d5db;\n  margin-bottom: 24px;\n}',
        ),
        tip(
          'Les raccourcis et le centrage',
          'margin et padding acceptent de une à quatre valeurs, dans le sens des aiguilles d’une montre en partant du haut :\n• margin: 16px → les quatre côtés ;\n• margin: 8px 16px → haut et bas 8px, gauche et droite 16px ;\n• margin: 8px 16px 24px → haut 8px, côtés 16px, bas 24px ;\n• margin: 8px 16px 24px 32px → haut, droite, bas, gauche.\n\nborder: 1px solid #ccc regroupe épaisseur, style et couleur ; border-radius arrondit les coins.\n\nmargin: 0 auto centre horizontalement un bloc qui a une largeur (width ou max-width) : les marges gauche et droite se partagent l’espace libre. C’est la façon classique de centrer le conteneur d’une page : max-width: 1100px; margin: 0 auto;.\n\nLes propriétés logiques (margin-inline, padding-block) suivent le sens de lecture : utiles pour un site aussi en arabe, qui se lit de droite à gauche.',
        ),
        order(
          'Range les couches de la boîte, de l’intérieur vers l’extérieur.',
          ['Contenu', 'Padding', 'Bordure', 'Marge'],
          'Le padding est à l’intérieur de la bordure, la marge à l’extérieur.',
        ),
        qcm(
          'En content-box (le défaut), quelle largeur totale occupe cette boîte, marges non comprises ?',
          ['200 px', '220 px', '242 px', '262 px'],
          2,
          '200 (contenu) + 2 × 20 (padding) + 2 × 1 (bordure) = 242 px. Avec border-box, elle ferait 200 px.',
          '.boite {\n  width: 200px;\n  padding: 20px;\n  border: 1px solid black;\n  margin: 10px;\n}',
        ),
        fill(
          'Fais en sorte que la largeur inclue le padding et la bordure.',
          '* {\n  box-sizing: ___;\n}',
          ['border-box', 'content-box', 'padding-box', 'inherit'],
          'border-box',
          'Avec border-box, ajouter du padding ne fait plus déborder une boîte de 100 % de large.',
        ),
        match('Associe chaque raccourci à son effet.', [
          ['padding: 16px', '16 px sur les quatre côtés'],
          ['padding: 8px 16px', '8 px en haut et en bas, 16 px à gauche et à droite'],
          ['padding: 0 0 8px', '8 px en bas seulement'],
          ['padding: 1px 2px 3px 4px', 'Haut 1, droite 2, bas 3, gauche 4'],
        ]),
        tip(
          'La fusion des marges',
          'Piège classique : quand deux blocs se suivent verticalement, leurs marges ne s’additionnent pas, elles fusionnent. Un titre avec margin-bottom: 24px suivi d’un paragraphe avec margin-top: 16px sont écartés de 24 px, pas 40 : la plus grande gagne.\n\nLa fusion ne concerne que les marges verticales des blocs dans le flux normal. Elle n’a pas lieu entre éléments flex ou grid, ni avec les marges horizontales.\n\nAutre piège voisin : la marge haute du premier enfant peut « sortir » de son parent et le pousser vers le bas. Un padding ou une bordure sur le parent, ou un parent en display: flow-root, flex ou grid, l’en empêche.\n\nBeaucoup d’équipes évitent le problème en n’utilisant qu’une direction (margin-bottom seulement) ou en espaçant avec gap dans un conteneur flex ou grid.',
        ),
        qcm(
          'Un <h2> a margin-bottom: 24px et le <p> suivant margin-top: 16px. Quel espace les sépare ?',
          ['16 px', '24 px', '40 px', '8 px'],
          1,
          'Les marges verticales adjacentes fusionnent : seule la plus grande (24 px) est appliquée.',
        ),
        vf(
          'margin: 0 auto centre horizontalement un bloc qui a une largeur limitée.',
          true,
          'Les marges automatiques gauche et droite se partagent l’espace restant. Sans largeur, le bloc occupe déjà toute la place et il n’y a rien à partager.',
        ),
        vf(
          'Le padding prend la couleur de fond de l’élément, la marge reste transparente.',
          true,
          'Le fond (background) s’étend sous le contenu, le padding et la bordure. La marge laisse voir le parent.',
        ),
      ]),

      lesson('display-flux', 'Display et flux normal', [
        tip(
          'Bloc ou en ligne',
          'Sans CSS de mise en page, les éléments suivent le flux normal :\n• les éléments de niveau bloc (div, p, h1, section, ul…) commencent sur une nouvelle ligne et prennent toute la largeur disponible ;\n• les éléments en ligne (span, a, strong, em, img…) se placent dans le texte, les uns à la suite des autres.\n\nLa propriété display change ce comportement :\n• display: block ;\n• display: inline : width et height sont ignorés, et les marges verticales n’écartent pas les lignes ;\n• display: inline-block : reste dans la ligne mais accepte width, height et marges ; pratique pour un badge ;\n• display: flex et display: grid : l’élément devient un conteneur de mise en page (unités suivantes) ;\n• display: none : l’élément disparaît complètement.',
          '.badge {\n  display: inline-block;\n  padding: 2px 8px;\n  border-radius: 999px;\n  background: #dcfce7;\n}',
        ),
        tip(
          'Cacher un élément',
          'Plusieurs façons, plusieurs effets :\n• display: none : retiré de l’affichage et de la mise en page, et ignoré par les lecteurs d’écran ;\n• l’attribut HTML hidden : même effet que display: none, sans CSS (pratique depuis JavaScript : el.hidden = true) ;\n• visibility: hidden : invisible et ignoré par les lecteurs d’écran, mais garde sa place ;\n• opacity: 0 : transparent, garde sa place, reste cliquable et lisible par les lecteurs d’écran.\n\nPour un texte destiné uniquement aux lecteurs d’écran (« (ouvre un nouvel onglet) »), on utilise une classe « visuellement masquée » (souvent nommée .sr-only) qui rend l’élément minuscule et le rogne, sans le retirer de l’arbre d’accessibilité.',
        ),
        match('Associe chaque valeur à son comportement.', [
          ['display: block', 'Nouvelle ligne, toute la largeur'],
          ['display: inline', 'Dans le texte, ignore width et height'],
          ['display: inline-block', 'Dans le texte, accepte width et height'],
          ['display: none', 'Retiré de l’affichage et de la mise en page'],
        ]),
        qcm(
          'Quelle propriété cache un élément tout en lui gardant sa place dans la mise en page ?',
          ['display: none', 'visibility: hidden', 'l’attribut hidden', 'position: static'],
          1,
          'visibility: hidden laisse un trou à la place de l’élément. display: none et hidden le retirent complètement.',
        ),
        vf(
          'Un <span> en display: inline respecte la propriété width.',
          false,
          'Un élément inline prend la largeur de son contenu. Passe-le en inline-block ou block pour fixer sa largeur.',
        ),
        tip(
          'Débordements et médias',
          'Quand le contenu est plus grand que sa boîte, il déborde. overflow décide quoi faire : visible (défaut), hidden (coupe), auto (barre de défilement si nécessaire), scroll (toujours). Sur mobile, un tableau large dans un conteneur overflow-x: auto évite que toute la page défile horizontalement.\n\nPour les images, la règle de base est img { max-width: 100%; height: auto; } : elles rétrécissent avec leur conteneur sans se déformer.\n\naspect-ratio: 16 / 9 fixe un ratio (une vignette vidéo) ; object-fit: cover remplit la boîte en rognant l’image sans la déformer, idéal pour des photos de produits de tailles différentes dans une grille.',
          'img {\n  max-width: 100%;\n  height: auto;\n}\n.vignette {\n  aspect-ratio: 1;\n  object-fit: cover;\n}\n.tableau-large {\n  overflow-x: auto;\n}',
        ),
        fill(
          'Empêche les images de dépasser de leur conteneur.',
          'img {\n  ___: 100%;\n  height: auto;\n}',
          ['max-width', 'width', 'min-width', 'overflow'],
          'max-width',
          'max-width: 100% laisse l’image à sa taille naturelle si elle tient, et la réduit sinon. width: 100% agrandirait aussi les petites images, qui deviendraient floues.',
        ),
        qcm(
          'Des photos de produits de formats différents doivent remplir des cases carrées sans être déformées. Que faire ?',
          [
            'width: 100%; height: 100%;',
            'aspect-ratio: 1; object-fit: cover;',
            'overflow: scroll;',
            'display: inline-block;',
          ],
          1,
          'aspect-ratio crée la case carrée, object-fit: cover y fait entrer l’image en la rognant au lieu de l’étirer.',
        ),
        vf(
          'Un élément en opacity: 0 peut encore recevoir des clics.',
          true,
          'Il est transparent mais toujours présent : il capte les clics et reste annoncé. C’est utile pour une animation, piégeux sinon.',
        ),
      ]),

      lesson('unites', 'Les unités CSS', [
        tip(
          'Unités absolues et relatives',
          '• px : le pixel CSS, une unité fixe. Pratique pour les bordures et les petits détails.\n• rem : relatif à la taille de police de l’élément racine (<html>), 16 px par défaut. 1.5rem = 24 px si l’utilisateur n’a rien changé. Si un utilisateur malvoyant règle son navigateur sur une police plus grande, tout ce qui est en rem grandit avec : c’est l’unité recommandée pour les tailles de texte (et souvent les espacements).\n• em : relatif à la taille de police de l’élément lui-même (pour font-size : celle du parent). Utile pour qu’un padding de bouton suive la taille de son texte, mais les em se multiplient quand on imbrique les éléments.\n• % : relatif au parent (pour width : la largeur du conteneur ; attention, un padding ou une margin en % se calcule aussi sur la largeur du conteneur, même en haut et en bas).\n• ch : la largeur du caractère « 0 » de la police ; max-width: 65ch donne des lignes agréables à lire.',
          'html {\n  font-size: 100%; /* suit le réglage de l’utilisateur, jamais en px */\n}\nh1 {\n  font-size: 2rem; /* 32 px par défaut */\n}\n.bouton {\n  padding: 0.5em 1em; /* suit la taille du texte du bouton */\n}\narticle {\n  max-width: 65ch;\n}',
        ),
        tip(
          'Unités de l’écran et tailles fluides',
          'vw et vh valent 1 % de la largeur et de la hauteur de la fenêtre d’affichage (viewport). Sur mobile, 100vh pose problème : la barre d’adresse qui apparaît et disparaît change la hauteur visible. Les unités récentes règlent cela : svh (plus petite hauteur, barre visible), lvh (plus grande), dvh (hauteur dynamique, qui suit la barre).\n\nLes fonctions de calcul :\n• calc(100% - 2rem) mélange les unités ;\n• min(100%, 600px) prend la plus petite valeur ;\n• max(1rem, 2vw) la plus grande ;\n• clamp(1.5rem, 4vw, 2.5rem) : une valeur fluide (4vw) bornée entre un minimum et un maximum. Parfait pour un titre qui grandit avec l’écran sans devenir minuscule sur un petit téléphone ni énorme sur un grand écran.\n\nÉvite une taille de texte uniquement en vw : elle ne réagit plus au zoom de l’utilisateur. Combine-la avec des rem dans clamp().',
          'h1 {\n  font-size: clamp(1.75rem, 1rem + 3vw, 3rem);\n}\n.hero {\n  min-height: 100dvh;\n}',
        ),
        qcm(
          'Le navigateur a une police de base de 16 px. Combien vaut 1.5rem ?',
          ['15 px', '24 px', '1,5 px', 'Cela dépend du parent'],
          1,
          '1.5 × 16 = 24 px. rem ne dépend que de la taille de la racine <html>, jamais du parent.',
        ),
        qcm(
          'Quelle taille de texte prend le <span> ?',
          ['16 px', '20 px', '25 px', '31,25 px'],
          2,
          'Pour font-size, em se calcule sur le parent : .carte = 1.25 × 16 = 20 px, puis le span = 1.25 × 20 = 25 px. Les em se multiplient en s’imbriquant ; rem éviterait ce cumul.',
          'html { font-size: 100%; } /* 16 px */\n.carte { font-size: 1.25em; }\n.carte span { font-size: 1.25em; }',
        ),
        vf(
          'Utiliser rem pour les tailles de texte permet de respecter la taille de police choisie par l’utilisateur.',
          true,
          'Si la racine est laissée à 100 %, elle suit le réglage du navigateur, et tout ce qui est en rem suit à son tour.',
        ),
        match('Associe chaque unité à sa référence.', [
          ['rem', 'Taille de police de la racine <html>'],
          ['em', 'Taille de police de l’élément ou de son parent'],
          ['%', 'Dimension du conteneur'],
          ['vw', '1 % de la largeur de la fenêtre'],
          ['ch', 'Largeur du caractère « 0 »'],
        ]),
        fill(
          'Crée un titre fluide, jamais plus petit que 1.5rem ni plus grand que 3rem.',
          'h1 {\n  font-size: ___(1.5rem, 1rem + 3vw, 3rem);\n}',
          ['clamp', 'calc', 'minmax', 'between'],
          'clamp',
          'clamp(min, idéal, max) borne une valeur fluide. minmax() existe aussi, mais uniquement pour les pistes de CSS Grid.',
        ),
        qcm(
          'Sur mobile, pourquoi préférer 100dvh à 100vh pour un écran d’accueil plein écran ?',
          [
            'dvh est plus rapide à calculer',
            'dvh suit la hauteur réellement visible quand la barre d’adresse apparaît ou disparaît',
            'vh ne fonctionne pas sur Android',
            'dvh inclut le clavier virtuel',
          ],
          1,
          '100vh correspond à la plus grande hauteur possible : le bas du contenu peut se cacher derrière la barre d’adresse. dvh s’ajuste dynamiquement.',
        ),
        vf(
          'padding-top: 10% se calcule sur la hauteur du conteneur.',
          false,
          'Les marges et paddings en pourcentage se calculent sur la largeur du conteneur, même pour le haut et le bas. Une particularité à connaître.',
        ),
      ]),

      lesson('position', 'Le positionnement', [
        tip(
          'Les cinq valeurs de position',
          '• static (défaut) : l’élément suit le flux normal ; top, left… n’ont aucun effet.\n• relative : l’élément reste dans le flux (sa place est gardée), mais top/left le décalent visuellement. Surtout utilisé pour servir de repère à un enfant en absolute.\n• absolute : l’élément sort du flux (les autres se comportent comme s’il n’existait pas) et se place par rapport à son ancêtre positionné le plus proche (position autre que static), à défaut par rapport au bloc initial de la page.\n• fixed : sort du flux et se place par rapport à la fenêtre ; il reste en place quand on défile (bouton WhatsApp flottant, bandeau de cookies).\n• sticky : se comporte comme relative jusqu’à atteindre un seuil (top: 0), puis reste collé tant que son parent est visible. Idéal pour un en-tête de tableau ou une barre de catégories.\n\ninset: 0 est un raccourci pour top, right, bottom et left à 0.',
          '.carte {\n  position: relative;\n}\n.carte .badge-promo {\n  position: absolute;\n  top: 8px;\n  right: 8px;\n}',
        ),
        tip(
          'Superpositions et z-index',
          'Quand des éléments se chevauchent, z-index décide lequel passe devant : plus la valeur est grande, plus l’élément est au-dessus. Il fonctionne sur les éléments positionnés (relative, absolute, fixed, sticky) et sur les enfants de conteneurs flex ou grid.\n\nPiège : z-index se compare à l’intérieur d’un même contexte d’empilement. Un parent avec position et z-index, opacity inférieure à 1 ou transform crée un nouveau contexte : un enfant avec z-index: 9999 ne pourra jamais passer devant un élément qui est au-dessus de son parent. Avant d’empiler les 9999, inspecte les parents.\n\nUn élément sticky ne colle pas si un ancêtre a overflow: hidden ou auto (il colle alors dans ce conteneur), ou si tu as oublié le seuil (top: 0).',
          '.entete {\n  position: sticky;\n  top: 0;\n  z-index: 10;\n  background: white;\n}',
        ),
        match('Associe chaque valeur de position à son comportement.', [
          ['static', 'Flux normal, top et left sans effet'],
          ['relative', 'Décalé, mais garde sa place'],
          ['absolute', 'Placé par rapport à l’ancêtre positionné'],
          ['fixed', 'Placé par rapport à la fenêtre'],
          ['sticky', 'Collé une fois le seuil atteint en défilant'],
        ]),
        qcm(
          'Un badge en position: absolute; top: 0; right: 0 s’affiche dans le coin de la page au lieu du coin de sa carte. Pourquoi ?',
          [
            'Il manque z-index',
            'La carte n’est pas positionnée : il faut position: relative sur la carte',
            'absolute ne marche qu’avec fixed',
            'Il faut display: block sur le badge',
          ],
          1,
          'Un élément absolute se place par rapport à son ancêtre positionné le plus proche. Sans ancêtre positionné, c’est le bloc initial de la page.',
        ),
        fill(
          'Garde la barre de catégories collée en haut pendant le défilement.',
          '.categories {\n  position: ___;\n  top: 0;\n}',
          ['sticky', 'fixed', 'relative', 'static'],
          'sticky',
          'sticky reste dans le flux puis colle au seuil top: 0. fixed sortirait la barre du flux et la ferait chevaucher le contenu dès le départ.',
        ),
        vf(
          'Un élément en position: absolute garde sa place dans le flux : les éléments suivants ne remontent pas.',
          false,
          'absolute sort l’élément du flux : les éléments suivants prennent sa place. C’est relative qui garde la place.',
        ),
        qcm(
          'Un menu en z-index: 9999 reste caché derrière une bannière en z-index: 2. Quelle est la cause la plus probable ?',
          [
            'z-index est limité à 1000',
            'Le menu est dans un parent qui a créé un contexte d’empilement inférieur à celui de la bannière',
            'La bannière est en display: block',
            'Les navigateurs ignorent les grands nombres',
          ],
          1,
          'Les z-index ne se comparent qu’entre éléments d’un même contexte. Cherche un parent avec z-index, transform ou opacity.',
        ),
        vf(
          'Un élément en position: fixed reste à la même place à l’écran quand on fait défiler la page.',
          true,
          'Il est positionné par rapport à la fenêtre. Attention : sur un petit écran, un élément fixe trop grand masque une bonne partie du contenu.',
        ),
      ]),
    ],
  ),

  unit(
    'flexbox',
    'Mise en page : Flexbox, Grid et responsive',
    'Aligner et répartir des éléments avec Flexbox et Grid, et adapter une page à toutes les tailles d’écran, du petit Android au grand moniteur.',
    [
      lesson('flex-axes', 'Le conteneur flex et ses axes', [
        tip(
          'Deux axes pour tout comprendre',
          'display: flex sur un conteneur transforme ses enfants directs en éléments flexibles (flex items). Les petits-enfants ne sont pas concernés.\n\nTout Flexbox repose sur deux axes :\n• l’axe principal, défini par flex-direction : row (par défaut, horizontal, de gauche à droite en français), row-reverse, column (vertical), column-reverse ;\n• l’axe secondaire, perpendiculaire au premier.\n\nDeux propriétés à ne plus confondre :\n• justify-content répartit les éléments sur l’axe principal : flex-start (défaut), center, flex-end, space-between, space-around, space-evenly ;\n• align-items les aligne sur l’axe secondaire : stretch (défaut, les éléments s’étirent sur toute la hauteur de la ligne), flex-start, center, flex-end, baseline.\n\nSi tu passes en flex-direction: column, les rôles s’inversent visuellement : justify-content agit alors à la verticale.',
          '.barre {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  gap: 12px;\n}',
        ),
        tip(
          'gap et retour à la ligne',
          'gap ajoute un espace entre les éléments, jamais sur les bords : fini les marges à annuler sur le dernier élément. row-gap et column-gap le règlent par axe.\n\nPar défaut (flex-wrap: nowrap), tous les éléments restent sur une seule ligne, quitte à rétrécir ou à déborder. flex-wrap: wrap les laisse passer à la ligne suivante quand la place manque : indispensable pour une liste de cartes ou d’étiquettes.\n\nQuand il y a plusieurs lignes, align-content répartit ces lignes sur l’axe secondaire (il n’a aucun effet sur une seule ligne).\n\nLe raccourci flex-flow regroupe direction et retour : flex-flow: row wrap.',
          '.etiquettes {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 8px;\n}',
        ),
        fill(
          'Active Flexbox sur le conteneur.',
          '.menu {\n  display: ___;\n}',
          ['flex', 'block', 'inline', 'flexbox'],
          'flex',
          'display: flex fait des enfants directs des éléments flexibles. display: inline-flex fait la même chose, mais le conteneur se comporte comme un élément en ligne.',
        ),
        qcm(
          'Dans un conteneur flex en direction row, quelle propriété centre les enfants horizontalement ?',
          [
            'align-items: center',
            'justify-content: center',
            'text-align: center',
            'align-content: center',
          ],
          1,
          'En row, l’axe principal est horizontal : c’est justify-content qui agit dessus.',
        ),
        qcm(
          'Même question, mais le conteneur est en flex-direction: column. Quelle propriété centre les enfants horizontalement ?',
          ['justify-content: center', 'align-items: center', 'flex-wrap: center', 'margin: center'],
          1,
          'En column, l’axe principal devient vertical ; l’horizontale est l’axe secondaire, géré par align-items.',
        ),
        match('Associe chaque valeur de justify-content à son effet.', [
          ['flex-start', 'Tout au début de l’axe'],
          ['center', 'Groupés au milieu'],
          ['space-between', 'Premier et dernier collés aux bords, espace égal entre'],
          ['space-evenly', 'Espaces strictement égaux, bords compris'],
          ['flex-end', 'Tout à la fin de l’axe'],
        ]),
        vf(
          'gap ajoute de l’espace entre les éléments, mais pas avant le premier ni après le dernier.',
          true,
          'C’est sa grande différence avec margin. gap fonctionne en Flexbox comme en Grid.',
        ),
        qcm(
          'Tes 12 cartes produits se compressent toutes sur une seule ligne. Que manque-t-il ?',
          [
            'flex-direction: column',
            'flex-wrap: wrap',
            'align-items: stretch',
            'justify-content: space-around',
          ],
          1,
          'Par défaut, flex-wrap vaut nowrap : tout reste sur une ligne. wrap autorise le passage à la ligne.',
        ),
        vf(
          'Par défaut, les éléments flex s’étirent sur toute la hauteur de la ligne.',
          true,
          'align-items vaut stretch par défaut (tant que les éléments n’ont pas de hauteur fixée). C’est pour cela que des colonnes flex ont naturellement la même hauteur.',
        ),
      ]),

      lesson('flex-items', 'Les éléments flexibles', [
        tip(
          'Grandir, rétrécir, partir de quelle taille',
          'Chaque enfant a trois propriétés qui décident de sa taille sur l’axe principal :\n• flex-grow : sa part de l’espace libre restant (0 par défaut : il ne grandit pas) ;\n• flex-shrink : sa capacité à rétrécir quand la place manque (1 par défaut : il rétrécit) ;\n• flex-basis : sa taille de départ avant répartition (auto par défaut : sa width ou son contenu).\n\nLe raccourci flex les regroupe :\n• flex: 1 → 1 1 0% : tous les éléments se partagent l’espace à parts égales ;\n• flex: 0 0 200px → exactement 200 px, ni plus ni moins ;\n• flex: 1 1 250px → part de 250 px, grandit et rétrécit ; avec flex-wrap: wrap, c’est une liste de cartes responsive sans media query.\n\nDeux éléments en flex: 2 et flex: 1 se partagent l’espace libre aux deux tiers / un tiers.',
          '.colonne-principale {\n  flex: 2;\n}\n.colonne-annexe {\n  flex: 1;\n}\n.logo {\n  flex: 0 0 48px; /* ne bouge pas */\n}',
        ),
        tip(
          'Ajustements individuels',
          '• align-self remplace align-items pour un seul élément ;\n• margin-left: auto (ou margin-inline-start: auto) sur un élément le pousse au bout de la ligne, avec tous ceux qui le suivent : le classique bouton « Panier » à droite du menu ;\n• order change la position visuelle d’un élément. Attention : l’ordre de lecture des lecteurs d’écran et l’ordre du focus clavier restent ceux du HTML. N’utilise order que pour un réglage purement visuel.\n\nPiège fréquent : un élément flex ne rétrécit pas en dessous de la largeur de son contenu, car sa largeur minimale vaut auto. Un long mot, une URL ou un tableau le fait alors déborder. La correction : min-width: 0 sur l’élément (ou overflow: hidden).',
          '.nav {\n  display: flex;\n  gap: 16px;\n}\n.nav .panier {\n  margin-left: auto;\n}',
        ),
        qcm(
          'Que signifie flex: 1 sur tous les enfants d’un conteneur ?',
          [
            'Chaque enfant fait 1 px',
            'Les enfants se partagent l’espace disponible à parts égales',
            'Seul le premier enfant grandit',
            'Les enfants ne peuvent plus rétrécir',
          ],
          1,
          'flex: 1 vaut flex: 1 1 0% : chaque enfant part de zéro et reçoit une part égale de l’espace.',
        ),
        qcm(
          'Le conteneur fait 900 px, sans gap. Quelle largeur prend .principal ?',
          ['300 px', '450 px', '600 px', '900 px'],
          2,
          'Les deux partent de 0 et se partagent 900 px en 2 + 1 = 3 parts : 600 px pour .principal, 300 px pour .annexe.',
          '.conteneur { display: flex; width: 900px; }\n.principal { flex: 2; }\n.annexe { flex: 1; }',
        ),
        fill(
          'Pousse le bouton Panier tout à droite de la barre de navigation.',
          '.nav .panier {\n  ___: auto;\n}',
          ['margin-left', 'padding-left', 'align-self', 'justify-self'],
          'margin-left',
          'Une marge automatique absorbe tout l’espace libre de son côté. justify-self n’a pas d’effet sur un élément flex.',
        ),
        vf(
          'order: -1 sur un élément le fait aussi passer en premier pour la navigation au clavier.',
          false,
          'order ne change que l’affichage. Le focus et les lecteurs d’écran suivent toujours l’ordre du HTML : un décalage trop grand rend la page déroutante.',
        ),
        match('Associe chaque valeur de flex à son effet.', [
          ['flex: 1', 'Part égale de l’espace'],
          ['flex: 0 0 200px', 'Exactement 200 px'],
          ['flex: 1 1 250px', 'Part de 250 px, grandit et rétrécit'],
          ['flex: none', 'Taille du contenu, ni grandir ni rétrécir'],
        ]),
        qcm(
          'Dans une carte en flex, le texte d’une longue adresse e-mail fait déborder la colonne. Quelle propriété ajouter à l’élément flex ?',
          ['min-width: 0', 'flex-grow: 0', 'order: 1', 'align-self: center'],
          0,
          'La largeur minimale auto empêche l’élément de rétrécir sous la taille de son contenu. min-width: 0 lève ce plancher ; ajoute overflow-wrap: anywhere pour casser le texte.',
        ),
        vf(
          'align-self permet d’aligner un seul élément différemment des autres sur l’axe secondaire.',
          true,
          'align-self accepte les mêmes valeurs qu’align-items et ne s’applique qu’à l’élément qui le porte.',
        ),
      ]),

      lesson('grid', 'CSS Grid : lignes et colonnes', [
        tip(
          'Une grille en deux dimensions',
          'Flexbox range des éléments sur un axe ; Grid les place sur deux axes à la fois, en lignes et en colonnes. display: grid sur le parent, puis on décrit les colonnes :\n• grid-template-columns: 250px 1fr : une colonne fixe et une colonne qui prend le reste ;\n• l’unité fr partage l’espace restant (après les tailles fixes et les gap) : 1fr 2fr donne un tiers et deux tiers ;\n• repeat(3, 1fr) évite de répéter 1fr 1fr 1fr ;\n• gap espace les cellules, comme en Flexbox.\n\nLes éléments se rangent automatiquement, cellule après cellule ; les lignes sont créées au besoin (grille implicite), et grid-auto-rows règle leur hauteur.\n\nLa recette la plus utile, une grille de cartes responsive sans media query : repeat(auto-fit, minmax(220px, 1fr)) crée autant de colonnes d’au moins 220 px que la largeur le permet. Avec auto-fill, les colonnes vides sont conservées ; avec auto-fit, elles s’effacent et les cartes s’étirent.',
          '.produits {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));\n  gap: 1rem;\n}',
        ),
        tip(
          'Placer un élément',
          'Les lignes de la grille sont numérotées à partir de 1 ; -1 désigne la dernière ligne de la grille explicite.\n• grid-column: 1 / 3 : de la ligne 1 à la ligne 3, donc les colonnes 1 et 2 ;\n• grid-column: span 2 : occuper deux colonnes à partir de sa place ;\n• grid-column: 1 / -1 : toute la largeur (un bandeau dans une grille de cartes).\n\ngrid-template-areas dessine la page avec des noms : chaque chaîne est une ligne, chaque mot une cellule, un point une cellule vide. Chaque zone doit former un rectangle. Les éléments s’y placent avec grid-area.\n\nFlexbox ou Grid ? Flexbox pour une rangée de contenus de tailles variables (menu, boutons) ; Grid quand lignes et colonnes doivent s’aligner (galerie, structure de page). Les deux se combinent très bien.',
          '.page {\n  display: grid;\n  grid-template-columns: 220px 1fr;\n  grid-template-areas:\n    "entete entete"\n    "menu   contenu";\n}\n.entete { grid-area: entete; }\n.menu { grid-area: menu; }\n.contenu { grid-area: contenu; }',
        ),
        fill(
          'Crée trois colonnes égales.',
          '.grille {\n  display: grid;\n  grid-template-columns: ___(3, 1fr);\n}',
          ['repeat', 'columns', 'grid', 'times'],
          'repeat',
          'repeat(3, 1fr) équivaut à 1fr 1fr 1fr. On peut répéter un motif : repeat(2, 100px 1fr).',
        ),
        qcm(
          'Le conteneur fait 1000 px, avec grid-template-columns: 200px 1fr 3fr et sans gap. Quelle largeur prend la dernière colonne ?',
          ['600 px', '750 px', '800 px', '200 px'],
          0,
          'On retire d’abord la partie fixe : 1000 − 200 = 800 px, partagés en 4 parts de 200 px. 3fr = 600 px.',
        ),
        qcm(
          'Quelles colonnes occupe un élément en grid-column: 2 / 4 ?',
          [
            'Les colonnes 2, 3 et 4',
            'Les colonnes 2 et 3',
            'La colonne 2 seulement',
            'Les colonnes 4 et 5',
          ],
          1,
          'Les nombres désignent des lignes, pas des colonnes : de la ligne 2 à la ligne 4, on couvre les colonnes 2 et 3.',
        ),
        vf(
          'Avec auto-fit, quand il y a peu d’éléments, les colonnes vides s’effacent et les éléments s’étirent pour remplir la ligne.',
          true,
          'auto-fill garderait des colonnes vides de 220 px ; auto-fit les réduit à zéro et les éléments en 1fr récupèrent la place.',
        ),
        match('Associe chaque déclaration à son effet.', [
          ['grid-column: 1 / -1', 'Toute la largeur de la grille'],
          ['grid-column: span 2', 'Deux colonnes à partir de sa place'],
          ['grid-template-columns: 250px 1fr', 'Barre latérale fixe et contenu fluide'],
          ['place-items: center', 'Centre le contenu de chaque cellule'],
          ['grid-auto-rows: 200px', 'Hauteur des lignes créées automatiquement'],
        ]),
        qcm(
          'Pour quelle mise en page Grid est-il plus adapté que Flexbox ?',
          [
            'Une rangée de boutons de tailles différentes',
            'Une galerie où lignes et colonnes doivent rester alignées',
            'Pousser un bouton à droite d’une barre',
            'Centrer une icône dans un bouton',
          ],
          1,
          'Grid contrôle les deux dimensions à la fois. Pour une seule rangée de contenus variables, Flexbox est plus naturel.',
        ),
      ]),

      lesson('responsive', 'Le responsive design', [
        tip(
          'Mobile d’abord',
          'Sur le continent, une large majorité des visites se fait depuis un téléphone, souvent un Android d’entrée de gamme avec un écran d’environ 360 px de large. D’où l’approche « mobile first » :\n• écris d’abord le CSS pour les petits écrans (une colonne, de grands boutons) ;\n• ajoute ensuite des règles pour les écrans plus larges avec des media queries min-width.\n\nAvantages : le style de base est simple et léger, le téléphone n’a pas à annuler des règles conçues pour le bureau, et tu te concentres sur l’essentiel.\n\nPrérequis absolu : la balise <meta name="viewport" content="width=device-width, initial-scale=1">. Sans elle, le téléphone simule un écran large et tes media queries ne se déclenchent pas comme prévu. N’ajoute jamais user-scalable=no ou maximum-scale=1 : bloquer le zoom gêne les personnes malvoyantes.',
          '.produits {\n  display: grid;\n  gap: 1rem;\n}\n@media (min-width: 640px) {\n  .produits {\n    grid-template-columns: repeat(2, 1fr);\n  }\n}\n@media (min-width: 1024px) {\n  .produits {\n    grid-template-columns: repeat(4, 1fr);\n  }\n}',
        ),
        tip(
          'Les media queries',
          'Une media query applique des règles seulement si une condition est vraie :\n• @media (min-width: 640px) : fenêtre d’au moins 640 px ;\n• la syntaxe récente @media (width >= 640px) est équivalente et plus lisible ;\n• @media (orientation: landscape) : paysage ;\n• @media (prefers-color-scheme: dark) : l’utilisateur a choisi le thème sombre ;\n• @media (prefers-reduced-motion: reduce) : l’utilisateur veut moins d’animations ;\n• @media (hover: hover) : l’appareil a un vrai survol (souris), contrairement au tactile.\n\nChoisis les points de rupture selon ton contenu (là où la mise en page se casse), pas selon une liste de modèles de téléphones.\n\nLes container queries vont plus loin : un composant s’adapte à la largeur de son conteneur, pas de la fenêtre. Le conteneur déclare container-type: inline-size, puis @container (min-width: 400px) { … } s’applique à ses descendants. Une même carte produit peut ainsi être compacte dans une colonne étroite et large dans la zone principale.',
          '@media (prefers-reduced-motion: reduce) {\n  * {\n    animation: none !important;\n    transition: none !important;\n  }\n}',
        ),
        fill(
          'Applique ce style à partir de 768 px de large.',
          '@media (___: 768px) {\n  .menu {\n    display: flex;\n  }\n}',
          ['min-width', 'max-width', 'width', 'screen'],
          'min-width',
          'En mobile first, on ajoute des règles quand l’écran grandit : min-width. max-width servirait à cibler les écrans plus petits.',
        ),
        qcm(
          'Que se passe-t-il sur un téléphone si la balise meta viewport est absente ?',
          [
            'La page ne s’affiche pas',
            'La page est rendue comme sur un écran d’environ 980 px puis rétrécie : tout devient minuscule',
            'Le CSS est ignoré',
            'La page passe automatiquement en une colonne',
          ],
          1,
          'Le navigateur mobile suppose un vieux site conçu pour le bureau. Les media queries min-width de tablette ou de bureau peuvent alors s’appliquer au téléphone.',
        ),
        vf(
          'Ajouter maximum-scale=1 dans la balise viewport est une bonne pratique pour éviter le zoom accidentel.',
          false,
          'Bloquer le zoom empêche les personnes malvoyantes d’agrandir le texte : c’est un échec WCAG. Certains navigateurs ignorent d’ailleurs cette valeur.',
        ),
        match('Associe chaque media query à ce qu’elle détecte.', [
          ['(min-width: 1024px)', 'Écran d’au moins 1024 px'],
          ['(prefers-color-scheme: dark)', 'Thème sombre demandé'],
          ['(prefers-reduced-motion: reduce)', 'Moins d’animations souhaitées'],
          ['(hover: hover)', 'Appareil avec survol, comme une souris'],
          ['(orientation: landscape)', 'Écran en mode paysage'],
        ]),
        order(
          'Écris une règle mobile first : une colonne, puis deux à partir de 640 px.',
          [
            '.grille { display: grid; gap: 1rem; }',
            '@media (min-width: 640px) {',
            '  .grille { grid-template-columns: 1fr 1fr; }',
            '}',
          ],
          'Le style de base sert le mobile ; la media query n’ajoute la seconde colonne que sur les écrans plus larges.',
        ),
        qcm(
          'Une carte produit doit changer de mise en page selon la largeur de la colonne qui la contient, pas selon l’écran. Quel outil utiliser ?',
          [
            'Une media query min-width',
            'Une container query (@container)',
            'flex-wrap: wrap',
            'Une media query orientation',
          ],
          1,
          'Avec container-type: inline-size sur le parent, @container réagit à la taille du conteneur. Le même composant s’adapte partout où on le place.',
        ),
        vf(
          'Les points de rupture doivent être choisis là où la mise en page se casse, plutôt que d’après une liste de modèles de téléphones.',
          true,
          'Les tailles d’écran changent chaque année. Élargis la fenêtre jusqu’à ce que ça ne marche plus : c’est là que tu places ta media query.',
        ),
      ]),
    ],
  ),

  unit(
    'js-reseau',
    'JavaScript, DOM et réseau',
    'Rendre une page interactive, réagir aux actions de l’utilisateur et charger des données de façon fiable, même sur une connexion lente.',
    [
      lesson('dom', 'Lire et modifier la page', [
        tip(
          'Charger son script et trouver des éléments',
          'Place ton script avec <script src="app.js" defer></script> dans <head> : defer télécharge le fichier en parallèle et ne l’exécute qu’une fois le HTML entièrement lu, dans l’ordre des scripts. async l’exécute dès qu’il est téléchargé, sans ordre garanti ; type="module" est différé par défaut.\n\nLe navigateur transforme le HTML en un arbre d’objets, le DOM. Pour y trouver des éléments :\n• document.querySelector(".panier") renvoie le premier élément qui correspond au sélecteur CSS, ou null s’il n’y en a pas ;\n• document.querySelectorAll(".carte") renvoie une NodeList statique de tous les éléments : elle a forEach, mais pas map ; utilise [...liste] ou Array.from(liste) pour en faire un vrai tableau ;\n• element.closest(".carte") remonte vers le plus proche ancêtre (ou l’élément lui-même) qui correspond.\n\nRappels JavaScript : const par défaut, let si la variable est réaffectée, jamais var ; compare avec === (valeur et type).',
          'const panier = document.querySelector("#panier")\nconst cartes = document.querySelectorAll(".carte")\ncartes.forEach((carte) => carte.classList.add("visible"))',
        ),
        tip(
          'Modifier le contenu',
          '• textContent remplace le texte d’un élément. Le HTML éventuel est affiché tel quel, jamais interprété : c’est le bon choix pour tout texte qui vient d’un utilisateur ou d’une API.\n• innerHTML interprète le HTML. Avec une donnée externe, c’est une faille XSS : un nom de produit contenant <img src=x onerror="…"> exécuterait du code.\n• document.createElement("li") crée un élément ; parent.append(enfant) l’ajoute à la fin ; element.remove() le supprime.\n• classList.add, remove, toggle et contains gèrent les classes : préfère changer une classe plutôt que de modifier element.style.\n• Les attributs data-* se lisent avec dataset : data-prix-unitaire="1500" donne element.dataset.prixUnitaire, toujours sous forme de texte.\n• element.hidden = true cache un élément.',
          'const li = document.createElement("li")\nli.textContent = produit.nom   // jamais innerHTML avec une donnée externe\nli.dataset.id = produit.id\nliste.append(li)',
        ),
        fill(
          'Sélectionne l’élément d’id « total ».',
          'const total = document.___("#total")',
          ['querySelector', 'querySelectorAll', 'getElement', 'select'],
          'querySelector',
          'querySelector prend n’importe quel sélecteur CSS et renvoie le premier élément trouvé (ou null).',
        ),
        qcm(
          'Pourquoi ce code plante-t-il ?',
          [
            'NodeList n’a pas de méthode map',
            'querySelectorAll ne prend pas de classe',
            'textContent n’existe pas',
            'Il manque await',
          ],
          0,
          'querySelectorAll renvoie une NodeList, qui a forEach mais pas map. Écris [...document.querySelectorAll(".prix")].map(…).',
          'const prix = document.querySelectorAll(".prix").map((el) => el.textContent)',
        ),
        vf(
          'Afficher le commentaire d’un client avec innerHTML peut permettre une attaque XSS.',
          true,
          'Le navigateur interprète le HTML reçu, scripts d’événements compris. textContent affiche le texte sans l’interpréter.',
        ),
        qcm(
          'Que vaut element.dataset.prixUnitaire pour <div data-prix-unitaire="1500"> ?',
          ['1500 (un nombre)', '"1500" (une chaîne)', 'undefined', 'null'],
          1,
          'Les tirets deviennent du camelCase et la valeur est toujours une chaîne. Convertis avec Number() avant de calculer.',
        ),
        match('Associe chaque méthode à son rôle.', [
          ['querySelectorAll', 'Trouver tous les éléments correspondants'],
          ['closest', 'Remonter vers l’ancêtre correspondant'],
          ['createElement', 'Créer un nouvel élément'],
          ['append', 'Ajouter un enfant à la fin'],
          ['classList.toggle', 'Ajouter ou retirer une classe'],
        ]),
        qcm(
          'Ton script dans <head> ne trouve pas les éléments du <body> (querySelector renvoie null). Quelle est la meilleure correction ?',
          [
            'Ajouter defer à la balise <script>',
            'Ajouter async',
            'Envelopper le code dans setTimeout',
            'Mettre le script dans <title>',
          ],
          0,
          'Sans defer, le script s’exécute avant que le body soit lu. defer attend la fin de l’analyse du HTML tout en téléchargeant en parallèle.',
        ),
      ]),

      lesson('evenements', 'Réagir aux événements', [
        tip(
          'addEventListener et l’objet événement',
          'element.addEventListener("click", fonction) exécute la fonction à chaque clic. Elle reçoit un objet événement :\n• event.target : l’élément exact où l’événement est né (par exemple l’icône dans le bouton) ;\n• event.currentTarget : l’élément qui porte l’écouteur ;\n• event.preventDefault() : annule le comportement par défaut (envoi d’un formulaire, suivi d’un lien) ;\n• event.key pour le clavier ("Enter", "Escape").\n\nÉvénements courants : click (souris, toucher et clavier sur un bouton), input (à chaque frappe), change (quand la valeur est validée, en quittant le champ ou en cochant), submit (envoi d’un formulaire, par le bouton ou la touche Entrée), keydown, DOMContentLoaded.\n\nPour traiter un formulaire, écoute submit sur le <form>, pas click sur le bouton. new FormData(form) récupère toutes les valeurs ; elles sont toujours des chaînes.',
          'form.addEventListener("submit", (event) => {\n  event.preventDefault()\n  const donnees = Object.fromEntries(new FormData(form))\n  const quantite = Number(donnees.quantite)\n})',
        ),
        tip(
          'Propagation et délégation',
          'La plupart des événements remontent (bouillonnent) : un clic sur un bouton est aussi reçu par la carte qui le contient, puis par la liste, jusqu’au document. event.stopPropagation() arrête cette remontée, à utiliser rarement.\n\nLa délégation en tire parti : un seul écouteur sur le parent gère tous les enfants, y compris ceux ajoutés plus tard (produits chargés depuis l’API). On retrouve l’élément visé avec event.target.closest(…).\n\nPour retirer un écouteur, removeEventListener doit recevoir la même fonction, pas une copie : garde-la dans une variable. L’option { once: true } retire l’écouteur automatiquement après le premier appel.',
          'liste.addEventListener("click", (event) => {\n  const bouton = event.target.closest("button[data-id]")\n  if (!bouton) return\n  ajouterAuPanier(bouton.dataset.id)\n})',
        ),
        fill(
          'Empêche le rechargement de la page à l’envoi du formulaire.',
          'form.addEventListener("submit", (event) => {\n  event.___()\n})',
          ['preventDefault', 'stopPropagation', 'cancel', 'stop'],
          'preventDefault',
          'preventDefault annule l’action par défaut (ici l’envoi et le rechargement). stopPropagation arrête seulement la remontée de l’événement.',
        ),
        qcm(
          'Quel événement suit chaque caractère tapé dans un champ de recherche ?',
          ['change', 'input', 'submit', 'keypress'],
          1,
          'input se déclenche à chaque modification de la valeur, y compris par collage ou dictée. change attend que la valeur soit validée.',
        ),
        qcm(
          'Un bouton contient une icône <svg>. On clique sur l’icône. Que vaut event.currentTarget dans l’écouteur posé sur le bouton ?',
          ['Le <svg>', 'Le <button>', 'Le document', 'null'],
          1,
          'currentTarget est l’élément qui porte l’écouteur, le bouton. event.target, lui, vaudrait l’icône (ou un de ses éléments internes).',
        ),
        vf(
          'Avec la délégation, un seul écouteur sur la liste gère aussi les produits ajoutés après coup.',
          true,
          'Le clic sur un nouveau bouton remonte jusqu’à la liste, qui existe depuis le début. Pas besoin d’ajouter un écouteur à chaque produit.',
        ),
        order(
          'Remets dans l’ordre la gestion d’un formulaire de commande.',
          [
            'form.addEventListener("submit", (event) => {',
            '  event.preventDefault()',
            '  const donnees = new FormData(form)',
            '  envoyerCommande(donnees)',
            '})',
          ],
          'On écoute submit, on annule le rechargement, on récupère les valeurs, puis on les envoie.',
        ),
        vf(
          'removeEventListener("click", () => ouvrir()) retire un écouteur ajouté avec addEventListener("click", () => ouvrir()).',
          false,
          'Ce sont deux fonctions fléchées différentes : rien n’est retiré. Il faut passer exactement la même référence de fonction.',
        ),
      ]),

      lesson('fetch', 'Charger des données avec fetch', [
        tip(
          'Asynchrone, promesses et await',
          'Une requête réseau prend du temps, parfois plusieurs secondes en 3G. JavaScript ne bloque pas la page en attendant : fetch renvoie aussitôt une promesse (Promise), qui sera tenue (fulfilled) ou rompue (rejected) plus tard.\n\nDans une fonction async, await met la fonction en pause jusqu’au résultat, sans geler la page ; une erreur se rattrape avec try/catch. Une fonction async renvoie toujours une promesse.\n\nDeux règles essentielles de fetch :\n• la promesse n’est rejetée qu’en cas d’échec réseau (pas de connexion, DNS, CORS, annulation) ; une réponse 404 ou 500 est une réponse réussie du point de vue de fetch : vérifie response.ok (vrai pour les codes 200 à 299) ;\n• response.json() renvoie lui aussi une promesse, et le corps ne peut être lu qu’une fois.\n\nPour lancer plusieurs requêtes en parallèle : await Promise.all([...]), qui échoue dès qu’une échoue ; Promise.allSettled attend toutes les réponses.',
          'async function chargerProduits() {\n  const response = await fetch("/api/produits")\n  if (!response.ok) {\n    throw new Error(`Erreur HTTP ${response.status}`)\n  }\n  return response.json()\n}',
        ),
        tip(
          'Envoyer des données',
          'Pour envoyer, on passe un second argument à fetch : method, headers et body.\n• En JSON : headers: { "Content-Type": "application/json" } et body: JSON.stringify(objet).\n• Avec un formulaire : body: new FormData(form), sans fixer Content-Type (le navigateur ajoute lui-même la bonne valeur, avec la frontière multipart).\n\nLes méthodes HTTP : GET lit, POST crée, PUT remplace, PATCH modifie en partie, DELETE supprime.\nLes codes à connaître : 200 OK, 201 créé, 204 sans contenu, 400 requête invalide, 401 non authentifié, 403 interdit, 404 introuvable, 429 trop de requêtes, 500 erreur du serveur.\n\nPour construire une adresse avec des paramètres, utilise URL et searchParams : les caractères spéciaux (espaces, &) sont encodés pour toi.',
          'const url = new URL("/api/produits", location.origin)\nurl.searchParams.set("q", "pagne wax")\n\nconst res = await fetch("/api/commandes", {\n  method: "POST",\n  headers: { "Content-Type": "application/json" },\n  body: JSON.stringify({ produitId: 12, quantite: 2 }),\n})',
        ),
        vf(
          'fetch rejette sa promesse quand le serveur répond 404.',
          false,
          'Un 404 est une réponse HTTP valide : la promesse est tenue, avec response.ok à false. fetch ne rejette qu’en cas d’échec réseau ou d’annulation.',
        ),
        fill(
          'Attends la réponse du serveur.',
          'const res = ___ fetch("/api/meteo")',
          ['await', 'async', 'wait', 'then'],
          'await',
          'await attend la promesse ; il s’utilise dans une fonction async (ou au niveau supérieur d’un module).',
        ),
        order(
          'Remets les étapes d’un appel d’API dans l’ordre.',
          [
            'const res = await fetch(url)',
            'if (!res.ok) throw new Error(`HTTP ${res.status}`)',
            'const data = await res.json()',
            'afficher(data)',
          ],
          'Requête, vérification du statut, lecture du JSON (elle aussi asynchrone), puis affichage.',
        ),
        qcm(
          'Quel en-tête accompagne un body créé avec JSON.stringify ?',
          [
            '"Accept": "text/html"',
            '"Content-Type": "application/json"',
            '"Content-Type": "multipart/form-data"',
            'Aucun, fetch le devine toujours',
          ],
          1,
          'Content-Type dit au serveur comment lire le corps. Avec FormData, en revanche, on laisse le navigateur le fixer.',
        ),
        match('Associe chaque code HTTP à sa signification.', [
          ['201', 'Ressource créée'],
          ['401', 'Non authentifié'],
          ['403', 'Authentifié mais interdit'],
          ['404', 'Ressource introuvable'],
          ['500', 'Erreur interne du serveur'],
        ]),
        qcm(
          'Dans quel ordre s’affichent les messages ?',
          ['1 2 3 4', '1 4 3 2', '1 4 2 3', '1 3 4 2'],
          1,
          'Le code synchrone d’abord (1, 4). Puis les microtâches des promesses (3), avant les tâches comme setTimeout (2), même avec 0 ms.',
          'console.log(1)\nsetTimeout(() => console.log(2), 0)\nPromise.resolve().then(() => console.log(3))\nconsole.log(4)',
        ),
      ]),

      lesson('bonnes-pratiques', 'Réseau fiable, rapide et sûr', [
        tip(
          'Penser aux connexions lentes',
          'Sur une 3G saturée, une requête peut traîner ou échouer. Une interface solide prévoit tous les états : chargement (un indicateur, le bouton désactivé pour éviter le double paiement), succès, erreur avec un message clair et un bouton « Réessayer », liste vide.\n\nOutils utiles :\n• try/catch autour de await fetch pour attraper les coupures ;\n• AbortSignal.timeout(8000) passé en signal : la requête est abandonnée après 8 s (erreur de nom TimeoutError) ;\n• AbortController pour annuler la recherche précédente quand l’utilisateur tape une nouvelle lettre (erreur AbortError, à ignorer) ;\n• attendre une courte pause dans la saisie (debounce) avant de lancer une recherche ;\n• navigator.onLine et les événements online / offline pour prévenir que la connexion est perdue.\n\nTeste avec la limitation réseau de l’onglet Réseau des DevTools (profils 3G ou 4G lents).',
          'try {\n  const res = await fetch("/api/produits", { signal: AbortSignal.timeout(8000) })\n  if (!res.ok) throw new Error(`HTTP ${res.status}`)\n  afficher(await res.json())\n} catch (err) {\n  message.textContent = err.name === "TimeoutError"\n    ? "Le réseau est lent, réessaie."\n    : "Chargement impossible."\n}',
        ),
        tip(
          'Performance et sécurité',
          'Performance (les Core Web Vitals de Google) : LCP, affichage du plus gros élément, bon sous 2,5 s ; INP, réactivité aux interactions, bonne sous 200 ms ; CLS, stabilité visuelle, bonne sous 0,1. Pour y arriver : scripts en defer, images en WebP ou AVIF avec width, height et srcset, loading="lazy" sous la ligne de flottaison, fichiers compressés et mis en cache.\n\nSécurité côté navigateur :\n• tout ce qui est envoyé au navigateur est lisible : jamais de clé d’API secrète dans le JavaScript ; le serveur appelle le service à ta place ;\n• textContent plutôt qu’innerHTML pour les données externes (XSS) ;\n• localStorage est lisible par tout script de la page : n’y stocke ni jeton de session ni donnée sensible (préfère un cookie HttpOnly posé par le serveur) ;\n• HTTPS partout ;\n• CORS est une règle appliquée par le navigateur : c’est le serveur qui autorise, avec Access-Control-Allow-Origin, une autre origine à lire ses réponses. Ce n’est pas une protection du serveur contre un script ou curl.',
        ),
        qcm(
          'L’utilisateur clique deux fois sur « Payer » pendant que la requête traîne. Quelle est la bonne pratique ?',
          [
            'Ne rien faire, le serveur gérera',
            'Désactiver le bouton et afficher un état de chargement jusqu’à la réponse',
            'Recharger la page',
            'Lancer la requête deux fois pour aller plus vite',
          ],
          1,
          'Bloquer le bouton évite les doublons côté client ; le serveur doit malgré tout se protéger des paiements en double.',
        ),
        fill(
          'Abandonne la requête au bout de 8 secondes.',
          'await fetch(url, { signal: AbortSignal.___(8000) })',
          ['timeout', 'delay', 'abort', 'wait'],
          'timeout',
          'AbortSignal.timeout(ms) renvoie un signal qui s’abandonne seul ; l’erreur levée a pour nom TimeoutError.',
        ),
        vf(
          'Une clé d’API placée dans une variable du JavaScript envoyé au navigateur est cachée aux visiteurs.',
          false,
          'N’importe qui peut lire le code source ou l’onglet Réseau. Les secrets restent sur le serveur, qui fait l’appel lui-même.',
        ),
        match('Associe chaque indicateur à ce qu’il mesure.', [
          ['LCP', 'Temps d’affichage du plus gros contenu visible'],
          ['INP', 'Réactivité aux interactions'],
          ['CLS', 'Décalages inattendus de la mise en page'],
        ]),
        qcm(
          'Où conserver de préférence le jeton de session d’un utilisateur connecté ?',
          [
            'Dans localStorage',
            'Dans un cookie HttpOnly, Secure, posé par le serveur',
            'Dans une variable globale window.jeton',
            'Dans l’URL de la page',
          ],
          1,
          'Un cookie HttpOnly est inaccessible au JavaScript : une faille XSS ne peut pas le lire. localStorage, lui, est lisible par tout script de la page.',
        ),
        qcm(
          'La console affiche une erreur CORS quand ta page appelle l’API d’un autre domaine. Où se trouve la correction ?',
          [
            'Dans le HTML de la page',
            'Côté serveur de l’API, qui doit autoriser ton origine (Access-Control-Allow-Origin)',
            'Dans le CSS',
            'En ajoutant mode: "no-cors", qui rend la réponse lisible',
          ],
          1,
          'C’est le serveur qui accorde l’accès. mode: "no-cors" donne une réponse opaque, illisible par ton code : ce n’est pas une solution.',
        ),
      ]),
    ],
  ),
];
