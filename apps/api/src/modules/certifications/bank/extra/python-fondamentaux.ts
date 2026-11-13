import { q } from '../devhub-1';
import type { QuizQuestion } from '../types';

/** Questions supplémentaires de python-fondamentaux (12/11/2026). */
export const EXTRA: QuizQuestion[] = [
  // 0 — Types et opérations
  q(
    0,
    'Que vaut -7 // 2 ?',
    ['-3', '-4', '-3.5', '3'],
    1,
    '// arrondit vers le bas (vers moins l’infini), pas vers zéro : -3,5 devient -4. De même, -7 % 2 vaut 1.',
  ),
  q(
    0,
    'Que vaut round(2.5) en Python 3 ?',
    ['3', '2.0', '2', '3.0'],
    2,
    'round arrondit « au pair » quand on est pile au milieu (arrondi bancaire) : round(2.5) vaut 2 et round(3.5) vaut 4. Sans second argument, le résultat est un int.',
  ),
  q(
    0,
    'Que vaut 0.1 + 0.2 == 0.3 ?',
    ['True', 'None', 'Une TypeError', 'False'],
    3,
    '0.1 + 0.2 donne 0.30000000000000004 : les float sont approximatifs en binaire. Compare-les avec math.isclose, et garde les montants d’argent en int.',
  ),
  q(
    0,
    'Que vaut 2 ** 3 ** 2 ?',
    ['64', '512', '36', '12'],
    1,
    '** est associatif à droite : on calcule d’abord 3 ** 2 = 9, puis 2 ** 9 = 512. Mets des parenthèses pour lever le doute.',
  ),
  q(
    0,
    'Qu’affiche ce code si l’utilisateur tape 4 ?',
    ['12', '444', 'Une TypeError', '4 4 4'],
    1,
    'input renvoie toujours une str : "4" * 3 répète le texte et donne "444". Pour calculer, convertis avec int(input(...)).',
    'n = input("Nombre ? ")\nprint(n * 3)',
  ),

  // 1 — Conditions et boucles
  q(
    1,
    'Que vaut i après for i in range(3): pass ?',
    ['3', '2', '0', 'Une NameError'],
    1,
    'La variable de boucle survit à la boucle et garde sa dernière valeur : range(3) produit 0, 1, 2, donc i vaut 2.',
  ),
  q(
    1,
    'Quelle condition teste correctement si mois vaut 6, 7 ou 8 ?',
    ['mois == 6 or 7 or 8', 'mois == (6, 7, 8)', 'mois in (6, 7, 8)', '6 < mois < 8'],
    2,
    'mois == 6 or 7 or 8 est toujours vrai (7 est truthy) ; mois == (6, 7, 8) compare à un tuple ; 6 < mois < 8 exclut 6 et 8. in teste l’appartenance.',
  ),
  q(
    1,
    'Qu’affiche cette boucle qui utilise continue ?',
    ['9', '6', '15', '0'],
    1,
    'x % 2 vaut 1 (vrai) pour les impairs, qui sont sautés par continue. Il reste 2 + 4 = 6.',
    'total = 0\nfor x in range(1, 6):\n    if x % 2:\n        continue\n    total += x\nprint(total)',
  ),
  q(
    1,
    'Que vaut n à la sortie de cette boucle while ?',
    ['27', '50', '243', '81'],
    3,
    'n vaut 1, 3, 9, 27, puis 81 : la condition n < 50 est testée avant chaque tour, et 27 < 50 autorise un dernier tour.',
    'n = 1\nwhile n < 50:\n    n *= 3',
  ),
  q(
    1,
    'Qu’affiche cette boucle avec break et else ?',
    ['grand', 'aucun', 'grand puis aucun', 'Rien'],
    0,
    'Le else d’une boucle ne s’exécute que si la boucle se termine sans break. Ici 8 > 6 déclenche le break, donc « aucun » n’est pas affiché.',
    'for n in [3, 8, 5]:\n    if n > 6:\n        print("grand")\n        break\nelse:\n    print("aucun")',
  ),

  // 2 — Listes, tuples et dictionnaires
  q(
    2,
    'Que contient a après ce code ?',
    ['[1, 2]', '[3]', '[1, 2, 3]', 'None'],
    2,
    'b = a ne copie pas la liste : a et b désignent le même objet. Pour une copie indépendante, utilise a.copy() ou a[:].',
    'a = [1, 2]\nb = a\nb.append(3)',
  ),
  q(
    2,
    'Que vaut notes après notes = [3, 1, 2].sort() ?',
    ['[1, 2, 3]', 'None', '[3, 1, 2]', 'Une erreur'],
    1,
    'sort() trie en place et renvoie None. Pour obtenir une nouvelle liste triée, utilise sorted([3, 1, 2]).',
  ),
  q(
    2,
    'Quel est le type de la valeur (5) ?',
    ['tuple', 'list', 'set', 'int'],
    3,
    'Les parenthèses seules ne font pas un tuple : ce sont les virgules. (5,) est un tuple d’un élément, (5) est juste l’entier 5.',
  ),
  q(
    2,
    'Que vaut compte après ce code de comptage ?',
    ["{'a': 2, 'b': 1, 'c': 1}", "{'a': 1, 'b': 1, 'c': 1}", "{'a': 2}", 'Une KeyError'],
    0,
    'compte.get(c, 0) renvoie 0 à la première rencontre d’une lettre, puis le compte actuel : c’est le motif classique pour compter sans KeyError.',
    'compte = {}\nfor c in "abca":\n    compte[c] = compte.get(c, 0) + 1',
  ),
  q(
    2,
    'Laquelle de ces valeurs ne peut pas être une clé de dictionnaire ?',
    ['(1, 2)', '"id"', '[1, 2]', '3.5'],
    2,
    'Une clé doit être hachable, donc immuable : str, int, float, tuple conviennent, une liste (mutable) lève une TypeError.',
  ),

  // 3 — Fonctions
  q(
    3,
    'Qu’affiche ce code au troisième appel de f ?',
    ['[3]', '[1, 2, 3]', '[1, 2]', 'None'],
    1,
    'La liste par défaut est créée une seule fois, à la définition : les appels l’accumulent. La bonne pratique est l=None puis l = [] dans la fonction.',
    'def f(x, l=[]):\n    l.append(x)\n    return l\n\nf(1)\nf(2)\nprint(f(3))',
  ),
  q(
    3,
    'Quel est le type de args dans def f(*args) ?',
    ['list', 'dict', 'set', 'tuple'],
    3,
    '*args rassemble les arguments positionnels en trop dans un tuple ; **kwargs rassemble les arguments nommés en trop dans un dict.',
  ),
  q(
    3,
    'Que se passe-t-il à l’appel de f() ?',
    ['Affiche 10', 'Une UnboundLocalError', 'Affiche 5', 'Une NameError'],
    1,
    'Comme x est affecté dans la fonction, Python le considère comme local dans tout le corps : le lire avant l’affectation lève une UnboundLocalError.',
    'x = 10\n\ndef f():\n    print(x)\n    x = 5\n\nf()',
  ),
  q(
    3,
    'Quelle définition provoque une SyntaxError ?',
    ['def f(a, b=1):', 'def f(*args, **kwargs):', 'def f(a, *, b):', 'def f(a=1, b):'],
    3,
    'Un paramètre sans valeur par défaut ne peut pas suivre un paramètre qui en a une. def f(a, *, b) est valide : b doit simplement être passé par son nom.',
  ),
  q(
    3,
    'Que vaut sorted(["Ines", "Al", "Kofi"], key=len) ?',
    [
      "['Al', 'Ines', 'Kofi']",
      "['Al', 'Kofi', 'Ines']",
      "['Kofi', 'Ines', 'Al']",
      "['Ines', 'Kofi', 'Al']",
    ],
    0,
    'key=len trie par longueur. Le tri de Python est stable : Ines et Kofi ont la même longueur et gardent leur ordre d’origine.',
  ),

  // 4 — Modules, fichiers et exceptions
  q(
    4,
    'Quel mode d’ouverture efface le contenu existant du fichier ?',
    ['"r"', '"a"', '"w"', '"x"'],
    2,
    '"w" crée le fichier ou le vide. "a" ajoute à la fin, "r" lit, "x" crée et échoue si le fichier existe déjà.',
  ),
  q(
    4,
    'Quelle fonction transforme une chaîne JSON en objet Python ?',
    ['json.load', 'json.loads', 'json.dumps', 'json.parse'],
    1,
    'loads lit une chaîne (s pour string), load lit un fichier ouvert. dumps et dump font l’inverse. json.parse n’existe pas (c’est JSON.parse en JavaScript).',
  ),
  q(
    4,
    'Qu’affiche ce code où l’ordre des except compte ?',
    ['division', 'Une ZeroDivisionError non gérée', 'général puis division', 'général'],
    3,
    'Les except sont testés dans l’ordre et le premier qui correspond gagne. ZeroDivisionError hérite d’Exception : place toujours les types précis en premier.',
    'try:\n    1 / 0\nexcept Exception:\n    print("général")\nexcept ZeroDivisionError:\n    print("division")',
  ),
  q(
    4,
    'Quelle commande crée un environnement virtuel dans le dossier .venv ?',
    ['python -m venv .venv', 'pip install venv', 'python -m pip venv .venv', 'venv create .venv'],
    0,
    'venv fait partie de la bibliothèque standard. On l’active ensuite (source .venv/bin/activate sous Linux et macOS) et on y installe les paquets du projet.',
  ),
  q(
    4,
    'Comment signaler un montant négatif reçu par ta fonction ?',
    [
      'throw ValueError("montant négatif")',
      'raise ValueError("montant négatif")',
      'return ValueError("montant négatif")',
      'except ValueError("montant négatif")',
    ],
    1,
    'raise déclenche une exception ; throw n’existe pas en Python. Renvoyer l’exception avec return ne l’active pas : l’appelant pourrait l’ignorer.',
  ),
];
