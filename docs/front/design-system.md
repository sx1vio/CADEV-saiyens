# Système de design DevHub

> Version 2 — 08/10/2026. Remplace la charte « Drivery » et la matière « Retail-X » (décisions 12 et 15).
> Mises à jour du même jour, demandées par Sylvio : **bleu nuit et bleu roi à la place du violet** ; **Liquid Glass sur tous les boutons** ; **aucune petite bande décorative, nulle part**.
> Positionnement : **un réseau social éditorial pour développeurs, avec la précision d’un outil**. Pas un tableau de bord SaaS.

## Principes

1. **Le contenu d’abord, les conteneurs ensuite.** On sépare par des lignes fines et de l’espace, pas par des cartes. Une carte n’existe que si le bloc est un objet qu’on manipule (une offre sélectionnée, un menu, une boîte de dialogue).
2. **La page est plate, les commandes sont en verre.** Aucune ombre ni dégradé sur la page. Comme dans Liquid Glass (Apple), le verre est réservé aux commandes qui se posent au-dessus du contenu : **tous les boutons**, onglets et pastilles. Les ombres de page sont réservées aux menus, popovers, dialogues et toasts.
3. **Bleu nuit et bleu roi.** Le bleu nuit porte le texte et les surfaces sombres ; le bleu roi est l’accent (liens, focus, sélection, bouton principal). Plus de violet.
4. **Jamais de petite bande décorative** : pas de liseré à gauche d’un bloc, pas de trait devant un titre, pas de soulignement d’onglet, pas de barre de progression en haut de page, pas de tiret dans le logo. Seuls les repères qui portent une donnée restent (niveau demandé sur une jauge, chapitres d’une vidéo).
5. **Une hiérarchie éditoriale.** Trois niveaux de texte suffisent : titre, corps, métadonnée. Peu de graisses, peu de tailles.
6. **Signature développeur.** Les métadonnées techniques (étiquettes `#apple`, versions, domaines) sont en **JetBrains Mono**. Le logo est le mot `devhub` en monospace, sans décor ; l’icône est un chevron `>` blanc sur bleu nuit.

## Couleurs (tokens dans `apps/web/src/styles/globals.css`)

| Token             | Clair     | Sombre    | Usage                                               |
| ----------------- | --------- | --------- | --------------------------------------------------- |
| `--bg-base`       | `#F7F8FA` | `#0A1022` | Fond de page                                        |
| `--surface-1`     | `#EEF1F6` | `#111A33` | Zone teintée à plat (encadré, champ)                |
| `--surface-2`     | `#E6EAF2` | `#17213D` | Survol d’une zone teintée                           |
| `--border`        | `#E3E6EE` | `#1F2A47` | Lignes de séparation                                |
| `--border-strong` | `#CDD3E0` | `#2A3657` | Bordure de champ                                    |
| `--text`          | `#0E1730` | `#E8ECF6` | Bleu nuit : texte principal                         |
| `--text-muted`    | `#4A5370` | `#A6AFC6` | Corps secondaire                                    |
| `--text-subtle`   | `#5F6884` | `#8C96B0` | Métadonnées (≥ 4,5:1)                               |
| `--accent`        | `#2348D6` | `#7B9BFF` | Bleu roi : liens, focus, sélection, verre teinté    |
| `.dh-ink`         | `#0E1730` | `#111A33` | Surface bleu nuit (barre latérale, barre d’onglets) |
| `--badge`         | `#E5484D` | `#E5484D` | Compteurs non lus (seul rouge vif de l’interface)   |

## Typographie

Police d’interface : **Inter** (variable, tailles optiques). Police technique : **JetBrains Mono**.

| Rôle             | Taille / interligne | Graisse | Exemple                           |
| ---------------- | ------------------- | ------- | --------------------------------- |
| Titre de page    | 24 / 1.25           | 650     | « Emplois »                       |
| Titre de post    | 19 / 1.3            | 600     | titre d’article dans le fil       |
| Titre de section | 13 / 1.4            | 600     | « Tendances » (rail)              |
| Corps            | 15 / 1.55           | 400     | extrait, description              |
| Interface        | 14 / 1.45           | 500     | navigation, boutons               |
| Métadonnée       | 13 / 1.4            | 400     | « 01net · il y a 2 h »            |
| Technique (mono) | 12.5 / 1.4          | 500     | `#react`, `v19.2.0`, `github.com` |

Pas de texte sous 12 px. Approche (letter-spacing) : `-0.011em` pour les titres, `0` pour le reste.

## Espacements

Échelle de 4 px : 4, 8, 12, 16, 20, 24, 32, 40, 48, 64. Un post du fil : 20 px au-dessus et au-dessous, séparé du suivant par une ligne. Colonne de lecture : 640 px.

## Rayons

| Élément                                   | Rayon                                             |
| ----------------------------------------- | ------------------------------------------------- |
| Page, barre latérale, sections            | 0                                                 |
| Image dans un post, encadré, zone teintée | 10 px                                             |
| Champ, menu                               | 8 px                                              |
| Bouton (verre)                            | capsule (plein), comme les commandes Liquid Glass |
| Dialogue                                  | 12 px                                             |
| Avatar, pastille, étiquette (chip)        | plein                                             |

Aucun rayon au-delà de 12 px.

## Ombres

| Niveau   | Valeur                                                         | Usage                        |
| -------- | -------------------------------------------------------------- | ---------------------------- |
| aucune   | —                                                              | tout ce qui est dans la page |
| `menu`   | `0 1px 2px rgb(0 0 0 / .06), 0 8px 24px -8px rgb(0 0 0 / .16)` | menus, popovers, toasts      |
| `dialog` | `0 24px 64px -16px rgb(0 0 0 / .28)`                           | dialogues, tiroir            |

## Composants

- **Boutons : Liquid Glass** (classes `.lg-tint`, `.lg-clear`, `.lg-ghost`) :
  - principal : verre **teinté bleu roi** (`.lg-tint`), texte blanc, un seul par vue ;
  - secondaire : verre **clair légèrement bleuté** (`.lg-clear`), texte bleu roi ;
  - discret : texte seul, le verre clair apparaît au survol (`.lg-ghost`) ;
  - matériau : flou et saturation de l’arrière-plan, reflet sur le haut, liseré lumineux ; à l’appui, le verre se comprime (97 %) ;
  - accessibilité : `prefers-reduced-transparency` → aplat ; `prefers-contrast: more` → contour net ; `prefers-reduced-motion` → pas de compression.
- **Navigation latérale** : surface bleu nuit ; trois groupes (l’essentiel, « Explorer », « Créer ») nommés en métadonnée, pas en capitales ; entrée active en verre teinté bleu roi ; une seule carte compte en bas.
- **Onglets et pastilles** : capsules ; actif en verre teinté, inactif en verre clair ou discret. Jamais de soulignement.
- **Post** : en-tête (favicon de la source 22 px, nom, temps, étiquette mono à droite), titre 19 px, extrait (3 lignes), image au ratio 2:1 avec rayon de 10 px, actions discrètes (Discuter · Enregistrer · Partager · domaine). Séparé du suivant par une ligne. Jamais de carte. Pas de « J’aime » ni de réactions.
- **Rail de droite** : « Tendances » (sujets comptés sur les vrais titres), « Ça discute » (vrais nombres de commentaires), « Emplois » ; titres de section en métadonnée, séparations par des lignes, sans carte.
- **Chiffres clés** (`StatCard`) : libellé, valeur 22 px, note ; bordure fine ; ni cube, ni courbe, ni carte sombre.
- **Badge de compteur** : rouge, texte blanc, plein rond.

## États d’interaction

| État       | Règle                                                                                  |
| ---------- | -------------------------------------------------------------------------------------- |
| Survol     | fond `--surface-1` ou soulignement ; 120 ms                                            |
| Pression   | `--surface-2`                                                                          |
| Focus      | contour 2 px `--accent`, décalé de 2 px ; jamais retiré                                |
| Désactivé  | opacité 50 %, pas de survol                                                            |
| Chargement | squelette à la forme du contenu ; jamais de spinner plein écran                        |
| Mouvement  | 120–200 ms, `ease-out` ; aucun mouvement décoratif ; respecte `prefers-reduced-motion` |

## Responsive

- **≥ 1280 px** : barre latérale (232 px) · fil (640 px) · rail (280 px).
- **1024–1279 px** : barre latérale · fil ; le rail disparaît.
- **< 1024 px** : barre du haut + tiroir ; barre d’onglets en bas sur mobile ; le fil prend toute la largeur avec 16 px de marge ; cibles tactiles de 44 px.
