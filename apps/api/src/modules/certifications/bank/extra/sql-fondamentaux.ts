import { q } from '../devhub-1';
import type { QuizQuestion } from '../types';

/** Questions supplémentaires de sql-fondamentaux (12/11/2026). */
export const EXTRA: QuizQuestion[] = [
  // 0 — SELECT, WHERE, ORDER BY
  q(
    0,
    'La table eleves contient les notes 15, NULL, 9 et 12. Combien de lignes renvoie cette requête ?',
    ['4', '3', '2', '0'],
    1,
    'Pour la note NULL, les deux comparaisons valent UNKNOWN et UNKNOWN OR UNKNOWN reste UNKNOWN : WHERE écarte la ligne. Il reste 3 lignes.',
    'SELECT nom FROM eleves WHERE note >= 10 OR note < 10;',
  ),
  q(
    0,
    'Que garantit x BETWEEN 800 AND 4500 ?',
    [
      '800 < x < 4500, bornes exclues',
      '800 <= x <= 4500, bornes incluses',
      '800 <= x < 4500',
      'x vaut 800 ou 4500',
    ],
    1,
    'BETWEEN inclut les deux bornes. Sur des horodatages, préfère un intervalle semi-ouvert (>= début AND < fin).',
  ),
  q(
    0,
    'En PostgreSQL, où se placent les NULL avec ORDER BY stock ASC ?',
    ['En premier', 'En dernier', 'Ils sont exclus du résultat', 'Au hasard'],
    1,
    'PostgreSQL considère NULL plus grand que toute valeur : en fin de tri croissant, en tête de tri décroissant. MySQL et SQLite font l’inverse. NULLS FIRST / NULLS LAST permet de le préciser.',
  ),
  q(
    0,
    'Quelle requête affiche la page 4 d’une liste de 25 produits par page ?',
    [
      'SELECT nom FROM produits ORDER BY id LIMIT 25 OFFSET 100;',
      'SELECT nom FROM produits ORDER BY id LIMIT 25 OFFSET 4;',
      'SELECT nom FROM produits ORDER BY id LIMIT 25 OFFSET 75;',
      'SELECT nom FROM produits LIMIT 100 OFFSET 25;',
    ],
    2,
    'OFFSET = (page − 1) × taille = 3 × 25 = 75. Sans ORDER BY, les pages ne seraient pas stables.',
  ),
  q(
    0,
    'Combien de lignes renvoie cette requête si la table compte 3 produits d’épicerie, 1 d’hygiène et 1 de textile, et que seul le produit d’épicerie à 800 F coûte moins de 1000 F ?',
    ['1', '2', '4', '5'],
    1,
    'AND passe avant OR : textile OR (epicerie AND prix < 1000). On obtient le textile et l’épicerie à 800 F. Mets des parenthèses dès que tu mélanges AND et OR.',
    "SELECT nom FROM produits\nWHERE categorie = 'textile' OR categorie = 'epicerie' AND prix < 1000;",
  ),

  // 1 — Agrégats et GROUP BY
  q(
    1,
    'La colonne montant contient 2000, 3000, 5000, NULL et 1000. Que vaut AVG(montant) ?',
    ['2200', '2750', 'NULL', '11000'],
    1,
    'AVG ignore les NULL : 11000 / 4 = 2750. SUM(montant) / COUNT(*) donnerait 2200, car COUNT(*) compte aussi la ligne NULL.',
  ),
  q(
    1,
    'Que renvoie SELECT SUM(total) FROM commandes WHERE 1 = 0; ?',
    ['0', 'NULL', 'Une erreur', 'Aucune ligne'],
    1,
    'Un agrégat sans GROUP BY renvoie toujours une ligne ; sur un ensemble vide, SUM vaut NULL (COUNT vaudrait 0). COALESCE(SUM(total), 0) affiche 0.',
  ),
  q(
    1,
    'Pourquoi PostgreSQL refuse-t-il cette requête ?',
    [
      'ville n’est ni dans le GROUP BY ni dans un agrégat',
      'SUM ne s’applique pas aux entiers',
      'GROUP BY doit précéder FROM',
      'Il manque un HAVING',
    ],
    0,
    'Chaque groupe vendeur peut avoir plusieurs villes : laquelle afficher ? Ajoute ville au GROUP BY ou agrège-la. SQLite accepterait et prendrait une valeur arbitraire.',
    'SELECT vendeur, ville, SUM(montant)\nFROM ventes\nGROUP BY vendeur;',
  ),
  q(
    1,
    'Dans quel ordre la base évalue-t-elle logiquement ces clauses ?',
    [
      'SELECT, FROM, WHERE, GROUP BY, HAVING, ORDER BY',
      'FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY',
      'FROM, GROUP BY, WHERE, SELECT, HAVING, ORDER BY',
      'WHERE, FROM, SELECT, GROUP BY, ORDER BY, HAVING',
    ],
    1,
    'C’est pourquoi un alias du SELECT est utilisable dans ORDER BY mais pas dans WHERE : il n’existe pas encore quand WHERE est évalué.',
  ),
  q(
    1,
    'Quelle expression compte seulement les ventes de Lomé, de façon portable (PostgreSQL, MySQL, SQLite) ?',
    [
      "COUNT(*) FILTER (WHERE ville = 'Lomé')",
      "COUNT(ville = 'Lomé')",
      "COUNT(*) WHERE ville = 'Lomé'",
      "SUM(CASE WHEN ville = 'Lomé' THEN 1 ELSE 0 END)",
    ],
    3,
    "CASE fonctionne partout. FILTER n’existe pas en MySQL, et COUNT(ville = 'Lomé') compte toutes les lignes non NULL, car FALSE n’est pas NULL.",
  ),

  // 2 — Créer et modifier les données
  q(
    2,
    'Que se passe-t-il si la table clients contient déjà des lignes ?',
    [
      'La colonne est ajoutée et remplie de chaînes vides',
      'Erreur : les lignes existantes violeraient NOT NULL',
      'Les lignes existantes sont supprimées',
      'La contrainte NOT NULL est ignorée',
    ],
    1,
    'Sans DEFAULT, les lignes existantes recevraient NULL. Ajoute un DEFAULT, ou ajoute la colonne nullable, remplis-la, puis pose NOT NULL.',
    'ALTER TABLE clients ADD COLUMN ville TEXT NOT NULL;',
  ),
  q(
    2,
    'Deux retraits simultanés exécutent chacun ce code. Quel est le risque ?',
    [
      'Aucun, chaque requête est atomique',
      'Une mise à jour perdue : les deux lisent le même solde et l’un écrase l’autre',
      'Une injection SQL',
      'Un produit cartésien',
    ],
    1,
    'Calcule dans la base (SET solde = solde - 5000 WHERE id = 1 AND solde >= 5000) ou verrouille la ligne avec SELECT … FOR UPDATE dans une transaction.',
    'solde = SELECT solde FROM comptes WHERE id = 1   -- côté application\nUPDATE comptes SET solde = <solde - 5000> WHERE id = 1',
  ),
  q(
    2,
    'En PostgreSQL, que fait INSERT … ON CONFLICT (sku) DO UPDATE SET prix = EXCLUDED.prix ?',
    [
      'Supprime la ligne en conflit',
      'Insère la ligne, ou met à jour le prix si le sku existe déjà',
      'Désactive la contrainte UNIQUE sur sku',
      'Insère toujours une nouvelle ligne',
    ],
    1,
    'C’est un « upsert ». EXCLUDED désigne la ligne qu’on tentait d’insérer. MySQL écrit ON DUPLICATE KEY UPDATE.',
  ),
  q(
    2,
    'Quelle lettre d’ACID garantit qu’une transaction validée survit à une coupure de courant ?',
    ['Atomicité', 'Cohérence', 'Isolation', 'Durabilité'],
    3,
    'La durabilité : un COMMIT confirmé est écrit dans le journal (WAL) sur disque avant d’être acquitté.',
  ),
  q(
    2,
    'Quelle différence entre TRUNCATE produits et DELETE FROM produits ?',
    [
      'TRUNCATE supprime aussi la structure de la table',
      'TRUNCATE vide toute la table d’un coup, sans WHERE possible ; DELETE supprime ligne par ligne et accepte un WHERE',
      'DELETE est toujours plus rapide',
      'Aucune différence',
    ],
    1,
    'DROP TABLE supprime la structure. TRUNCATE est beaucoup plus rapide sur une grosse table ; en PostgreSQL il reste annulable dans une transaction.',
  ),

  // 3 — Clés et jointures
  q(
    3,
    'clients : Awa (2 commandes), Kofi (1), Nadia (0). Que renvoie cette requête pour Nadia ?',
    ['0', '1', 'NULL', 'Nadia n’apparaît pas'],
    1,
    'LEFT JOIN produit une ligne pour Nadia, colonnes de commandes à NULL. COUNT(*) compte cette ligne ; COUNT(o.id) aurait donné 0.',
    'SELECT c.nom, COUNT(*)\nFROM clients c\nLEFT JOIN commandes o ON o.client_id = c.id\nGROUP BY c.nom;',
  ),
  q(
    3,
    'La sous-requête renvoie 1, 1, 2 et NULL (une commande sans client). Que renvoie cette requête ?',
    ['Les clients sans commande', 'Tous les clients', 'Aucune ligne', 'Une erreur'],
    2,
    'id NOT IN (1, 2, NULL) contient id <> NULL, toujours UNKNOWN : aucune ligne n’est gardée. NOT EXISTS évite ce piège.',
    'SELECT nom FROM clients\nWHERE id NOT IN (SELECT client_id FROM commandes);',
  ),
  q(
    3,
    'Cette requête doit garder tous les clients, avec leurs commandes de plus de 3000 F. Quel est le problème ?',
    [
      'Aucun problème',
      'Le filtre dans WHERE écarte les clients sans commande : c’est devenu un INNER JOIN',
      'LEFT JOIN ne peut pas comparer des montants',
      'Il manque un GROUP BY',
    ],
    1,
    'Pour un client sans commande, o.total vaut NULL et la condition vaut UNKNOWN. Déplace-la dans le ON : LEFT JOIN commandes o ON o.client_id = c.id AND o.total > 3000.',
    'SELECT c.nom, o.total\nFROM clients c\nLEFT JOIN commandes o ON o.client_id = c.id\nWHERE o.total > 3000;',
  ),
  q(
    3,
    'Comment modéliser « un élève suit plusieurs cours, un cours accueille plusieurs élèves » ?',
    [
      'Une colonne cours_ids contenant « 1,4,7 » dans eleves',
      'Une clé étrangère eleve_id dans cours',
      'Une table de liaison inscriptions(eleve_id, cours_id) avec une clé primaire composite',
      'Une seule table eleves_cours avec toutes les colonnes',
    ],
    2,
    'Une relation plusieurs-à-plusieurs passe par une table de liaison. La clé primaire (eleve_id, cours_id) interdit les inscriptions en double.',
  ),
  q(
    3,
    'Que fait ON DELETE CASCADE sur commandes.client_id REFERENCES clients(id) ?',
    [
      'Supprimer un client supprime aussi ses commandes',
      'Supprimer une commande supprime son client',
      'La suppression d’un client est refusée',
      'client_id passe à NULL',
    ],
    0,
    'SET NULL mettrait client_id à NULL, RESTRICT (ou NO ACTION, par défaut) refuserait la suppression. Pour un historique de paiements, CASCADE est rarement souhaitable.',
  ),

  // 4 — Sécurité et performance
  q(
    4,
    'L’utilisateur choisit la colonne de tri d’une liste. Comment l’intégrer sans risque d’injection ?',
    [
      'ORDER BY $1, en paramètre',
      'Vérifier la saisie contre une liste blanche de colonnes autorisées',
      'Retirer les apostrophes de la saisie',
      'Mettre la saisie en majuscules',
    ],
    1,
    'Un paramètre ne remplace qu’une valeur, jamais un identifiant : ORDER BY $1 trierait par une constante. Pour un nom de colonne, seule une liste blanche est sûre.',
  ),
  q(
    4,
    'Un index existe sur (ville, cree_le). Quelle condition ne peut pas l’exploiter efficacement ?',
    [
      "WHERE ville = 'Lomé'",
      "WHERE ville = 'Lomé' AND cree_le >= '2026-11-01'",
      "WHERE ville = 'Lomé' ORDER BY cree_le",
      "WHERE cree_le >= '2026-11-01'",
    ],
    3,
    'L’index est trié d’abord par ville. Sans condition sur sa première colonne, il ne mène pas directement aux bonnes dates.',
  ),
  q(
    4,
    'Pourquoi un index sur email ne sert-il pas à WHERE LOWER(email) = $1 ?',
    [
      'Les index ne marchent pas avec des paramètres',
      'L’index est trié sur email, pas sur LOWER(email) : il faut un index d’expression',
      'LOWER est interdit dans un WHERE',
      'Il sert, sans aucune différence',
    ],
    1,
    'CREATE INDEX ON users (LOWER(email)) crée un index sur l’expression exacte utilisée dans la requête.',
  ),
  q(
    4,
    'Que faut-il savoir avant de lancer EXPLAIN ANALYZE DELETE FROM logs WHERE … ?',
    [
      'Rien : EXPLAIN n’exécute jamais la requête',
      'ANALYZE exécute réellement la requête : les lignes seront supprimées, sauf dans une transaction annulée',
      'Il faut d’abord supprimer les index',
      'EXPLAIN ANALYZE ne fonctionne que sur SELECT',
    ],
    1,
    'EXPLAIN seul affiche le plan prévu ; EXPLAIN ANALYZE exécute et mesure. Entoure-le de BEGIN … ROLLBACK pour une écriture.',
  ),
  q(
    4,
    'Une page charge 50 commandes, puis lance une requête par commande pour récupérer son client. Quelle est la bonne correction ?',
    [
      'Ajouter un index sur clients.nom',
      'Récupérer commandes et clients en une seule requête avec une jointure',
      'Augmenter la mémoire du serveur',
      'Mettre un LIMIT 1 sur chaque requête',
    ],
    1,
    'C’est le problème N+1 : 1 requête + N requêtes. Une jointure (ou un chargement groupé avec IN) ramène tout en une ou deux requêtes.',
  ),
];
