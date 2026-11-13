import { q } from '../devhub-1';
import type { QuizQuestion } from '../types';

/** Questions supplémentaires de js-fondamentaux (12/11/2026). Sorties vérifiées avec Node 24. */
export const EXTRA: QuizQuestion[] = [
  // 0 — Types et comparaisons
  q(
    0,
    'Que vaut 1 + 2 + "3" ?',
    ['"123"', '6', '"33"', 'NaN'],
    2,
    'Évaluation de gauche à droite : 1 + 2 donne 3, puis 3 + "3" concatène en "33".',
  ),
  q(
    0,
    'Un produit a un stock de 0. Que vaut produit.stock ?? 10 ?',
    ['10', '0', 'null', 'undefined'],
    1,
    '?? ne remplace que null et undefined : 0 est gardé. Avec ||, 0 (falsy) aurait été remplacé par 10.',
  ),
  q(
    0,
    'Que vaut null == 0 ?',
    ['true', 'false', 'NaN', 'Une TypeError'],
    1,
    'Avec ==, null n’est égal qu’à undefined. Piège associé : null >= 0 vaut true, car les comparaisons < > convertissent null en 0.',
  ),
  q(
    0,
    'Que vaut Number.isNaN("abc") ?',
    ['true', 'false', 'NaN', 'Une erreur'],
    1,
    'Number.isNaN ne convertit pas son argument : "abc" est une chaîne, pas la valeur NaN. L’ancienne fonction isNaN("abc"), elle, renvoie true.',
  ),
  q(
    0,
    'Que vaut l’expression suivante ?',
    ['true', 'false', 'Une TypeError', 'undefined'],
    1,
    'Deux objets ne sont égaux que s’ils sont le même objet en mémoire : === compare les références, pas le contenu.',
    '[1, 2] === [1, 2]',
  ),

  // 1 — Portée, fonctions et fermetures
  q(
    1,
    'Que produit cette boucle ?',
    ['0, 1, 2', '3, 3, 3', '2, 2, 2', 'Une ReferenceError'],
    1,
    'var crée une seule variable i partagée par les trois callbacks, qui s’exécutent après la boucle, quand i vaut 3. Avec let, on obtiendrait 0, 1, 2.',
    'for (var i = 0; i < 3; i++) {\n  setTimeout(() => console.log(i), 0)\n}',
  ),
  q(
    1,
    'Que se passe-t-il à l’exécution de ce code ?',
    [
      'Affiche "ok"',
      'Affiche undefined',
      'Une TypeError : payer is not a function',
      'Une ReferenceError',
    ],
    2,
    'var payer est remontée mais vaut undefined au moment de l’appel ; appeler undefined lève une TypeError. Une déclaration function aurait été remontée entière.',
    'payer()\nvar payer = function () {\n  console.log("ok")\n}',
  ),
  q(
    1,
    'Que renvoie la fonction ligne() ?',
    ['{ qte: 1 }', 'undefined', 'null', 'Une SyntaxError'],
    1,
    'Les accolades sont lues comme le corps de la fonction et qte: comme une étiquette ; sans return, on obtient undefined. Il faut écrire () => ({ qte: 1 }).',
    'const ligne = () => { qte: 1 }',
  ),
  q(
    1,
    'Que vaut frais(10000, null) ?',
    ['100', '0', 'NaN', 'null'],
    1,
    'La valeur par défaut ne s’applique qu’à undefined. taux vaut donc null, converti en 0 dans la multiplication : 10000 * null = 0.',
    'function frais(montant, taux = 0.01) {\n  return montant * taux\n}',
  ),
  q(
    1,
    'Dans un module ES, que donne l’appel dire() ?',
    ['"Awa"', 'undefined', 'Une TypeError', '""'],
    2,
    'Détachée de son objet, la méthode est appelée sans receveur : en mode strict, this vaut undefined et lire undefined.nom lève une TypeError. bind(user) corrige le problème.',
    'const user = {\n  nom: "Awa",\n  dire() {\n    return this.nom\n  },\n}\nconst dire = user.dire',
  ),

  // 2 — Tableaux et objets
  q(
    2,
    'Que vaut [10, 9, 1, 100].sort() ?',
    ['[1, 9, 10, 100]', '[1, 10, 100, 9]', '[100, 10, 9, 1]', '[10, 9, 1, 100]'],
    1,
    'Sans comparateur, sort convertit en chaînes et trie dans l’ordre des caractères. Pour des nombres : sort((a, b) => a - b).',
  ),
  q(
    2,
    'Que vaut ["1", "2", "3"].map(parseInt) ?',
    ['[1, 2, 3]', '[1, NaN, NaN]', '[NaN, NaN, NaN]', '["1", "2", "3"]'],
    1,
    'map passe (élément, index) : parseInt("2", 1) et parseInt("3", 2) utilisent des bases invalides pour ces chiffres. Utilise map(Number).',
  ),
  q(
    2,
    'Que vaut [...new Set([1, "1", 1, 2])] ?',
    ['[1, 2]', '[1, "1", 2]', '["1", 2]', '[1, "1", 1, 2]'],
    1,
    'Set élimine les doublons au sens de l’égalité stricte : 1 et "1" sont deux valeurs différentes.',
  ),
  q(
    2,
    'Après ce code, que vaut commande.client.nom ?',
    ['"Ali"', '"Ali Diop"', 'undefined', 'Une TypeError'],
    1,
    'Le spread ne copie que le premier niveau : copie.client et commande.client désignent le même objet. structuredClone ferait une copie profonde.',
    'const commande = { client: { nom: "Ali" } }\nconst copie = { ...commande }\ncopie.client.nom = "Ali Diop"',
  ),
  q(
    2,
    'Que se passe-t-il avec [].reduce((s, x) => s + x) ?',
    ['Renvoie 0', 'Renvoie undefined', 'Une TypeError', 'Renvoie []'],
    2,
    'Sans valeur initiale, reduce sur un tableau vide lève « Reduce of empty array with no initial value ». Passe toujours le second argument, ici 0.',
  ),

  // 3 — Asynchrone : promesses et async/await
  q(
    3,
    'Quel ordre d’affichage obtient-on ?',
    ['1, 2, 3, 4', '1, 4, 3, 2', '1, 4, 2, 3', '1, 3, 4, 2'],
    1,
    'Synchrone d’abord (1, 4), puis les microtâches (le then : 3), puis les tâches (setTimeout : 2).',
    'console.log(1)\nsetTimeout(() => console.log(2), 0)\nPromise.resolve().then(() => console.log(3))\nconsole.log(4)',
  ),
  q(
    3,
    'Que renvoie l’appel f() de cette fonction ?',
    ['42', 'Une promesse tenue avec 42', 'undefined', 'Une erreur'],
    1,
    'Une fonction async renvoie toujours une promesse : il faut await f() ou f().then(…) pour obtenir 42.',
    'async function f() {\n  return 42\n}',
  ),
  q(
    3,
    'Une API répond 404. Que fait la promesse renvoyée par fetch ?',
    [
      'Elle est rejetée avec une erreur 404',
      'Elle est tenue avec une réponse dont ok vaut false',
      'Elle reste en attente',
      'Elle lève une SyntaxError',
    ],
    1,
    'fetch n’est rejeté qu’en cas d’échec réseau. Un statut d’erreur HTTP donne une réponse normale : teste res.ok et lève toi-même l’erreur.',
  ),
  q(
    3,
    'Pourquoi envoyes.length vaut-il 0 au moment du console.log ?',
    [
      'forEach n’attend pas les callbacks async',
      'push ne fonctionne pas dans une fonction async',
      'envoyes est une constante',
      'await bloque le tableau',
    ],
    0,
    'forEach lance chaque callback async et rend la main aussitôt. Pour attendre : for...of avec await (en série) ou await Promise.all(numeros.map(…)) (en parallèle).',
    'const envoyes = []\nnumeros.forEach(async (n) => {\n  await envoyerSms(n)\n  envoyes.push(n)\n})\nconsole.log(envoyes.length)',
  ),
  q(
    3,
    'Que se passe-t-il si toutes les promesses passées à Promise.any sont rejetées ?',
    [
      'Elle est tenue avec undefined',
      'Elle est rejetée avec une AggregateError',
      'Elle reste en attente pour toujours',
      'Elle renvoie le premier rejet',
    ],
    1,
    'any attend la première promesse tenue ; si aucune ne l’est, elle rejette avec une AggregateError qui regroupe toutes les raisons dans errors.',
  ),

  // 4 — Modules et erreurs
  q(
    4,
    'Que renvoie f() ?',
    ['"try"', '"finally"', 'undefined', 'Une erreur'],
    1,
    'finally s’exécute après le return du try et son propre return remplace la valeur. Bonne pratique : jamais de return dans finally.',
    'function f() {\n  try {\n    return "try"\n  } finally {\n    return "finally"\n  }\n}',
  ),
  q(
    4,
    'Que donne JSON.stringify({ a: undefined, b: 1, d: new Date(0) }) ?',
    [
      '\'{"a":null,"b":1,"d":{}}\'',
      '\'{"b":1,"d":"1970-01-01T00:00:00.000Z"}\'',
      '\'{"a":undefined,"b":1,"d":0}\'',
      'Une TypeError',
    ],
    1,
    'Une propriété undefined est omise et une Date devient sa chaîne ISO. JSON.parse ne la reconvertira pas en Date.',
  ),
  q(
    4,
    'Quelle erreur lève JSON.parse("{\'n\': 2}") ?',
    ['TypeError', 'SyntaxError', 'RangeError', 'Aucune, il renvoie { n: 2 }'],
    1,
    'JSON exige des guillemets doubles pour les clés et les chaînes. Un texte invalide lève une SyntaxError : entoure JSON.parse d’un try/catch.',
  ),
  q(
    4,
    'Que renvoie import("./graphique.js") ?',
    [
      'Le module, de façon synchrone',
      'Une promesse qui donne l’objet du module',
      'undefined',
      'Une SyntaxError : import doit être en haut du fichier',
    ],
    1,
    'L’import dynamique charge le module à la demande et renvoie une promesse : const { dessiner } = await import("./graphique.js").',
  ),
  q(
    4,
    'Quel type d’erreur lève const client = null; client.nom ?',
    ['ReferenceError', 'SyntaxError', 'TypeError', 'RangeError'],
    2,
    'Le nom client existe mais sa valeur n’a pas de propriétés : c’est une TypeError (« Cannot read properties of null »). ReferenceError concerne un nom inconnu.',
  ),
];
