import { fill, lesson, match, order, qcm, tip, unit, vf } from './dsl';
import type { CourseUnit } from './types';

/**
 * Cours « Bases de données et SQL » : prépare à la certification DevHub sql-fondamentaux.
 * Référence : PostgreSQL ; les différences avec MySQL et SQLite sont signalées dans les fiches.
 */

/** Table d’exemple des unités 1 à 3 : une petite boutique à Lomé. */
const PRODUITS =
  'Table produits\n| id | nom        | categorie | prix  | stock |\n|----|------------|-----------|-------|-------|\n| 1  | Riz 5 kg   | epicerie  | 4500  | 30    |\n| 2  | Huile 1 L  | epicerie  | 1500  | 0     |\n| 3  | Savon      | hygiene   | 300   | 120   |\n| 4  | Pagne wax  | textile   | 12000 | 8     |\n| 5  | Sucre 1 kg | epicerie  | 800   | NULL  |';

/** Élèves et notes : sert pour NULL et la logique à trois valeurs. */
const ELEVES =
  'Table eleves\n| id | nom   | ville  | note |\n|----|-------|--------|------|\n| 1  | Aïcha | Lomé   | 15   |\n| 2  | Kodjo | Kara   | NULL |\n| 3  | Fatou | Lomé   | 9    |\n| 4  | Yao   | Sokodé | 12   |';

/** Ventes pour les agrégats : une ligne par vente. */
const VENTES =
  'Table ventes\n| id | vendeur | ville  | montant |\n|----|---------|--------|---------|\n| 1  | Ama     | Lomé   | 2000    |\n| 2  | Ama     | Lomé   | 3000    |\n| 3  | Koffi   | Kara   | 5000    |\n| 4  | Koffi   | Kara   | NULL    |\n| 5  | Edem    | Lomé   | 1000    |';

/** Clients et commandes pour les jointures (la commande 13 est une vente au comptoir, sans client). */
const CLIENTS_COMMANDES =
  'Table clients\n| id | nom   | ville |\n|----|-------|-------|\n| 1  | Awa   | Lomé  |\n| 2  | Kofi  | Accra |\n| 3  | Nadia | Dakar |\n\nTable commandes\n| id | client_id | total |\n|----|-----------|-------|\n| 10 | 1         | 5000  |\n| 11 | 1         | 2000  |\n| 12 | 2         | 7500  |\n| 13 | NULL      | 1000  |';

export const units: CourseUnit[] = [
  unit(
    'decouvrir',
    'Découvrir les bases de données',
    'Comprendre le modèle relationnel, choisir les bons types et écrire tes premiers SELECT.',
    [
      lesson('modele-relationnel', 'Le modèle relationnel', [
        tip(
          'Pourquoi une base de données ?',
          'Au début, on range souvent ses données dans un fichier Excel ou un JSON. Ça marche tant qu’une seule personne écrit à la fois et que les données restent petites. Dès que plusieurs utilisateurs écrivent en même temps, qu’il faut retrouver une commande parmi des millions ou garantir qu’un paiement n’est jamais enregistré à moitié, il faut un SGBD : un système de gestion de base de données.\n\nUn SGBD relationnel (PostgreSQL, MySQL, MariaDB, SQLite, SQL Server, Oracle…) stocke les données, contrôle leur cohérence, gère les accès concurrents et répond aux questions qu’on lui pose en SQL.\n\nDeux familles d’installation :\n• client-serveur : PostgreSQL ou MySQL tournent comme un service, ton application s’y connecte par le réseau ;\n• embarqué : SQLite est une simple bibliothèque qui lit et écrit un fichier, très utilisée dans les applications mobiles.',
        ),
        tip(
          'Tables, lignes et colonnes',
          'Le modèle relationnel range les données dans des tables (on dit aussi relations). Chaque colonne a un nom et un type : toutes ses valeurs sont de même nature. Chaque ligne est un enregistrement : un produit, un client, une commande.\n\nLa structure (noms des tables, colonnes, types, contraintes) s’appelle le schéma. Une colonne particulière, la clé primaire, identifie chaque ligne de façon unique : ici id.\n\nPiège fréquent : croire que les lignes ont un ordre. Une table est un ensemble ; la base peut te les rendre dans n’importe quel ordre tant que tu ne demandes pas de tri explicite.',
          PRODUITS,
        ),
        tip(
          'SQL, un langage déclaratif',
          'SQL (Structured Query Language) est déclaratif : tu décris le résultat voulu, pas la manière de le calculer. Le moteur choisit lui-même comment parcourir les données (c’est le rôle du planificateur).\n\nOn classe ses instructions en familles :\n• DDL (définition) : CREATE, ALTER, DROP ;\n• DML (manipulation) : SELECT, INSERT, UPDATE, DELETE ;\n• DCL (droits) : GRANT, REVOKE ;\n• TCL (transactions) : BEGIN, COMMIT, ROLLBACK.\n\nLes mots-clés ne sont pas sensibles à la casse : select et SELECT sont identiques. Par convention on les écrit en majuscules. Une instruction se termine par un point-virgule, et on commente avec -- (fin de ligne) ou /* … */.',
          '-- Une requête de lecture (DML)\nSELECT nom, prix FROM produits;\n\n/* Un commentaire\n   sur plusieurs lignes */',
        ),
        qcm(
          'Combien de colonnes compte la table produits ?',
          ['4', '5', '6', '25'],
          1,
          'id, nom, categorie, prix et stock : 5 colonnes. Il y a aussi 5 lignes, ne confonds pas les deux.',
          PRODUITS,
        ),
        match(
          'Associe chaque terme à sa définition.',
          [
            ['Table', 'Un ensemble d’enregistrements de même nature'],
            ['Ligne', 'Un enregistrement : un produit, un client…'],
            ['Colonne', 'Un attribut nommé, avec un type'],
            ['Schéma', 'La structure : tables, colonnes, types, contraintes'],
            ['SGBD', 'Le logiciel qui stocke et interroge les données'],
          ],
          'Retiens surtout que le schéma décrit la forme des données, et les lignes leur contenu.',
        ),
        match(
          'Range chaque instruction dans sa famille.',
          [
            ['CREATE TABLE', 'DDL : définir la structure'],
            ['SELECT', 'DML : lire ou modifier les données'],
            ['GRANT', 'DCL : gérer les droits'],
            ['COMMIT', 'TCL : gérer les transactions'],
          ],
          'INSERT, UPDATE et DELETE sont aussi du DML ; ALTER et DROP du DDL ; REVOKE du DCL.',
        ),
        vf(
          'Sans tri explicite, une table rend toujours ses lignes dans l’ordre où elles ont été insérées.',
          false,
          'Aucun ordre n’est garanti sans ORDER BY. Après des mises à jour, un VACUUM ou un changement de plan d’exécution, l’ordre peut changer du jour au lendemain.',
        ),
        qcm(
          'Ton application mobile doit garder des données hors ligne, dans un fichier sur le téléphone. Quel SGBD est le plus adapté ?',
          ['PostgreSQL', 'MySQL', 'Oracle', 'SQLite'],
          3,
          'SQLite est embarqué : pas de serveur, une simple bibliothèque qui lit un fichier. Android et iOS l’intègrent nativement.',
        ),
        vf(
          'En SQL, select nom from produits; et SELECT nom FROM produits; sont équivalents.',
          true,
          "Les mots-clés ne sont pas sensibles à la casse. Les majuscules sont une convention de lisibilité. Attention : les valeurs texte, elles, le sont ('Lomé' et 'lomé' diffèrent).",
        ),
        qcm(
          'Que signifie « SQL est déclaratif » ?',
          [
            'On doit déclarer toutes les variables avant de les utiliser',
            'On décrit le résultat voulu, le moteur choisit comment l’obtenir',
            'Les requêtes s’exécutent dans l’ordre où on les déclare',
            'On ne peut que lire des données, jamais les modifier',
          ],
          1,
          'Tu écris « les produits à moins de 1000 F » ; c’est le planificateur qui décide s’il parcourt toute la table ou utilise un index.',
        ),
        fill(
          'Complète le commentaire d’une ligne.',
          '___ Liste des produits en rupture\nSELECT nom FROM produits WHERE stock = 0;',
          ['--', '//', '#', '%%'],
          '--',
          '-- commente jusqu’à la fin de la ligne dans tous les SGBD. # marche seulement en MySQL, // nulle part.',
        ),
      ]),

      lesson('types-colonnes', 'Les types de colonnes', [
        tip(
          'Nombres : entiers, décimaux exacts, flottants',
          'Chaque colonne a un type qui dit ce qu’elle peut contenir. Le bon type protège tes données (impossible de ranger « abc » dans un prix) et économise de la place.\n\n• SMALLINT, INTEGER (jusqu’à environ 2,1 milliards), BIGINT : des entiers. Pour des identifiants qui peuvent devenir très nombreux, BIGINT est plus prudent.\n• NUMERIC(p, s) : un décimal exact, p chiffres dont s après la virgule. NUMERIC(10, 2) va jusqu’à 99 999 999,99.\n• REAL et DOUBLE PRECISION : des flottants, rapides mais approximatifs.\n\nL’argent ne se range jamais dans un flottant : 0,1 + 0,2 n’y vaut pas exactement 0,3. Pour des francs CFA, qui n’ont pas de décimales en pratique, un INTEGER ou un BIGINT suffit ; pour des euros, NUMERIC(12, 2) ou un entier en centimes.',
          'SELECT 0.1::float8 + 0.2::float8;  -- 0.30000000000000004\nSELECT 0.1::numeric + 0.2::numeric;  -- 0.3',
        ),
        tip(
          'Texte, booléens, dates',
          "• TEXT : du texte de longueur libre. VARCHAR(n) limite à n caractères. En PostgreSQL, les deux ont les mêmes performances : on choisit VARCHAR(n) seulement si la limite a un sens métier (un code pays sur 2 lettres, par exemple). CHAR(n) complète avec des espaces : à éviter.\n• BOOLEAN : TRUE, FALSE (ou NULL).\n• DATE : un jour ; TIME : une heure ; TIMESTAMP : date et heure sans fuseau ; TIMESTAMPTZ : un instant précis, converti selon le fuseau. Pour l’heure d’un paiement, préfère TIMESTAMPTZ.\n• UUID, JSONB : un identifiant aléatoire et du JSON indexable, propres à PostgreSQL.\n\nLes dates s’écrivent au format ISO : '2026-11-15'. Ne range jamais une date dans un TEXT : tu ne pourrais plus trier ni comparer correctement.",
        ),
        tip(
          'Différences entre SGBD',
          'Les noms changent un peu d’un moteur à l’autre :\n• MySQL n’a pas de vrai BOOLEAN (c’est un TINYINT(1)) et utilise DATETIME là où PostgreSQL a TIMESTAMP.\n• SQLite a un typage dynamique : le type déclaré n’est qu’une « affinité » et il accepte par défaut un texte dans une colonne INTEGER (sauf tables STRICT).\n\nC’est une raison de plus pour tester ton schéma sur le même moteur qu’en production.',
        ),
        match(
          'Associe chaque donnée au type le plus adapté (PostgreSQL).',
          [
            ['Prix d’un sac de riz en FCFA', 'INTEGER'],
            ['Montant en euros avec centimes', 'NUMERIC(12, 2)'],
            ['Nom d’un client', 'TEXT'],
            ['Compte activé ou non', 'BOOLEAN'],
            ['Date de naissance', 'DATE'],
            ['Instant d’un paiement mobile money', 'TIMESTAMPTZ'],
          ],
          'Un type précis protège les données : la base refuse une date invalide ou un texte dans un nombre.',
        ),
        vf(
          'DOUBLE PRECISION est un bon choix pour stocker des soldes de comptes.',
          false,
          'Les flottants sont approximatifs : des centimes se perdent ou apparaissent au fil des calculs. Utilise NUMERIC ou un entier dans la plus petite unité.',
        ),
        qcm(
          'Quelle est la plus grande valeur que peut contenir NUMERIC(5, 2) ?',
          ['99 999', '999,99', '99,999', '9 999,9'],
          1,
          '5 chiffres au total, dont 2 après la virgule : il en reste 3 avant. Le maximum est donc 999,99.',
        ),
        qcm(
          "Une colonne pays contient des codes ISO comme 'TG', 'SN', 'CI'. Quel type est le plus juste ?",
          ['VARCHAR(2)', 'INTEGER', 'BOOLEAN', 'DOUBLE PRECISION'],
          0,
          "Ici la limite a un sens métier : un code sur deux lettres. VARCHAR(2) refusera 'TGO' par erreur.",
        ),
        vf(
          'En PostgreSQL, VARCHAR(255) est plus rapide que TEXT.',
          false,
          'Ils sont stockés de la même façon. La limite de 255 est une habitude venue de MySQL ; en PostgreSQL, TEXT est le choix par défaut.',
        ),
        fill(
          'Choisis le type qui garde un instant précis, fuseau horaire compris.',
          'paye_le ___ NOT NULL',
          ['TIMESTAMPTZ', 'DATE', 'TEXT', 'TIME'],
          'TIMESTAMPTZ',
          'TIMESTAMPTZ enregistre un instant absolu. DATE perdrait l’heure, TEXT empêcherait les comparaisons fiables.',
        ),
        qcm(
          "En SQLite (table classique, non STRICT), que se passe-t-il si tu insères 'abc' dans une colonne déclarée INTEGER ?",
          [
            'Une erreur de type',
            'La valeur devient 0',
            'La valeur est acceptée et rangée comme du texte',
            'La table est verrouillée',
          ],
          2,
          'SQLite applique une affinité de type et accepte la valeur. PostgreSQL, lui, refuserait avec « invalid input syntax for type integer ».',
        ),
        vf(
          "Ranger une date sous forme de texte '15/11/2026' permet quand même de trier correctement les dates.",
          false,
          "Trié comme du texte, '02/12/2026' passe avant '15/11/2026'. Utilise DATE : le tri et les comparaisons sont alors chronologiques.",
        ),
      ]),

      lesson('select-colonnes', 'SELECT : choisir et calculer des colonnes', [
        tip(
          'SELECT … FROM',
          'SELECT dit quelles colonnes afficher, FROM dans quelle table les prendre. * prend toutes les colonnes : pratique pour explorer, à éviter dans le code d’une application, où l’on liste les colonnes utiles. Tu transportes moins de données, tu n’exposes pas une colonne sensible ajoutée plus tard, et ton code ne casse pas si l’ordre des colonnes change.\n\nLe résultat d’un SELECT est lui-même une table : des colonnes et des lignes.',
          'SELECT * FROM produits;\nSELECT nom, prix FROM produits;',
        ),
        tip(
          'Expressions et alias',
          'Une colonne du résultat peut être une expression : un calcul (prix * stock), une concaténation (nom || \' - \' || categorie), une fonction (UPPER(nom), LENGTH(nom), ROUND(…)). AS donne un nom à la colonne calculée : c’est un alias.\n\nPièges :\n• la division entre entiers est entière : 7 / 2 vaut 3 en PostgreSQL et SQLite (3.5000 en MySQL). Écris 7 / 2.0 ou 7::numeric / 2 pour garder les décimales ;\n• || concatène en PostgreSQL et SQLite ; en MySQL, utilise CONCAT() ;\n• un alias avec espaces ou majuscules s’écrit entre guillemets doubles : AS "Valeur du stock".',
          "SELECT nom,\n       prix * stock AS valeur_stock,\n       UPPER(nom) AS nom_majuscule,\n       nom || ' (' || categorie || ')' AS libelle\nFROM produits;",
        ),
        tip(
          'DISTINCT : supprimer les doublons',
          'SELECT DISTINCT retire les lignes identiques du résultat. Il porte sur toute la ligne, pas sur une seule colonne : SELECT DISTINCT categorie, prix garde chaque couple différent.\n\nDISTINCT a un coût (la base doit trier ou hacher le résultat) : ne l’ajoute pas « au cas où » pour masquer des doublons qui viennent d’une jointure mal écrite.',
          'SELECT DISTINCT categorie FROM produits;\n-- epicerie, hygiene, textile',
        ),
        fill(
          'Affiche seulement le nom et le prix des produits.',
          'SELECT nom, prix ___ produits;',
          ['FROM', 'IN', 'TABLE', 'INTO'],
          'FROM',
          'FROM désigne la table source. INTO sert à INSERT INTO.',
        ),
        qcm(
          'Combien de lignes renvoie SELECT DISTINCT categorie FROM produits; ?',
          ['5', '1', '3', '2'],
          2,
          'Les catégories sont epicerie (3 fois), hygiene et textile : 3 valeurs distinctes.',
          PRODUITS,
        ),
        qcm(
          'Que vaut la colonne valeur pour le Riz 5 kg ?',
          ['4500', '135000', '4530', 'Une erreur : on ne calcule pas dans un SELECT'],
          1,
          '4500 × 30 = 135 000. Un SELECT peut calculer librement à partir des colonnes.',
          "SELECT nom, prix * stock AS valeur FROM produits WHERE nom = 'Riz 5 kg';",
        ),
        qcm(
          'Que renvoie SELECT 7 / 2; en PostgreSQL ?',
          ['3.5', '4', '3', 'Une erreur'],
          2,
          'Entier divisé par entier donne un entier tronqué. Pour obtenir 3.5, écris 7 / 2.0 ou 7::numeric / 2. MySQL, lui, renverrait 3.5000.',
        ),
        vf(
          'SELECT DISTINCT nom, categorie supprime les doublons sur la colonne nom uniquement.',
          false,
          'DISTINCT s’applique à la ligne entière : deux lignes ne sont fusionnées que si nom ET categorie sont identiques.',
        ),
        fill(
          'Donne le nom prix_ttc à la colonne calculée.',
          'SELECT nom, prix * 1.18 ___ prix_ttc FROM produits;',
          ['AS', 'IS', 'TO', '='],
          'AS',
          'AS crée un alias. Il est même facultatif (prix * 1.18 prix_ttc), mais l’écrire rend la requête plus lisible.',
        ),
        vf(
          'Dans le code d’une application, SELECT * est déconseillé.',
          true,
          'Lister les colonnes évite de transporter des données inutiles ou sensibles (un mot de passe haché, par exemple) et rend le code robuste aux changements de schéma.',
        ),
        qcm(
          'Comment concaténer nom et categorie en MySQL ?',
          [
            "CONCAT(nom, ' ', categorie)",
            "nom + ' ' + categorie",
            "nom & ' ' & categorie",
            'JOIN(nom, categorie)',
          ],
          0,
          'MySQL utilise CONCAT(). PostgreSQL et SQLite comprennent aussi ||, et PostgreSQL connaît CONCAT() également.',
        ),
      ]),

      lesson('recap-decouvrir', 'Récap et pratique', [
        tip(
          'L’essentiel de l’unité',
          '• Une base relationnelle range les données dans des tables : colonnes typées, lignes d’enregistrements, sans ordre implicite.\n• Le schéma décrit la structure ; la clé primaire identifie chaque ligne.\n• SQL est déclaratif ; ses instructions se rangent en DDL, DML, DCL et TCL.\n• Choisis des types précis : entiers ou NUMERIC pour l’argent, jamais de flottant ; DATE ou TIMESTAMPTZ pour le temps, jamais de texte.\n• SELECT colonnes FROM table ; les colonnes peuvent être des expressions nommées avec AS ; DISTINCT retire les lignes en double.',
        ),
        tip(
          'Méthode pour lire une requête',
          'Face à une requête inconnue, lis-la dans l’ordre où la base la traite : d’abord FROM (quelle table ?), ensuite les filtres, enfin SELECT (quelles colonnes, quels calculs ?). Puis exécute-la mentalement sur deux ou trois lignes de la table. C’est exactement ce que demandent les questions « que renvoie cette requête ? » de l’examen.',
          PRODUITS,
        ),
        qcm(
          'Que renvoie cette requête ?',
          ['Savon', 'SAVON', 'savon', 'Une erreur'],
          1,
          'UPPER met le texte en majuscules. La condition id = 3 désigne le savon.',
          'SELECT UPPER(nom) FROM produits WHERE id = 3;',
        ),
        qcm(
          'Combien de lignes renvoie SELECT nom FROM produits; ?',
          ['1', '3', '4', '5'],
          3,
          'Sans filtre, chaque ligne de la table donne une ligne de résultat : 5.',
        ),
        order(
          'Écris la requête qui affiche le nom et la valeur du stock de chaque produit.',
          ['SELECT nom,', 'prix * stock AS valeur_stock', 'FROM produits;'],
          'Les colonnes et expressions d’abord, puis FROM.',
        ),
        vf(
          'Pour le Sucre 1 kg, prix * stock vaut 0.',
          false,
          'Son stock est NULL (inconnu). Toute opération arithmétique avec NULL donne NULL : 800 * NULL = NULL. On y revient dans l’unité suivante.',
        ),
        match(
          'Associe chaque besoin à la bonne écriture.',
          [
            ['Toutes les colonnes', 'SELECT *'],
            ['Valeurs sans doublon', 'SELECT DISTINCT'],
            ['Renommer une colonne', 'AS'],
            ['Concaténer (PostgreSQL)', '||'],
          ],
          'Ces quatre briques reviennent dans presque toutes les requêtes.',
        ),
        qcm(
          'Quel type choisir pour l’identifiant d’une table de transactions mobile money qui peut dépasser 3 milliards de lignes ?',
          ['INTEGER', 'SMALLINT', 'BIGINT', 'NUMERIC(2, 0)'],
          2,
          'INTEGER plafonne vers 2,1 milliards. BIGINT va jusqu’à environ 9,2 × 10^18 : largement de quoi voir venir.',
        ),
        vf(
          'Le résultat d’un SELECT est lui-même une table, qu’on peut réutiliser dans une autre requête.',
          true,
          'C’est la base des sous-requêtes, que tu verras plus loin : on peut interroger le résultat d’une requête comme une table.',
        ),
      ]),
    ],
  ),

  unit(
    'filtrer-trier',
    'Filtrer, trier et paginer',
    'Garder les bonnes lignes avec WHERE, maîtriser NULL, trier et découper un résultat en pages.',
    [
      lesson('where-comparaisons', 'WHERE et les comparaisons', [
        tip(
          'Garder certaines lignes',
          "WHERE filtre les lignes : seules celles pour lesquelles la condition est vraie sont gardées. On compare avec =, <> (ou !=), <, <=, >, >= et on combine avec AND, OR et NOT.\n\nLe texte s’écrit entre apostrophes simples : 'Lomé'. Les guillemets doubles désignent des noms de colonnes ou de tables en PostgreSQL : \"Lomé\" serait compris comme une colonne qui n’existe pas. Une apostrophe dans un texte se double : 'Côte d''Ivoire'.\n\nPriorité : AND passe avant OR, comme la multiplication avant l’addition. Dès que tu mélanges les deux, mets des parenthèses : c’est la source de bugs la plus fréquente dans les filtres.",
          "SELECT nom, prix FROM produits\nWHERE categorie = 'epicerie'\n  AND (prix < 1000 OR stock > 20);",
        ),
        qcm(
          'Que renvoie cette requête ?',
          [
            'Riz 5 kg et Huile 1 L',
            'Riz 5 kg, Huile 1 L et Pagne wax',
            'Pagne wax',
            'Riz 5 kg et Pagne wax',
          ],
          1,
          'Prix strictement supérieurs à 1000 : 4500, 1500 et 12000. Le savon (300) et le sucre (800) sont écartés.',
          PRODUITS + '\n\nSELECT nom FROM produits WHERE prix > 1000;',
        ),
        qcm(
          'Combien de lignes renvoie cette requête ?',
          ['1', '2', '3', '4'],
          1,
          "AND passe avant OR : la condition se lit categorie = 'textile' OR (categorie = 'epicerie' AND prix < 1000). On obtient le pagne wax (textile) et le sucre (seule épicerie à moins de 1000 F) : 2 lignes. Avec des parenthèses autour du OR, on aurait seulement le sucre.",
          "SELECT nom FROM produits\nWHERE categorie = 'textile' OR categorie = 'epicerie' AND prix < 1000;",
        ),
        fill(
          'Garde les produits qui ne sont pas de l’épicerie.',
          "SELECT nom FROM produits WHERE categorie ___ 'epicerie';",
          ['<>', '=', '==', '!'],
          '<>',
          '<> est l’opérateur « différent » du standard SQL. != est aussi accepté par PostgreSQL, MySQL et SQLite ; == n’existe pas en PostgreSQL.',
        ),
        vf(
          'WHERE ville = "Lomé" filtre les lignes dont la ville vaut Lomé, en PostgreSQL.',
          false,
          "En PostgreSQL, les guillemets doubles entourent un identifiant : la base cherche une colonne nommée Lomé et renvoie une erreur. Le texte s’écrit 'Lomé'. (MySQL accepte les guillemets doubles pour le texte par défaut, d’où la confusion.)",
        ),
        order(
          'Écris la requête qui liste les produits d’épicerie en stock.',
          ['SELECT nom, stock', 'FROM produits', "WHERE categorie = 'epicerie'", 'AND stock > 0;'],
          'SELECT, FROM, puis WHERE et ses conditions combinées par AND.',
        ),
        vf(
          "Pour écrire Côte d'Ivoire dans une requête, on double l'apostrophe : 'Côte d''Ivoire'.",
          true,
          'Deux apostrophes à l’intérieur d’un texte en représentent une seule. Mais dans une application, ne construis jamais ce texte toi-même : passe la valeur en paramètre (voir l’unité sécurité).',
        ),
      ]),

      lesson('like-in-between', 'LIKE, IN et BETWEEN', [
        tip(
          'Motifs, listes et intervalles',
          "• LIKE compare à un motif : % remplace n’importe quelle suite de caractères (même vide), _ remplace exactement un caractère. 'A%' : commence par A ; '%kg' : finit par kg ; '%wax%' : contient wax.\n• En PostgreSQL, LIKE est sensible à la casse ; ILIKE (propre à PostgreSQL) ne l’est pas. En MySQL et SQLite, LIKE ignore la casse par défaut pour les lettres ASCII.\n• IN teste l’appartenance à une liste : categorie IN ('textile', 'hygiene') remplace deux OR.\n• BETWEEN a AND b est inclusif aux deux bornes : il équivaut à >= a AND <= b.\n\nPiège avec les dates : date_cmd BETWEEN '2026-11-01' AND '2026-11-30' sur un TIMESTAMP oublie tout ce qui s’est passé le 30 après minuit. Préfère date_cmd >= '2026-11-01' AND date_cmd < '2026-12-01'.",
          "SELECT nom FROM produits WHERE nom LIKE '%kg';\nSELECT nom FROM produits WHERE categorie IN ('textile', 'hygiene');\nSELECT nom FROM produits WHERE prix BETWEEN 800 AND 4500;",
        ),
        qcm(
          'Que renvoie cette requête ?',
          [
            'Sucre 1 kg et Huile 1 L',
            'Riz 5 kg et Sucre 1 kg',
            'Riz 5 kg seulement',
            'Aucune ligne',
          ],
          1,
          "'%kg' : n’importe quoi puis « kg » à la fin. Riz 5 kg et Sucre 1 kg correspondent ; Huile 1 L finit par L.",
          PRODUITS + "\n\nSELECT nom FROM produits WHERE nom LIKE '%kg';",
        ),
        qcm(
          'Combien de produits renvoie WHERE prix BETWEEN 800 AND 4500 ?',
          ['1', '2', '4', '3'],
          3,
          'BETWEEN inclut les bornes : Sucre (800), Huile (1500) et Riz (4500). Le savon et le pagne sont en dehors.',
          PRODUITS,
        ),
        match(
          'Associe chaque motif à ce qu’il trouve.',
          [
            ["'K%'", 'Commence par K'],
            ["'%a'", 'Finit par a'],
            ["'%wax%'", 'Contient wax'],
            ["'_o%'", 'A un o en deuxième position'],
          ],
          '% : zéro, un ou plusieurs caractères ; _ : exactement un caractère.',
        ),
        fill(
          'Garde les produits des catégories textile et hygiène.',
          "SELECT nom FROM produits WHERE categorie ___ ('textile', 'hygiene');",
          ['IN', 'LIKE', 'BETWEEN', 'ANY'],
          'IN',
          'IN (a, b) équivaut à = a OR = b, en plus lisible.',
        ),
        vf(
          "En PostgreSQL, WHERE nom LIKE 'savon%' trouve la ligne dont le nom est « Savon ».",
          false,
          "LIKE y est sensible à la casse : « s » minuscule ne correspond pas à « S ». Utilise ILIKE ou LOWER(nom) LIKE 'savon%'. En MySQL ou SQLite, la ligne serait trouvée.",
        ),
        vf(
          'x BETWEEN 10 AND 20 équivaut à x >= 10 AND x <= 20.',
          true,
          'Les deux bornes sont incluses. Attention, BETWEEN 20 AND 10 (bornes inversées) ne renvoie rien en SQL standard.',
        ),
      ]),

      lesson('null-trois-valeurs', 'NULL et la logique à trois valeurs', [
        tip(
          'NULL, l’absence de valeur',
          'NULL signifie « valeur inconnue ou absente ». Ce n’est ni 0, ni une chaîne vide : la note de Kodjo n’est pas 0, elle n’est pas encore saisie.\n\nToute comparaison avec NULL donne UNKNOWN (inconnu), pas TRUE ni FALSE : NULL = NULL vaut UNKNOWN, note > 10 vaut UNKNOWN si la note est NULL. Et WHERE ne garde que les lignes où la condition est TRUE. Pour tester NULL, on utilise donc IS NULL et IS NOT NULL, jamais = NULL.\n\nToute opération arithmétique avec NULL donne NULL : 800 * NULL = NULL. COALESCE(a, b, …) renvoie la première valeur non nulle : COALESCE(note, 0) remplace l’absence par 0 dans l’affichage.',
          'SELECT nom FROM eleves WHERE note IS NULL;\nSELECT nom, COALESCE(note, 0) AS note_affichee FROM eleves;',
        ),
        tip(
          'Les tables de vérité avec UNKNOWN',
          "• TRUE AND UNKNOWN = UNKNOWN ; FALSE AND UNKNOWN = FALSE.\n• TRUE OR UNKNOWN = TRUE ; FALSE OR UNKNOWN = UNKNOWN.\n• NOT UNKNOWN = UNKNOWN.\n\nConséquence surprenante : WHERE note >= 10 OR note < 10 ne renvoie pas toutes les lignes, car les élèves sans note donnent UNKNOWN des deux côtés. Pense toujours aux NULL quand tu écris un filtre « contraire », par exemple WHERE ville <> 'Lomé' qui écarte aussi les villes NULL.",
          ELEVES,
        ),
        qcm(
          'Que renvoie cette requête ?',
          ['Kodjo', 'Aucune ligne', 'Toutes les lignes', 'Une erreur'],
          1,
          'note = NULL vaut UNKNOWN pour toutes les lignes, même celle de Kodjo : WHERE ne garde rien. Il fallait écrire WHERE note IS NULL.',
          ELEVES + '\n\nSELECT nom FROM eleves WHERE note = NULL;',
        ),
        qcm(
          'Combien de lignes renvoie cette requête ?',
          ['3', '4', '2', '0'],
          0,
          'Aïcha, Fatou et Yao ont une note : l’une des deux conditions est vraie. Pour Kodjo, les deux valent UNKNOWN et UNKNOWN OR UNKNOWN = UNKNOWN : ligne écartée.',
          ELEVES + '\n\nSELECT nom FROM eleves WHERE note >= 10 OR note < 10;',
        ),
        fill(
          'Liste les élèves dont la note est connue.',
          'SELECT nom FROM eleves WHERE note ___;',
          ['IS NOT NULL', '<> NULL', '!= NULL', 'NOT = NULL'],
          'IS NOT NULL',
          '<> NULL et != NULL valent toujours UNKNOWN et ne renvoient rien.',
        ),
        match(
          'Associe chaque expression à sa valeur.',
          [
            ['NULL = NULL', 'UNKNOWN (NULL)'],
            ['NULL IS NULL', 'TRUE'],
            ['FALSE AND NULL', 'FALSE'],
            ['15 + NULL', 'NULL'],
            ["COALESCE(NULL, 'Lomé')", "'Lomé'"],
          ],
          'FALSE AND n’importe quoi vaut FALSE, même avec UNKNOWN. Tout calcul avec NULL donne NULL.',
        ),
        vf(
          'COALESCE(note, 0) modifie la note stockée dans la table.',
          false,
          'COALESCE ne fait que calculer une valeur dans le résultat. Pour changer la table, il faudrait un UPDATE.',
        ),
        qcm(
          "Que renvoie SELECT nom FROM eleves WHERE ville <> 'Lomé'; si une ligne avait ville = NULL ?",
          [
            'Les élèves hors de Lomé, ville NULL comprise',
            'Les élèves hors de Lomé, sans celui dont la ville est NULL',
            'Une erreur',
            'Seulement l’élève dont la ville est NULL',
          ],
          1,
          "NULL <> 'Lomé' vaut UNKNOWN : la ligne est écartée. Pour l’inclure : WHERE ville <> 'Lomé' OR ville IS NULL (ou IS DISTINCT FROM en PostgreSQL).",
        ),
      ]),

      lesson('order-limit', 'ORDER BY, LIMIT et la pagination', [
        tip(
          'Trier avec ORDER BY',
          'ORDER BY trie le résultat : ASC (croissant, par défaut) ou DESC (décroissant). On peut trier sur plusieurs critères : ORDER BY categorie, prix DESC trie par catégorie, puis par prix décroissant à l’intérieur de chaque catégorie. On peut aussi trier sur un alias du SELECT ou une expression.\n\nEt les NULL ? En PostgreSQL, ils sont considérés plus grands que tout : à la fin en ASC, au début en DESC. MySQL et SQLite font l’inverse (en tête en ASC). PostgreSQL permet de le préciser : ORDER BY stock NULLS LAST.\n\nRappel : sans ORDER BY, aucun ordre n’est garanti. Toute requête dont l’ordre compte (un classement, une page de liste) doit avoir son ORDER BY.',
          'SELECT nom, categorie, prix\nFROM produits\nORDER BY categorie ASC, prix DESC;',
        ),
        tip(
          'LIMIT, OFFSET et la pagination par curseur',
          'LIMIT n garde les n premières lignes, OFFSET m saute les m premières : la page p (de taille n) s’obtient avec LIMIT n OFFSET (p − 1) × n. Cette syntaxe marche en PostgreSQL, MySQL et SQLite ; le standard SQL écrit OFFSET 20 ROWS FETCH FIRST 10 ROWS ONLY (accepté par PostgreSQL), SQL Server utilise TOP.\n\nLIMIT sans ORDER BY donne des lignes arbitraires. Et un grand OFFSET coûte cher : pour OFFSET 100000, la base lit et jette 100 000 lignes. Sur les grosses tables, on préfère la pagination par curseur (keyset) : on mémorise le dernier id affiché et on demande WHERE id > dernier_id ORDER BY id LIMIT 20. Elle reste rapide et ne saute ni ne répète de lignes si des données arrivent entre deux pages.',
          '-- Page 3, 20 produits par page\nSELECT id, nom FROM produits ORDER BY id LIMIT 20 OFFSET 40;\n\n-- Page suivante par curseur\nSELECT id, nom FROM produits WHERE id > 60 ORDER BY id LIMIT 20;',
        ),
        qcm(
          'Que renvoie cette requête ?',
          [
            'Pagne wax et Riz 5 kg',
            'Savon et Sucre 1 kg',
            'Riz 5 kg et Huile 1 L',
            'Pagne wax et Huile 1 L',
          ],
          0,
          'Tri du plus cher au moins cher : 12000 (Pagne wax), 4500 (Riz 5 kg), puis 1500… LIMIT 2 garde les deux premiers.',
          PRODUITS + '\n\nSELECT nom FROM produits ORDER BY prix DESC LIMIT 2;',
        ),
        qcm(
          'En PostgreSQL, quel produit sort en dernier avec ORDER BY stock ASC ?',
          ['Savon', 'Huile 1 L', 'Sucre 1 kg', 'Pagne wax'],
          2,
          'Le stock du sucre est NULL ; en PostgreSQL, les NULL viennent en dernier en ordre croissant. En MySQL ou SQLite, il sortirait en premier.',
          PRODUITS,
        ),
        fill(
          'Affiche la page 3 d’une liste de 10 éléments par page.',
          'SELECT nom FROM produits ORDER BY id LIMIT 10 OFFSET ___;',
          ['20', '30', '3', '10'],
          '20',
          'Page p : OFFSET (p − 1) × taille = 2 × 10 = 20. On saute les pages 1 et 2.',
        ),
        order(
          'Écris la requête des 3 produits les moins chers en stock.',
          ['SELECT nom, prix', 'FROM produits', 'WHERE stock > 0', 'ORDER BY prix', 'LIMIT 3;'],
          'L’ordre d’écriture est fixe : SELECT, FROM, WHERE, ORDER BY, LIMIT.',
        ),
        vf(
          'Sur une table de plusieurs millions de lignes, LIMIT 20 OFFSET 500000 est aussi rapide que la première page.',
          false,
          'La base doit produire puis jeter 500 000 lignes. La pagination par curseur (WHERE id > dernier_id) évite ce coût.',
        ),
        qcm(
          'Que fait ORDER BY categorie, prix DESC ?',
          [
            'Trie par catégorie décroissante puis prix décroissant',
            'Trie par catégorie croissante, puis par prix décroissant dans chaque catégorie',
            'Trie seulement par prix',
            'Provoque une erreur : un seul critère est permis',
          ],
          1,
          'Chaque critère a son propre sens : ASC par défaut pour categorie, DESC pour prix.',
        ),
      ]),
    ],
  ),

  unit(
    'agreger',
    'Agrégats et GROUP BY',
    'Résumer des milliers de lignes en quelques chiffres : totaux, moyennes, statistiques par groupe.',
    [
      lesson('fonctions-agregat', 'Les fonctions d’agrégation', [
        tip(
          'COUNT, SUM, AVG, MIN, MAX',
          'Une fonction d’agrégation résume plusieurs lignes en une seule valeur :\n• COUNT(*) compte les lignes ;\n• COUNT(colonne) compte les valeurs non NULL de la colonne ;\n• COUNT(DISTINCT colonne) compte les valeurs différentes ;\n• SUM, AVG, MIN, MAX : somme, moyenne, minimum, maximum.\n\nToutes, sauf COUNT(*), ignorent les NULL. Ainsi AVG(montant) divise par le nombre de montants connus, pas par le nombre de lignes. Sur un ensemble vide, COUNT renvoie 0 mais SUM, AVG, MIN et MAX renvoient NULL : pense à COALESCE(SUM(montant), 0) pour afficher 0.\n\nEn PostgreSQL, AVG sur des entiers renvoie un NUMERIC : ROUND(AVG(montant), 2) arrondit à deux décimales.',
          'SELECT COUNT(*) AS nb_lignes,\n       COUNT(montant) AS nb_montants,\n       SUM(montant) AS total,\n       ROUND(AVG(montant), 2) AS moyenne\nFROM ventes;',
        ),
        tip(
          'La table de l’unité',
          'Les exercices de cette unité utilisent la table ventes ci-dessous : cinq ventes de trois vendeurs, dont une au montant non saisi (NULL). Repère bien cette ligne : elle est au cœur des pièges sur COUNT et AVG.',
          VENTES,
        ),
        match(
          'Associe chaque expression à sa valeur sur la table ventes.',
          [
            ['COUNT(*)', '5'],
            ['COUNT(montant)', '4'],
            ['SUM(montant)', '11000'],
            ['AVG(montant)', '2750'],
            ['COUNT(DISTINCT vendeur)', '3'],
          ],
          'AVG = 11000 / 4 = 2750 : la ligne NULL n’est comptée ni dans la somme ni dans le diviseur.',
        ),
        qcm(
          'Que renvoie SELECT MIN(montant), MAX(montant) FROM ventes; ?',
          ['NULL et 5000', '1000 et 5000', '0 et 5000', '1000 et NULL'],
          1,
          'MIN et MAX ignorent les NULL : le plus petit montant connu est 1000, le plus grand 5000.',
          VENTES,
        ),
        vf(
          "SELECT SUM(montant) FROM ventes WHERE ville = 'Dakar'; renvoie 0.",
          false,
          'Aucune ligne ne correspond : SUM d’un ensemble vide renvoie NULL. COUNT(*) renverrait bien 0. Écris COALESCE(SUM(montant), 0) pour afficher 0.',
        ),
        fill(
          'Compte le nombre de villes différentes.',
          'SELECT COUNT(___ ville) FROM ventes;',
          ['DISTINCT', 'UNIQUE', 'ALL', 'ONLY'],
          'DISTINCT',
          'COUNT(DISTINCT ville) vaut 2 ici (Lomé et Kara), alors que COUNT(ville) vaut 5.',
        ),
        qcm(
          'Un collègue calcule la moyenne avec SUM(montant) / COUNT(*). Que vaut ce calcul sur ventes, en PostgreSQL ?',
          ['2750', '2200', '2750.00', 'NULL'],
          1,
          '11000 / 5 = 2200 : COUNT(*) compte aussi la ligne sans montant. AVG(montant) donnerait 2750. Les deux sont « justes », mais ne répondent pas à la même question.',
          VENTES,
        ),
        vf(
          'On peut écrire SELECT vendeur, SUM(montant) FROM ventes; sans GROUP BY en PostgreSQL.',
          false,
          'Erreur : « column vendeur must appear in the GROUP BY clause or be used in an aggregate function ». Une seule ligne de résultat ne peut pas porter plusieurs vendeurs. SQLite l’accepte et choisit un vendeur arbitraire : un piège silencieux.',
        ),
      ]),

      lesson('group-by-having', 'GROUP BY et HAVING', [
        tip(
          'Une statistique par groupe',
          'GROUP BY découpe les lignes en groupes qui partagent la même valeur, puis calcule les agrégats pour chaque groupe. Le résultat contient une ligne par groupe.\n\nRègle d’or : chaque colonne du SELECT qui n’est pas dans une fonction d’agrégation doit figurer dans le GROUP BY. PostgreSQL l’impose (sauf si la colonne dépend de la clé primaire groupée), MySQL aussi depuis la 5.7 avec le mode ONLY_FULL_GROUP_BY ; SQLite est plus laxiste.\n\nLes NULL forment un groupe à part entière : si des ventes n’avaient pas de ville, elles seraient regroupées dans une ligne ville = NULL.',
          'SELECT vendeur, COUNT(*) AS nb_ventes, SUM(montant) AS total\nFROM ventes\nGROUP BY vendeur\nORDER BY total DESC;',
        ),
        tip(
          'WHERE filtre les lignes, HAVING filtre les groupes',
          'WHERE agit avant le regroupement, sur les lignes une par une : il ne peut pas utiliser SUM ou COUNT. HAVING agit après, sur les groupes : c’est là qu’on écrit HAVING SUM(montant) >= 5000.\n\nL’ordre logique d’exécution explique tout : FROM → WHERE → GROUP BY → HAVING → SELECT → DISTINCT → ORDER BY → LIMIT. C’est pourquoi un alias du SELECT est utilisable dans ORDER BY mais pas dans WHERE (et pas dans HAVING en PostgreSQL, qui demande de répéter l’expression).\n\nBonne pratique : filtre le plus tôt possible. Une condition sur une colonne simple va dans WHERE, pas dans HAVING : la base regroupe moins de lignes.',
          'SELECT ville, SUM(montant) AS total\nFROM ventes\nWHERE montant > 1500\nGROUP BY ville\nHAVING COUNT(*) >= 2;',
        ),
        qcm(
          'Que renvoie cette requête ?',
          [
            'Ama 2, Koffi 2, Edem 1',
            'Ama 2, Koffi 1, Edem 1',
            '5',
            'Ama 5000, Koffi 5000, Edem 1000',
          ],
          0,
          'COUNT(*) compte les lignes de chaque groupe, NULL compris : Koffi a bien 2 ventes, même si l’une n’a pas de montant.',
          VENTES + '\n\nSELECT vendeur, COUNT(*) FROM ventes GROUP BY vendeur;',
        ),
        qcm(
          'Quels vendeurs renvoie cette requête ?',
          ['Ama seulement', 'Koffi seulement', 'Ama et Koffi', 'Ama, Koffi et Edem'],
          2,
          'Totaux : Ama 5000, Koffi 5000 (la vente NULL est ignorée), Edem 1000. Deux groupes atteignent 5000.',
          VENTES + '\n\nSELECT vendeur FROM ventes\nGROUP BY vendeur\nHAVING SUM(montant) >= 5000;',
        ),
        qcm(
          'Que renvoie cette requête ?',
          ['Lomé 3, Kara 2', 'Lomé 2, Kara 1', 'Lomé 2, Kara 2', 'Lomé 1, Kara 1'],
          1,
          'WHERE agit d’abord : il reste 2000 et 3000 à Lomé (1000 est écarté), 5000 à Kara (la ligne NULL donne UNKNOWN et disparaît). Puis on compte par ville.',
          VENTES + '\n\nSELECT ville, COUNT(*) FROM ventes\nWHERE montant > 1500\nGROUP BY ville;',
        ),
        order(
          'Remets les clauses dans l’ordre d’écriture.',
          [
            'SELECT ville, SUM(montant)',
            'FROM ventes',
            'WHERE montant IS NOT NULL',
            'GROUP BY ville',
            'HAVING SUM(montant) > 1000',
            'ORDER BY ville;',
          ],
          'SELECT, FROM, WHERE, GROUP BY, HAVING, ORDER BY : l’ordre d’écriture est imposé, même s’il diffère de l’ordre d’exécution.',
        ),
        fill(
          'Garde seulement les villes dont le total dépasse 5500.',
          'SELECT ville, SUM(montant) FROM ventes GROUP BY ville ___ SUM(montant) > 5500;',
          ['HAVING', 'WHERE', 'FILTER', 'AND'],
          'HAVING',
          'La condition porte sur un agrégat : elle va dans HAVING. Seule Lomé (6000) reste.',
        ),
        vf(
          'En PostgreSQL, on peut écrire WHERE total > 1000 si total est un alias défini dans le SELECT.',
          false,
          'WHERE est évalué avant le SELECT : l’alias n’existe pas encore. On répète l’expression, ou on passe par une sous-requête. ORDER BY total, en revanche, fonctionne.',
        ),
      ]),

      lesson('agregats-conditionnels', 'CASE et agrégats conditionnels', [
        tip(
          'CASE : un « si » dans une requête',
          "CASE renvoie une valeur selon des conditions, testées dans l’ordre ; la première vraie l’emporte. Sans ELSE, une ligne qui ne correspond à rien vaut NULL.\n\nCombiné aux agrégats, CASE permet de calculer plusieurs statistiques en un seul passage : SUM(CASE WHEN ville = 'Lomé' THEN montant ELSE 0 END) additionne seulement les ventes de Lomé. PostgreSQL (et SQLite depuis 3.30) offre une écriture plus lisible : SUM(montant) FILTER (WHERE ville = 'Lomé'). MySQL ne connaît pas FILTER ; CASE marche partout.\n\nCASE sert aussi à classer : tranche de prix, statut lisible, mention d’après une note. On peut ensuite faire un GROUP BY sur cette expression.",
          "SELECT nom,\n       CASE WHEN prix < 1000 THEN 'petit prix'\n            WHEN prix < 5000 THEN 'moyen'\n            ELSE 'cher'\n       END AS gamme\nFROM produits;\n\nSELECT COUNT(*) FILTER (WHERE montant >= 2000) AS grosses_ventes,\n       SUM(CASE WHEN ville = 'Lomé' THEN montant ELSE 0 END) AS total_lome\nFROM ventes;",
        ),
        qcm(
          'Quelle gamme reçoit le produit à 4500 F avec le CASE de la fiche ?',
          ['petit prix', 'moyen', 'cher', 'NULL'],
          1,
          '4500 n’est pas < 1000, mais il est < 5000 : la deuxième branche l’emporte et l’évaluation s’arrête là.',
        ),
        qcm(
          "Que vaut SUM(CASE WHEN ville = 'Lomé' THEN montant ELSE 0 END) sur la table ventes ?",
          ['11000', '5000', '6000', '3'],
          2,
          'Ventes de Lomé : 2000 + 3000 + 1000 = 6000 ; les autres lignes ajoutent 0.',
          VENTES,
        ),
        vf(
          'Un CASE sans ELSE renvoie NULL pour les lignes qui ne remplissent aucune condition.',
          true,
          'C’est souvent voulu avec COUNT : COUNT(CASE WHEN montant >= 2000 THEN 1 END) compte seulement les grosses ventes, car COUNT ignore les NULL.',
        ),
        fill(
          'Compte les ventes d’au moins 2000 F (PostgreSQL).',
          'SELECT COUNT(*) ___ (WHERE montant >= 2000) FROM ventes;',
          ['FILTER', 'HAVING', 'WHERE', 'IF'],
          'FILTER',
          'FILTER restreint les lignes vues par un agrégat. Résultat ici : 3 (2000, 3000, 5000).',
        ),
        match(
          'Associe chaque besoin à la bonne technique.',
          [
            ['Filtrer les lignes avant le calcul', 'WHERE'],
            ['Filtrer les groupes après le calcul', 'HAVING'],
            ['Compter seulement certaines lignes dans un agrégat', 'FILTER ou CASE'],
            ['Remplacer un total NULL par 0', 'COALESCE'],
          ],
          'Ces quatre outils couvrent l’essentiel des tableaux de bord.',
        ),
        qcm(
          'Ta requête doit tourner sur MySQL. Comment compter les ventes de Kara ?',
          [
            "COUNT(*) FILTER (WHERE ville = 'Kara')",
            "COUNT(ville = 'Kara')",
            "SUM(CASE WHEN ville = 'Kara' THEN 1 ELSE 0 END)",
            "COUNT(*) WHERE ville = 'Kara'",
          ],
          2,
          "FILTER n’existe pas en MySQL ; CASE est portable. COUNT(ville = 'Kara') compterait toutes les lignes, car FALSE n’est pas NULL.",
        ),
      ]),
    ],
  ),

  unit(
    'creer-modifier',
    'Créer et modifier les données',
    'Créer des tables solides, les faire évoluer, écrire des données sans casse et protéger tes opérations par des transactions.',
    [
      lesson('create-table', 'CREATE TABLE et les contraintes', [
        tip(
          'Décrire une table',
          'CREATE TABLE déclare chaque colonne avec son type et ses contraintes. Les contraintes sont des règles que la base vérifie à chaque écriture, quel que soit le code qui écrit : c’est ta dernière ligne de défense contre les données incohérentes.\n\n• PRIMARY KEY : identifie chaque ligne (unique et non NULL).\n• NOT NULL : valeur obligatoire.\n• UNIQUE : pas de doublon (plusieurs NULL restent permis par défaut).\n• CHECK (condition) : une règle métier, par exemple prix >= 0.\n• DEFAULT : valeur utilisée si l’INSERT n’en donne pas.\n\nPour un identifiant auto-incrémenté, PostgreSQL recommande GENERATED ALWAYS AS IDENTITY (standard SQL) ; SERIAL est l’ancienne écriture. MySQL utilise AUTO_INCREMENT, SQLite INTEGER PRIMARY KEY. Note : MySQL n’applique les CHECK que depuis la version 8.0.16.',
          'CREATE TABLE produits (\n  id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,\n  nom       TEXT NOT NULL,\n  sku       TEXT UNIQUE,\n  prix      INTEGER NOT NULL CHECK (prix >= 0),\n  stock     INTEGER NOT NULL DEFAULT 0,\n  cree_le   TIMESTAMPTZ NOT NULL DEFAULT now()\n);',
        ),
        match(
          'Associe chaque contrainte à ce qu’elle garantit.',
          [
            ['PRIMARY KEY', 'Chaque ligne est identifiée de façon unique'],
            ['NOT NULL', 'La valeur est obligatoire'],
            ['UNIQUE', 'Deux lignes ne partagent pas la même valeur'],
            ['CHECK (prix >= 0)', 'Une règle métier est respectée'],
            ['DEFAULT 0', 'Une valeur est fournie si on l’omet'],
          ],
          'Une contrainte refuse l’écriture fautive avec une erreur explicite, plutôt que de laisser entrer une donnée fausse.',
        ),
        fill(
          'Interdis les prix négatifs.',
          'prix INTEGER NOT NULL ___ (prix >= 0)',
          ['CHECK', 'VERIFY', 'ASSERT', 'WHERE'],
          'CHECK',
          'CHECK refuse toute ligne pour laquelle la condition est fausse. Si elle vaut UNKNOWN (prix NULL), la ligne passe : d’où l’intérêt d’ajouter NOT NULL.',
        ),
        vf(
          'En PostgreSQL, une colonne UNIQUE peut contenir plusieurs NULL.',
          true,
          'NULL n’étant égal à rien, deux NULL ne sont pas des doublons. Depuis PostgreSQL 15, UNIQUE NULLS NOT DISTINCT change ce comportement.',
        ),
        qcm(
          'Quelle écriture PostgreSQL recommande-t-il aujourd’hui pour un id auto-incrémenté ?',
          [
            'id INT AUTO_INCREMENT',
            'id INTEGER PRIMARY KEY AUTOINCREMENT',
            'id BIGINT GENERATED ALWAYS AS IDENTITY',
            'id SEQUENCE',
          ],
          2,
          'IDENTITY est standard et évite les pièges de droits de SERIAL. AUTO_INCREMENT est la syntaxe MySQL, AUTOINCREMENT celle de SQLite.',
        ),
        qcm(
          'L’INSERT ci-dessous échoue. Pourquoi ?',
          [
            'Il manque l’id',
            'La contrainte CHECK refuse un prix négatif',
            'Le stock doit être fourni',
            'Le nom est trop long',
          ],
          1,
          'L’id est généré, le stock a une valeur par défaut, mais prix = -500 viole CHECK (prix >= 0). Erreur : « violates check constraint ».',
          "INSERT INTO produits (nom, prix) VALUES ('Gari 1 kg', -500);",
        ),
        vf(
          'Les contraintes sont inutiles si l’application valide déjà les formulaires.',
          false,
          'Les données arrivent aussi par des scripts, des imports, une autre application, une console d’administration. Seule la base voit toutes les écritures.',
        ),
      ]),

      lesson('alter-drop', 'Faire évoluer le schéma : ALTER, DROP, TRUNCATE', [
        tip(
          'ALTER TABLE',
          'Une application vit : il faut ajouter des colonnes, renommer, poser de nouvelles contraintes. ALTER TABLE s’en charge :\n• ADD COLUMN tel TEXT ;\n• DROP COLUMN tel ;\n• RENAME COLUMN tel TO telephone ;\n• ALTER COLUMN prix SET NOT NULL, ou SET DEFAULT 0 ;\n• ADD CONSTRAINT prix_positif CHECK (prix >= 0).\n\nPièges : ajouter une colonne NOT NULL sans DEFAULT à une table qui contient déjà des lignes échoue (les lignes existantes n’auraient pas de valeur). Ajouter une contrainte échoue si des lignes existantes la violent : nettoie d’abord. En équipe, ces changements passent par des fichiers de migration versionnés avec le code, jamais par des commandes tapées à la main en production.',
          'ALTER TABLE clients ADD COLUMN telephone TEXT;\nALTER TABLE clients ADD COLUMN actif BOOLEAN NOT NULL DEFAULT TRUE;\nALTER TABLE clients RENAME COLUMN telephone TO tel;',
        ),
        tip(
          'Supprimer : DROP, TRUNCATE, DELETE',
          '• DROP TABLE produits supprime la table entière, structure comprise. DROP TABLE IF EXISTS évite l’erreur si elle n’existe pas.\n• TRUNCATE produits vide la table d’un coup, très vite, sans WHERE possible. RESTART IDENTITY remet le compteur d’id à 1.\n• DELETE FROM produits supprime les lignes une par une, avec un WHERE possible.\n\nEn PostgreSQL, même CREATE, ALTER et DROP sont transactionnels : on peut les annuler par ROLLBACK. En MySQL, une instruction DDL valide implicitement la transaction en cours : impossible de revenir en arrière.',
        ),
        fill(
          'Ajoute une colonne e-mail à la table clients.',
          'ALTER TABLE clients ___ email TEXT;',
          ['ADD COLUMN', 'INSERT COLUMN', 'NEW COLUMN', 'UPDATE COLUMN'],
          'ADD COLUMN',
          'ALTER TABLE … ADD COLUMN ajoute une colonne ; les lignes existantes reçoivent NULL (ou la valeur DEFAULT).',
        ),
        qcm(
          'La table clients contient 2 000 lignes. Que se passe-t-il ?',
          [
            'La colonne est ajoutée, vide',
            'Erreur : les lignes existantes violeraient NOT NULL',
            'Les 2 000 lignes sont supprimées',
            'La colonne reçoit une chaîne vide',
          ],
          1,
          'Sans DEFAULT, les lignes existantes auraient NULL dans une colonne NOT NULL. Ajoute un DEFAULT, ou ajoute la colonne nullable, remplis-la, puis pose NOT NULL.',
          'ALTER TABLE clients ADD COLUMN ville TEXT NOT NULL;',
        ),
        match(
          'Associe chaque commande à son effet.',
          [
            ['DROP TABLE produits', 'Supprime la table et sa structure'],
            ['TRUNCATE produits', 'Vide toute la table d’un coup'],
            ['DELETE FROM produits WHERE id = 3', 'Supprime certaines lignes'],
            ['ALTER TABLE produits DROP COLUMN sku', 'Supprime une colonne'],
          ],
          'Seul DELETE accepte un WHERE. DROP et TRUNCATE sont radicaux : vérifie deux fois la base sur laquelle tu es connecté.',
        ),
        vf(
          'En PostgreSQL, un ALTER TABLE exécuté dans une transaction peut être annulé par ROLLBACK.',
          true,
          'Le DDL de PostgreSQL est transactionnel : une migration qui échoue à mi-chemin peut être annulée entièrement. Ce n’est pas le cas en MySQL.',
        ),
        qcm(
          'Où doivent vivre les changements de schéma d’une application en équipe ?',
          [
            'Dans des fichiers de migration versionnés avec le code',
            'Dans la mémoire du développeur principal',
            'Dans des commandes tapées directement en production',
            'Dans un tableur partagé',
          ],
          0,
          'Les migrations (Prisma Migrate, Flyway, Alembic…) rejouent les mêmes changements dans le même ordre sur chaque environnement.',
        ),
      ]),

      lesson('insert-update-delete', 'INSERT, UPDATE et DELETE', [
        tip(
          'Écrire des lignes',
          'INSERT INTO table (colonnes) VALUES (valeurs) ajoute des lignes ; les valeurs suivent l’ordre des colonnes listées, et les colonnes omises prennent leur DEFAULT (ou NULL). Liste toujours les colonnes : ton INSERT ne cassera pas si on en ajoute une.\n\nEn PostgreSQL :\n• RETURNING id renvoie l’id généré sans requête supplémentaire (SQLite aussi depuis 3.35 ; pas MySQL) ;\n• ON CONFLICT (sku) DO NOTHING ou DO UPDATE SET … fait un « upsert » ; MySQL écrit ON DUPLICATE KEY UPDATE ;\n• INSERT INTO … SELECT … copie le résultat d’une requête.',
          "INSERT INTO produits (nom, prix, stock)\nVALUES ('Riz 5 kg', 4500, 30), ('Huile 1 L', 1500, 0)\nRETURNING id;\n\nINSERT INTO produits (sku, nom, prix) VALUES ('RIZ5', 'Riz 5 kg', 4800)\nON CONFLICT (sku) DO UPDATE SET prix = EXCLUDED.prix;",
        ),
        tip(
          'Modifier et supprimer sans catastrophe',
          'UPDATE table SET colonne = valeur WHERE … modifie, DELETE FROM table WHERE … supprime. Sans WHERE, ils touchent toutes les lignes : c’est l’erreur la plus coûteuse du métier.\n\nMéthode sûre :\n1. écris d’abord le SELECT avec le même WHERE et vérifie les lignes visées ;\n2. ouvre une transaction (BEGIN), lance l’UPDATE et contrôle le nombre de lignes annoncé (« UPDATE 1 ») ;\n3. COMMIT si c’est bon, ROLLBACK sinon.\n\nSET peut utiliser la valeur actuelle : SET stock = stock - 1. Et plusieurs colonnes à la fois : SET prix = 5000, stock = 40.',
          "UPDATE produits SET stock = stock - 2 WHERE id = 1;\nDELETE FROM produits WHERE stock = 0 AND cree_le < now() - interval '1 year';",
        ),
        order(
          'Ajoute un produit et récupère son id (PostgreSQL).',
          ['INSERT INTO produits (nom, prix)', "VALUES ('Attiéké 1 kg', 700)", 'RETURNING id;'],
          'Colonnes, valeurs, puis RETURNING pour récupérer ce que la base a généré.',
        ),
        qcm(
          'Que contient la table après ces deux requêtes, si elle contenait les 5 produits de départ ?',
          [
            '5 produits, le riz à 4500',
            '5 produits, tous à 4500',
            '1 produit',
            'Une erreur, il manque WHERE',
          ],
          1,
          'Sans WHERE, UPDATE modifie toutes les lignes : tous les prix valent maintenant 4500. SQL ne lève aucune erreur : il fait exactement ce qu’on lui demande.',
          'SELECT * FROM produits WHERE id = 1;\nUPDATE produits SET prix = 4500;',
        ),
        fill(
          'Diminue de 1 le stock du produit 3.',
          'UPDATE produits SET stock = ___ WHERE id = 3;',
          ['stock - 1', '-1', 'stock--', 'DECREMENT'],
          'stock - 1',
          'SET peut lire la valeur actuelle de la ligne. La décrémentation se fait dans la base, en une seule instruction atomique.',
        ),
        vf(
          'Avant un DELETE délicat, lancer un SELECT avec le même WHERE permet de voir exactement les lignes visées.',
          true,
          'Même WHERE, mêmes lignes. Combine-le avec une transaction pour pouvoir revenir en arrière.',
        ),
        qcm(
          'Que fait ON CONFLICT (sku) DO NOTHING ?',
          [
            'Supprime la ligne existante',
            'Ignore l’insertion si un produit a déjà ce sku',
            'Désactive la contrainte UNIQUE',
            'Renvoie toujours une erreur',
          ],
          1,
          'L’insertion est sautée silencieusement en cas de doublon sur sku. Il faut une contrainte UNIQUE (ou une clé primaire) sur sku pour que ON CONFLICT fonctionne.',
        ),
      ]),

      lesson('transactions-acid', 'Transactions et ACID', [
        tip(
          'Tout ou rien',
          'Un transfert mobile money de 5 000 F, c’est deux écritures : débiter Ama, créditer Koffi. Si le serveur tombe entre les deux, l’argent disparaît. Une transaction regroupe les deux : BEGIN ouvre, COMMIT valide tout, ROLLBACK annule tout.\n\nLes garanties ACID :\n• Atomicité : tout est appliqué ou rien ;\n• Cohérence : les contraintes sont respectées à la fin ;\n• Isolation : les transactions simultanées ne se voient pas à moitié ;\n• Durabilité : une fois le COMMIT confirmé, les données survivent à une panne.\n\nPar défaut, PostgreSQL est en mode autocommit : chaque instruction hors BEGIN est sa propre transaction. Si une instruction échoue dans une transaction PostgreSQL, toute la transaction est marquée en échec : il faut faire ROLLBACK.',
          'BEGIN;\nUPDATE comptes SET solde = solde - 5000 WHERE id = 1 AND solde >= 5000;\nUPDATE comptes SET solde = solde + 5000 WHERE id = 2;\nINSERT INTO transferts (de, vers, montant) VALUES (1, 2, 5000);\nCOMMIT;',
        ),
        tip(
          'Concurrence : éviter les mises à jour perdues',
          'Piège classique : lire le solde dans l’application (SELECT), calculer le nouveau solde, puis l’écrire (UPDATE … SET solde = 15000). Si deux retraits arrivent en même temps, les deux lisent 20 000 et l’un écrase l’autre : 5 000 F apparaissent de nulle part.\n\nSolutions :\n• faire le calcul dans la base : SET solde = solde - 5000 WHERE solde >= 5000, puis vérifier qu’une ligne a bien été modifiée ;\n• ou verrouiller la ligne lue : SELECT … FOR UPDATE dans la transaction.\n\nLe niveau d’isolation par défaut de PostgreSQL est READ COMMITTED ; SERIALIZABLE offre la garantie la plus forte, au prix de transactions à relancer en cas de conflit.',
        ),
        match(
          'Associe chaque lettre d’ACID à sa garantie.',
          [
            ['Atomicité', 'Tout ou rien'],
            ['Cohérence', 'Les contraintes restent respectées'],
            ['Isolation', 'Les transactions simultanées ne se gênent pas'],
            ['Durabilité', 'Un COMMIT survit à une panne'],
          ],
          'Ce sont ces quatre garanties qui rendent une base relationnelle fiable pour l’argent.',
        ),
        order(
          'Remets dans l’ordre un transfert de 2 000 F.',
          [
            'BEGIN;',
            'UPDATE comptes SET solde = solde - 2000 WHERE id = 1;',
            'UPDATE comptes SET solde = solde + 2000 WHERE id = 2;',
            'COMMIT;',
          ],
          'BEGIN ouvre, les écritures suivent, COMMIT les rend visibles et définitives d’un seul coup.',
        ),
        qcm(
          'Le serveur plante juste après le premier UPDATE, avant le COMMIT. Que contient la base au redémarrage ?',
          [
            'Le débit seulement',
            'Le crédit seulement',
            'Aucune des deux modifications',
            'Les deux modifications',
          ],
          2,
          'Une transaction non validée est annulée : c’est l’atomicité. Aucun argent ne disparaît.',
        ),
        fill(
          'Annule toutes les modifications de la transaction en cours.',
          "BEGIN;\nDELETE FROM commandes WHERE statut = 'annulee';\n-- « DELETE 48 210 » : bien plus que prévu !\n___;",
          ['ROLLBACK', 'COMMIT', 'UNDO', 'CANCEL'],
          'ROLLBACK',
          'ROLLBACK annule tout depuis BEGIN. C’est pour ce genre de surprise qu’on ouvre une transaction avant une opération délicate.',
        ),
        vf(
          'Lire le solde dans l’application puis écrire SET solde = <nouvelle valeur> est sûr même avec des requêtes simultanées.',
          false,
          'Deux requêtes peuvent lire la même valeur et l’une écrase l’autre : c’est la mise à jour perdue. Calcule dans la base (solde = solde - x) ou verrouille avec SELECT … FOR UPDATE.',
        ),
        qcm(
          'Dans une transaction PostgreSQL, une instruction échoue. Que se passe-t-il pour les suivantes ?',
          [
            'Elles s’exécutent normalement',
            'Elles sont refusées jusqu’au ROLLBACK',
            'La base redémarre',
            'Elles sont validées automatiquement',
          ],
          1,
          'PostgreSQL répond « current transaction is aborted, commands ignored until end of transaction block ». On fait ROLLBACK (ou ROLLBACK TO SAVEPOINT si on avait posé un point de sauvegarde).',
        ),
      ]),
    ],
  ),

  unit(
    'cles-jointures',
    'Clés et jointures',
    'Modéliser des tables reliées par des clés, puis les combiner avec INNER JOIN, LEFT JOIN et des sous-requêtes.',
    [
      lesson('cles', 'Clés primaires, clés étrangères et relations', [
        tip(
          'Clés primaires et clés étrangères',
          'La clé primaire identifie chaque ligne : unique, jamais NULL, une seule par table (elle peut porter sur plusieurs colonnes : clé composite). On préfère souvent une clé de substitution (un id généré ou un UUID) à une clé naturelle comme un numéro de téléphone, qui peut changer. PostgreSQL crée automatiquement un index sur la clé primaire et sur chaque contrainte UNIQUE.\n\nUne clé étrangère relie une table à une autre : commandes.client_id REFERENCES clients(id). La base refuse alors une commande pour un client inexistant, et refuse de supprimer un client qui a des commandes, sauf règle contraire :\n• ON DELETE CASCADE supprime aussi les commandes ;\n• ON DELETE SET NULL met client_id à NULL ;\n• RESTRICT ou NO ACTION (par défaut) refuse la suppression.\n\nAttention : PostgreSQL n’indexe pas automatiquement la colonne client_id ; crée l’index toi-même, les jointures en ont besoin. Et SQLite n’applique les clés étrangères qu’après PRAGMA foreign_keys = ON.',
          'CREATE TABLE commandes (\n  id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,\n  client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,\n  total     INTEGER NOT NULL CHECK (total >= 0)\n);\nCREATE INDEX ON commandes (client_id);',
        ),
        tip(
          'Les cardinalités',
          '• Un à plusieurs (1-N) : un client a plusieurs commandes. La clé étrangère va du côté « plusieurs » (commandes.client_id).\n• Plusieurs à plusieurs (N-N) : un élève suit plusieurs cours, un cours a plusieurs élèves. On crée une table de liaison inscriptions(eleve_id, cours_id) avec deux clés étrangères et une clé primaire composite (eleve_id, cours_id) qui empêche les doublons.\n• Un à un (1-1) : une clé étrangère UNIQUE, par exemple un profil par utilisateur.\n\nNormaliser, c’est ne stocker chaque information qu’à un seul endroit : on ne recopie pas le nom du client dans chaque commande, et on ne range pas une liste « maths,svt » dans une seule colonne.',
          'CREATE TABLE inscriptions (\n  eleve_id BIGINT REFERENCES eleves(id),\n  cours_id BIGINT REFERENCES cours(id),\n  PRIMARY KEY (eleve_id, cours_id)\n);',
        ),
        qcm(
          'Où place-t-on la clé étrangère entre clients et commandes ?',
          [
            'Dans clients : une colonne commande_id',
            'Dans commandes : une colonne client_id',
            'Dans les deux tables',
            'Dans une troisième table obligatoirement',
          ],
          1,
          'Un client a plusieurs commandes : chaque commande désigne son unique client. La clé étrangère va du côté « plusieurs ».',
        ),
        qcm(
          'Comment modéliser « un élève suit plusieurs cours et un cours a plusieurs élèves » ?',
          [
            'Une colonne cours_ids contenant « 1,4,7 » dans eleves',
            'Une colonne eleve_id dans cours',
            'Une table de liaison inscriptions(eleve_id, cours_id)',
            'Fusionner eleves et cours dans une seule table',
          ],
          2,
          'Une relation N-N passe par une table de liaison. Une liste dans une colonne casse la première forme normale : impossible de joindre ou d’indexer proprement.',
        ),
        match(
          'Associe chaque option ON DELETE à son effet quand on supprime un client.',
          [
            ['CASCADE', 'Ses commandes sont supprimées aussi'],
            ['SET NULL', 'Ses commandes gardent client_id à NULL'],
            ['RESTRICT', 'La suppression est refusée'],
          ],
          'Pour des commandes ou des paiements, on choisit souvent RESTRICT : on ne veut pas effacer l’historique comptable par accident.',
        ),
        vf(
          'En PostgreSQL, déclarer client_id REFERENCES clients(id) crée automatiquement un index sur commandes.client_id.',
          false,
          'Seul le côté référencé (clients.id, clé primaire) est indexé. Crée l’index sur client_id : sans lui, jointures et suppressions de clients deviennent lentes.',
        ),
        fill(
          'Empêche un élève d’être inscrit deux fois au même cours.',
          'CREATE TABLE inscriptions (\n  eleve_id BIGINT REFERENCES eleves(id),\n  cours_id BIGINT REFERENCES cours(id),\n  ___ (eleve_id, cours_id)\n);',
          ['PRIMARY KEY', 'FOREIGN KEY', 'INDEX', 'CHECK'],
          'PRIMARY KEY',
          'Une clé primaire composite garantit que chaque couple (élève, cours) n’apparaît qu’une fois.',
        ),
        vf(
          'Recopier le nom du client dans chaque commande est une bonne pratique pour éviter les jointures.',
          false,
          'Si le client change de nom, il faut corriger toutes les lignes, et on finit avec des incohérences. On stocke l’id et on joint.',
        ),
      ]),

      lesson('inner-join', 'INNER JOIN', [
        tip(
          'Combiner deux tables',
          'Une jointure assemble les lignes de deux tables selon une condition, écrite après ON. INNER JOIN (ou simplement JOIN) ne garde que les couples qui correspondent : une commande sans client, ou un client sans commande, disparaît du résultat.\n\nOn donne des alias courts aux tables (clients c, commandes o) et on préfixe les colonnes : c.nom, o.total. C’est obligatoire quand une colonne existe des deux côtés (id) et plus lisible dans tous les cas. Si les deux colonnes portent le même nom, USING (client_id) remplace ON.\n\nOublier la condition produit un produit cartésien (CROSS JOIN) : chaque ligne de gauche avec chaque ligne de droite, soit 3 × 4 = 12 lignes ici, et des millions sur de vraies tables.',
          CLIENTS_COMMANDES +
            '\n\nSELECT c.nom, o.total\nFROM commandes o\nJOIN clients c ON c.id = o.client_id;',
        ),
        qcm(
          'Combien de lignes renvoie la jointure de la fiche ?',
          ['4', '3', '2', '12'],
          1,
          'Commandes 10 et 11 (Awa), 12 (Kofi). La commande 13 n’a pas de client (NULL ne correspond à rien) et Nadia n’a pas de commande : INNER JOIN les écarte.',
        ),
        fill(
          'Indique la condition de jointure.',
          'SELECT c.nom, o.total\nFROM commandes o\nJOIN clients c ___ c.id = o.client_id;',
          ['ON', 'WHERE', 'BY', 'WITH'],
          'ON',
          'ON porte la condition qui relie les deux tables. USING (colonne) marche quand le nom est identique des deux côtés.',
        ),
        qcm(
          'Combien de lignes renvoie SELECT * FROM clients CROSS JOIN commandes; ?',
          ['3', '4', '7', '12'],
          3,
          'Un produit cartésien associe chaque client (3) à chaque commande (4) : 12 lignes. C’est ce qu’on obtient en oubliant la condition de jointure.',
          CLIENTS_COMMANDES,
        ),
        qcm(
          'Que renvoie cette requête ?',
          [
            'Awa 7000, Kofi 7500',
            'Awa 7000, Kofi 7500, Nadia 0',
            'Awa 2, Kofi 1',
            'Awa 5000, Kofi 7500',
          ],
          0,
          'On joint, puis on regroupe par client : Awa 5000 + 2000 = 7000, Kofi 7500. Nadia n’a pas de commande : INNER JOIN l’a déjà écartée.',
          CLIENTS_COMMANDES +
            '\n\nSELECT c.nom, SUM(o.total)\nFROM clients c\nJOIN commandes o ON o.client_id = c.id\nGROUP BY c.nom;',
        ),
        vf(
          'JOIN et INNER JOIN sont deux écritures de la même jointure.',
          true,
          'INNER est facultatif. De même, LEFT JOIN et LEFT OUTER JOIN sont identiques.',
        ),
        order(
          'Écris la requête qui affiche le nom du client de chaque commande, du plus gros total au plus petit.',
          [
            'SELECT c.nom, o.total',
            'FROM commandes o',
            'JOIN clients c ON c.id = o.client_id',
            'ORDER BY o.total DESC;',
          ],
          'FROM et JOIN construisent la table combinée, ORDER BY trie à la fin.',
        ),
      ]),

      lesson('left-join', 'LEFT JOIN et ses pièges', [
        tip(
          'Garder les lignes sans correspondance',
          'LEFT JOIN garde toutes les lignes de la table de gauche ; quand aucune ligne de droite ne correspond, les colonnes de droite valent NULL. Avec clients LEFT JOIN commandes, Nadia apparaît avec un total NULL. RIGHT JOIN fait l’inverse (on l’évite en inversant les tables) ; FULL OUTER JOIN garde tout des deux côtés (absent de MySQL).\n\nDeux usages courants :\n• compter avec des zéros : COUNT(o.id) compte 0 commande pour Nadia, alors que COUNT(*) compterait 1, la ligne existant bel et bien ;\n• trouver les « orphelins » : WHERE o.id IS NULL donne les clients sans commande (anti-jointure).\n\nPiège majeur : un filtre sur la table de droite placé dans WHERE (WHERE o.total > 3000) élimine les lignes NULL et transforme ton LEFT JOIN en INNER JOIN. Pour filtrer les commandes tout en gardant tous les clients, mets la condition dans le ON.',
          'SELECT c.nom, COUNT(o.id) AS nb_commandes\nFROM clients c\nLEFT JOIN commandes o ON o.client_id = c.id\nGROUP BY c.nom;\n-- Awa 2, Kofi 1, Nadia 0',
        ),
        qcm(
          'Combien de lignes renvoie cette requête ?',
          ['3', '4', '5', '2'],
          1,
          'Awa apparaît deux fois (deux commandes), Kofi une fois, Nadia une fois avec total NULL : 4 lignes. La commande 13 sans client n’apparaît pas, car la table de gauche est clients.',
          CLIENTS_COMMANDES +
            '\n\nSELECT c.nom, o.total\nFROM clients c\nLEFT JOIN commandes o ON o.client_id = c.id;',
        ),
        qcm(
          'Que renvoie cette requête pour Nadia ?',
          ['0', '1', 'NULL', 'Elle n’apparaît pas'],
          1,
          'Avec LEFT JOIN, Nadia a une ligne (colonnes de commandes à NULL). COUNT(*) compte cette ligne : 1. Il fallait COUNT(o.id), qui ignore les NULL et donne 0.',
          'SELECT c.nom, COUNT(*)\nFROM clients c\nLEFT JOIN commandes o ON o.client_id = c.id\nGROUP BY c.nom;',
        ),
        fill(
          'Liste les clients qui n’ont jamais commandé.',
          'SELECT c.nom\nFROM clients c\nLEFT JOIN commandes o ON o.client_id = c.id\nWHERE o.id ___;',
          ['IS NULL', '= NULL', '= 0', 'IS NOT NULL'],
          'IS NULL',
          'Sans correspondance, o.id vaut NULL. Résultat : Nadia.',
        ),
        qcm(
          'Cette requête veut tous les clients, avec leurs commandes de plus de 3000 F. Que renvoie-t-elle vraiment ?',
          [
            'Awa, Kofi et Nadia',
            'Awa 5000 et Kofi 7500 seulement',
            'Nadia seulement',
            'Une erreur',
          ],
          1,
          'Pour Nadia, o.total est NULL et NULL > 3000 vaut UNKNOWN : WHERE l’écarte. Le LEFT JOIN est devenu un INNER JOIN. Écris plutôt LEFT JOIN commandes o ON o.client_id = c.id AND o.total > 3000.',
          'SELECT c.nom, o.total\nFROM clients c\nLEFT JOIN commandes o ON o.client_id = c.id\nWHERE o.total > 3000;',
        ),
        vf(
          'Dans un LEFT JOIN, une condition placée dans le ON ne supprime jamais de ligne de la table de gauche.',
          true,
          'Le ON décide seulement quelles lignes de droite s’attachent. Les lignes de gauche restent toutes, au pire avec des NULL.',
        ),
        match(
          'Associe chaque jointure à ce qu’elle garde.',
          [
            ['INNER JOIN', 'Seulement les couples qui correspondent'],
            ['LEFT JOIN', 'Toute la table de gauche'],
            ['FULL OUTER JOIN', 'Toutes les lignes des deux tables'],
            ['CROSS JOIN', 'Toutes les combinaisons possibles'],
          ],
          'INNER et LEFT couvrent l’immense majorité des besoins.',
        ),
      ]),

      lesson('sous-requetes', 'Sous-requêtes, EXISTS et WITH', [
        tip(
          'Une requête dans la requête',
          'Une sous-requête est un SELECT entre parenthèses, utilisé comme une valeur ou comme une table :\n• scalaire (une seule valeur) : WHERE total > (SELECT AVG(total) FROM commandes) ;\n• liste : WHERE id IN (SELECT client_id FROM commandes WHERE total > 3000) ;\n• existence : WHERE EXISTS (SELECT 1 FROM commandes o WHERE o.client_id = c.id). Elle est dite corrélée, car elle utilise une colonne de la requête externe ;\n• table dérivée dans le FROM : donne-lui un alias (obligatoire en MySQL et avant PostgreSQL 16).\n\nWITH (une CTE) nomme une sous-requête en tête de requête : plus lisible quand on enchaîne plusieurs étapes.',
          'WITH totaux AS (\n  SELECT client_id, SUM(total) AS depense\n  FROM commandes\n  GROUP BY client_id\n)\nSELECT c.nom, t.depense\nFROM totaux t\nJOIN clients c ON c.id = t.client_id\nWHERE t.depense > 5000;',
        ),
        tip(
          'Le piège de NOT IN avec NULL',
          'x NOT IN (1, 2, NULL) revient à x <> 1 AND x <> 2 AND x <> NULL. Le dernier terme vaut toujours UNKNOWN : la condition n’est jamais vraie et la requête ne renvoie rien. Si la sous-requête peut contenir un NULL (ici la commande 13 sans client), NOT IN renvoie un résultat vide sans aucune erreur.\n\nUtilise NOT EXISTS, qui se comporte comme on l’attend, ou un LEFT JOIN … WHERE … IS NULL.',
          CLIENTS_COMMANDES,
        ),
        qcm(
          'Que renvoie cette requête sur les tables de la fiche ?',
          ['Nadia', 'Awa et Kofi', 'Aucune ligne', 'Une erreur'],
          2,
          'La sous-requête renvoie 1, 1, 2 et NULL. id NOT IN (…, NULL) vaut au mieux UNKNOWN : aucune ligne. NOT EXISTS aurait renvoyé Nadia.',
          'SELECT nom FROM clients\nWHERE id NOT IN (SELECT client_id FROM commandes);',
        ),
        qcm(
          'Que renvoie cette requête ? (La moyenne des totaux vaut 3875.)',
          [
            'Les commandes 10 et 12',
            'Les commandes 11 et 13',
            'Toutes les commandes',
            'La commande 12 seulement',
          ],
          0,
          '(5000 + 2000 + 7500 + 1000) / 4 = 3875. Seules 5000 (commande 10) et 7500 (commande 12) dépassent la moyenne.',
          'SELECT id, total FROM commandes\nWHERE total > (SELECT AVG(total) FROM commandes);',
        ),
        fill(
          'Liste les clients qui ont au moins une commande.',
          'SELECT nom FROM clients c\nWHERE ___ (SELECT 1 FROM commandes o WHERE o.client_id = c.id);',
          ['EXISTS', 'IN', 'ANY', 'HAVING'],
          'EXISTS',
          'EXISTS est vrai dès que la sous-requête renvoie une ligne ; le SELECT 1 ne sert qu’à dire « une ligne quelconque ».',
        ),
        vf(
          'NOT EXISTS est plus sûr que NOT IN quand la sous-requête peut renvoyer des NULL.',
          true,
          'NOT EXISTS teste seulement la présence de lignes ; il n’est pas piégé par la logique à trois valeurs.',
        ),
        qcm(
          'Une sous-requête utilisée avec = renvoie deux lignes. Que se passe-t-il en PostgreSQL ?',
          [
            'La première ligne est utilisée',
            'Erreur : « more than one row returned by a subquery used as an expression »',
            'Les deux valeurs sont additionnées',
            'Le résultat est NULL',
          ],
          1,
          'Une sous-requête scalaire doit renvoyer au plus une ligne. Pour une liste, utilise IN ; pour une seule valeur, un agrégat ou un LIMIT 1 avec ORDER BY.',
        ),
      ]),
    ],
  ),

  unit(
    'securite-performance',
    'Sécurité, performance et révision',
    'Écrire des requêtes sûres et rapides, protéger la base, puis tout réviser sur un cas complet.',
    [
      lesson('injection-sql', 'L’injection SQL et les requêtes paramétrées', [
        tip(
          'Comment fonctionne l’injection',
          "L’injection SQL arrive quand une saisie utilisateur est collée dans le texte d’une requête. Si quelqu’un tape ' OR '1'='1 dans un champ e-mail, la requête devient WHERE email = '' OR '1'='1' : la condition est toujours vraie et la base renvoie tous les comptes. Selon les droits et le pilote, un attaquant peut lire des tables entières, modifier des soldes ou effacer des données. C’est l’une des failles les plus exploitées du web.\n\nLa seule vraie protection : les requêtes paramétrées. La requête est envoyée avec des emplacements ($1, $2 en PostgreSQL avec node-postgres ; ? avec les pilotes MySQL et SQLite) et les valeurs voyagent à part. La base les traite toujours comme des données, jamais comme du code.",
          '// Dangereux : la saisie devient du SQL\ndb.query("SELECT * FROM users WHERE email = \'" + email + "\'");\n\n// Sûr : la saisie reste une valeur\ndb.query(\'SELECT * FROM users WHERE email = $1\', [email]);',
        ),
        tip(
          'Les cas limites',
          '• Échapper soi-même les apostrophes est fragile : un oubli suffit. Paramètre toujours.\n• Un paramètre ne peut remplacer qu’une valeur, pas un nom de table ou de colonne, ni ASC/DESC. Pour un tri choisi par l’utilisateur, compare sa saisie à une liste blanche (["prix", "nom"]) avant de l’insérer.\n• Les ORM (Prisma, Sequelize, SQLAlchemy…) paramètrent par défaut, mais leurs fonctions de requête brute peuvent redevenir dangereuses : avec Prisma, $queryRaw (gabarit étiqueté) est paramétré, $queryRawUnsafe ne l’est pas.\n• Ne renvoie pas les messages d’erreur SQL bruts à l’utilisateur : ils renseignent l’attaquant sur ton schéma.',
        ),
        qcm(
          "Quelle saisie, collée dans WHERE email = '…', ferait renvoyer tous les comptes ?",
          ['awa@exemple.tg', "' OR '1'='1", 'SELECT', '%'],
          1,
          "La saisie ferme l’apostrophe puis ajoute une condition toujours vraie : WHERE email = '' OR '1'='1'.",
        ),
        fill(
          'Utilise un paramètre au lieu de concaténer (node-postgres).',
          "db.query('SELECT id, nom FROM clients WHERE ville = ___', [ville]);",
          ['$1', '\'" + ville + "\'', 'ville', '{ville}'],
          '$1',
          'Le pilote envoie la valeur séparément ; elle ne peut pas modifier la structure de la requête.',
        ),
        vf(
          'On peut passer un nom de colonne de tri en paramètre : ORDER BY $1.',
          false,
          'Un paramètre est une valeur : ORDER BY $1 trie par une constante, donc ne trie rien. Pour un tri dynamique, valide le nom de colonne contre une liste blanche.',
        ),
        qcm(
          'Laquelle de ces pratiques protège réellement contre l’injection SQL ?',
          [
            'Remplacer les apostrophes par des espaces',
            'Masquer les erreurs de la base',
            'Passer les valeurs en paramètres de la requête',
            'Écrire les mots-clés SQL en minuscules',
          ],
          2,
          'Masquer les erreurs complique la tâche de l’attaquant mais n’empêche rien. Seuls les paramètres séparent code et données.',
        ),
        vf(
          'Avec Prisma, $queryRawUnsafe("SELECT * FROM users WHERE id = " + id) est protégé contre l\'injection.',
          false,
          'Unsafe porte bien son nom : la chaîne est envoyée telle quelle. Préfère $queryRaw avec un gabarit étiqueté, qui paramètre les valeurs.',
        ),
        match(
          'Associe chaque pilote à sa notation de paramètre.',
          [
            ['node-postgres (PostgreSQL)', '$1, $2'],
            ['mysql2 (MySQL)', '?'],
            ['psycopg (Python, PostgreSQL)', '%s'],
          ],
          'La notation change, le principe reste : la requête d’un côté, les valeurs de l’autre.',
        ),
      ]),

      lesson('index-explain', 'Index et EXPLAIN', [
        tip(
          'Les index',
          "Sans index, chercher un client par e-mail oblige la base à lire toute la table (Seq Scan). Un index, comme celui d’un livre, est une structure triée (un B-tree par défaut) qui mène directement aux bonnes lignes. Il accélère les WHERE, les jointures et les ORDER BY sur les colonnes indexées.\n\nMais chaque index occupe de la place et ralentit les INSERT, UPDATE et DELETE, qui doivent le tenir à jour. On indexe donc les colonnes réellement filtrées ou jointes : les clés étrangères, l’e-mail de connexion, la date des transactions.\n\nPièges :\n• un index sur (ville, date) sert pour ville seule ou ville + date, mais pas pour date seule ;\n• une fonction sur la colonne l’empêche de servir : WHERE LOWER(email) = … demande un index sur LOWER(email) ;\n• LIKE '%abc' (joker au début) ne peut pas utiliser un B-tree ;\n• sur une petite table, la base préfère souvent tout lire : c’est normal.",
          'CREATE INDEX idx_transactions_date ON transactions (cree_le);\nCREATE UNIQUE INDEX idx_users_email ON users (LOWER(email));\n-- En production, sans bloquer les écritures :\nCREATE INDEX CONCURRENTLY idx_commandes_client ON commandes (client_id);',
        ),
        tip(
          'Lire un plan avec EXPLAIN',
          'EXPLAIN affiche le plan choisi par le planificateur, sans exécuter la requête. EXPLAIN ANALYZE l’exécute vraiment et donne les temps réels : sur un UPDATE ou un DELETE, entoure-le de BEGIN … ROLLBACK.\n\nCe qu’on y cherche : Seq Scan (lecture complète) sur une grosse table, contre Index Scan ou Index Only Scan ; l’écart entre lignes estimées et réelles (des statistiques périmées, à rafraîchir avec ANALYZE) ; le nœud le plus coûteux.\n\nAutre source classique de lenteur : le problème N+1, quand le code lance une requête par élément d’une liste (100 commandes, 100 requêtes pour leurs clients) au lieu d’une seule jointure.',
          "EXPLAIN ANALYZE\nSELECT * FROM transactions WHERE cree_le >= '2026-11-01';\n-- Index Scan using idx_transactions_date on transactions ...",
        ),
        vf(
          'Ajouter un index sur chaque colonne de chaque table est une bonne pratique.',
          false,
          'Chaque index ralentit les écritures et prend de la place. On indexe d’après les requêtes réelles, plan d’exécution à l’appui.',
        ),
        qcm(
          'Un index existe sur (ville, cree_le). Quelle requête ne peut pas en profiter efficacement ?',
          [
            "WHERE ville = 'Lomé'",
            "WHERE ville = 'Lomé' AND cree_le >= '2026-11-01'",
            "WHERE cree_le >= '2026-11-01'",
            "WHERE ville = 'Lomé' ORDER BY cree_le",
          ],
          2,
          'Un index composite est trié d’abord par ville. Sans condition sur la première colonne, il ne permet pas d’aller directement aux bonnes dates.',
        ),
        qcm(
          'Quelle est la différence entre EXPLAIN et EXPLAIN ANALYZE ?',
          [
            'Aucune',
            'EXPLAIN ANALYZE exécute vraiment la requête et mesure les temps',
            'EXPLAIN ANALYZE crée les index manquants',
            'EXPLAIN ne fonctionne que sur les SELECT',
          ],
          1,
          'Attention : EXPLAIN ANALYZE DELETE … supprime réellement les lignes. Fais-le dans une transaction annulée.',
        ),
        fill(
          'Crée un index sur la colonne client_id.',
          '___ idx_commandes_client ON commandes (client_id);',
          ['CREATE INDEX', 'ADD INDEX', 'CREATE KEY', 'INDEX TABLE'],
          'CREATE INDEX',
          'CREATE INDEX nom ON table (colonnes). Indexer les clés étrangères est l’un des gains les plus simples.',
        ),
        vf(
          "WHERE LOWER(email) = 'awa@exemple.tg' utilise un index ordinaire posé sur email.",
          false,
          'L’index est trié sur email, pas sur LOWER(email). Il faut un index d’expression : CREATE INDEX ON users (LOWER(email)).',
        ),
        qcm(
          'Une page affiche 50 commandes et lance une requête par commande pour charger son client. Comment s’appelle ce problème ?',
          ['Le produit cartésien', 'Le problème N+1', 'L’injection SQL', 'Le deadlock'],
          1,
          '1 requête pour la liste + N pour les détails. Une jointure (ou un chargement groupé avec IN) ramène tout en une ou deux requêtes.',
        ),
      ]),

      lesson('droits-sauvegardes', 'Droits, sauvegardes et bonnes pratiques', [
        tip(
          'Le moindre privilège',
          'L’application ne doit jamais se connecter avec le super-utilisateur postgres. On crée un rôle dédié qui a seulement les droits nécessaires : en cas de faille, l’attaquant ne pourra pas supprimer des tables ni lire celles des autres services.\n\nGRANT donne un droit, REVOKE le retire. Un rôle en lecture seule convient aux tableaux de bord et aux analystes.\n\nAutres règles : le mot de passe de la base vit dans une variable d’environnement ou un gestionnaire de secrets, jamais dans le dépôt Git ; la connexion passe en TLS ; le port 5432 n’est jamais ouvert à tout Internet.',
          "CREATE ROLE app_boutique LOGIN PASSWORD '…';\nGRANT SELECT, INSERT, UPDATE ON commandes, clients TO app_boutique;\n\nCREATE ROLE lecture_seule LOGIN PASSWORD '…';\nGRANT SELECT ON ALL TABLES IN SCHEMA public TO lecture_seule;\nREVOKE INSERT ON clients FROM app_boutique;",
        ),
        tip(
          'Sauvegarder… et restaurer',
          'pg_dump produit une sauvegarde logique d’une base (pg_restore la recharge) ; pg_dumpall inclut aussi les rôles. Pour une grosse base, on combine une sauvegarde physique (pg_basebackup) et l’archivage des journaux WAL, qui permet de restaurer à une minute précise (PITR) : utile après un DELETE malheureux à 14 h 32.\n\nRègle 3-2-1 : trois copies, sur deux supports différents, dont une hors du serveur (un autre hébergeur, un autre pays). Chiffre les sauvegardes : elles contiennent toutes tes données.\n\nUne sauvegarde jamais restaurée n’est qu’un espoir. Teste régulièrement la restauration sur une base séparée et chronomètre-la.',
          'pg_dump -Fc -d boutique -f boutique.dump\npg_restore -d boutique_test boutique.dump',
        ),
        qcm(
          'Avec quel compte l’application de la boutique doit-elle se connecter ?',
          [
            'Le super-utilisateur postgres',
            'Un rôle dédié, limité aux tables et opérations utiles',
            'Le compte personnel du développeur',
            'Un rôle sans mot de passe pour aller plus vite',
          ],
          1,
          'Moindre privilège : une injection ou une fuite d’identifiants fait alors bien moins de dégâts.',
        ),
        fill(
          'Donne le droit de lecture sur la table ventes au rôle analyste.',
          '___ SELECT ON ventes TO analyste;',
          ['GRANT', 'ALLOW', 'PERMIT', 'REVOKE'],
          'GRANT',
          'GRANT donne, REVOKE retire. Les deux font partie du DCL.',
        ),
        vf(
          'Une sauvegarde automatique quotidienne suffit, même si on n’a jamais essayé de la restaurer.',
          false,
          'Fichier corrompu, sauvegarde vide, mot de passe de chiffrement perdu : seule une restauration testée prouve que la sauvegarde fonctionne.',
        ),
        match(
          'Associe chaque outil à son usage.',
          [
            ['pg_dump', 'Sauvegarde logique d’une base'],
            ['pg_restore', 'Recharger une sauvegarde pg_dump'],
            ['Archivage WAL', 'Restaurer à un instant précis'],
            ['REVOKE', 'Retirer un droit'],
          ],
          'Sauvegarde, restauration et droits forment le trio de base de l’exploitation.',
        ),
        qcm(
          'Où ranger le mot de passe de connexion à la base ?',
          [
            'En dur dans le code, pour qu’il soit versionné',
            'Dans le README du dépôt',
            'Dans une variable d’environnement ou un gestionnaire de secrets',
            'Dans un commentaire SQL',
          ],
          2,
          'Un secret commité reste dans l’historique Git, même après suppression. S’il fuit, change-le immédiatement.',
        ),
      ]),

      lesson('revision-projet', 'Projet : la base d’une boutique à Lomé', [
        tip(
          'Le cas complet',
          "Pour réviser, prenons la base d’une boutique en ligne à Lomé qui accepte le paiement mobile money. Trois tables :\n• clients(id, nom, telephone UNIQUE) ;\n• commandes(id, client_id REFERENCES clients, total CHECK (total >= 0), statut, cree_le TIMESTAMPTZ) ;\n• paiements(id, commande_id REFERENCES commandes, montant, statut CHECK (statut IN ('en_attente', 'reussi', 'echoue'))).\n\nCe schéma mobilise tout le cours : types adaptés à l’argent et au temps, contraintes, clés, index sur les clés étrangères. Les questions qui suivent mélangent lecture, agrégats, jointures, transactions et sécurité, comme à l’examen.",
          "-- Chiffre d’affaires encaissé par client en novembre 2026\nSELECT c.nom, SUM(p.montant) AS encaisse\nFROM clients c\nJOIN commandes o ON o.client_id = c.id\nJOIN paiements p ON p.commande_id = o.id\nWHERE p.statut = 'reussi'\n  AND o.cree_le >= '2026-11-01' AND o.cree_le < '2026-12-01'\nGROUP BY c.nom\nORDER BY encaisse DESC;",
        ),
        qcm(
          "Dans la requête de la fiche, pourquoi écrire cree_le < '2026-12-01' plutôt que BETWEEN '2026-11-01' AND '2026-11-30' ?",
          [
            'BETWEEN n’existe pas en PostgreSQL',
            'BETWEEN oublierait les commandes du 30 novembre après minuit',
            'C’est plus court à écrire',
            'BETWEEN exclut les bornes',
          ],
          1,
          "Sur un TIMESTAMPTZ, '2026-11-30' vaut le 30 à 00 h 00 : une commande à 15 h ce jour-là serait exclue. L’intervalle semi-ouvert [début, fin[ est la bonne habitude.",
        ),
        order(
          'Enregistre un paiement réussi et marque la commande payée, sans jamais faire l’un sans l’autre.',
          [
            'BEGIN;',
            "INSERT INTO paiements (commande_id, montant, statut) VALUES (42, 7500, 'reussi');",
            "UPDATE commandes SET statut = 'payee' WHERE id = 42;",
            'COMMIT;',
          ],
          'Les deux écritures forment une seule transaction : en cas de panne, aucune n’est appliquée.',
        ),
        qcm(
          'Quelle requête liste les commandes qui n’ont aucun paiement ?',
          [
            'SELECT o.id FROM commandes o JOIN paiements p ON p.commande_id = o.id WHERE p.id IS NULL;',
            'SELECT o.id FROM commandes o LEFT JOIN paiements p ON p.commande_id = o.id WHERE p.id IS NULL;',
            'SELECT o.id FROM commandes o WHERE o.id NOT IN (SELECT id FROM paiements);',
            'SELECT o.id FROM commandes o GROUP BY o.id HAVING COUNT(*) = 0;',
          ],
          1,
          'L’anti-jointure LEFT JOIN … IS NULL garde les commandes sans correspondance. La première est un INNER JOIN (jamais de NULL), la troisième compare au mauvais id.',
        ),
        qcm(
          'La requête du chiffre d’affaires est lente. Quel index est le plus utile en premier ?',
          [
            'Un index sur clients.nom',
            'Un index sur paiements.commande_id',
            'Un index sur paiements.montant',
            'Aucun : les index ne servent pas aux jointures',
          ],
          1,
          'La jointure paiements → commandes passe par commande_id, une clé étrangère que PostgreSQL n’indexe pas tout seul. Vérifie ensuite le gain avec EXPLAIN ANALYZE.',
        ),
        vf(
          "Le numéro de téléphone saisi dans le formulaire peut être concaténé dans la requête puisqu'il ne contient que des chiffres.",
          false,
          'Rien ne garantit ce que l’attaquant envoie réellement : la validation côté navigateur se contourne. Paramètre toutes les valeurs, sans exception.',
        ),
        match(
          'Associe chaque besoin de la boutique à l’outil SQL adapté.',
          [
            ['Refuser un total négatif', 'CHECK'],
            ['Un seul compte par téléphone', 'UNIQUE'],
            ['Nombre de paiements échoués par jour', 'GROUP BY'],
            ['Débiter et créditer ensemble', 'Transaction'],
            ['Accélérer la recherche par téléphone', 'Index'],
          ],
          'Tu as maintenant tous les outils du programme de la certification sql-fondamentaux.',
        ),
        qcm(
          'Que renvoie cette requête si la table paiements contient 3 lignes « reussi », 1 « echoue » et 1 « en_attente » ?',
          ['3', '5', '2', '1'],
          2,
          'COUNT(*) compte les lignes qui passent le WHERE : 1 « echoue » + 1 « en_attente » = 2.',
          "SELECT COUNT(*) FROM paiements WHERE statut <> 'reussi';",
        ),
      ]),
    ],
  ),
];
