import { lesson, match, order, qcm, tip, unit, vf } from './dsl';
import type { CourseUnit } from './types';

export const units: CourseUnit[] = [
  unit(
    'comprendre',
    'Comprendre l’IA générative',
    'Savoir ce que l’IA fait bien, et où elle se trompe.',
    [
      lesson('llm', 'C’est quoi un LLM ?', [
        tip(
          'Un modèle qui prédit la suite',
          'Claude, ChatGPT ou Gemini sont des grands modèles de langage (LLM). Entraînés sur d’énormes quantités de textes, ils prédisent la suite la plus probable d’un texte. Ils écrivent, résument, traduisent et codent très bien, mais ils ne « savent » pas si ce qu’ils disent est vrai.',
        ),
        qcm(
          'Que fait fondamentalement un LLM ?',
          [
            'Il prédit la suite la plus probable d’un texte',
            'Il cherche la réponse dans une base de faits vérifiés',
            'Il copie une page web',
          ],
          0,
          'C’est pour cela qu’il peut être convaincant et faux à la fois.',
        ),
        vf(
          'Un LLM peut affirmer une chose fausse avec beaucoup d’assurance.',
          true,
          'On appelle cela une hallucination.',
        ),
        match('Associe chaque outil à son éditeur.', [
          ['Claude', 'Anthropic'],
          ['ChatGPT', 'OpenAI'],
          ['Gemini', 'Google'],
          ['Llama', 'Meta'],
        ]),
        qcm(
          'Pour quelle tâche un LLM est-il le plus fiable ?',
          [
            'Reformuler un texte que tu lui donnes',
            'Donner le cours exact d’une action aujourd’hui',
            'Citer un article de loi de mémoire',
          ],
          0,
          'Quand l’information est dans ta demande, il risque beaucoup moins d’inventer.',
        ),
        vf(
          'Un modèle connaît forcément les nouveautés sorties la semaine dernière.',
          false,
          'Ses connaissances s’arrêtent à une date ; certains outils peuvent chercher sur le web, mais pas tous.',
        ),
      ]),
      lesson('limites', 'Les limites à connaître', [
        tip(
          'Hallucinations et contexte',
          'Un modèle peut inventer une fonction qui n’existe pas, une source ou un chiffre. Il ne voit que ce que tu lui donnes dans la conversation (le contexte), qui a une taille limitée. Plus ta demande est précise et documentée, moins il invente.',
        ),
        qcm(
          'L’IA te propose une fonction de bibliothèque que tu ne connais pas. Que fais-tu ?',
          [
            'Je vérifie dans la documentation officielle',
            'Je l’utilise, elle a l’air sûre d’elle',
            'Je redemande jusqu’à ce qu’elle dise oui',
          ],
          0,
          'Les fonctions inventées sont une erreur fréquente.',
        ),
        vf(
          'Le modèle se souvient de tout ce que tu lui as dit dans d’autres conversations.',
          false,
          'Sauf mémoire activée explicitement, chaque conversation repart de zéro.',
        ),
        qcm(
          'Qu’est-ce que la « fenêtre de contexte » ?',
          [
            'La quantité de texte que le modèle peut prendre en compte d’un coup',
            'La taille de l’écran',
            'Le nombre de conversations par jour',
          ],
          0,
          'Au-delà, les informations les plus anciennes ne sont plus prises en compte.',
        ),
        vf(
          'Donner un extrait de la documentation dans ta demande réduit les inventions.',
          true,
          'Le modèle s’appuie sur ce que tu lui fournis.',
        ),
        qcm(
          'Pour un chiffre important (prix, loi, date), la bonne attitude est…',
          [
            'Vérifier auprès d’une source officielle',
            'Faire confiance à la première réponse',
            'Demander à une autre IA et prendre la moyenne',
          ],
          0,
          'L’IA aide à chercher, la source officielle fait foi.',
        ),
      ]),
      lesson('donnees', 'Tes données et la confidentialité', [
        tip(
          'Ce qu’on ne colle jamais',
          'Ce que tu envoies à un service d’IA quitte ton ordinateur. Ne colle jamais de mots de passe, clés d’API, données de clients ou documents confidentiels de ton employeur. Remplace-les par des exemples fictifs.',
          '# À ne pas envoyer :\nDATABASE_URL=postgres://admin:MotDePasse@prod…\n\n# À la place :\nDATABASE_URL=postgres://user:***@localhost/db',
        ),
        vf(
          'On peut coller une clé d’API dans un chat d’IA si on la supprime juste après.',
          false,
          'Une fois envoyée, elle peut être journalisée : considère-la comme exposée et révoque-la.',
        ),
        qcm(
          'Tu veux de l’aide sur un bug avec des données clients. Que fais-tu ?',
          [
            'Je remplace les données réelles par des exemples fictifs',
            'J’envoie le fichier complet',
            'J’envoie seulement les numéros de téléphone',
          ],
          0,
          'Le bug se reproduit très bien avec des données inventées.',
        ),
        match('Classe chaque élément : à envoyer ou non ?', [
          ['Un message d’erreur', 'Oui, utile'],
          ['Un mot de passe', 'Jamais'],
          ['Le code d’une fonction', 'Oui, sans secrets'],
          ['Le fichier .env', 'Jamais : il contient les secrets'],
        ]),
        vf(
          'Certaines entreprises interdisent d’envoyer leur code à des IA non approuvées.',
          true,
          'Renseigne-toi sur la politique de ton employeur ou de ton client.',
        ),
        qcm(
          'Ta clé d’API a été collée dans un chat par erreur. Que faire ?',
          ['La révoquer et en générer une nouvelle', 'Effacer la conversation suffit', 'Rien'],
          0,
          'Effacer ne garantit pas que la clé n’a pas été conservée.',
        ),
      ]),
    ],
  ),

  unit('demander', 'Bien demander', 'Écrire des demandes précises qui donnent de bons résultats.', [
    lesson('prompt', 'Une bonne demande', [
      tip(
        'Contexte, tâche, contraintes, format',
        'Une bonne demande donne : le contexte (qui tu es, ton projet), la tâche précise, les contraintes (langage, version, ce qu’il ne faut pas faire) et le format de réponse attendu. Imagine que tu briefes un collègue compétent qui ne connaît pas ton projet.',
        'Contexte : je débute en React, mon app liste des offres d’emploi.\nTâche : ajoute un champ de recherche qui filtre par titre.\nContraintes : React 19, TypeScript, pas de nouvelle bibliothèque.\nFormat : le composant complet, puis 3 lignes d’explication.',
      ),
      qcm(
        'Quelle demande donnera le meilleur résultat ?',
        [
          '« Fais-moi un site »',
          '« Crée une page HTML de portfolio : nom, bio, 3 projets en grille, lisible sur mobile, sans framework »',
          '« Site joli stp »',
        ],
        1,
        'Précise : contenu, contraintes, cible.',
      ),
      order(
        'Range les parties d’une bonne demande.',
        ['Le contexte', 'La tâche', 'Les contraintes', 'Le format de réponse'],
        'Du général au particulier.',
      ),
      vf(
        'Préciser ce que tu ne veux PAS (pas de bibliothèque, pas de changement ailleurs) aide le modèle.',
        true,
        'Les contraintes évitent les surprises.',
      ),
      qcm(
        'Pourquoi indiquer les versions (React 19, Python 3.12) ?',
        [
          'Pour éviter du code basé sur une ancienne syntaxe',
          'C’est décoratif',
          'Pour aller plus vite',
        ],
        0,
        'Les API changent d’une version à l’autre.',
      ),
      match('Associe chaque partie à son exemple.', [
        ['Contexte', '« Mon app gère des commandes de restaurant »'],
        ['Tâche', '« Ajoute l’envoi d’un SMS de confirmation »'],
        ['Contrainte', '« Sans changer la base de données »'],
        ['Format', '« Réponds avec un diff et une liste de tests »'],
      ]),
    ]),
    lesson('exemples', 'Donner des exemples', [
      tip(
        'Montrer plutôt qu’expliquer',
        'Un ou deux exemples de ce que tu attends valent mieux qu’un long paragraphe. Pour du code, colle un fichier existant comme modèle de style. Pour un texte, montre le ton souhaité.',
        'Écris 5 messages de bienvenue pour mon app, sur ce modèle :\n« Salut Awa ! Ton profil est prêt. Première étape : pose ta question. »\nCourts, tutoiement, une action à la fin.',
      ),
      vf(
        'Fournir un exemple de sortie attendue améliore souvent le résultat.',
        true,
        'Le modèle imite la forme et le ton.',
      ),
      qcm(
        'Tu veux un nouveau composant dans le style de ton projet. Que donnes-tu ?',
        [
          'Un composant existant du projet comme modèle',
          'Rien, il devinera',
          'Une capture d’un autre site',
        ],
        0,
        'Il reprendra tes conventions de nommage et de structure.',
      ),
      qcm(
        'Ta demande donne un résultat trop long. La meilleure correction ?',
        ['« Réponds en 5 lignes maximum »', 'Recommencer la même demande', 'Écrire en majuscules'],
        0,
        'Une contrainte de format explicite.',
      ),
      vf(
        'Demander « explique ton raisonnement étape par étape » peut aider sur un problème complexe.',
        true,
        'Le modèle détaille et tu repères plus facilement une erreur.',
      ),
      qcm(
        'Pour un message d’erreur, que faut-il donner ?',
        [
          'Le message complet, le code concerné et ce que tu as déjà essayé',
          'Seulement « ça marche pas »',
          'Une capture floue',
        ],
        0,
        'Comme pour une question à un humain : du contexte précis.',
      ),
    ]),
    lesson('iterer', 'Itérer', [
      tip(
        'Une conversation, pas une commande',
        'Le premier résultat est rarement parfait. Corrige par petites touches : dis ce qui va, ce qui ne va pas, et ce que tu veux à la place. Si la conversation part dans tous les sens, recommence avec une demande plus claire qui intègre ce que tu as appris.',
      ),
      qcm(
        'Le résultat est presque bon, mais le bouton est mal placé. Que dis-tu ?',
        [
          '« Garde tout, mais place le bouton sous le formulaire, aligné à droite »',
          '« C’est nul, recommence »',
          '« Change le design »',
        ],
        0,
        'Une correction précise conserve ce qui marche.',
      ),
      vf(
        'Recommencer une conversation neuve avec une demande améliorée est parfois plus efficace que de corriger longtemps.',
        true,
        'Un contexte encombré d’essais ratés gêne le modèle.',
      ),
      order(
        'Remets une bonne boucle de travail dans l’ordre.',
        [
          'Demander une petite étape',
          'Lire et tester le résultat',
          'Corriger précisément ce qui ne va pas',
          'Passer à l’étape suivante',
        ],
        'Des petits pas vérifiés.',
      ),
      qcm(
        'Pourquoi demander une seule fonctionnalité à la fois ?',
        [
          'C’est plus facile à vérifier et à corriger',
          'Le modèle refuse sinon',
          'Pour économiser des caractères',
        ],
        0,
        'Plus le changement est gros, plus les erreurs passent inaperçues.',
      ),
      vf(
        'Si l’IA tourne en rond sur un bug, il vaut mieux lui donner plus d’informations (logs, versions) que répéter « corrige ».',
        true,
        'Sans nouvelle information, elle propose souvent la même chose.',
      ),
    ]),
  ]),

  unit(
    'verifier',
    'Vérifier ce que l’IA produit',
    'Ne jamais livrer du code que tu n’as pas compris et testé.',
    [
      lesson('tester', 'Tester avant de livrer', [
        tip(
          'Tu restes responsable',
          'Le code généré peut compiler et pourtant être faux. Lance-le, essaie les cas limites (liste vide, champ manquant, réseau coupé), lis-le ligne par ligne. Si tu ne comprends pas une partie, demande à l’IA de l’expliquer avant de l’utiliser.',
        ),
        vf(
          'Si le code généré compile, il est correct.',
          false,
          'Compiler prouve seulement que la syntaxe est valide.',
        ),
        qcm(
          'Quel test révèle le plus souvent un bug ?',
          [
            'Un cas limite : liste vide, valeur nulle, très grand nombre',
            'Le cas idéal déjà montré par l’IA',
            'Relancer deux fois',
          ],
          0,
          'Les bugs se cachent dans les cas que personne n’a prévus.',
        ),
        qcm(
          'Tu ne comprends pas une ligne générée. Que fais-tu ?',
          [
            'Je demande une explication, puis je vérifie dans la doc',
            'Je la garde, ça marche',
            'Je la supprime au hasard',
          ],
          0,
          'Tu dois pouvoir expliquer chaque ligne que tu livres.',
        ),
        vf(
          'Demander à l’IA d’écrire des tests automatiques pour son propre code est une bonne idée.',
          true,
          'Vérifie quand même que les tests testent vraiment quelque chose.',
        ),
        match('Associe chaque cas limite à un exemple.', [
          ['Vide', 'Panier sans article'],
          ['Absent', 'Utilisateur sans photo'],
          ['Énorme', '10 000 commentaires'],
          ['Réseau', 'Connexion coupée pendant l’envoi'],
        ]),
      ]),
      lesson('securite', 'La sécurité du code généré', [
        tip(
          'Les failles classiques',
          'L’IA reproduit parfois de mauvaises pratiques : requêtes SQL construites par concaténation, clés d’API écrites dans le code, données utilisateur non vérifiées, mots de passe stockés en clair. Demande explicitement une version sûre et vérifie ces points.',
        ),
        qcm(
          'Laquelle de ces lignes est dangereuse ?',
          [
            'const cle = "sk-live-abc123"',
            'const cle = process.env.API_KEY',
            'const titre = "Accueil"',
          ],
          0,
          'Une clé dans le code finit tôt ou tard sur GitHub.',
        ),
        vf(
          'Stocker les mots de passe des utilisateurs en clair dans la base est acceptable pour un petit projet.',
          false,
          'Toujours un hachage dédié (bcrypt, scrypt, argon2), même pour un petit projet.',
        ),
        match('Associe chaque risque à sa protection.', [
          ['Injection SQL', 'Requêtes paramétrées'],
          ['Clé d’API exposée', 'Variables d’environnement'],
          ['XSS', 'Échapper le HTML (textContent)'],
          ['Mot de passe volé', 'Hachage et limite de tentatives'],
        ]),
        qcm(
          'Comment demander du code plus sûr ?',
          [
            '« Vérifie les entrées, pas de secret dans le code, requêtes paramétrées »',
            '« Fais-le vite »',
            '« Sans commentaires »',
          ],
          0,
          'Les exigences de sécurité doivent être dites explicitement.',
        ),
        vf(
          'Une dépendance proposée par l’IA peut ne pas exister, ou être un paquet malveillant au nom proche.',
          true,
          'Vérifie le nom exact, le nombre de téléchargements et le dépôt officiel.',
        ),
      ]),
      lesson('sources', 'Licences et honnêteté', [
        tip(
          'Utiliser l’IA honnêtement',
          'Dans un concours, une école ou un emploi, indique quand et comment tu as utilisé l’IA. Vérifie les licences des bibliothèques proposées : certaines (GPL, AGPL) imposent des obligations fortes ou sont interdites par certains règlements. Et surtout : sois capable d’expliquer ton code.',
        ),
        vf(
          'Déclarer son usage de l’IA est souvent demandé dans les concours et les écoles.',
          true,
          'Le règlement du CADEV le demande, par exemple.',
        ),
        qcm(
          'Laquelle de ces licences est dite « permissive » ?',
          ['MIT', 'AGPL', 'Propriétaire'],
          0,
          'MIT, Apache-2.0 et BSD sont permissives.',
        ),
        qcm(
          'Un jury te demande d’expliquer une fonction générée par l’IA. Tu…',
          [
            'L’expliques, parce que tu l’as relue et comprise',
            'Dis « c’est l’IA qui l’a faite »',
            'Changes de sujet',
          ],
          0,
          'Comprendre son code fait partie de la qualité technique.',
        ),
        vf(
          'Le code généré par une IA n’a jamais de problème de licence.',
          false,
          'Il peut reprendre des extraits sous licence ; reste attentif, surtout pour les gros blocs.',
        ),
        qcm(
          'Avant d’ajouter une bibliothèque proposée par l’IA, tu vérifies…',
          ['Sa licence, sa maintenance et sa popularité', 'Seulement son nom', 'Rien'],
          0,
          'Une bibliothèque abandonnée devient vite une faille.',
        ),
      ]),
    ],
  ),

  unit('construire', 'Construire avec un agent', 'Mener un vrai projet avec un agent de code.', [
    lesson('cadrer', 'Cadrer le projet', [
      tip(
        'Une spécification courte',
        'Avant de coder, écris en une page : le problème, pour qui, les 3 fonctionnalités indispensables, la technologie, et ce qui est hors sujet. Donne ce document à l’agent (Claude Code, Codex, Cursor) au début de chaque session : il gardera le cap.',
        '# Mon projet : CarnetResto\nProblème : les petits restaurants notent les commandes sur papier.\nPour qui : gérants de maquis à Abidjan.\nIndispensable : prise de commande, total, historique du jour.\nStack : React + Supabase.\nHors sujet : paiement en ligne (plus tard).',
      ),
      qcm(
        'Que mettre en priorité dans une spécification ?',
        [
          'Le problème, les utilisateurs et les fonctionnalités indispensables',
          'Les couleurs du logo',
          'La liste de toutes les idées futures',
        ],
        0,
        'Commence petit : une première version utile.',
      ),
      vf(
        'Écrire ce qui est hors sujet évite que l’agent parte dans toutes les directions.',
        true,
        'Un agent fait volontiers « un peu plus » que demandé.',
      ),
      order(
        'Range les étapes de démarrage d’un projet.',
        [
          'Écrire le problème et la cible',
          'Lister les fonctionnalités indispensables',
          'Choisir la technologie',
          'Demander à l’agent la première étape',
        ],
        'Le quoi avant le comment.',
      ),
      qcm(
        'Où ranger les consignes durables pour l’agent (style, commandes de test) ?',
        ['Dans un fichier du dépôt, comme CLAUDE.md ou AGENTS.md', 'Dans ta mémoire', 'Nulle part'],
        0,
        'L’agent le lit à chaque session.',
      ),
      vf(
        'Une première version avec 3 fonctionnalités qui marchent vaut mieux que 10 fonctionnalités à moitié faites.',
        true,
        'Livre, fais tester, puis améliore.',
      ),
    ]),
    lesson('petits-pas', 'Avancer par petits pas', [
      tip(
        'Une étape, un commit',
        'Demande une seule étape à la fois. Après chaque étape qui marche, fais un commit Git : si l’étape suivante casse tout, tu reviens en arrière en une commande. Lis toujours le diff avant d’accepter.',
        'git add .\ngit commit -m "Ajoute la prise de commande"\n# Étape suivante cassée ?\ngit restore .',
      ),
      vf(
        'Faire un commit après chaque étape qui fonctionne te protège des régressions.',
        true,
        'Git est ton filet de sécurité.',
      ),
      qcm(
        'L’agent a modifié 25 fichiers pour une petite demande. Que fais-tu ?',
        [
          'Je lis le diff et je refuse ce qui est hors sujet',
          'J’accepte tout',
          'Je supprime le projet',
        ],
        0,
        'Un changement trop large est un signal d’alerte.',
      ),
      order(
        'Remets le cycle de travail dans l’ordre.',
        ['Demander une étape précise', 'Lire le diff', 'Tester dans l’app', 'Faire un commit'],
        'Demander, relire, tester, enregistrer.',
      ),
      qcm(
        'Pourquoi faire lancer les tests par l’agent après chaque changement ?',
        [
          'Pour détecter tout de suite ce qu’il a cassé',
          'Pour qu’il travaille plus longtemps',
          'Ce n’est pas utile',
        ],
        0,
        'Un bug trouvé tout de suite coûte bien moins cher.',
      ),
      vf(
        'Laisser un agent pousser directement en production sans relecture est une bonne pratique.',
        false,
        'Garde toujours une relecture humaine et des tests avant la mise en ligne.',
      ),
    ]),
    lesson('deployer', 'Mettre en ligne', [
      tip(
        'Du local à Internet',
        'Une app n’existe vraiment que quand des gens peuvent l’utiliser. Il faut : un hébergement (serveur, conteneur ou serverless), une base de données, les variables secrètes configurées sur le serveur (jamais dans le code), un nom de domaine et HTTPS. Héberger près de tes utilisateurs, par exemple chez Systalink à Dakar, réduit la latence.',
      ),
      match('Associe chaque élément à son rôle.', [
        ['Hébergement', 'Faire tourner l’app'],
        ['Base de données', 'Garder les données'],
        ['Variables d’environnement', 'Fournir les secrets au serveur'],
        ['HTTPS', 'Chiffrer les échanges'],
      ]),
      vf(
        'Héberger près de ses utilisateurs rend l’app plus rapide pour eux.',
        true,
        'Moins de distance, moins de latence.',
      ),
      qcm(
        'Où mettre la clé secrète de la base en production ?',
        ['Dans les variables d’environnement du serveur', 'Dans le code source', 'Dans le README'],
        0,
        'Le code peut être public, les secrets jamais.',
      ),
      qcm(
        'Que vérifier juste après une mise en ligne ?',
        [
          'Le parcours principal depuis un téléphone, hors de ton réseau',
          'Rien, ça marchait en local',
          'Seulement la page d’accueil sur ton ordinateur',
        ],
        0,
        'C’est le test qui compte : celui d’un vrai utilisateur.',
      ),
      vf(
        'Une sauvegarde de la base qu’on n’a jamais essayé de restaurer est fiable.',
        false,
        'Une sauvegarde n’est fiable que si la restauration a été testée.',
      ),
    ]),
  ]),
];
