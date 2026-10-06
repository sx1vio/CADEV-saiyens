# Phase 0 — Analyse frontend

> Date : 06/10/2026 · Branche `sylvio-frontend`
> Sources : `Cahier_des_charges_v3_DevHub_Africa.pdf` (référence, 16 p.), `CDC_v3.1_DevHub_Africa_Propositions.pdf` (propositions **à voter en équipe**, 37 p.), `docs/prompts/prompt-frontend-design.md`, images `docs/design/inspirations/`.
> Règle : le cahier des charges l'emporte sur le prompt de design. Les ajouts v3.1 ne sont **pas** dans le périmètre tant que l'équipe ne les a pas votés (décision prévue le 6 oct.).

---

## 1. Ce que dit le cahier des charges, en bref

**Produit :** DevHub Africa (nom de travail, nom final le 8 oct.). « GitHub montre ce que tu as construit ; DevHub montre ce que tu sais faire, parce que tu l'as prouvé. »
**Boucle :** AIDER (SOS Dev) → CONSTRUIRE (Salles de projet) → PROUVER (Developer Passport). **Hors ligne d'abord**, hébergé chez Systalink (40 % de la note).
**Six sections, pas de menu à 15 entrées :** Accueil, SOS Dev, Projets, Découvrir, Passport, Systalink et impact (+ Administration).
**Rôle 3 (front-end et hors ligne) :** PWA, écrans, Passport, service worker, file d'attente, synchronisation côté client.
**Dates :** gel des P2 le 15 oct., gel du code le 22 oct., soumission le 24 oct.
**Mot d'ordre :** une démo qui marche vaut mieux qu'un projet ambitieux qui plante. Compréhensible en 20 secondes.

---

## 2. Écarts entre le prompt de design et le cahier des charges

Le CDC l'emporte ; voici ce que ça change.

| # | Le prompt dit | Le CDC dit | Ce que je propose |
|---|---|---|---|
| 1 | Structure Discord : rail d'**espaces**, liste de **salons** | « Ni un Discord » ; Stack Spaces et chat temps réel = **roadmap** ; six sections maximum | Garder la **mise en page** Discord, pas le concept. Rail = les 6 sections + mes salles de projet (en pastilles, comme des serveurs). Colonne de navigation = sous-sections du contexte (ex. dans une salle : Tâches, Discussion, Membres, Demandes). Aucun « salon » inventé. |
| 2 | Persistance `localStorage` | **IndexedDB** pour le cache (O1) et la file d'attente hors ligne (O2), service worker Workbox | IndexedDB (lib `idb`) pour la file et le cache ; `localStorage` seulement pour les préférences (thème, langue, sidebar repliée). |
| 3 | Données mock, pas de backend | Données **réelles**, « aucune donnée inventée présentée comme réelle », comptes démo **marqués « Démo » partout** ; écran Systalink sans valeur codée en dur | Couche `src/services/` dont les signatures **reprennent les endpoints de la section 8** et les types du modèle de données (section 7). Les mocks sont des comptes démo marqués comme tels. Le jour où l'API existe, on remplace l'implémentation. |
| 4 | Command palette Ctrl+K « indispensable » | Absente du v3 ; **T5 = P2** dans les propositions v3.1 | Hors MVP tant que non voté. Je prévois la place (raccourci, composant), je ne la construis qu'en P2. |
| 5 | Polices web (Jakarta/Inter/JetBrains Mono), Shiki, visuels 3D | Page d'accueil **< 300 Ko transférés**, « polices système », téléphone d'entrée de gamme, Lighthouse PWA ≥ 90 | Une seule police web auto-hébergée et sous-ensemble (Inter ou Geist, ~30-50 Ko woff2), JetBrains Mono chargée **seulement** sur les pages avec du code. **Prism** (léger) au lieu de Shiki. Motion via `LazyMotion` (~5 Ko). Visuel hero en CSS/SVG plutôt qu'en image 3D (ou une seule AVIF < 40 Ko, chargée après le reste). |
| 6 | Ne mentionne pas l'i18n | **I1 (P0)** : interface FR et EN, bascule sans rechargement, textes externalisés | `react-i18next` dès le premier composant : aucun texte en dur. |
| 7 | Ne mentionne pas le hors ligne | **O1-O3 (P0)** : lecture hors ligne, rédaction hors ligne, **indicateur d'état visible sur chaque écran** | L'indicateur réseau fait partie du shell (en haut de la colonne de navigation, et dans la barre du bas sur mobile). |
| 8 | Thème sombre prioritaire, clair possible | v3.1 T4 (P1, à voter) : sombre **qui suit le système** + bascule manuelle | Tokens prêts pour les deux thèmes dès la Phase 1 ; le clair n'est livré que si T4 est retenu. |
| 9 | Bento : CTA « Upgrade », Gantt, mini-calendrier | Pas d'abonnement, pas de planning Gantt | Pas d'« Upgrade » : le bas de la sidebar porte le CTA « Je suis bloqué ». Pas de Gantt inventé. Le mini-calendrier et les tuiles de dates servent aux **créneaux de pair programming** (S5). |
| 10 | Contraste AA | Idem (section 9) | La palette proposée **échoue** à 4 endroits : voir section 7. |

---

## 3. Fonctionnalités, classées par priorité (vue frontend)

Ordre interne des P0 = **chemin critique de la démo** (proposé par le v3.1, cohérent avec le planning v3).

### P0 — indispensables à la démo, dans cet ordre

| Ordre | ID | Fonctionnalité | Ce que le front doit livrer |
|---|---|---|---|
| 1 | A1 | Connexion GitHub | Écran de connexion, bouton GitHub, retour OAuth (simulé tant que l'API n'existe pas) |
| 2 | PR1 | Profil auto-rempli | Onboarding : compétences proposées (≥ 3), fuseau, disponibilités, langues, « ce que je cherche » |
| 3 | S1 | Poser une question | Formulaire : titre, étiquettes de stack, extrait de code ou d'erreur, urgence. Publiable en < 30 s |
| 4 | S2 | Piste IA | Bloc « Généré par IA · à vérifier », état « en attente de connexion » hors ligne, ne bloque jamais |
| 5 | S3 | 3 devs notifiés | Cartes des aidants avec la **raison** du choix (« a déjà résolu 5 problèmes Docker ») |
| 6 | S4 | Répondre, voter, valider | Réponses, vote utile, bouton « M'a débloqué » réservé à l'auteur, +10 Proof XP, statut résolu |
| 7 | X1 | Proof XP | Journal public des XP, chaque point relié à son événement, règles expliquées |
| 8 | X2 | Garde-fous | Messages d'erreur clairs : plafond atteint, vote pour soi interdit, compte trop récent |
| 9 | O1 | Lecture hors ligne | Shell précaché, 100 derniers contenus et mon Passport en cache |
| 10 | O2 | Rédaction hors ligne | File IndexedDB avec UUID, envoi ordonné au retour du réseau, sans doublon |
| 11 | O3 | Indicateur d'état | En ligne · Hors ligne · N actions en attente · Synchronisation · Erreur (réessayer), sur chaque écran |
| 12 | PR2 | Passport public `/u/:pseudo` | Identité, compétences et scores, stats, projets, chronologie. Lisible sans compte |
| 13 | PR3 | « Voir les preuves » | Décomposition G (GitHub) + P (Proof XP) de chaque score, liens vers les sources |
| 14 | R1 | Créer une salle | Description, stack, état, dépôt GitHub (vérifié) |
| 15 | R2 | Tâches | Niveau, statuts ouverte → prise → en revue → terminée, « Je la prends » |
| 16 | R8 | Terminer une tâche | Lien de PR, +15 Proof XP au contributeur |
| 17 | Y1 | Écran Systalink | État des services, latence, dernière sauvegarde |
| 18 | D1 | Découvrir (version simple) | Recherche devs et projets, filtres combinables : stack, fuseau, disponibilité, objectif |
| 19 | R3 | Rejoindre une salle | Demande, acceptation ou refus, statut visible |
| 20 | M1 | Signaler, retirer | Bouton « Signaler » sur chaque contenu, file admin `/admin` |
| 21 | I1 | FR / EN | Bascule sans rechargement (parcours de démo d'abord) |

### P1 — fortement souhaité

A2 GitLab/Google · A3 suppression du compte · PR4 « Disponible pour une mission » + Contacter · S5 pair programming (créneau + lien visio) · S6 base de connaissance cherchable · S7 questions similaires avant de publier · R4 discussion de salle · R5 IA → tâches (validées par le créateur) · R6 demander un retour / une revue · R7 lien d'invitation riche · D2 classement par pays · O4 écran de conflit à deux colonnes · Y2 écran d'impact · Y3 e-mails (côté serveur, rien au front sauf préférences).

### P2 — bonus

D3 recherche sémantique · Y4 stockage objet (côté serveur).

### Propositions v3.1 qui touchent le front (en attente du vote)

Recommandées par le v3.1 en **MVP+** : T1 page d'accueil publique « en direct » · T2 essai sans compte + visite guidée · S8 question guidée + jauge de qualité · S9 étiquettes détectées depuis l'erreur · S10 bouton Traduire · S11 « Je m'en occupe » · O5 simulateur de réseau · PR5 Proof Card · PR7 barre de score bicolore G + P · PR11 badges de confiance · X5 page `/regles` · Y6 mentions Systalink dans le parcours · M3 code de conduite · O9 masquage des secrets avant mise en file (correctif).
P1 v3.1 côté front : T3, T4 (thème), O6, O8 (centre de synchro), R11 (Kanban), PR8 (heatmap), D4 (carte d'Afrique), D6, S14, S16.
P2 v3.1 : T5 (Ctrl+K).

**Mon avis :** pour le front, les plus rentables sont **T1 + T2** (le votant n'arrive plus sur un écran de connexion), **O5** (le hors ligne testable en un clic, et plan B sur scène), **PR7** (la barre G + P rend le Passport lisible en une seconde) et **S9** (motifs locaux, marche hors ligne). Ils coûtent peu et collent parfaitement aux images de référence.

---

## 4. Écrans et fonctionnalités associées

| Écran | Route | Accès | Fonctionnalités | Référence visuelle |
|---|---|---|---|---|
| Connexion / onboarding | `/connexion`, `/bienvenue` | Public | A1, A2, PR1 (+ M3, T2 si votés) | — |
| Accueil | `/` | Connecté | « Je suis bloqué », questions ouvertes de mes stacks, salles recommandées, indicateur réseau (+ S16, D6, T3) | **01** hero violet + salutation ; **02** bento |
| Page publique « en direct » | `/` (déconnecté) | Public | **T1 — seulement si votée** ; sinon `/` redirige vers la connexion | **02** bento, grands chiffres |
| SOS Dev — liste | `/sos` | Lecture publique | Filtres (mes stacks, sans réponse, résolues), base de connaissance (S6) | **03** nav segmentée |
| SOS Dev — poser | modale / sheet mobile | Connecté | S1, S7 (+ S8, S9, O9) | — |
| SOS Dev — question | `/sos/:id` | Lecture publique | S2, S3, S4, S5, M1 (+ S10, S11) | **05** fil d'activité, réponse inline |
| Projets — liste | `/projets` | Lecture publique | Liste, création de salle (R1) | **02** cartes |
| Salle de projet | `/p/:code` | Lecture publique | R1, R2, R3, R4, R5, R6, R7, R8 | **04** sidebar ; **05** discussion |
| Découvrir | `/decouvrir` | Public | D1 (+ D3) | **03** nav segmentée |
| Classement | `/classement` | Public | D2 (+ D4 carte) | — |
| Passport | `/u/:pseudo` | Public sans compte | PR2, PR3, PR4, X1 (+ PR5, PR7, PR8, PR11) | **02** bento, heatmap ; **05** chronologie |
| Systalink | `/systalink` | Public | Y1 | **02** cartes de statut |
| Impact | `/impact` | Public | Y2 | **02** grands chiffres + deltas |
| Administration | `/admin` | Admin | M1, comptes démo | — |
| Paramètres | `/parametres` | Connecté | PR1 (édition), A3, langue (I1), thème | — |
| Transverses | — | — | Indicateur réseau (O3), conflit (O4), notifications (S3), toasts | **03**, **05** |

Navigation principale : **Accueil · SOS Dev · Projets · Découvrir · Passport** (5 onglets, parfaits pour la barre du bas mobile) ; Systalink/Impact et Admin dans le menu secondaire.

---

## 5. Parcours utilisateurs principaux

Basés sur le scénario de démo du CDC (section 4 et 12).

**P1 — Être débloqué (Awa, Abidjan).**
Connexion GitHub → Passport pré-rempli → Accueil → **« Je suis bloqué »** → titre, colle l'erreur, étiquettes, urgence → Publier → piste IA marquée « IA · à vérifier » → « 3 devs notifiés » avec leurs raisons → réponse de Moussa → **« M'a débloqué »** → question résolue, fiche de connaissance.

**P2 — Aider et gagner des preuves (Moussa, Dakar).**
Notification « Awa a besoin d'aide sur Docker · tu as déjà résolu 5 problèmes similaires » → question → répond → validée → **+10 Proof XP** (+3 si < 15 min) → Passport : barre de score qui monte, nouvelle ligne dans la chronologie → **« Voir les preuves »**.

**P3 — Construire (Awa ouvre une salle).**
Projets → Nouvelle salle → lien du dépôt (vérifié) → description, stack, état → publie 3 tâches avec niveau → deux devs demandent à rejoindre → acceptés → l'un prend une tâche → PR fusionnée → « Terminée » + lien PR → +15 XP au contributeur.

**P4 — Hors ligne (le moment spectaculaire).**
Réseau coupé → bandeau « Hors ligne » → Awa rédige une réponse → « 1 action en attente » → rechargement : la réponse est toujours là → retour du réseau → « Synchronisation… » → « 1 envoyée ».

**P5 — Visiteur sans compte (juge, votant).**
Lien partagé → Passport public `/u/moussa` lisible sans compte → « Voir les preuves » → Découvrir / Classement → `/systalink` → « Se connecter avec GitHub ». (Avec T1/T2 : page publique « en direct » puis « Essayer sans compte ».)

---

## 6. Stack retenue

| Besoin | Choix | Pourquoi |
|---|---|---|
| Base | React 19 + Vite + TypeScript strict | Imposé par le CDC (section 8) et le prompt |
| PWA, hors ligne | `vite-plugin-pwa` (Workbox), `idb` (IndexedDB) | Exigé par O1-O3 et la section 6.5 |
| Styles | Tailwind CSS v4 + variables CSS (tokens) | Thème sombre/clair sans réécriture |
| Composants | shadcn/ui (Radix) | Accessibilité clavier et ARIA déjà faites |
| Mouvement | Motion avec `LazyMotion` + `m` | Layout animations (indicateur qui glisse) pour ~5 Ko |
| Icônes | lucide-react (import par icône) | Aucun emoji comme icône |
| Routage | React Router (routes en lazy) | Découpage du code exigé (< 300 Ko) |
| État global | Zustand | Session, réseau, file d'attente |
| i18n | react-i18next | I1 (P0) |
| Toasts | sonner | UI optimiste, actions en file |
| Code | prism-react-renderer | Bien plus léger que Shiki |
| Markdown | react-markdown + rehype-sanitize | « Rendu Markdown assaini » (section 9) |
| Formulaires | react-hook-form + zod | Validation inline ; mêmes schémas réutilisables par l'API |
| Command palette | cmdk | **Seulement si T5 est voté** (P2) |
| Polices | Inter (ou Geist) variable, sous-ensemble latin, auto-hébergée ; JetBrains Mono en lazy | Budget de 300 Ko |

---

## 7. Palette : vérification des contrastes (WCAG AA = 4,5:1 pour le texte normal)

| Couple | Ratio | Verdict | Correction proposée |
|---|---|---|---|
| `--text-subtle #646A96` sur `surface-1/2/3` | 3,49 / 3,24 / 2,90 | **Échoue** | `#7E84B2` → 5,04 / 4,68 sur surface-1/2 (réserver surface-3 au texte `muted`) |
| Texte blanc sur pilule `--accent #7C6CF6` (item actif, CTA) | 3,94 | **Échoue** | Fond de pilule `--accent-strong #6857E0` → 5,21 ; `#7C6CF6` reste pour les bordures, glows, focus |
| `--accent` utilisé comme **texte** sur `surface-2/3` | 4,28 / 3,82 | **Échoue** | Texte accent `#9B8FFF` → 6,23 / 5,56 |
| Texte blanc sur pastille corail `--badge #FF7A59` | 2,57 | **Échoue** | Texte sombre `#0B0D1C` sur corail → 7,51 |
| `--text`, `--text-muted`, succès, danger, pastels + texte sombre | 5,9 à 16,5 | OK | — |

---

## 8. Questions bloquantes

1. **Quelles propositions v3.1 sont retenues ?** Le vote était prévu aujourd'hui (6 oct.). Ça change l'écran d'accueil (T1/T2), le thème clair (T4), Ctrl+K (T5) et une dizaine de détails. *Par défaut, je ne construis que le v3 et je garde la place pour T1, T2, O5, PR7.*
2. **Es-tu bien le rôle 3 (« Front-end et hors ligne ») ?** Si oui, le service worker, la file IndexedDB et la synchro sont dans mon périmètre, même si le prompt dit « pas de backend ».
3. **Le contrat d'API existe-t-il ?** Le CDC prévoyait le 5 oct. le choix NestJS/FastAPI et le contrat hors ligne entre rôles 2 et 3 (format de la file, Idempotency-Key). S'il y a un OpenAPI ou un schéma, je m'aligne dessus ; sinon je dérive les types des sections 7 et 8 et je les partage au rôle 2.
4. **Budget de poids vs. prompt :** OK pour une seule police web auto-hébergée, Prism au lieu de Shiki, et un visuel hero en CSS/SVG plutôt qu'une image 3D générée ?

Points non bloquants, décidés par défaut : nom du produit dans une constante (`APP_NAME = "DevHub Africa"`) en attendant le 8 oct. ; la mise en page Discord est adaptée aux 6 sections (section 2, point 1).
