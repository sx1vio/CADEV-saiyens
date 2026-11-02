import { fill, lesson, match, order, qcm, tip, unit, vf } from './dsl';
import type { CourseUnit } from './types';

export const units: CourseUnit[] = [
  unit('dart', 'Le langage Dart', 'Écrire les bases du langage de Flutter.', [
    lesson('variables', 'Variables et types', [
      tip(
        'Dart en bref',
        'Flutter utilise le langage Dart. Les types sont vérifiés avant l’exécution. var laisse Dart deviner le type ; final fixe une valeur une fois pour toutes ; const est une constante connue à la compilation. Chaque instruction finit par un point-virgule.',
        "void main() {\n  var ville = 'Abidjan';\n  final int annee = 2026;\n  const pi = 3.14;\n  String message = 'Bonjour $ville';\n  print(message);\n}",
      ),
      match('Associe chaque type Dart à une valeur.', [
        ['int', '42'],
        ['double', '3.5'],
        ['String', "'Kigali'"],
        ['bool', 'true'],
      ]),
      qcm(
        'Quel mot-clé pour une valeur affectée une seule fois, à l’exécution ?',
        ['var', 'final', 'let'],
        1,
        'final : une seule affectation. const : connue dès la compilation.',
      ),
      fill(
        'Insère la variable dans le texte.',
        "print('Bonjour ___nom');",
        ['$', '#', '&'],
        '$',
        "En Dart : 'Bonjour $nom' ou '${a + b}' pour une expression.",
      ),
      vf(
        'En Dart, chaque instruction se termine par un point-virgule.',
        true,
        'Oublier le ; est l’erreur la plus fréquente au début.',
      ),
      qcm(
        'Où commence l’exécution d’un programme Dart ?',
        ['Dans la fonction main()', 'À la première ligne du fichier', 'Dans build()'],
        0,
        'main() est le point d’entrée, comme dans une app Flutter.',
      ),
    ]),
    lesson('fonctions', 'Fonctions et listes', [
      tip(
        'Fonctions, listes et maps',
        'Une fonction annonce le type qu’elle renvoie. La syntaxe => écrit une fonction d’une seule expression. List et Map rangent plusieurs valeurs.',
        "int double(int n) => n * 2;\n\nvoid main() {\n  final langages = <String>['Dart', 'Kotlin'];\n  langages.add('Swift');\n  final dev = {'nom': 'Awa', 'xp': 120};\n  print(dev['nom']);\n}",
      ),
      qcm(
        'Que renvoie une fonction déclarée void ?',
        ['Rien', 'Un entier', 'Du texte'],
        0,
        'void signifie « pas de valeur de retour ».',
      ),
      fill(
        'Ajoute un élément à la liste.',
        "langages.___('Go');",
        ['add', 'append', 'push'],
        'add',
        'En Dart, on ajoute avec add.',
      ),
      vf(
        'int carre(int n) => n * n; est une fonction valide.',
        true,
        'La flèche renvoie directement l’expression.',
      ),
      order(
        'Écris une fonction qui salue, puis appelle-la.',
        ['String saluer(String nom) {', "  return 'Salut $nom';", '}', "print(saluer('Kofi'));"],
        'La signature annonce le type de retour (String).',
      ),
      qcm(
        "Quel type pour {'nom': 'Awa', 'pays': 'SN'} ?",
        ['Map<String, String>', 'List<String>', 'Set<String>'],
        0,
        'Une Map associe des clés à des valeurs.',
      ),
    ]),
    lesson('null-safety', 'La sécurité face au null', [
      tip(
        'Null safety',
        'Par défaut, une variable Dart ne peut pas être null : beaucoup de plantages sont évités. Ajoute ? au type pour autoriser null. ?? donne une valeur de secours, ?. appelle seulement si ce n’est pas null.',
        "String? ville;            // peut être null\nprint(ville ?? 'Inconnue'); // Inconnue\nprint(ville?.length);      // null, sans planter",
      ),
      vf('String nom; peut contenir null.', false, 'Il faut écrire String? pour autoriser null.'),
      fill(
        'Donne une valeur de secours si pseudo est null.',
        "print(pseudo ___ 'Anonyme');",
        ['??', '||', '?:'],
        '??',
        '?? renvoie la valeur de droite quand celle de gauche est null.',
      ),
      qcm(
        'Que fait user?.nom ?',
        ['Lit nom seulement si user n’est pas null', 'Force la lecture', 'Supprime user'],
        0,
        'Si user est null, l’expression vaut null au lieu de planter.',
      ),
      qcm(
        'Que signifie le ! dans user!.nom ?',
        ['« Je garantis que user n’est pas null »', 'L’inverse de user', 'Une erreur de syntaxe'],
        0,
        'Si user est null, l’app plante : à utiliser avec prudence.',
      ),
      vf(
        'La null safety aide à éviter des plantages en production.',
        true,
        'Le compilateur repère les oublis avant même de lancer l’app.',
      ),
    ]),
  ]),

  unit('widgets', 'Construire l’interface', 'Assembler des widgets pour créer un écran.', [
    lesson('widgets', 'Tout est widget', [
      tip(
        'Des briques imbriquées',
        'En Flutter, tout ce qui s’affiche est un widget : un texte, un bouton, une marge, un écran entier. On les imbrique pour former un arbre. La méthode build décrit l’interface à partir de l’état actuel.',
        "class Accueil extends StatelessWidget {\n  const Accueil({super.key});\n\n  @override\n  Widget build(BuildContext context) {\n    return const Scaffold(\n      body: Center(child: Text('Bienvenue')),\n    );\n  }\n}",
      ),
      match('Associe chaque widget à son rôle.', [
        ['Text', 'Afficher du texte'],
        ['Padding', 'Ajouter de l’espace autour'],
        ['Scaffold', 'La structure d’un écran'],
        ['Image.network', 'Afficher une image en ligne'],
      ]),
      qcm(
        'Quelle méthode décrit ce qu’un widget affiche ?',
        ['build', 'render', 'draw'],
        0,
        'build est appelée à chaque fois que l’interface doit être redessinée.',
      ),
      fill(
        'Centre le texte.',
        "___(child: Text('Salut'))",
        ['Center', 'Middle', 'Align.center'],
        'Center',
        'Center place son enfant au milieu.',
      ),
      vf(
        'Un widget Flutter peut contenir d’autres widgets.',
        true,
        'C’est l’arbre de widgets : child pour un enfant, children pour plusieurs.',
      ),
      qcm(
        'Pourquoi ajouter const devant un widget qui ne change pas ?',
        ['Flutter évite de le reconstruire', 'C’est obligatoire', 'Pour le colorer'],
        0,
        'Moins de travail à chaque rafraîchissement : l’app est plus fluide.',
      ),
    ]),
    lesson('layout', 'Colonnes et lignes', [
      tip(
        'Column, Row et Expanded',
        'Column empile ses enfants verticalement, Row les aligne horizontalement. mainAxisAlignment les répartit sur l’axe principal. Expanded fait prendre à un enfant tout l’espace restant. ListView affiche une liste qui défile.',
        "Column(\n  crossAxisAlignment: CrossAxisAlignment.start,\n  children: [\n    Text('Awa Diop'),\n    Row(children: [Icon(Icons.place), Text('Dakar')]),\n  ],\n)",
      ),
      qcm(
        'Quel widget empile ses enfants verticalement ?',
        ['Row', 'Column', 'Stack'],
        1,
        'Column = vertical, Row = horizontal, Stack = superposés.',
      ),
      fill(
        'Aligne ces éléments sur une ligne.',
        "___(children: [Icon(Icons.star), Text('4,8')])",
        ['Row', 'Column', 'Line'],
        'Row',
        'Row aligne horizontalement.',
      ),
      vf(
        'Une longue liste d’éléments doit utiliser ListView pour pouvoir défiler.',
        true,
        'Une Column trop haute déborde (bandes jaunes et noires).',
      ),
      qcm(
        'Quel widget prend tout l’espace restant dans une Row ?',
        ['Expanded', 'SizedBox', 'Container'],
        0,
        'Expanded partage l’espace libre entre les enfants.',
      ),
      match('Associe chaque widget à son usage.', [
        ['Stack', 'Superposer des éléments'],
        ['SizedBox', 'Un espace de taille fixe'],
        ['ListView', 'Une liste qui défile'],
        ['Card', 'Une carte avec une ombre'],
      ]),
    ]),
    lesson('stateful', 'Widgets avec état', [
      tip(
        'StatelessWidget ou StatefulWidget',
        'Un StatelessWidget affiche toujours la même chose pour les mêmes paramètres. Un StatefulWidget garde un état qui change (un compteur, un champ coché) ; on modifie cet état dans setState pour que Flutter redessine l’écran.',
        "class Compteur extends StatefulWidget {\n  const Compteur({super.key});\n  @override\n  State<Compteur> createState() => _CompteurState();\n}\n\nclass _CompteurState extends State<Compteur> {\n  int n = 0;\n  @override\n  Widget build(BuildContext context) => TextButton(\n        onPressed: () => setState(() => n++),\n        child: Text('Cliqué $n fois'),\n      );\n}",
      ),
      qcm(
        'Quel type de widget pour un compteur qui augmente ?',
        ['StatelessWidget', 'StatefulWidget', 'Aucun'],
        1,
        'Le nombre change : il faut un état.',
      ),
      fill(
        'Redessine l’écran après la modification.',
        '___(() => compteur++);',
        ['setState', 'refresh', 'update'],
        'setState',
        'setState prévient Flutter que l’état a changé.',
      ),
      vf(
        'Modifier une variable sans setState met toujours l’écran à jour.',
        false,
        'Sans setState, Flutter ne sait pas qu’il doit redessiner.',
      ),
      qcm(
        'Où vit l’état d’un StatefulWidget ?',
        ['Dans la classe State associée', 'Dans main()', 'Dans un fichier JSON'],
        0,
        'Le widget est recréé souvent, l’objet State persiste.',
      ),
      vf(
        'Pour une app plus grande, on utilise une solution de gestion d’état comme Provider ou Riverpod.',
        true,
        'Elles partagent l’état entre plusieurs écrans proprement.',
      ),
    ]),
  ]),

  unit(
    'interactions',
    'Interactions et navigation',
    'Gérer les saisies, les boutons et les écrans.',
    [
      lesson('boutons', 'Boutons et saisie', [
        tip(
          'Réagir à l’utilisateur',
          'Les boutons (ElevatedButton, TextButton) prennent une fonction onPressed. TextField lit une saisie ; un TextEditingController permet de récupérer ou vider son contenu.',
          "final ctrl = TextEditingController();\n\nColumn(children: [\n  TextField(\n    controller: ctrl,\n    decoration: const InputDecoration(labelText: 'Ton prénom'),\n  ),\n  ElevatedButton(\n    onPressed: () => print(ctrl.text),\n    child: const Text('Valider'),\n  ),\n])",
        ),
        fill(
          'Réagis à l’appui sur le bouton.',
          "ElevatedButton(\n  ___: () => envoyer(),\n  child: Text('Envoyer'),\n)",
          ['onPressed', 'onClick', 'onTap'],
          'onPressed',
          'Les boutons Flutter utilisent onPressed.',
        ),
        qcm(
          'Comment lire le texte d’un TextField ?',
          ['Avec son TextEditingController : ctrl.text', 'Avec document.value', 'Avec input()'],
          0,
          'Le contrôleur donne accès au texte saisi.',
        ),
        vf(
          'Un bouton dont onPressed vaut null s’affiche désactivé.',
          true,
          'Pratique pour désactiver « Envoyer » tant que le formulaire est incomplet.',
        ),
        qcm(
          'Quel widget rend n’importe quel élément cliquable ?',
          ['GestureDetector', 'Padding', 'Text'],
          0,
          'GestureDetector (ou InkWell pour l’effet d’onde) détecte les touchers.',
        ),
        match('Associe chaque clavier à son usage.', [
          ['TextInputType.emailAddress', 'Saisir un e-mail'],
          ['TextInputType.phone', 'Saisir un numéro'],
          ['TextInputType.number', 'Saisir un nombre'],
          ['obscureText: true', 'Saisir un mot de passe'],
        ]),
      ]),
      lesson('navigation', 'Changer d’écran', [
        tip(
          'Navigator',
          'Navigator gère une pile d’écrans. push ouvre un nouvel écran par-dessus, pop revient au précédent. Le bouton retour d’Android fait un pop automatiquement.',
          'Navigator.push(\n  context,\n  MaterialPageRoute(builder: (_) => const DetailProduit()),\n);\n\n// Revenir :\nNavigator.pop(context);',
        ),
        qcm(
          'Quelle méthode revient à l’écran précédent ?',
          ['Navigator.pop', 'Navigator.back', 'Navigator.close'],
          0,
          'pop retire l’écran du dessus de la pile.',
        ),
        fill(
          'Ouvre l’écran de détail.',
          'Navigator.___(context, MaterialPageRoute(builder: (_) => Detail()));',
          ['push', 'open', 'go'],
          'push',
          'push empile un nouvel écran.',
        ),
        vf(
          'Les écrans forment une pile : le dernier ouvert est au-dessus.',
          true,
          'D’où les noms push (empiler) et pop (dépiler).',
        ),
        order(
          'Ouvre un écran puis reviens.',
          [
            'Navigator.push(context, route)',
            "// l'utilisateur consulte le détail",
            'Navigator.pop(context)',
          ],
          'push puis pop.',
        ),
        qcm(
          'Comment passer un produit à l’écran de détail ?',
          [
            'Par le constructeur : DetailProduit(produit: p)',
            'Par une variable globale',
            'Impossible',
          ],
          0,
          'Les paramètres du constructeur transmettent les données proprement.',
        ),
      ]),
      lesson('http', 'Charger des données', [
        tip(
          'Appeler une API',
          'Le paquet http fait des requêtes réseau. On attend la réponse avec await dans une fonction async, on vérifie le code de statut, puis on décode le JSON. FutureBuilder affiche un chargement, une erreur ou le résultat.',
          "import 'dart:convert';\nimport 'package:http/http.dart' as http;\n\nFuture<List<dynamic>> chargerOffres() async {\n  final res = await http.get(Uri.parse('https://api.exemple.com/offres'));\n  if (res.statusCode != 200) throw Exception('Erreur ${res.statusCode}');\n  return jsonDecode(res.body) as List<dynamic>;\n}",
        ),
        fill(
          'Attends la réponse.',
          'final res = ___ http.get(url);',
          ['await', 'async', 'wait'],
          'await',
          'await attend la fin de la requête.',
        ),
        qcm(
          'Comment s’ajoute le paquet http ?',
          ['flutter pub add http', 'npm install http', 'pip install http'],
          0,
          'pub est le gestionnaire de paquets de Dart et Flutter.',
        ),
        vf(
          'Il faut prévoir un état de chargement et un état d’erreur pour chaque appel réseau.',
          true,
          'Sur un réseau mobile lent, l’utilisateur doit savoir ce qui se passe.',
        ),
        qcm(
          'Quel widget construit l’interface à partir d’un Future ?',
          ['FutureBuilder', 'StreamView', 'AsyncWidget'],
          0,
          'FutureBuilder reconstruit l’écran quand le Future se termine.',
        ),
        order(
          'Remets l’appel réseau dans l’ordre.',
          [
            'final res = await http.get(url);',
            'if (res.statusCode != 200) throw Exception();',
            'final data = jsonDecode(res.body);',
            'return data;',
          ],
          'Requête, vérification, décodage, retour.',
        ),
      ]),
    ],
  ),

  unit('publier', 'Publier ton app', 'Préparer et publier ton app sur le Play Store.', [
    lesson('projet', 'Organiser un projet', [
      tip(
        'La structure d’un projet Flutter',
        'flutter create crée le projet. Le code vit dans lib/, le point d’entrée est lib/main.dart. pubspec.yaml liste le nom, la version, les dépendances et les images. flutter run lance l’app sur un téléphone ou un émulateur, avec le rechargement à chaud.',
        'flutter create mon_app\ncd mon_app\nflutter run\n\n# Dans l’app lancée : r = rechargement à chaud',
      ),
      match('Associe chaque élément à son rôle.', [
        ['lib/main.dart', 'Le point d’entrée de l’app'],
        ['pubspec.yaml', 'Dépendances et version'],
        ['android/', 'Le projet natif Android'],
        ['test/', 'Les tests automatiques'],
      ]),
      qcm(
        'Quelle commande lance l’app ?',
        ['flutter run', 'flutter start', 'dart serve'],
        0,
        'flutter run compile et installe l’app sur l’appareil connecté.',
      ),
      vf(
        'Le rechargement à chaud applique tes changements sans relancer l’app.',
        true,
        'Et l’état de l’écran est conservé : on itère très vite.',
      ),
      fill(
        'Crée un nouveau projet.',
        'flutter ___ ma_boutique',
        ['create', 'new', 'init'],
        'create',
        'flutter create génère toute la structure.',
      ),
      qcm(
        'Quelle commande vérifie que ton environnement est bien installé ?',
        ['flutter doctor', 'flutter check', 'flutter test'],
        0,
        'flutter doctor liste ce qui manque (SDK Android, licences…).',
      ),
    ]),
    lesson('build', 'Compiler pour Android', [
      tip(
        'APK et App Bundle',
        'flutter build apk produit un fichier installable directement. Le Play Store demande un App Bundle (.aab) avec flutter build appbundle. L’app doit être signée avec une clé que tu gardes précieusement : sans elle, impossible de publier une mise à jour.',
        'flutter build apk --release\nflutter build appbundle --release',
      ),
      qcm(
        'Quel format demande le Play Store ?',
        ['App Bundle (.aab)', 'ZIP', 'EXE'],
        0,
        'Google génère ensuite des APK optimisés pour chaque téléphone.',
      ),
      vf(
        'Si tu perds ta clé de signature, la mise à jour de ton app devient très difficile.',
        true,
        'Sauvegarde-la hors de ton dépôt Git, en lieu sûr.',
      ),
      fill(
        'Construis le paquet pour le Play Store.',
        'flutter build ___ --release',
        ['appbundle', 'store', 'play'],
        'appbundle',
        'appbundle produit le fichier .aab.',
      ),
      qcm(
        'Que faut-il changer avant chaque nouvelle version publiée ?',
        ['Le numéro de version dans pubspec.yaml', 'Le nom du dossier', 'Rien'],
        0,
        'version: 1.0.1+2 : nom de version et numéro de build.',
      ),
      vf(
        'La clé de signature peut être commitée dans un dépôt public.',
        false,
        'C’est un secret : .gitignore et sauvegarde chiffrée.',
      ),
    ]),
    lesson('store', 'Sur le Play Store', [
      tip(
        'Publier',
        'Un compte Google Play Console coûte 25 dollars, une seule fois. Il faut une fiche (description, captures, icône), une politique de confidentialité si tu collectes des données, et un test fermé avec des testeurs avant la production pour les nouveaux comptes personnels.',
      ),
      qcm(
        'Combien coûte l’inscription à la Google Play Console ?',
        ['25 dollars, une seule fois', '99 dollars par an', 'Gratuit'],
        0,
        'C’est 99 dollars par an chez Apple.',
      ),
      vf(
        'Une politique de confidentialité est demandée si ton app collecte des données personnelles.',
        true,
        'Elle explique quelles données tu collectes et pourquoi.',
      ),
      order(
        'Remets les étapes de publication dans l’ordre.',
        [
          'Construire l’App Bundle signé',
          'Créer la fiche de l’app',
          'Lancer un test avec des testeurs',
          'Publier en production',
        ],
        'On teste avant d’ouvrir à tout le monde.',
      ),
      qcm(
        'Pourquoi tester sur un téléphone d’entrée de gamme ?',
        ['Beaucoup d’utilisateurs en ont un', 'C’est obligatoire', 'Pour gagner des points'],
        0,
        'Si l’app est fluide sur un petit téléphone, elle l’est partout.',
      ),
      vf(
        'Les petites mises à jour fréquentes sont plus sûres qu’une énorme mise à jour rare.',
        true,
        'Moins de risques, et les bugs sont plus faciles à retrouver.',
      ),
    ]),
  ]),
];
