import { q } from '../devhub-1';
import type { QuizQuestion } from '../types';

/** Questions supplémentaires de ia-usage-responsable (12/11/2026). */
export const EXTRA: QuizQuestion[] = [
  // 0 — Fonctionnement et limites
  q(
    0,
    'Pourquoi un modèle peut-il ignorer tout d’une bibliothèque sortie le mois dernier ?',
    [
      'Ses connaissances s’arrêtent à la fin de son entraînement, sauf s’il dispose d’un outil de recherche',
      'Il refuse les bibliothèques récentes par sécurité',
      'Il ne connaît que les bibliothèques payantes',
      'Il oublie tout après chaque question',
    ],
    0,
    'Un modèle ne se met pas à jour tout seul : pour une version récente, fournis la documentation ou vérifie à la source.',
  ),
  q(
    0,
    'Que mesure-t-on en jetons (tokens) avec un modèle de langage ?',
    [
      'Le nombre d’utilisateurs connectés',
      'La longueur du texte lu et produit par le modèle',
      'La vitesse du réseau',
      'La justesse de la réponse',
    ],
    1,
    'La fenêtre de contexte, la longueur maximale de réponse et la facturation des API se comptent en jetons.',
  ),
  q(
    0,
    'Tu poses deux fois la même question et obtiens deux réponses différentes. Pourquoi ?',
    [
      'Le modèle a été réentraîné entre les deux questions',
      'Tu as forcément fait une faute de frappe',
      'Chaque jeton est choisi parmi plusieurs suites probables, avec une part de hasard',
      'Le serveur est en panne',
    ],
    2,
    'La génération comporte un tirage parmi les jetons probables. Deux réponses contradictoires sont un signal pour vérifier à la source.',
  ),
  q(
    0,
    'Dans une très longue conversation, le modèle ne respecte plus les consignes données au début. Explication la plus probable ?',
    [
      'Le modèle est fatigué',
      'Les consignes expirent au bout d’une heure',
      'Le modèle refuse les longues conversations',
      'Le début est sorti de la fenêtre de contexte ou y est noyé, donc moins bien pris en compte',
    ],
    3,
    'Rappelle les consignes importantes ou repars d’une conversation propre avec un résumé.',
  ),
  q(
    0,
    'Qu’apporte une température basse dans une API de modèle de langage ?',
    [
      'Elle supprime les hallucinations',
      'Des réponses plus stables, sans garantie qu’elles soient justes',
      'Des réponses plus variées et plus créatives',
      'Un prix plus bas par jeton',
    ],
    1,
    'Une température basse privilégie les jetons les plus probables : le modèle peut alors se tromper de façon très stable.',
  ),

  // 1 — Écrire de bonnes demandes
  q(
    1,
    'Pourquoi entourer le code ou le document collé de délimiteurs (``` ou <doc>…</doc>) ?',
    [
      'Pour séparer clairement les consignes du contenu à traiter',
      'Pour colorer le code dans la réponse',
      'Pour réduire le prix de la demande',
      'Parce que le modèle ne lit rien sans eux',
    ],
    0,
    'Le modèle distingue mieux ce qu’il doit faire de ce sur quoi il doit le faire, surtout quand le contenu contient lui-même des phrases à l’impératif.',
  ),
  q(
    1,
    'Pour une tâche encore floue, quelle consigne aide le plus ?',
    [
      '« Fais au mieux »',
      '« Écris tout le code d’un coup »',
      '« Avant de coder, pose-moi les questions nécessaires, puis propose un plan »',
      '« Réponds en une seule ligne »',
    ],
    2,
    'Les questions font apparaître les décisions que tu n’as pas encore prises, et le plan se corrige avant qu’une ligne de code soit écrite.',
  ),
  q(
    1,
    'L’IA propose la même correction ratée depuis plusieurs messages. Quelle est la meilleure réaction ?',
    [
      'Répéter « corrige » jusqu’à ce que ça marche',
      'Apporter une information nouvelle (logs, valeurs réelles, test qui échoue) ou repartir d’une conversation propre',
      'Écrire la demande en majuscules',
      'Changer de langage de programmation',
    ],
    1,
    'Sans élément nouveau, le modèle tourne en rond. Un fait nouveau ou un contexte propre relance le diagnostic.',
  ),
  q(
    1,
    'Qu’est-ce qu’une demande « avec exemples » (few-shot) ?',
    [
      'Une demande limitée à quelques mots',
      'Une demande envoyée à plusieurs modèles à la fois',
      'Une demande sans aucun contexte',
      'Une demande qui montre un ou deux exemples du résultat attendu',
    ],
    3,
    'Le modèle imite la forme, le ton et les conventions des exemples, y compris leurs défauts : choisis-les bien.',
  ),
  q(
    1,
    'Que manque-t-il surtout à la demande « Mon API plante, voici mon fichier routes.js » ?',
    [
      'Le nom de ton éditeur de code',
      'Le message d’erreur complet et le comportement attendu',
      'Ton adresse IP',
      'La date de création du dépôt',
    ],
    1,
    'Sans l’erreur exacte ni l’attendu, le modèle doit deviner le problème : il proposera des pistes au hasard.',
  ),

  // 2 — Vérifier le code généré
  q(
    2,
    'Le besoin : remise(10000, 20) doit renvoyer 8000. Que renvoie ce code généré ?',
    ['8000', '-190000', '9980', '10000'],
    1,
    'Le pourcentage n’est pas divisé par 100 : 10000 - 10000 × 20 = -190000. Il fallait prix - prix * pourcentage / 100. Un seul test avec une valeur calculée à la main l’aurait révélé.',
    'def remise(prix, pourcentage):\n    return prix - prix * pourcentage',
  ),
  q(
    2,
    'Un test généré calcule la valeur attendue avec la même formule que le code testé. Qu’en penser ?',
    [
      'Il est idéal, car il ne peut pas se tromper',
      'Il remplace la relecture du code',
      'Il est surtout trop lent',
      'Il reproduit l’erreur éventuelle du code : la valeur attendue doit être fixée indépendamment',
    ],
    3,
    'Si la formule est fausse, le code et le test se trompent ensemble et le test reste vert. On écrit la valeur attendue calculée à la main.',
  ),
  q(
    2,
    'Que fait l’intégration continue (CI) pour du code généré ?',
    [
      'Elle relance tests, typage et linter à chaque push et signale ce qui casse',
      'Elle écrit le code à ta place',
      'Elle garantit l’absence de bug',
      'Elle remplace la revue par un pair',
    ],
    0,
    'C’est un filet automatique : il attrape ce que les vérifications savent détecter, pas les erreurs de logique qu’aucun test ne couvre.',
  ),
  q(
    2,
    'Cette fonction générée doit refuser tout montant qui n’est pas un nombre strictement positif. Quelle entrée invalide accepte-t-elle ?',
    ['-5', '0', '"500" (une chaîne de caractères)', 'null'],
    2,
    'En JavaScript, "500" > 0 convertit la chaîne en nombre et renvoie true. Il faut aussi vérifier le type, par exemple typeof m === "number" && Number.isFinite(m).',
    'function montantValide(m) {\n  return m > 0;\n}',
  ),
  q(
    2,
    'L’IA t’explique une ligne de code que tu ne comprenais pas. Que fais-tu de cette explication ?',
    [
      'Je la crois : c’est l’IA qui a écrit la ligne',
      'Je la confronte à la documentation officielle et à un essai',
      'Je l’ignore et je garde la ligne',
      'Je la colle en commentaire sans la relire',
    ],
    1,
    'L’explication peut être aussi inventée que le code. La documentation et l’exécution font foi.',
  ),

  // 3 — Données, sécurité et licences
  q(
    3,
    'Qu’est-ce qu’une injection de consignes (prompt injection) ?',
    [
      'Une faille SQL dans les serveurs du fournisseur d’IA',
      'Une consigne trop longue pour la fenêtre de contexte',
      'Des instructions cachées dans un contenu traité par le modèle pour détourner son comportement',
      'Un virus installé dans les poids du modèle',
    ],
    2,
    'Page web, ticket, e-mail ou PDF peuvent contenir des ordres destinés au modèle. Avec un agent qui a des outils, les conséquences peuvent être réelles.',
  ),
  q(
    3,
    'Dans une appli React compilée avec Vite, où une clé d’API secrète doit-elle être utilisée ?',
    [
      'Dans une variable VITE_ lue par le front',
      'En dur dans le code du composant',
      'Dans le localStorage du navigateur',
      'Côté serveur, le front appelant ta propre API',
    ],
    3,
    'Les variables VITE_ et tout le code du front sont envoyés au navigateur : n’importe qui peut les lire. La clé reste sur le serveur.',
  ),
  q(
    3,
    'Un dépôt GitHub public n’a pas de fichier LICENSE. Peux-tu copier son code dans un produit commercial ?',
    [
      'Oui : public veut dire libre',
      'Non : sans licence, le code n’est pas réutilisable par défaut, il faut l’accord de l’auteur',
      'Oui, si tu renommes les variables',
      'Oui, si c’est l’IA qui te l’a proposé',
    ],
    1,
    'L’auteur garde tous ses droits tant qu’il n’accorde pas de licence. Renommer ou passer par une IA ne change rien.',
  ),
  q(
    3,
    'Que garantit la pseudonymisation d’un fichier clients (noms remplacés par Client1, Client2…) ?',
    [
      'Une réduction du risque seulement : en croisant les autres champs, on peut parfois reconnaître la personne',
      'Que les données ne sont plus personnelles',
      'Que tu peux envoyer le fichier à n’importe quel service',
      'Que les données sont chiffrées',
    ],
    0,
    'Quartier, date de naissance ou montants peuvent suffire à ré-identifier quelqu’un. Pour travailler avec une IA, préfère des données fictives.',
  ),
  q(
    3,
    'L’IA reproduit un long extrait portant la mention « Licensed under the GPL ». Ton logiciel est propriétaire et distribué à des clients. Que fais-tu ?',
    [
      'Je garde le code et je retire la mention',
      'Je change l’indentation pour le rendre original',
      'Je n’intègre pas cet extrait : le distribuer m’obligerait à publier mes sources sous GPL',
      'Je garde tout : le code généré n’a jamais de licence',
    ],
    2,
    'Un extrait reproduit reste soumis à sa licence d’origine. Retirer la mention ou maquiller le code ne fait qu’aggraver la situation.',
  ),

  // 4 — Travailler avec un agent
  q(
    4,
    'Qu’est-ce que le Model Context Protocol (MCP) ?',
    [
      'Un standard ouvert pour brancher un assistant ou un agent sur des outils et des sources de données',
      'Un modèle de langage publié par Anthropic',
      'Un format de compression des jetons',
      'Un protocole réseau qui remplace HTTP',
    ],
    0,
    'Un serveur MCP expose des outils, des ressources et des modèles de demandes ; il s’exécute avec tes droits, donc on le choisit avec soin.',
  ),
  q(
    4,
    'Quel jeton donner à un serveur MCP qui doit seulement lire les tickets d’un dépôt ?',
    [
      'Un jeton administrateur de toute l’organisation',
      'Un jeton limité à ce dépôt, en lecture seule',
      'Ton mot de passe GitHub',
      'Le jeton utilisé par le serveur de production',
    ],
    1,
    'Moindre privilège : si le jeton fuit ou si l’agent est trompé, les dégâts restent limités à la lecture de ce dépôt.',
  ),
  q(
    4,
    'L’agent annonce que tous les tests passent. Le diff montre un it.skip ajouté sur le test qui échouait. Conclusion ?',
    [
      'Le bug est corrigé',
      'Le test a été renforcé',
      'Les tests sont simplement plus rapides',
      'Le problème a été masqué, pas corrigé : il faut réactiver le test et corriger le code',
    ],
    3,
    'Le résumé de l’agent n’est pas une preuve : seul le diff montre ce qui a réellement changé.',
  ),
  q(
    4,
    'Où le mode « accepter toutes les actions automatiquement » d’un agent est-il raisonnable ?',
    [
      'Sur la machine qui détient tes clés de production',
      'Sur le serveur de production',
      'Dans un environnement isolé et jetable, sans secrets',
      'Partout, si l’agent est récent',
    ],
    2,
    'Conteneur, machine virtuelle ou copie du dépôt sans secrets : si quelque chose tourne mal, on jette l’environnement.',
  ),
  q(
    4,
    'Pourquoi écrire un test qui échoue avant de demander une correction à un agent ?',
    [
      'Il donne un critère de réussite objectif que l’agent peut vérifier lui-même',
      'Pour ralentir volontairement l’agent',
      'Parce que l’agent ne sait pas lire le code',
      'Pour ne plus avoir à relire le diff',
    ],
    0,
    'Précise aussi « ne modifie aucun test » : sinon, la voie la plus facile est parfois d’adapter le test au code fautif.',
  ),
];
