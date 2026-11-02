import { fill, lesson, match, order, qcm, tip, unit, vf } from './dsl';
import type { CourseUnit } from './types';

export const units: CourseUnit[] = [
  unit('select', 'Lire des données', 'Interroger une table avec SELECT et WHERE.', [
    lesson('tables', 'Tables, lignes et colonnes', [
      tip(
        'Une base, des tables',
        'Une base de données relationnelle range les données dans des tables, comme des feuilles de calcul : chaque colonne a un nom et un type, chaque ligne est un enregistrement. SQL est le langage pour lire et modifier ces tables. PostgreSQL, MySQL et SQLite le parlent tous.',
        'Table devs\n| id | nom   | pays | xp  |\n|----|-------|------|-----|\n| 1  | Awa   | SN   | 120 |\n| 2  | Kofi  | GH   | 85  |\n| 3  | Nadia | MA   | 240 |',
      ),
      qcm(
        'Dans la table devs, combien y a-t-il de colonnes ?',
        ['3', '4', '5'],
        1,
        'id, nom, pays et xp.',
      ),
      match('Associe chaque mot à sa définition.', [
        ['Table', 'Un ensemble de données de même nature'],
        ['Ligne', 'Un enregistrement'],
        ['Colonne', 'Un attribut, avec un type'],
        ['SQL', 'Le langage des requêtes'],
      ]),
      vf('SQL veut dire Structured Query Language.', true, 'Langage de requêtes structuré.'),
      qcm(
        'Quel logiciel n’est pas une base de données SQL ?',
        ['PostgreSQL', 'SQLite', 'Photoshop'],
        2,
        'PostgreSQL, MySQL et SQLite sont des bases SQL.',
      ),
      vf(
        'Dans une table, toutes les valeurs d’une colonne ont le même type.',
        true,
        'La colonne xp ne contient que des nombres, par exemple.',
      ),
    ]),
    lesson('select', 'SELECT', [
      tip(
        'Choisir des colonnes',
        'SELECT liste les colonnes à afficher, FROM dit dans quelle table. * prend toutes les colonnes. Une requête se termine par un point-virgule. Les mots-clés s’écrivent souvent en majuscules par convention.',
        'SELECT nom, pays FROM devs;\nSELECT * FROM devs;',
      ),
      fill(
        'Affiche toutes les colonnes de la table devs.',
        'SELECT ___ FROM devs;',
        ['*', 'ALL', 'tout'],
        '*',
        '* signifie « toutes les colonnes ».',
      ),
      order(
        'Écris la requête qui affiche le nom de chaque dev.',
        ['SELECT nom', 'FROM devs;'],
        'SELECT puis FROM.',
      ),
      qcm(
        'Que renvoie SELECT nom FROM devs; ?',
        ['Une colonne avec tous les noms', 'Seulement le premier nom', 'Le nombre de devs'],
        0,
        'Sans filtre, toutes les lignes sont renvoyées.',
      ),
      vf(
        'SELECT * est pratique pour explorer, mais en production on liste les colonnes utiles.',
        true,
        'On évite de transporter des données inutiles ou sensibles.',
      ),
      fill(
        'Complète la requête.',
        'SELECT nom, xp ___ devs;',
        ['FROM', 'IN', 'TABLE'],
        'FROM',
        'FROM indique la table.',
      ),
    ]),
    lesson('where', 'Filtrer avec WHERE', [
      tip(
        'Garder certaines lignes',
        'WHERE filtre les lignes selon une condition. On combine avec AND et OR. Le texte s’écrit entre apostrophes simples. LIKE cherche un motif : % remplace n’importe quelle suite de caractères.',
        "SELECT nom FROM devs WHERE pays = 'SN';\nSELECT nom FROM devs WHERE xp > 100 AND pays <> 'GH';\nSELECT nom FROM devs WHERE nom LIKE 'A%';",
      ),
      qcm(
        'Que renvoie SELECT nom FROM devs WHERE xp > 100; avec la table de départ ?',
        ['Awa et Nadia', 'Kofi', 'Les trois'],
        0,
        'Awa a 120, Nadia 240, Kofi 85.',
      ),
      fill(
        'Garde seulement les devs du Ghana.',
        "SELECT * FROM devs ___ pays = 'GH';",
        ['WHERE', 'IF', 'FILTER'],
        'WHERE',
        'WHERE vient après FROM.',
      ),
      vf(
        "En SQL, le texte s’écrit entre apostrophes simples : 'Dakar'.",
        true,
        'Les guillemets doubles servent aux noms de colonnes dans certaines bases.',
      ),
      match('Associe chaque opérateur à son sens.', [
        ['=', 'Égal'],
        ['<>', 'Différent'],
        ['LIKE', 'Ressemble à un motif'],
        ['IN', 'Fait partie d’une liste'],
      ]),
      qcm(
        "Quels noms trouve WHERE nom LIKE '%a' ?",
        [
          'Ceux qui finissent par a',
          'Ceux qui commencent par a',
          'Ceux qui contiennent exactement « a »',
        ],
        0,
        '% avant le a : n’importe quoi, puis un a final.',
      ),
    ]),
  ]),

  unit('trier', 'Trier et résumer', 'Classer, limiter et calculer des statistiques.', [
    lesson('order', 'Trier et limiter', [
      tip(
        'ORDER BY et LIMIT',
        'ORDER BY trie les résultats : ASC du plus petit au plus grand (par défaut), DESC l’inverse. LIMIT garde seulement les premières lignes : parfait pour un classement.',
        'SELECT nom, xp FROM devs\nORDER BY xp DESC\nLIMIT 3;',
      ),
      fill(
        'Trie du plus grand au plus petit.',
        'SELECT nom FROM devs ORDER BY xp ___;',
        ['DESC', 'ASC', 'DOWN'],
        'DESC',
        'DESC pour descending.',
      ),
      order(
        'Affiche les 5 devs avec le plus d’XP.',
        ['SELECT nom, xp', 'FROM devs', 'ORDER BY xp DESC', 'LIMIT 5;'],
        'SELECT, FROM, ORDER BY, puis LIMIT.',
      ),
      qcm(
        'Avec la table de départ, qui arrive en premier avec ORDER BY xp DESC ?',
        ['Awa', 'Kofi', 'Nadia'],
        2,
        'Nadia a 240 XP.',
      ),
      vf(
        'Sans ORDER BY, l’ordre des lignes n’est pas garanti.',
        true,
        'Ne compte jamais sur un ordre implicite.',
      ),
      qcm(
        'Que fait ORDER BY pays, nom ?',
        [
          'Trie par pays, puis par nom à l’intérieur de chaque pays',
          'Trie seulement par nom',
          'Provoque une erreur',
        ],
        0,
        'Le second critère départage les égalités.',
      ),
    ]),
    lesson('agregats', 'Compter et calculer', [
      tip(
        'Fonctions d’agrégation',
        'COUNT compte les lignes, SUM additionne, AVG fait la moyenne, MIN et MAX donnent les extrêmes. Elles résument plusieurs lignes en une seule valeur. AS donne un nom au résultat.',
        'SELECT COUNT(*) AS total FROM devs;\nSELECT AVG(xp) AS moyenne FROM devs;\nSELECT MAX(xp) FROM devs;',
      ),
      match('Associe chaque fonction à son résultat sur la colonne xp (120, 85, 240).', [
        ['COUNT(*)', '3'],
        ['SUM(xp)', '445'],
        ['MIN(xp)', '85'],
        ['MAX(xp)', '240'],
      ]),
      fill(
        'Compte les devs.',
        'SELECT ___(*) FROM devs;',
        ['COUNT', 'SUM', 'TOTAL'],
        'COUNT',
        'COUNT(*) compte toutes les lignes.',
      ),
      qcm(
        'À quoi sert AS dans SELECT AVG(xp) AS moyenne ?',
        ['À nommer la colonne du résultat', 'À filtrer', 'À trier'],
        0,
        'C’est un alias : la colonne s’appelle moyenne.',
      ),
      vf(
        'COUNT(colonne) ignore les valeurs NULL de cette colonne.',
        true,
        'COUNT(*) compte toutes les lignes, COUNT(colonne) seulement les valeurs non nulles.',
      ),
      qcm(
        "Que renvoie SELECT COUNT(*) FROM devs WHERE pays = 'SN'; ?",
        ['1', '3', 'Awa'],
        0,
        'Seule Awa est au Sénégal.',
      ),
    ]),
    lesson('group', 'Regrouper avec GROUP BY', [
      tip(
        'Une statistique par groupe',
        'GROUP BY regroupe les lignes qui partagent une valeur et applique l’agrégation à chaque groupe. HAVING filtre les groupes (WHERE filtre les lignes avant le regroupement).',
        'SELECT pays, COUNT(*) AS nb\nFROM devs\nGROUP BY pays\nHAVING COUNT(*) >= 2\nORDER BY nb DESC;',
      ),
      qcm(
        'Que donne SELECT pays, COUNT(*) FROM devs GROUP BY pays; ?',
        ['Le nombre de devs par pays', 'Le nombre total de devs', 'La liste des noms'],
        0,
        'Une ligne par pays, avec son effectif.',
      ),
      fill(
        'Regroupe par pays.',
        'SELECT pays, AVG(xp) FROM devs ___ pays;',
        ['GROUP BY', 'ORDER BY', 'SPLIT BY'],
        'GROUP BY',
        'GROUP BY crée un groupe par valeur distincte.',
      ),
      vf(
        'On filtre des groupes avec HAVING, pas avec WHERE.',
        true,
        'WHERE agit avant le regroupement, HAVING après.',
      ),
      order(
        'Liste les pays qui comptent plus de 10 devs.',
        ['SELECT pays, COUNT(*)', 'FROM devs', 'GROUP BY pays', 'HAVING COUNT(*) > 10;'],
        'GROUP BY puis HAVING.',
      ),
      qcm(
        'Dans quel ordre s’écrivent ces clauses ?',
        [
          'WHERE, GROUP BY, HAVING, ORDER BY',
          'GROUP BY, WHERE, ORDER BY, HAVING',
          'ORDER BY, WHERE, HAVING, GROUP BY',
        ],
        0,
        'C’est l’ordre imposé par SQL.',
      ),
    ]),
  ]),

  unit('modifier', 'Créer et modifier', 'Créer des tables et changer leurs données sans risque.', [
    lesson('create', 'Créer une table', [
      tip(
        'CREATE TABLE',
        'On décrit chaque colonne avec son type. La clé primaire (PRIMARY KEY) identifie chaque ligne de façon unique. NOT NULL interdit les valeurs vides, UNIQUE interdit les doublons.',
        'CREATE TABLE produits (\n  id SERIAL PRIMARY KEY,\n  nom TEXT NOT NULL,\n  prix INTEGER NOT NULL,\n  sku TEXT UNIQUE\n);',
      ),
      match('Associe chaque type à ce qu’il range.', [
        ['INTEGER', 'Un nombre entier'],
        ['TEXT', 'Du texte'],
        ['BOOLEAN', 'Vrai ou faux'],
        ['TIMESTAMP', 'Une date et une heure'],
      ]),
      qcm(
        'À quoi sert une clé primaire ?',
        ['Identifier chaque ligne de façon unique', 'Chiffrer la table', 'Trier les lignes'],
        0,
        'Deux lignes ne peuvent pas avoir la même clé primaire.',
      ),
      fill(
        'Interdis un nom vide.',
        'nom TEXT ___,',
        ['NOT NULL', 'REQUIRED', 'NO EMPTY'],
        'NOT NULL',
        'NOT NULL refuse l’absence de valeur.',
      ),
      vf(
        'UNIQUE empêche deux lignes d’avoir la même valeur dans la colonne.',
        true,
        'Utile pour un e-mail ou un code produit.',
      ),
      qcm(
        'Quel type choisir pour un prix en francs CFA ?',
        ['INTEGER', 'TEXT', 'BOOLEAN'],
        0,
        'Les montants en FCFA sont entiers ; on évite les nombres à virgule flottante pour l’argent.',
      ),
    ]),
    lesson('insert', 'Ajouter des lignes', [
      tip(
        'INSERT INTO',
        'INSERT INTO ajoute une ligne : on liste les colonnes, puis les valeurs dans le même ordre. On peut insérer plusieurs lignes d’un coup.',
        "INSERT INTO produits (nom, prix)\nVALUES ('Riz 5 kg', 4500);\n\nINSERT INTO produits (nom, prix)\nVALUES ('Huile 1 L', 1500), ('Sucre 1 kg', 800);",
      ),
      order(
        'Ajoute un produit.',
        ['INSERT INTO produits (nom, prix)', "VALUES ('Lait', 600);"],
        'Les colonnes, puis les valeurs.',
      ),
      fill(
        'Complète l’insertion.',
        "INSERT INTO produits (nom, prix) ___ ('Café', 2500);",
        ['VALUES', 'DATA', 'SET'],
        'VALUES',
        'VALUES introduit les valeurs.',
      ),
      vf(
        'Les valeurs doivent être dans le même ordre que les colonnes listées.',
        true,
        "(nom, prix) puis ('Café', 2500).",
      ),
      qcm(
        'Pourquoi ne pas donner d’id dans l’INSERT quand il est SERIAL ?',
        ['La base le génère automatiquement', 'C’est interdit en SQL', 'Il vaut toujours 0'],
        0,
        'SERIAL ou IDENTITY incrémentent l’id tout seuls.',
      ),
      qcm(
        'Une insertion échoue avec « violates unique constraint ». Pourquoi ?',
        ['Une valeur UNIQUE existe déjà', 'La table est vide', 'La requête est trop longue'],
        0,
        'Deux lignes ne peuvent pas partager cette valeur.',
      ),
    ]),
    lesson('update', 'Modifier et supprimer', [
      tip(
        'UPDATE et DELETE, avec WHERE',
        'UPDATE change des valeurs, DELETE supprime des lignes. Sans WHERE, ils touchent TOUTES les lignes de la table. Écris toujours le WHERE en premier, et teste-le avec un SELECT.',
        'UPDATE produits SET prix = 4800 WHERE id = 1;\nDELETE FROM produits WHERE id = 3;\n\n-- Danger : modifie tous les produits !\nUPDATE produits SET prix = 0;',
      ),
      vf(
        'UPDATE produits SET prix = 0; sans WHERE modifie toutes les lignes.',
        true,
        'Une erreur classique et coûteuse.',
      ),
      fill(
        'Change le prix du produit 2 seulement.',
        'UPDATE produits SET prix = 1600 ___ id = 2;',
        ['WHERE', 'IF', 'FOR'],
        'WHERE',
        'Le WHERE limite la modification.',
      ),
      qcm(
        'Quelle requête supprime le produit 5 ?',
        ['DELETE FROM produits WHERE id = 5;', 'DELETE produits 5;', 'REMOVE id = 5;'],
        0,
        'DELETE FROM … WHERE …',
      ),
      order(
        'Augmente de 100 le prix des produits à moins de 1000.',
        ['UPDATE produits', 'SET prix = prix + 100', 'WHERE prix < 1000;'],
        'UPDATE, SET, WHERE.',
      ),
      qcm(
        'Comment vérifier ce que va toucher un DELETE ?',
        ['Lancer d’abord un SELECT avec le même WHERE', 'Lancer le DELETE deux fois', 'Impossible'],
        0,
        'Le SELECT montre exactement les lignes visées.',
      ),
    ]),
  ]),

  unit(
    'relations',
    'Relier les tables',
    'Utiliser les clés étrangères et les jointures en sécurité.',
    [
      lesson('fk', 'Clés étrangères', [
        tip(
          'Relier deux tables',
          'Plutôt que de répéter les informations, on relie les tables. Une commande appartient à un client : la table commandes a une colonne client_id qui référence clients.id. C’est une clé étrangère (FOREIGN KEY).',
          'CREATE TABLE clients (\n  id SERIAL PRIMARY KEY,\n  nom TEXT NOT NULL\n);\nCREATE TABLE commandes (\n  id SERIAL PRIMARY KEY,\n  client_id INTEGER REFERENCES clients(id),\n  total INTEGER NOT NULL\n);',
        ),
        qcm(
          'Dans commandes, que contient client_id ?',
          ['L’id du client qui a passé la commande', 'Le nom du client', 'Le nombre de commandes'],
          0,
          'Il pointe vers une ligne de la table clients.',
        ),
        vf(
          'Une clé étrangère empêche de référencer un client qui n’existe pas.',
          true,
          'La base garantit la cohérence des données.',
        ),
        fill(
          'Relie la commande au client.',
          'client_id INTEGER ___ clients(id)',
          ['REFERENCES', 'LINKS', 'JOIN'],
          'REFERENCES',
          'REFERENCES crée la contrainte de clé étrangère.',
        ),
        qcm(
          'Un client peut avoir plusieurs commandes. Quelle relation ?',
          ['Un à plusieurs', 'Un à un', 'Aucune'],
          0,
          'Un client, plusieurs commandes.',
        ),
        vf(
          'Recopier le nom du client dans chaque commande est une bonne pratique.',
          false,
          'S’il change de nom, il faudrait tout modifier : on stocke seulement son id.',
        ),
      ]),
      lesson('join', 'Les jointures', [
        tip(
          'JOIN',
          'Une jointure combine les lignes de deux tables selon une condition. INNER JOIN garde seulement les lignes qui ont une correspondance. LEFT JOIN garde toutes les lignes de la table de gauche, même sans correspondance (avec NULL).',
          'SELECT clients.nom, commandes.total\nFROM commandes\nJOIN clients ON clients.id = commandes.client_id;\n\n-- Clients sans aucune commande :\nSELECT c.nom FROM clients c\nLEFT JOIN commandes o ON o.client_id = c.id\nWHERE o.id IS NULL;',
        ),
        fill(
          'Indique la condition de jointure.',
          'SELECT * FROM commandes\nJOIN clients ___ clients.id = commandes.client_id;',
          ['ON', 'WHERE', 'BY'],
          'ON',
          'ON donne la condition qui relie les deux tables.',
        ),
        qcm(
          'Quelle jointure garde aussi les clients qui n’ont jamais commandé ?',
          ['LEFT JOIN depuis clients', 'INNER JOIN', 'Aucune'],
          0,
          'LEFT JOIN conserve toutes les lignes de la table de gauche.',
        ),
        order(
          'Affiche le nom du client de chaque commande.',
          [
            'SELECT clients.nom, commandes.total',
            'FROM commandes',
            'JOIN clients ON clients.id = commandes.client_id;',
          ],
          'SELECT, FROM, puis JOIN … ON.',
        ),
        vf(
          'On peut donner un alias court à une table : FROM clients c.',
          true,
          'On écrit ensuite c.nom au lieu de clients.nom.',
        ),
        qcm(
          'Comment calculer le total dépensé par chaque client ?',
          ['JOIN puis GROUP BY client avec SUM(total)', 'SELECT SUM(*)', 'ORDER BY total'],
          0,
          'On relie, on regroupe, on additionne.',
        ),
      ]),
      lesson('securite', 'Requêtes sûres', [
        tip(
          'L’injection SQL',
          'Ne colle jamais une saisie utilisateur directement dans une requête : quelqu’un peut taper du SQL qui lit ou supprime tes données. Utilise des requêtes paramétrées : la base traite la saisie comme une valeur, jamais comme du code.',
          '// Dangereux :\ndb.query("SELECT * FROM users WHERE email = \'" + email + "\'")\n\n// Sûr (paramètre $1) :\ndb.query(\'SELECT * FROM users WHERE email = $1\', [email])',
        ),
        vf(
          'Concaténer une saisie utilisateur dans une requête SQL expose à l’injection SQL.',
          true,
          "Une saisie comme ' OR '1'='1 change le sens de la requête.",
        ),
        qcm(
          'Quelle est la bonne protection ?',
          ['Les requêtes paramétrées', 'Cacher les erreurs', 'Mettre les mots-clés en minuscules'],
          0,
          'Les paramètres séparent le code SQL des données.',
        ),
        fill(
          'Utilise un paramètre au lieu de concaténer.',
          "db.query('SELECT * FROM devs WHERE pays = ___', [pays])",
          ['$1', "' + pays + '", 'pays'],
          '$1',
          'Le pilote remplace $1 par la valeur, de façon sûre.',
        ),
        vf(
          'Les ORM comme Prisma utilisent des requêtes paramétrées par défaut.',
          true,
          'Attention tout de même aux requêtes brutes écrites à la main.',
        ),
        qcm(
          'Quel compte utiliser pour l’application en production ?',
          [
            'Un compte avec seulement les droits nécessaires',
            'Le super-utilisateur postgres',
            'Un compte sans mot de passe',
          ],
          0,
          'Le principe du moindre privilège limite les dégâts en cas de faille.',
        ),
      ]),
    ],
  ),
];
