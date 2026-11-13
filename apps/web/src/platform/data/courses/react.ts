import { fill, lesson, match, order, qcm, tip, unit, vf } from './dsl';
import type { CourseUnit } from './types';

/** Cours « Interfaces avec React » (React 19, composants fonctions), prépare à react-essentiel. */
export const units: CourseUnit[] = [
  unit(
    'bases',
    'Démarrer avec React',
    'Créer un projet React avec Vite, écrire du JSX correct et assembler tes premiers composants.',
    [
      lesson('projet-vite', 'Pourquoi React, et créer un projet', [
        tip(
          'Ce que React change',
          'React est une bibliothèque JavaScript pour construire des interfaces à partir de composants : de petits morceaux d’écran réutilisables (un bouton, une carte produit, un formulaire) que l’on assemble comme des briques.\n\nSa grande idée est d’être déclaratif. Avec le DOM « à la main », tu écris chaque étape : trouver l’élément, changer son texte, ajouter une classe… Avec React, tu décris à quoi l’écran doit ressembler pour des données précises, et React se charge de mettre le DOM à jour quand ces données changent. Il compare le nouveau résultat au précédent et ne modifie que ce qui a changé.\n\nReact ne s’occupe que de l’interface. Le routage, le chargement de données ou le style viennent d’autres bibliothèques ou d’un framework (Next.js, React Router…). Dans ce cours, on utilise React 19 avec des composants fonctions, la façon moderne d’écrire React.',
        ),
        tip(
          'Créer un projet avec Vite',
          'Vite est un outil de build rapide : il fournit un serveur de développement qui recharge la page à chaque sauvegarde et prépare une version optimisée pour la production. Create React App, l’ancien outil officiel, est déprécié depuis 2025 : ne l’utilise plus pour un nouveau projet.\n\nIl te faut une version récente de Node.js (une LTS). La commande ci-dessous crée le dossier, puis on installe les dépendances et on lance le serveur. L’application s’ouvre alors sur http://localhost:5173.\n\n• npm run dev : serveur de développement\n• npm run build : version de production dans le dossier dist/\n• npm run preview : tester localement cette version de production\n\nLe modèle react-ts donne la même chose en TypeScript, un très bon choix pour les projets d’équipe.',
          'npm create vite@latest boutique -- --template react\ncd boutique\nnpm install\nnpm run dev',
        ),
        tip(
          'Ce que contient le projet',
          'index.html contient une seule balise vide, <div id="root"></div>, et charge src/main.jsx. Ce fichier est le point d’entrée : il crée une « racine » React dans cette div et y affiche le composant App. Tout le reste de ton interface vit dans des composants appelés à partir de App.\n\nStrictMode n’affiche rien : en développement seulement, il active des vérifications supplémentaires (il appelle par exemple certaines fonctions deux fois pour révéler les erreurs). Garde-le.',
          'import { StrictMode } from "react";\nimport { createRoot } from "react-dom/client";\nimport App from "./App.jsx";\n\ncreateRoot(document.getElementById("root")).render(\n  <StrictMode>\n    <App />\n  </StrictMode>,\n);',
        ),
        qcm(
          'Que signifie « React est déclaratif » ?',
          [
            'Tu dois déclarer chaque variable avec const',
            'Tu modifies toi-même chaque élément du DOM, étape par étape',
            'Tu décris l’interface voulue pour des données, React met le DOM à jour',
            'React génère automatiquement le HTML à partir d’une base de données',
          ],
          2,
          'Tu décris le résultat, pas les étapes. Quand les données changent, React calcule la différence et applique seulement les changements nécessaires au DOM.',
        ),
        order(
          'Remets dans l’ordre les commandes pour créer et lancer un projet.',
          [
            'npm create vite@latest boutique -- --template react',
            'cd boutique',
            'npm install',
            'npm run dev',
          ],
          'On crée le projet, on entre dans son dossier, on installe les dépendances listées dans package.json, puis on lance le serveur de développement.',
        ),
        fill(
          'Complète le point d’entrée pour créer la racine React.',
          'import { ___ } from "react-dom/client";\n\ncreateRoot(document.getElementById("root")).render(<App />);',
          ['createRoot', 'render', 'ReactDOM', 'mount'],
          'createRoot',
          'Depuis React 18, on crée une racine avec createRoot (importée de react-dom/client), puis on appelle sa méthode render. L’ancien ReactDOM.render a été supprimé dans React 19.',
        ),
        vf(
          'Create React App reste l’outil recommandé pour démarrer un nouveau projet React.',
          false,
          'Create React App a été déprécié en 2025. Pour apprendre ou faire une application côté navigateur, Vite est un excellent choix ; pour une application complète, la documentation propose aussi des frameworks comme Next.js ou React Router.',
        ),
        match('Associe chaque fichier ou commande à son rôle.', [
          ['index.html', 'Page unique qui contient <div id="root">'],
          ['src/main.jsx', 'Point d’entrée qui crée la racine React'],
          ['src/App.jsx', 'Composant principal de l’application'],
          ['npm run build', 'Génère la version de production dans dist/'],
        ]),
        qcm(
          'À quoi sert <StrictMode> autour de <App /> ?',
          [
            'À activer des vérifications supplémentaires en développement',
            'À rendre l’application plus rapide en production',
            'À interdire les variables globales',
            'À activer TypeScript',
          ],
          0,
          'StrictMode n’a aucun effet en production. En développement, il appelle deux fois les fonctions de rendu et relance les effets une fois de plus pour faire apparaître les composants impurs et les effets mal nettoyés.',
        ),
        vf(
          'npm run build crée des fichiers statiques que tu peux héberger sur n’importe quel serveur web.',
          true,
          'Le dossier dist/ contient du HTML, du JavaScript et du CSS optimisés. Un hébergement statique suffit pour une application qui tourne entièrement dans le navigateur.',
        ),
      ]),

      lesson('jsx', 'Les règles du JSX', [
        tip(
          'Du HTML dans le JavaScript ?',
          'Le JSX est une extension de syntaxe qui ressemble à du HTML mais qui est transformée en appels de fonctions JavaScript au moment du build. C’est pour ça qu’un composant peut renvoyer <h1>Bonjour</h1> : ce n’est pas une chaîne, c’est une description d’élément.\n\nTrois règles à connaître par cœur :\n• Un composant renvoie un seul élément racine. Pour en regrouper plusieurs sans ajouter de div inutile, utilise un fragment <>…</>.\n• Toutes les balises sont fermées : <img />, <br />, <input />.\n• Les attributs s’écrivent en camelCase : className (class est un mot réservé en JavaScript), htmlFor (au lieu de for), onClick, tabIndex. Exception : aria-* et data-* gardent leurs tirets.',
          'function Entete() {\n  return (\n    <>\n      <h1 className="titre">Boutique Awa</h1>\n      <img src="/logo.png" alt="Logo de la boutique" />\n    </>\n  );\n}',
        ),
        tip(
          'Les accolades : la porte vers JavaScript',
          'Entre accolades, tu peux écrire n’importe quelle expression JavaScript : une variable, un calcul, un appel de fonction, un ternaire. Pas d’instruction : if, for ou const ne passent pas entre accolades.\n\nLes accolades fonctionnent dans le texte et dans les valeurs d’attributs. Pour le style en ligne, on passe un objet : d’où les doubles accolades style={{ color: "green" }}, avec des propriétés en camelCase (fontSize, backgroundColor).\n\nUn commentaire s’écrit {/* … */}. Enfin, si le JSX tient sur plusieurs lignes après return, entoure-le de parenthèses : sinon le return seul sur sa ligne renverrait undefined.',
          'const nom = "Kofi";\nconst solde = 25000;\n\nreturn (\n  <p style={{ fontWeight: "bold" }}>\n    {/* Solde du portefeuille */}\n    Bonjour {nom}, ton solde est de {solde.toLocaleString("fr-FR")} FCFA\n  </p>\n);',
        ),
        qcm(
          'Pourquoi ce composant provoque-t-il une erreur ?',
          [
            'Il manque un import de React',
            'Il renvoie deux éléments frères sans parent commun',
            'Les balises <h2> sont interdites en JSX',
            'Le texte doit être entre accolades',
          ],
          1,
          'Une fonction ne peut renvoyer qu’une seule valeur : il faut un parent unique. Enveloppe les deux éléments dans un fragment <>…</> ou dans un élément utile comme <section>.',
          'function Carte() {\n  return (\n    <h2>Riz parfumé</h2>\n    <p>5 kg</p>\n  );\n}',
        ),
        fill(
          'Complète l’attribut de classe CSS en JSX.',
          '<button ___="bouton-principal">Payer</button>',
          ['className', 'class', 'cssClass', 'classList'],
          'className',
          'En JSX on écrit className, car class est un mot réservé de JavaScript. Le navigateur reçoit bien un attribut class au final.',
        ),
        qcm(
          'Laquelle de ces lignes est du JSX valide ?',
          [
            '<input type="text">',
            '<label for="email">E-mail</label>',
            '<div style="color: red">Erreur</div>',
            '<img src={photo} alt="Produit" />',
          ],
          3,
          'En JSX, les balises vides doivent se fermer (<input />), for devient htmlFor, et style attend un objet : style={{ color: "red" }}. Seule la balise <img … /> est correcte.',
        ),
        vf(
          'On peut écrire une instruction if directement entre accolades dans le JSX.',
          false,
          'Les accolades n’acceptent que des expressions. Pour une condition, utilise un ternaire (a ? b : c), l’opérateur &&, ou un if avant le return.',
        ),
        match('Associe l’attribut HTML à son équivalent JSX.', [
          ['class', 'className'],
          ['for', 'htmlFor'],
          ['onclick', 'onClick'],
          ['tabindex', 'tabIndex'],
        ]),
        fill(
          'Affiche le prix dans le paragraphe.',
          'const prix = 3500;\nreturn <p>Prix : ___ FCFA</p>;',
          ['{prix}', '"prix"', '${prix}', '(prix)'],
          '{prix}',
          'Les accolades évaluent l’expression JavaScript. ${…} n’existe que dans les gabarits de chaîne entre accents graves, pas dans le JSX.',
        ),
        qcm(
          'Que renvoie ce composant ?',
          [
            'Le paragraphe « Bonjour »',
            'Une erreur de syntaxe',
            'undefined : rien ne s’affiche',
            'Une chaîne de caractères',
          ],
          2,
          'Un return seul sur sa ligne se termine là (insertion automatique du point-virgule). Le JSX qui suit n’est jamais atteint. On met la parenthèse ouvrante sur la même ligne que return.',
          'function Salut() {\n  return\n    <p>Bonjour</p>;\n}',
        ),
      ]),

      lesson('premiers-composants', 'Tes premiers composants', [
        tip(
          'Un composant est une fonction',
          'Un composant React est une fonction JavaScript qui renvoie du JSX. Son nom commence obligatoirement par une majuscule : <Produit /> désigne ton composant, alors que <produit /> serait pris pour une balise HTML inconnue.\n\nOn l’utilise ensuite comme une balise, autant de fois que nécessaire. Chaque utilisation est une instance indépendante.\n\nPiège classique : ne déclare jamais un composant à l’intérieur d’un autre. Il serait recréé à chaque affichage du parent, ce qui efface son état et le rend lent. Déclare toujours tes composants au premier niveau du fichier.',
          'function Produit() {\n  return <li>Attiéké — 500 FCFA</li>;\n}\n\nexport default function Menu() {\n  return (\n    <ul>\n      <Produit />\n      <Produit />\n    </ul>\n  );\n}',
        ),
        tip(
          'Organiser les fichiers : import et export',
          'Quand un fichier grossit, place chaque composant important dans son propre fichier et exporte-le. Il existe deux façons :\n• export default function Panier() … s’importe avec import Panier from "./Panier.jsx" (le nom à l’import est libre) ;\n• export function Bouton() … s’importe avec import { Bouton } from "./Bouton.jsx" (le nom doit correspondre).\n\nUn fichier n’a qu’un seul export par défaut, mais autant d’exports nommés que tu veux. Beaucoup d’équipes préfèrent les exports nommés pour garder le même nom partout. Avec Vite, les fichiers qui contiennent du JSX portent l’extension .jsx (ou .tsx en TypeScript).',
          '// Bouton.jsx\nexport function Bouton() {\n  return <button>Ajouter au panier</button>;\n}\n\n// App.jsx\nimport { Bouton } from "./Bouton.jsx";',
        ),
        qcm(
          'Pourquoi <carteProduit /> ne s’affiche-t-il pas comme ton composant ?',
          [
            'Il faut l’écrire en majuscules partout',
            'Un nom qui commence par une minuscule est traité comme une balise HTML',
            'Les composants doivent finir par « Component »',
            'Il manque un export default',
          ],
          1,
          'React distingue les deux par la première lettre : minuscule pour les balises HTML natives, majuscule pour tes composants. Renomme-le CarteProduit.',
        ),
        vf(
          'Déclarer un composant à l’intérieur d’un autre composant est une bonne pratique pour le garder privé.',
          false,
          'Le composant interne est recréé à chaque rendu du parent : React le voit comme un nouveau type, efface son état et reconstruit son DOM. Déclare-le au premier niveau du fichier ; s’il a besoin de données du parent, passe-les en props.',
        ),
        fill(
          'Importe l’export par défaut du fichier Panier.jsx.',
          'import ___ from "./Panier.jsx";',
          ['Panier', '{ Panier }', '* as Panier', 'default Panier'],
          'Panier',
          'Un export par défaut s’importe sans accolades. Les accolades servent aux exports nommés.',
        ),
        qcm(
          'Combien d’exports par défaut un fichier peut-il avoir ?',
          ['Aucun', 'Un seul', 'Deux', 'Autant que de composants'],
          1,
          'Un seul export par défaut par fichier, mais autant d’exports nommés que nécessaire.',
        ),
        order(
          'Remets ce composant dans l’ordre.',
          [
            'export default function Accueil() {',
            '  return (',
            '    <main>',
            '      <h1>Bienvenue</h1>',
            '    </main>',
            '  );',
            '}',
          ],
          'La fonction est exportée, elle renvoie du JSX entre parenthèses avec un seul élément racine (<main>).',
        ),
        match('Associe chaque écriture à sa signification.', [
          ['export default function A()', 'Export par défaut'],
          ['export function B()', 'Export nommé'],
          ['import A from "./A.jsx"', 'Import d’un export par défaut'],
          ['import { B } from "./B.jsx"', 'Import d’un export nommé'],
        ]),
      ]),

      lesson('recap-bases', 'Récap et pratique', [
        tip(
          'Ce qu’il faut retenir',
          'Tu sais maintenant :\n• créer un projet avec npm create vite@latest et le lancer avec npm run dev ;\n• lire le point d’entrée : createRoot(…).render(<App />) dans src/main.jsx ;\n• écrire du JSX valide : un seul parent (ou un fragment), balises fermées, attributs en camelCase, expressions entre accolades ;\n• écrire des composants fonctions dont le nom commence par une majuscule, les exporter et les importer.\n\nLes deux erreurs les plus fréquentes chez les débutants : oublier de fermer une balise vide (<img>) et écrire class au lieu de className. Ton éditeur et la console du navigateur te le signalent : prends l’habitude de les lire.',
        ),
        tip(
          'Exercice mental : une fiche produit',
          'Imagine une fiche produit pour un catalogue en ligne : une image, un nom, un prix en FCFA. Avant d’écrire du code, découpe l’écran : une page Catalogue qui affiche plusieurs CarteProduit. Chaque carte contient une image (avec un texte alt qui la décrit) et du texte.\n\nC’est le réflexe React : penser en composants qui s’emboîtent. Dans l’unité suivante, tu apprendras à passer des données différentes à chaque carte avec les props.',
          'function CarteProduit() {\n  return (\n    <article className="carte">\n      <img src="/pagne.jpg" alt="Pagne wax bleu" />\n      <h2>Pagne wax</h2>\n      <p>12 000 FCFA</p>\n    </article>\n  );\n}',
        ),
        qcm(
          'Combien d’erreurs JSX contient ce code ?',
          ['Aucune', 'Une', 'Deux', 'Trois'],
          3,
          'Trois erreurs : class doit devenir className, la balise <img> doit être fermée (<img … />) et for doit devenir htmlFor.',
          '<div class="carte">\n  <img src="/sac.jpg" alt="Sac">\n  <label for="qte">Quantité</label>\n</div>',
        ),
        vf(
          'Un fragment <>…</> ajoute une div supplémentaire dans le DOM.',
          false,
          'Le fragment regroupe des éléments sans rien ajouter au DOM. C’est utile quand une div casserait la mise en page (dans une liste, un tableau, une grille).',
        ),
        fill(
          'Applique un style en ligne avec un objet.',
          '<p style=___>Paiement reçu</p>',
          ['{{ color: "green" }}', '"color: green"', '{color: green}', '[color: "green"]'],
          '{{ color: "green" }}',
          'Les premières accolades ouvrent une expression, les secondes créent l’objet de style. Les valeurs sont des chaînes ou des nombres (fontSize: 16 signifie 16px).',
        ),
        qcm(
          'Quel est le rôle de src/main.jsx dans un projet Vite ?',
          [
            'Définir les styles globaux',
            'Lister les dépendances',
            'Afficher App dans la div #root avec createRoot',
            'Configurer le serveur web',
          ],
          2,
          'main.jsx est le point d’entrée chargé par index.html. Il crée la racine React et y affiche le composant principal.',
        ),
        match('Associe chaque erreur à sa correction.', [
          ['<br>', '<br />'],
          ['class="titre"', 'className="titre"'],
          ['<produit />', '<Produit />'],
          ['return seul sur sa ligne', 'return ( sur la même ligne'],
        ]),
        vf(
          'Dans un même fichier, tu peux avoir un export par défaut et plusieurs exports nommés.',
          true,
          'C’est courant : le composant principal en export par défaut, et de petites fonctions ou constantes en exports nommés.',
        ),
        qcm(
          'Quelle expression peut-on placer entre accolades dans le JSX ?',
          [
            'for (const p of produits) {}',
            'const total = 0',
            'if (connecte) { … }',
            'produits.length > 0 ? "En stock" : "Rupture"',
          ],
          3,
          'Seules les expressions (qui produisent une valeur) sont acceptées. Le ternaire en est une ; for, const et if sont des instructions.',
        ),
      ]),
    ],
  ),

  unit(
    'props',
    'Props, children et rendu conditionnel',
    'Passer des données à tes composants, composer avec children et afficher selon une condition.',
    [
      lesson('props', 'Passer des props', [
        tip(
          'Les props, les paramètres d’un composant',
          'Les props sont les informations qu’un parent passe à un composant enfant, comme des attributs. React les regroupe dans un seul objet, le premier paramètre de la fonction. On le déstructure en général directement dans la signature.\n\nUne chaîne se passe entre guillemets ; tout le reste (nombre, booléen, objet, tableau, fonction) entre accolades : prix={12000}, enStock={true}, produit={objet}. Un attribut écrit seul, comme <Badge promo />, vaut true.\n\nTu peux donner une valeur par défaut dans la déstructuration : elle s’applique quand la prop est absente ou undefined (pas quand elle vaut null ou 0).',
          'function CarteProduit({ nom, prix, devise = "FCFA" }) {\n  return (\n    <article>\n      <h2>{nom}</h2>\n      <p>{prix.toLocaleString("fr-FR")} {devise}</p>\n    </article>\n  );\n}\n\n<CarteProduit nom="Pagne wax" prix={12000} />',
        ),
        tip(
          'Les props sont en lecture seule',
          'Un composant ne modifie jamais ses props : elles appartiennent au parent. Si une valeur doit changer à l’écran, c’est le parent qui passe une nouvelle valeur, ou bien le composant utilise son propre état (unité suivante).\n\nC’est lié à une règle plus large : un composant doit être pur. Pour les mêmes props (et le même état), il renvoie toujours le même JSX, et pendant le rendu il ne modifie rien qui existait avant lui : ni ses props, ni des variables globales, ni le DOM. En développement, StrictMode appelle tes composants deux fois pour repérer ce genre d’erreur.\n\nPour transmettre toutes les props telles quelles à un enfant, on peut utiliser {...props}, mais avec modération : la lecture du code devient plus difficile.',
        ),
        qcm(
          'Comment le composant reçoit-il nom et prix ?',
          [
            'function Carte(nom, prix)',
            'function Carte({ nom, prix })',
            'function Carte([nom, prix])',
            'function Carte(props.nom, props.prix)',
          ],
          1,
          'React passe un seul objet props. La déstructuration { nom, prix } extrait directement les champs. Écrire function Carte(props) puis props.nom marche aussi.',
        ),
        fill(
          'Passe le prix comme nombre.',
          '<CarteProduit nom="Sac" prix=___ />',
          ['{8500}', '"8500"', '8500', '(8500)'],
          '{8500}',
          'Entre guillemets, la prop serait la chaîne "8500" : un calcul comme prix * 2 marcherait par conversion, mais prix + 500 donnerait "8500500". Les accolades passent un vrai nombre.',
        ),
        vf(
          'Un composant enfant peut écrire props.prix = 0 pour corriger une valeur reçue.',
          false,
          'Les props sont en lecture seule. Les modifier rend le composant impur et produit des bugs difficiles à suivre. On calcule une nouvelle valeur dans une variable locale, ou on demande au parent de changer la sienne.',
        ),
        qcm(
          'Que vaut devise dans <Prix montant={500} devise={undefined} /> avec { devise = "FCFA" } ?',
          ['undefined', '"FCFA"', 'null', 'Une erreur'],
          1,
          'Une valeur par défaut de déstructuration s’applique quand la valeur est undefined, qu’elle soit absente ou passée explicitement. Avec devise={null}, la valeur serait null.',
        ),
        qcm(
          'Quel composant est impur ?',
          [
            'function A({ n }) { return <p>{n * 2}</p>; }',
            'function B({ nom }) { const majuscule = nom.toUpperCase(); return <p>{majuscule}</p>; }',
            'let vues = 0; function C() { vues++; return <p>{vues}</p>; }',
            'function D({ items }) { return <p>{items.length} articles</p>; }',
          ],
          2,
          'C modifie une variable qui existe en dehors de lui pendant le rendu : le résultat dépend du nombre d’appels (et StrictMode l’appelle deux fois en développement). Les autres ne font que calculer à partir de leurs props.',
        ),
        vf(
          '<Badge promo /> passe la prop promo avec la valeur true.',
          true,
          'Comme en HTML, un attribut sans valeur est considéré comme vrai. C’est équivalent à promo={true}.',
        ),
        match('Associe chaque prop à la valeur reçue par le composant.', [
          ['quantite="3"', 'La chaîne "3"'],
          ['quantite={3}', 'Le nombre 3'],
          ['enStock', 'Le booléen true'],
          ['onAjout={ajouter}', 'Une fonction'],
        ]),
      ]),

      lesson('children', 'Composer avec children', [
        tip(
          'Le contenu entre les balises',
          'Quand tu écris du contenu entre la balise ouvrante et la balise fermante d’un composant, React le passe dans une prop spéciale : children. Le composant décide où l’afficher.\n\nC’est idéal pour les « boîtes » génériques : une carte, une fenêtre modale, une mise en page, un panneau avec un titre. Le composant gère le cadre, le parent fournit l’intérieur. Tu peux combiner children avec d’autres props, comme un titre.\n\nchildren peut être du texte, un élément, plusieurs éléments ou rien du tout. On l’affiche simplement avec {children}.',
          'function Panneau({ titre, children }) {\n  return (\n    <section className="panneau">\n      <h2>{titre}</h2>\n      {children}\n    </section>\n  );\n}\n\n<Panneau titre="Mon portefeuille">\n  <p>Solde : 45 000 FCFA</p>\n  <button>Recharger</button>\n</Panneau>',
        ),
        tip(
          'Pourquoi la composition est si utile',
          'Avec children, tu évites de multiplier les props pour chaque variante (afficherBouton, texteBouton, iconeBouton…). Le parent assemble ce qu’il veut à l’intérieur.\n\nLa composition évite aussi de passer des données à travers des composants qui ne s’en servent pas. Si une Mise en page reçoit l’utilisateur seulement pour le donner à un Avatar, passe plutôt <Avatar utilisateur={u} /> en children : la mise en page n’a plus besoin de le connaître.\n\nUne prop peut d’ailleurs contenir du JSX : <Carte entete={<Logo />} />. Garde children pour le contenu principal et des props nommées pour les autres emplacements.',
        ),
        fill(
          'Affiche le contenu reçu entre les balises.',
          'function Carte({ children }) {\n  return <div className="carte">{___}</div>;\n}',
          ['children', 'props', 'this.children', 'content'],
          'children',
          'children contient ce que le parent a placé entre <Carte> et </Carte>.',
        ),
        qcm(
          'Que contient children ici ?',
          [
            'Rien : children est réservé aux balises HTML',
            'La chaîne "Alerte"',
            'Le paragraphe « Paiement refusé »',
            'Un tableau vide',
          ],
          2,
          'Tout ce qui est entre <Alerte> et </Alerte> devient children. La prop type est une prop ordinaire.',
          '<Alerte type="erreur">\n  <p>Paiement refusé</p>\n</Alerte>',
        ),
        vf(
          'Un composant qui reçoit children peut aussi recevoir d’autres props.',
          true,
          'children est une prop comme les autres, simplement remplie à partir du contenu entre les balises. On la combine souvent avec un titre, une variante, etc.',
        ),
        qcm(
          'Pourquoi préférer <Page><Avatar utilisateur={u} /></Page> à <Page utilisateur={u} /> si Page ne fait que transmettre u ?',
          [
            'C’est plus rapide à exécuter',
            'Page n’a plus besoin de connaître l’utilisateur : moins de props à faire transiter',
            'Les props objets sont interdites',
            'Avatar ne peut pas recevoir de props autrement',
          ],
          1,
          'La composition supprime un passage de props inutile. Page reste générique et réutilisable ; c’est le parent, qui connaît u, qui place l’Avatar.',
        ),
        match('Associe chaque composant au rôle de children.', [
          ['<Modale>', 'Le contenu de la fenêtre'],
          ['<Bouton>', 'Le texte du bouton'],
          ['<MiseEnPage>', 'Le contenu principal de la page'],
          ['<Infobulle>', 'L’élément qui déclenche l’infobulle'],
        ]),
        order(
          'Remets ce composant de mise en page dans l’ordre.',
          [
            'function MiseEnPage({ children }) {',
            '  return (',
            '    <div className="page">',
            '      <header>DevHub Shop</header>',
            '      <main>{children}</main>',
            '    </div>',
            '  );',
            '}',
          ],
          'L’en-tête est fixe, le contenu variable vient de children et s’affiche dans <main>.',
        ),
      ]),

      lesson('rendu-conditionnel', 'Afficher selon une condition', [
        tip(
          'Trois façons d’afficher sous condition',
          '• Un if avant le return, quand les deux cas sont très différents : on renvoie un JSX ou un autre.\n• Le ternaire condition ? A : B, directement dans le JSX, quand on choisit entre deux éléments.\n• L’opérateur condition && A, quand on affiche A ou rien.\n\nUn composant peut aussi renvoyer null pour ne rien afficher du tout. Bon à savoir : null, undefined, true et false ne s’affichent pas dans le JSX. C’est pour cela que && fonctionne : si la condition est fausse, l’expression vaut false et rien n’apparaît.',
          'function Statut({ enStock, quantite }) {\n  if (!enStock) {\n    return <p className="rupture">Rupture de stock</p>;\n  }\n  return (\n    <p>\n      {quantite > 5 ? "Disponible" : "Bientôt épuisé"}\n      {quantite === 1 && " — dernier article !"}\n    </p>\n  );\n}',
        ),
        tip(
          'Le piège du 0 avec &&',
          'Attention : && renvoie la valeur de gauche si elle est « fausse ». Avec un booléen, c’est false et rien ne s’affiche. Mais avec le nombre 0, React affiche 0 ! C’est un bug très courant avec la longueur d’un tableau.\n\nRègle simple : à gauche de &&, mets toujours un vrai booléen. Écris panier.length > 0 && … plutôt que panier.length && …, ou utilise un ternaire.\n\nQuand le JSX devient difficile à lire à cause de ternaires imbriqués, sors la logique dans une variable avant le return, ou crée un petit composant.',
          '// Bug : affiche « 0 » quand le panier est vide\n{panier.length && <Badge nombre={panier.length} />}\n\n// Correct\n{panier.length > 0 && <Badge nombre={panier.length} />}',
        ),
        qcm(
          'Qu’affiche ce code quand notifications vaut [] ?',
          ['Rien', 'Le chiffre 0', 'false', 'Une erreur'],
          1,
          'notifications.length vaut 0, une valeur fausse : && renvoie 0, et React affiche les nombres. Écris notifications.length > 0 && … pour obtenir false, qui ne s’affiche pas.',
          '<div>{notifications.length && <Pastille />}</div>',
        ),
        fill(
          'Affiche « Payé » ou « En attente » selon paye.',
          '<span>{paye ___ "Payé" : "En attente"}</span>',
          ['?', '&&', '||', '??'],
          '?',
          'Le ternaire condition ? siVrai : siFaux choisit entre deux valeurs. Il est idéal à l’intérieur du JSX.',
        ),
        vf(
          'Un composant peut renvoyer null pour ne rien afficher.',
          true,
          'null est une valeur de retour valide. Attention : le composant est quand même appelé, et ses hooks s’exécutent. Souvent, c’est plutôt au parent de décider de ne pas l’afficher.',
        ),
        qcm(
          'Quelle écriture affiche le bouton seulement si estAdmin est vrai ?',
          [
            '{estAdmin && <BoutonSupprimer />}',
            '{if (estAdmin) <BoutonSupprimer />}',
            '<BoutonSupprimer if={estAdmin} />',
            '{estAdmin ? <BoutonSupprimer />}',
          ],
          0,
          'condition && élément affiche l’élément si la condition est vraie, rien sinon. Le if est une instruction, et un ternaire a besoin de ses deux branches.',
        ),
        match('Associe chaque besoin à l’écriture adaptée.', [
          ['Choisir entre deux éléments', 'condition ? A : B'],
          ['Afficher un élément ou rien', 'condition && A'],
          ['Deux écrans très différents', 'if avant le return'],
          ['Ne rien afficher du tout', 'return null'],
        ]),
        qcm(
          'Lesquelles de ces valeurs n’affichent rien dans le JSX ?',
          ['0 et ""', 'false, null et undefined', 'NaN et 0', 'Tous les nombres'],
          1,
          'true, false, null et undefined sont ignorés. Les nombres (y compris 0 et NaN) s’affichent. Une chaîne vide n’affiche rien de visible mais crée tout de même un nœud texte.',
        ),
      ]),

      lesson('recap-props', 'Récap et pratique', [
        tip(
          'Ce qu’il faut retenir',
          '• Les props passent les données du parent vers l’enfant, dans un seul objet que l’on déstructure.\n• Les chaînes entre guillemets, tout le reste entre accolades.\n• Les valeurs par défaut s’appliquent quand la prop vaut undefined.\n• Un composant ne modifie jamais ses props et reste pur pendant le rendu.\n• children contient ce qui est écrit entre les balises : c’est la base de la composition.\n• Pour afficher sous condition : if avant le return, ternaire, &&, ou return null.\n• À gauche de &&, toujours un booléen : sinon un 0 peut s’afficher.',
        ),
        tip(
          'Mise en situation : une ligne de transaction',
          'Dans une application de suivi mobile money, chaque transaction affiche un libellé, un montant et un sens (reçu ou envoyé). Le composant reçoit tout en props et décide de la couleur et du signe avec un ternaire. Un badge « En attente » ne s’affiche que si le statut l’exige. Remarque comme le composant ne fait que lire ses props : il est pur et facile à tester.',
          'function Transaction({ libelle, montant, recu, enAttente }) {\n  return (\n    <li className={recu ? "credit" : "debit"}>\n      {libelle} : {recu ? "+" : "−"}\n      {montant.toLocaleString("fr-FR")} FCFA\n      {enAttente && <span className="badge">En attente</span>}\n    </li>\n  );\n}',
        ),
        qcm(
          'Avec <Transaction libelle="Recharge" montant={5000} recu />, quelle classe a le <li> ?',
          ['debit', 'credit', 'Aucune', 'undefined'],
          1,
          'recu est écrit sans valeur : il vaut true. Le ternaire choisit donc "credit".',
        ),
        vf(
          'Dans ce composant Transaction, enAttente non fourni provoque une erreur.',
          false,
          'Une prop non fournie vaut undefined. undefined && … donne undefined, qui ne s’affiche pas. Aucune erreur.',
        ),
        fill(
          'Donne la valeur par défaut "FCFA" à devise.',
          'function Prix({ montant, devise ___ "FCFA" }) {\n  return <span>{montant} {devise}</span>;\n}',
          ['=', ':', '??', '||'],
          '=',
          'Dans une déstructuration, = donne une valeur par défaut. Le deux-points servirait à renommer la propriété.',
        ),
        qcm(
          'Ce composant affiche « 0 » sous la liste quand il n’y a aucun favori. Pourquoi ?',
          [
            'favoris est undefined',
            'map renvoie 0 pour un tableau vide',
            'favoris.length vaut 0 et React affiche les nombres',
            'Il manque une key',
          ],
          2,
          'Le && renvoie 0, que React affiche. Correction : favoris.length > 0 && <p>…</p>.',
          '<>\n  <Liste items={favoris} />\n  {favoris.length && <p>{favoris.length} favoris</p>}\n</>',
        ),
        match('Associe chaque notion à sa définition.', [
          ['props', 'Données passées par le parent'],
          ['children', 'Contenu placé entre les balises'],
          ['composant pur', 'Même entrée, même JSX, sans effet de bord'],
          ['fragment', 'Regroupe sans ajouter d’élément au DOM'],
        ]),
        vf(
          'Pour passer un objet en prop, on écrit produit={produit}.',
          true,
          'Tout ce qui n’est pas une chaîne littérale passe entre accolades, y compris les objets, les tableaux et les fonctions.',
        ),
        qcm(
          'Quel est le défaut de ce code ?',
          [
            'Il modifie une prop pendant le rendu',
            'Il manque un fragment',
            'Il faut écrire props.panier',
            'Aucun défaut',
          ],
          0,
          'sort trie le tableau sur place : il modifie le tableau reçu du parent. Crée une copie triée : [...articles].sort(…) ou articles.toSorted(…).',
          'function Panier({ articles }) {\n  articles.sort((a, b) => a.prix - b.prix);\n  return <Liste items={articles} />;\n}',
        ),
      ]),
    ],
  ),

  unit(
    'etat',
    'État et événements',
    'Réagir aux actions de l’utilisateur, mémoriser des valeurs avec useState et mettre à jour l’état sans le muter.',
    [
      lesson('evenements', 'Réagir aux événements', [
        tip(
          'Passer une fonction, pas l’appeler',
          'Pour réagir à un clic, on passe une fonction à la prop onClick. Les événements suivent la même convention : onChange, onSubmit, onKeyDown, onFocus…\n\nLe piège numéro un : écrire onClick={payer()} avec des parenthèses. La fonction est alors appelée pendant le rendu, à chaque affichage, et non au clic. Écris onClick={payer} pour passer la fonction, ou onClick={() => payer(id)} quand tu dois lui donner un argument.\n\nPar convention, on nomme les gestionnaires handle + événement (handleClick, handleSubmit) et les props qui reçoivent une fonction on + quelque chose (onAjout, onSelect).',
          'function BoutonAjout({ produit, onAjout }) {\n  function handleClick() {\n    onAjout(produit.id);\n  }\n  return <button onClick={handleClick}>Ajouter</button>;\n}',
        ),
        tip(
          'L’objet événement',
          'Le gestionnaire reçoit un objet événement (souvent nommé e). Deux méthodes reviennent sans cesse :\n• e.preventDefault() empêche le comportement par défaut du navigateur, par exemple le rechargement de la page à l’envoi d’un formulaire ;\n• e.stopPropagation() empêche l’événement de remonter vers les éléments parents.\n\nEn React, les événements se propagent du bas vers le haut : un clic sur un bouton déclenche aussi le onClick de la carte qui le contient. Si le bouton « Supprimer » d’une carte cliquable ouvre aussi la carte, c’est la propagation : appelle e.stopPropagation() dans le gestionnaire du bouton.\n\nLes gestionnaires d’événements sont l’endroit normal pour les effets de bord : modifier l’état, envoyer une requête, naviguer.',
        ),
        qcm(
          'Que se passe-t-il avec ce code ?',
          [
            'Le message s’affiche à chaque clic',
            'Le message s’affiche au rendu, pas au clic',
            'Le message ne s’affiche jamais',
            'Erreur de syntaxe',
          ],
          1,
          'alert("Merci") est exécuté pendant le rendu, et onClick reçoit sa valeur de retour (undefined). Écris onClick={() => alert("Merci")}.',
          '<button onClick={alert("Merci")}>Payer</button>',
        ),
        fill(
          'Supprime l’article d’id 42 au clic.',
          '<button onClick={___}>Retirer</button>',
          ['() => retirer(42)', 'retirer(42)', '"retirer(42)"', 'retirer, 42'],
          '() => retirer(42)',
          'La fonction fléchée est créée au rendu mais n’appelle retirer qu’au clic, avec le bon argument.',
        ),
        vf(
          'En React, un clic sur un bouton déclenche aussi le onClick de ses éléments parents.',
          true,
          'L’événement se propage vers le haut. e.stopPropagation() arrête cette remontée si nécessaire.',
        ),
        qcm(
          'Quelle méthode empêche le formulaire de recharger la page ?',
          ['e.stopPropagation()', 'e.preventDefault()', 'return false', 'e.cancel()'],
          1,
          'preventDefault annule le comportement par défaut du navigateur. return false ne fonctionne pas en React.',
        ),
        match('Associe la prop d’événement à son déclencheur.', [
          ['onClick', 'Un clic ou une touche Entrée sur un bouton'],
          ['onChange', 'La valeur d’un champ change'],
          ['onSubmit', 'L’envoi d’un formulaire'],
          ['onKeyDown', 'L’appui sur une touche'],
        ]),
        qcm(
          'Quel nom suit la convention pour une prop qui reçoit la fonction appelée quand on choisit un produit ?',
          ['handleProduit', 'choisirProduitClick', 'onSelect', 'selectHandler'],
          2,
          'Les props de type événement commencent par on (onSelect, onAjout). Les fonctions définies dans le composant commencent souvent par handle.',
        ),
      ]),

      lesson('usestate', 'Mémoriser avec useState', [
        tip(
          'Pourquoi une variable ordinaire ne suffit pas',
          'Une variable locale (let n = 0) a deux défauts : elle est réinitialisée à chaque rendu, et la modifier ne demande pas à React de réafficher le composant. L’écran ne change donc pas.\n\nuseState règle les deux : React garde la valeur entre les rendus et réaffiche le composant quand tu appelles la fonction de mise à jour. useState(valeurInitiale) renvoie un tableau de deux éléments que l’on déstructure : la valeur actuelle et sa fonction de mise à jour, nommée set + Nom par convention.\n\nLa valeur initiale n’est utilisée qu’au premier rendu. Si son calcul est coûteux, passe une fonction : useState(() => lireBrouillon()) ; écrire useState(lireBrouillon()) appellerait la fonction à chaque rendu pour rien.',
          'import { useState } from "react";\n\nfunction Quantite() {\n  const [quantite, setQuantite] = useState(1);\n  return (\n    <div>\n      <button onClick={() => setQuantite(quantite - 1)}>−</button>\n      <span>{quantite}</span>\n      <button onClick={() => setQuantite(quantite + 1)}>+</button>\n    </div>\n  );\n}',
        ),
        tip(
          'Un état local et privé',
          'Chaque instance d’un composant a son propre état. Si tu affiches deux <Quantite />, chacune a son compteur. Le parent ne voit pas cet état et ne peut pas le lire : pour partager, on remontera l’état (unité 4).\n\nuseState est un hook. Les hooks (toutes les fonctions qui commencent par use) s’appellent au premier niveau du composant, jamais dans un if, une boucle ou une fonction imbriquée. React les identifie par leur ordre d’appel : cet ordre doit être le même à chaque rendu.\n\nNe crée un état que pour ce qui change avec le temps et ne peut pas être calculé à partir d’autres données.',
        ),
        fill(
          'Déclare un état ouvert initialisé à false.',
          'const [ouvert, setOuvert] = ___(false);',
          ['useState', 'useEffect', 'useRef', 'state'],
          'useState',
          'useState renvoie [valeur, fonctionDeMiseAJour]. On importe le hook depuis "react".',
        ),
        qcm(
          'Pourquoi ce compteur reste-t-il bloqué à 0 à l’écran ?',
          [
            'Il faut écrire const au lieu de let',
            'Modifier une variable locale ne déclenche pas de nouveau rendu',
            'onClick ne fonctionne pas sur un bouton',
            'Il manque une key',
          ],
          1,
          'La variable change bien en mémoire, mais React ne réaffiche pas le composant ; et au rendu suivant, elle repartirait de 0. Il faut useState.',
          'function Compteur() {\n  let n = 0;\n  return <button onClick={() => n++}>{n}</button>;\n}',
        ),
        vf(
          'Deux <Compteur /> affichés côte à côte partagent le même état.',
          false,
          'L’état est attaché à chaque instance, à sa position dans l’arbre. Chaque compteur a le sien.',
        ),
        qcm(
          'Où est-il interdit d’appeler useState ?',
          [
            'Au début du composant',
            'Dans un hook personnalisé',
            'Dans un if ou une boucle',
            'Avant le return',
          ],
          2,
          'Les hooks doivent être appelés dans le même ordre à chaque rendu. Dans un if ou une boucle, cet ordre pourrait changer et React mélangerait les états.',
        ),
        qcm(
          'Quelle écriture évite de relire le localStorage à chaque rendu ?',
          [
            'useState(localStorage.getItem("panier"))',
            'useState(() => localStorage.getItem("panier"))',
            'useState[localStorage.getItem("panier")]',
            'useState(async () => localStorage.getItem("panier"))',
          ],
          1,
          'En passant une fonction (initialisation paresseuse), React ne l’appelle qu’au premier rendu. Dans la première écriture, getItem est exécuté à chaque rendu, même si le résultat est ignoré.',
        ),
        order(
          'Remets ce composant dans l’ordre.',
          [
            'function Favori() {',
            '  const [aime, setAime] = useState(false);',
            '  return (',
            '    <button onClick={() => setAime(!aime)}>',
            '      {aime ? "♥" : "♡"}',
            '    </button>',
            '  );',
            '}',
          ],
          'Le hook est appelé au premier niveau, puis le JSX utilise la valeur et la fonction de mise à jour.',
        ),
      ]),

      lesson('mises-a-jour', 'L’état est un instantané', [
        tip(
          'Chaque rendu voit sa propre valeur',
          'Appeler setQuantite ne change pas la variable quantite tout de suite. Cela demande à React un nouveau rendu, dans lequel useState renverra la nouvelle valeur. Pendant tout le gestionnaire d’événement en cours, quantite garde la valeur de ce rendu : c’est un instantané.\n\nConséquences :\n• console.log(quantite) juste après setQuantite affiche encore l’ancienne valeur ;\n• appeler trois fois setQuantite(quantite + 1) ne fait que +1, car les trois appels calculent à partir de la même valeur.\n\nReact regroupe aussi toutes les mises à jour d’un même événement pour ne faire qu’un seul nouveau rendu (le « batching »).',
          'function handleClick() {\n  setQuantite(quantite + 1); // 0 + 1\n  setQuantite(quantite + 1); // 0 + 1\n  console.log(quantite);     // 0\n}\n// Au rendu suivant : quantite vaut 1',
        ),
        tip(
          'La mise à jour fonctionnelle',
          'Quand la nouvelle valeur dépend de la précédente, passe une fonction à setQuantite : setQuantite(q => q + 1). React met cette fonction dans une file et l’appelle avec la valeur la plus récente, en tenant compte des mises à jour précédentes de la file.\n\nTrois appels setQuantite(q => q + 1) font donc bien +3. C’est la forme la plus sûre dès qu’on incrémente, qu’on bascule un booléen (setOuvert(o => !o)) ou qu’on met à jour depuis un minuteur ou une réponse réseau.\n\nAutre détail : si tu passes exactement la même valeur que l’actuelle (comparaison avec Object.is), React peut sauter le nouveau rendu.',
          'function handleClick() {\n  setQuantite(q => q + 1);\n  setQuantite(q => q + 1);\n  setQuantite(q => q + 1);\n}\n// Au rendu suivant : +3',
        ),
        qcm(
          'Si n vaut 0, que vaut n au rendu suivant ?',
          ['0', '1', '2', '3'],
          1,
          'Les trois appels calculent 0 + 1 : ils demandent tous de remplacer l’état par 1.',
          'setN(n + 1);\nsetN(n + 1);\nsetN(n + 1);',
        ),
        qcm(
          'Si n vaut 0, que vaut n au rendu suivant ?',
          ['3', '1', '0', '6'],
          0,
          'Chaque fonction reçoit le résultat de la précédente dans la file : 0 → 1 → 2 → 3.',
          'setN(x => x + 1);\nsetN(x => x + 1);\nsetN(x => x + 1);',
        ),
        vf(
          'Juste après setSolde(1000), console.log(solde) affiche 1000.',
          false,
          'solde est une constante de ce rendu-ci : elle garde l’ancienne valeur jusqu’à la fin du gestionnaire. La nouvelle valeur sera visible au prochain rendu.',
        ),
        fill(
          'Bascule le menu en partant de la valeur la plus récente.',
          'setOuvert(___);',
          ['o => !o', '!ouvert()', 'ouvert = !ouvert', 'toggle'],
          'o => !o',
          'La fonction reçoit la valeur en attente et renvoie l’inverse. C’est sûr même si plusieurs bascules sont en file.',
        ),
        qcm(
          'Si n vaut 0, que vaut n au rendu suivant ?',
          ['1', '5', '6', '0'],
          2,
          'setN(n + 5) remplace par 5, puis la fonction x => x + 1 reçoit 5 et renvoie 6.',
          'setN(n + 5);\nsetN(x => x + 1);',
        ),
        vf(
          'React regroupe les mises à jour d’état d’un même gestionnaire en un seul rendu.',
          true,
          'C’est le batching automatique : quel que soit le nombre de set appelés dans un événement, React ne réaffiche qu’une fois, à la fin.',
        ),
        match('Associe chaque appel à son effet.', [
          ['setN(5)', 'Remplace l’état par 5'],
          ['setN(n => n * 2)', 'Double la valeur la plus récente'],
          ['setN(n)', 'Même valeur : rendu évitable'],
          ['setN(() => 0)', 'Remet l’état à 0 via une fonction'],
        ]),
      ]),

      lesson('immutabilite', 'Objets et tableaux sans mutation', [
        tip(
          'Remplacer, ne jamais modifier',
          'Un état peut contenir un objet ou un tableau. Mais React détecte un changement en comparant les références (Object.is). Si tu modifies l’objet existant (client.ville = "Lomé") puis appelles setClient(client), c’est le même objet : React peut ne rien réafficher, et tu crées des bugs subtils.\n\nLa règle : traite l’état comme en lecture seule. Crée un nouvel objet avec la syntaxe de décomposition (spread), qui copie les propriétés puis remplace celles que tu indiques. Attention, la copie est superficielle : pour un objet imbriqué, il faut aussi copier le niveau intérieur.',
          'setClient({ ...client, ville: "Lomé" });\n\n// Objet imbriqué : on copie chaque niveau modifié\nsetClient({\n  ...client,\n  adresse: { ...client.adresse, quartier: "Bè" },\n});',
        ),
        tip(
          'Les tableaux : les bonnes méthodes',
          'Pour les tableaux, évite les méthodes qui modifient sur place : push, pop, shift, splice, sort, reverse, ou l’affectation arr[i] = x. Utilise celles qui renvoient un nouveau tableau :\n• ajouter : [...panier, article] ;\n• retirer : panier.filter(a => a.id !== id) ;\n• modifier : panier.map(a => a.id === id ? { ...a, qte: a.qte + 1 } : a) ;\n• trier : [...panier].sort(…) ou panier.toSorted(…).\n\nDans map, n’écris pas a.qte++ : ce serait muter l’objet d’origine, qui est encore partagé avec l’ancien état. Crée un nouvel objet pour l’élément modifié. Pour des états très imbriqués, la bibliothèque Immer permet d’écrire du code « mutant » qui produit des copies.',
        ),
        qcm(
          'Pourquoi ce bouton peut-il ne pas mettre l’écran à jour ?',
          [
            'push n’existe pas sur les tableaux',
            'Le tableau est modifié sur place : setPanier reçoit la même référence',
            'Il faut appeler setPanier avant push',
            'setPanier n’accepte pas les tableaux',
          ],
          1,
          'push modifie l’ancien tableau, et setPanier reçoit le même objet : React compare les références et peut sauter le rendu. Écris setPanier([...panier, article]).',
          'function ajouter(article) {\n  panier.push(article);\n  setPanier(panier);\n}',
        ),
        fill(
          'Retire l’article d’id donné du panier.',
          'setPanier(panier.___(a => a.id !== id));',
          ['filter', 'splice', 'pop', 'delete'],
          'filter',
          'filter renvoie un nouveau tableau avec les éléments qui passent le test. splice et pop modifient le tableau existant.',
        ),
        qcm(
          'Quelle écriture augmente la quantité de l’article id sans muter l’état ?',
          [
            'panier.find(a => a.id === id).qte++; setPanier([...panier]);',
            'setPanier(panier.map(a => a.id === id ? { ...a, qte: a.qte + 1 } : a));',
            'setPanier(panier.map(a => { if (a.id === id) a.qte++; return a; }));',
            'panier[id].qte += 1; setPanier(panier);',
          ],
          1,
          'Seule la deuxième crée un nouvel objet pour l’article modifié. Les deux premières écritures avec ++ mutent l’objet existant, même si le tableau est copié : la copie est superficielle.',
        ),
        vf(
          '{ ...client } copie aussi en profondeur l’objet client.adresse.',
          false,
          'La décomposition est superficielle : la copie pointe vers le même objet adresse. Pour modifier l’adresse, copie aussi ce niveau : { ...client, adresse: { ...client.adresse, … } }.',
        ),
        match('Associe chaque besoin à l’écriture sans mutation.', [
          ['Ajouter à la fin', '[...liste, x]'],
          ['Ajouter au début', '[x, ...liste]'],
          ['Retirer', 'liste.filter(…)'],
          ['Modifier un élément', 'liste.map(…)'],
          ['Trier', 'liste.toSorted(…)'],
        ]),
        fill(
          'Change le nom sans toucher aux autres champs.',
          'setProfil({ ___, nom: "Fatou" });',
          ['...profil', 'profil', '...nom', 'profil.nom'],
          '...profil',
          'La décomposition copie toutes les propriétés de profil, puis nom les remplace. L’ordre compte : mis avant, nom serait écrasé par la copie.',
        ),
        vf(
          'transactions.sort(…) dans un gestionnaire est sans danger si on appelle ensuite setTransactions.',
          false,
          'sort trie sur place : l’ancien état est modifié, et c’est la même référence. Utilise [...transactions].sort(…) ou transactions.toSorted(…).',
        ),
      ]),
    ],
  ),

  unit(
    'effets',
    'Effets et données',
    'Synchroniser un composant avec l’extérieur, maîtriser les dépendances et le nettoyage, charger des données proprement.',
    [
      lesson('useeffect', 'Comprendre useEffect', [
        tip(
          'Synchroniser avec un système extérieur',
          'Un effet sert à synchroniser ton composant avec quelque chose qui n’est pas géré par React : un minuteur, une connexion WebSocket, une API du navigateur, un widget externe, une requête réseau. useEffect(fonction, dépendances) exécute la fonction après que React a mis l’écran à jour (après le « commit »), pas pendant le rendu.\n\nLa fonction ne doit pas être async directement : elle peut seulement renvoyer une fonction de nettoyage. Pour utiliser await, déclare une fonction async à l’intérieur de l’effet et appelle-la.',
          'import { useEffect } from "react";\n\nfunction TitreOnglet({ nonLus }) {\n  useEffect(() => {\n    document.title = nonLus > 0 ? `(${nonLus}) Messages` : "Messages";\n  }, [nonLus]);\n  return <h1>Messages</h1>;\n}',
        ),
        tip(
          'Tu n’as souvent pas besoin d’effet',
          'Beaucoup de bugs viennent d’effets inutiles. Deux cas à reconnaître :\n• une valeur calculable à partir des props ou de l’état (un total, une liste filtrée) se calcule directement pendant le rendu, sans état ni effet ;\n• une action déclenchée par l’utilisateur (envoyer une commande au clic) se fait dans le gestionnaire d’événement, pas dans un effet qui surveille un état.\n\nQuestion à te poser : « Ce code doit-il s’exécuter parce que le composant est affiché, ou parce que l’utilisateur a fait quelque chose ? » Seul le premier cas justifie un effet.',
        ),
        qcm(
          'Quand la fonction passée à useEffect s’exécute-t-elle ?',
          [
            'Pendant le calcul du JSX',
            'Avant le premier rendu',
            'Après que React a mis à jour l’écran',
            'Uniquement au clic',
          ],
          2,
          'Les effets s’exécutent après le commit : le DOM est à jour. C’est pour cela qu’on peut y manipuler des éléments ou lancer des requêtes sans bloquer l’affichage.',
        ),
        qcm(
          'Quel est le problème de ce code ?',
          [
            'filtres doit être un tableau',
            'Un état et un effet pour une valeur calculable : il suffit de const visibles = produits.filter(…)',
            'Il manque un nettoyage',
            'useEffect ne peut pas appeler setVisibles',
          ],
          1,
          'La liste visible se déduit de produits et de recherche. Avec l’effet, il y a un rendu avec une valeur périmée puis un second rendu. Le calcul direct est plus simple et toujours juste.',
          'const [visibles, setVisibles] = useState([]);\nuseEffect(() => {\n  setVisibles(produits.filter(p => p.nom.includes(recherche)));\n}, [produits, recherche]);',
        ),
        vf(
          'On peut écrire useEffect(async () => { … }, []) pour utiliser await.',
          false,
          'Une fonction async renvoie une promesse, alors que React attend soit rien, soit une fonction de nettoyage. Déclare une fonction async dans l’effet et appelle-la.',
        ),
        fill(
          'Importe le hook des effets.',
          'import { useState, ___ } from "react";',
          ['useEffect', 'effect', 'useAfter', 'onMount'],
          'useEffect',
          'useEffect s’importe depuis "react", comme useState.',
        ),
        match('Où placer ce code ?', [
          ['Calculer le total du panier', 'Pendant le rendu'],
          ['Envoyer la commande au clic sur « Payer »', 'Dans le gestionnaire d’événement'],
          [
            'S’abonner à un WebSocket tant que le chat est affiché',
            'Dans un effet, avec nettoyage',
          ],
          ['Mettre le titre de l’onglet à jour', 'Dans un effet (API du navigateur)'],
        ]),
        vf(
          'Envoyer une requête POST dans un effet qui surveille un état « commandeValidee » est la bonne façon de réagir au clic sur « Valider ».',
          false,
          'L’envoi est causé par une action précise de l’utilisateur : il se fait dans le gestionnaire du clic. Un effet risquerait d’envoyer la commande à nouveau (par exemple au remontage du composant).',
        ),
      ]),

      lesson('dependances-nettoyage', 'Dépendances et nettoyage', [
        tip(
          'Le tableau de dépendances',
          'Le deuxième argument dit à React quand réexécuter l’effet :\n• absent : après chaque rendu ;\n• [] : une seule fois, après le premier affichage (le « montage ») ;\n• [a, b] : au montage, puis chaque fois que a ou b a changé (comparaison avec Object.is).\n\nLa règle : toute valeur réactive (prop, état, variable calculée dans le composant) utilisée dans l’effet doit être dans le tableau. Ce n’est pas un choix, c’est une description du code ; le plugin ESLint react-hooks (règle exhaustive-deps) te le signale. Attention aux objets et fonctions créés pendant le rendu : ils sont nouveaux à chaque rendu, donc l’effet se relancerait à chaque fois. Crée-les plutôt à l’intérieur de l’effet.',
          'useEffect(() => {\n  const options = { devise: "XOF" }; // créé dans l’effet\n  chargerTaux(pays, options);\n}, [pays]);',
        ),
        tip(
          'La fonction de nettoyage',
          'Un effet peut renvoyer une fonction de nettoyage. React l’appelle avant de réexécuter l’effet (avec les anciennes valeurs) et quand le composant disparaît (le « démontage »). C’est là qu’on arrête un minuteur, qu’on ferme une connexion, qu’on retire un écouteur d’événement.\n\nEn développement, StrictMode monte le composant, le démonte puis le remonte aussitôt : ton effet s’exécute, se nettoie, puis s’exécute à nouveau. Ce n’est pas un bug, c’est un test : si l’application se comporte mal (deux minuteurs, deux connexions), c’est que le nettoyage manque. En production, l’effet ne s’exécute qu’une fois au montage.',
          'useEffect(() => {\n  const id = setInterval(() => {\n    setSecondes(s => s + 1);\n  }, 1000);\n  return () => clearInterval(id);\n}, []);',
        ),
        match('Associe le tableau de dépendances à son comportement.', [
          ['Pas de tableau', 'Après chaque rendu'],
          ['[]', 'Une fois, au montage'],
          ['[userId]', 'Au montage et quand userId change'],
          ['[a, b]', 'Quand a ou b change'],
        ]),
        qcm(
          'Quel est le bug de cet effet ?',
          [
            'fetch est interdit dans un effet',
            'categorie manque dans les dépendances : l’effet ne se relance pas quand elle change',
            'Il faut un nettoyage avec clearInterval',
            'setProduits doit être dans les dépendances',
          ],
          1,
          'L’effet lit categorie mais ne la déclare pas : il garde la valeur du premier rendu. Avec [categorie], il recharge à chaque changement. Les fonctions set de useState sont stables et peuvent être omises.',
          'useEffect(() => {\n  fetch(`/api/produits?cat=${categorie}`)\n    .then(r => r.json())\n    .then(setProduits);\n}, []);',
        ),
        fill(
          'Retire l’écouteur au démontage.',
          'useEffect(() => {\n  window.addEventListener("resize", surRedim);\n  return () => window.___("resize", surRedim);\n}, []);',
          ['removeEventListener', 'addEventListener', 'clearInterval', 'off'],
          'removeEventListener',
          'Le nettoyage défait ce que l’effet a fait, avec la même fonction surRedim. Sans lui, chaque montage ajouterait un écouteur de plus.',
        ),
        vf(
          'En développement avec StrictMode, un effet avec [] peut s’exécuter deux fois au montage.',
          true,
          'React exécute effet → nettoyage → effet pour vérifier que ton nettoyage est correct. En production, une seule exécution au montage.',
        ),
        qcm(
          'Pourquoi cet effet se relance-t-il après chaque rendu ?',
          [
            'Parce que ville change à chaque rendu',
            'Parce que options est un nouvel objet à chaque rendu',
            'Parce que connecter est asynchrone',
            'Parce qu’il manque un return',
          ],
          1,
          'Deux objets créés séparément ne sont jamais égaux avec Object.is, même avec le même contenu. Crée options dans l’effet et dépends de ville seulement.',
          'const options = { ville };\nuseEffect(() => {\n  const c = connecter(options);\n  return () => c.fermer();\n}, [options]);',
        ),
        qcm(
          'Quand React appelle-t-il la fonction de nettoyage ?',
          [
            'Seulement à la fermeture de l’onglet',
            'Avant chaque nouvelle exécution de l’effet et au démontage',
            'Avant chaque rendu, même sans changement de dépendances',
            'Jamais automatiquement',
          ],
          1,
          'Le nettoyage défait l’exécution précédente avant d’en lancer une nouvelle, puis une dernière fois quand le composant disparaît.',
        ),
      ]),

      lesson('charger-donnees', 'Charger des données', [
        tip(
          'Trois états : chargement, erreur, données',
          'Une requête prend du temps et peut échouer, surtout sur un réseau mobile lent. Prévois toujours trois cas à l’écran : un indicateur de chargement, un message d’erreur (avec si possible un bouton « Réessayer »), et les données.\n\nDeux pièges de fetch :\n• fetch ne rejette pas la promesse pour une erreur HTTP (404, 500) : vérifie res.ok ;\n• si l’id change pendant qu’une requête est en cours, une réponse ancienne peut arriver après la nouvelle et l’écraser (« condition de course »). Le nettoyage règle ça : un drapeau ignore, ou un AbortController qui annule la requête.',
          'useEffect(() => {\n  let ignore = false;\n  setChargement(true);\n  setErreur(null);\n  fetch(`/api/commandes/${id}`)\n    .then(res => {\n      if (!res.ok) throw new Error(`HTTP ${res.status}`);\n      return res.json();\n    })\n    .then(data => { if (!ignore) setCommande(data); })\n    .catch(e => { if (!ignore) setErreur(e.message); })\n    .finally(() => { if (!ignore) setChargement(false); });\n  return () => { ignore = true; };\n}, [id]);',
        ),
        tip(
          'Dans un vrai projet',
          'Écrire fetch dans useEffect fonctionne et il faut le comprendre, mais cela ne met rien en cache : revenir sur une page recharge tout, et deux composants qui veulent les mêmes données font deux requêtes. En production, on utilise souvent une bibliothèque spécialisée (TanStack Query, SWR) ou les outils de chargement d’un framework (Next.js, React Router), qui gèrent le cache, les nouvelles tentatives et les conditions de course.\n\nQuelle que soit la méthode, le principe d’affichage reste le même : chargement, erreur, données, et aussi le cas « aucun résultat ».',
        ),
        qcm(
          'Pourquoi vérifier res.ok après fetch ?',
          [
            'Parce que fetch rejette toujours en cas de 404',
            'Parce que fetch ne rejette pas pour une erreur HTTP : une 500 arrive dans then',
            'Pour convertir la réponse en JSON',
            'Pour annuler la requête',
          ],
          1,
          'fetch ne rejette qu’en cas d’échec réseau. Une réponse 404 ou 500 est « réussie » du point de vue de fetch : c’est à toi de tester res.ok (statut 200 à 299).',
        ),
        qcm(
          'À quoi sert ignore = true dans le nettoyage ?',
          [
            'À arrêter le serveur',
            'À éviter qu’une ancienne réponse écrase les données de la nouvelle requête',
            'À vider le cache du navigateur',
            'À relancer la requête',
          ],
          1,
          'Quand id change, le nettoyage de l’effet précédent marque son résultat comme obsolète. Même si la vieille réponse arrive en dernier, elle est ignorée.',
        ),
        fill(
          'Annule la requête au nettoyage.',
          'const ctrl = new AbortController();\nfetch(url, { signal: ctrl.signal });\nreturn () => ctrl.___();',
          ['abort', 'cancel', 'stop', 'close'],
          'abort',
          'AbortController.abort() annule la requête liée à son signal : la promesse est rejetée avec une AbortError, qu’il faut ignorer dans le catch.',
        ),
        vf(
          'Un écran de liste chargée depuis une API devrait prévoir un affichage pour le cas où la liste est vide.',
          true,
          'Chargement, erreur, données… et zéro résultat : un message « Aucune transaction pour ce mois » vaut mieux qu’une zone blanche.',
        ),
        order(
          'Remets dans l’ordre l’affichage selon l’état de la requête.',
          [
            'if (chargement) return <Spinner />;',
            'if (erreur) return <Erreur message={erreur} />;',
            'if (commandes.length === 0) return <p>Aucune commande</p>;',
            'return <ListeCommandes items={commandes} />;',
          ],
          'On traite d’abord les cas particuliers (chargement, erreur, liste vide), puis le cas normal. Chaque if renvoie tôt.',
        ),
        qcm(
          'Quel avantage apporte une bibliothèque comme TanStack Query par rapport à fetch dans useEffect ?',
          [
            'Elle rend fetch synchrone',
            'Elle met en cache et partage les données, et gère les nouvelles tentatives',
            'Elle remplace useState dans tout le projet',
            'Elle supprime le besoin d’une API',
          ],
          1,
          'Le cache évite de recharger la même donnée à chaque affichage et partage une requête entre composants. C’est précieux sur des connexions lentes ou facturées au volume.',
        ),
      ]),

      lesson('recap-effets', 'Récap et pratique', [
        tip(
          'Ce qu’il faut retenir',
          '• Un effet synchronise le composant avec un système extérieur ; il s’exécute après la mise à jour de l’écran.\n• Pas d’effet pour une valeur calculable ni pour réagir à un clic.\n• Le tableau de dépendances liste toutes les valeurs réactives lues dans l’effet ; [] = au montage, absent = après chaque rendu.\n• Le nettoyage s’exécute avant la prochaine exécution et au démontage ; StrictMode le teste en développement.\n• Pour charger des données : chargement, erreur, données, liste vide ; vérifie res.ok et protège-toi des conditions de course.',
        ),
        tip(
          'Mise en situation : solde en temps réel',
          'Un écran affiche le solde d’un portefeuille mobile money et se met à jour toutes les 30 secondes. L’effet démarre un intervalle qui recharge le solde et le nettoie au démontage. Il dépend de compteId : si l’utilisateur change de compte, l’ancien intervalle est arrêté et un nouveau démarre.',
          'useEffect(() => {\n  function rafraichir() {\n    chargerSolde(compteId).then(setSolde);\n  }\n  rafraichir();\n  const id = setInterval(rafraichir, 30000);\n  return () => clearInterval(id);\n}, [compteId]);',
        ),
        qcm(
          'Dans cet exemple, que se passe-t-il quand compteId change ?',
          [
            'Rien, l’intervalle continue avec l’ancien compte',
            'L’ancien intervalle est arrêté, puis l’effet redémarre avec le nouveau compte',
            'Deux intervalles tournent en parallèle',
            'Le composant est démonté',
          ],
          1,
          'Le changement de dépendance déclenche le nettoyage de l’exécution précédente (clearInterval), puis une nouvelle exécution.',
        ),
        vf(
          'Si on retire le return () => clearInterval(id), les intervalles s’accumulent à chaque changement de compte.',
          true,
          'Chaque exécution crée un intervalle et rien ne l’arrête : les requêtes se multiplient, même après la fermeture de l’écran.',
        ),
        qcm(
          'Ce composant entre dans une boucle infinie. Pourquoi ?',
          [
            'L’effet sans tableau de dépendances crée un nouvel objet d’état à chaque rendu, ce qui relance un rendu, puis l’effet…',
            'Le spread est interdit dans un effet',
            'filtres devrait être une prop',
            'Il manque une key',
          ],
          0,
          'Sans tableau, l’effet s’exécute après chaque rendu. Il passe un nouvel objet à setFiltres : React voit une nouvelle référence et réaffiche, ce qui relance l’effet, sans fin. Remettre la page à 1 doit se faire dans le gestionnaire qui change la recherche.',
          'const [filtres, setFiltres] = useState({ recherche: "", page: 1 });\nuseEffect(() => {\n  setFiltres({ ...filtres, page: 1 });\n});',
        ),
        fill(
          'Relance l’effet quand l’utilisateur change.',
          'useEffect(() => {\n  chargerProfil(userId);\n}, ___);',
          ['[userId]', '[]', '{userId}', 'userId'],
          '[userId]',
          'Les dépendances sont toujours un tableau. userId est lu dans l’effet, il doit y figurer.',
        ),
        match('Associe le symptôme à sa cause probable.', [
          ['L’écran garde l’ancien produit quand l’id change', 'Dépendance manquante'],
          ['La requête part en boucle', 'Objet recréé à chaque rendu dans les dépendances'],
          ['Deux connexions en développement', 'Nettoyage absent, révélé par StrictMode'],
          ['Une erreur 500 affichée comme un succès', 'res.ok non vérifié'],
        ]),
        vf(
          'Pour filtrer une liste selon un champ de recherche, il faut un effet qui met à jour un état « listeFiltree ».',
          false,
          'C’est une valeur dérivée : const listeFiltree = liste.filter(…) pendant le rendu. Si le calcul est vraiment lourd, useMemo peut le mémoriser.',
        ),
      ]),
    ],
  ),

  unit(
    'listes-formulaires',
    'Listes, formulaires et état partagé',
    'Afficher des listes avec de bonnes keys, gérer des formulaires contrôlés et partager l’état entre composants.',
    [
      lesson('listes-keys', 'Listes et keys', [
        tip(
          'Afficher une liste avec map',
          'Pour afficher une liste, on transforme un tableau de données en tableau d’éléments JSX avec map. React sait afficher un tableau d’éléments. On combine souvent filter (garder certains éléments) puis map (les transformer).\n\nChaque élément de la liste doit avoir une prop key : une chaîne ou un nombre unique parmi ses frères, et stable dans le temps. React s’en sert pour savoir quel élément est lequel d’un rendu à l’autre, quand on ajoute, retire ou réordonne.',
          'function ListeTransactions({ transactions }) {\n  return (\n    <ul>\n      {transactions\n        .filter(t => t.montant > 0)\n        .map(t => (\n          <li key={t.id}>\n            {t.libelle} : {t.montant} FCFA\n          </li>\n        ))}\n    </ul>\n  );\n}',
        ),
        tip(
          'Choisir une bonne key',
          '• La meilleure key vient des données : l’id de la base, une référence de transaction.\n• L’index du tableau ne convient que pour une liste qui ne bouge jamais. Si on insère, supprime ou trie, l’index change de sens et React mélange l’état des lignes (un champ saisi reste sur la mauvaise ligne).\n• Jamais de key={Math.random()} : elle change à chaque rendu, React recrée tous les éléments et leur état est perdu.\n\nLa key se place sur l’élément renvoyé par map, pas dans le composant enfant. Elle n’est pas transmise comme prop : si l’enfant a besoin de l’id, passe-le aussi en prop. Pour un fragment avec key, utilise <Fragment key={…}>, car la forme courte <> n’accepte pas d’attribut.',
        ),
        qcm(
          'Quelle key choisir pour une liste de produits qu’on peut trier par prix ?',
          ['L’index du tableau', 'Math.random()', 'produit.id', 'Le prix'],
          2,
          'L’id est unique et stable. L’index change au tri, Math.random() à chaque rendu, et deux produits peuvent avoir le même prix.',
        ),
        fill(
          'Donne une key à chaque ligne.',
          '{clients.map(c => <li ___={c.id}>{c.nom}</li>)}',
          ['key', 'id', 'index', 'ref'],
          'key',
          'key est une prop spéciale lue par React. id serait un simple attribut HTML sans effet sur l’identification des éléments.',
        ),
        vf(
          'Un composant enfant peut lire sa key avec props.key.',
          false,
          'key est réservée à React et n’est pas transmise. Si l’enfant a besoin de l’identifiant, passe-le dans une autre prop : <Ligne key={p.id} id={p.id} />.',
        ),
        qcm(
          'Où mettre la key dans ce code ?',
          [
            'Sur le <li> à l’intérieur de Ligne',
            'Sur <Ligne /> dans le map',
            'Sur le <ul>',
            'Nulle part, Ligne est un composant',
          ],
          1,
          'La key va sur l’élément directement renvoyé par le map : <Ligne key={p.id} produit={p} />.',
          '<ul>\n  {produits.map(p => <Ligne produit={p} />)}\n</ul>',
        ),
        qcm(
          'Une liste de champs utilise key={index}. On supprime la première ligne : le texte saisi reste affiché sur la mauvaise ligne. Pourquoi ?',
          [
            'Les inputs ne gardent pas leur valeur',
            'Les index se décalent : React croit que la ligne 0 existe toujours et garde son état',
            'Il faut un formulaire contrôlé',
            'map ne fonctionne pas après une suppression',
          ],
          1,
          'Avec l’index, la nouvelle ligne 0 reçoit l’identité et l’état de l’ancienne. Une key stable tirée des données suit l’élément où qu’il soit.',
        ),
        match('Associe chaque key à son verdict.', [
          ['key={t.id}', 'Idéale : stable et unique'],
          ['key={index}', 'Acceptable seulement si la liste ne change jamais'],
          ['key={Math.random()}', 'À proscrire : change à chaque rendu'],
          ['key={t.nom}', 'Risquée si deux éléments ont le même nom'],
        ]),
      ]),

      lesson('formulaires', 'Formulaires contrôlés', [
        tip(
          'L’état React comme source de vérité',
          'Un champ contrôlé reçoit sa valeur de l’état (value) et signale chaque frappe (onChange). L’état est ainsi toujours à jour : tu peux valider en direct, formater, désactiver le bouton.\n\nSelon le champ :\n• input texte, textarea, select : value et e.target.value ;\n• case à cocher : checked et e.target.checked ;\n• input type="number" : e.target.value est une chaîne, convertis avec Number().\n\nPièges : value sans onChange rend le champ bloqué (React avertit) ; et une valeur initiale undefined fait passer le champ de non contrôlé à contrôlé : initialise avec "" plutôt. Pour un champ non contrôlé, on utilise defaultValue.',
          'function FormulaireContact() {\n  const [form, setForm] = useState({ nom: "", tel: "", whatsapp: false });\n\n  function handleChange(e) {\n    const { name, value, type, checked } = e.target;\n    setForm({ ...form, [name]: type === "checkbox" ? checked : value });\n  }\n\n  return (\n    <>\n      <input name="nom" value={form.nom} onChange={handleChange} />\n      <input name="tel" value={form.tel} onChange={handleChange} />\n      <input name="whatsapp" type="checkbox" checked={form.whatsapp} onChange={handleChange} />\n    </>\n  );\n}',
        ),
        tip(
          'Envoyer et valider',
          'On écoute onSubmit sur la balise <form>, pas onClick sur le bouton : l’envoi fonctionne alors aussi avec la touche Entrée. La première ligne est e.preventDefault(), sinon le navigateur recharge la page.\n\nValide avant d’envoyer, affiche les erreurs près du champ concerné, et désactive le bouton pendant l’envoi pour éviter un double paiement. Garde la validation côté serveur : celle du navigateur sert au confort, pas à la sécurité.\n\nEn React 19, <form action={fonction}> existe aussi : la fonction reçoit un FormData (formData.get("nom")), et les champs non contrôlés sont réinitialisés après une action réussie.',
          'async function handleSubmit(e) {\n  e.preventDefault();\n  if (!/^\\d{8,}$/.test(form.tel)) {\n    setErreur("Numéro invalide");\n    return;\n  }\n  setEnvoi(true);\n  await envoyer(form);\n  setEnvoi(false);\n}',
        ),
        fill(
          'Complète le champ contrôlé.',
          '<input value={ville} onChange={e => setVille(e.target.___)} />',
          ['value', 'checked', 'text', 'innerHTML'],
          'value',
          'Pour un champ texte, la saisie se lit dans e.target.value. checked est réservé aux cases à cocher et boutons radio.',
        ),
        qcm(
          'Ce champ refuse toute saisie. Pourquoi ?',
          [
            'Il manque name',
            'value est fourni sans onChange : React fige la valeur',
            'email doit être un nombre',
            'type="email" n’est pas supporté en React',
          ],
          1,
          'Un champ contrôlé affiche toujours value. Sans onChange pour mettre l’état à jour, chaque frappe est annulée. Ajoute onChange, ou utilise defaultValue pour un champ non contrôlé.',
          '<input type="email" value={email} />',
        ),
        vf(
          'Avec un input type="number", e.target.value est déjà un nombre.',
          false,
          'C’est toujours une chaîne ("1500"). Convertis avec Number(e.target.value) avant de calculer, sinon "1500" + 500 donne "1500500".',
        ),
        qcm(
          'Pourquoi écouter onSubmit sur <form> plutôt que onClick sur le bouton ?',
          [
            'onClick ne fonctionne pas sur les boutons',
            'onSubmit gère aussi l’envoi avec la touche Entrée',
            'onSubmit empêche automatiquement le rechargement',
            'C’est obligatoire depuis React 19',
          ],
          1,
          'Le navigateur déclenche submit au clic sur le bouton d’envoi comme à la touche Entrée dans un champ. Il faut quand même appeler e.preventDefault().',
        ),
        order(
          'Remets dans l’ordre le gestionnaire d’envoi.',
          [
            'function handleSubmit(e) {',
            '  e.preventDefault();',
            '  if (montant <= 0) return setErreur("Montant invalide");',
            '  envoyerPaiement(montant);',
            '}',
          ],
          'On bloque d’abord le rechargement, on valide, puis on envoie seulement si les données sont correctes.',
        ),
        match('Associe le champ à ses props contrôlées.', [
          ['<input type="text">', 'value + onChange'],
          ['<input type="checkbox">', 'checked + onChange'],
          ['<select>', 'value sur le select + onChange'],
          ['Champ non contrôlé', 'defaultValue'],
        ]),
      ]),

      lesson('partager-etat', 'Partager et organiser l’état', [
        tip(
          'Remonter l’état',
          'Quand deux composants doivent afficher ou modifier la même donnée, déplace l’état dans leur plus proche parent commun. Le parent passe la valeur en props et une fonction pour la changer (onChange, onAjout…). Il n’existe alors qu’une seule source de vérité.\n\nExemple : une liste de produits et le badge du panier dans l’en-tête. Si chacun avait son propre état, ils seraient vite désynchronisés. On place le panier dans App, qui le passe à l’en-tête (pour le nombre) et à la liste (avec onAjout).',
          'function App() {\n  const [panier, setPanier] = useState([]);\n  return (\n    <>\n      <Entete nombre={panier.length} />\n      <Catalogue onAjout={p => setPanier(prev => [...prev, p])} />\n    </>\n  );\n}',
        ),
        tip(
          'Bien structurer son état',
          '• Pas de redondance : ce qui se calcule (total, nombre, nom complet) ne va pas dans l’état.\n• Pas de duplication : stocke selectedId plutôt qu’une copie de l’objet sélectionné, qui deviendrait périmée.\n• Pas d’états contradictoires : un statut "saisie" | "envoi" | "envoye" vaut mieux que deux booléens envoi et envoye.\n• Ne copie pas une prop dans un état : useState(props.prix) ne lit la prop qu’au premier rendu.\n\nL’état est lié à la position du composant dans l’arbre. Pour réinitialiser un composant (un formulaire quand on change de client), donne-lui une key différente : <FicheClient key={client.id} />.',
        ),
        qcm(
          'Le badge du panier (dans l’en-tête) et le catalogue doivent partager le panier. Où placer l’état ?',
          [
            'Dans le badge',
            'Dans le catalogue',
            'Dans leur plus proche parent commun',
            'Dans une variable globale let',
          ],
          2,
          'Le parent commun possède l’état et le transmet : valeur vers le badge, fonction de mise à jour vers le catalogue.',
        ),
        vf(
          'const [prix, setPrix] = useState(props.prix) suit automatiquement les changements de props.prix.',
          false,
          'La valeur initiale n’est lue qu’au premier rendu. Si tu veux toujours la prop, utilise-la directement ; si tu veux une valeur de départ modifiable, nomme la prop prixInitial pour que ce soit clair.',
        ),
        qcm(
          'Quelle structure d’état évite les incohérences ?',
          [
            'enCours et termine, deux booléens',
            'statut : "saisie", "envoi" ou "envoye"',
            'Trois états dont un pour le message',
            'Un état par champ et un autre qui copie tous les champs',
          ],
          1,
          'Avec deux booléens, enCours et termine pourraient être vrais ensemble, ce qui n’a pas de sens. Un seul statut empêche de représenter une situation impossible.',
        ),
        fill(
          'Réinitialise le formulaire quand le client change.',
          '<FormulaireClient ___={client.id} client={client} />',
          ['key', 'id', 'reset', 'ref'],
          'key',
          'Quand la key change, React considère que c’est un autre composant : il démonte l’ancien et monte un nouveau, avec un état neuf.',
        ),
        qcm(
          'Pourquoi stocker selectedId plutôt que selectedProduit (copie de l’objet) ?',
          [
            'Les objets sont interdits dans useState',
            'La copie deviendrait périmée si le produit est modifié dans la liste',
            'Les id sont plus rapides à afficher',
            'Pour éviter une key',
          ],
          1,
          'Avec l’id, on retrouve l’objet à jour à chaque rendu : const selected = produits.find(p => p.id === selectedId).',
        ),
        match('Associe chaque donnée à sa place.', [
          ['Le texte saisi dans la recherche', 'État du composant de recherche ou de son parent'],
          ['Le nombre d’articles du panier', 'Calculé : panier.length'],
          ['Le panier lu par l’en-tête et le catalogue', 'État remonté dans le parent commun'],
          ['Le prix reçu du parent', 'Prop, utilisée telle quelle'],
        ]),
      ]),

      lesson('recap-listes', 'Récap et pratique', [
        tip(
          'Ce qu’il faut retenir',
          '• map transforme les données en éléments ; chaque élément a une key unique et stable, tirée des données.\n• L’index comme key seulement pour une liste figée ; jamais Math.random().\n• Champ contrôlé : value (ou checked) + onChange ; initialise avec "" ; e.target.value est toujours une chaîne.\n• onSubmit sur le <form>, avec e.preventDefault() ; valide avant d’envoyer et désactive le bouton pendant l’envoi.\n• Un état partagé remonte au parent commun ; pas de valeur dérivée ni de copie dans l’état.\n• Une key différente réinitialise un composant.',
        ),
        tip(
          'Mise en situation : transfert mobile money',
          'Un formulaire de transfert : un select pour l’opérateur, un champ pour le numéro, un champ pour le montant. Le bouton est désactivé tant que le montant n’est pas valide ou pendant l’envoi. Le message d’erreur est relié au champ avec aria-describedby pour les lecteurs d’écran.',
          '<form onSubmit={handleSubmit}>\n  <label htmlFor="montant">Montant (FCFA)</label>\n  <input\n    id="montant"\n    type="number"\n    value={montant}\n    onChange={e => setMontant(e.target.value)}\n    aria-describedby="erreur-montant"\n  />\n  {erreur && <p id="erreur-montant">{erreur}</p>}\n  <button disabled={envoi || Number(montant) <= 0}>Envoyer</button>\n</form>',
        ),
        qcm(
          'Dans ce formulaire, pourquoi Number(montant) dans la condition du bouton ?',
          [
            'Pour formater le montant en FCFA',
            'Parce que la valeur d’un input est une chaîne',
            'Parce que disabled n’accepte que des nombres',
            'Ce n’est pas utile',
          ],
          1,
          'montant vient de e.target.value, donc c’est une chaîne. La conversion rend la comparaison explicite et fiable (une chaîne vide devient 0).',
        ),
        vf(
          'Un <button> placé dans un <form> sans attribut type est un bouton d’envoi.',
          true,
          'Le type par défaut d’un bouton dans un formulaire est submit. Pour un bouton qui ne doit pas envoyer (« Annuler »), écris type="button".',
        ),
        qcm(
          'Que manque-t-il pour que ce rendu de liste soit correct ?',
          [
            'Un fragment autour du map',
            'Une key sur <Ligne>',
            'Un return dans la fonction fléchée',
            'Un état pour transactions',
          ],
          2,
          'Avec des accolades, une fonction fléchée doit faire return, sinon elle renvoie undefined et rien ne s’affiche. Écris map(t => <Ligne … />) sans accolades, ou ajoute return.',
          '{transactions.map(t => {\n  <Ligne key={t.id} transaction={t} />;\n})}',
        ),
        fill(
          'Mets à jour le bon champ selon son attribut name.',
          'setForm({ ...form, [e.target.___]: e.target.value });',
          ['name', 'id', 'key', 'type'],
          'name',
          'Le nom de propriété calculé [e.target.name] permet un seul gestionnaire pour tous les champs, à condition que chaque input ait un name correspondant à une clé de l’état.',
        ),
        match('Associe chaque problème à sa solution.', [
          ['Double paiement au double clic', 'Désactiver le bouton pendant l’envoi'],
          ['Page rechargée à l’envoi', 'e.preventDefault()'],
          ['Formulaire qui garde l’ancien client', 'key={client.id}'],
          ['Deux composants désynchronisés', 'Remonter l’état'],
        ]),
        vf(
          'La validation dans le navigateur suffit à protéger l’API contre des montants invalides.',
          false,
          'N’importe qui peut appeler l’API sans passer par ton formulaire. La validation côté client améliore l’expérience ; le serveur doit toujours revérifier.',
        ),
      ]),
    ],
  ),

  unit(
    'structure-performance',
    'Structure et performance',
    'Utiliser useRef et le contexte, écrire des hooks personnalisés, structurer une application et optimiser seulement quand c’est utile.',
    [
      lesson('refs-contexte', 'useRef et le contexte', [
        tip(
          'useRef : une boîte qui ne déclenche pas de rendu',
          'useRef(valeurInitiale) renvoie un objet { current } qui garde sa valeur entre les rendus. Contrairement à l’état, modifier ref.current ne réaffiche pas le composant. Deux usages :\n• accéder à un élément du DOM : <input ref={champRef} />, puis champRef.current.focus() dans un gestionnaire ou un effet ;\n• garder une valeur qui ne s’affiche pas, comme l’identifiant d’un minuteur.\n\nNe lis pas et n’écris pas ref.current pendant le rendu (sauf initialisation) : le résultat ne serait plus prévisible. En React 19, un composant fonction peut recevoir ref directement comme prop ; forwardRef n’est plus nécessaire pour le nouveau code.',
          'function Recherche() {\n  const champRef = useRef(null);\n  return (\n    <>\n      <input ref={champRef} placeholder="Rechercher un produit" />\n      <button onClick={() => champRef.current.focus()}>🔍</button>\n    </>\n  );\n}',
        ),
        tip(
          'Le contexte : éviter de passer les props partout',
          'Quand une donnée est utile à beaucoup de composants à différents niveaux (thème, langue, utilisateur connecté), la passer de prop en prop devient pénible : c’est le « prop drilling ». Le contexte la rend disponible à tout le sous-arbre.\n\nTrois étapes : createContext(valeurParDéfaut) dans un module, un fournisseur autour de l’arbre, et useContext(MonContexte) dans les composants qui la lisent. En React 19, on écrit le fournisseur <ThemeContext value="sombre"> ; l’ancienne forme <ThemeContext.Provider value=…> fonctionne toujours. Un composant lit le fournisseur le plus proche au-dessus de lui, ou la valeur par défaut s’il n’y en a pas.\n\nTous les lecteurs se réaffichent quand la valeur change : réserve le contexte aux données vraiment globales et essaie d’abord les props ou la composition avec children.',
          'const LangueContext = createContext("fr");\n\nfunction App() {\n  return (\n    <LangueContext value="wo">\n      <Accueil />\n    </LangueContext>\n  );\n}\n\nfunction Bienvenue() {\n  const langue = useContext(LangueContext);\n  return <p>{langue === "wo" ? "Dalal ak jàmm" : "Bienvenue"}</p>;\n}',
        ),
        qcm(
          'Que se passe-t-il quand on exécute compteurRef.current += 1 dans un gestionnaire ?',
          [
            'Le composant se réaffiche',
            'La valeur change mais aucun nouveau rendu n’est déclenché',
            'React lève une erreur',
            'La valeur est perdue au rendu suivant',
          ],
          1,
          'Une ref est une boîte mutable que React ne surveille pas. Si la valeur doit apparaître à l’écran, c’est un état.',
        ),
        fill(
          'Donne le focus au champ.',
          'const champRef = useRef(null);\n// …\nchampRef.___.focus();',
          ['current', 'value', 'element', 'dom'],
          'current',
          'L’élément DOM est rangé dans la propriété current de la ref, une fois le composant affiché.',
        ),
        qcm(
          'Quel composant affiche « sombre » ?',
          [
            'Un composant hors de tout fournisseur',
            'Un composant à l’intérieur de <ThemeContext value="sombre">',
            'Le composant qui contient le fournisseur dans son JSX',
            'Aucun : useContext renvoie toujours la valeur par défaut',
          ],
          1,
          'useContext cherche le fournisseur le plus proche au-dessus du composant. Le composant qui rend le fournisseur est au-dessus de lui, il lit donc le fournisseur de ses propres ancêtres.',
        ),
        vf(
          'Le contexte est la meilleure solution dès qu’une prop traverse deux niveaux.',
          false,
          'Deux niveaux de props, c’est explicite et lisible. Le contexte convient aux données globales (thème, langue, utilisateur). Avant, pense aussi à la composition avec children.',
        ),
        match('Associe le besoin à l’outil.', [
          ['Donner le focus à un champ', 'useRef avec l’attribut ref'],
          ['Afficher un compteur qui change', 'useState'],
          ['Partager la langue dans toute l’app', 'Contexte'],
          ['Garder l’id d’un setInterval', 'useRef (valeur non affichée)'],
        ]),
      ]),

      lesson('hooks-structure', 'Hooks personnalisés et structure', [
        tip(
          'Écrire ses propres hooks',
          'Un hook personnalisé est une fonction dont le nom commence par use suivi d’une majuscule (useEnLigne, useFetch) et qui appelle d’autres hooks. Il sert à partager de la logique entre composants, pas l’état : chaque composant qui l’appelle obtient son propre état, indépendant.\n\nLes règles des hooks s’appliquent : appelle-les au premier niveau d’un composant ou d’un autre hook, jamais dans une condition, une boucle ou après un return anticipé. Une fonction qui n’appelle aucun hook ne doit pas commencer par use : c’est une fonction ordinaire.',
          'function useEnLigne() {\n  const [enLigne, setEnLigne] = useState(navigator.onLine);\n  useEffect(() => {\n    const on = () => setEnLigne(true);\n    const off = () => setEnLigne(false);\n    window.addEventListener("online", on);\n    window.addEventListener("offline", off);\n    return () => {\n      window.removeEventListener("online", on);\n      window.removeEventListener("offline", off);\n    };\n  }, []);\n  return enLigne;\n}',
        ),
        tip(
          'Découper et router l’application',
          'Découpe en composants selon les responsabilités : un composant qui fait trop de choses ou dépasse quelques centaines de lignes mérite d’être séparé. Range les fichiers par fonctionnalité (catalogue/, panier/, paiement/) plutôt que par type, et garde les composants génériques (Bouton, Modale) dans un dossier partagé.\n\nPour plusieurs pages, on utilise un routeur. Avec React Router (paquet react-router en version 7), on déclare <Routes> et des <Route path="/produits/:id" element={<Produit />} /> dans un <BrowserRouter>, on navigue avec <Link to="/panier"> (sans rechargement), et useParams() lit les paramètres de l’URL, toujours sous forme de chaînes. Côté hébergement, toutes les URL doivent renvoyer index.html.',
          'import { BrowserRouter, Routes, Route, Link, useParams } from "react-router";\n\nfunction Produit() {\n  const { id } = useParams();\n  return <h1>Produit {id}</h1>;\n}\n\n<BrowserRouter>\n  <Link to="/produits/42">Voir</Link>\n  <Routes>\n    <Route path="/" element={<Catalogue />} />\n    <Route path="/produits/:id" element={<Produit />} />\n  </Routes>\n</BrowserRouter>',
        ),
        qcm(
          'Deux composants appellent useEnLigne(). Partagent-ils le même état ?',
          [
            'Oui, un hook est un singleton',
            'Non, chaque appel a son propre état',
            'Oui, si le hook est dans le même fichier',
            'Seulement en production',
          ],
          1,
          'Un hook personnalisé partage la logique. Chaque appel crée ses propres useState et useEffect. Pour partager une valeur, on remonte l’état ou on utilise un contexte.',
        ),
        vf(
          'Une fonction formaterPrix qui n’appelle aucun hook devrait s’appeler useFormaterPrix.',
          false,
          'Le préfixe use signale qu’une fonction appelle des hooks et doit suivre leurs règles. Une fonction ordinaire garde un nom ordinaire, et peut être appelée partout, même dans une condition.',
        ),
        qcm(
          'Quel code viole les règles des hooks ?',
          [
            'const [a, setA] = useState(0); en haut du composant',
            'if (connecte) { const [b, setB] = useState(""); }',
            'Un hook personnalisé qui appelle useEffect',
            'Appeler useContext dans un hook personnalisé',
          ],
          1,
          'Un hook dans un if peut être appelé à un rendu et pas au suivant : l’ordre des hooks change et React associe les mauvais états.',
        ),
        fill(
          'Lis le paramètre :id de l’URL.',
          'const { id } = ___();',
          ['useParams', 'useRoute', 'useLocation', 'useId'],
          'useParams',
          'useParams renvoie les paramètres dynamiques de la route. useId n’a rien à voir : il génère des identifiants uniques pour l’accessibilité.',
        ),
        match('Associe l’élément de React Router à son rôle.', [
          ['<BrowserRouter>', 'Relie le routeur à l’URL du navigateur'],
          ['<Route path element>', 'Associe une URL à un composant'],
          ['<Link to>', 'Lien interne sans rechargement'],
          ['useNavigate()', 'Naviguer depuis le code'],
        ]),
      ]),

      lesson('performance', 'Performance : memo, useMemo, useCallback', [
        tip(
          'Quand un composant se réaffiche',
          'Un composant se réaffiche quand son état change, quand son parent se réaffiche, ou quand un contexte qu’il lit change. Un rendu n’est pas une mise à jour du DOM : React compare le résultat et ne touche le DOM que là où il y a une différence. La plupart des rendus sont rapides et sans problème.\n\nTrois outils pour éviter du travail :\n• memo(Composant) saute le rendu si toutes les props sont égales (Object.is) ;\n• useMemo(() => calcul, [deps]) garde le résultat d’un calcul coûteux tant que les dépendances ne changent pas ;\n• useCallback(fn, [deps]) garde la même fonction, utile pour la passer à un composant mémorisé.',
          'const LigneProduit = memo(function LigneProduit({ produit, onAjout }) {\n  return <li>{produit.nom} <button onClick={() => onAjout(produit.id)}>+</button></li>;\n});\n\nconst visibles = useMemo(\n  () => produits.filter(p => p.nom.includes(recherche)),\n  [produits, recherche],\n);\nconst handleAjout = useCallback(id => setPanier(p => [...p, id]), []);',
        ),
        tip(
          'Quand NE PAS mémoriser, et les alternatives',
          'Mémoriser a un coût : du code en plus, des dépendances à maintenir, de la mémoire. Ne l’utilise pas par défaut. Mesure d’abord avec le Profiler des React DevTools, sur une version de production. memo ne sert à rien si une prop change à chaque rendu (objet ou fonction recréés) ; useMemo ne sert à rien pour un calcul rapide.\n\nAvant de mémoriser, essaie de mieux structurer : descendre l’état dans le composant qui l’utilise, passer du JSX en children. React Compiler, un outil de build optionnel, peut aussi ajouter ces mémorisations automatiquement.\n\nPour alléger le premier chargement, lazy(() => import("./Admin.jsx")) avec <Suspense fallback={…}> ne télécharge le code d’un écran que lorsqu’il s’affiche.',
        ),
        qcm(
          'LigneProduit est enveloppé dans memo, mais se réaffiche à chaque frappe dans la recherche. Pourquoi ?',
          [
            'memo ne fonctionne qu’avec des classes',
            'onAjout est une nouvelle fonction à chaque rendu du parent',
            'produit.id change',
            'memo ne compare que children',
          ],
          1,
          'Une fonction fléchée écrite dans le parent est recréée à chaque rendu : la prop n’est jamais égale. useCallback garde la même fonction.',
          '<LigneProduit produit={p} onAjout={id => ajouter(id)} />',
        ),
        vf(
          'Il faut envelopper tous les calculs dans useMemo pour qu’une application React soit rapide.',
          false,
          'Pour un calcul rapide, useMemo coûte plus qu’il ne rapporte. On le réserve aux calculs mesurés comme coûteux ou aux valeurs passées à un composant mémorisé.',
        ),
        fill(
          'Mémorise la fonction entre les rendus.',
          'const handleSupprimer = ___(id => {\n  setPanier(p => p.filter(a => a.id !== id));\n}, []);',
          ['useCallback', 'useMemo', 'memo', 'useRef'],
          'useCallback',
          'useCallback(fn, deps) renvoie la même fonction tant que les dépendances ne changent pas. La mise à jour fonctionnelle évite d’avoir panier en dépendance.',
        ),
        match('Associe l’outil à ce qu’il mémorise.', [
          ['memo', 'Le rendu d’un composant'],
          ['useMemo', 'Le résultat d’un calcul'],
          ['useCallback', 'Une fonction'],
          ['lazy', 'Le chargement du code d’un composant'],
        ]),
        qcm(
          'Quelle est la première étape face à une interface lente ?',
          [
            'Mettre memo sur tous les composants',
            'Mesurer avec le Profiler pour trouver la cause',
            'Remplacer useState par useRef',
            'Supprimer StrictMode',
          ],
          1,
          'Sans mesure, on optimise au hasard. Le Profiler montre quels composants se réaffichent et combien de temps cela prend.',
        ),
      ]),

      lesson('recap-final', 'Récap et pratique', [
        tip(
          'Accessibilité : React ne la fait pas pour toi',
          'Une interface accessible fonctionne au clavier, avec un lecteur d’écran et sur un petit écran. React génère le HTML que tu écris : c’est à toi de choisir les bons éléments.\n\n• Un <button> pour une action, un <Link> ou <a> pour naviguer ; évite <div onClick>, inaccessible au clavier.\n• Chaque champ a un <label htmlFor> ; useId() génère un identifiant unique et stable pour relier label et champ (ne l’utilise pas comme key).\n• Les images ont un alt, les boutons-icônes un aria-label.\n• Les messages dynamiques (erreur, paiement reçu) peuvent être annoncés avec aria-live ; après l’ouverture d’une modale, déplace le focus.\n\nLe plugin eslint-plugin-jsx-a11y signale beaucoup d’oublis.',
          'function ChampTel() {\n  const id = useId();\n  return (\n    <>\n      <label htmlFor={id}>Téléphone</label>\n      <input id={id} type="tel" autoComplete="tel" />\n    </>\n  );\n}',
        ),
        tip(
          'Révision générale',
          'Tu as parcouru tout le programme : composants et JSX, props et children, état et événements, effets et données, listes et formulaires, structure et performance. Les questions suivantes mélangent tout, comme à l’examen react-essentiel. Pour chacune, demande-toi : quelle est la source de vérité ? Est-ce du rendu (pur), un événement ou une synchronisation (effet) ? Est-ce que je mute quelque chose ? Cette grille de lecture résout la majorité des bugs React.',
        ),
        qcm(
          'Pourquoi remplacer <div onClick={ouvrir}>Menu</div> par un <button> ?',
          [
            'Le div ne déclenche pas onClick',
            'Le bouton est focalisable et s’active au clavier, et il est annoncé comme bouton',
            'Le bouton est plus rapide à afficher',
            'React interdit onClick sur un div',
          ],
          1,
          'Un <button> natif reçoit le focus, réagit à Entrée et Espace, et a le bon rôle pour les lecteurs d’écran. Un div n’a rien de tout cela sans beaucoup de code en plus.',
        ),
        vf(
          'useId est une bonne source de keys pour une liste.',
          false,
          'useId sert aux attributs d’accessibilité (id, htmlFor, aria-describedby). Les keys doivent venir des données.',
        ),
        qcm(
          'Repère le bug dans ce composant.',
          [
            'Le contexte est mal lu',
            'La key est l’index',
            'Le tableau d’état est muté avec sort pendant le rendu',
            'Il manque un fragment',
          ],
          2,
          'sort trie sur place l’état lui-même pendant le rendu : le composant n’est plus pur. Écris const tries = commandes.toSorted((a, b) => b.date - a.date).',
          'function Historique() {\n  const [commandes] = useState(chargees);\n  const tries = commandes.sort((a, b) => b.date - a.date);\n  return tries.map(c => <Commande key={c.id} commande={c} />);\n}',
        ),
        match('Associe chaque situation au bon outil React.', [
          ['Valeur qui change et s’affiche', 'useState'],
          ['Synchroniser avec un WebSocket', 'useEffect'],
          ['Accéder à un élément du DOM', 'useRef'],
          ['Donnée globale comme la langue', 'useContext'],
          ['Calcul coûteux mesuré', 'useMemo'],
        ]),
        fill(
          'Relie le libellé au champ.',
          '<label ___={id}>Montant</label>\n<input id={id} />',
          ['htmlFor', 'for', 'labelFor', 'aria-for'],
          'htmlFor',
          'En JSX, l’attribut for s’écrit htmlFor. Un clic sur le libellé met alors le focus dans le champ, et le lecteur d’écran annonce le libellé.',
        ),
        qcm(
          'Ce compteur de secondes affiche toujours 1. Pourquoi ?',
          [
            'setInterval ne fonctionne pas dans React',
            'L’effet garde la valeur s du premier rendu : il faut setS(x => x + 1)',
            'Il manque clearInterval',
            'Le tableau doit être [s]',
          ],
          1,
          'Avec [], l’intervalle est créé une fois et capture s = 0 : il demande toujours 0 + 1. La mise à jour fonctionnelle part de la valeur la plus récente. (Le nettoyage manque aussi, mais ce n’est pas la cause de l’affichage bloqué.)',
          'useEffect(() => {\n  setInterval(() => setS(s + 1), 1000);\n}, []);',
        ),
        vf(
          'Un composant enveloppé dans memo se réaffiche quand même si un contexte qu’il lit change.',
          true,
          'memo ne compare que les props. Un changement d’état interne ou d’un contexte lu par le composant déclenche toujours son rendu.',
        ),
      ]),
    ],
  ),
];
