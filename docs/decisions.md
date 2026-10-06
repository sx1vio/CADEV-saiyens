# Décisions produit et techniques — frontend

> Tenu par le rôle 3 (front-end et hors ligne). Chaque décision est datée.
> Le 06/10/2026, Sylvio m'a délégué toutes les décisions frontend : « Décide de tout par toi-même, tu le notes dans la doc et le suivi. »

---

## 1. Ambition (06/10/2026)

> « L'objectif est de créer **LA plateforme incontournable** des devs. Pas un simple site où tout est rassemblé. Même avec l'IA, où tout le monde peut presque tout faire seul, elle doit rester utile et complète. Une vraie interface web, pas une simulation. » — Sylvio

### Pourquoi on reste utile quand l'IA sait déjà presque tout faire

| Ce que l'IA fait seule | Ce qu'elle ne fait pas, et que DevHub fait | Où c'est dans le produit |
|---|---|---|
| Proposer une piste en quelques secondes | Garantir que la piste marche **dans ton contexte** (versions, hébergeur local, API mobile money, réseau instable) | SOS Dev : la piste IA arrive **d'abord**, puis un dev qui a **déjà résolu ce problème** confirme ou corrige |
| Écrire du code | **Prouver** que *toi*, tu sais le faire | Developer Passport : chaque score est relié à des preuves vérifiables (réponses validées, PR fusionnées) |
| Répondre à une personne | Faire **grandir une communauté** : ce qui est résolu une fois sert à tous | Fiches de connaissance issues des questions résolues, consultables hors ligne |
| Travailler seule | Trouver des **coéquipiers** et des contributeurs, construire à plusieurs | Salles de projet reliées à GitHub, tâches, demandes pour rejoindre |
| Fonctionner en ligne | Fonctionner **sans réseau** | Hors ligne d'abord : lecture, rédaction, file d'attente, synchronisation |

On ne met donc pas l'IA en concurrence : elle est intégrée comme **premier niveau d'aide**. Les humains apportent ce qu'elle ne sait pas faire : le vécu, la vérification, la confiance et la collaboration.

### Un vrai hub, pas une liste de pages

- **Le QG** (accueil connecté) répond à « qu'est-ce que je fais maintenant ? ». On y trouve :
  - le bouton « Je suis bloqué » ;
  - les questions de mes stacks qui attendent une réponse ;
  - les tâches de mes salles ;
  - ma progression en Proof XP ;
  - des devs à rencontrer ;
  - le fil de la communauté.
- **Tout est relié.** Une question renvoie à des Passports, un Passport à des projets, un projet à des tâches, et une tâche à une question SOS. On ne tombe jamais sur une impasse.
- **Djeli**, la mascotte, accueille les nouveaux membres et leur fait visiter la plateforme.

---

## 2. Pas de Kotlin Multiplatform : on reste en React PWA (06/10/2026)

**Question de Sylvio :** « Si on le fait en Kotlin, on fait l'interface une seule fois et on l'adapte au web, à iOS et à Android. »

**Vérification (octobre 2026) :**
- **Mobile :** Compose Multiplatform est stable sur Android et sur iOS (iOS stable depuis la version 1.8.0, mai 2025).
- **Web :** la cible web n'est qu'en **bêta** (depuis la version 1.9.0, septembre 2025). Elle dessine toute l'interface dans un `<canvas>` grâce à Skia compilé en WebAssembly.
- **Poids :** le moteur de rendu `skiko.wasm` pèse à lui seul ~9 Mo avant compression, à télécharger avant le premier affichage.
- **Limites connues :** l'accessibilité et le référencement sont encore en chantier.

**Décision : on garde React + Vite en PWA.**

| Critère du cahier des charges | React PWA | Compose Multiplatform (web) |
|---|---|---|
| Accueil < 300 Ko transférés (§9) | Oui, avec un découpage du code | Non : plusieurs Mo avant le premier écran |
| Fluide sur un téléphone d'entrée de gamme (§9) | Oui | Non : WebAssembly + rendu canvas, lourd en mémoire |
| Passport public partageable, aperçu Open Graph (PR2) | Oui : vraies pages HTML | Difficile : canvas, référencement limité |
| Lighthouse PWA ≥ 90, service worker Workbox (§8, O1) | Natif | Pas prévu pour |
| Accessibilité : clavier, lecteurs d'écran (§9) | Natif (HTML + ARIA) | Partielle (bêta) |
| Stack imposée (§8 : « React (Vite) en PWA ») | Oui | Contredit le cahier des charges |
| 16 jours restants, équipe qui ne maîtrise pas Kotlin | Oui | Gros risque d'apprentissage |

**Et le mobile ?** La PWA s'installe déjà sur Android et iOS (« Ajouter à l'écran d'accueil »), fonctionne hors ligne et s'ouvre en plein écran : c'est l'application mobile du MVP. L'application mobile native est en **roadmap** dans le cahier des charges (§3). Le jour venu, on pourra emballer la PWA avec **Capacitor**, ou démarrer une app Compose Multiplatform pour le mobile seulement, en réutilisant la même API.

Sources :
- [Compose Multiplatform 1.9.0 : le web passe en bêta](https://blog.jetbrains.com/kotlin/2025/09/compose-multiplatform-1-9-0-compose-for-web-beta/)
- [Compose Multiplatform 1.10.0](https://blog.jetbrains.com/kotlin/2026/01/compose-multiplatform-1-10-0/)
- [Présent et futur de Kotlin pour le web](https://blog.jetbrains.com/kotlin/2025/05/present-and-future-kotlin-for-web/)
- [Compose sur le web : Wasm vs JS/Canvas vs HTML](https://kmpweekly.com/tutorials/compose-web-wasm/compose-on-the-web)
- [Compose Multiplatform : ce qui est assez stable pour la production](https://www.highcircl.com/en/blog/compose-multiplatform)

---

## 3. Périmètre : propositions v3.1 retenues pour le front (06/10/2026)

Le v3 reste la référence et je l'implémente en entier côté front. Parmi les propositions v3.1, je retiens celles qui servent l'ambition « incontournable » **et** qui coûtent peu au front :

| Retenu | ID | Pourquoi |
|---|---|---|
| ✅ | **T1** Page d'accueil publique « en direct » | Validé par Sylvio : page publique accessible sans compte |
| ✅ | **T2** Essai sans compte + **visite guidée** | Demandé par Sylvio : la visite est faite par la mascotte Djeli |
| ✅ | **T3** Accueil personnalisé (« Tu viens surtout pour… ») | Posé pendant l'onboarding ; réordonne le QG |
| ✅ | **T4** Thème sombre + clair (suit le système) | Tokens prévus pour les deux thèmes |
| ✅ | **T5** Palette de commandes Ctrl/Cmd+K | Réflexe de dev, rend la navigation très rapide |
| ✅ | **S8** Question guidée + jauge de qualité | Meilleures questions, donc réponses plus rapides |
| ✅ | **S9** Étiquettes détectées depuis l'erreur | Motifs locaux, fonctionne hors ligne |
| ✅ | **S10** Bouton « Traduire » FR ↔ EN | Pont francophone et anglophone (traduction faite côté API) |
| ✅ | **S11** « Je m'en occupe » | L'auteur sait qu'on travaille sur son problème |
| ✅ | **S14** Lien de reproduction | Un champ de plus |
| ✅ | **S16** « Personne n'a encore répondu » | Bloc du QG |
| ✅ | **O5** Simulateur de réseau | Le hors ligne testable en un clic, plan B sur scène |
| ✅ | **O8** Centre de synchronisation | Rend la file d'attente visible et contrôlable |
| ✅ | **O9** Secrets masqués avant la mise en file | Correctif de sécurité |
| ✅ | **PR7** Barre de score bicolore G + P | Le Passport se lit en une seconde |
| ✅ | **PR8** Carte de chaleur de l'entraide | Repris de la heatmap de l'image 02 |
| ✅ | **PR10** « Je peux aider sur » / « Je veux apprendre » | Onboarding et Passport |
| ✅ | **PR11** Badges de confiance (GitHub, Démo, Fondateur) | Crédibilité |
| ✅ | **R11** Kanban des tâches et santé du projet | La salle se comprend d'un coup d'œil |
| ✅ | **D6** « Devs à rencontrer » | Le QG crée des rencontres sans recherche active |
| ✅ | **X5** Page `/regles` « Comment marchent les Proof XP » | Transparence |
| ✅ | **Y6** Mentions Systalink dans le parcours | Critère à 40 % |
| ✅ | **M3** Code de conduite à l'inscription | Une étape de l'onboarding |
| ⏸ | PR5 Proof Card, PR6 badge README, Y5, Y7, Y8 | Essentiellement côté serveur. Le front prévoit les emplacements (bouton « Partager ma carte », extrait du badge) |
| ⏸ | D4 carte de l'Afrique, D5, D7 | P1/P2, après le cœur du produit |
| ❌ | PR12, PR13, S13, S15, O7, O10, R13, R15, T6, T7, X6-X8, M5 | P2 ou roadmap : pas pour ce sprint |

---

## 4. Mascotte « Djeli » et visite guidée (06/10/2026)

- **Nom :** *Djeli*, le griot en mandingue, gardien du savoir, conteur et guide. Parfait pour une plateforme où le savoir se transmet entre devs.
- **Apparence :** petit robot rond en 3D (rendu « argile »), indigo-violet, visière aux yeux lumineux, antenne à orbe, sacoche à motif kente et parchemin. Généré avec Higgsfield (`gpt_image_2_5`), fond transparent.
- **Poses :** salut (accueil), désigne (étapes de visite), célèbre (+XP, question résolue), lit un parchemin (base de connaissance, états vides), lanterne (hors ligne), ordinateur (chargement, rédaction).
- **Poids :** chaque pose est convertie en WebP de ~256 px (quelques dizaines de Ko), chargée à la demande, **jamais** sur le chemin critique de l'accueil.
- **Visite guidée :**
  - **Quand :** juste après l'inscription, après l'onboarding. On peut la relancer depuis le menu d'aide ou depuis Ctrl+K.
  - **Comment :** Djeli « vole » d'une zone à l'autre et un projecteur met en valeur l'élément réel de l'interface.
  - **Les 6 étapes :** QG → « Je suis bloqué » → Projets → Passport → indicateur réseau / simulateur → Ctrl+K.
  - **Toujours :** on peut passer la visite, la reprendre et la faire au clavier, et `prefers-reduced-motion` est respecté.

---

## 5. Navigation et qualité des écrans — règles (06/10/2026)

> « La navigation doit être très fluide ; les écrans et chaque page doivent être bien designés, bien disposés, très intuitifs. » — Sylvio

1. **Une page = une intention et une seule action primaire**, reconnaissable en moins de 5 secondes (titre clair, un seul bouton plein).
2. **Navigation instantanée :**
   - les routes sont découpées et **préchargées** au survol et au focus des liens ;
   - le contenu déjà vu s'affiche tout de suite depuis le cache, puis se rafraîchit (stale-while-revalidate) ;
   - **jamais** d'écran blanc ni de spinner plein écran : des skeletons à la forme exacte du contenu.
3. **Transitions courtes** (150-220 ms) : fondu-glissé entre les pages, l'indicateur actif *glisse*, les listes entrent en léger décalage. Rien de plus de 320 ms sur une action fréquente ; tout est désactivé avec `prefers-reduced-motion`.
4. **On sait toujours où l'on est :**
   - un item actif bien visible (pilule pleine, coin inversé de l'image 04) ;
   - un titre de page, et un fil d'Ariane dans les écrans profonds (salle → tâche) ;
   - les états d'onglet sont reflétés dans l'URL.
5. **Tout est atteignable en 2 clics ou 1 raccourci :** Ctrl/Cmd+K, `g h` (QG), `g s` (SOS), `g p` (Projets), `g d` (Découvrir), `?` (aide), `n` (nouvelle question).
6. **Mise en page cohérente :** même grille partout, en-tête de page identique (salutation ou titre, sous-titre, action primaire à droite), largeur de lecture limitée pour le texte long.
7. **Retour arrière fiable :** les filtres et l'onglet sont dans l'URL, et la position de défilement est restaurée.
8. **Mobile d'abord pour les gestes :** barre d'onglets en bas, bottom sheets, cibles de 44 px, zones de pouce.

---

## 6. Architecture technique du front (06/10/2026)

- **Emplacement :** `frontend/` (le dépôt accueillera aussi `backend/` des rôles 2, 4 et 5).
- **Stack :**
  - socle : React 19, Vite, TypeScript strict, Tailwind CSS v4 avec tokens CSS ;
  - composants et mouvement : primitives Radix (base shadcn), Motion (LazyMotion), lucide-react ;
  - navigation, état et langues : React Router, Zustand, react-i18next ;
  - hors ligne : `idb`, vite-plugin-pwa (Workbox) ;
  - contenus : sonner, cmdk, prism-react-renderer, react-markdown + rehype-sanitize, zod.
- **Données :** `src/services/` expose une interface **calquée sur l'API du cahier des charges** (§8). Deux implémentations :
  - `api` : le vrai client HTTP (avec `Idempotency-Key`), utilisé dès que `VITE_API_URL` est défini ;
  - `local` : un **serveur local** dans IndexedDB qui applique les vraies règles du cahier des charges (Proof XP, plafonds, statuts des tâches, matching v3.1). L'app fonctionne ainsi de bout en bout tant que l'API n'est pas en ligne.

  Les données de départ sont des **comptes démo marqués « Démo »**, jamais présentées comme réelles.
- **Hors ligne :** chaque écriture passe par une file IndexedDB (UUID `client_id`, ordre conservé, reprise progressive en cas d'échec). L'état réseau combine `navigator.onLine` et le simulateur O5.
- **Langues :** FR par défaut, EN complet ; aucun texte en dur dans les composants.

---

## 7. Poids et performance (06/10/2026)

Mesuré avec Playwright à 375 px, sans service worker, en français :
- **Avant :** 443 Ko transférés pour l'accueil.
- **Après :** **295 Ko**, données de démo comprises. L'objectif du CDC est de rester sous 300 Ko.

Leviers appliqués :
1. Shell connecté, palette Ctrl+K, visite, « Je suis bloqué » et centre de synchro : chargés à la première utilisation.
2. Serveur local (moteur et données) : import dynamique ; il n'est pas chargé tant qu'il n'y a ni session ni donnée à afficher.
3. Dictionnaire anglais téléchargé seulement si la langue est choisie.
4. Motion (animations de mise en page) chargé au premier composant animé.
5. Polices système (CDC §9) ; Inter est utilisée seulement si elle est déjà installée sur l'appareil.
6. Visuel hero en deux tailles (`srcset`) ; poses de Djeli en `loading="lazy"`.
7. Préchargement des pages principales seulement en 4G et sans « économie de données ».

## 8. Honnêteté des données en démo (06/10/2026)

- **Comptes de démo :** tous marqués « Démo » ; leurs chiffres sont signalés comme « Données de démonstration ».
- **Piste en mode local :** produite par des **règles d'erreurs connues** et étiquetée « Piste automatique ». La piste IA réelle viendra du serveur, car la clé ne doit jamais être dans le front.
- **Activité :** aucune n'est simulée. Pour montrer les deux côtés d'un échange sur un seul appareil, on change de compte démo depuis le menu de l'avatar.
- **Intégrations GitHub réelles** (API publique) : import du profil, vérification d'un dépôt, vérification qu'une PR est fusionnée.
