import { fill, lesson, match, order, qcm, tip, unit, vf } from './dsl';
import type { CourseUnit } from './types';

export const units: CourseUnit[] = [
  unit('html', 'Ta première page HTML', 'Écrire une page HTML bien structurée.', [
    lesson('balises', 'Les balises', [
      tip(
        'HTML décrit le contenu',
        'Une page web est un texte entouré de balises. La balise ouvrante <p> et la balise fermante </p> disent au navigateur : « ceci est un paragraphe ». Le navigateur s’occupe ensuite de l’afficher.',
        '<h1>Bienvenue</h1>\n<p>Je m’appelle Awa et j’apprends le web.</p>',
      ),
      qcm(
        'Que signifie HTML ?',
        ['HyperText Markup Language', 'High Tech Modern Language', 'Home Tool Markup Language'],
        0,
        'HTML est un langage de balisage (markup) : il décrit la structure du contenu.',
      ),
      vf('Une balise fermante commence par </.', true, '<p> ouvre le paragraphe, </p> le ferme.'),
      fill(
        'Ferme correctement le titre.',
        '<h1>Bienvenue<___>',
        ['/h1', 'h1', '/p'],
        '/h1',
        'On ferme avec la même balise précédée d’une barre oblique : </h1>.',
      ),
      qcm(
        'Quelle balise pour le titre principal d’une page ?',
        ['<title>', '<h1>', '<head>'],
        1,
        '<h1> est le titre visible principal. <title> est le nom affiché dans l’onglet.',
      ),
      match('Associe chaque balise à son rôle.', [
        ['<p>', 'Paragraphe'],
        ['<a>', 'Lien'],
        ['<img>', 'Image'],
        ['<ul>', 'Liste à puces'],
      ]),
    ]),
    lesson('structure', 'La structure d’une page', [
      tip(
        'Le squelette d’une page',
        'Toute page commence par <!DOCTYPE html>. La balise <html> contient deux parties : <head> (les informations pour le navigateur : titre de l’onglet, encodage) et <body> (tout ce qui s’affiche).',
        '<!DOCTYPE html>\n<html lang="fr">\n  <head>\n    <meta charset="utf-8">\n    <title>Mon site</title>\n  </head>\n  <body>\n    <h1>Bonjour</h1>\n  </body>\n</html>',
      ),
      order(
        'Remets ce squelette dans l’ordre.',
        [
          '<!DOCTYPE html>',
          '<html lang="fr">',
          '<head>',
          '<title>Mon site</title>',
          '</head>',
          '<body>',
          '</body>',
          '</html>',
        ],
        'Le doctype d’abord, puis <html> qui contient <head> puis <body>.',
      ),
      qcm(
        'Où place-t-on le contenu visible de la page ?',
        ['Dans <head>', 'Dans <body>', 'Après </html>'],
        1,
        'Tout ce que le visiteur voit va dans <body>.',
      ),
      vf(
        'Le texte de <title> s’affiche en grand en haut de la page.',
        false,
        '<title> s’affiche dans l’onglet du navigateur et dans les résultats Google, pas dans la page.',
      ),
      fill(
        'Indique que la page est en français.',
        '<html lang="___">',
        ['fr', 'french', 'france'],
        'fr',
        'L’attribut lang prend un code de langue : fr, en, wo, sw… Il aide les lecteurs d’écran.',
      ),
      qcm(
        'À quoi sert <meta charset="utf-8"> ?',
        ['À afficher correctement les accents', 'À rendre la page plus rapide', 'À relier le CSS'],
        0,
        'UTF-8 permet d’afficher é, à, ç et tous les alphabets sans caractères bizarres.',
      ),
    ]),
    lesson('liens-images', 'Liens et images', [
      tip(
        'Des attributs pour préciser',
        'Les attributs ajoutent des informations à une balise. Un lien <a> a besoin de href (la destination). Une image <img> a besoin de src (le fichier) et de alt (une description pour ceux qui ne voient pas l’image).',
        '<a href="https://developer.mozilla.org">Documentation MDN</a>\n<img src="photo.jpg" alt="Awa devant son ordinateur">',
      ),
      fill(
        'Complète l’attribut qui donne la destination du lien.',
        '<a ___="https://github.com">Mon GitHub</a>',
        ['href', 'src', 'link'],
        'href',
        'href (hypertext reference) indique où mène le lien.',
      ),
      qcm(
        'À quoi sert l’attribut alt d’une image ?',
        ['À décrire l’image', 'À changer sa taille', 'À ajouter un lien'],
        0,
        'alt est lu par les lecteurs d’écran et s’affiche si l’image ne charge pas (réseau lent).',
      ),
      vf(
        '<img> a besoin d’une balise fermante </img>.',
        false,
        '<img> est une balise vide : elle n’a pas de contenu, donc pas de balise fermante.',
      ),
      qcm(
        'Quel attribut ouvre le lien dans un nouvel onglet ?',
        ['target="_blank"', 'new="true"', 'open="tab"'],
        0,
        'target="_blank" ouvre un nouvel onglet. Ajoute rel="noopener" pour la sécurité.',
      ),
      order(
        'Construis une liste à puces de deux éléments.',
        ['<ul>', '  <li>HTML</li>', '  <li>CSS</li>', '</ul>'],
        '<ul> contient des <li> (list item), un par élément.',
      ),
    ]),
  ]),

  unit(
    'css',
    'Mettre en forme avec CSS',
    'Changer les couleurs, les espacements et la mise en page.',
    [
      lesson('selecteurs', 'Sélecteurs et propriétés', [
        tip(
          'Une règle CSS',
          'Une règle CSS dit « pour ces éléments, applique ces styles ». Elle commence par un sélecteur (quels éléments), puis des propriétés entre accolades. Le CSS se met dans un fichier .css relié par <link> dans <head>.',
          'p {\n  color: navy;\n  font-size: 18px;\n}\n.carte {\n  padding: 16px;\n}',
        ),
        qcm(
          'Dans « p { color: navy; } », quel est le sélecteur ?',
          ['p', 'color', 'navy'],
          0,
          'Le sélecteur p cible tous les paragraphes. color est la propriété, navy la valeur.',
        ),
        fill(
          'Agrandis le texte des titres.',
          'h1 {\n  ___: 32px;\n}',
          ['font-size', 'text-size', 'size'],
          'font-size',
          'La taille du texte se règle avec font-size.',
        ),
        match('Associe chaque sélecteur à ce qu’il cible.', [
          ['p', 'Tous les paragraphes'],
          ['.carte', 'Les éléments de classe « carte »'],
          ['#menu', 'L’élément d’id « menu »'],
          ['a:hover', 'Un lien survolé'],
        ]),
        vf(
          'On relie un fichier CSS avec <link rel="stylesheet" href="style.css"> dans <head>.',
          true,
          'C’est la méthode recommandée : le même fichier sert à toutes les pages.',
        ),
        qcm(
          'Quelle unité suit la taille de texte choisie par l’utilisateur ?',
          ['px', 'rem', 'cm'],
          1,
          'rem est relatif à la taille de base du navigateur : la page respecte les réglages d’accessibilité.',
        ),
      ]),
      lesson('boite', 'Le modèle de boîte', [
        tip(
          'Chaque élément est une boîte',
          'De l’intérieur vers l’extérieur : le contenu, le padding (espace intérieur), la bordure (border), puis la marge (margin, espace avec les voisins). Avec box-sizing: border-box, la largeur inclut le padding et la bordure : c’est plus simple à calculer.',
          '.carte {\n  padding: 16px;\n  border: 1px solid #ccc;\n  margin: 24px 0;\n  box-sizing: border-box;\n}',
        ),
        qcm(
          'Quelle propriété ajoute de l’espace à l’intérieur de la bordure ?',
          ['margin', 'padding', 'gap'],
          1,
          'padding est intérieur, margin est extérieur.',
        ),
        order(
          'Range les couches de la boîte, de l’intérieur vers l’extérieur.',
          ['contenu', 'padding', 'border', 'margin'],
          'Contenu, padding, bordure, marge.',
        ),
        fill(
          'Fais en sorte que la largeur inclue le padding et la bordure.',
          '* {\n  box-sizing: ___;\n}',
          ['border-box', 'content-box', 'padding-box'],
          'border-box',
          'border-box évite les éléments qui débordent quand on ajoute du padding.',
        ),
        vf(
          'margin: 0 auto; centre horizontalement un bloc qui a une largeur.',
          true,
          'Les marges gauche et droite automatiques se partagent l’espace libre.',
        ),
        qcm(
          'Que fait display: none ?',
          [
            'Rend l’élément transparent',
            'Retire l’élément de l’affichage',
            'Réduit sa taille à zéro mais garde sa place',
          ],
          1,
          'L’élément n’est plus affiché et ne prend plus de place.',
        ),
      ]),
      lesson('flexbox', 'Mise en page avec Flexbox', [
        tip(
          'Aligner sur une ligne',
          'display: flex aligne les enfants d’un conteneur sur une ligne. justify-content les répartit sur l’axe principal, align-items les aligne sur l’autre axe, gap ajoute de l’espace entre eux. flex-direction: column les empile.',
          '.barre {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  gap: 12px;\n}',
        ),
        fill(
          'Active Flexbox sur le conteneur.',
          '.menu {\n  display: ___;\n}',
          ['flex', 'block', 'inline'],
          'flex',
          'display: flex transforme les enfants en éléments flexibles.',
        ),
        qcm(
          'Comment centrer les enfants horizontalement (axe principal) ?',
          ['align-items: center', 'justify-content: center', 'text-align: middle'],
          1,
          'justify-content agit sur l’axe principal (horizontal par défaut).',
        ),
        vf(
          'flex-direction: column empile les enfants verticalement.',
          true,
          'L’axe principal devient vertical.',
        ),
        match('Associe chaque valeur de justify-content à son effet.', [
          ['flex-start', 'Tout au début'],
          ['center', 'Au milieu'],
          ['space-between', 'Espacés, collés aux bords'],
          ['flex-end', 'Tout à la fin'],
        ]),
        qcm(
          'Quelle propriété met 16 px entre chaque enfant, sans marge sur les bords ?',
          ['gap: 16px', 'margin: 16px', 'padding: 16px'],
          0,
          'gap ne met de l’espace qu’entre les éléments.',
        ),
      ]),
    ],
  ),

  unit(
    'js',
    'JavaScript : les bases',
    'Écrire de la logique : variables, conditions, boucles, fonctions.',
    [
      lesson('variables', 'Variables et types', [
        tip(
          'Ranger des valeurs',
          'Une variable est une étiquette posée sur une valeur. const pour une valeur qu’on ne réaffecte pas, let si elle va changer. N’utilise plus var. Les types de base : nombre, texte (string), booléen (true/false).',
          'const prenom = "Awa"\nlet points = 10\npoints = points + 5\nconst estConnectee = true',
        ),
        qcm(
          'Quelle déclaration pour une valeur qui ne sera jamais réaffectée ?',
          ['var', 'let', 'const'],
          2,
          'const empêche la réaffectation et rend le code plus sûr.',
        ),
        vf(
          'Une variable déclarée avec let peut être réaffectée.',
          true,
          'let points = 1; points = 2; est valide.',
        ),
        qcm(
          'Que renvoie typeof "5" ?',
          ['"number"', '"string"', '"boolean"'],
          1,
          'Les guillemets en font du texte, même si c’est un chiffre.',
        ),
        fill(
          'Déclare un compteur qui va augmenter.',
          '___ compteur = 0\ncompteur = compteur + 1',
          ['let', 'const', 'var'],
          'let',
          'Le compteur change : il faut let.',
        ),
        match('Associe chaque valeur à son type.', [
          ['42', 'number'],
          ['"Dakar"', 'string'],
          ['true', 'boolean'],
          ['[1, 2, 3]', 'tableau (object)'],
        ]),
      ]),
      lesson('conditions', 'Conditions et boucles', [
        tip(
          'Décider et répéter',
          'if exécute un bloc seulement si une condition est vraie, else sinon. Compare avec === (même valeur et même type). Une boucle for répète un bloc : ici pour chaque élément d’un tableau.',
          'const age = 19\nif (age >= 18) {\n  console.log("Majeur")\n} else {\n  console.log("Mineur")\n}\n\nfor (const ville of ["Lomé", "Accra"]) {\n  console.log(ville)\n}',
        ),
        fill(
          'Affiche « Majeur » à partir de 18 ans.',
          'if (age ___ 18) {\n  console.log("Majeur")\n}',
          ['>=', '=>', '=='],
          '>=',
          '>= veut dire « supérieur ou égal ». => sert aux fonctions fléchées.',
        ),
        vf(
          '"5" === 5 vaut true.',
          false,
          '=== compare aussi le type : texte et nombre sont différents.',
        ),
        qcm(
          'Qu’affiche ce code ?',
          ['0 1 2', '1 2 3', '0 1 2 3'],
          0,
          'i commence à 0 et la boucle s’arrête quand i < 3 devient faux.',
          'for (let i = 0; i < 3; i++) {\n  console.log(i)\n}',
        ),
        order(
          'Remets la boucle dans l’ordre pour afficher chaque prénom.',
          [
            'const prenoms = ["Awa", "Kofi"]',
            'for (const p of prenoms) {',
            '  console.log(p)',
            '}',
          ],
          'On déclare le tableau, puis on le parcourt avec for…of.',
        ),
        qcm(
          'Quel opérateur veut dire « et » ?',
          ['&&', '||', '!'],
          0,
          '&& : les deux conditions doivent être vraies. || : au moins une. ! : l’inverse.',
        ),
      ]),
      lesson('fonctions', 'Fonctions', [
        tip(
          'Réutiliser du code',
          'Une fonction regroupe des instructions sous un nom. Elle reçoit des paramètres et renvoie un résultat avec return. La forme fléchée est courte et très utilisée.',
          'function prixTTC(prix) {\n  return prix * 1.18\n}\n\nconst double = (n) => n * 2\n\nprixTTC(1000) // 1180',
        ),
        qcm(
          'Que fait return ?',
          [
            'Affiche une valeur',
            'Renvoie une valeur et termine la fonction',
            'Recommence la fonction',
          ],
          1,
          'Le code après return n’est pas exécuté.',
        ),
        fill(
          'Complète pour additionner les deux paramètres.',
          'function somme(a, b) {\n  return a ___ b\n}',
          ['+', '=', '&'],
          '+',
          'L’opérateur + additionne deux nombres.',
        ),
        order(
          'Écris une fonction qui salue quelqu’un.',
          [
            'function saluer(nom) {',
            '  return "Bonjour " + nom',
            '}',
            'console.log(saluer("Kofi"))',
          ],
          'On définit la fonction, puis on l’appelle.',
        ),
        vf(
          'const carre = (n) => n * n déclare une fonction.',
          true,
          'C’est une fonction fléchée : sans accolades, elle renvoie directement n * n.',
        ),
        qcm(
          'Que vaut double(4) ?',
          ['4', '8', '16'],
          1,
          'double multiplie son paramètre par 2.',
          'const double = (n) => n * 2',
        ),
      ]),
    ],
  ),

  unit('dom', 'Rendre la page interactive', 'Réagir aux clics et charger des données.', [
    lesson('dom', 'Lire et modifier la page', [
      tip(
        'Le DOM',
        'Le navigateur transforme le HTML en objets que JavaScript peut lire et modifier : le DOM. document.querySelector trouve un élément avec un sélecteur CSS, textContent change son texte.',
        '<h1 id="titre">Bonjour</h1>\n<script>\n  const titre = document.querySelector("#titre")\n  titre.textContent = "Bienvenue sur mon site"\n</script>',
      ),
      fill(
        'Sélectionne l’élément d’id « panier ».',
        'const panier = document.___("#panier")',
        ['querySelector', 'getElement', 'select'],
        'querySelector',
        'querySelector accepte n’importe quel sélecteur CSS.',
      ),
      qcm(
        'Quelle propriété change le texte d’un élément sans interpréter de HTML ?',
        ['textContent', 'innerHTML', 'value'],
        0,
        'textContent est sûr : il n’exécute pas de HTML injecté par un utilisateur.',
      ),
      vf(
        'Mettre le texte d’un utilisateur dans innerHTML peut créer une faille de sécurité.',
        true,
        'C’est une faille XSS : préfère textContent pour du texte venant d’ailleurs.',
      ),
      qcm(
        'Comment ajouter une classe CSS à un élément ?',
        ['el.classList.add("actif")', 'el.class = "actif"', 'el.addClass("actif")'],
        0,
        'classList.add, remove et toggle gèrent les classes.',
      ),
      match('Associe chaque méthode à son rôle.', [
        ['querySelector', 'Trouver un élément'],
        ['querySelectorAll', 'Trouver tous les éléments'],
        ['createElement', 'Créer un élément'],
        ['append', 'Ajouter un enfant'],
      ]),
    ]),
    lesson('evenements', 'Réagir aux clics', [
      tip(
        'Écouter un événement',
        'addEventListener attache une fonction à un événement : clic, saisie, envoi de formulaire. La fonction s’exécute à chaque fois que l’événement se produit.',
        'const bouton = document.querySelector("button")\nlet clics = 0\nbouton.addEventListener("click", () => {\n  clics++\n  bouton.textContent = `Cliqué ${clics} fois`\n})',
      ),
      fill(
        'Réagis au clic sur le bouton.',
        'bouton.addEventListener("___", () => {\n  alert("Merci !")\n})',
        ['click', 'press', 'tap'],
        'click',
        'L’événement s’appelle click, même sur un écran tactile.',
      ),
      order(
        'Compte les clics sur le bouton.',
        [
          'const btn = document.querySelector("button")',
          'let n = 0',
          'btn.addEventListener("click", () => {',
          '  n++',
          '})',
        ],
        'On sélectionne, on initialise le compteur, puis on écoute le clic.',
      ),
      qcm(
        'Quel événement se déclenche quand on envoie un formulaire ?',
        ['submit', 'send', 'post'],
        0,
        'Pense à appeler event.preventDefault() pour éviter le rechargement de la page.',
      ),
      vf(
        'event.preventDefault() empêche le comportement par défaut, comme le rechargement après un envoi de formulaire.',
        true,
        'Indispensable pour traiter un formulaire en JavaScript.',
      ),
      qcm(
        'Quel événement suit chaque caractère tapé dans un champ ?',
        ['input', 'change', 'keyboard'],
        0,
        'input se déclenche à chaque modification ; change seulement quand on quitte le champ.',
      ),
    ]),
    lesson('fetch', 'Charger des données', [
      tip(
        'Appeler une API',
        'fetch demande des données à un serveur. Il renvoie une promesse : avec await, on attend la réponse sans bloquer la page. Vérifie toujours response.ok, puis lis le JSON. Entoure d’un try/catch pour gérer une coupure réseau.',
        'async function chargerProjets() {\n  try {\n    const res = await fetch("/api/projets")\n    if (!res.ok) throw new Error("Serveur indisponible")\n    return await res.json()\n  } catch (e) {\n    console.error(e)\n    return []\n  }\n}',
      ),
      fill(
        'Attends la réponse du serveur.',
        'const res = ___ fetch("/api/meteo")',
        ['await', 'wait', 'async'],
        'await',
        'await met la fonction en pause jusqu’à la réponse ; la fonction doit être async.',
      ),
      vf(
        'fetch lève une erreur quand le serveur répond 404.',
        false,
        'fetch ne lève une erreur qu’en cas de problème réseau. Un 404 ou 500 se détecte avec res.ok.',
      ),
      order(
        'Remets les étapes d’un appel d’API dans l’ordre.',
        [
          'const res = await fetch(url)',
          'if (!res.ok) throw new Error("Erreur")',
          'const data = await res.json()',
          'afficher(data)',
        ],
        'Requête, vérification, lecture du JSON, affichage.',
      ),
      qcm(
        'Que veut dire JSON ?',
        ['JavaScript Object Notation', 'Java Standard Output Network', 'JavaScript Online Node'],
        0,
        'C’est le format texte le plus utilisé pour échanger des données entre un serveur et une page.',
      ),
      qcm(
        'Pourquoi entourer fetch d’un try/catch ?',
        [
          'Pour aller plus vite',
          'Pour gérer une coupure réseau sans planter la page',
          'C’est obligatoire en JavaScript',
        ],
        1,
        'Sur un réseau mobile instable, la requête peut échouer : on affiche un message au lieu d’une page cassée.',
      ),
    ]),
  ]),
];
