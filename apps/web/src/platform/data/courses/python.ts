import { fill, lesson, match, order, qcm, tip, unit, vf } from './dsl';
import type { CourseUnit } from './types';

export const units: CourseUnit[] = [
  unit('bases', 'Premiers pas', 'Afficher, calculer et ranger des valeurs.', [
    lesson('print', 'Afficher et calculer', [
      tip(
        'Ton premier programme',
        'print affiche une valeur. Python calcule comme une calculatrice : + - * /, ** pour la puissance, // pour la division entière et % pour le reste. Le texte s’écrit entre guillemets.',
        'print("Bonjour Dakar !")\nprint(7 + 3)    # 10\nprint(7 / 2)    # 3.5\nprint(7 // 2)   # 3\nprint(7 % 2)    # 1',
      ),
      qcm('Qu’affiche print(2 ** 3) ?', ['6', '8', '9'], 1, '** est la puissance : 2 × 2 × 2 = 8.'),
      qcm(
        'Que vaut 17 % 5 ?',
        ['2', '3', '3.4'],
        0,
        '% donne le reste de la division : 17 = 3 × 5 + 2.',
      ),
      fill(
        'Affiche le message.',
        '___("Salut")',
        ['print', 'echo', 'console.log'],
        'print',
        'En Python, on affiche avec print().',
      ),
      vf(
        'Le symbole # commence un commentaire, ignoré par Python.',
        true,
        'Les commentaires expliquent le code aux humains.',
      ),
      qcm(
        'Que vaut 10 / 4 ?',
        ['2', '2.5', '2.0'],
        1,
        '/ donne toujours un nombre à virgule. 10 // 4 vaudrait 2.',
      ),
    ]),
    lesson('variables', 'Variables et types', [
      tip(
        'Nommer des valeurs',
        'Une variable se crée en lui donnant une valeur avec =. Pas besoin de déclarer son type : Python le devine. Types courants : int (entier), float (à virgule), str (texte), bool (True ou False).',
        'prenom = "Kofi"\nage = 24\ntaille = 1.78\netudiant = True\nprint(type(age))  # <class \'int\'>',
      ),
      match('Associe chaque valeur à son type.', [
        ['42', 'int'],
        ['3.14', 'float'],
        ['"Lomé"', 'str'],
        ['False', 'bool'],
      ]),
      vf(
        'En Python, true s’écrit avec une minuscule.',
        false,
        'Les booléens s’écrivent True et False, avec une majuscule.',
      ),
      qcm(
        'Quel nom de variable est valide ?',
        ['2prix', 'prix_total', 'prix-total'],
        1,
        'Un nom commence par une lettre ou _, sans tiret. On écrit en snake_case : prix_total.',
      ),
      fill(
        'Convertis le texte en entier.',
        'age = ___("24")',
        ['int', 'str', 'num'],
        'int',
        'int() transforme "24" en 24.',
      ),
      qcm(
        'Que vaut "5" + "5" ?',
        ['10', '"55"', 'Une erreur'],
        1,
        'Additionner deux textes les colle bout à bout.',
      ),
    ]),
    lesson('fstrings', 'Texte et saisie', [
      tip(
        'Composer du texte',
        'Une f-string insère des variables dans un texte : on met f devant les guillemets et les variables entre accolades. input() lit ce que tape l’utilisateur, toujours sous forme de texte.',
        'nom = input("Ton prénom ? ")\nannee = int(input("Ton année de naissance ? "))\nprint(f"Bonjour {nom}, tu as {2026 - annee} ans")',
      ),
      fill(
        'Insère la variable dans le texte.',
        'print(___"Bonjour {nom}")',
        ['f', 's', '$'],
        'f',
        'Le préfixe f active les accolades.',
      ),
      vf(
        'input() renvoie toujours du texte (str).',
        true,
        'Pour un nombre, il faut convertir avec int() ou float().',
      ),
      qcm(
        'Que renvoie len("Bénin") ?',
        ['4', '5', '6'],
        1,
        'len compte les caractères : B-é-n-i-n.',
      ),
      qcm(
        'Quelle méthode met un texte en majuscules ?',
        ['"awa".upper()', '"awa".capital()', 'upper("awa")'],
        0,
        'upper(), lower(), strip() et replace() sont des méthodes de str.',
      ),
      order(
        'Demande un prénom puis salue la personne.',
        ['nom = input("Prénom ? ")', 'message = f"Bienvenue {nom}"', 'print(message)'],
        'Lire, composer, afficher.',
      ),
    ]),
  ]),

  unit('controle', 'Conditions et boucles', 'Faire décider et répéter ton programme.', [
    lesson('if', 'Conditions', [
      tip(
        'if, elif, else',
        'Une condition exécute un bloc seulement si elle est vraie. Python utilise l’indentation (4 espaces) pour savoir ce qui est dans le bloc, et deux-points à la fin de la ligne.',
        'note = 14\nif note >= 16:\n    print("Très bien")\nelif note >= 10:\n    print("Admis")\nelse:\n    print("Recalé")',
      ),
      qcm(
        'Qu’affiche ce code avec note = 14 ?',
        ['Très bien', 'Admis', 'Recalé'],
        1,
        '14 n’est pas ≥ 16, mais il est ≥ 10.',
      ),
      fill(
        'Complète la condition.',
        'if age >= 18___\n    print("Majeur")',
        [':', ';', '{'],
        ':',
        'Chaque if, elif, else, for, def se termine par deux-points.',
      ),
      vf(
        'En Python, l’indentation est obligatoire et a un sens.',
        true,
        'C’est elle qui délimite les blocs, à la place des accolades.',
      ),
      qcm(
        'Comment teste-t-on l’égalité ?',
        ['=', '==', '==='],
        1,
        '= affecte une valeur, == compare.',
      ),
      match('Associe chaque opérateur à son sens.', [
        ['and', 'Les deux sont vraies'],
        ['or', 'Au moins une est vraie'],
        ['not', 'L’inverse'],
        ['!=', 'Différent de'],
      ]),
    ]),
    lesson('for', 'La boucle for', [
      tip(
        'Répéter pour chaque élément',
        'for parcourt une séquence : une liste, un texte, ou range(n) qui donne 0, 1, …, n-1.',
        'for i in range(3):\n    print(i)        # 0 1 2\n\nfor ville in ["Cotonou", "Kigali"]:\n    print(ville)',
      ),
      qcm(
        'Quels nombres donne range(1, 4) ?',
        ['1 2 3', '1 2 3 4', '0 1 2 3'],
        0,
        'La borne de fin est exclue.',
      ),
      order(
        'Affiche les nombres de 1 à 5.',
        ['for n in range(1, 6):', '    print(n)'],
        'range(1, 6) va de 1 à 5.',
      ),
      fill(
        'Parcours la liste.',
        'for fruit ___ fruits:\n    print(fruit)',
        ['in', 'of', 'from'],
        'in',
        'for … in … : c’est la syntaxe de Python.',
      ),
      qcm(
        'Que vaut total à la fin ?',
        ['6', '10', '4'],
        0,
        '0 + 1 + 2 + 3 = 6.',
        'total = 0\nfor i in range(4):\n    total += i',
      ),
      vf(
        'break arrête la boucle immédiatement.',
        true,
        'continue, lui, passe directement au tour suivant.',
      ),
    ]),
    lesson('while', 'La boucle while', [
      tip(
        'Répéter tant que',
        'while répète tant qu’une condition est vraie. Attention : si la condition ne devient jamais fausse, la boucle ne s’arrête pas.',
        'essais = 3\nwhile essais > 0:\n    print(f"Il reste {essais} essais")\n    essais -= 1',
      ),
      vf(
        'Une boucle while peut tourner à l’infini si la condition reste vraie.',
        true,
        'Pense à faire évoluer la variable testée.',
      ),
      qcm(
        'Combien de fois s’affiche le message ?',
        ['2', '3', '4'],
        1,
        'essais vaut 3, 2, puis 1 ; à 0 la boucle s’arrête.',
        'essais = 3\nwhile essais > 0:\n    print("Essai")\n    essais -= 1',
      ),
      fill(
        'Diminue le compteur de 1.',
        'compteur ___ 1',
        ['-=', '=-', '--'],
        '-=',
        'compteur -= 1 équivaut à compteur = compteur - 1.',
      ),
      qcm(
        'Quand préférer while à for ?',
        [
          'Quand on connaît le nombre de tours',
          'Quand on répète jusqu’à ce qu’une condition change',
          'Jamais',
        ],
        1,
        'Exemple : redemander un mot de passe tant qu’il est faux.',
      ),
      order(
        'Redemande le code tant qu’il est faux.',
        [
          'code = input("Code ? ")',
          'while code != "1234":',
          '    code = input("Faux, recommence : ")',
          'print("Accès autorisé")',
        ],
        'On lit une première fois, puis on répète tant que la réponse est fausse.',
      ),
    ]),
  ]),

  unit('collections', 'Listes et dictionnaires', 'Ranger plusieurs valeurs et les retrouver.', [
    lesson('listes', 'Les listes', [
      tip(
        'Une suite ordonnée',
        'Une liste range plusieurs valeurs dans l’ordre, entre crochets. Les positions commencent à 0. append ajoute à la fin, len donne la taille.',
        'langages = ["Python", "JavaScript"]\nlangages.append("Go")\nprint(langages[0])    # Python\nprint(langages[-1])   # Go\nprint(len(langages))  # 3',
      ),
      qcm(
        'Que vaut notes[1] ?',
        ['12', '15', '9'],
        1,
        'Les positions commencent à 0 : notes[0] vaut 12.',
        'notes = [12, 15, 9]',
      ),
      fill(
        'Ajoute un élément à la fin.',
        'panier.___("mangue")',
        ['append', 'add', 'push'],
        'append',
        'append ajoute en fin de liste. push, c’est JavaScript.',
      ),
      vf('liste[-1] donne le dernier élément.', true, 'Les index négatifs comptent depuis la fin.'),
      qcm(
        'Que donne nombres[1:3] ?',
        ['[20, 30]', '[10, 20, 30]', '[20, 30, 40]'],
        0,
        'Une tranche [1:3] prend les positions 1 et 2.',
        'nombres = [10, 20, 30, 40]',
      ),
      match('Associe chaque fonction à son résultat sur [3, 1, 2].', [
        ['len', '3'],
        ['sum', '6'],
        ['max', '3 (le plus grand)'],
        ['sorted', '[1, 2, 3]'],
      ]),
    ]),
    lesson('dicts', 'Les dictionnaires', [
      tip(
        'Des étiquettes et des valeurs',
        'Un dictionnaire associe des clés à des valeurs, entre accolades. On lit une valeur par sa clé. get évite l’erreur quand la clé n’existe pas.',
        'dev = {"nom": "Awa", "pays": "SN", "xp": 120}\nprint(dev["nom"])           # Awa\ndev["xp"] += 10\nprint(dev.get("ville", "?"))  # ?',
      ),
      fill(
        'Lis le pays.',
        'print(dev[___])',
        ['"pays"', 'pays', '1'],
        '"pays"',
        'Les clés texte s’écrivent entre guillemets.',
      ),
      vf(
        'Lire une clé absente avec dev["ville"] provoque une erreur.',
        true,
        'C’est une KeyError ; dev.get("ville") renvoie None à la place.',
      ),
      qcm(
        'Comment ajouter une clé « ville » ?',
        ['dev["ville"] = "Dakar"', 'dev.append("ville")', 'dev.ville = "Dakar"'],
        0,
        'On affecte simplement une valeur à une nouvelle clé.',
      ),
      qcm('Que donne len(dev) pour {"a": 1, "b": 2} ?', ['1', '2', '4'], 1, 'len compte les clés.'),
      vf(
        'Un dictionnaire est idéal pour décrire un objet avec des propriétés (nom, prix, stock).',
        true,
        'Les API renvoient souvent du JSON, qui se lit en Python comme des dictionnaires.',
      ),
    ]),
    lesson('parcourir', 'Parcourir et filtrer', [
      tip(
        'Boucles sur les collections',
        'On parcourt une liste avec for. Pour un dictionnaire, items() donne les paires clé et valeur. Une compréhension de liste construit une nouvelle liste en une ligne.',
        'prix = {"riz": 600, "huile": 1500}\nfor produit, montant in prix.items():\n    print(produit, montant)\n\ncarres = [n * n for n in range(5)]\npairs = [n for n in range(10) if n % 2 == 0]',
      ),
      fill(
        'Parcours clés et valeurs.',
        'for cle, valeur in stock.___():',
        ['items', 'pairs', 'values'],
        'items',
        'items() renvoie les paires (clé, valeur).',
      ),
      qcm(
        'Que vaut [n * 2 for n in [1, 2, 3]] ?',
        ['[2, 4, 6]', '[1, 2, 3, 1, 2, 3]', '6'],
        0,
        'Chaque élément est multiplié par 2.',
      ),
      order(
        'Garde seulement les notes de 10 et plus.',
        ['notes = [8, 12, 15, 9]', 'admis = [n for n in notes if n >= 10]', 'print(admis)'],
        'La condition après if filtre les éléments.',
      ),
      vf(
        '[n for n in range(10) if n % 2 == 0] donne les nombres pairs de 0 à 8.',
        true,
        'n % 2 == 0 teste si n est pair.',
      ),
      qcm(
        'Quelle méthode renvoie seulement les clés ?',
        ['keys()', 'values()', 'items()'],
        0,
        'keys() pour les clés, values() pour les valeurs, items() pour les deux.',
      ),
    ]),
  ]),

  unit('fonctions', 'Fonctions et modules', 'Organiser ton code et utiliser celui des autres.', [
    lesson('def', 'Définir une fonction', [
      tip(
        'def et return',
        'def crée une fonction. Elle reçoit des paramètres, et return renvoie le résultat. Une fonction bien nommée rend le code lisible : on comprend ce qu’elle fait sans lire son contenu.',
        'def prix_ttc(prix_ht, taux=0.18):\n    return round(prix_ht * (1 + taux))\n\nprint(prix_ttc(1000))       # 1180\nprint(prix_ttc(1000, 0.2))  # 1200',
      ),
      fill(
        'Déclare la fonction.',
        '___ saluer(nom):\n    return f"Salut {nom}"',
        ['def', 'function', 'fn'],
        'def',
        'En Python, une fonction commence par def.',
      ),
      qcm(
        'Que renvoie une fonction sans return ?',
        ['0', 'None', 'Une erreur'],
        1,
        'None représente l’absence de valeur.',
      ),
      vf(
        'Dans def f(x, y=2), y a une valeur par défaut.',
        true,
        'f(5) utilise y = 2 ; f(5, 3) utilise y = 3.',
      ),
      qcm(
        'Que vaut aire(3, 4) ?',
        ['7', '12', '34'],
        1,
        'La fonction multiplie largeur et hauteur.',
        'def aire(largeur, hauteur):\n    return largeur * hauteur',
      ),
      order(
        'Écris une fonction qui dit si un nombre est pair.',
        ['def est_pair(n):', '    return n % 2 == 0', 'print(est_pair(4))'],
        'La fonction renvoie directement le résultat de la comparaison.',
      ),
    ]),
    lesson('modules', 'Importer des modules', [
      tip(
        'Ne pas tout réécrire',
        'Python fournit des modules prêts à l’emploi : math, random, datetime, json… On les importe avec import. Les paquets externes (requests, pandas) s’installent avec pip.',
        'import random\nfrom datetime import date\n\nprint(random.randint(1, 6))\nprint(date.today().year)\n\n# Dans le terminal :\n# pip install requests',
      ),
      fill(
        'Importe le module.',
        '___ math\nprint(math.sqrt(16))',
        ['import', 'require', 'include'],
        'import',
        'import charge un module.',
      ),
      qcm(
        'Quelle commande installe un paquet externe ?',
        ['pip install requests', 'python get requests', 'npm install requests'],
        0,
        'pip est le gestionnaire de paquets de Python.',
      ),
      match('Associe chaque module à son usage.', [
        ['random', 'Tirer au hasard'],
        ['datetime', 'Dates et heures'],
        ['json', 'Lire et écrire du JSON'],
        ['math', 'Fonctions mathématiques'],
      ]),
      vf(
        'from math import pi permet d’écrire pi sans math. devant.',
        true,
        'from … import … importe un nom précis.',
      ),
      qcm(
        'Pourquoi utiliser un environnement virtuel (python -m venv .venv) ?',
        [
          'Pour isoler les paquets de chaque projet',
          'Pour rendre Python plus rapide',
          'C’est obligatoire pour print',
        ],
        0,
        'Chaque projet garde ses propres versions de paquets, sans conflit.',
      ),
    ]),
    lesson('erreurs', 'Fichiers et erreurs', [
      tip(
        'Lire un fichier sans planter',
        'with open() ouvre un fichier et le referme tout seul. try/except attrape une erreur prévisible (fichier absent, saisie invalide) pour afficher un message clair au lieu d’arrêter le programme.',
        'try:\n    with open("notes.txt", encoding="utf-8") as f:\n        contenu = f.read()\nexcept FileNotFoundError:\n    print("Fichier introuvable")',
      ),
      fill(
        'Ouvre le fichier pour le lire.',
        '___ open("data.txt") as f:\n    print(f.read())',
        ['with', 'using', 'open'],
        'with',
        'with garantit la fermeture du fichier.',
      ),
      qcm(
        'Quelle erreur provoque int("abc") ?',
        ['ValueError', 'TypeError', 'FileNotFoundError'],
        0,
        '"abc" n’est pas un nombre valide : ValueError.',
      ),
      order(
        'Convertis une saisie en nombre sans planter.',
        [
          'try:',
          '    age = int(input("Âge ? "))',
          'except ValueError:',
          '    print("Entre un nombre")',
        ],
        'Le code risqué va dans try, la réaction dans except.',
      ),
      vf(
        'Un except sans type précis (except:) est une bonne pratique.',
        false,
        'Il cache toutes les erreurs, même les bugs. Attrape le type attendu.',
      ),
      qcm(
        'Quel mode ouvre un fichier pour y écrire en remplaçant son contenu ?',
        ['"r"', '"w"', '"a"'],
        1,
        '"r" lit, "w" écrit en remplaçant, "a" ajoute à la fin.',
      ),
    ]),
  ]),
];
