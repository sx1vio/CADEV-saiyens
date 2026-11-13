import { fill, lesson, match, order, qcm, tip, unit, vf } from './dsl';
import type { CourseUnit } from './types';

/**
 * Apps mobiles avec Flutter : de Dart jusqu’à la publication sur les stores.
 * Programme : 0 bases de Dart, 1 Dart avancé (null safety, classes, records, async),
 * 2 widgets et mise en page, 3 état et interactions, 4 navigation et formulaires,
 * 5 données distantes et stockage local, 6 tests et publication.
 * Écrit pour Dart 3 et Flutter 3 (Material 3 activé par défaut).
 * Les identifiants de leçon historiques (variables, fonctions, null-safety, widgets, layout,
 * stateful, boutons, navigation, http, projet, build, store) sont conservés : la progression
 * des apprenants est enregistrée sous cours:mobile/<id de leçon>.
 */
export const units: CourseUnit[] = [
  // ─── Unité 0 : les bases de Dart ───────────────────────────────────────────
  unit(
    'dart',
    'Dart : les bases',
    'Déclarer des variables typées, écrire des conditions, des boucles et des fonctions, et manipuler listes, maps et sets.',
    [
      lesson('variables', 'Variables et types', [
        tip(
          'Dart en bref',
          'Flutter s’écrit en Dart, un langage typé : le compilateur vérifie les types avant même que l’app ne se lance. Tout programme démarre dans la fonction main(), et chaque instruction se termine par un point-virgule.\n\nTrois façons de déclarer une variable :\n• var laisse Dart deviner le type à partir de la valeur (var ville = ’Abidjan’ donne une String), et la variable reste réaffectable avec une valeur du même type.\n• final fixe la valeur une seule fois, au moment de l’exécution : parfait pour une date lue à l’ouverture de l’app.\n• const désigne une constante connue dès la compilation : un taux, une couleur, un widget qui ne change jamais.\n\nLes types de base sont int (entier), double (nombre à virgule), num (l’un ou l’autre), String (texte), bool (true ou false). Le type dynamic désactive les vérifications : à éviter, sauf quand on lit du JSON brut.',
          "void main() {\n  var ville = 'Abidjan';     // String deviné\n  final debut = DateTime.now(); // fixé à l’exécution\n  const tva = 0.18;           // connu à la compilation\n  int abonnes = 120;\n  abonnes = abonnes + 1;      // permis : int réaffectable\n  print('$ville : $abonnes abonnés');\n}",
        ),
        match('Associe chaque type Dart à une valeur.', [
          ['int', '42'],
          ['double', '3.5'],
          ['String', "'Kigali'"],
          ['bool', 'true'],
        ]),
        qcm(
          'Quel mot-clé pour une valeur affectée une seule fois, mais calculée à l’exécution ?',
          ['var', 'const', 'final', 'let'],
          2,
          'final accepte une valeur calculée à l’exécution (DateTime.now()). const exige une valeur connue dès la compilation. let n’existe pas en Dart.',
        ),
        qcm(
          'Que se passe-t-il avec ce code ?',
          [
            'nom vaut 42',
            'Une erreur de compilation : nom est une String',
            'nom devient dynamic',
            'Le programme plante seulement à l’exécution',
          ],
          1,
          'var a figé le type à String lors de la déclaration. Lui affecter un int est refusé par le compilateur, avant toute exécution.',
          "var nom = 'Awa';\nnom = 42;",
        ),
        tip(
          'Chaînes et interpolation',
          'Une chaîne s’écrit entre apostrophes droites ou entre guillemets, au choix. Pour insérer une variable, on utilise $nom ; pour une expression, on l’entoure d’accolades : ${prix * 2}. Les triples apostrophes permettent d’écrire sur plusieurs lignes.\n\nQuelques méthodes utiles : toUpperCase(), trim() pour enlever les espaces au début et à la fin, contains(), split(’,’). Pour convertir du texte en nombre : int.parse(’42’) lève une exception si le texte n’est pas un nombre, alors que int.tryParse(’abc’) renvoie null sans planter, ce qui est plus sûr pour une saisie utilisateur.',
          "final prix = 2500;\nprint('Total : ${prix * 2} F');   // Total : 5000 F\nprint(' Dakar '.trim());            // Dakar\nprint(int.tryParse('abc'));         // null",
        ),
        fill(
          'Insère la variable dans le texte.',
          "print('Bonjour ___nom');",
          ['$', '#', '&', '%'],
          '$',
          "En Dart : 'Bonjour $nom', ou '${a + b}' pour une expression.",
        ),
        vf(
          'int.parse(’douze’) renvoie null.',
          false,
          'int.parse lève une FormatException quand le texte n’est pas un nombre. C’est int.tryParse qui renvoie null.',
        ),
        qcm(
          'Où commence l’exécution d’un programme Dart ?',
          [
            'Dans build()',
            'À la première ligne du fichier',
            'Dans initState()',
            'Dans la fonction main()',
          ],
          3,
          'main() est le point d’entrée. Dans une app Flutter, main() appelle runApp(...).',
        ),
        vf(
          'const tva = 0.18; et final tva = 0.18; sont tous les deux valides.',
          true,
          '0.18 est connu à la compilation, donc les deux marchent. const est préférable : la valeur est partagée et calculée une seule fois.',
        ),
      ]),

      lesson('controle', 'Conditions et boucles', [
        tip(
          'if, switch et boucles',
          'if et else fonctionnent comme dans la plupart des langages. La condition doit être un vrai bool : Dart refuse if (liste.length) ou if (nom), il faut écrire if (liste.isNotEmpty).\n\nEn Dart 3, switch existe aussi sous forme d’expression : il renvoie directement une valeur, chaque cas s’écrit motif => valeur, et le cas _ attrape tout le reste. Plus besoin de break.\n\nPour répéter :\n• for (var i = 0; i < 3; i++) quand on a besoin de l’indice ;\n• for (final ville in villes) pour parcourir une collection ;\n• while (condition) quand on ne connaît pas le nombre de tours à l’avance.\n\nbreak sort de la boucle, continue passe directement au tour suivant.',
          "final code = 404;\nfinal message = switch (code) {\n  200 => 'OK',\n  404 => 'Introuvable',\n  _ => 'Erreur $code',\n};\n\nfor (final ville in ['Lomé', 'Accra']) {\n  print(ville);\n}",
        ),
        qcm(
          'Que vaut message pour code = 500 dans l’exemple de la fiche ?',
          ["'OK'", "'Introuvable'", "'Erreur 500'", 'null'],
          2,
          'Aucun cas ne correspond à 500, c’est donc le cas joker _ qui s’applique.',
        ),
        vf(
          'En Dart, if (liste.length) { ... } est accepté si la liste n’est pas vide.',
          false,
          'La condition doit être de type bool. On écrit if (liste.isNotEmpty) ou if (liste.length > 0).',
        ),
        fill(
          'Parcours chaque produit de la liste.',
          'for (final p ___ produits) {\n  print(p);\n}',
          ['in', 'of', ':', 'from'],
          'in',
          'for (final x in collection) parcourt chaque élément. of est la syntaxe de JavaScript.',
        ),
        tip(
          'Collection if et collection for',
          'Dart permet d’écrire if et for directement à l’intérieur d’une liste. C’est très utilisé en Flutter pour construire les enfants d’une Column : on ajoute un widget seulement si une condition est vraie, ou un widget par élément d’une liste.\n\nL’opérateur ... (spread) déverse une liste dans une autre, et ...? fait de même en ignorant une liste null. Résultat : pas besoin de construire la liste à part avec des add().',
          "final connecte = true;\nfinal tags = ['dart', 'flutter'];\nfinal menu = [\n  'Accueil',\n  if (connecte) 'Profil',\n  for (final t in tags) '#$t',\n];\n// [Accueil, Profil, #dart, #flutter]",
        ),
        qcm(
          'Que contient liste ?',
          ['[1, 2, 3]', '[1, 3]', '[1, 2]', '[2, 3]'],
          1,
          'premium vaut false : l’élément 2 n’est pas ajouté. Le 3 est toujours présent.',
          'final premium = false;\nfinal liste = [1, if (premium) 2, 3];',
        ),
        order(
          'Remets dans l’ordre une boucle qui s’arrête au premier prix négatif.',
          ['for (final p in prix) {', '  if (p < 0) break;', '  print(p);', '}'],
          'break sort immédiatement de la boucle ; continue aurait seulement sauté ce tour.',
        ),
        match('Associe chaque mot-clé à son effet.', [
          ['break', 'Quitter la boucle'],
          ['continue', 'Passer au tour suivant'],
          ['_ dans un switch', 'Attraper tous les autres cas'],
          ['...', 'Déverser une liste dans une autre'],
        ]),
      ]),

      lesson('fonctions', 'Fonctions et collections', [
        tip(
          'Fonctions et paramètres',
          'Une fonction annonce le type qu’elle renvoie : int, String, void (rien)… La syntaxe => écrit une fonction d’une seule expression.\n\nDart propose trois sortes de paramètres :\n• positionnels : f(a, b), obligatoires et dans l’ordre ;\n• positionnels optionnels, entre crochets : f(a, [b = 1]) ;\n• nommés, entre accolades : f({required String nom, int age = 0}). On les passe par leur nom, dans n’importe quel ordre : f(nom: ’Awa’).\n\nLes paramètres nommés sont partout en Flutter : Text(’Salut’, style: ...), Padding(padding: ..., child: ...). Un paramètre nommé non nullable doit être marqué required ou avoir une valeur par défaut.\n\nLes fonctions sont des valeurs : on peut les ranger dans une variable ou les passer à une autre fonction, comme on passe onPressed à un bouton.',
          "int carre(int n) => n * n;\n\nString saluer({required String nom, String pays = 'CI'}) {\n  return 'Salut $nom ($pays)';\n}\n\nvoid main() {\n  print(carre(4));                     // 16\n  print(saluer(pays: 'SN', nom: 'Awa')); // Salut Awa (SN)\n}",
        ),
        qcm(
          'Que renvoie une fonction déclarée void ?',
          [
            'Un entier',
            'Rien d’utilisable',
            'Toujours null de type String',
            'Le dernier paramètre',
          ],
          1,
          'void signifie « pas de valeur de retour utile ».',
        ),
        fill(
          'Rends le paramètre nommé nom obligatoire.',
          'void inscrire({___ String nom}) {}',
          ['required', 'final', 'must', 'late'],
          'required',
          'Sans required ni valeur par défaut, un paramètre nommé de type String non nullable est refusé.',
        ),
        vf(
          'Avec des paramètres nommés, saluer(pays: ’SN’, nom: ’Awa’) et saluer(nom: ’Awa’, pays: ’SN’) donnent le même résultat.',
          true,
          'L’ordre des paramètres nommés n’a pas d’importance : seul leur nom compte.',
        ),
        tip(
          'List, Set et Map',
          'Trois collections à connaître :\n• List : une suite ordonnée, les doublons sont permis : [1, 2, 2].\n• Set : pas de doublons, l’ordre d’insertion est gardé : {1, 2}.\n• Map : des paires clé → valeur : {’nom’: ’Awa’, ’xp’: 120}. map[’cle’] renvoie null si la clé est absente.\n\nLes méthodes qui transforment une liste renvoient un Iterable paresseux : where filtre, map transforme, et on termine par toList() pour obtenir une vraie List. any et every testent une condition, fold réduit à une seule valeur.',
          'final notes = [12, 8, 15, 8];\nfinal reussies = notes.where((n) => n >= 10).toList(); // [12, 15]\nfinal doubles = notes.map((n) => n * 2).toList();      // [24, 16, 30, 16]\nfinal uniques = notes.toSet();                         // {12, 8, 15}\nfinal total = notes.fold(0, (s, n) => s + n);          // 43',
        ),
        qcm(
          "Quel type pour {'nom': 'Awa', 'pays': 'SN'} ?",
          ['List<String>', 'Set<String>', 'Map<String, String>', 'Record'],
          2,
          'Une Map associe des clés à des valeurs. {1, 2} sans deux-points serait un Set.',
        ),
        qcm(
          'Que vaut [3, 4, 5].where((n) => n.isOdd).toList() ?',
          ['[3, 5]', '[4]', '[3, 4, 5]', '[true, false, true]'],
          0,
          'where garde les éléments pour lesquels la fonction renvoie true : les impairs 3 et 5. map aurait donné la liste de bool.',
        ),
        order(
          'Écris une fonction qui salue, puis appelle-la.',
          ['String saluer(String nom) {', "  return 'Salut $nom';", '}', "print(saluer('Kofi'));"],
          'La signature annonce le type de retour (String), puis on appelle la fonction.',
        ),
        match('Associe chaque collection à sa particularité.', [
          ['List', 'Ordonnée, doublons permis'],
          ['Set', 'Aucun doublon'],
          ['Map', 'Des paires clé → valeur'],
          ['Iterable', 'Paresseux, à finir par toList()'],
        ]),
      ]),
    ],
  ),

  // ─── Unité 1 : Dart avancé ─────────────────────────────────────────────────
  unit(
    'dart-avance',
    'Dart avancé',
    'Maîtriser la null safety, écrire des classes, utiliser records, patterns et classes sealed, et programmer en asynchrone avec Future et Stream.',
    [
      lesson('null-safety', 'La sécurité face au null', [
        tip(
          'Null safety',
          'Depuis Dart 3, la null safety est toujours active : par défaut, une variable ne peut pas contenir null. Beaucoup de plantages classiques sont ainsi refusés dès la compilation.\n\nPour autoriser null, ajoute ? au type : String? ville. Ensuite, quatre outils :\n• ?? donne une valeur de secours : ville ?? ’Inconnue’.\n• ??= affecte seulement si la variable est null.\n• ?. appelle seulement si l’objet n’est pas null : ville?.length vaut null au lieu de planter.\n• ! affirme « je garantis que ce n’est pas null ». Si tu te trompes, l’app plante à l’exécution : c’est l’outil de dernier recours.\n\nAprès un test if (ville != null), Dart « promeut » une variable locale en String : plus besoin de ? ni de ! dans le bloc.',
          "String? ville;               // peut être null\nprint(ville ?? 'Inconnue');  // Inconnue\nprint(ville?.length);        // null, sans planter\nville ??= 'Bamako';\nif (ville != null) {\n  print(ville.toUpperCase()); // promue en String\n}",
        ),
        vf('String nom; peut contenir null.', false, 'Il faut écrire String? pour autoriser null.'),
        fill(
          'Donne une valeur de secours si pseudo est null.',
          "print(pseudo ___ 'Anonyme');",
          ['||', '??', '?:', '!'],
          '??',
          '?? renvoie la valeur de droite quand celle de gauche est null.',
        ),
        qcm(
          'Que fait user?.nom ?',
          [
            'Force la lecture même si user est null',
            'Supprime user',
            'Lit nom seulement si user n’est pas null, sinon vaut null',
            'Transforme user en String',
          ],
          2,
          'Si user est null, l’expression vaut null au lieu de lever une erreur.',
        ),
        qcm(
          'Que signifie le ! dans user!.nom ?',
          [
            'L’inverse logique de user',
            'Une erreur de syntaxe',
            'Que nom est obligatoire',
            '« Je garantis que user n’est pas null »',
          ],
          3,
          'Si user est quand même null, une exception est levée à l’exécution. Préfère ?. ou ?? quand c’est possible.',
        ),
        tip(
          'late et required',
          'Deux mots-clés complètent la null safety.\n\n• late annonce qu’une variable non nullable sera initialisée plus tard, avant sa première lecture. On la croise souvent dans un State Flutter : late final TextEditingController ctrl, initialisé dans initState. Si on la lit trop tôt, une LateInitializationError est levée.\n• required rend obligatoire un paramètre nommé. Le compilateur refuse un appel qui l’oublie.\n\nAstuce : la promotion après un test ne marche que sur les variables locales (et, depuis Dart 3.2, sur les champs privés final). Pour un champ public, copie-le d’abord dans une variable locale.',
          "class Profil {\n  Profil({required this.nom, this.bio});\n  final String nom;   // obligatoire\n  final String? bio;  // facultatif\n}\n\nlate final String jeton; // rempli avant d'être lu",
        ),
        qcm(
          'Que se passe-t-il si on lit une variable late avant de l’avoir initialisée ?',
          [
            'Elle vaut null',
            'Une LateInitializationError est levée',
            'Elle vaut une chaîne vide',
            'Le compilateur l’initialise tout seul',
          ],
          1,
          'late repousse la vérification à l’exécution : une lecture trop tôt lève une erreur.',
        ),
        match('Associe chaque opérateur à son rôle.', [
          ['?', 'Autoriser null dans un type'],
          ['??', 'Valeur de secours'],
          ['??=', 'Affecter seulement si null'],
          ['?.', 'Appeler seulement si non null'],
          ['!', 'Affirmer que ce n’est pas null'],
        ]),
      ]),

      lesson('classes', 'Classes et constructeurs', [
        tip(
          'Écrire une classe',
          'Une classe regroupe des données (les champs) et des comportements (les méthodes). En Flutter, chaque widget est une classe, et tes modèles (Offre, Utilisateur, Commande) aussi.\n\nLe constructeur court Offre(this.titre, this.prix) remplit les champs directement. Avec des accolades, les paramètres deviennent nommés : Offre({required this.titre}).\n\nBonnes pratiques :\n• Rends les champs final : un objet qui ne change pas est plus facile à suivre. Pour « modifier », on crée une copie avec une méthode copyWith.\n• Un constructeur const (const Offre(...)) permet de créer des objets constants, comme pour les widgets.\n• Un constructeur nommé (Offre.gratuite(...)) donne un deuxième point d’entrée lisible.\n• Un constructeur factory peut renvoyer un objet existant ou construit autrement : c’est la forme classique de fromJson.\n\nEn Dart, un nom qui commence par _ est privé au fichier (à la bibliothèque), il n’y a pas de mot-clé private.',
          'class Offre {\n  const Offre({required this.titre, required this.prix});\n  const Offre.gratuite(this.titre) : prix = 0;\n\n  final String titre;\n  final int prix;\n\n  bool get estGratuite => prix == 0;\n\n  Offre copyWith({String? titre, int? prix}) =>\n      Offre(titre: titre ?? this.titre, prix: prix ?? this.prix);\n}',
        ),
        qcm(
          'Comment rendre un champ privé en Dart ?',
          [
            'Avec le mot-clé private',
            'En commençant son nom par _',
            'En le déclarant final',
            'En le mettant dans un constructeur factory',
          ],
          1,
          'Un nom qui commence par _ n’est visible que dans son fichier (sa bibliothèque).',
        ),
        fill(
          'Complète le getter qui indique si l’offre est gratuite.',
          'bool ___ estGratuite => prix == 0;',
          ['get', 'set', 'final', 'fun'],
          'get',
          'Un getter se lit comme un champ (offre.estGratuite) mais calcule sa valeur.',
        ),
        vf(
          'Avec des champs final, on « modifie » un objet en créant une copie, par exemple avec copyWith.',
          true,
          'C’est le style recommandé pour l’état en Flutter : l’ancien objet reste intact, on remplace la référence.',
        ),
        tip(
          'Héritage, interfaces et mixins',
          'Trois façons de réutiliser du code :\n• extends hérite d’une seule classe et peut redéfinir ses méthodes avec @override. C’est ce que tu fais avec extends StatelessWidget.\n• implements oblige à fournir toutes les méthodes d’une autre classe, utilisée comme interface. Toute classe Dart peut servir d’interface.\n• with ajoute un mixin, un paquet de méthodes réutilisable dans plusieurs classes. Flutter en utilise, par exemple SingleTickerProviderStateMixin pour les animations.\n\nUne classe abstract ne peut pas être instanciée directement : elle décrit un contrat que ses sous-classes complètent.',
          "abstract class Paiement {\n  String payer(int montant);\n}\n\nclass MobileMoney implements Paiement {\n  @override\n  String payer(int montant) => 'Paiement de $montant F par mobile';\n}",
        ),
        qcm(
          'Quel mot-clé ajoute un mixin à une classe ?',
          ['extends', 'implements', 'mixin', 'with'],
          3,
          'class A extends B with M { } : with branche le mixin M. Le mot mixin sert à le déclarer.',
        ),
        match('Associe chaque construction à son usage.', [
          ['extends', 'Hériter d’une classe'],
          ['implements', 'Respecter un contrat'],
          ['with', 'Ajouter un mixin'],
          ['abstract', 'Interdire l’instanciation directe'],
          ['factory', 'Constructeur qui peut renvoyer un objet existant'],
        ]),
        order(
          'Remets dans l’ordre une classe avec constructeur nommé.',
          [
            'class Point {',
            '  const Point(this.x, this.y);',
            '  const Point.origine() : x = 0, y = 0;',
            '  final int x;',
            '  final int y;',
            '}',
          ],
          'Le constructeur nommé initialise les champs dans sa liste d’initialisation, après les deux-points.',
        ),
      ]),

      lesson('records-patterns', 'Records, patterns et classes sealed', [
        tip(
          'Records et déstructuration',
          'Dart 3 a ajouté les records : un petit groupe de valeurs, sans avoir à écrire une classe. (int, String) est le type d’un record à deux champs positionnels, lus avec $1 et $2. On peut aussi nommer les champs : ({double lat, double lng}).\n\nUn record est idéal pour renvoyer plusieurs valeurs d’une fonction. Deux records sont égaux si leurs champs sont égaux.\n\nLes patterns permettent ensuite de déstructurer : var (nom, age) = profil; range chaque champ dans sa variable. Ils marchent aussi sur les listes et les maps, et dans if-case pour tester la forme d’une donnée JSON en une seule ligne.',
          "(String, int) profil() => ('Awa', 24);\n\nvoid main() {\n  final (nom, age) = profil();\n  print('$nom a $age ans');\n\n  final position = (lat: 5.35, lng: -4.0);\n  print(position.lat);\n\n  final json = {'nom': 'Kofi', 'xp': 300};\n  if (json case {'nom': String n, 'xp': int xp}) {\n    print('$n : $xp XP');\n  }\n}",
        ),
        qcm(
          'Comment lire le deuxième champ du record r = (’Awa’, 24) ?',
          ['r[1]', 'r.$2', 'r.second', 'r.get(2)'],
          1,
          'Les champs positionnels d’un record se lisent avec $1, $2… en commençant à 1.',
        ),
        vf(
          'Une fonction Dart peut renvoyer plusieurs valeurs grâce à un record.',
          true,
          'Par exemple (bool, String) verifier() renvoie (true, ’OK’) ; on déstructure ensuite avec final (ok, message) = verifier();',
        ),
        fill(
          'Déstructure le record en deux variables.',
          'final ___ = coordonnees();',
          ['(lat, lng)', '[lat, lng]', '{lat, lng}', 'lat, lng'],
          '(lat, lng)',
          'Un record positionnel se déstructure avec des parenthèses, comme il s’écrit.',
        ),
        tip(
          'Classes sealed et switch exhaustif',
          'Une classe sealed annonce une famille fermée de sous-classes, toutes déclarées dans le même fichier. Le compilateur connaît donc tous les cas possibles.\n\nAvantage : un switch sur une valeur sealed doit traiter chaque sous-classe, sinon le code ne compile pas. Si tu ajoutes un nouvel état plus tard, Dart te montre tous les endroits à mettre à jour.\n\nC’est parfait pour décrire l’état d’un écran : en chargement, chargé avec des données, ou en erreur. Le motif Charge(:final offres) teste le type et extrait le champ offres en même temps.',
          "sealed class EtatOffres {}\nclass Chargement extends EtatOffres {}\nclass Charge extends EtatOffres {\n  Charge(this.offres);\n  final List<String> offres;\n}\nclass Erreur extends EtatOffres {\n  Erreur(this.message);\n  final String message;\n}\n\nString titre(EtatOffres e) => switch (e) {\n      Chargement() => 'Chargement…',\n      Charge(:final offres) => '${offres.length} offres',\n      Erreur(:final message) => 'Oups : $message',\n    };",
        ),
        qcm(
          'Que se passe-t-il si on oublie le cas Erreur() dans le switch de la fiche ?',
          [
            'Rien, le switch renvoie null',
            'Une exception à l’exécution seulement si e est une Erreur',
            'Le code ne compile pas : le switch n’est pas exhaustif',
            'Dart ajoute un cas par défaut automatiquement',
          ],
          2,
          'Avec une classe sealed, le compilateur vérifie que tous les sous-types sont traités.',
        ),
        vf(
          'Les sous-classes d’une classe sealed peuvent être déclarées dans n’importe quel fichier du projet.',
          false,
          'Elles doivent être dans la même bibliothèque (le même fichier, sauf usage de part). C’est ce qui rend la famille fermée.',
        ),
        match('Associe chaque syntaxe Dart 3 à sa signification.', [
          ['(int, String)', 'Type d’un record positionnel'],
          ['({int x, int y})', 'Type d’un record à champs nommés'],
          ['if (json case {...})', 'Tester la forme d’une donnée'],
          ['sealed class', 'Famille fermée de sous-classes'],
        ]),
      ]),

      lesson('async', 'Future, async et Stream', [
        tip(
          'Future et async/await',
          'Une app mobile attend souvent : une réponse réseau, un fichier, une base de données. Dart ne bloque pas l’écran pendant ce temps : ces opérations renvoient un Future<T>, la promesse d’une valeur de type T plus tard.\n\nDans une fonction marquée async, await suspend la fonction jusqu’à ce que le Future se termine, sans geler l’interface. La fonction async renvoie elle-même un Future.\n\nLes erreurs d’un Future attendu se rattrapent avec un try / catch classique, et finally s’exécute dans tous les cas (pratique pour cacher un indicateur de chargement).\n\nÀ retenir :\n• Oublier await donne un Future au lieu de la valeur.\n• Future.wait([a, b]) lance plusieurs opérations en parallèle et attend qu’elles soient toutes finies.\n• Dart tourne sur un seul fil avec une boucle d’événements. Un très gros calcul peut quand même figer l’écran : on le déplace dans un isolate avec Isolate.run (ou compute en Flutter).',
          "Future<String> chargerNom() async {\n  await Future.delayed(const Duration(seconds: 1));\n  return 'Awa';\n}\n\nFuture<void> main() async {\n  try {\n    final nom = await chargerNom();\n    print('Bonjour $nom');\n  } catch (e) {\n    print('Erreur : $e');\n  } finally {\n    print('Terminé');\n  }\n}",
        ),
        fill(
          'Marque la fonction pour pouvoir utiliser await.',
          'Future<int> compter() ___ {\n  final n = await api.total();\n  return n;\n}',
          ['async', 'await', 'sync', 'future'],
          'async',
          'await n’est permis que dans une fonction async (ou async*).',
        ),
        qcm(
          'Quel type renvoie une fonction async qui fait return 42 ?',
          ['int', 'Future<int>', 'Stream<int>', 'void'],
          1,
          'Une fonction async enveloppe toujours son résultat dans un Future.',
        ),
        vf(
          'Pendant un await, l’interface Flutter reste figée.',
          false,
          'await suspend seulement la fonction ; la boucle d’événements continue de dessiner l’écran et de traiter les touchers.',
        ),
        qcm(
          'Comment lancer deux requêtes en même temps et attendre les deux ?',
          [
            'await a; await b;',
            'Future.race([a, b])',
            'await Future.wait([a, b])',
            'Stream.fromFutures([a, b])',
          ],
          2,
          'Future.wait attend que tous les Futures soient terminés et renvoie leurs résultats dans une liste.',
        ),
        tip(
          'Stream : plusieurs valeurs dans le temps',
          'Un Future livre une seule valeur. Un Stream<T> en livre plusieurs, au fil du temps : les messages d’une discussion, la position GPS, la progression d’un téléchargement.\n\nOn écoute un Stream avec await for dans une fonction async, ou avec listen(). Une fonction async* produit un Stream : chaque yield envoie une valeur.\n\nEn Flutter, StreamBuilder reconstruit un widget à chaque nouvelle valeur, comme FutureBuilder le fait pour un Future. Pense à annuler un abonnement (subscription.cancel()) quand l’écran disparaît, sinon il continue de tourner pour rien.',
          'Stream<int> compteARebours(int depart) async* {\n  for (var i = depart; i >= 0; i--) {\n    await Future.delayed(const Duration(seconds: 1));\n    yield i;\n  }\n}\n\nawait for (final n in compteARebours(3)) {\n  print(n); // 3, 2, 1, 0\n}',
        ),
        match('Associe chaque outil asynchrone à son rôle.', [
          ['Future', 'Une seule valeur plus tard'],
          ['Stream', 'Plusieurs valeurs dans le temps'],
          ['async*', 'Produire un Stream avec yield'],
          ['await for', 'Parcourir un Stream'],
          ['Isolate.run', 'Calcul lourd hors du fil principal'],
        ]),
        order(
          'Remets dans l’ordre une fonction qui charge un profil et gère l’erreur.',
          [
            'Future<void> charger() async {',
            '  try {',
            '    final p = await api.profil();',
            '    print(p.nom);',
            '  } catch (e) {',
            "    print('Erreur : $e');",
            '  }',
            '}',
          ],
          'L’await est dans le try : une erreur réseau atterrit dans le catch.',
        ),
      ]),
    ],
  ),

  // ─── Unité 2 : widgets et mise en page ─────────────────────────────────────
  unit(
    'widgets',
    'Widgets et mise en page',
    'Assembler des widgets pour créer un écran, les disposer en lignes, colonnes et listes, et appliquer un thème Material 3.',
    [
      lesson('widgets', 'Tout est widget', [
        tip(
          'Des briques imbriquées',
          'En Flutter, tout ce qui s’affiche est un widget : un texte, un bouton, une marge, un écran entier. On les imbrique pour former un arbre : un widget parent reçoit un enfant avec child, ou plusieurs avec children.\n\nUne app commence par runApp(), qui reçoit le widget racine, souvent un MaterialApp. MaterialApp fournit le thème, la navigation et la langue. Ensuite, chaque écran est en général un Scaffold : il offre une barre du haut (appBar), un corps (body), un bouton flottant (floatingActionButton) et une barre de navigation en bas.\n\nUn widget est une description légère et immuable. La méthode build la renvoie à partir de l’état actuel ; Flutter compare l’ancien arbre et le nouveau, et ne redessine que ce qui a changé. C’est pour ça que build peut être appelée très souvent : elle doit rester rapide et ne jamais lancer de requête réseau.',
          "void main() => runApp(const MonApp());\n\nclass MonApp extends StatelessWidget {\n  const MonApp({super.key});\n\n  @override\n  Widget build(BuildContext context) {\n    return MaterialApp(\n      home: Scaffold(\n        appBar: AppBar(title: const Text('DevHub')),\n        body: const Center(child: Text('Bienvenue')),\n      ),\n    );\n  }\n}",
        ),
        match('Associe chaque widget à son rôle.', [
          ['Text', 'Afficher du texte'],
          ['Padding', 'Ajouter de l’espace autour'],
          ['Scaffold', 'La structure d’un écran'],
          ['Image.network', 'Afficher une image en ligne'],
          ['MaterialApp', 'La racine : thème et navigation'],
        ]),
        qcm(
          'Quelle méthode décrit ce qu’un widget affiche ?',
          ['render', 'draw', 'paint', 'build'],
          3,
          'build est appelée chaque fois que l’interface doit être reconstruite.',
        ),
        fill(
          'Centre le texte.',
          "___(child: Text('Salut'))",
          ['Middle', 'Center', 'Align.center', 'Centered'],
          'Center',
          'Center place son unique enfant au milieu de l’espace disponible.',
        ),
        vf(
          'On peut lancer une requête réseau directement dans build, puisque build n’est appelée qu’une fois.',
          false,
          'build peut être appelée des dizaines de fois (rotation, clavier, setState…). Une requête y serait relancée à chaque fois.',
        ),
        qcm(
          'Pourquoi ajouter const devant un widget qui ne change pas ?',
          [
            'C’est obligatoire pour tous les widgets',
            'Flutter réutilise la même instance au lieu de la recréer',
            'Pour lui donner une couleur par défaut',
            'Pour le rendre cliquable',
          ],
          1,
          'Un widget const est créé une seule fois : moins de travail à chaque reconstruction.',
        ),
        order(
          'Remets dans l’ordre le démarrage d’une app Flutter.',
          ['void main() {', '  runApp(const MonApp());', '}'],
          'main() appelle runApp avec le widget racine.',
        ),
        qcm(
          'Dans un Scaffold, quel paramètre reçoit le contenu principal de l’écran ?',
          ['appBar', 'floatingActionButton', 'body', 'drawer'],
          2,
          'body reçoit le contenu ; appBar la barre du haut, drawer le menu latéral.',
        ),
      ]),

      lesson('layout', 'Colonnes, lignes et espaces', [
        tip(
          'Column, Row et Expanded',
          'Column empile ses enfants verticalement, Row les aligne horizontalement. Chacune a deux axes :\n• l’axe principal (vertical pour Column, horizontal pour Row), réglé par mainAxisAlignment : start, center, spaceBetween, spaceEvenly… ;\n• l’axe secondaire, réglé par crossAxisAlignment.\n\nPour l’espacement : Padding ajoute une marge intérieure, SizedBox(height: 16) crée un espace fixe entre deux enfants. Depuis Flutter 3.27, Row et Column acceptent aussi un paramètre spacing.\n\nExpanded fait prendre à un enfant tout l’espace restant ; avec flex, plusieurs Expanded se partagent l’espace proportionnellement. Stack superpose ses enfants (une image et un badge par-dessus).\n\nSi les enfants dépassent la place disponible, Flutter affiche des bandes jaunes et noires : c’est un débordement (overflow). La solution est souvent Expanded, un texte qui passe à la ligne, ou une zone qui défile.',
          "Column(\n  crossAxisAlignment: CrossAxisAlignment.start,\n  children: [\n    const Text('Awa Diop'),\n    const SizedBox(height: 8),\n    Row(\n      children: [\n        const Icon(Icons.place),\n        Expanded(child: Text(adresseLongue)),\n      ],\n    ),\n  ],\n)",
        ),
        qcm(
          'Quel widget empile ses enfants verticalement ?',
          ['Row', 'Stack', 'Wrap', 'Column'],
          3,
          'Column = vertical, Row = horizontal, Stack = superposés.',
        ),
        fill(
          'Aligne ces éléments sur une ligne.',
          "___(children: [Icon(Icons.star), Text('4,8')])",
          ['Column', 'Row', 'Line', 'Flex.row'],
          'Row',
          'Row aligne ses enfants horizontalement.',
        ),
        qcm(
          'Quel widget prend tout l’espace restant dans une Row ?',
          ['SizedBox', 'Container', 'Expanded', 'Padding'],
          2,
          'Expanded partage l’espace libre entre les enfants, selon leur flex.',
        ),
        vf(
          'Des bandes jaunes et noires sur l’écran signalent un débordement de mise en page.',
          true,
          'Un enfant ne tient pas dans l’espace donné : à corriger avec Expanded, un retour à la ligne ou un défilement.',
        ),
        fill(
          'Répartis les enfants avec le même espace entre eux, et rien aux bords.',
          'Row(\n  mainAxisAlignment: MainAxisAlignment.___,\n  children: boutons,\n)',
          ['spaceBetween', 'center', 'stretch', 'end'],
          'spaceBetween',
          'spaceBetween colle le premier et le dernier aux bords et répartit l’espace entre les autres.',
        ),
        match('Associe chaque widget à son usage.', [
          ['Stack', 'Superposer des éléments'],
          ['SizedBox', 'Un espace de taille fixe'],
          ['Card', 'Une carte avec une ombre'],
          ['Wrap', 'Passer à la ligne quand il n’y a plus de place'],
        ]),
        vf(
          'Dans une Column, mainAxisAlignment règle la position verticale des enfants.',
          true,
          'L’axe principal d’une Column est vertical ; crossAxisAlignment règle l’horizontal.',
        ),
      ]),

      lesson('listes', 'Listes et grilles qui défilent', [
        tip(
          'ListView et GridView',
          'Une Column ne défile pas : avec beaucoup d’éléments, elle déborde. Pour une liste qui défile, on utilise ListView.\n\nPour une longue liste (des offres d’emploi, des messages), préfère ListView.builder : il ne construit que les éléments visibles à l’écran, au fur et à mesure du défilement. On lui donne itemCount et une fonction itemBuilder qui reçoit l’index. ListView.separated ajoute un séparateur entre deux éléments.\n\nGridView affiche une grille : GridView.count(crossAxisCount: 2) pour deux colonnes fixes, GridView.builder pour une grille longue.\n\nListTile est le widget tout prêt pour une ligne de liste : leading (icône ou avatar à gauche), title, subtitle, trailing (à droite) et onTap.\n\nPour une liste dont les éléments peuvent être supprimés ou réordonnés, donne à chaque élément une clé stable : key: ValueKey(offre.id). Flutter garde alors le bon état attaché au bon élément.',
          'ListView.builder(\n  itemCount: offres.length,\n  itemBuilder: (context, index) {\n    final offre = offres[index];\n    return ListTile(\n      key: ValueKey(offre.id),\n      leading: const Icon(Icons.work),\n      title: Text(offre.titre),\n      subtitle: Text(offre.ville),\n      onTap: () => ouvrir(offre),\n    );\n  },\n)',
        ),
        qcm(
          'Pourquoi préférer ListView.builder pour 1 000 éléments ?',
          [
            'Il construit seulement les éléments visibles',
            'Il trie la liste automatiquement',
            'Il est le seul à défiler',
            'Il met les données en cache sur le disque',
          ],
          0,
          'Les éléments hors écran ne sont pas construits : la mémoire et le temps de calcul restent faibles.',
        ),
        fill(
          'Indique combien d’éléments contient la liste.',
          'ListView.builder(\n  ___: messages.length,\n  itemBuilder: (context, i) => Text(messages[i]),\n)',
          ['itemCount', 'length', 'count', 'size'],
          'itemCount',
          'itemCount dit au builder où s’arrêter.',
        ),
        vf(
          'Une Column avec 200 enfants défile toute seule quand elle dépasse l’écran.',
          false,
          'Column ne défile jamais : elle déborde. Il faut ListView, ou SingleChildScrollView autour d’un contenu court.',
        ),
        match('Associe chaque paramètre de ListTile à sa place.', [
          ['leading', 'À gauche'],
          ['title', 'La ligne principale'],
          ['subtitle', 'Le texte sous le titre'],
          ['trailing', 'À droite'],
        ]),
        qcm(
          'Quel widget pour une grille de produits sur deux colonnes ?',
          [
            'Row(children: produits)',
            'GridView.count(crossAxisCount: 2)',
            'Stack',
            'Table(columns: 2)',
          ],
          1,
          'crossAxisCount fixe le nombre de colonnes. Pour une grille longue, GridView.builder.',
        ),
        qcm(
          'Pourquoi donner key: ValueKey(offre.id) aux éléments d’une liste modifiable ?',
          [
            'Pour les trier par identifiant',
            'C’est obligatoire pour afficher un ListTile',
            'Pour que Flutter associe le bon état au bon élément après un ajout ou une suppression',
            'Pour accélérer le chargement des images',
          ],
          2,
          'Sans clé, Flutter associe l’état par position : supprimer un élément peut décaler l’état sur le voisin.',
        ),
        order(
          'Remets dans l’ordre une liste avec séparateurs.',
          [
            'ListView.separated(',
            '  itemCount: villes.length,',
            '  separatorBuilder: (_, __) => const Divider(),',
            '  itemBuilder: (_, i) => Text(villes[i]),',
            ')',
          ],
          'separatorBuilder construit le séparateur entre deux éléments.',
        ),
      ]),

      lesson('style', 'Thème, couleurs et images', [
        tip(
          'Un thème pour toute l’app',
          'Plutôt que de répéter couleurs et tailles dans chaque widget, on les décrit une seule fois dans le thème de MaterialApp. Depuis Flutter 3.16, Material 3 est activé par défaut.\n\nColorScheme.fromSeed(seedColor: ...) génère toute une palette cohérente (primary, secondary, surface, error…) à partir d’une seule couleur. On ajoute darkTheme pour le mode sombre, et themeMode: ThemeMode.system suit le réglage du téléphone.\n\nDans un widget, on lit le thème avec Theme.of(context) : Theme.of(context).colorScheme.primary pour la couleur principale, Theme.of(context).textTheme.titleLarge pour un style de titre. Résultat : changer de couleur de marque se fait en une seule ligne.\n\nPour s’adapter à l’écran, MediaQuery.sizeOf(context) donne la taille disponible, et SafeArea évite l’encoche et la barre système.',
          'MaterialApp(\n  theme: ThemeData(\n    colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),\n  ),\n  darkTheme: ThemeData(\n    colorScheme: ColorScheme.fromSeed(\n      seedColor: Colors.deepPurple,\n      brightness: Brightness.dark,\n    ),\n  ),\n  themeMode: ThemeMode.system,\n  home: const Accueil(),\n)',
        ),
        qcm(
          'Comment lire la couleur principale du thème dans un widget ?',
          [
            'Colors.primary',
            'MaterialApp.primaryColor',
            'context.color',
            'Theme.of(context).colorScheme.primary',
          ],
          3,
          'Theme.of(context) remonte l’arbre jusqu’au thème le plus proche.',
        ),
        vf(
          'ColorScheme.fromSeed génère une palette complète à partir d’une seule couleur.',
          true,
          'Les couleurs dérivées respectent les contrastes de Material 3, en clair comme en sombre.',
        ),
        tip(
          'Images et ressources',
          'Deux sources d’images :\n• Image.network(url) charge une image en ligne. Prévois errorBuilder pour une image cassée, et pense que chaque affichage consomme des données mobiles.\n• Image.asset(’assets/logo.png’) lit une image livrée avec l’app. Le fichier doit être déclaré dans pubspec.yaml, sous flutter: puis assets:, sinon il n’est pas embarqué.\n\nLes icônes Material sont disponibles sans rien installer : Icon(Icons.home). Pour garder une app légère, compresse les images et préfère des tailles adaptées à l’écran plutôt que des photos de plusieurs mégaoctets.',
          'flutter:\n  uses-material-design: true\n  assets:\n    - assets/logo.png\n    - assets/illustrations/',
        ),
        fill(
          'Affiche une image livrée avec l’app.',
          "Image.___('assets/logo.png')",
          ['asset', 'network', 'file', 'load'],
          'asset',
          'Image.asset lit une ressource déclarée dans pubspec.yaml.',
        ),
        qcm(
          'Que faut-il faire pour qu’Image.asset(’assets/logo.png’) fonctionne ?',
          [
            'Déclarer le fichier sous flutter: assets: dans pubspec.yaml',
            'Le mettre dans android/res uniquement',
            'L’importer avec import ’assets/logo.png’',
            'Rien, tout le dossier du projet est embarqué',
          ],
          0,
          'Seules les ressources déclarées dans pubspec.yaml sont incluses dans l’app.',
        ),
        match('Associe chaque outil à son rôle.', [
          ['ThemeMode.system', 'Suivre le mode sombre du téléphone'],
          ['SafeArea', 'Éviter l’encoche et la barre système'],
          ['MediaQuery.sizeOf', 'Connaître la taille de l’écran'],
          ['textTheme', 'Les styles de texte du thème'],
        ]),
        vf(
          'Pour changer la couleur de marque, il faut modifier chaque widget un par un.',
          false,
          'Si les widgets lisent Theme.of(context), on change seulement seedColor dans le thème.',
        ),
      ]),
    ],
  ),

  // ─── Unité 3 : état et interactions ────────────────────────────────────────
  unit(
    'interactions',
    'État et interactions',
    'Faire réagir l’écran aux actions de l’utilisateur avec setState, gérer le cycle de vie d’un State et partager l’état entre plusieurs widgets.',
    [
      lesson('stateful', 'Widgets avec état', [
        tip(
          'StatelessWidget ou StatefulWidget',
          'Un StatelessWidget affiche toujours la même chose pour les mêmes paramètres : un titre, une carte de profil. Un StatefulWidget garde un état qui change pendant que l’écran est affiché : un compteur, une case cochée, un onglet sélectionné.\n\nUn StatefulWidget est en deux morceaux :\n• la classe du widget, immuable, qui reçoit les paramètres ;\n• une classe State, qui garde les variables qui changent et contient build.\n\nPour changer l’état, on modifie la variable à l’intérieur de setState(() { ... }). setState prévient Flutter que l’état a changé : il rappelle build et met l’écran à jour. Modifier la variable sans setState ne redessine rien.\n\nDepuis le State, widget.nomDuParametre donne accès aux paramètres reçus par le widget.\n\nRègle simple : garde l’état au plus bas possible dans l’arbre. Si seul un bouton change, inutile de reconstruire tout l’écran.',
          "class Compteur extends StatefulWidget {\n  const Compteur({super.key, this.depart = 0});\n  final int depart;\n\n  @override\n  State<Compteur> createState() => _CompteurState();\n}\n\nclass _CompteurState extends State<Compteur> {\n  late int n = widget.depart;\n\n  @override\n  Widget build(BuildContext context) => TextButton(\n        onPressed: () => setState(() => n++),\n        child: Text('Cliqué $n fois'),\n      );\n}",
        ),
        qcm(
          'Quel type de widget pour un compteur qui augmente à chaque appui ?',
          [
            'StatelessWidget',
            'InheritedWidget',
            'StatefulWidget',
            'Aucun, une simple fonction suffit',
          ],
          2,
          'Le nombre change pendant l’affichage : il faut un état.',
        ),
        fill(
          'Redessine l’écran après la modification.',
          '___(() => compteur++);',
          ['refresh', 'setState', 'update', 'notify'],
          'setState',
          'setState prévient Flutter que l’état a changé et déclenche un nouveau build.',
        ),
        vf(
          'Modifier une variable de State sans setState met toujours l’écran à jour.',
          false,
          'Sans setState, Flutter ne sait pas qu’il doit reconstruire : l’écran garde l’ancienne valeur.',
        ),
        qcm(
          'Où vit l’état d’un StatefulWidget ?',
          [
            'Dans la classe du widget',
            'Dans main()',
            'Dans un fichier JSON',
            'Dans l’objet State associé',
          ],
          3,
          'Le widget est recréé souvent ; l’objet State, lui, persiste entre les reconstructions.',
        ),
        fill(
          'Depuis le State, lis le paramètre titre reçu par le widget.',
          'Text(___.titre)',
          ['widget', 'this', 'state', 'super'],
          'widget',
          'Dans un State, widget désigne la configuration actuelle du StatefulWidget.',
        ),
        order(
          'Remets dans l’ordre le squelette d’un StatefulWidget.',
          [
            'class Favori extends StatefulWidget {',
            '  @override',
            '  State<Favori> createState() => _FavoriState();',
            '} // fin du widget',
            'class _FavoriState extends State<Favori> {',
            '  bool actif = false;',
            '}',
          ],
          'Le widget crée son State avec createState ; le State garde les variables qui changent.',
        ),
        vf(
          'Garder l’état au plus bas dans l’arbre limite ce qui est reconstruit.',
          true,
          'setState reconstruit le widget qui le porte et ses enfants, pas tout l’écran.',
        ),
      ]),

      lesson('boutons', 'Boutons, gestes et saisie', [
        tip(
          'Réagir à l’utilisateur',
          'Material 3 propose plusieurs boutons : FilledButton pour l’action principale, ElevatedButton, OutlinedButton et TextButton pour les actions secondaires, IconButton pour une icône seule. Tous prennent une fonction onPressed. Si onPressed vaut null, le bouton s’affiche désactivé : pratique pour bloquer « Envoyer » tant que la saisie est incomplète.\n\nPour rendre cliquable n’importe quel widget (une carte, une image), entoure-le d’InkWell (avec l’effet d’onde Material) ou de GestureDetector (onTap, onLongPress, onDoubleTap…).\n\nTextField lit une saisie. Un TextEditingController permet de lire le texte (ctrl.text), de le vider (ctrl.clear()) ou de le préremplir. onChanged est appelé à chaque frappe. Le paramètre keyboardType choisit le clavier adapté, et obscureText masque un mot de passe.\n\nUn contrôleur se crée une fois (dans le State) et doit être libéré dans dispose.',
          "final ctrl = TextEditingController();\n\nColumn(children: [\n  TextField(\n    controller: ctrl,\n    keyboardType: TextInputType.phone,\n    decoration: const InputDecoration(labelText: 'Ton numéro'),\n  ),\n  FilledButton(\n    onPressed: ctrl.text.isEmpty ? null : envoyer,\n    child: const Text('Valider'),\n  ),\n])",
        ),
        fill(
          'Réagis à l’appui sur le bouton.',
          "ElevatedButton(\n  ___: () => envoyer(),\n  child: Text('Envoyer'),\n)",
          ['onClick', 'onTap', 'onPressed', 'onPress'],
          'onPressed',
          'Les boutons Flutter utilisent onPressed ; onTap est celui d’InkWell et de GestureDetector.',
        ),
        qcm(
          'Comment lire le texte d’un TextField ?',
          [
            'Avec document.value',
            'Avec son TextEditingController : ctrl.text',
            'Avec input()',
            'Avec TextField.value',
          ],
          1,
          'Le contrôleur donne accès au texte saisi, et permet aussi de le modifier.',
        ),
        vf(
          'Un bouton dont onPressed vaut null s’affiche désactivé.',
          true,
          'Pratique pour désactiver « Envoyer » tant que le formulaire est incomplet.',
        ),
        qcm(
          'Quel widget rend une carte cliquable avec l’effet d’onde Material ?',
          ['Padding', 'Text', 'SizedBox', 'InkWell'],
          3,
          'InkWell ajoute l’effet d’onde ; GestureDetector détecte les gestes sans effet visuel.',
        ),
        match('Associe chaque réglage de saisie à son usage.', [
          ['TextInputType.emailAddress', 'Saisir un e-mail'],
          ['TextInputType.phone', 'Saisir un numéro'],
          ['TextInputType.number', 'Saisir un nombre'],
          ['obscureText: true', 'Saisir un mot de passe'],
        ]),
        match('Associe chaque bouton Material 3 à son usage.', [
          ['FilledButton', 'L’action principale de l’écran'],
          ['OutlinedButton', 'Une action secondaire encadrée'],
          ['TextButton', 'Une action discrète'],
          ['IconButton', 'Une icône seule'],
        ]),
        qcm(
          'Quel paramètre de TextField est appelé à chaque frappe ?',
          ['onChanged', 'onSubmitted', 'onPressed', 'onSaved'],
          0,
          'onChanged reçoit le texte à chaque modification ; onSubmitted seulement quand on valide au clavier.',
        ),
      ]),

      lesson('cycle-vie', 'Le cycle de vie d’un State', [
        tip(
          'Naître, vivre, disparaître',
          'Un objet State passe par plusieurs étapes, et chacune a sa méthode :\n• initState() est appelée une seule fois, à la création. C’est là qu’on crée les contrôleurs, qu’on lance le premier chargement ou qu’on s’abonne à un Stream. On commence toujours par super.initState().\n• didChangeDependencies() est appelée juste après, puis quand une dépendance héritée change (le thème, la langue).\n• build() est appelée à chaque reconstruction.\n• didUpdateWidget(ancien) est appelée quand le parent reconstruit le widget avec de nouveaux paramètres.\n• dispose() est appelée quand le widget quitte l’écran pour de bon. On y libère tout : contrôleurs, abonnements, timers. On termine par super.dispose().\n\nOublier dispose crée une fuite de mémoire : le contrôleur ou le timer continue de vivre alors que l’écran n’existe plus.',
          'class _ChatState extends State<Chat> {\n  late final TextEditingController ctrl;\n  late final StreamSubscription<Message> abo;\n\n  @override\n  void initState() {\n    super.initState();\n    ctrl = TextEditingController();\n    abo = widget.messages.listen(ajouter);\n  }\n\n  @override\n  void dispose() {\n    abo.cancel();\n    ctrl.dispose();\n    super.dispose();\n  }\n}',
        ),
        order(
          'Remets les étapes de vie d’un State dans l’ordre.',
          ['createState', 'initState', 'didChangeDependencies', 'build', 'dispose'],
          'Le State est créé, initialisé une fois, construit (souvent plusieurs fois), puis libéré.',
        ),
        qcm(
          'Où libérer un TextEditingController ?',
          ['Dans build', 'Dans dispose', 'Dans initState', 'Nulle part, Dart s’en charge'],
          1,
          'dispose libère les ressources quand le widget disparaît. Sans ça, fuite de mémoire.',
        ),
        vf(
          'initState est appelée à chaque reconstruction de l’écran.',
          false,
          'initState n’est appelée qu’une seule fois, à la création du State. C’est build qui est rappelée.',
        ),
        tip(
          'Attention après un await',
          'Un piège classique : on lance un chargement, l’utilisateur quitte l’écran pendant l’attente, puis le code appelle setState sur un State qui n’existe plus. Flutter signale alors une erreur.\n\nLa parade : après chaque await, vérifier mounted (dans un State) ou context.mounted avant d’utiliser setState ou le context. Si l’écran a disparu, on s’arrête là.\n\nMême réflexe avec un Timer.periodic ou un abonnement : on les annule dans dispose pour qu’ils ne déclenchent plus rien.',
          'Future<void> charger() async {\n  final offres = await api.offres();\n  if (!mounted) return; // l’écran a été quitté\n  setState(() => _offres = offres);\n}',
        ),
        fill(
          'Arrête-toi si l’écran a été quitté pendant l’attente.',
          'final data = await api.profil();\nif (!___) return;\nsetState(() => profil = data);',
          ['mounted', 'visible', 'alive', 'active'],
          'mounted',
          'mounted vaut false dès que le State a été retiré de l’arbre.',
        ),
        qcm(
          'Quelle méthode est appelée quand le parent reconstruit le widget avec de nouveaux paramètres ?',
          ['initState', 'dispose', 'deactivate', 'didUpdateWidget'],
          3,
          'didUpdateWidget reçoit l’ancien widget : on compare, et on relance un chargement si un identifiant a changé.',
        ),
        match('Associe chaque méthode à ce qu’on y fait.', [
          ['initState', 'Créer les contrôleurs, premier chargement'],
          ['build', 'Décrire l’interface'],
          ['didUpdateWidget', 'Réagir à de nouveaux paramètres'],
          ['dispose', 'Libérer contrôleurs et abonnements'],
        ]),
      ]),

      lesson('etat-partage', 'Partager l’état entre widgets', [
        tip(
          'Remonter l’état',
          'Quand deux widgets ont besoin de la même donnée (une liste de favoris et un badge qui affiche leur nombre), on place l’état dans leur ancêtre commun : c’est « remonter l’état ». Le parent garde la donnée et la passe aux enfants par leurs constructeurs ; les enfants préviennent le parent par un callback, une fonction passée en paramètre (onChanged, onAjouter…).\n\nCe schéma suffit pour beaucoup d’écrans. Il devient lourd quand la donnée doit traverser cinq niveaux de widgets juste pour arriver en bas.\n\nPour aller plus loin sans paquet externe, Flutter fournit :\n• ValueNotifier<T> : une valeur unique qui prévient quand elle change, écoutée par ValueListenableBuilder.\n• ChangeNotifier : une classe à toi qui appelle notifyListeners() après une modification, écoutée par ListenableBuilder.\n\nSeule la partie dans le builder est reconstruite, pas tout l’écran.',
          "final panier = ValueNotifier<int>(0);\n\nValueListenableBuilder<int>(\n  valueListenable: panier,\n  builder: (context, nombre, _) => Badge(\n    label: Text('$nombre'),\n    child: const Icon(Icons.shopping_cart),\n  ),\n);\n\n// Ailleurs :\npanier.value++;",
        ),
        qcm(
          'Deux widgets frères affichent la même donnée. Où placer l’état ?',
          [
            'Dans le premier frère',
            'Dans une variable globale',
            'Dans leur ancêtre commun',
            'Dans chacun, en copie',
          ],
          2,
          'L’ancêtre commun garde la donnée et la transmet ; les enfants le préviennent par callback.',
        ),
        fill(
          'Prévient les écouteurs après la modification.',
          'class Panier extends ChangeNotifier {\n  final articles = <String>[];\n  void ajouter(String a) {\n    articles.add(a);\n    ___();\n  }\n}',
          ['notifyListeners', 'setState', 'refresh', 'emit'],
          'notifyListeners',
          'notifyListeners déclenche la reconstruction des ListenableBuilder abonnés.',
        ),
        vf(
          'Avec ValueListenableBuilder, seule la partie dans builder est reconstruite quand la valeur change.',
          true,
          'Le reste de l’écran n’est pas touché : c’est plus efficace qu’un setState en haut de l’arbre.',
        ),
        tip(
          'Provider, Riverpod et compagnie',
          'Pour une app plus grande, on utilise souvent une solution de gestion d’état. Provider, recommandé dans la documentation Flutter pour débuter, rend un objet (souvent un ChangeNotifier) accessible à tout un sous-arbre : context.watch<Panier>() lit et s’abonne, context.read<Panier>() lit sans s’abonner, par exemple dans un onPressed.\n\nRiverpod et Bloc sont d’autres choix répandus, chacun avec sa philosophie. Il n’y a pas de vainqueur absolu : commence avec setState et ValueNotifier, et passe à un outil plus riche quand le partage d’état devient pénible.',
          "// Avec le paquet provider\nChangeNotifierProvider(\n  create: (_) => Panier(),\n  child: const MonApp(),\n);\n\n// Dans un widget :\nfinal n = context.watch<Panier>().articles.length;\n// Dans un onPressed :\ncontext.read<Panier>().ajouter('riz');",
        ),
        qcm(
          'Dans un onPressed, quelle méthode de Provider utiliser pour appeler panier.ajouter ?',
          [
            'context.watch<Panier>()',
            'context.read<Panier>()',
            'Panier.of(context)',
            'setState(Panier)',
          ],
          1,
          'Dans un callback, on n’a pas besoin de s’abonner : read suffit. watch est pour build.',
        ),
        match('Associe chaque outil à son usage.', [
          ['Callback', 'Un enfant prévient son parent'],
          ['ValueNotifier', 'Une valeur unique observable'],
          ['ChangeNotifier', 'Un modèle qui appelle notifyListeners'],
          ['Provider', 'Rendre un objet accessible au sous-arbre'],
        ]),
        order(
          'Remets dans l’ordre : un enfant prévient son parent par un callback.',
          [
            'class Etoile extends StatelessWidget {',
            '  const Etoile({super.key, required this.onTap});',
            '  final VoidCallback onTap;',
            '  @override',
            '  Widget build(BuildContext context) =>',
            '      IconButton(icon: const Icon(Icons.star), onPressed: onTap);',
            '}',
          ],
          'L’enfant ne garde pas d’état : il appelle la fonction reçue, et c’est le parent qui fait setState.',
        ),
      ]),
    ],
  ),

  // ─── Unité 4 : navigation et formulaires ───────────────────────────────────
  unit(
    'navigation',
    'Navigation et formulaires',
    'Passer d’un écran à l’autre avec Navigator ou go_router, transmettre des données, et valider un formulaire avant de l’envoyer.',
    [
      lesson('navigation', 'Changer d’écran avec Navigator', [
        tip(
          'Une pile d’écrans',
          'Navigator gère une pile d’écrans (des routes). push ouvre un nouvel écran par-dessus, pop retire celui du dessus et revient au précédent. Le bouton ou le geste retour du téléphone fait un pop automatiquement, et l’AppBar affiche une flèche retour dès qu’il y a un écran en dessous.\n\nMaterialPageRoute construit l’écran avec la transition adaptée à la plateforme.\n\nPour transmettre des données, on les passe simplement au constructeur de l’écran suivant : DetailOffre(offre: o). Pas de variable globale.\n\nUn écran peut aussi renvoyer un résultat : push renvoie un Future, qu’on attend avec await ; l’autre écran le fournit avec Navigator.pop(context, valeur).\n\nAutres méthodes utiles :\n• pushReplacement remplace l’écran actuel (après la connexion, on ne veut pas revenir au formulaire).\n• popUntil revient plusieurs écrans en arrière.',
          'final confirme = await Navigator.push<bool>(\n  context,\n  MaterialPageRoute(builder: (_) => ConfirmerCommande(commande: c)),\n);\nif (confirme == true) {\n  // ...\n}\n\n// Dans ConfirmerCommande :\nNavigator.pop(context, true);',
        ),
        qcm(
          'Quelle méthode revient à l’écran précédent ?',
          ['Navigator.back', 'Navigator.close', 'Navigator.pop', 'Navigator.exit'],
          2,
          'pop retire l’écran du dessus de la pile.',
        ),
        fill(
          'Ouvre l’écran de détail.',
          'Navigator.___(context, MaterialPageRoute(builder: (_) => Detail()));',
          ['open', 'push', 'go', 'show'],
          'push',
          'push empile un nouvel écran.',
        ),
        vf(
          'Les écrans forment une pile : le dernier ouvert est au-dessus.',
          true,
          'D’où les noms push (empiler) et pop (dépiler).',
        ),
        qcm(
          'Comment passer une offre à l’écran de détail ?',
          [
            'Par une variable globale',
            'Par le constructeur : DetailOffre(offre: o)',
            'Impossible, chaque écran recharge tout',
            'Par Navigator.data',
          ],
          1,
          'Les paramètres du constructeur transmettent les données proprement et sont typés.',
        ),
        qcm(
          'Après la connexion, quelle méthode empêche de revenir au formulaire avec le bouton retour ?',
          ['Navigator.push', 'Navigator.pop', 'Navigator.maybePop', 'Navigator.pushReplacement'],
          3,
          'pushReplacement remplace l’écran actuel au lieu d’empiler par-dessus.',
        ),
        order(
          'Remets dans l’ordre : ouvrir un écran et récupérer sa réponse.',
          [
            'final choix = await Navigator.push<String>(',
            '  context,',
            '  MaterialPageRoute(builder: (_) => const ChoixVille()),',
            ');',
            "print(choix ?? 'aucune ville');",
          ],
          'push renvoie un Future ; il vaut null si l’utilisateur revient sans choisir.',
        ),
        vf(
          'Si l’utilisateur revient avec le bouton retour, le résultat attendu de push vaut null.',
          true,
          'Aucune valeur n’a été passée à pop : d’où le type nullable et la valeur de secours.',
        ),
      ]),

      lesson('go-router', 'Des routes avec go_router', [
        tip(
          'Naviguer par adresse',
          'Le paquet go_router, publié par l’équipe Flutter, décrit la navigation comme des adresses : /, /offres, /offres/42. C’est utile dès que l’app grandit, et indispensable pour les liens profonds (un lien reçu par message qui ouvre directement la bonne offre) et pour Flutter web, où l’adresse s’affiche dans le navigateur.\n\nOn déclare un GoRouter avec la liste des routes, puis on le passe à MaterialApp.router(routerConfig: ...). Un segment qui commence par deux-points est un paramètre : /offres/:id. On le lit avec state.pathParameters[’id’]. Les paramètres après ? se lisent avec state.uri.queryParameters.\n\nPour naviguer :\n• context.go(’/offres/42’) va à cette adresse et reconstruit la pile qui y correspond ;\n• context.push(’/offres/42’) empile l’écran par-dessus l’actuel ;\n• context.pop() revient en arrière.\n\nredirect permet de renvoyer vers /connexion un utilisateur non connecté, à un seul endroit.',
          "final router = GoRouter(\n  routes: [\n    GoRoute(\n      path: '/',\n      builder: (context, state) => const Accueil(),\n      routes: [\n        GoRoute(\n          path: 'offres/:id',\n          builder: (context, state) =>\n              DetailOffre(id: state.pathParameters['id']!),\n        ),\n      ],\n    ),\n  ],\n);\n\nvoid main() => runApp(MaterialApp.router(routerConfig: router));",
        ),
        fill(
          'Branche le routeur sur l’app.',
          'MaterialApp.router(___: router)',
          ['routerConfig', 'routes', 'navigator', 'home'],
          'routerConfig',
          'MaterialApp.router reçoit la configuration du GoRouter dans routerConfig.',
        ),
        qcm(
          'Comment lire l’identifiant 42 dans la route /offres/:id ?',
          [
            "state.pathParameters['id']",
            "state.uri.queryParameters['id']",
            "context.params['id']",
            'state.extra',
          ],
          0,
          'Les segments :nom sont des paramètres de chemin. queryParameters sert pour ?id=42.',
        ),
        qcm(
          'Quelle est la différence entre context.go et context.push ?',
          [
            'Aucune, ce sont des alias',
            'go est plus rapide',
            'push ne marche que sur le web',
            'go va à l’adresse et reconstruit la pile, push empile par-dessus l’écran actuel',
          ],
          3,
          'Avec go, la pile correspond à l’adresse ; avec push, on garde l’écran actuel en dessous.',
        ),
        vf(
          'go_router facilite les liens profonds qui ouvrent directement un écran précis de l’app.',
          true,
          'Chaque écran a une adresse : un lien externe peut y mener directement.',
        ),
        match('Associe chaque élément de go_router à son rôle.', [
          ['GoRoute', 'Associer une adresse à un écran'],
          [':id', 'Un paramètre dans l’adresse'],
          ['redirect', 'Renvoyer ailleurs, par exemple vers /connexion'],
          ['context.pop()', 'Revenir en arrière'],
        ]),
        fill(
          'Va à la page de l’offre 7, en remplaçant la pile.',
          "context.___('/offres/7');",
          ['go', 'push', 'open', 'navigate'],
          'go',
          'context.go reconstruit la pile qui correspond à l’adresse.',
        ),
      ]),

      lesson('formulaires', 'Formulaires et validation', [
        tip(
          'Form et TextFormField',
          'Pour un formulaire de plusieurs champs (inscription, candidature), on entoure les champs d’un Form, et on utilise TextFormField à la place de TextField.\n\nChaque TextFormField reçoit un validator : une fonction qui reçoit la valeur et renvoie un message d’erreur (String) si elle n’est pas valide, ou null si tout va bien. Le message s’affiche sous le champ.\n\nLe Form est piloté par une clé : final _formKey = GlobalKey<FormState>(); créée une seule fois dans le State. Au clic sur « Envoyer », _formKey.currentState!.validate() lance tous les validators et renvoie true seulement si tous sont passés. save() appelle ensuite le onSaved de chaque champ.\n\nautovalidateMode: AutovalidateMode.onUserInteraction revalide pendant la saisie, une fois que l’utilisateur a touché le champ.\n\nRappel : la validation côté app améliore le confort, mais le serveur doit toujours revérifier, car une requête peut être envoyée sans passer par l’app.',
          "final _formKey = GlobalKey<FormState>();\n\nForm(\n  key: _formKey,\n  child: Column(children: [\n    TextFormField(\n      decoration: const InputDecoration(labelText: 'E-mail'),\n      keyboardType: TextInputType.emailAddress,\n      validator: (v) =>\n          (v == null || !v.contains('@')) ? 'E-mail invalide' : null,\n    ),\n    FilledButton(\n      onPressed: () {\n        if (_formKey.currentState!.validate()) envoyer();\n      },\n      child: const Text('Envoyer'),\n    ),\n  ]),\n)",
        ),
        qcm(
          'Que doit renvoyer un validator quand la valeur est correcte ?',
          ['true', 'Une chaîne vide', 'null', 'La valeur elle-même'],
          2,
          'null signifie « pas d’erreur ». Une String, même vide, est traitée comme un message d’erreur.',
        ),
        fill(
          'Lance la validation de tous les champs.',
          'if (_formKey.currentState!.___()) {\n  envoyer();\n}',
          ['check', 'validate', 'submit', 'verify'],
          'validate',
          'validate() appelle chaque validator et renvoie true si aucun n’a renvoyé d’erreur.',
        ),
        vf(
          'Si l’app valide déjà le formulaire, le serveur n’a pas besoin de revérifier les données.',
          false,
          'N’importe qui peut appeler l’API sans passer par l’app : le serveur doit toujours valider.',
        ),
        qcm(
          'Quel type de clé pilote un Form ?',
          ['ValueKey<String>', 'UniqueKey', 'GlobalKey<FormState>', 'ObjectKey'],
          2,
          'GlobalKey<FormState> donne accès à l’état du Form : validate, save, reset.',
        ),
        order(
          'Remets dans l’ordre le traitement de l’envoi.',
          [
            'final form = _formKey.currentState!;',
            'if (!form.validate()) return;',
            'form.save();',
            'await api.inscrire(email);',
          ],
          'On valide, on enregistre les valeurs avec save, puis on envoie.',
        ),
        match('Associe chaque élément à son rôle.', [
          ['validator', 'Renvoyer un message d’erreur ou null'],
          ['onSaved', 'Récupérer la valeur au moment de save()'],
          ['AutovalidateMode.onUserInteraction', 'Revalider pendant la saisie'],
          ['InputDecoration', 'Libellé, icône et aide du champ'],
        ]),
        vf(
          'La GlobalKey du formulaire doit être créée dans build pour être à jour.',
          false,
          'Recréée à chaque build, elle ferait perdre l’état du formulaire. On la crée une fois, comme champ du State.',
        ),
      ]),
    ],
  ),

  // ─── Unité 5 : données distantes et stockage local ─────────────────────────
  unit(
    'donnees',
    'Données distantes et hors ligne',
    'Appeler une API avec le paquet http, transformer le JSON en objets Dart, afficher chargement et erreurs, et garder des données sur le téléphone pour le mode hors ligne.',
    [
      lesson('http', 'Appeler une API', [
        tip(
          'Le paquet http',
          'Le paquet http s’ajoute avec flutter pub add http, puis s’importe avec un préfixe : import ’package:http/http.dart’ as http;\n\nUne requête renvoie un Future<http.Response> : on l’attend avec await dans une fonction async. La réponse a un statusCode (200 pour OK, 201 pour une création, 404 introuvable, 500 erreur du serveur…) et un body, le texte de la réponse.\n\nLes étapes d’un appel propre :\n• construire l’adresse avec Uri.parse ou Uri.https ;\n• envoyer la requête, avec un délai maximum (.timeout) : sur un réseau mobile lent, mieux vaut abandonner que d’attendre sans fin ;\n• vérifier le code de statut avant de lire le corps ;\n• décoder le JSON avec jsonDecode, de dart:convert.\n\nPour envoyer des données, http.post reçoit des headers et un body encodé avec jsonEncode.\n\nSur Android, une app publiée doit déclarer la permission INTERNET dans android/app/src/main/AndroidManifest.xml. En mode debug elle est ajoutée automatiquement : c’est un oubli classique qui casse l’app seulement une fois publiée.',
          "import 'dart:convert';\nimport 'package:http/http.dart' as http;\n\nFuture<List<dynamic>> chargerOffres() async {\n  final res = await http\n      .get(Uri.parse('https://api.exemple.com/offres'))\n      .timeout(const Duration(seconds: 10));\n  if (res.statusCode != 200) {\n    throw Exception('Erreur ${res.statusCode}');\n  }\n  return jsonDecode(res.body) as List<dynamic>;\n}",
        ),
        fill(
          'Attends la réponse.',
          'final res = ___ http.get(url);',
          ['async', 'await', 'wait', 'then'],
          'await',
          'await attend la fin de la requête, dans une fonction async.',
        ),
        qcm(
          'Comment s’ajoute le paquet http à un projet Flutter ?',
          ['npm install http', 'pip install http', 'flutter pub add http', 'flutter install http'],
          2,
          'pub est le gestionnaire de paquets de Dart et Flutter ; la commande met aussi pubspec.yaml à jour.',
        ),
        vf(
          'Un code de statut 404 lève automatiquement une exception avec le paquet http.',
          false,
          'http ne lève pas d’exception pour un 404 ou un 500 : c’est à toi de tester statusCode.',
        ),
        order(
          'Remets l’appel réseau dans l’ordre.',
          [
            'final res = await http.get(url);',
            'if (res.statusCode != 200) throw Exception();',
            'final data = jsonDecode(res.body);',
            'return data;',
          ],
          'Requête, vérification du statut, décodage, retour.',
        ),
        qcm(
          'L’app marche en debug mais n’accède plus au réseau une fois publiée sur Android. Cause probable ?',
          [
            'La permission INTERNET manque dans le manifeste principal',
            'Le paquet http ne marche qu’en debug',
            'jsonDecode est désactivé en release',
            'Le téléphone est trop ancien',
          ],
          0,
          'Les manifestes debug et profile ajoutent INTERNET, pas le manifeste principal utilisé en release.',
        ),
        fill(
          'Encode les données en JSON pour les envoyer.',
          "await http.post(\n  url,\n  headers: {'Content-Type': 'application/json'},\n  body: ___(candidature),\n);",
          ['jsonEncode', 'jsonDecode', 'toString', 'JSON.stringify'],
          'jsonEncode',
          'jsonEncode transforme une Map (ou un objet avec toJson) en texte JSON.',
        ),
        match('Associe chaque code HTTP à son sens.', [
          ['200', 'OK'],
          ['201', 'Ressource créée'],
          ['401', 'Non authentifié'],
          ['404', 'Introuvable'],
          ['500', 'Erreur du serveur'],
        ]),
      ]),

      lesson('json', 'Du JSON aux objets Dart', [
        tip(
          'Des modèles typés',
          'jsonDecode renvoie des valeurs dynamic : des Map<String, dynamic> et des List<dynamic>. Manipuler ça partout dans l’app, c’est s’exposer aux fautes de frappe (json[’titr’]) et aux erreurs de type découvertes trop tard.\n\nLa bonne pratique : convertir le JSON en objets Dart dès sa réception, dans une classe modèle. Par convention :\n• un constructeur factory Offre.fromJson(Map<String, dynamic> json) lit et vérifie chaque champ ;\n• une méthode toJson() fait le chemin inverse, et jsonEncode l’appelle automatiquement.\n\nAvec Dart 3, les patterns rendent la lecture plus sûre : un switch sur la Map vérifie d’un coup la présence et le type de chaque champ, et on lève une FormatException claire si le JSON n’a pas la forme attendue.\n\nPour de gros modèles, des générateurs de code comme json_serializable ou freezed écrivent fromJson et toJson à ta place.',
          "class Offre {\n  const Offre({required this.id, required this.titre, this.salaire});\n  final int id;\n  final String titre;\n  final int? salaire;\n\n  factory Offre.fromJson(Map<String, dynamic> json) => switch (json) {\n        {'id': int id, 'titre': String titre} => Offre(\n            id: id,\n            titre: titre,\n            salaire: json['salaire'] as int?,\n          ),\n        _ => throw const FormatException('Offre mal formée'),\n      };\n\n  Map<String, dynamic> toJson() => {'id': id, 'titre': titre, 'salaire': salaire};\n}",
        ),
        qcm(
          'Quel type renvoie jsonDecode ?',
          ['Map<String, String>', 'String', 'Offre', 'dynamic'],
          3,
          'jsonDecode renvoie dynamic : une Map, une List, un nombre, une chaîne… selon le JSON.',
        ),
        fill(
          'Complète la déclaration du constructeur qui crée une Offre depuis le JSON.',
          "___ Offre.fromJson(Map<String, dynamic> json) {\n  return Offre(id: json['id'] as int, titre: json['titre'] as String);\n}",
          ['factory', 'static', 'new', 'const'],
          'factory',
          'Un constructeur factory peut calculer et renvoyer l’objet : c’est la forme classique de fromJson.',
        ),
        vf(
          'jsonEncode(offre) appelle automatiquement offre.toJson() si la méthode existe.',
          true,
          'jsonEncode utilise toJson() pour tout objet qui n’est pas déjà une Map, une List, une chaîne, un nombre, un bool ou null.',
        ),
        qcm(
          'Comment transformer une liste JSON en List<Offre> ?',
          [
            'liste as List<Offre>',
            'liste.map((e) => Offre.fromJson(e as Map<String, dynamic>)).toList()',
            'Offre.fromJson(liste)',
            'jsonDecode(liste, Offre)',
          ],
          1,
          'Un simple cast échoue à l’exécution : il faut convertir chaque élément avec fromJson.',
        ),
        vf(
          'Garder des Map<String, dynamic> dans toute l’app est aussi sûr que des classes modèles.',
          false,
          'Avec des Map, les fautes de clé et de type ne sont découvertes qu’à l’exécution. Un modèle typé les fait remonter au compilateur.',
        ),
        match('Associe chaque outil à son rôle.', [
          ['jsonDecode', 'Texte JSON vers valeurs Dart'],
          ['jsonEncode', 'Valeurs Dart vers texte JSON'],
          ['fromJson', 'Construire un modèle depuis une Map'],
          ['json_serializable', 'Générer fromJson et toJson'],
        ]),
        qcm(
          'Le champ salaire peut manquer dans le JSON. Quel type lui donner ?',
          ['int', 'int?', 'dynamic', 'String'],
          1,
          'int? accepte null : json[’salaire’] as int? ne plante pas si la clé est absente.',
        ),
      ]),

      lesson('futurebuilder', 'Chargement, erreur et données', [
        tip(
          'FutureBuilder',
          'Un écran qui charge des données a toujours au moins trois états : en chargement, en erreur, et chargé (parfois aussi : chargé mais vide). Sur un réseau mobile lent ou coupé, l’utilisateur doit toujours savoir ce qui se passe.\n\nFutureBuilder construit l’interface à partir d’un Future. Son builder reçoit un AsyncSnapshot :\n• snapshot.connectionState == ConnectionState.waiting : afficher un CircularProgressIndicator ;\n• snapshot.hasError : afficher snapshot.error et un bouton « Réessayer » ;\n• snapshot.hasData : afficher snapshot.data.\n\nPiège majeur : ne crée pas le Future dans build (future: api.offres()). Comme build est appelée souvent, la requête serait relancée à chaque reconstruction. Crée-le dans initState, garde-le dans un champ, et remplace-le dans setState pour recharger.\n\nRefreshIndicator ajoute le geste « tirer pour rafraîchir » : son onRefresh doit renvoyer un Future.',
          "late Future<List<Offre>> _offres;\n\n@override\nvoid initState() {\n  super.initState();\n  _offres = api.offres();\n}\n\n@override\nWidget build(BuildContext context) {\n  return FutureBuilder<List<Offre>>(\n    future: _offres,\n    builder: (context, snapshot) {\n      if (snapshot.connectionState == ConnectionState.waiting) {\n        return const Center(child: CircularProgressIndicator());\n      }\n      if (snapshot.hasError) {\n        return Text('Erreur : ${snapshot.error}');\n      }\n      final offres = snapshot.data!;\n      if (offres.isEmpty) return const Text('Aucune offre pour le moment');\n      return ListeOffres(offres: offres);\n    },\n  );\n}",
        ),
        qcm(
          'Quel widget construit l’interface à partir d’un Future ?',
          ['StreamView', 'AsyncWidget', 'LoaderBuilder', 'FutureBuilder'],
          3,
          'FutureBuilder reconstruit l’écran quand le Future change d’état.',
        ),
        vf(
          'Écrire future: api.offres() directement dans build est une bonne pratique.',
          false,
          'La requête serait relancée à chaque reconstruction. On crée le Future dans initState.',
        ),
        fill(
          'Affiche un indicateur pendant le chargement.',
          'if (snapshot.connectionState == ConnectionState.___) {\n  return const CircularProgressIndicator();\n}',
          ['waiting', 'loading', 'pending', 'none'],
          'waiting',
          'ConnectionState.waiting : le Future n’est pas encore terminé.',
        ),
        qcm(
          'Comment recharger les données après un appui sur « Réessayer » ?',
          [
            'Appeler build() directement',
            'Remplacer le Future dans setState : setState(() => _offres = api.offres())',
            'Relancer l’app',
            'Appeler snapshot.reload()',
          ],
          1,
          'Un nouveau Future dans setState relance FutureBuilder, qui repasse par l’état de chargement.',
        ),
        vf(
          'Il faut prévoir un état de chargement et un état d’erreur pour chaque appel réseau.',
          true,
          'Sur un réseau mobile lent, un écran blanc sans explication fait fuir l’utilisateur.',
        ),
        match('Associe chaque cas à ce qu’il faut afficher.', [
          ['ConnectionState.waiting', 'Un indicateur de chargement'],
          ['snapshot.hasError', 'Un message et un bouton Réessayer'],
          ['Liste vide', 'Un message « rien pour le moment »'],
          ['snapshot.hasData', 'Les données'],
        ]),
        fill(
          'Ajoute le geste « tirer pour rafraîchir ».',
          '___(\n  onRefresh: recharger,\n  child: ListView(children: cartes),\n)',
          ['RefreshIndicator', 'PullToRefresh', 'Reloader', 'SwipeRefresh'],
          'RefreshIndicator',
          'RefreshIndicator appelle onRefresh et affiche l’indicateur jusqu’à la fin du Future.',
        ),
      ]),

      lesson('stockage', 'Stockage local et hors ligne', [
        tip(
          'shared_preferences pour les petits réglages',
          'Certaines données doivent survivre à la fermeture de l’app : le thème choisi, la langue, un écran d’accueil déjà vu, la dernière ville recherchée.\n\nLe paquet shared_preferences garde des paires clé → valeur simples : String, int, double, bool et List<String>. Il s’appuie sur les mécanismes natifs de chaque plateforme.\n\nLes lectures renvoient un type nullable (getString renvoie String?) : la clé peut ne pas encore exister, d’où l’usage de ?? pour une valeur par défaut. Les écritures renvoient un Future.\n\nLe paquet propose une API historique, SharedPreferences.getInstance(), et des API plus récentes, SharedPreferencesAsync et SharedPreferencesWithCache, recommandées pour le nouveau code. Le principe reste le même.\n\nCe qu’il ne faut pas y mettre :\n• un jeton de connexion ou un mot de passe : ces données ne sont pas chiffrées. Pour les secrets, utilise flutter_secure_storage, qui passe par le Keychain d’iOS et le Keystore d’Android ;\n• de grandes quantités de données structurées : pour ça, une base SQLite avec sqflite ou drift.',
          "final prefs = SharedPreferencesAsync();\nawait prefs.setString('theme', 'sombre');\nawait prefs.setBool('accueilVu', true);\n\nfinal theme = await prefs.getString('theme') ?? 'clair';",
        ),
        qcm(
          'Que renvoie getString pour une clé jamais enregistrée ?',
          ['Une chaîne vide', 'null', 'Une exception', '’undefined’'],
          1,
          'Le type de retour est String? : on prévoit une valeur par défaut avec ??.',
        ),
        vf(
          'shared_preferences est un bon endroit pour stocker un jeton de connexion.',
          false,
          'Les données n’y sont pas chiffrées. Pour un jeton, utilise flutter_secure_storage.',
        ),
        fill(
          'Enregistre que l’utilisateur a vu l’écran d’accueil.',
          "await prefs.___('accueilVu', true);",
          ['setBool', 'putBool', 'save', 'setString'],
          'setBool',
          'Chaque type a sa méthode : setBool, setInt, setDouble, setString, setStringList.',
        ),
        tip(
          'Penser hors ligne',
          'Sur mobile, la connexion se coupe : dans un taxi, en zone rurale, quand le forfait est épuisé. Une app qui affiche un écran vide dès que le réseau tombe donne une mauvaise impression.\n\nUne stratégie simple et efficace, souvent appelée « cache puis réseau » :\n• à l’ouverture, afficher tout de suite la dernière copie enregistrée sur le téléphone ;\n• lancer la requête en arrière-plan ;\n• si elle réussit, mettre à jour l’écran et le cache ; si elle échoue, garder la copie et signaler discrètement qu’elle peut être ancienne.\n\nPour les actions faites hors ligne (un message, un formulaire), on peut les mettre en file d’attente localement et les envoyer au retour du réseau.\n\nRetiens aussi qu’un appel réseau peut échouer même quand le téléphone se dit connecté : traite toujours l’erreur, plutôt que de seulement vérifier l’état de la connexion avant d’appeler.',
          'Future<List<Offre>> offres() async {\n  try {\n    final fraiches = await api.offres();\n    await cache.enregistrer(fraiches);\n    return fraiches;\n  } catch (_) {\n    return cache.lire(); // dernière copie connue\n  }\n}',
        ),
        order(
          'Remets dans l’ordre la stratégie « cache puis réseau ».',
          [
            'Afficher la copie locale',
            'Lancer la requête réseau',
            'Mettre à jour l’écran et le cache si elle réussit',
            'Sinon, garder la copie et signaler qu’elle peut être ancienne',
          ],
          'L’utilisateur voit quelque chose tout de suite, même sans réseau.',
        ),
        match('Associe chaque besoin à l’outil adapté.', [
          ['Le thème choisi', 'shared_preferences'],
          ['Un jeton de connexion', 'flutter_secure_storage'],
          ['Des milliers de messages à filtrer', 'Une base SQLite (sqflite, drift)'],
          ['Une image téléchargée', 'Un fichier sur le disque'],
        ]),
        qcm(
          'Le téléphone indique « connecté ». Faut-il quand même gérer l’échec de la requête ?',
          [
            'Non, la requête réussira forcément',
            'Seulement sur iOS',
            'Seulement si le serveur est en panne connue',
            'Oui : le réseau peut être lent, filtré ou sans accès à Internet',
          ],
          3,
          'Être connecté à un réseau ne garantit pas d’atteindre ton serveur. On traite toujours l’erreur.',
        ),
      ]),
    ],
  ),

  // ─── Unité 6 : tests et publication ────────────────────────────────────────
  unit(
    'publier',
    'Tester et publier',
    'Organiser un projet, écrire des tests unitaires et de widgets, compiler une version signée et publier sur le Play Store et l’App Store.',
    [
      lesson('projet', 'Organiser un projet Flutter', [
        tip(
          'La structure d’un projet',
          'flutter create mon_app génère tout le projet. Les dossiers à connaître :\n• lib/ contient ton code Dart ; le point d’entrée est lib/main.dart.\n• test/ contient les tests automatiques.\n• android/ et ios/ sont les projets natifs : on y touche pour les permissions, l’icône, la signature.\n• pubspec.yaml décrit le nom, la version, les dépendances et les ressources (images, polices).\n\nflutter pub get télécharge les dépendances listées ; flutter pub add nom_du_paquet en ajoute une. flutter doctor vérifie que ton environnement est complet (SDK Android, licences, Xcode sur Mac).\n\nflutter run lance l’app sur un téléphone branché ou un émulateur. Pendant qu’elle tourne :\n• r déclenche le rechargement à chaud (hot reload) : le code modifié est injecté et l’état de l’écran est conservé ;\n• R déclenche le redémarrage à chaud (hot restart) : l’app repart de main() et l’état est perdu.\n\nflutter analyze signale les erreurs et les mauvaises pratiques selon les règles d’analysis_options.yaml. Lance-le avant chaque commit.',
          'flutter create mon_app\ncd mon_app\nflutter pub add http\nflutter run\n\n# Dans l’app lancée :\n#   r  rechargement à chaud (état conservé)\n#   R  redémarrage à chaud (état perdu)',
        ),
        match('Associe chaque élément à son rôle.', [
          ['lib/main.dart', 'Le point d’entrée de l’app'],
          ['pubspec.yaml', 'Dépendances, version et ressources'],
          ['android/', 'Le projet natif Android'],
          ['test/', 'Les tests automatiques'],
        ]),
        qcm(
          'Quelle commande lance l’app sur l’appareil connecté ?',
          ['flutter start', 'dart serve', 'flutter launch', 'flutter run'],
          3,
          'flutter run compile et installe l’app sur le téléphone ou l’émulateur.',
        ),
        vf(
          'Le rechargement à chaud applique tes changements sans relancer l’app.',
          true,
          'Et l’état de l’écran est conservé : on itère très vite. initState et main() ne sont pas rejoués.',
        ),
        fill(
          'Crée un nouveau projet.',
          'flutter ___ ma_boutique',
          ['new', 'init', 'create', 'start'],
          'create',
          'flutter create génère toute la structure.',
        ),
        qcm(
          'Quelle commande vérifie que ton environnement est bien installé ?',
          ['flutter check', 'flutter doctor', 'flutter test', 'flutter env'],
          1,
          'flutter doctor liste ce qui manque (SDK Android, licences, Xcode…).',
        ),
        qcm(
          'Tu as modifié initState et le changement n’apparaît pas après un hot reload. Que faire ?',
          [
            'Un hot restart (R) pour repartir de zéro',
            'Supprimer le dossier lib/',
            'Lancer flutter pub get',
            'Rien, c’est un bug de Flutter',
          ],
          0,
          'Le hot reload garde l’état existant : initState n’est pas rappelée. Le hot restart repart de main().',
        ),
        vf(
          'flutter analyze vérifie le code sans lancer l’app.',
          true,
          'C’est une analyse statique : erreurs, avertissements et règles de style, en quelques secondes.',
        ),
      ]),

      lesson('tests', 'Tests unitaires et de widgets', [
        tip(
          'Tester la logique',
          'Un test automatique vérifie qu’un morceau de code fait ce qu’on attend, à chaque modification, sans tout recliquer à la main. Les tests vivent dans test/, dans des fichiers qui finissent par _test.dart, et se lancent avec flutter test.\n\nTrois niveaux :\n• le test unitaire vérifie une fonction ou une classe seule (un calcul de prix, fromJson). Il est très rapide ;\n• le test de widget construit un widget dans un environnement simulé et interagit avec lui ;\n• le test d’intégration (paquet integration_test) lance l’app entière sur un vrai appareil ou un émulateur.\n\nUn test unitaire s’écrit avec test(’description’, () { ... }) et expect(valeurReelle, valeurAttendue). group regroupe des tests liés.\n\nPour ne pas dépendre du réseau, on remplace le vrai client par un faux : le paquet http fournit MockClient (package:http/testing.dart), qui renvoie la réponse que tu choisis.',
          "import 'package:flutter_test/flutter_test.dart';\n\nvoid main() {\n  group('Offre.fromJson', () {\n    test('lit le titre', () {\n      final o = Offre.fromJson({'id': 1, 'titre': 'Dev Flutter'});\n      expect(o.titre, 'Dev Flutter');\n    });\n\n    test('refuse un JSON incomplet', () {\n      expect(() => Offre.fromJson({}), throwsFormatException);\n    });\n  });\n}",
        ),
        qcm(
          'Quelle commande lance les tests d’un projet Flutter ?',
          ['flutter check', 'dart run tests', 'flutter test', 'flutter verify'],
          2,
          'flutter test exécute tous les fichiers *_test.dart du dossier test/.',
        ),
        fill(
          'Vérifie que le total vaut 5000.',
          "test('total du panier', () {\n  ___(panier.total, 5000);\n});",
          ['expect', 'assert', 'check', 'should'],
          'expect',
          'expect(réel, attendu) fait échouer le test si les deux diffèrent.',
        ),
        tip(
          'Tester un widget',
          'testWidgets reçoit un WidgetTester. On construit le widget avec await tester.pumpWidget(...), en l’entourant de MaterialApp s’il a besoin d’un thème ou d’un Navigator.\n\nPour trouver un élément : find.text(’1’), find.byIcon(Icons.add), find.byType(TextField), find.byKey(...). On vérifie avec des matchers : findsOneWidget, findsNothing, findsNWidgets(3).\n\nPour interagir : tester.tap(...), tester.enterText(...). Après une action, il faut appeler await tester.pump() pour que Flutter reconstruise l’écran, ou pumpAndSettle() pour attendre la fin des animations.',
          "testWidgets('le compteur augmente', (tester) async {\n  await tester.pumpWidget(const MaterialApp(home: Compteur()));\n  expect(find.text('Cliqué 0 fois'), findsOneWidget);\n\n  await tester.tap(find.byType(TextButton));\n  await tester.pump();\n\n  expect(find.text('Cliqué 1 fois'), findsOneWidget);\n});",
        ),
        order(
          'Remets dans l’ordre un test de widget.',
          [
            'await tester.pumpWidget(const MaterialApp(home: Compteur()));',
            'await tester.tap(find.byIcon(Icons.add));',
            'await tester.pump();',
            "expect(find.text('1'), findsOneWidget);",
          ],
          'Construire, agir, reconstruire, vérifier.',
        ),
        vf(
          'Après tester.tap, l’écran est reconstruit automatiquement sans appeler pump.',
          false,
          'Dans un test, le temps ne s’écoule pas tout seul : pump() déclenche la reconstruction.',
        ),
        match('Associe chaque outil de test à son rôle.', [
          ['pumpWidget', 'Construire le widget à tester'],
          ['find.text', 'Chercher un texte affiché'],
          ['findsOneWidget', 'Exactement un élément trouvé'],
          ['pumpAndSettle', 'Attendre la fin des animations'],
          ['MockClient', 'Simuler les réponses du réseau'],
        ]),
        qcm(
          'Quel type de test est le plus rapide et le plus simple à écrire ?',
          [
            'Le test d’intégration sur un vrai téléphone',
            'Le test manuel',
            'Le test de capture d’écran',
            'Le test unitaire',
          ],
          3,
          'Il ne construit aucun écran : on en écrit beaucoup, et quelques tests de widget et d’intégration pour le reste.',
        ),
      ]),

      lesson('build', 'Compiler une version Android', [
        tip(
          'APK, App Bundle et signature',
          'flutter build apk produit un fichier .apk qu’on peut installer directement sur un téléphone, pratique pour des testeurs. Le Play Store, lui, demande un Android App Bundle (.aab), produit par flutter build appbundle. Google en tire ensuite des APK optimisés pour chaque appareil, plus légers à télécharger.\n\nToute version publiée doit être signée. Avec la signature d’application Play (Play App Signing, obligatoire pour les nouvelles apps), Google garde la clé de signature de l’app, et toi une clé d’importation (upload key) qui prouve que les mises à jour viennent bien de toi.\n• On la crée avec keytool, on renseigne son chemin et ses mots de passe dans android/key.properties, et la configuration Gradle de android/app l’utilise pour la version release.\n• Ce fichier et la clé sont des secrets : jamais dans Git. Garde une sauvegarde chiffrée hors du dépôt.\n• Si la clé d’importation est perdue, il faut demander sa réinitialisation à Google via la Play Console : c’est possible, mais ça bloque les mises à jour en attendant.\n\nLa version se règle dans pubspec.yaml : version: 1.2.0+5. Avant le + c’est le nom affiché (versionName), après c’est le numéro de build (versionCode), qui doit augmenter à chaque envoi sur le store.',
          'flutter build apk --release\nflutter build appbundle --release\n# Résultat : build/app/outputs/bundle/release/app-release.aab\n\n# pubspec.yaml\nversion: 1.2.0+5',
        ),
        qcm(
          'Quel format demande le Play Store pour une nouvelle app ?',
          ['APK', 'ZIP', 'Android App Bundle (.aab)', 'IPA'],
          2,
          'Google génère ensuite des APK optimisés pour chaque téléphone. L’IPA est le format iOS.',
        ),
        fill(
          'Construis le paquet pour le Play Store.',
          'flutter build ___ --release',
          ['store', 'appbundle', 'play', 'android'],
          'appbundle',
          'appbundle produit le fichier .aab.',
        ),
        qcm(
          'Dans version: 1.2.0+5, que représente le 5 ?',
          [
            'Le numéro de build, qui doit augmenter à chaque envoi',
            'Le nombre de testeurs',
            'La version minimale d’Android',
            'La version de Flutter utilisée',
          ],
          0,
          '1.2.0 est le nom affiché aux utilisateurs ; 5 devient le versionCode Android et le numéro de build iOS.',
        ),
        vf(
          'Le fichier key.properties et la clé d’importation peuvent être commités dans un dépôt public.',
          false,
          'Ce sont des secrets : ajoute-les au .gitignore et garde une sauvegarde chiffrée.',
        ),
        vf(
          'Avec Play App Signing, c’est Google qui garde la clé de signature finale de l’app.',
          true,
          'Toi, tu signes tes envois avec la clé d’importation ; Google re-signe l’app avant de la distribuer.',
        ),
        order(
          'Remets dans l’ordre la préparation d’une mise à jour Android.',
          [
            'Augmenter le numéro de build dans pubspec.yaml',
            'Lancer flutter test',
            'Lancer flutter build appbundle --release',
            'Envoyer le .aab dans la Play Console',
          ],
          'On vérifie avant de compiler, et le numéro de build doit être nouveau, sinon l’envoi est refusé.',
        ),
        match('Associe chaque fichier à son rôle.', [
          ['.apk', 'Installation directe sur un téléphone'],
          ['.aab', 'Envoi sur le Play Store'],
          ['key.properties', 'Chemin et mots de passe de la clé'],
          ['pubspec.yaml', 'Nom et numéro de version'],
        ]),
      ]),

      lesson('store', 'Play Store et App Store', [
        tip(
          'Publier sur Google Play',
          'Pour publier sur Google Play, il faut un compte développeur Google Play Console : des frais d’inscription uniques de 25 dollars américains. Ensuite :\n• la fiche de l’app : nom, description courte et longue, icône, captures d’écran ;\n• le questionnaire de classification du contenu et le formulaire sur la sécurité des données (quelles données tu collectes et pourquoi) ;\n• une politique de confidentialité accessible en ligne, exigée dès que l’app traite des données personnelles ;\n• les pistes de test : interne, fermé, ouvert, puis production.\n\nPour les comptes personnels créés récemment, Google exige un test fermé avec un nombre minimum de testeurs pendant une durée minimale avant de pouvoir publier en production. Les chiffres exacts évoluent : vérifie-les dans la Play Console au moment de publier.\n\nChaque publication passe par un examen de Google avant d’être visible.',
        ),
        qcm(
          'Combien coûte l’inscription à la Google Play Console ?',
          ['99 dollars par an', 'Gratuit', '25 dollars par mois', '25 dollars, une seule fois'],
          3,
          'Ce sont des frais uniques. Chez Apple, le programme développeur coûte 99 dollars par an.',
        ),
        vf(
          'Une politique de confidentialité est demandée si ton app collecte des données personnelles.',
          true,
          'Elle explique quelles données tu collectes, pourquoi, et comment les supprimer.',
        ),
        order(
          'Remets les étapes de publication dans l’ordre.',
          [
            'Construire l’App Bundle signé',
            'Créer la fiche de l’app',
            'Lancer un test fermé avec des testeurs',
            'Publier en production',
          ],
          'On teste avec un petit groupe avant d’ouvrir à tout le monde.',
        ),
        tip(
          'Publier sur l’App Store',
          'Côté Apple, la compilation pour iOS demande un Mac avec Xcode : il n’existe pas de chemin officiel pour compiler une app iOS depuis Windows ou Linux sans Mac (des services de compilation dans le cloud peuvent te prêter un Mac distant).\n\nLes étapes :\n• s’inscrire à l’Apple Developer Program (99 dollars par an) ;\n• créer l’app dans App Store Connect avec son identifiant de bundle ;\n• lancer flutter build ipa, puis envoyer l’archive avec Xcode ou l’app Transporter ;\n• distribuer une version de test avec TestFlight ;\n• soumettre à l’examen d’Apple (App Review), qui vérifie le respect de ses règles avant la publication.\n\nLe numéro de build de pubspec.yaml sert aussi côté iOS : il doit augmenter à chaque envoi.',
          'flutter build ipa --release\n# Résultat : build/ios/ipa/*.ipa\n# Envoi : Xcode (Organizer) ou l’app Transporter',
        ),
        fill(
          'Construis l’archive iOS à envoyer sur App Store Connect.',
          'flutter build ___ --release',
          ['apk', 'ipa', 'ios-store', 'xcode'],
          'ipa',
          'flutter build ipa produit l’archive à envoyer à Apple.',
        ),
        match('Associe chaque outil Apple à son rôle.', [
          ['Xcode', 'Compiler et signer sur Mac'],
          ['App Store Connect', 'Gérer la fiche et les versions'],
          ['TestFlight', 'Distribuer des versions de test'],
          ['App Review', 'L’examen avant publication'],
        ]),
        qcm(
          'Pourquoi tester ton app sur un téléphone d’entrée de gamme ?',
          [
            'C’est obligatoire pour publier',
            'Pour gagner des points de classement',
            'Beaucoup d’utilisateurs en ont un : si elle est fluide dessus, elle l’est partout',
            'Les émulateurs ne lancent pas Flutter',
          ],
          2,
          'Moins de mémoire et un processeur plus lent révèlent les lenteurs que ton propre téléphone cache.',
        ),
        vf(
          'Les petites mises à jour fréquentes sont plus sûres qu’une énorme mise à jour rare.',
          true,
          'Moins de risques à chaque envoi, et les bugs sont plus faciles à retrouver.',
        ),
      ]),
    ],
  ),
];
