import { fill, lesson, match, order, qcm, tip, unit, vf } from './dsl';
import type { CourseUnit } from './types';

/**
 * JavaScript en profondeur : prépare à la certification DevHub js-fondamentaux.
 * Programme : 0 types et comparaisons, 1 portée, fonctions et fermetures, 2 tableaux et objets,
 * 3 asynchrone (promesses et async/await), 4 modules et erreurs.
 * Toutes les sorties de code citées ont été vérifiées avec Node 24 (V8).
 */
export const units: CourseUnit[] = [
  // ─── Thème 0 : types et comparaisons ───────────────────────────────────────
  unit(
    'bases',
    'Variables, types et valeurs',
    'Déclarer des variables avec let et const, reconnaître les huit types de JavaScript et manipuler chaînes et nombres sans surprise.',
    [
      lesson('variables', 'let, const et var', [
        tip(
          'Déclarer une variable',
          'Une variable est un nom qui pointe vers une valeur. En JavaScript moderne, on la déclare avec const quand le nom ne doit plus jamais pointer ailleurs, et avec let quand on devra la réaffecter : un compteur, un total qui grossit, un état qui change.\n\nAttention au sens exact de const : il interdit de réaffecter le nom, pas de modifier ce qu’il contient. const panier = [] puis panier.push("riz") est donc permis, alors que panier = [] lève une TypeError.\n\nUne variable déclarée avec let sans valeur vaut undefined jusqu’à sa première affectation. Une const doit, elle, recevoir sa valeur sur la ligne même où on la déclare.\n\nBonne pratique : const par défaut, let seulement quand tu sais que la valeur changera. Le lecteur comprend alors d’un coup d’œil ce qui bouge dans ton code.',
          'const TVA = 0.18\nlet total = 0\ntotal = total + 5000 // permis : total est un let\n\nconst panier = ["riz", "huile"]\npanier.push("sucre") // permis : on modifie le contenu\n// panier = []       // TypeError : Assignment to constant variable.',
        ),
        qcm(
          'Quelle déclaration choisir pour un total qui augmente à chaque tour de boucle ?',
          ['const', 'let', 'var', 'Aucune, on écrit directement total = 0'],
          1,
          'Le total est réaffecté à chaque tour : il faut let. const lèverait une TypeError à la première réaffectation, var marche mais a une portée de fonction source de bugs.',
        ),
        qcm(
          'Que se passe-t-il à l’exécution de ce code ?',
          [
            'prix vaut 3000',
            'prix reste à 2500 sans erreur',
            'Une TypeError : on ne réaffecte pas une constante',
            'Une SyntaxError avant même l’exécution',
          ],
          2,
          'Réaffecter une const lève « TypeError: Assignment to constant variable. » au moment où la ligne s’exécute.',
          'const prix = 2500\nprix = 3000',
        ),
        vf(
          'const liste = [] puis liste.push(1) lève une erreur.',
          false,
          'const protège le lien entre le nom et le tableau, pas le tableau lui-même. Pour figer le contenu, il faudrait Object.freeze(liste).',
        ),
        fill(
          'Déclare le taux de TVA, qui ne changera jamais dans le programme.',
          '___ TVA = 0.18',
          ['const', 'let', 'constant', 'final'],
          'const',
          'const signale au lecteur (et au moteur) que ce nom ne sera jamais réaffecté. constant et final ne sont pas des mots-clés JavaScript.',
        ),
        tip(
          'var, l’ancienne façon, et ses pièges',
          'Avant 2015, on n’avait que var. Elle a deux défauts qui expliquent pourquoi on l’évite aujourd’hui.\n\n• Sa portée est la fonction entière, pas le bloc : une variable var déclarée dans un if ou une boucle est visible après le bloc.\n• Elle est « remontée » (hoisting) : on peut la lire avant sa ligne de déclaration, elle vaut alors undefined au lieu de lever une erreur.\n\nOn peut aussi redéclarer une var autant de fois qu’on veut, alors que let x deux fois dans le même bloc donne une SyntaxError. Enfin, affecter un nom jamais déclaré (montant = 5) crée une variable globale en mode non strict, mais lève une ReferenceError en mode strict, qui est le mode par défaut des modules ES et des classes.',
          'if (true) {\n  var a = 1\n  let b = 2\n}\nconsole.log(a) // 1 : var ignore le bloc\nconsole.log(b) // ReferenceError : b is not defined',
        ),
        vf(
          'Écrire let x = 1 puis let x = 2 dans le même bloc est accepté.',
          false,
          'Le moteur refuse avant même d’exécuter : « SyntaxError: Identifier ’x’ has already been declared ». Pour changer la valeur, on écrit simplement x = 2.',
        ),
        qcm(
          'Qu’affiche ce code ?',
          ['undefined', 'null', 'Une ReferenceError', '0'],
          0,
          'Une variable let déclarée sans valeur vaut undefined. La ReferenceError n’arrive que si on la lit avant sa ligne de déclaration.',
          'let reduction\nconsole.log(reduction)',
        ),
        match('Associe chaque déclaration à son comportement.', [
          ['const', 'Portée de bloc, jamais réaffectée'],
          ['let', 'Portée de bloc, réaffectable'],
          ['var', 'Portée de fonction, à éviter'],
          ['Nom jamais déclaré', 'ReferenceError en mode strict'],
        ]),
      ]),

      lesson('types-primitifs', 'Les huit types et typeof', [
        tip(
          'Sept primitifs et les objets',
          'JavaScript a huit types. Sept sont des primitifs : string (texte), number (tous les nombres, entiers ou à virgule), bigint (entiers géants, écrits 10n), boolean (true ou false), undefined, null et symbol (identifiant unique). Le huitième est object : objets littéraux, tableaux, fonctions, dates, Map, Set… tout le reste est un objet.\n\nL’opérateur typeof renvoie le type sous forme de chaîne. Retiens ses deux exceptions célèbres :\n• typeof null vaut "object" : c’est un bug de la toute première version du langage, gardé pour ne pas casser le web.\n• typeof d’une fonction vaut "function", alors que les fonctions sont des objets.\n\nUn tableau donne "object" : pour le reconnaître, utilise Array.isArray(valeur). Et typeof sur un nom jamais déclaré renvoie "undefined" au lieu de lever une erreur.',
          'typeof "Awa"        // "string"\ntypeof 42           // "number"\ntypeof 10n          // "bigint"\ntypeof true         // "boolean"\ntypeof undefined    // "undefined"\ntypeof null         // "object"  (bug historique)\ntypeof [1, 2]       // "object"\ntypeof (() => 1)    // "function"\nArray.isArray([1, 2]) // true',
        ),
        qcm(
          'Que vaut typeof [] ?',
          ['"array"', '"object"', '"list"', '"undefined"'],
          1,
          'Un tableau est un objet : typeof renvoie "object". Pour tester si une valeur est un tableau, on utilise Array.isArray.',
        ),
        qcm(
          'Que vaut typeof NaN ?',
          ['"NaN"', '"undefined"', '"object"', '"number"'],
          3,
          'NaN (« Not a Number ») est paradoxalement une valeur du type number : c’est le résultat d’un calcul numérique impossible, comme 0 / 0.',
        ),
        vf(
          'typeof null renvoie "null".',
          false,
          'typeof null renvoie "object", un bug historique. Pour tester null, compare directement : valeur === null.',
        ),
        qcm(
          'Que vaut typeof typeof 42 ?',
          ['"number"', '"string"', '"typeof"', 'Une erreur'],
          1,
          'typeof 42 vaut la chaîne "number" ; typeof d’une chaîne vaut "string". typeof renvoie toujours une chaîne.',
        ),
        tip(
          'Valeur ou référence',
          'Les primitifs sont copiés par valeur et sont immuables : aucune opération ne modifie une chaîne ou un nombre existant, on en fabrique toujours un nouveau. Si b = a puis qu’on réaffecte b, a ne bouge pas.\n\nLes objets, eux, sont manipulés par référence : const p = o ne copie pas l’objet, les deux noms désignent le même objet en mémoire. Modifier p.n modifie donc aussi o.n. C’est la source de beaucoup de bugs quand on croit « copier » un tableau ou un objet.\n\nNuance entre undefined et null : undefined signifie « pas encore de valeur » (variable non initialisée, propriété absente, fonction sans return) ; null signifie « vide, volontairement ». Le langage produit undefined tout seul, c’est toi qui écris null.',
          'let a = "Awa"\nlet b = a\nb = "Kofi"\nconsole.log(a) // "Awa" : copie de la valeur\n\nconst o = { n: 1 }\nconst p = o\np.n = 2\nconsole.log(o.n) // 2 : même objet',
        ),
        qcm(
          'Qu’affiche ce code ?',
          ['["riz"]', '["riz", "mil"]', '[]', 'Une erreur'],
          1,
          'copie et commande désignent le même tableau : push sur l’un est visible depuis l’autre. Pour une vraie copie : [...commande].',
          'const commande = ["riz"]\nconst copie = commande\ncopie.push("mil")\nconsole.log(commande)',
        ),
        vf(
          'typeof surUnNomJamaisDeclare lève une ReferenceError.',
          false,
          'typeof est une exception : sur un nom non déclaré il renvoie "undefined". Attention, ce n’est pas vrai pour un let encore dans sa zone morte, qui lève bien une ReferenceError.',
        ),
        match('Associe chaque valeur au résultat de typeof.', [
          ['null', '"object"'],
          ['undefined', '"undefined"'],
          ['() => {}', '"function"'],
          ['12n', '"bigint"'],
          ['Symbol("id")', '"symbol"'],
        ]),
        fill(
          'Teste de façon fiable si donnees est un tableau.',
          'if (Array.___(donnees)) {\n  console.log(donnees.length)\n}',
          ['isArray', 'typeof', 'isList', 'instance'],
          'isArray',
          'Array.isArray renvoie true pour tout tableau, même venant d’une autre fenêtre ou iframe, contrairement à instanceof Array.',
        ),
      ]),

      lesson('chaines', 'Chaînes et gabarits', [
        tip(
          'Trois façons d’écrire une chaîne',
          'Une chaîne s’écrit entre guillemets doubles "…", simples ’…’ (l’apostrophe droite du clavier) ou accents graves `…`. Les deux premières formes sont équivalentes. La troisième crée un gabarit (template literal), bien plus pratique :\n\n• ${expression} insère la valeur de n’importe quelle expression, convertie en texte ;\n• le texte peut s’étendre sur plusieurs lignes sans \\n.\n\nLes gabarits remplacent avantageusement les concaténations avec + : moins d’erreurs d’espaces oubliés, et on voit tout de suite la forme finale du message.\n\nPiège : ${} d’un objet donne "[object Object]". Pour afficher un objet, passe par JSON.stringify(objet).',
          'const client = "Fatou"\nconst total = 2 * 1500\n\nconst msg = `Bonjour ${client}, ton total est de ${total} FCFA.`\n// "Bonjour Fatou, ton total est de 3000 FCFA."\n\nconst recu = `Reçu\nClient : ${client}`',
        ),
        fill(
          'Insère le prénom dans le message.',
          'const msg = `Bienvenue ___, ton code est prêt.`',
          ['${prenom}', '{prenom}', '$prenom', '#{prenom}'],
          '${prenom}',
          'Dans un gabarit (entre accents graves), ${…} évalue l’expression et insère son résultat sous forme de texte.',
        ),
        qcm(
          'Qu’affiche ce code ?',
          [
            'Total : ${2 * 1500} FCFA',
            'Total : 3000 FCFA',
            'Total : 2 * 1500 FCFA',
            'Une SyntaxError',
          ],
          0,
          'Avec des guillemets doubles, ${…} n’est qu’un texte comme un autre. Seuls les accents graves créent un gabarit.',
          'console.log("Total : ${2 * 1500} FCFA")',
        ),
        tip(
          'Les méthodes à connaître',
          'Une chaîne est immuable : ses méthodes ne la modifient jamais, elles renvoient une nouvelle chaîne. s.toUpperCase() seul ne sert à rien, il faut récupérer le résultat.\n\n• length : nombre d’unités de code (un emoji en compte souvent 2).\n• toUpperCase(), toLowerCase(), trim() pour nettoyer une saisie.\n• includes(), startsWith(), endsWith() pour tester ; indexOf() renvoie -1 si rien n’est trouvé.\n• slice(début, fin) extrait (fin exclue, indices négatifs comptés depuis la fin) ; at(-1) donne le dernier caractère.\n• split(séparateur) découpe en tableau ; padStart(3, "0") complète à gauche.\n• replace() ne remplace que la première occurrence d’une chaîne ; replaceAll() les remplace toutes.\n\nLes chaînes se comparent avec < et > dans l’ordre des codes Unicode : "10" < "9" est vrai, et les majuscules passent avant les minuscules. Pour trier des noms en français, utilise a.localeCompare(b, "fr").',
          '"  awa@mail.sn ".trim()          // "awa@mail.sn"\n"Mobile Money".slice(0, 6)       // "Mobile"\n"Mobile Money".slice(-5)         // "Money"\n"riz,huile,sucre".split(",")     // ["riz", "huile", "sucre"]\n"7".padStart(3, "0")             // "007"\n"a-b-c".replace("-", "+")        // "a+b-c"\n"a-b-c".replaceAll("-", "+")     // "a+b+c"',
        ),
        qcm(
          'Que vaut nom après ce code ?',
          ['"AMINATA"', '"aminata"', '"Aminata"', 'undefined'],
          2,
          'toUpperCase renvoie une nouvelle chaîne que personne ne récupère : nom est inchangé. Il fallait écrire nom = nom.toUpperCase() avec un let.',
          'let nom = "Aminata"\nnom.toUpperCase()',
        ),
        qcm(
          'Que vaut "Mobile Money".slice(-5) ?',
          ['"Mobil"', '"Money"', '" Money"', '"y"'],
          1,
          'Un indice négatif compte depuis la fin : -5 démarre au 5e caractère avant la fin et va jusqu’au bout.',
        ),
        vf(
          '"a-b-c".replace("-", "+") donne "a+b+c".',
          false,
          'replace avec une chaîne ne remplace que la première occurrence : on obtient "a+b-c". Utilise replaceAll pour tout remplacer.',
        ),
        vf(
          '"10" < "9" vaut true.',
          true,
          'Deux chaînes se comparent caractère par caractère : "1" vient avant "9". Convertis en nombres avant de comparer des quantités saisies dans un formulaire.',
        ),
        match('Associe chaque appel à son résultat.', [
          ['"Dakar".at(-1)', '"r"'],
          ['"Dakar".length', '5'],
          ['"Dakar".indexOf("z")', '-1'],
          ['"Dakar".includes("ka")', 'true'],
        ]),
        fill(
          'Découpe la ligne CSV en tableau de produits.',
          'const produits = "riz;huile;sucre".___(";")',
          ['split', 'slice', 'splice', 'join'],
          'split',
          'split découpe une chaîne selon un séparateur et renvoie un tableau. join fait l’inverse : il recolle un tableau en chaîne.',
        ),
      ]),

      lesson('nombres', 'Nombres, NaN et conversions', [
        tip(
          'Un seul type pour tous les nombres',
          'JavaScript n’a qu’un type number pour les entiers et les décimaux : des flottants sur 64 bits (norme IEEE 754). Conséquence célèbre : 0.1 + 0.2 vaut 0.30000000000000004, car 0.1 n’a pas de représentation binaire exacte. Ne compare donc jamais des décimaux avec === ; compare leur écart à une petite tolérance, ou mieux, évite les décimaux.\n\nPour l’argent, c’est simple : stocke des entiers. Le franc CFA n’a pas de centimes en pratique, donc 2500 FCFA reste 2500 ; pour des euros, stocke des centimes (1999 pour 19,99 €).\n\nLes entiers sont exacts jusqu’à Number.MAX_SAFE_INTEGER (9 007 199 254 740 991). Au-delà, utilise BigInt (123n), sans le mélanger avec des number : 10n + 1 lève une TypeError.\n\nValeurs spéciales : 1 / 0 vaut Infinity (pas d’erreur !), 0 / 0 vaut NaN.',
          '0.1 + 0.2            // 0.30000000000000004\n0.1 + 0.2 === 0.3    // false\n\n// En FCFA, on calcule en entiers\nconst prix = 2500\nconst total = prix * 3  // 7500, exact\n\n1 / 0                // Infinity\n10 % 3               // 1 (reste)\n2 ** 10              // 1024 (puissance)',
        ),
        qcm(
          'Que vaut 0.1 + 0.2 === 0.3 ?',
          ['true', 'false', 'NaN', 'Une erreur'],
          1,
          '0.1 + 0.2 vaut 0.30000000000000004 à cause de la représentation binaire des décimaux. Pour l’argent, calcule en entiers.',
        ),
        vf(
          'En JavaScript, diviser par zéro lève une erreur.',
          false,
          '1 / 0 vaut Infinity, -1 / 0 vaut -Infinity et 0 / 0 vaut NaN. Aucune exception : à toi de tester le diviseur.',
        ),
        tip(
          'Convertir une saisie en nombre',
          'Tout ce qui sort d’un champ de formulaire, d’une URL ou d’un fichier est du texte. Il faut le convertir, et chaque outil a sa règle :\n\n• Number(s) (ou +s) convertit toute la chaîne ou renvoie NaN : Number("12abc") vaut NaN, Number("") vaut 0, Number(" 42 ") vaut 42.\n• parseInt(s, 10) et parseFloat(s) lisent le début de la chaîne et s’arrêtent au premier caractère invalide : parseInt("42px", 10) vaut 42. Précise toujours la base 10 avec parseInt.\n\nNaN contamine tous les calculs et n’est égal à rien, pas même à lui-même. Pour le détecter, utilise Number.isNaN(x). L’ancienne fonction globale isNaN convertit d’abord son argument : isNaN("abc") vaut true alors que "abc" n’est pas NaN.\n\nPour afficher, toFixed(2) renvoie une chaîne arrondie, et Intl.NumberFormat("fr-FR") sépare les milliers à la française.',
          'Number("12abc")        // NaN\nparseInt("12abc", 10)  // 12\nNumber("")             // 0  (piège !)\nNumber.isNaN(NaN)      // true\nisNaN("abc")           // true (conversion cachée)\nNumber.isNaN("abc")    // false\n(1234.5678).toFixed(2) // "1234.57" : une chaîne\nnew Intl.NumberFormat("fr-FR").format(1250000) // "1 250 000"',
        ),
        qcm(
          'Que vaut parseInt("42px", 10) ?',
          ['NaN', '"42"', '42', '42px'],
          2,
          'parseInt lit les chiffres du début et s’arrête au premier caractère invalide. Number("42px"), lui, vaudrait NaN.',
        ),
        qcm(
          'Que vaut Number("") ?',
          ['NaN', 'undefined', '0', 'null'],
          2,
          'Une chaîne vide (ou faite d’espaces) devient 0. C’est un piège classique : un champ vide passe pour un montant de 0 au lieu d’être refusé.',
        ),
        fill(
          'Détecte de façon fiable un montant invalide.',
          'const montant = Number(saisie)\nif (Number.___(montant)) {\n  afficherErreur("Montant invalide")\n}',
          ['isNaN', 'isNull', 'isInvalid', 'notNumber'],
          'isNaN',
          'Number.isNaN ne fait aucune conversion : il renvoie true seulement pour la valeur NaN. montant === NaN serait toujours faux.',
        ),
        qcm(
          'Que vaut typeof (19.987).toFixed(2) ?',
          ['"number"', '"string"', '"float"', '"object"'],
          1,
          'toFixed renvoie une chaîne ("19.99"), prévue pour l’affichage. Reconvertis avec Number avant de refaire des calculs.',
        ),
        vf(
          'NaN === NaN vaut true.',
          false,
          'NaN est la seule valeur différente d’elle-même. Utilise Number.isNaN(x) ou Object.is(x, NaN).',
        ),
        match('Associe chaque expression à sa valeur.', [
          ['10 % 3', '1'],
          ['2 ** 3', '8'],
          ['Math.round(2.5)', '3'],
          ['Math.floor(-7.8)', '-8'],
          ['Math.trunc(-7.8)', '-7'],
        ]),
      ]),
    ],
  ),

  unit(
    'comparaisons',
    'Coercition et comparaisons',
    'Prévoir le résultat de toute comparaison, savoir ce qui est « truthy » ou « falsy » et choisir entre ==, ===, || et ??.',
    [
      lesson('truthy-falsy', 'Vrai, faux et opérateurs logiques', [
        tip(
          'Truthy et falsy',
          'Un if, un while ou l’opérateur ! acceptent n’importe quelle valeur : JavaScript la convertit en booléen. Il n’existe que huit valeurs « falsy » (converties en false) :\n\n• false\n• 0, -0 et 0n\n• "" (chaîne vide)\n• null et undefined\n• NaN\n\nTout le reste est « truthy », y compris des valeurs qui surprennent : "0", "false", " " (une espace), [] (tableau vide) et {} (objet vide).\n\nPour obtenir le booléen explicitement : Boolean(x) ou !!x. Piège fréquent : if (panier.length) teste bien « non vide », mais if (panier) est toujours vrai pour un tableau, même vide.',
          'if ("0") console.log("vrai !")   // s’affiche\nif ([]) console.log("vrai aussi") // s’affiche\n\nconst panier = []\nif (panier.length) {\n  // ne s’exécute pas : 0 est falsy\n}\n\n!!"false" // true',
        ),
        qcm(
          'Laquelle de ces valeurs est falsy ?',
          ['"0"', '[]', 'NaN', '"false"'],
          2,
          'NaN fait partie des huit valeurs falsy. "0" et "false" sont des chaînes non vides, [] est un objet : tous truthy.',
        ),
        vf(
          'if ([]) { … } n’exécute pas le bloc, car le tableau est vide.',
          false,
          'Tout objet est truthy, même vide. Pour tester qu’un tableau contient quelque chose : if (tab.length > 0).',
        ),
        match('Truthy ou falsy ? Associe chaque valeur.', [
          ['0n', 'falsy (BigInt zéro)'],
          ['" "', 'truthy (chaîne non vide)'],
          ['{}', 'truthy (objet)'],
          ['null', 'falsy (absence)'],
        ]),
        tip(
          '||, && et ?? renvoient une des valeurs',
          'En JavaScript, || et && ne renvoient pas forcément un booléen : ils renvoient l’une des deux valeurs, et s’arrêtent dès que le résultat est connu (court-circuit).\n\n• a || b renvoie a si a est truthy, sinon b. Pratique pour une valeur par défaut… mais 0 et "" sont alors remplacés, ce qui est souvent un bug (un stock de 0 devient la valeur par défaut).\n• a && b renvoie a si a est falsy, sinon b. On l’utilise pour « exécuter seulement si ».\n• a ?? b (coalescence des nuls) renvoie b seulement si a vaut null ou undefined. C’est le bon choix pour une valeur par défaut quand 0, "" ou false sont des valeurs légitimes.\n\nVersions d’affectation : x ||= v, x &&= v et x ??= v n’affectent que si la condition est remplie.',
          'const stock = 0\nstock || 10 // 10  : 0 est remplacé (bug !)\nstock ?? 10 // 0   : 0 est gardé\n\nnull || "invité"   // "invité"\n"" ?? "invité"     // ""\n"a" && "b"         // "b"\n0 && fairePayer()  // 0, fairePayer n’est pas appelée',
        ),
        qcm(
          'Un produit a 0 article en stock. Quelle expression affiche 0 et non la valeur par défaut 10 ?',
          [
            'produit.stock || 10',
            'produit.stock ?? 10',
            'produit.stock && 10',
            '!produit.stock || 10',
          ],
          1,
          '?? ne remplace que null et undefined. || remplacerait aussi 0, considéré comme falsy.',
        ),
        qcm(
          'Que vaut "" && "Dakar" ?',
          ['""', '"Dakar"', 'false', 'true'],
          0,
          '&& renvoie la première valeur si elle est falsy, sans même regarder la seconde : on obtient la chaîne vide, pas false.',
        ),
        qcm(
          'Qu’affiche ce code ?',
          ['null', 'undefined', '"Anonyme"', 'false'],
          2,
          'null || undefined vaut undefined (deux falsy : on garde la dernière), puis undefined ?? "Anonyme" donne "Anonyme".',
          'const pseudo = null || undefined\nconsole.log(pseudo ?? "Anonyme")',
        ),
        fill(
          'Donne une langue par défaut seulement si elle n’est pas définie.',
          'reglages.langue ___ "fr"',
          ['??=', '||', '&&=', '==='],
          '??=',
          'x ??= v affecte v seulement si x vaut null ou undefined. Une langue vide "" choisie volontairement serait gardée.',
        ),
        vf(
          '0 && envoyerSms() appelle envoyerSms.',
          false,
          'Court-circuit : 0 est falsy, donc && s’arrête et renvoie 0 sans évaluer la partie droite.',
        ),
      ]),

      lesson('coercition', 'La coercition des types', [
        tip(
          'Quand JavaScript convertit tout seul',
          'La coercition est la conversion implicite d’une valeur dans un autre type. Elle suit des règles précises qu’il faut connaître pour lire du code.\n\nL’opérateur + est le plus piégeux, car il sert à deux choses : si l’un des deux opérandes est une chaîne (après conversion des objets en primitifs), il concatène ; sinon il additionne. Les opérateurs -, *, / et % ne font que des calculs : ils convertissent toujours en nombre.\n\n+ s’évalue de gauche à droite : 1 + 2 + "3" donne "33" (3 puis "3"), alors que "1" + 2 + 3 donne "123".\n\nLe + unaire (+x) convertit en nombre, comme Number(x).',
          '"5" + 3     // "53"  : concaténation\n"5" - 3     // 2     : calcul\n"3" * "4"   // 12\n1 + 2 + "3" // "33"\n"1" + 2 + 3 // "123"\n+"42"       // 42\n+"3px"      // NaN',
        ),
        qcm(
          'Que vaut 1 + 2 + "3" ?',
          ['"123"', '6', '"33"', '"15"'],
          2,
          'De gauche à droite : 1 + 2 donne 3 (deux nombres), puis 3 + "3" concatène en "33".',
        ),
        qcm(
          'Que vaut "10" - "4" ?',
          ['"6"', '6', '"104"', 'NaN'],
          1,
          'La soustraction n’existe que pour les nombres : les deux chaînes sont converties, le résultat est le nombre 6.',
        ),
        tip(
          'Ce que deviennent les valeurs spéciales',
          'Pour prévoir un calcul, il faut savoir en quoi chaque valeur se convertit.\n\nEn nombre : true → 1, false → 0, null → 0, undefined → NaN, "" → 0, [] → 0, [5] → 5, {} → NaN.\n\nEn chaîne : null → "null", undefined → "undefined", [1, 2] → "1,2", [] → "", {} → "[object Object]".\n\nD’où quelques résultats célèbres : null + 1 vaut 1, undefined + 1 vaut NaN, [] + [] vaut "" et [] + {} vaut "[object Object]".\n\nBonne pratique : ne compte pas sur la coercition dans ton code. Convertis explicitement avec Number(), String() ou Boolean(), pour que l’intention soit claire et que TypeScript ou un relecteur puisse vérifier.',
          'null + 1        // 1\nundefined + 1   // NaN\ntrue + true     // 2\n[] + []         // ""\n[1, 2] + ""     // "1,2"\nString(null)    // "null"\nBoolean("false") // true',
        ),
        qcm(
          'Que vaut undefined + 1 ?',
          ['1', '"undefined1"', 'NaN', 'undefined'],
          2,
          'undefined converti en nombre donne NaN, et NaN + 1 reste NaN. À l’inverse, null + 1 vaut 1 car null devient 0.',
        ),
        qcm(
          'Que vaut true + true + "1" ?',
          ['"21"', '3', '"truetrue1"', '"111"'],
          0,
          'true + true donne 2 (chaque true vaut 1), puis 2 + "1" concatène en "21".',
        ),
        vf(
          '[] + [] vaut "" (une chaîne vide).',
          true,
          'Chaque tableau vide se convertit en chaîne vide, et "" + "" donne "". C’est la coercition des objets en primitifs.',
        ),
        match('Associe chaque expression à son résultat.', [
          ['"5" * 2', '10'],
          ['"5" + 2', '"52"'],
          ['null + 5', '5'],
          ['+"abc"', 'NaN'],
        ]),
        fill(
          'Convertis explicitement les deux saisies avant de les additionner.',
          'const total = ___(prixSaisi) + Number(fraisSaisis)',
          ['Number', 'String', 'parse', 'toNumber'],
          'Number',
          'Sans conversion, "2500" + "500" donnerait "2500500". Convertir explicitement rend l’addition sûre et lisible.',
        ),
        qcm(
          'Qu’affiche ce code, avec deux champs de formulaire remplis par 2500 et 500 ?',
          ['3000', '"2500500"', 'NaN', '2500'],
          1,
          'input.value est toujours une chaîne : + concatène. C’est le bug le plus fréquent des formulaires de calcul.',
          'const total = prix.value + frais.value\nconsole.log(total)',
        ),
      ]),

      lesson('egalite', '== , === et Object.is', [
        tip(
          'Toujours === (sauf une exception)',
          '=== (égalité stricte) compare sans aucune conversion : si les types diffèrent, le résultat est false. == (égalité faible) convertit d’abord selon un algorithme compliqué : "1" == 1 est vrai, "" == 0 est vrai, "0" == false est vrai, et même [] == false est vrai.\n\nRègle de travail : utilise === et !== partout. Les linters (ESLint, règle eqeqeq) le vérifient pour toi.\n\nUne seule exception acceptée par beaucoup d’équipes : x == null, qui est vrai exactement quand x vaut null ou undefined, et pour rien d’autre (null == 0 est faux). C’est un raccourci pour x === null || x === undefined.',
          '"1" == 1           // true  (conversion)\n"1" === 1          // false\n"" == 0            // true\n"0" == false       // true\nnull == undefined  // true\nnull === undefined // false\nnull == 0          // false',
        ),
        qcm(
          'Que vaut "0" == false ?',
          ['false', 'true', 'Une erreur', 'undefined'],
          1,
          'Avec ==, le booléen est converti en nombre (0), puis "0" aussi (0) : 0 == 0. Avec ===, ce serait false.',
        ),
        qcm(
          'Que vaut null == 0 ?',
          ['true', 'Une erreur', 'false', 'NaN'],
          2,
          'Cas particulier de == : null n’est égal qu’à undefined (et à lui-même). Pourtant null >= 0 vaut true, car les comparaisons < > <= >= convertissent null en 0.',
        ),
        vf(
          'valeur == null est vrai si valeur vaut undefined.',
          true,
          'null == undefined est vrai par définition. x == null teste donc les deux à la fois, et rien d’autre.',
        ),
        tip(
          'Objets, NaN et Object.is',
          'Deux objets ne sont égaux (== ou ===) que s’ils sont le même objet en mémoire. Deux tableaux au contenu identique sont différents : [1] === [1] vaut false. Pour comparer des contenus, compare les éléments un par un ou une représentation (JSON.stringify fonctionne pour des données simples dont l’ordre des clés est le même).\n\nDeux cas limites de === :\n• NaN === NaN vaut false ;\n• 0 === -0 vaut true.\n\nObject.is(a, b) corrige ces deux cas : Object.is(NaN, NaN) vaut true et Object.is(0, -0) vaut false. C’est l’égalité utilisée par React pour décider si un état a changé.\n\nLes comparaisons < et > entre une chaîne et un nombre convertissent la chaîne en nombre : "10" < 9 vaut false. Entre deux chaînes, c’est l’ordre alphabétique : "10" < "9" vaut true.',
          '[1, 2] === [1, 2]       // false : deux tableaux\nconst a = [1, 2]\nconst b = a\na === b                 // true : même tableau\n\nNaN === NaN             // false\nObject.is(NaN, NaN)     // true\nObject.is(0, -0)        // false',
        ),
        qcm(
          'Qu’affiche ce code ?',
          ['true', 'false', 'Une erreur', 'undefined'],
          1,
          'Deux littéraux {} créent deux objets distincts : === compare les références, pas le contenu.',
          'const a = { ville: "Abidjan" }\nconst b = { ville: "Abidjan" }\nconsole.log(a === b)',
        ),
        qcm(
          'Quel test est vrai ?',
          ['NaN === NaN', 'Object.is(0, -0)', '[] === []', 'Object.is(NaN, NaN)'],
          3,
          'Object.is traite NaN comme égal à lui-même. Les trois autres valent false.',
        ),
        vf(
          '"10" < "9" et "10" < 9 valent tous les deux true.',
          false,
          'Entre deux chaînes, "10" < "9" est vrai (ordre des caractères). Mais "10" < 9 convertit la chaîne en nombre : 10 < 9 est faux.',
        ),
        match('Associe chaque comparaison à son résultat.', [
          ['"" == 0', 'true'],
          ['"" === 0', 'false'],
          ['null >= 0', 'true (null devient 0)'],
          ['undefined == 0', 'false (undefined n’égale que null)'],
        ]),
        fill(
          'Compare le code saisi au code attendu sans aucune conversion.',
          'if (codeSaisi ___ codeAttendu) {\n  valider()\n}',
          ['===', '==', '=', '=>'],
          '===',
          '=== compare valeur et type. = est une affectation (bug classique dans un if), => introduit une fonction fléchée.',
        ),
      ]),

      lesson('recap-comparaisons', 'Récap et pratique', [
        tip(
          'Ce qu’il faut retenir',
          'Les comparaisons sont le terrain favori des questions d’examen. Retiens :\n\n• Huit valeurs falsy : false, 0, -0, 0n, "", null, undefined, NaN. Tout le reste est truthy, même "0", [] et {}.\n• || et && renvoient une des deux valeurs et court-circuitent. ?? ne remplace que null et undefined : c’est le bon choix pour une valeur par défaut numérique.\n• + concatène dès qu’une chaîne est en jeu ; -, *, / convertissent en nombre. L’évaluation se fait de gauche à droite.\n• === partout ; x == null est la seule exception utile.\n• Les objets se comparent par référence ; NaN n’est égal à rien ; Object.is règle NaN et -0.',
        ),
        qcm(
          'Qu’affiche ce code ?',
          ['0', '20', 'undefined', 'null'],
          0,
          'remise vaut 0 : ?? ne remplace que null et undefined, donc 0 est gardé. Avec ||, on aurait obtenu 20.',
          'const commande = { remise: 0 }\nconsole.log(commande.remise ?? 20)',
        ),
        qcm(
          'Que vaut [] == ![] ?',
          ['false', 'true', 'Une erreur', 'undefined'],
          1,
          '![] vaut false (un tableau est truthy). Puis [] == false : false devient 0, [] devient "" puis 0. 0 == 0 est vrai. Exemple parfait de pourquoi on évite ==.',
        ),
        vf(
          'Boolean("false") vaut false.',
          false,
          'Toute chaîne non vide est truthy, quel que soit son texte. Pour lire un booléen venant d’une URL ou d’un fichier, compare : valeur === "true".',
        ),
        qcm(
          'Que vaut "b" + "a" + +"a" + "a" ?',
          ['"baaa"', '"baNaNa"', 'NaN', '"ba0a"'],
          1,
          '+"a" est un + unaire : il convertit "a" en nombre, ce qui donne NaN, ensuite concaténé en texte. Résultat : "baNaNa".',
        ),
        order(
          'Écris une fonction qui renvoie le nom affiché d’un client, avec « Client » par défaut.',
          [
            'function nomAffiche(client) {',
            '  if (client == null) return "Client"',
            '  return client.pseudo ?? client.nom ?? "Client"',
            '}',
          ],
          'client == null couvre null et undefined ; ?? enchaîne les solutions de repli sans écarter une chaîne vide volontaire.',
        ),
        match('Associe chaque opérateur à sa règle.', [
          ['===', 'Compare sans conversion'],
          ['==', 'Convertit avant de comparer'],
          ['??', 'Remplace null et undefined'],
          ['||', 'Remplace toute valeur falsy'],
          ['Object.is', 'Égalité stricte qui gère NaN et -0'],
        ]),
        fill(
          'Complète pour que le calcul fonctionne avec des champs de formulaire.',
          'const quantite = +champQuantite.value\nconst total = quantite ___ 2500',
          ['*', '+ ""', '&&', '??'],
          '*',
          'Le + unaire a déjà converti la saisie en nombre ; * multiplie. Même sans conversion, * aurait forcé un calcul numérique.',
        ),
        qcm(
          'Que renvoie la fonction pour estActif("non") ?',
          ['false', 'true', '"non"', 'undefined'],
          1,
          '!!"non" vaut true : la chaîne est non vide. Ce genre de test sur des chaînes venant d’un formulaire est un bug courant.',
          'function estActif(valeur) {\n  return !!valeur\n}',
        ),
      ]),
    ],
  ),

  // ─── Thème 1 : portée, fonctions et fermetures ─────────────────────────────
  unit(
    'fonctions',
    'Fonctions, portée et fermetures',
    'Écrire des fonctions sous toutes leurs formes, prévoir la portée d’une variable, utiliser les fermetures et maîtriser this.',
    [
      lesson('declarer-fonctions', 'Déclarer et appeler des fonctions', [
        tip(
          'Trois façons d’écrire une fonction',
          'En JavaScript, une fonction est une valeur comme une autre : on peut la ranger dans une variable, la passer en argument ou la renvoyer.\n\n• Déclaration : function total(a, b) { … }. Elle est remontée (hoisting) : on peut l’appeler avant sa ligne.\n• Expression : const total = function (a, b) { … }. Elle n’existe qu’après sa ligne.\n• Fléchée : const total = (a, b) => a + b. Sans accolades, le résultat est renvoyé automatiquement ; avec accolades, il faut un return.\n\nPiège de la fléchée : () => { total: 1 } renvoie undefined, car les accolades sont lues comme un bloc. Pour renvoyer un objet, entoure-le de parenthèses : () => ({ total: 1 }).\n\nUne fonction sans return (ou avec return seul) renvoie undefined.',
          'function prixTTC(prix) {\n  return Math.round(prix * 1.18)\n}\n\nconst double = (n) => n * 2          // return implicite\nconst ligne = (nom, qte) => ({ nom, qte }) // objet : parenthèses\n\nprixTTC(1000) // 1180',
        ),
        tip(
          'Paramètres par défaut et paramètres du reste',
          'Un paramètre par défaut s’applique quand l’argument est absent ou vaut undefined, mais pas quand il vaut null : f(null) garde null.\n\nLe paramètre du reste (...args) regroupe tous les arguments restants dans un vrai tableau. Il doit être le dernier paramètre. Il remplace l’ancien objet arguments, qui n’est pas un tableau et n’existe pas dans les fonctions fléchées.\n\nJavaScript ne vérifie pas le nombre d’arguments : un argument manquant vaut undefined, un argument en trop est ignoré (sauf s’il est récupéré par ...reste). TypeScript ajoute cette vérification.',
          'function frais(montant, taux = 0.01) {\n  return montant * taux\n}\nfrais(10000)            // 100 : taux par défaut\nfrais(10000, undefined) // 100\nfrais(10000, null)      // 0 : null * 10000\n\nconst somme = (...nombres) => nombres.reduce((s, n) => s + n, 0)\nsomme(500, 1500, 2000)  // 4000',
        ),
        qcm(
          'Que renvoie creerLigne() ?',
          ['{ total: 0 }', 'undefined', 'null', 'Une SyntaxError'],
          1,
          'Les accolades sont lues comme le corps de la fonction, et total: devient une étiquette. Pas de return, donc undefined. Il faut () => ({ total: 0 }).',
          'const creerLigne = () => { total: 0 }',
        ),
        qcm(
          'Que vaut salut(null) ?',
          ['"Bonjour invité"', '"Bonjour null"', '"Bonjour undefined"', 'Une erreur'],
          1,
          'La valeur par défaut ne s’applique qu’à undefined. null est une valeur passée volontairement : elle est gardée et convertie en texte.',
          'const salut = (nom = "invité") => `Bonjour ${nom}`',
        ),
        fill(
          'Récupère tous les montants passés à la fonction dans un tableau.',
          'function total(___montants) {\n  return montants.reduce((s, m) => s + m, 0)\n}',
          ['...', '*', '&', '[]'],
          '...',
          '...montants est un paramètre du reste : un vrai tableau, sur lequel reduce fonctionne.',
        ),
        vf(
          'Appeler une fonction avec moins d’arguments que de paramètres lève une erreur.',
          false,
          'Les paramètres manquants valent simplement undefined. C’est pourquoi on valide les entrées, ou qu’on utilise TypeScript.',
        ),
        match('Associe chaque forme à sa particularité.', [
          ['function f() {}', 'Remontée : appelable avant sa ligne'],
          ['const f = function () {}', 'Utilisable seulement après sa ligne'],
          ['const f = () => x', 'Renvoie x sans écrire return'],
          ['(...args) => {}', 'Regroupe les arguments dans un tableau'],
        ]),
      ]),

      lesson('portee-hoisting', 'Portée et remontée', [
        tip(
          'Où une variable est-elle visible ?',
          'La portée d’une variable est la zone du code où son nom existe. let et const ont une portée de bloc (entre { et }) ; var a une portée de fonction. Une fonction voit ses propres variables et celles des blocs qui l’entourent, jusqu’au niveau global : c’est la portée lexicale, fixée par l’endroit où le code est écrit, pas par l’endroit où il est appelé.\n\nSi un nom est redéclaré dans un bloc intérieur, il masque celui de l’extérieur (shadowing) le temps du bloc.\n\nLa remontée (hoisting) : avant d’exécuter une portée, le moteur enregistre ses déclarations.\n• Une déclaration function est remontée entière : appelable avant sa ligne.\n• Une var est remontée mais vaut undefined jusqu’à son affectation.\n• let, const et class sont remontés mais inaccessibles avant leur ligne : c’est la zone morte temporelle (TDZ), toute lecture lève une ReferenceError.',
          'console.log(a) // undefined (var remontée)\nvar a = 1\n\nconsole.log(b) // ReferenceError : zone morte\nlet b = 2\n\nsaluer()       // "Salut" : déclaration remontée\nfunction saluer() { console.log("Salut") }',
        ),
        qcm(
          'Qu’affiche ce code ?',
          ['"Dakar"', '"Thiès"', 'undefined', 'Une ReferenceError'],
          0,
          'Le let ville du bloc masque l’extérieur seulement à l’intérieur du bloc. Après l’accolade fermante, on retrouve "Dakar".',
          'let ville = "Dakar"\nif (true) {\n  let ville = "Thiès"\n}\nconsole.log(ville)',
        ),
        qcm(
          'Que se passe-t-il ?',
          [
            'Affiche 1',
            'Une ReferenceError',
            'Une TypeError : h is not a function',
            'Affiche undefined',
          ],
          2,
          'var h est remontée et vaut undefined au moment de l’appel. Appeler undefined lève une TypeError. Une déclaration function, elle, aurait fonctionné.',
          'h()\nvar h = function () {\n  console.log(1)\n}',
        ),
        vf(
          'Lire une variable let avant sa ligne de déclaration renvoie undefined.',
          false,
          'C’est la zone morte temporelle : « ReferenceError: Cannot access ’x’ before initialization ». Seule var renvoie undefined.',
        ),
        qcm(
          'La portée lexicale signifie qu’une fonction voit les variables…',
          [
            'de l’endroit où elle est appelée',
            'de l’endroit où elle est écrite',
            'globales seulement',
            'de son propre bloc seulement',
          ],
          1,
          'La portée est déterminée à l’écriture : une fonction emporte l’accès aux variables qui l’entourent dans le texte du programme, où qu’on l’appelle ensuite.',
        ),
        fill(
          'Choisis le mot-clé qui rend i invisible après la boucle.',
          'for (___ i = 0; i < 3; i++) {\n  console.log(i)\n}\n// ici, i ne doit pas exister',
          ['let', 'var', 'global', 'function'],
          'let',
          'let limite i au bloc de la boucle. Avec var, i serait visible après la boucle et vaudrait 3.',
        ),
      ]),

      lesson('fermetures', 'Les fermetures', [
        tip(
          'Une fonction qui se souvient',
          'Une fermeture (closure) est une fonction qui garde l’accès aux variables de la portée où elle a été créée, même après que cette portée a fini de s’exécuter.\n\nChaque appel de la fonction englobante crée un nouvel environnement : deux compteurs créés séparément ont chacun leur propre variable. La fermeture capture la variable elle-même, pas une copie de sa valeur : si la variable change, la fonction voit la nouvelle valeur.\n\nUsages courants :\n• état privé, inaccessible de l’extérieur (seules les fonctions renvoyées peuvent le lire) ;\n• fabriques de fonctions configurées (creerTaxe(0.18)) ;\n• callbacks qui se souviennent d’un contexte (gestionnaire de clic, minuteur).',
          'function creerCaisse() {\n  let solde = 0 // privé\n  return {\n    encaisser: (m) => (solde += m),\n    lireSolde: () => solde,\n  }\n}\n\nconst caisse = creerCaisse()\ncaisse.encaisser(5000)\ncaisse.encaisser(2000)\ncaisse.lireSolde() // 7000\ncaisse.solde       // undefined : inaccessible',
        ),
        tip(
          'Le piège des boucles avec var',
          'Un classique d’entretien : dans une boucle for avec var, toutes les fonctions créées partagent la même variable i, qui vaut la valeur finale quand elles s’exécutent. Avec let, chaque tour de boucle crée une nouvelle liaison de i : chaque fonction garde la sienne.\n\nC’est exactement le comportement des fermetures : elles capturent une variable, pas sa valeur du moment.',
          'for (var i = 0; i < 3; i++) {\n  setTimeout(() => console.log(i), 0)\n} // 3, 3, 3\n\nfor (let j = 0; j < 3; j++) {\n  setTimeout(() => console.log(j), 0)\n} // 0, 1, 2',
        ),
        qcm(
          'Qu’affiche ce code ?',
          ['1 puis 1', '1 puis 2', '2 puis 2', 'undefined puis undefined'],
          1,
          'c garde accès à la même variable n entre deux appels : la valeur est conservée et augmente.',
          'function compteur() {\n  let n = 0\n  return () => ++n\n}\nconst c = compteur()\nconsole.log(c())\nconsole.log(c())',
        ),
        qcm(
          'Qu’affiche ce code ?',
          ['1', '2', '3', '0'],
          0,
          'Chaque appel à compteur() crée un nouvel environnement avec son propre n. b n’a jamais été appelé avant : il affiche 1.',
          'function compteur() {\n  let n = 0\n  return () => ++n\n}\nconst a = compteur()\nconst b = compteur()\na()\na()\nconsole.log(b())',
        ),
        qcm(
          'Qu’affiche la boucle avec var ?',
          ['0, 1, 2', '3, 3, 3', '2, 2, 2', 'undefined ×3'],
          1,
          'Une seule variable i partagée ; les callbacks s’exécutent après la boucle, quand i vaut 3. Remplace var par let pour obtenir 0, 1, 2.',
          'for (var i = 0; i < 3; i++) {\n  setTimeout(() => console.log(i), 0)\n}',
        ),
        fill(
          'Complète la fabrique de calcul de taxe.',
          'function creerTaxe(taux) {\n  return (montant) => montant * ___\n}\nconst tva = creerTaxe(0.18)\ntva(10000) // 1800',
          ['taux', 'montant', 'this.taux', '0.18'],
          'taux',
          'La fonction renvoyée capture taux : chaque appel à creerTaxe produit une fonction configurée différemment.',
        ),
        vf(
          'Une fermeture capture la valeur d’une variable au moment de sa création.',
          false,
          'Elle capture la variable elle-même. Si la variable change ensuite, la fonction voit la nouvelle valeur.',
        ),
      ]),

      lesson('this', 'this, call, apply et bind', [
        tip(
          'this dépend de l’appel',
          'Dans une fonction classique, this n’est pas fixé à l’écriture : il est déterminé par la façon dont la fonction est appelée.\n\n• objet.methode() : this vaut objet.\n• Fonction appelée seule, f() : this vaut undefined en mode strict (modules, classes), l’objet global sinon.\n• new F() : this est le nouvel objet.\n• f.call(obj, a, b), f.apply(obj, [a, b]) : this vaut obj, appel immédiat. f.bind(obj) renvoie une nouvelle fonction dont this est fixé définitivement.\n\nLes fonctions fléchées n’ont pas leur propre this : elles prennent celui du code qui les entoure. Parfait pour un callback dans une méthode, mauvais choix pour une méthode d’objet.\n\nPiège classique : détacher une méthode (const f = obj.methode, ou la passer à setTimeout) lui fait perdre son this.',
          'const boutique = {\n  nom: "Chez Awa",\n  presenter() {\n    return `Bienvenue ${this.nom}`\n  },\n}\nboutique.presenter() // "Bienvenue Chez Awa"\n\nconst f = boutique.presenter\nf() // TypeError en mode strict : this vaut undefined\n\nconst g = boutique.presenter.bind(boutique)\ng() // "Bienvenue Chez Awa"',
        ),
        qcm(
          'Dans un module ES, que se passe-t-il à la dernière ligne ?',
          ['Affiche "Awa"', 'Affiche undefined', 'Une TypeError', 'Affiche ""'],
          2,
          'La méthode est détachée de son objet : appelée seule en mode strict, this vaut undefined, et lire undefined.nom lève une TypeError.',
          'const user = {\n  nom: "Awa",\n  dire() {\n    return this.nom\n  },\n}\nconst dire = user.dire\nconsole.log(dire())',
        ),
        qcm(
          'Que vaut saluer.call({ nom: "Kofi" }, "Bonsoir") ?',
          ['"Bonsoir Kofi"', '"Bonsoir undefined"', 'Une fonction', 'Une TypeError'],
          0,
          'call appelle immédiatement la fonction avec this fixé au premier argument ; les suivants sont les arguments normaux.',
          'function saluer(mot) {\n  return `${mot} ${this.nom}`\n}',
        ),
        vf(
          'Une fonction fléchée utilisée comme méthode d’objet voit l’objet dans this.',
          false,
          'Une fléchée reprend le this du code englobant (souvent undefined ou l’objet global), pas l’objet. Pour une méthode, utilise la syntaxe methode() { … }.',
        ),
        match('Associe chaque outil à son effet.', [
          ['call', 'Appelle tout de suite, arguments un par un'],
          ['apply', 'Appelle tout de suite, arguments en tableau'],
          ['bind', 'Renvoie une nouvelle fonction au this fixé'],
          ['Fonction fléchée', 'Reprend le this du code englobant'],
        ]),
        fill(
          'Passe la méthode à setTimeout sans perdre son this.',
          'setTimeout(minuteur.afficher.___(minuteur), 1000)',
          ['bind', 'call', 'apply', 'this'],
          'bind',
          'bind renvoie une fonction prête à être appelée plus tard. call ou apply l’exécuteraient immédiatement et passeraient son résultat à setTimeout.',
        ),
        qcm(
          'Que vaut this dans le callback fléché, ici ?',
          ['L’objet panier', 'undefined', 'Le tableau articles', 'L’objet global'],
          0,
          'La fléchée n’a pas de this propre : elle reprend celui de total(), appelée comme panier.total(), donc panier. C’est l’usage idéal des fléchées.',
          'const panier = {\n  remise: 500,\n  articles: [2000, 3000],\n  total() {\n    return this.articles.map((p) => p - this.remise)\n  },\n}',
        ),
      ]),
    ],
  ),

  // ─── Thème 2 : tableaux et objets ──────────────────────────────────────────
  unit(
    'tableaux-objets',
    'Tableaux et objets',
    'Transformer des listes avec map, filter et reduce, manipuler objets, décomposition, classes, Map et Set.',
    [
      lesson('tableaux-methodes', 'Méthodes de tableaux', [
        tip(
          'Transformer sans boucle',
          'Les méthodes de tableau prennent une fonction (callback) appelée avec (élément, index, tableau).\n\n• map(f) : nouveau tableau de même longueur, chaque élément transformé.\n• filter(f) : nouveau tableau avec les éléments pour lesquels f renvoie truthy.\n• reduce(f, initial) : réduit le tableau à une valeur (total, objet de regroupement…). Donne toujours la valeur initiale : sur un tableau vide sans elle, reduce lève une TypeError.\n• find(f) renvoie le premier élément trouvé ou undefined ; findIndex renvoie -1 si rien ; some et every renvoient un booléen (every sur un tableau vide vaut true).\n• forEach exécute f mais renvoie undefined : on ne l’enchaîne pas.\n\nmap, filter, reduce, slice et concat ne modifient pas le tableau d’origine. push, pop, shift, unshift, splice, sort et reverse le modifient.',
          'const panier = [\n  { nom: "Riz 5 kg", prix: 4500, qte: 2 },\n  { nom: "Huile 1 L", prix: 1500, qte: 1 },\n  { nom: "Sucre", prix: 800, qte: 0 },\n]\n\nconst total = panier\n  .filter((l) => l.qte > 0)\n  .map((l) => l.prix * l.qte)\n  .reduce((s, x) => s + x, 0) // 10500',
        ),
        tip(
          'Le piège de sort',
          'Sans fonction de comparaison, sort convertit les éléments en chaînes et les trie dans l’ordre des caractères : [10, 9, 1, 100].sort() donne [1, 10, 100, 9]. Pour des nombres, passe (a, b) => a - b (croissant) ou b - a (décroissant). Pour du texte en français : (a, b) => a.localeCompare(b, "fr").\n\nsort modifie le tableau d’origine (et le renvoie). Depuis ES2023, toSorted renvoie une copie triée sans toucher à l’original, comme toReversed et toSpliced.\n\nAutre piège : ["1", "2", "3"].map(parseInt) donne [1, NaN, NaN], car map passe l’index comme deuxième argument, que parseInt prend pour la base.',
          '[10, 9, 1, 100].sort()                // [1, 10, 100, 9]\n[10, 9, 1, 100].sort((a, b) => a - b) // [1, 9, 10, 100]\n\nconst prix = [3000, 1000, 2000]\nconst tries = prix.toSorted((a, b) => a - b)\n// prix reste [3000, 1000, 2000]',
        ),
        qcm(
          'Que vaut [10, 9, 1, 100].sort() ?',
          ['[1, 9, 10, 100]', '[100, 10, 9, 1]', '[1, 10, 100, 9]', '[10, 9, 1, 100]'],
          2,
          'Sans comparateur, les nombres sont triés comme du texte : "100" vient avant "9". Écris sort((a, b) => a - b).',
        ),
        qcm(
          'Que vaut ce total ?',
          ['3', '6000', '[1000, 2000, 3000]', '"100020003000"'],
          1,
          'reduce part de 0 et ajoute chaque prix : 0 + 1000 + 2000 + 3000 = 6000.',
          '[1000, 2000, 3000].reduce((s, p) => s + p, 0)',
        ),
        qcm(
          'Que renvoie [5, 12, 8].find((n) => n > 20) ?',
          ['-1', 'undefined', 'null', '[]'],
          1,
          'find renvoie undefined quand aucun élément ne correspond. C’est findIndex qui renvoie -1, et filter qui renverrait [].',
        ),
        fill(
          'Garde seulement les commandes payées.',
          'const payees = commandes.___((c) => c.statut === "payee")',
          ['filter', 'map', 'find', 'forEach'],
          'filter',
          'filter garde tous les éléments qui passent le test. find s’arrêterait au premier, map renverrait un tableau de booléens.',
        ),
        vf(
          '[].reduce((s, x) => s + x) renvoie 0.',
          false,
          'Sans valeur initiale, reduce sur un tableau vide lève « TypeError: Reduce of empty array with no initial value ». Donne toujours le second argument.',
        ),
        match('Associe chaque méthode à ce qu’elle renvoie.', [
          ['map', 'Un tableau de même longueur'],
          ['some', 'Un booléen'],
          ['findIndex', 'Un index, ou -1'],
          ['forEach', 'undefined'],
        ]),
        qcm(
          'Que vaut ["1", "2", "3"].map(parseInt) ?',
          ['[1, 2, 3]', '[1, NaN, NaN]', '["1", "2", "3"]', '[NaN, NaN, NaN]'],
          1,
          'map appelle parseInt("2", 1) puis parseInt("3", 2) : bases invalides pour ces chiffres. Écris map(Number) ou map((s) => parseInt(s, 10)).',
        ),
      ]),

      lesson('objets-decomposition', 'Objets, décomposition et copies', [
        tip(
          'Lire et parcourir un objet',
          'Un objet associe des clés (toujours des chaînes ou des symboles) à des valeurs. On lit avec obj.cle, ou obj[expression] quand la clé est dans une variable. Une clé absente donne undefined ; le chaînage optionnel obj.adresse?.ville évite l’erreur si adresse vaut null ou undefined.\n\nRaccourcis : { nom, prix } équivaut à { nom: nom, prix: prix } ; { [champ]: valeur } calcule le nom de la clé.\n\nObject.keys, Object.values et Object.entries renvoient des tableaux, qu’on parcourt avec for...of ou les méthodes de tableau. Object.hasOwn(obj, "cle") teste une propriété propre (l’opérateur in regarde aussi les propriétés héritées).',
          'const stock = { riz: 12, mil: 0 }\nconst produit = "riz"\nstock[produit]        // 12\nstock.manioc          // undefined\n\nfor (const [nom, qte] of Object.entries(stock)) {\n  console.log(`${nom} : ${qte}`)\n}\n\nconst client = { adresse: null }\nclient.adresse?.ville // undefined, pas d’erreur',
        ),
        tip(
          'Décomposition, spread et copies superficielles',
          'La décomposition extrait des valeurs : const { nom, prix = 0 } = produit ; const [premier, ...reste] = liste. On peut renommer ({ nom: titre }), donner une valeur par défaut (appliquée seulement pour undefined) et décomposer directement dans les paramètres d’une fonction.\n\nLe spread (...) étale : [...a, ...b] concatène, { ...obj, statut: "payee" } copie puis remplace. En cas de clé en double, la dernière gagne.\n\nAttention : ces copies sont superficielles. Les objets imbriqués restent partagés entre la copie et l’original. Pour une copie profonde, utilise structuredClone(obj), qui garde aussi les Date, Map et Set (contrairement à JSON.parse(JSON.stringify(obj))).',
          'const commande = { id: 7, client: { nom: "Ali" }, statut: "en attente" }\n\nconst { id, statut: etat } = commande // etat = "en attente"\nconst maj = { ...commande, statut: "payee" }\nmaj.client.nom = "Ali Diop"\ncommande.client.nom // "Ali Diop" : objet imbriqué partagé !\n\nconst profonde = structuredClone(commande)\n\nlet a = 1, b = 2\n;[a, b] = [b, a] // échange : a = 2, b = 1',
        ),
        qcm(
          'Que vaut fusion ?',
          ['{ a: 1, b: 2 }', '{ a: 1, b: 3 }', '{ b: 3 }', '{ a: 1, b: [2, 3] }'],
          1,
          'Le spread copie les propriétés dans l’ordre : la seconde valeur de b écrase la première.',
          'const fusion = { ...{ a: 1, b: 2 }, ...{ b: 3 } }',
        ),
        qcm(
          'Que valent a et b ?',
          ['a = null, b = 5', 'a = 5, b = 5', 'a = null, b = undefined', 'a = 5, b = undefined'],
          0,
          'La valeur par défaut ne s’applique qu’à undefined : a vaut null (présent), b est absent donc vaut 5.',
          'const { a = 5, b = 5 } = { a: null }',
        ),
        vf(
          'const copie = { ...original } crée une copie indépendante de tous les objets imbriqués.',
          false,
          'Le spread ne copie que le premier niveau. Les objets et tableaux imbriqués restent partagés : utilise structuredClone pour une copie profonde.',
        ),
        fill(
          'Récupère le premier produit et le reste de la liste.',
          'const [premier, ___reste] = ["riz", "mil", "huile"]',
          ['...', '..', '*', '&'],
          '...',
          'Dans une décomposition, ...reste récupère tous les éléments restants dans un nouveau tableau : ["mil", "huile"].',
        ),
        qcm(
          'Comment lire la ville sans erreur si adresse peut manquer ?',
          [
            'client.adresse.ville',
            'client.adresse?.ville',
            'client?.adresse.ville',
            'client.adresse!.ville',
          ],
          1,
          '?. s’arrête et renvoie undefined si ce qui est à sa gauche vaut null ou undefined. client?.adresse.ville planterait si adresse manque. ! n’existe qu’en TypeScript.',
        ),
        match('Associe chaque écriture à son effet.', [
          ['{ nom }', 'Raccourci pour { nom: nom }'],
          ['{ [cle]: 1 }', 'Nom de clé calculé'],
          ['const { nom: titre } = p', 'Lit nom et le renomme titre'],
          ['structuredClone(o)', 'Copie profonde'],
        ]),
      ]),

      lesson('classes-map-set', 'Classes, Map et Set', [
        tip(
          'Les classes',
          'Une classe est un modèle pour créer des objets avec new. Le constructor initialise l’objet ; les méthodes sont partagées par toutes les instances (via le prototype). extends crée une sous-classe, et super(…) doit être appelé dans son constructeur avant d’utiliser this.\n\nLes champs privés commencent par # : ils sont inaccessibles hors de la classe (erreur de syntaxe si on essaie). static définit une propriété ou méthode de la classe elle-même, pas des instances. get et set créent des propriétés calculées.\n\nUne classe s’exécute toujours en mode strict, n’est pas utilisable avant sa ligne (zone morte, comme let) et lève une TypeError si on l’appelle sans new.',
          'class Compte {\n  #solde = 0\n  static devise = "XOF"\n\n  constructor(titulaire) {\n    this.titulaire = titulaire\n  }\n  deposer(montant) {\n    if (montant <= 0) throw new RangeError("Montant invalide")\n    this.#solde += montant\n  }\n  get solde() {\n    return this.#solde\n  }\n}\n\nclass CompteMarchand extends Compte {\n  constructor(titulaire, boutique) {\n    super(titulaire)\n    this.boutique = boutique\n  }\n}',
        ),
        tip(
          'Map et Set',
          'Map est un dictionnaire dont les clés peuvent être de n’importe quel type (nombres, objets…) et gardent leur type : la clé 1 et la clé "1" sont différentes, alors que dans un objet ordinaire elles se confondent. Map garde l’ordre d’insertion et donne sa taille avec size. Méthodes : set, get, has, delete, clear ; on la parcourt avec for (const [cle, valeur] of map).\n\nSet est une collection de valeurs uniques : add, has, delete, size. L’astuce la plus courante : [...new Set(tableau)] supprime les doublons. Set considère NaN égal à NaN, mais deux objets au contenu identique restent deux valeurs distinctes.\n\nChoisis Map pour des ajouts et suppressions fréquents ou des clés non textuelles, un objet pour des données à structure fixe ou à convertir en JSON.',
          'const ventes = new Map()\nventes.set("riz", 3)\nventes.set("mil", 1)\nventes.get("riz") // 3\nventes.size       // 2\n\nconst villes = ["Dakar", "Lomé", "Dakar"]\nconst uniques = [...new Set(villes)] // ["Dakar", "Lomé"]',
        ),
        qcm(
          'Que vaut [...new Set([1, 1, "1", 2])].length ?',
          ['2', '3', '4', '1'],
          1,
          'Set garde les valeurs uniques au sens de l’égalité stricte : 1 et "1" sont différents. Il reste 1, "1" et 2.',
        ),
        qcm(
          'Que se passe-t-il ?',
          ['Un objet Compte est créé', 'Une TypeError', 'Renvoie undefined', 'Une SyntaxError'],
          1,
          'Une classe ne peut pas être appelée comme une fonction : « TypeError: Class constructor Compte cannot be invoked without ’new’ ».',
          'class Compte {}\nconst c = Compte()',
        ),
        vf(
          'Dans un objet ordinaire, les clés 1 et "1" désignent la même propriété, alors que dans une Map ce sont deux clés différentes.',
          true,
          'Les clés d’objet sont converties en chaînes ; Map garde le type exact de la clé.',
        ),
        fill(
          'Appelle le constructeur parent avant d’utiliser this.',
          'class Livreur extends Employe {\n  constructor(nom, zone) {\n    ___(nom)\n    this.zone = zone\n  }\n}',
          ['super', 'this', 'parent', 'extends'],
          'super',
          'Dans une sous-classe, this n’existe qu’après super(…). L’oublier lève une ReferenceError à la création de l’objet.',
        ),
        match('Associe chaque élément de classe à son rôle.', [
          ['#solde', 'Champ privé'],
          ['static devise', 'Propriété de la classe elle-même'],
          ['get solde()', 'Propriété calculée en lecture'],
          ['constructor', 'Initialise chaque nouvelle instance'],
        ]),
        qcm(
          'Quelle structure choisir pour compter les visites par identifiant numérique d’utilisateur, avec ajouts et suppressions fréquents ?',
          ['Un tableau', 'Un Set', 'Une Map', 'Une chaîne JSON'],
          2,
          'Map associe une clé (de n’importe quel type, sans conversion) à une valeur, avec des ajouts et suppressions efficaces. Un Set ne stocke pas de valeur associée.',
        ),
      ]),
    ],
  ),

  // ─── Thème 3 : asynchrone ───────────────────────────────────────────────────
  unit(
    'asynchrone',
    'Asynchrone : promesses et async/await',
    'Comprendre la boucle d’événements, écrire et enchaîner des promesses, utiliser async/await en série ou en parallèle et gérer les erreurs.',
    [
      lesson('boucle-evenements', 'La boucle d’événements', [
        tip(
          'Un seul fil, deux files d’attente',
          'JavaScript exécute ton code sur un seul fil : une seule chose à la fois, dans la pile d’appels. Les opérations longues (réseau, minuteurs, fichiers) sont confiées au navigateur ou à Node, qui préviennent quand c’est fini en plaçant un callback dans une file d’attente.\n\nLa boucle d’événements suit cet ordre :\n1. Exécuter tout le code synchrone en cours, jusqu’à vider la pile.\n2. Vider entièrement la file des microtâches : callbacks de promesses (then, catch, finally), suite d’une fonction après un await, queueMicrotask.\n3. Prendre une seule tâche (macrotâche) : callback de setTimeout, setInterval, événement, puis revenir à l’étape 2.\n\nConséquences : setTimeout(f, 0) passe toujours après le code synchrone et après les promesses déjà résolues, et son délai est un minimum, pas une garantie. Une boucle synchrone longue bloque tout : clics, affichage, minuteurs.',
          'console.log("A")\nsetTimeout(() => console.log("B"), 0)\nPromise.resolve().then(() => console.log("C"))\nconsole.log("D")\n// A, D, C, B',
        ),
        qcm(
          'Dans quel ordre s’affichent les lettres ?',
          ['1, 2, 3, 4', '1, 4, 3, 2', '1, 4, 2, 3', '1, 3, 4, 2'],
          1,
          'Code synchrone d’abord (1, 4), puis la microtâche de la promesse (3), puis la tâche du minuteur (2).',
          'console.log(1)\nsetTimeout(() => console.log(2), 0)\nPromise.resolve().then(() => console.log(3))\nconsole.log(4)',
        ),
        vf(
          'setTimeout(f, 0) exécute f immédiatement, avant la ligne suivante.',
          false,
          'f est placée dans la file des tâches : elle attend la fin du code synchrone et de toutes les microtâches en attente.',
        ),
        qcm(
          'Qu’affiche ce code ?',
          [
            '"avant", "dedans", "après"',
            '"dedans", "avant", "après"',
            '"avant", "après", "dedans"',
            '"dedans", "après", "avant"',
          ],
          0,
          'La fonction passée à new Promise (l’exécuteur) s’exécute immédiatement et de façon synchrone. Seuls les then sont différés.',
          'console.log("avant")\nnew Promise((resolve) => {\n  console.log("dedans")\n  resolve()\n})\nconsole.log("après")',
        ),
        match('Associe chaque élément à sa file.', [
          ['Callback de setTimeout', 'File des tâches'],
          ['Callback de .then()', 'Microtâche'],
          ['queueMicrotask(f)', 'Microtâche aussi, avant tout minuteur'],
          ['console.log hors callback', 'Pile d’appels, tout de suite'],
        ]),
        qcm(
          'Une boucle synchrone calcule pendant 3 secondes. Que se passe-t-il pour un setTimeout de 100 ms programmé juste avant ?',
          [
            'Il s’exécute après 100 ms, en interrompant la boucle',
            'Il s’exécute après la fin de la boucle, vers 3 s',
            'Il est annulé',
            'Il s’exécute dans un autre fil en parallèle',
          ],
          1,
          'Rien n’interrompt le code synchrone. Le callback attend que la pile se vide : son délai est un minimum. D’où l’intérêt de ne jamais bloquer le fil principal.',
        ),
      ]),

      lesson('promesses', 'Les promesses', [
        tip(
          'Une valeur à venir',
          'Une promesse représente le résultat futur d’une opération. Elle est d’abord en attente (pending), puis réglée une seule fois : tenue (fulfilled) avec une valeur, ou rejetée (rejected) avec une raison, normalement un objet Error. Une fois réglée, elle ne change plus.\n\n• then(f) s’exécute quand elle est tenue et renvoie une nouvelle promesse : ce que f renvoie devient la valeur suivante (si f renvoie une promesse, on attend son résultat). C’est ce qui permet d’enchaîner.\n• catch(f) attrape un rejet ou une exception levée plus haut dans la chaîne ; après un catch qui ne relance pas, la chaîne repart en succès.\n• finally(f) s’exécute dans tous les cas (cacher un indicateur de chargement) et laisse passer la valeur ou l’erreur.\n\nPromise.resolve(v) et Promise.reject(e) créent une promesse déjà réglée.',
          'function payer(montant) {\n  return new Promise((resolve, reject) => {\n    setTimeout(() => {\n      if (montant > 0) resolve({ ref: "TX-42", montant })\n      else reject(new Error("Montant invalide"))\n    }, 500)\n  })\n}\n\npayer(5000)\n  .then((tx) => tx.ref)\n  .then((ref) => console.log("Payé :", ref))\n  .catch((e) => console.error(e.message))\n  .finally(() => cacherChargement())',
        ),
        qcm(
          'Qu’affiche ce code ?',
          ['"boom" puis "fin"', '"ignoré" puis "fin"', '"boom" seulement', '"fin" seulement'],
          0,
          'L’exception dans le deuxième then rejette la chaîne : le then suivant est sauté, catch affiche "boom", puis la chaîne repart en succès et "fin" s’affiche.',
          'Promise.resolve(1)\n  .then((x) => x + 1)\n  .then(() => { throw new Error("boom") })\n  .then(() => console.log("ignoré"))\n  .catch((e) => console.log(e.message))\n  .then(() => console.log("fin"))',
        ),
        qcm(
          'Que reçoit le second then ?',
          ['La promesse elle-même', '1', '2', 'undefined'],
          2,
          'then renvoie une nouvelle promesse dont la valeur est ce que renvoie le callback : 1 + 1 = 2.',
          'Promise.resolve(1)\n  .then((x) => x + 1)\n  .then((v) => console.log(v))',
        ),
        vf(
          'Une promesse déjà tenue peut ensuite être rejetée.',
          false,
          'Une promesse se règle une seule fois. Les appels suivants à resolve ou reject sont ignorés.',
        ),
        fill(
          'Cache l’indicateur de chargement, que le paiement réussisse ou échoue.',
          'payer(5000)\n  .then(afficherRecu)\n  .catch(afficherErreur)\n  .___(cacherChargement)',
          ['finally', 'then', 'always', 'done'],
          'finally',
          'finally s’exécute dans tous les cas sans recevoir de valeur. always et done n’existent pas sur les promesses natives.',
        ),
        tip(
          'Combiner plusieurs promesses',
          'Quatre méthodes attendent plusieurs promesses lancées en même temps :\n\n• Promise.all : tableau des valeurs dans l’ordre, mais rejette dès le premier échec (les autres continuent, leur résultat est perdu).\n• Promise.allSettled : attend tout et renvoie pour chacune { status: "fulfilled", value } ou { status: "rejected", reason }. Ne rejette jamais.\n• Promise.race : se règle comme la première promesse réglée, succès ou échec. Utile pour un délai maximal.\n• Promise.any : la première tenue ; si toutes échouent, rejette avec une AggregateError.',
        ),
        match('Associe chaque combinateur à son comportement.', [
          ['Promise.all', 'Toutes les valeurs, échoue au premier rejet'],
          ['Promise.allSettled', 'Le bilan de chacune, ne rejette jamais'],
          ['Promise.race', 'La première réglée, succès ou échec'],
          ['Promise.any', 'La première tenue, AggregateError si aucune'],
        ]),
      ]),

      lesson('async-await', 'async/await', [
        tip(
          'Écrire de l’asynchrone comme du synchrone',
          'Une fonction async renvoie toujours une promesse : return v la tient avec v, une exception la rejette. À l’intérieur, await promesse suspend uniquement cette fonction jusqu’au règlement, puis donne la valeur ou lève l’erreur. Le reste du programme continue pendant ce temps.\n\nOn gère donc les erreurs avec un try/catch classique. Une promesse rejetée que personne n’attrape devient une « unhandled rejection » : avertissement dans le navigateur, arrêt du processus dans Node depuis la version 15.\n\nPiège n°1 : oublier await. On obtient alors une Promise au lieu de la valeur, et les erreurs passent à côté du try/catch.\n\nawait n’est permis que dans une fonction async, ou au niveau supérieur d’un module ES (top-level await).',
          'async function chargerCommandes() {\n  try {\n    const res = await fetch("/api/commandes")\n    if (!res.ok) throw new Error(`HTTP ${res.status}`)\n    return await res.json()\n  } catch (e) {\n    console.error("Chargement impossible :", e.message)\n    return []\n  }\n}',
        ),
        tip(
          'En série ou en parallèle',
          'Deux await à la suite attendent l’un après l’autre : bien si la seconde opération dépend de la première, du temps perdu sinon. Pour des opérations indépendantes, lance-les toutes puis attends-les ensemble avec Promise.all : le temps total est celui de la plus lente, pas la somme.\n\nDans une boucle, for...of avec await traite les éléments un par un. forEach, lui, n’attend pas les callbacks async : la ligne après forEach s’exécute avant la fin des traitements. Pour traiter une liste en parallèle : await Promise.all(liste.map(async (x) => …)).\n\nRappel sur fetch : la promesse n’est rejetée qu’en cas de problème réseau. Une réponse 404 ou 500 est tenue : vérifie toujours res.ok.',
          '// En série : ~200 ms si chaque appel prend 100 ms\nconst profil = await chargerProfil(id)\nconst solde = await chargerSolde(id)\n\n// En parallèle : ~100 ms\nconst [p, s] = await Promise.all([chargerProfil(id), chargerSolde(id)])',
        ),
        qcm(
          'Qu’affiche ce code ?',
          ['42', 'Promise { 42 }, une promesse', 'undefined', 'Une erreur'],
          1,
          'Une fonction async renvoie toujours une promesse. Sans await (ou then), on affiche la promesse elle-même et non 42.',
          'async function f() {\n  return 42\n}\nconsole.log(f())',
        ),
        vf(
          'fetch rejette sa promesse quand le serveur répond 404.',
          false,
          'fetch n’est rejeté qu’en cas d’échec réseau (coupure, DNS, CORS). Un 404 donne une réponse avec res.ok à false : à toi de lever l’erreur.',
        ),
        qcm(
          'Chaque appel prend environ 1 seconde. Combien de temps dure ce code ?',
          ['Environ 1 s', 'Environ 2 s', 'Environ 3 s', 'Instantané'],
          2,
          'Trois await successifs : chaque appel attend la fin du précédent. Avec Promise.all, il ne faudrait qu’environ 1 s.',
          'const a = await verifierStock("riz")\nconst b = await verifierStock("mil")\nconst c = await verifierStock("huile")',
        ),
        qcm(
          'Que vaut envoyes.length au moment du console.log ?',
          ['0', '2', '1', 'undefined'],
          0,
          'forEach n’attend pas les fonctions async : il les lance et rend la main aussitôt. Utilise for...of avec await, ou Promise.all avec map.',
          'const envoyes = []\nnumeros.forEach(async (n) => {\n  await envoyerSms(n)\n  envoyes.push(n)\n})\nconsole.log(envoyes.length) // numeros a 2 éléments',
        ),
        fill(
          'Lance les trois vérifications en même temps et attends-les toutes.',
          'const resultats = await Promise.___([\n  verifierStock("riz"),\n  verifierStock("mil"),\n  verifierStock("huile"),\n])',
          ['all', 'race', 'any', 'wait'],
          'all',
          'Promise.all renvoie les valeurs dans l’ordre du tableau. race ne garderait que la première réglée, any la première tenue.',
        ),
        order(
          'Remets dans l’ordre une fonction qui charge un produit et gère l’échec.',
          [
            'async function chargerProduit(id) {',
            '  try {',
            '    const res = await fetch(`/api/produits/${id}`)',
            '    if (!res.ok) throw new Error(`HTTP ${res.status}`)',
            '    return await res.json()',
            '  } catch (e) {',
            '    return null',
            '  }',
            '}',
          ],
          'Requête, vérification du statut HTTP, lecture du JSON, et un catch qui couvre aussi bien l’erreur réseau que le statut refusé.',
        ),
      ]),
    ],
  ),

  // ─── Thème 4 : modules et erreurs, puis révision générale ──────────────────
  unit(
    'modules-erreurs',
    'Modules, erreurs, JSON et révision',
    'Organiser le code en modules ES, lever et attraper des erreurs proprement, échanger du JSON, puis tout réviser avant l’examen.',
    [
      lesson('modules-es', 'Les modules ES', [
        tip(
          'import et export',
          'Un module est un fichier qui a sa propre portée : rien n’est global, on partage explicitement avec export et on récupère avec import.\n\n• Export nommé : export function calculerTVA() {} ou export const TAUX = 0.18. On importe avec les accolades et le même nom : import { calculerTVA } from "./taxes.js", ou en renommant : import { calculerTVA as tva }.\n• Export par défaut (un seul par fichier) : export default class Panier {}. On l’importe sans accolades, sous le nom de son choix : import Panier from "./panier.js".\n• import * as taxes from "./taxes.js" regroupe tous les exports nommés dans un objet.\n\nLes imports statiques sont analysés avant l’exécution : ils doivent être en haut niveau, avec un chemin écrit en dur. Pour charger un module à la demande, import("./module.js") renvoie une promesse.\n\nUn module est exécuté une seule fois, même s’il est importé partout, et il est toujours en mode strict.',
          '// taxes.js\nexport const TAUX_TVA = 0.18\nexport function ttc(ht) {\n  return Math.round(ht * (1 + TAUX_TVA))\n}\nexport default function formater(montant) {\n  return `${montant} FCFA`\n}\n\n// app.js\nimport formater, { ttc, TAUX_TVA as tva } from "./taxes.js"\nconsole.log(formater(ttc(10000))) // "11800 FCFA"',
        ),
        tip(
          'ESM et CommonJS',
          'Node connaît deux systèmes. CommonJS, historique : const x = require("./x") et module.exports = …, chargement synchrone. Les modules ES (ESM), standard du langage : import / export, utilisés par les navigateurs et les outils modernes.\n\nDans Node, un fichier est traité en ESM s’il porte l’extension .mjs, ou .js avec "type": "module" dans package.json. Dans le navigateur, il faut <script type="module">, chargé en différé.\n\nEn ESM, le chemin relatif doit inclure l’extension (./taxes.js), et __dirname n’existe pas (on utilise import.meta.url ou import.meta.dirname).',
        ),
        qcm(
          'Comment importer l’export par défaut et l’export nommé ttc de taxes.js ?',
          [
            'import { formater, ttc } from "./taxes.js"',
            'import formater, { ttc } from "./taxes.js"',
            'import default formater, ttc from "./taxes.js"',
            'const { formater, ttc } = require("./taxes.js")',
          ],
          1,
          'L’export par défaut s’importe sans accolades (nom libre), les exports nommés entre accolades. On peut combiner les deux dans un seul import.',
        ),
        vf(
          'Un fichier peut contenir plusieurs export default.',
          false,
          'Un seul export par défaut par module (sinon SyntaxError), mais autant d’exports nommés que l’on veut.',
        ),
        qcm(
          'Que renvoie import("./graphique.js") ?',
          [
            'Le module directement',
            'Une promesse du module',
            'undefined',
            'Une erreur : import est réservé au haut du fichier',
          ],
          1,
          'L’import dynamique renvoie une promesse : const { dessiner } = await import("./graphique.js"). Il sert à charger du code seulement quand on en a besoin.',
        ),
        fill(
          'Rends la fonction disponible pour les autres fichiers.',
          '___ function calculerFrais(montant) {\n  return Math.ceil(montant * 0.01)\n}',
          ['export', 'public', 'module', 'share'],
          'export',
          'export devant la déclaration crée un export nommé. On l’importe ensuite avec import { calculerFrais }.',
        ),
        match('Associe chaque syntaxe à son système.', [
          ['import x from "./x.js"', 'Module ES'],
          ['require("./x")', 'CommonJS'],
          ['module.exports = x', 'Export CommonJS'],
          ['"type": "module"', 'Active ESM dans package.json'],
        ]),
      ]),

      lesson('erreurs', 'Lever et attraper des erreurs', [
        tip(
          'throw, try, catch, finally',
          'throw interrompt immédiatement la fonction et remonte la pile d’appels jusqu’au premier try/catch qui l’attrape ; sans try/catch, le programme s’arrête (ou la promesse est rejetée). On peut lever n’importe quelle valeur, mais lève toujours un objet Error : il porte name, message et stack (la pile d’appels pour déboguer).\n\nfinally s’exécute dans tous les cas, même après un return dans le try : idéal pour libérer une ressource ou cacher un indicateur. Évite d’y écrire un return, qui écraserait celui du try.\n\nErreurs natives à connaître : TypeError (mauvais type, comme lire une propriété de undefined ou appeler ce qui n’est pas une fonction), ReferenceError (nom inconnu ou zone morte), SyntaxError (code ou JSON invalide), RangeError (valeur hors limites).\n\nBonne pratique : n’attrape que ce que tu sais traiter. Un catch vide qui avale l’erreur cache les bugs.',
          'function retirer(solde, montant) {\n  if (montant > solde) {\n    throw new RangeError("Solde insuffisant")\n  }\n  return solde - montant\n}\n\ntry {\n  retirer(1000, 5000)\n} catch (e) {\n  console.log(e.name, e.message) // RangeError Solde insuffisant\n} finally {\n  console.log("Opération terminée")\n}',
        ),
        tip(
          'Créer ses propres erreurs',
          'Une classe qui hérite d’Error permet de distinguer les cas avec instanceof et d’ajouter des informations. Pense à définir this.name pour un affichage clair.\n\nDepuis ES2022, l’option cause garde l’erreur d’origine quand on en relance une plus parlante : new Error("Paiement impossible", { cause: e }). Et si tu n’as pas besoin de la variable, catch { … } s’écrit sans parenthèses.',
          'class PaiementError extends Error {\n  constructor(message, code) {\n    super(message)\n    this.name = "PaiementError"\n    this.code = code\n  }\n}\n\ntry {\n  throw new PaiementError("Solde mobile money insuffisant", "SOLDE")\n} catch (e) {\n  if (e instanceof PaiementError) afficher(e.message)\n  else throw e // on relance ce qu’on ne sait pas traiter\n}',
        ),
        qcm(
          'Que renvoie f() ?',
          ['"try"', '"finally"', 'undefined', 'Une erreur'],
          1,
          'finally s’exécute après le return du try, et son propre return remplace la valeur renvoyée. D’où la règle : pas de return dans finally.',
          'function f() {\n  try {\n    return "try"\n  } finally {\n    return "finally"\n  }\n}',
        ),
        qcm(
          'Quelle erreur lève const client = null; client.nom ?',
          ['ReferenceError', 'SyntaxError', 'TypeError', 'RangeError'],
          2,
          '« Cannot read properties of null » est une TypeError : la variable existe, mais sa valeur n’a pas le bon type. ReferenceError concerne un nom inexistant.',
        ),
        vf(
          'Le bloc finally s’exécute même si le try contient un return.',
          true,
          'finally s’exécute toujours : succès, exception ou return. Il sert à nettoyer (fermer une connexion, cacher un chargement).',
        ),
        fill(
          'Garde l’erreur d’origine dans la nouvelle erreur.',
          'catch (e) {\n  throw new Error("Paiement impossible", { ___: e })\n}',
          ['cause', 'origin', 'parent', 'error'],
          'cause',
          'L’option cause (ES2022) attache l’erreur d’origine : on la retrouve dans erreur.cause pour diagnostiquer.',
        ),
        match('Associe chaque situation à l’erreur levée.', [
          ['Lire une variable jamais déclarée', 'ReferenceError'],
          ['Appeler undefined()', 'TypeError'],
          ['JSON.parse("{abc}")', 'SyntaxError'],
          ['new Array(-1)', 'RangeError'],
        ]),
      ]),

      lesson('json', 'JSON', [
        tip(
          'Échanger des données en JSON',
          'JSON est un format texte inspiré des objets JavaScript, mais plus strict : clés entre guillemets doubles obligatoires, chaînes entre guillemets doubles, pas de virgule finale, pas de commentaires. Il connaît seulement les chaînes, nombres, booléens, null, objets et tableaux.\n\n• JSON.stringify(valeur, null, 2) transforme en texte (le 2 indente pour la lecture). Les propriétés valant undefined, une fonction ou un symbole sont omises dans un objet et deviennent null dans un tableau ; NaN et Infinity deviennent null ; une Date devient sa chaîne ISO.\n• JSON.parse(texte) transforme le texte en valeur, et lève une SyntaxError si le texte est invalide : entoure-le d’un try/catch dès que le texte vient de l’extérieur.\n\nConséquence : JSON.parse(JSON.stringify(obj)) n’est pas une vraie copie (dates devenues chaînes, undefined perdus). Utilise structuredClone.',
          'const commande = {\n  id: 7,\n  total: 12500,\n  note: undefined,\n  date: new Date("2026-11-12"),\n}\nJSON.stringify(commande)\n// \'{"id":7,"total":12500,"date":"2026-11-12T00:00:00.000Z"}\'\n\nJSON.parse(\'{"n": 2}\').n // 2\nJSON.parse("{\'n\': 2}")   // SyntaxError : guillemets simples',
        ),
        qcm(
          'Que donne JSON.stringify({ a: undefined, b: 1 }) ?',
          ['\'{"a":undefined,"b":1}\'', '\'{"a":null,"b":1}\'', '\'{"b":1}\'', 'Une erreur'],
          2,
          'Dans un objet, une propriété undefined est simplement omise. Dans un tableau, elle deviendrait null.',
        ),
        vf(
          'JSON.parse accepte les clés entre guillemets simples.',
          false,
          'JSON exige des guillemets doubles pour les clés et les chaînes. "{\'a\':1}" lève une SyntaxError.',
        ),
        qcm(
          'Que vaut typeof copie.date ?',
          ['"object"', '"string"', '"number"', '"undefined"'],
          1,
          'stringify transforme la Date en chaîne ISO, et parse ne la reconvertit pas. structuredClone garderait une vraie Date.',
          'const copie = JSON.parse(JSON.stringify({ date: new Date() }))',
        ),
        fill(
          'Affiche l’objet en JSON indenté de 2 espaces.',
          'console.log(JSON.stringify(commande, null, ___))',
          ['2', '"2"', 'true', 'indent'],
          '2',
          'Le troisième argument est l’indentation (nombre d’espaces ou chaîne). Le deuxième, ici null, est un filtre facultatif (replacer).',
        ),
        order(
          'Remets dans l’ordre la lecture sûre d’un panier sauvegardé.',
          [
            'function lirePanier(texte) {',
            '  try {',
            '    return JSON.parse(texte)',
            '  } catch {',
            '    return []',
            '  }',
            '}',
          ],
          'JSON.parse peut lever une SyntaxError sur un texte corrompu : on l’attrape et on repart d’un panier vide. catch sans parenthèses est permis depuis ES2019.',
        ),
      ]),

      lesson('revision-finale', 'Révision générale', [
        tip(
          'Les pièges à revoir avant l’examen',
          'Cette dernière leçon mélange tous les thèmes de la certification.\n\n• Types : typeof null vaut "object", typeof [] vaut "object", typeof NaN vaut "number".\n• Comparaisons : === partout ; "5" + 3 vaut "53" mais "5" - 3 vaut 2 ; ?? garde 0 et "", || les remplace.\n• Fonctions : let/const en zone morte avant leur ligne, var remontée à undefined, fermetures qui capturent la variable, this perdu quand on détache une méthode.\n• Tableaux et objets : sort trie en texte sans comparateur, reduce a besoin d’une valeur initiale, le spread copie en surface.\n• Asynchrone : synchrone, puis microtâches (promesses), puis tâches (setTimeout) ; Promise.all pour le parallèle ; forEach n’attend pas.\n• Modules et erreurs : un seul export default, finally toujours exécuté, JSON.parse lève une SyntaxError.',
        ),
        qcm(
          'Qu’affiche ce code ?',
          ['"A", "B", "C", "D"', '"A", "D", "C", "B"', '"A", "C", "D", "B"', '"A", "D", "B", "C"'],
          1,
          'A et D sont synchrones. Ensuite, la suite de la fonction après await (C) est une microtâche, qui passe avant le minuteur (B).',
          'setTimeout(() => console.log("B"), 0)\nconsole.log("A")\n;(async () => {\n  await null\n  console.log("C")\n})()\nconsole.log("D")',
        ),
        qcm(
          'Que vaut total ?',
          ['13500', '9000', '"90004500"', 'NaN'],
          2,
          'quantite.value est une chaîne : "2" * 4500 donne bien 9000 (nombre), mais le second terme est la chaîne "4500" lue telle quelle, donc + concatène : "90004500".',
          'const quantite = { value: "2" }\nconst fraisLivraison = { value: "4500" }\nconst total = quantite.value * 4500 + fraisLivraison.value',
        ),
        qcm(
          'Que vaut notes après ce code ?',
          ['[2, 15, 9]', '[2, 9, 15]', '[15, 2, 9]', '[15, 9, 2]'],
          3,
          'Le comparateur b - a trie en ordre décroissant, et sort modifie le tableau d’origine (const n’y change rien).',
          'const notes = [15, 2, 9]\nnotes.sort((a, b) => b - a)',
        ),
        vf(
          'Après const { client, ...reste } = commande, modifier reste.lignes.push(x) modifie aussi commande.lignes.',
          true,
          'Le rest copie en surface : reste.lignes et commande.lignes désignent le même tableau.',
        ),
        qcm(
          'Une boutique de Dakar vérifie trois fournisseurs indépendants et veut un rapport même si l’un d’eux est hors ligne. Que choisir ?',
          ['Promise.all', 'Promise.race', 'Promise.allSettled', 'Trois await successifs'],
          2,
          'allSettled attend tout et renvoie le statut de chaque appel, sans rejeter si l’un échoue. all échouerait dès la première panne.',
        ),
        match('Associe chaque code à son résultat.', [
          ['typeof null', '"object"'],
          ['[] + []', '""'],
          ['0 ?? 5', '0'],
          ['[3, 1, 2].at(-1)', '2'],
        ]),
        fill(
          'Complète pour que chaque callback affiche sa propre valeur de i.',
          'for (___ i = 0; i < 3; i++) {\n  setTimeout(() => console.log(i), 0)\n} // 0, 1, 2',
          ['let', 'var', 'const', 'static'],
          'let',
          'let crée une nouvelle liaison de i à chaque tour. Avec var, on obtiendrait 3, 3, 3 ; const lèverait une TypeError au i++.',
        ),
      ]),
    ],
  ),
];
