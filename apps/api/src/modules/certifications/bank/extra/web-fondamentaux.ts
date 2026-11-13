import { q } from '../devhub-1';
import type { QuizQuestion } from '../types';

/** Questions supplémentaires de web-fondamentaux (12/11/2026). */
export const EXTRA: QuizQuestion[] = [
  // 0 — HTML sémantique et accessibilité
  q(
    0,
    'Quel texte alternatif convient à une image purement décorative ?',
    ['Aucun attribut alt', 'alt=""', 'alt="image décorative"', 'alt="décor" aria-hidden="false"'],
    1,
    'Un alt vide indique aux lecteurs d’écran d’ignorer l’image. Sans alt, certains lisent le nom du fichier.',
  ),
  q(
    0,
    'Dans une liste de produits, quel élément convient le mieux à chaque fiche produit autonome ?',
    ['<section>', '<aside>', '<article>', '<div>'],
    2,
    '<article> désigne un contenu qui garde son sens publié seul : billet, commentaire, fiche produit.',
  ),
  q(
    0,
    'Quel est le défaut principal de ce bouton ?',
    [
      'Il n’est ni atteignable au clavier ni annoncé comme un bouton',
      'Il ne fonctionne pas au toucher',
      'Il est trop lent',
      'Le CSS ne peut pas le styliser',
    ],
    0,
    'Un <div> n’est pas focusable et n’a pas de rôle. <button type="button"> apporte le focus, Entrée/Espace et l’annonce « bouton ».',
    '<div class="btn" onclick="ajouter()">Ajouter au panier</div>',
  ),
  q(
    0,
    'Selon les WCAG 2.2 (niveau AA), quel contraste minimal faut-il pour un texte de taille normale ?',
    ['3:1', '4.5:1', '7:1', '2:1'],
    1,
    '4.5:1 pour le texte normal, 3:1 pour le grand texte et les composants d’interface. 7:1 correspond au niveau AAA.',
  ),
  q(
    0,
    'Que fait réellement role="button" ajouté à un <span> ?',
    [
      'Il rend l’élément focusable et activable au clavier',
      'Il change seulement la façon dont l’élément est annoncé aux technologies d’assistance',
      'Il transforme le span en élément <button>',
      'Il ajoute un style de bouton',
    ],
    1,
    'ARIA modifie l’annonce, jamais le comportement : il faudrait encore tabindex="0" et la gestion d’Entrée et d’Espace. D’où la règle : un élément natif d’abord.',
  ),

  // 1 — CSS : sélecteurs, boîte, unités
  q(
    1,
    'Quelle couleur prend le lien ?',
    ['red', 'blue', 'green', 'black'],
    2,
    '#menu a vaut (1, 0, 1) et bat .menu a.lien (0, 2, 1) : un id l’emporte sur n’importe quel nombre de classes.',
    '<nav id="menu" class="menu"><a class="lien" href="/">Accueil</a></nav>\n\n#menu a { color: green; }\n.menu a.lien { color: blue; }\na { color: red; }',
  ),
  q(
    1,
    'En box-sizing: content-box, quelle largeur totale occupe cette boîte, marges non comprises ?',
    ['200 px', '220 px', '242 px', '262 px'],
    2,
    '200 de contenu + 2 × 20 de padding + 2 × 1 de bordure = 242 px. La marge s’ajoute à l’extérieur.',
    '.boite {\n  width: 200px;\n  padding: 20px;\n  border: 1px solid black;\n  margin: 10px;\n}',
  ),
  q(
    1,
    'Avec une police racine de 16 px, quelle taille prend le <span> ?',
    ['20 px', '25 px', '16 px', '24 px'],
    1,
    'Pour font-size, em se calcule sur le parent : .carte = 1.25 × 16 = 20 px, puis le span = 1.25 × 20 = 25 px. Les em se cumulent, les rem non.',
    '.carte { font-size: 1.25em; }\n.carte span { font-size: 1.25em; }',
  ),
  q(
    1,
    'Un <h2> a margin-bottom: 30px et le paragraphe qui le suit margin-top: 20px. Quel espace vertical les sépare ?',
    ['50 px', '20 px', '30 px', '10 px'],
    2,
    'Les marges verticales adjacentes de blocs fusionnent : seule la plus grande est appliquée.',
  ),
  q(
    1,
    'Un badge en position: absolute; top: 0; right: 0 s’affiche dans le coin de la page au lieu de celui de sa carte. Que manque-t-il ?',
    [
      'z-index: 1 sur le badge',
      'display: block sur le badge',
      'position: relative sur la carte',
      'overflow: hidden sur le body',
    ],
    2,
    'Un élément absolute se place par rapport à son ancêtre positionné le plus proche. Sans ancêtre positionné, il se place par rapport au bloc initial de la page.',
  ),

  // 2 — Mise en page : Flexbox et Grid
  q(
    2,
    'Dans un conteneur en flex-direction: column, quelle propriété centre les enfants horizontalement ?',
    ['justify-content: center', 'align-items: center', 'text-align: center', 'flex-wrap: center'],
    1,
    'En column, l’axe principal est vertical : l’horizontale devient l’axe secondaire, géré par align-items.',
  ),
  q(
    2,
    'Le conteneur flex fait 900 px, sans gap. Quelle largeur prend .principal ?',
    ['300 px', '450 px', '600 px', '900 px'],
    2,
    'flex: 2 et flex: 1 partent de 0 et se partagent l’espace en 3 parts : 600 px et 300 px.',
    '.conteneur { display: flex; width: 900px; }\n.principal { flex: 2; }\n.annexe { flex: 1; }',
  ),
  q(
    2,
    'Quelles colonnes occupe un élément en grid-column: 2 / 4 ?',
    [
      'Les colonnes 2, 3 et 4',
      'Les colonnes 2 et 3',
      'La colonne 2 seulement',
      'Les colonnes 3 et 4',
    ],
    1,
    'Les nombres désignent des lignes de la grille : de la ligne 2 à la ligne 4, on couvre les colonnes 2 et 3.',
  ),
  q(
    2,
    'Une grille de 1000 px a grid-template-columns: 200px 1fr 3fr, sans gap. Quelle largeur prend la troisième colonne ?',
    ['600 px', '750 px', '800 px', '500 px'],
    0,
    'fr partage l’espace restant après les tailles fixes : 1000 − 200 = 800 px en 4 parts de 200 px, donc 3fr = 600 px.',
  ),
  q(
    2,
    'Pourquoi éviter order (Flexbox) pour réorganiser profondément le contenu d’une page ?',
    [
      'order n’est pas pris en charge par les navigateurs récents',
      'L’ordre du focus clavier et de lecture reste celui du HTML, ce qui devient incohérent',
      'order désactive gap',
      'order ne fonctionne qu’en flex-direction: column',
    ],
    1,
    'order ne change que l’affichage. Les utilisateurs du clavier et des lecteurs d’écran suivent l’ordre du code source.',
  ),

  // 3 — JavaScript et DOM
  q(
    3,
    'Pourquoi ce code lève-t-il une erreur ?',
    [
      'querySelectorAll renvoie une NodeList, qui n’a pas de méthode map',
      'textContent n’existe pas sur les éléments',
      'Il manque await devant querySelectorAll',
      'Le sélecteur .prix est invalide',
    ],
    0,
    'Une NodeList a forEach mais pas map. [...document.querySelectorAll(".prix")] ou Array.from(...) en fait un vrai tableau.',
    'const prix = document.querySelectorAll(".prix").map((el) => el.textContent)',
  ),
  q(
    3,
    'Pour <div data-prix-unitaire="1500">, que vaut element.dataset.prixUnitaire ?',
    ['Le nombre 1500', 'La chaîne "1500"', 'undefined', 'null'],
    1,
    'Les tirets deviennent du camelCase et la valeur d’un attribut est toujours une chaîne : convertis avec Number() avant de calculer.',
  ),
  q(
    3,
    'Un écouteur de clic est posé sur un <button> qui contient une icône <svg>. On clique sur l’icône. Que vaut event.currentTarget ?',
    ['Le <svg>', 'Le <button>', 'Le document', 'undefined'],
    1,
    'currentTarget est l’élément qui porte l’écouteur ; target est celui où le clic est né (l’icône).',
  ),
  q(
    3,
    'Quel est l’intérêt de la délégation d’événements sur une liste de produits chargée depuis une API ?',
    [
      'Elle rend les clics plus rapides',
      'Un seul écouteur sur le parent gère aussi les éléments ajoutés plus tard',
      'Elle empêche la remontée des événements',
      'Elle remplace preventDefault',
    ],
    1,
    'Les clics remontent jusqu’au parent ; event.target.closest("button") retrouve le bouton visé, même s’il a été créé après la pose de l’écouteur.',
  ),
  q(
    3,
    'Un script placé dans <head> sans attribut renvoie null pour document.querySelector("#panier"). Quelle est la meilleure correction ?',
    [
      'Ajouter defer à la balise <script>',
      'Ajouter async à la balise <script>',
      'Envelopper le code dans setTimeout(…, 1000)',
      'Remplacer querySelector par getElementsByClassName',
    ],
    0,
    'Le script s’exécute avant que le body soit lu. defer le télécharge en parallèle et l’exécute après l’analyse complète du HTML, dans l’ordre.',
  ),

  // 4 — Requêtes réseau et bonnes pratiques
  q(
    4,
    'Dans quel ordre s’affichent les nombres ?',
    ['1 2 3 4', '1 4 3 2', '1 4 2 3', '1 3 4 2'],
    1,
    'Le code synchrone d’abord (1, 4), puis les microtâches des promesses (3), puis les tâches comme setTimeout (2), même avec un délai de 0.',
    'console.log(1)\nsetTimeout(() => console.log(2), 0)\nPromise.resolve().then(() => console.log(3))\nconsole.log(4)',
  ),
  q(
    4,
    'Quel en-tête faut-il envoyer avec un body construit par JSON.stringify ?',
    [
      '"Content-Type": "application/json"',
      '"Accept": "text/html"',
      '"Content-Type": "multipart/form-data"',
      'Aucun : fetch le devine toujours',
    ],
    0,
    'Content-Type indique au serveur comment lire le corps. Avec un FormData, au contraire, on laisse le navigateur le fixer (avec la frontière multipart).',
  ),
  q(
    4,
    'Comment abandonner automatiquement une requête qui dépasse 8 secondes sur une connexion lente ?',
    [
      'fetch(url, { timeout: 8000 })',
      'fetch(url, { signal: AbortSignal.timeout(8000) })',
      'setTimeout(fetch, 8000)',
      'fetch(url, { keepalive: false })',
    ],
    1,
    'fetch n’a pas d’option timeout. AbortSignal.timeout(ms) fournit un signal qui annule la requête ; l’erreur levée s’appelle TimeoutError.',
  ),
  q(
    4,
    'Où conserver de préférence le jeton de session d’un utilisateur connecté ?',
    [
      'Dans localStorage',
      'Dans un cookie HttpOnly et Secure posé par le serveur',
      'Dans une variable globale du JavaScript',
      'Dans l’URL de la page',
    ],
    1,
    'Un cookie HttpOnly est inaccessible au JavaScript : une faille XSS ne peut pas le voler. localStorage est lisible par tout script de la page.',
  ),
  q(
    4,
    'Ta page appelle l’API d’un autre domaine et la console affiche une erreur CORS. Où se trouve la correction ?',
    [
      'Côté serveur de l’API, qui doit autoriser ton origine avec Access-Control-Allow-Origin',
      'Dans fetch, avec mode: "no-cors" pour lire la réponse',
      'Dans la balise meta viewport',
      'En passant la page en HTTP',
    ],
    0,
    'CORS est appliqué par le navigateur mais accordé par le serveur. mode: "no-cors" renvoie une réponse opaque, illisible par ton code.',
  ),
];
