import { q } from '../devhub-1';
import type { QuizQuestion } from '../types';

/** Questions supplémentaires de react-essentiel (12/11/2026). */
export const EXTRA: QuizQuestion[] = [
  // 0 — Composants et JSX
  q(
    0,
    'Pourquoi ce composant ne compile-t-il pas ?',
    [
      'Il renvoie deux éléments frères sans parent commun',
      'Les balises <h2> sont interdites dans un composant',
      'Il manque un import de React en haut du fichier',
      'Le texte doit être placé entre accolades',
    ],
    0,
    'Un composant renvoie une seule valeur, donc un seul élément racine. On enveloppe les frères dans un fragment <>…</> ou dans un élément utile.',
    'function Carte() {\n  return (\n    <h2>Pagne wax</h2>\n    <p>12 000 FCFA</p>\n  );\n}',
  ),
  q(
    0,
    'Qu’affiche ce code quand le panier est vide ?',
    ['Rien', 'Le chiffre 0', 'Le mot false', 'Une erreur'],
    1,
    'panier.length vaut 0 : && renvoie cette valeur, et React affiche les nombres. À gauche de &&, utilise un booléen : panier.length > 0 && ….',
    '<div>{panier.length && <Badge nombre={panier.length} />}</div>',
  ),
  q(
    0,
    'Pourquoi <carteProduit /> ne rend-il pas ton composant CarteProduit ?',
    [
      'Les composants doivent être importés avec require',
      'Un nom en minuscule est traité comme une balise HTML',
      'Il faut ajouter le suffixe Component au nom',
      'Il manque un export nommé',
    ],
    1,
    'React distingue les balises natives (minuscule) des composants (majuscule). Un composant doit commencer par une majuscule.',
  ),
  q(
    0,
    'Quel est le problème de déclarer function Ligne() { … } à l’intérieur du composant Tableau ?',
    [
      'Aucun, c’est la façon recommandée de garder Ligne privé',
      'Ligne ne peut pas recevoir de props',
      'Ligne est un nouveau type à chaque rendu de Tableau : son état est perdu et son DOM recréé',
      'Cela provoque une erreur de compilation',
    ],
    2,
    'Les composants se déclarent au premier niveau du module. Défini à l’intérieur, Ligne est recréé à chaque rendu et React le considère comme un autre composant.',
  ),
  q(
    0,
    'Avec function Prix({ montant, devise = "FCFA" }), que vaut devise pour <Prix montant={500} devise={null} /> ?',
    ['"FCFA"', 'undefined', 'null', '""'],
    2,
    'La valeur par défaut d’une déstructuration ne s’applique que pour undefined. Avec null explicite, devise vaut null.',
  ),

  // 1 — État et événements
  q(
    1,
    'Si n vaut 0, que vaut n au rendu suivant ?',
    ['1', '2', '3', '6'],
    0,
    'L’état est un instantané : les trois appels calculent 0 + 1. Pour cumuler, utilise la forme fonction setN(x => x + 1).',
    'function handleClick() {\n  setN(n + 1);\n  setN(n + 1);\n  setN(n + 1);\n}',
  ),
  q(
    1,
    'Que se passe-t-il avec <button onClick={valider()}>Valider</button> ?',
    [
      'valider est appelée à chaque clic',
      'valider est appelée pendant chaque rendu, pas au clic',
      'valider n’est jamais appelée',
      'React affiche un bouton désactivé',
    ],
    1,
    'Les parenthèses appellent la fonction au moment du rendu ; onClick reçoit son résultat. Il faut passer la fonction : onClick={valider} ou onClick={() => valider(id)}.',
  ),
  q(
    1,
    'Quelle écriture augmente la quantité d’un article sans muter l’état ?',
    [
      'setPanier(panier.map(a => (a.id === id ? { ...a, qte: a.qte + 1 } : a)))',
      'panier.find(a => a.id === id).qte++; setPanier([...panier])',
      'setPanier(panier.map(a => { if (a.id === id) a.qte++; return a; }))',
      'panier[0].qte += 1; setPanier(panier)',
    ],
    0,
    'Il faut un nouveau tableau et un nouvel objet pour l’élément modifié. Copier seulement le tableau ne suffit pas : la copie est superficielle et l’objet d’origine est modifié.',
  ),
  q(
    1,
    'Juste après setSolde(5000) dans un gestionnaire, que montre console.log(solde) ?',
    ['5000', 'undefined', 'L’ancienne valeur de solde', 'Une promesse'],
    2,
    'solde est une constante du rendu en cours. Le set programme un nouveau rendu ; la nouvelle valeur ne sera visible qu’au rendu suivant.',
  ),
  q(
    1,
    'Une carte produit est cliquable et contient un bouton « Supprimer ». Cliquer sur le bouton ouvre aussi la carte. Que faire ?',
    [
      'Appeler e.preventDefault() dans le onClick de la carte',
      'Appeler e.stopPropagation() dans le onClick du bouton',
      'Remplacer onClick par onMouseDown',
      'Retourner false depuis le gestionnaire du bouton',
    ],
    1,
    'Les événements remontent vers les parents. stopPropagation dans le bouton empêche le clic d’atteindre la carte. return false n’a aucun effet en React.',
  ),

  // 2 — Effets et données
  q(
    2,
    'Pourquoi cet effet se relance-t-il après chaque rendu ?',
    [
      'Parce que ville change à chaque rendu',
      'Parce que options est un nouvel objet à chaque rendu',
      'Parce que connecter est asynchrone',
      'Parce qu’il manque un tableau de dépendances',
    ],
    1,
    'Deux objets distincts ne sont jamais égaux pour Object.is. Crée options à l’intérieur de l’effet et dépends seulement de ville.',
    'const options = { ville };\nuseEffect(() => {\n  const c = connecter(options);\n  return () => c.fermer();\n}, [options]);',
  ),
  q(
    2,
    'Une requête renvoie une erreur 500. Que fait fetch ?',
    [
      'Il rejette la promesse automatiquement',
      'Il relance la requête trois fois',
      'Il résout la promesse : il faut tester res.ok',
      'Il lève une exception synchrone',
    ],
    2,
    'fetch ne rejette qu’en cas d’échec réseau. Une réponse HTTP d’erreur est résolue normalement ; on vérifie res.ok (statut 200 à 299) et on lève une erreur soi-même.',
  ),
  q(
    2,
    'L’utilisateur passe vite du produit 1 au produit 2. La réponse du produit 1 arrive en dernier et s’affiche. Comment l’éviter ?',
    [
      'Ajouter un setTimeout avant le fetch',
      'Retirer id des dépendances',
      'Dans le nettoyage, marquer la requête précédente comme ignorée (ou l’annuler avec AbortController)',
      'Utiliser useRef à la place de useState pour les données',
    ],
    2,
    'C’est une condition de course. Le nettoyage s’exécute avant la nouvelle exécution : un drapeau ignore = true ou controller.abort() empêche l’ancienne réponse d’écraser la nouvelle.',
  ),
  q(
    2,
    'Pourquoi écrire useEffect(async () => { … }, []) est-il incorrect ?',
    [
      'Une fonction async renvoie une promesse, alors que l’effet ne doit renvoyer que rien ou une fonction de nettoyage',
      'await est interdit dans les composants',
      'L’effet s’exécuterait avant le rendu',
      'Ce n’est pas incorrect',
    ],
    0,
    'React attend une fonction de nettoyage ou undefined. On déclare une fonction async à l’intérieur de l’effet et on l’appelle.',
  ),
  q(
    2,
    'Où envoyer la requête POST qui enregistre une commande quand l’utilisateur clique sur « Payer » ?',
    [
      'Dans un effet qui surveille un état paiementDemande',
      'Dans le gestionnaire du clic (ou de l’envoi du formulaire)',
      'Pendant le rendu du composant',
      'Dans la valeur initiale de useState',
    ],
    1,
    'L’envoi est causé par une action précise de l’utilisateur : c’est le rôle d’un gestionnaire d’événement. Un effet sert à synchroniser avec un système extérieur parce que le composant est affiché.',
  ),

  // 3 — Listes et formulaires
  q(
    3,
    'Une liste de champs utilise key={index}. Après suppression de la première ligne, le texte saisi apparaît sur la mauvaise ligne. Pourquoi ?',
    [
      'Les inputs perdent leur valeur après chaque rendu',
      'Les index se décalent : React associe l’état de l’ancienne ligne 0 à la nouvelle',
      'Il faut un formulaire contrôlé pour supprimer une ligne',
      'filter ne conserve pas l’ordre',
    ],
    1,
    'La key identifie l’élément. Avec l’index, la nouvelle première ligne hérite de l’identité de l’ancienne. Une key stable tirée des données (id) règle le problème.',
  ),
  q(
    3,
    'Pourquoi ce champ refuse-t-il toute saisie ?',
    [
      'type="tel" n’est pas supporté en React',
      'Il manque l’attribut name',
      'value est fourni sans onChange : la valeur est figée',
      'tel doit être un nombre',
    ],
    2,
    'Un champ contrôlé affiche toujours value. Sans onChange pour mettre l’état à jour, chaque frappe est annulée. Ajoute onChange, ou utilise defaultValue pour un champ non contrôlé.',
    '<input type="tel" value={tel} />',
  ),
  q(
    3,
    'Que contient e.target.value pour un <input type="number"> où l’on a tapé 1500 ?',
    ['Le nombre 1500', 'La chaîne "1500"', 'NaN', 'Un objet { value: 1500 }'],
    1,
    'La valeur d’un champ est toujours une chaîne. Convertis avec Number() avant de calculer, sinon "1500" + 500 donne "1500500".',
  ),
  q(
    3,
    'Pourquoi rien ne s’affiche-t-il ici ?',
    [
      'La fonction fléchée avec accolades n’a pas de return : elle renvoie undefined',
      'La key doit être sur le <ul>',
      'map ne fonctionne pas dans le JSX',
      'Il faut un fragment autour de <Ligne>',
    ],
    0,
    'Avec un corps entre accolades, une fonction fléchée doit faire return explicitement. Écris t => <Ligne … /> ou ajoute return.',
    '<ul>\n  {transactions.map(t => {\n    <Ligne key={t.id} transaction={t} />;\n  })}\n</ul>',
  ),
  q(
    3,
    'Comment réinitialiser l’état d’un <FormulaireClient> quand on change de client sélectionné ?',
    [
      'Appeler window.location.reload()',
      'Lui donner key={client.id}',
      'Copier client dans un état avec useState(client)',
      'Ajouter un effet qui vide chaque champ',
    ],
    1,
    'Quand la key change, React démonte l’ancienne instance et en monte une nouvelle avec un état neuf. C’est plus simple et plus sûr qu’un effet de remise à zéro.',
  ),

  // 4 — Performance et structure
  q(
    4,
    'LigneProduit est enveloppé dans memo mais se réaffiche à chaque rendu du parent. Pourquoi ?',
    [
      'memo ne fonctionne qu’avec des composants classes',
      'onAjout est une nouvelle fonction à chaque rendu du parent',
      'memo compare les props en profondeur',
      'produit.id change à chaque rendu',
    ],
    1,
    'memo compare chaque prop avec Object.is. Une fonction fléchée écrite dans le JSX du parent est recréée à chaque rendu ; useCallback permet de garder la même fonction.',
    '<LigneProduit produit={p} onAjout={id => ajouter(id)} />',
  ),
  q(
    4,
    'Deux composants appellent le même hook personnalisé useEnLigne(). Que partagent-ils ?',
    [
      'Le même état : un hook est un singleton',
      'La logique seulement : chaque appel a son propre état',
      'Rien du tout, un hook ne peut être appelé qu’une fois',
      'Le même état si le hook est dans le même fichier',
    ],
    1,
    'Un hook personnalisé réutilise du code. Chaque appel exécute ses propres useState et useEffect. Pour partager une valeur, on remonte l’état ou on utilise un contexte.',
  ),
  q(
    4,
    'Quel code viole les règles des hooks ?',
    [
      'Appeler useState en haut d’un composant',
      'Appeler useContext dans un hook personnalisé',
      'Appeler useState dans un if',
      'Appeler deux fois useEffect dans un composant',
    ],
    2,
    'Les hooks s’appellent au premier niveau d’un composant ou d’un hook personnalisé, toujours dans le même ordre. Dans un if, l’ordre peut changer d’un rendu à l’autre.',
  ),
  q(
    4,
    'Une page de catalogue semble lente. Quelle est la première chose à faire ?',
    [
      'Envelopper tous les composants dans memo',
      'Mesurer avec le Profiler des React DevTools pour trouver la cause',
      'Remplacer tous les useState par des useRef',
      'Désactiver StrictMode',
    ],
    1,
    'Sans mesure, on optimise au hasard et on ajoute du code inutile. Le Profiler montre quels composants se réaffichent et combien de temps ils prennent ; mesure sur une version de production.',
  ),
  q(
    4,
    'Pourquoi préférer <button> à <div onClick> pour une action ?',
    [
      'Le div ne déclenche jamais onClick',
      'Le bouton est focalisable, s’active au clavier et est annoncé comme bouton par les lecteurs d’écran',
      'Le bouton s’affiche plus vite',
      'React interdit onClick sur un div',
    ],
    1,
    'Un élément natif apporte gratuitement focus, clavier (Entrée, Espace) et rôle accessible. Avec un div, il faudrait tout réimplémenter (tabIndex, role, gestion des touches).',
  ),
];
