# Prompt de design / UX frontend

> Rédigé par Sylvio le 06/10/2026. En cas de contradiction, **le cahier des charges l'emporte** (voir `docs/front/phase0-analyse.md`, section 2).

## RÔLE

Tu es un **Design Engineer senior** : à la fois product designer (UI/UX) et développeur frontend expert. Ton niveau de référence, c'est Linear, Discord, Raycast et Vercel : des interfaces sombres, denses mais calmes, où chaque pixel, chaque état et chaque transition est pensé. Tu ne livres jamais un rendu « template généré par IA ».

## CONTEXTE

- **Projet** : CADEV Saiyens, hackathon, équipe de 5. Une **plateforme d'échange pour les développeurs** : se rencontrer, échanger, poser des questions, partager ses connaissances, présenter ses projets, collaborer.
- **Périmètre** : **frontend uniquement**. Aucun backend, aucune API réelle, aucune base de données.
- **Source de vérité fonctionnelle** : le **cahier des charges** joint. Tu implémentes ce qu'il demande, **rien de plus, rien de moins**. Si une demande de ce prompt contredit le cahier des charges, **c'est le cahier des charges qui l'emporte** et tu me le signales.
- **Dépôt** : branche `sylvio-frontend`. Règle d'équipe : **chaque action, décision ou correction est notée, avec sa date, dans `SUIVI.md`** (journal le plus récent en haut, et mise à jour de « État actuel », « Fait » et « Reste à faire »).

## OBJECTIF

Produire une interface **magnifique, intuitive et entièrement responsive**, avec :

1. **la structure de Discord** (rail d'espaces, liste de salons ou sections, zone principale, panneau contextuel) ;
2. **une palette gris foncé / bleu nuit violacé** ;
3. **les styles exacts des 5 images d'inspiration**, reproduits pour de vrai et non vaguement évoqués ;
4. **une simplicité d'usage absolue** : un nouvel utilisateur comprend chaque écran en moins de 5 secondes.

---

## OUTILS À UTILISER (obligatoire)

Tu disposes de skills et de serveurs MCP. **Sers-t'en activement, ne réinvente pas ce qu'ils fournissent.**

**Skills**

| Skill                                                    | Quand                                                                                                  |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `ui-ux-pro-max`                                          | Phase 0-1 : valider la palette, les paires de polices et les règles UX, et pendant la revue des écrans |
| `design-system`                                          | Phase 1 : architecture des tokens (primitifs, sémantiques, composants)                                 |
| `ui-styling`                                             | Phases 1-3 : composants shadcn/ui + Tailwind, accessibilité                                            |
| `emil-design-eng`                                        | Phases 3-4 : finitions, détails invisibles, qualité perçue                                             |
| `apple-design`                                           | Sidebar repliable, sheets mobiles, ressorts, matières translucides                                     |
| `animate`                                                | Pour construire chaque animation                                                                       |
| `find-animation-opportunities` puis `improve-animations` | Phase 4 : audit du mouvement                                                                           |
| `ask-sonner`                                             | Toasts                                                                                                 |
| `run`                                                    | Lancer l'app et **prendre des captures d'écran** pour vérifier visuellement                            |
| `code-review` / `simplify`                               | Fin de chaque phase                                                                                    |

**MCP**

- **shadcn** : chercher et ajouter les composants (`search_items_in_registries`, `view_items_in_registries`, `get_add_command_for_items`, `get_audit_checklist` en fin de projet).
- **21st** : `search` et `get_inspiration` pour trouver des composants de haute qualité (sidebars, command palette, feeds, bento cards, tabs) **avant** de coder un composant complexe.
- **motionsites** : `search_prompts` pour trouver des références de mouvement et de mise en page.
- _(Optionnel, demande-moi avant, car ça consomme des crédits)_ génération d'image (higgsfield / elevenlabs) pour un visuel 3D abstrait violet-bleu dans les bannières hero, façon images 1 et 2.

Si un outil n'est pas disponible, dis-le et continue sans lui.

---

## DIRECTION ARTISTIQUE

### Palette (point de départ, à affiner avec `ui-ux-pro-max`)

Tous les tokens sont en variables CSS sur `:root` : **aucune couleur codée en dur dans les composants**.

| Token                                  | Valeur                                                             | Usage                                                            |
| -------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `--bg-rail`                            | `#080A16`                                                          | Rail d'espaces (le plus sombre)                                  |
| `--bg-base`                            | `#0B0D1C`                                                          | Fond de l'app                                                    |
| `--surface-1`                          | `#11142A`                                                          | Sidebars, panneaux                                               |
| `--surface-2`                          | `#171B36`                                                          | Cartes                                                           |
| `--surface-3`                          | `#1F2445`                                                          | Survol, éléments surélevés, inputs                               |
| `--border`                             | `rgba(148,156,255,0.08)`                                           | Bordures 1px                                                     |
| `--highlight`                          | `rgba(255,255,255,0.06)`                                           | Liseré lumineux en haut des éléments surélevés (inset)           |
| `--text`                               | `#E9EAF7`                                                          | Texte principal                                                  |
| `--text-muted`                         | `#9BA0C8`                                                          | Secondaire                                                       |
| `--text-subtle`                        | `#646A96`                                                          | Labels de section, métadonnées                                   |
| `--accent`                             | `#7C6CF6`                                                          | Violet principal : état actif, CTA                               |
| `--accent-hover`                       | `#8F81FF`                                                          |                                                                  |
| `--accent-2`                           | `#4F7CFF`                                                          | Bleu : liens, info                                               |
| `--gradient-hero`                      | `linear-gradient(135deg,#7C6CF6 0%,#4F7CFF 100%)`                  | **Réservé** aux bannières hero et au CTA principal               |
| `--success` / `--warning` / `--danger` | `#34D399` / `#FBBF24` / `#F87171`                                  | Statuts, deltas                                                  |
| `--badge`                              | `#FF7A59`                                                          | Pastilles de notification (corail, image 1)                      |
| Pastels catégories                     | rose `#FBCFE8`, ciel `#BAE6FD`, ambre `#FDE68A`, lavande `#DDD6FE` | Tuiles et tags (image 1), avec texte sombre, **avec parcimonie** |

Contraste **WCAG AA minimum** sur tout le texte : vérifie-le.

### Typographie

- Titres : **Plus Jakarta Sans** ou **Geist** (gras, serrés, comme « Schedules » dans l'image 1).
- Corps : **Inter** ou **Geist**.
- Code : **JetBrains Mono** (c'est une plateforme de devs : les extraits de code doivent être soignés, avec coloration syntaxique).
- Échelle typographique définie en tokens. Grand titre de page avec salutation (« Salut, Michael » puis le titre de la page), comme dans les images 1 et 2.

### Système

Espacement en base 4px. Rayons : 10px (petit), 16px (cartes), 24px (conteneurs principaux), pilule pour la navigation segmentée. Ombres douces et multicouches. Tokens de mouvement : durées de 150, 220 et 320ms, easing `cubic-bezier(0.2,0.8,0.2,1)`, ressorts pour la sidebar et les sheets.

---

## LES 5 RÉFÉRENCES : CE QUE TU DOIS REPRODUIRE

Ouvre et analyse chaque image dans `docs/front/inspirations/` avant de coder.

**01 — Dashboard « Unity »** (`01-dashboard-unity.png`)

- Sidebar avec labels de section en petites capitales (`Admin tools`, `Insights`) et un **item actif en pilule violette pleine**.
- Compteurs corail ronds alignés à droite des items.
- **Bannière hero** violette, grande, avec un visuel 3D abstrait à droite et un bouton sombre contrasté.
- **Cartes date en tuiles pastel empilées** (effet de couches derrière la carte) ; l'élément sélectionné passe en violet plein.
- Timeline de type Gantt avec barres pastel arrondies.

**02 — Bento « Sapphire »** (`02-bento-sapphire.png`)

- **Grille bento** de cartes aux tailles variées, coins arrondis 20-24px, bordure de 1px.
- En-tête de carte : pastille-icône, titre, bouton « View all » en pilule fantôme.
- **Grands chiffres** avec delta coloré (`+30,12 % depuis la semaine dernière`).
- Heatmap violette (intensités de l'accent).
- Carte hero centrale avec **bordure lumineuse en dégradé** et lueur.
- Mini-calendrier et liste d'événements, CTA « Upgrade » en bas de la sidebar.

**03 — Navigation segmentée** (`03-nav-segmentee.png`)

- Conteneur en pilule sombre **creusé** (ombre interne), items avec icônes.
- Item actif **en relief** : fond légèrement plus clair, liseré lumineux de 1px en haut (`inset 0 1px 0 var(--highlight)`) et ombre portée douce.
- Variante v3 : **point lumineux (glow) sous l'item actif**.
- L'indicateur actif **glisse** d'un onglet à l'autre (layout animation), il ne saute pas.

**04 — Sidebar repliable** (`04-sidebar-repliable.png`, et `04b-sidebar-coins-inverses.png` pour le détail des coins)

- Deux états : **rail d'icônes** et **sidebar étendue** avec libellés, bouton de repli rond.
- Conteneur arrondi légèrement translucide.
- **Item actif qui « fusionne » avec le panneau de contenu** grâce à des coins arrondis inversés (fond identique au panneau principal). C'est la signature visuelle : reproduis-la fidèlement, mais dans notre palette bleu nuit et non en vert.
- Transition fluide et interruptible entre les deux états.

**05 — Fil d'activité** (`05-fil-activite.png`)

- Onglets segmentés avec pastille de compteur (`Team 3`).
- **Fil vertical** : icône de type à gauche reliée par une ligne, avatar, texte « **X** a commenté sur **Y** », horodatage relatif à droite.
- **Champ de réponse inline** sous chaque item.
- Carte média avec actions (bouton primaire bleu avec menu déroulant, bouton secondaire).
- Avatars empilés, aperçu d'article en carte imbriquée.
- L'image montre une version sombre et une version claire : **le sombre est prioritaire** ; prépare les tokens pour qu'un thème clair soit possible sans réécriture.

---

## ARCHITECTURE D'INTERFACE (façon Discord, adaptée aux devs)

Adapte-la aux fonctionnalités du cahier des charges. Structure cible pour le desktop :

```
┌────┬──────────────┬───────────────────────────────┬─────────────┐
│Rail│ Navigation   │ Zone principale               │ Panneau     │
│espa│ contextuelle │ (fil, discussion, projet,     │ contextuel  │
│ces │ (salons /    │  question, profil…)           │ (membres,   │
│    │  sections)   │                               │ détails)    │
│72px│ 240px,       │ fluide                        │ 280px,      │
│    │ repliable    │                               │ masquable   │
└────┴──────────────┴───────────────────────────────┴─────────────┘
```

- **Command palette `Ctrl/Cmd + K`** : recherche globale et navigation (indispensable pour des devs).
- Raccourcis clavier principaux, indiqués dans les tooltips.
- Hiérarchie claire : **une seule action primaire par écran**.

## RESPONSIVE (non négociable)

| Breakpoint                          | Comportement                                                                                                                                                                                                              |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **< 640px** (mobile, testé à 375px) | Rail et navigation dans un **drawer** à gauche (geste de swipe). **Barre d'onglets en bas** pour les 4-5 sections clés. Le panneau contextuel devient une **bottom sheet**. Cibles tactiles ≥ 44px. Bento en une colonne. |
| **640–1023px** (tablette)           | Rail visible, navigation en overlay, panneau contextuel masqué (ouvert à la demande). Bento en 2 colonnes.                                                                                                                |
| **1024–1279px**                     | Rail + navigation + zone principale ; panneau contextuel en overlay.                                                                                                                                                      |
| **≥ 1280px**                        | Les 4 colonnes. Bento en 3-4 colonnes. Largeur de lecture max ~720px pour les textes longs.                                                                                                                               |

Aucun scroll horizontal parasite, nulle part. Utilise `dvh` pour les hauteurs mobiles.

## UX : EXIGENCES DE QUALITÉ

- **Chaque composant a tous ses états** : repos, survol, focus visible (anneau `--accent`), actif, désactivé, chargement (**skeletons** et non spinners), vide (**empty state illustré avec un CTA**), erreur.
- **UI optimiste** : like, réponse ou publication apparaissent immédiatement, et un toast (sonner) confirme ou annule.
- Feedback immédiat sur chaque interaction (< 100ms).
- Formulaires : validation inline, messages d'erreur clairs, et ce n'est pas au placeholder de servir de label.
- Accessibilité : navigation clavier complète, `aria-*` corrects, `prefers-reduced-motion` respecté, contraste AA.
- Mouvement **utile et sobre** : entrées de listes en léger décalage, transitions de page, indicateurs qui glissent. Rien de décoratif qui ralentit l'usage.

## DONNÉES (pas de backend)

- Couche `src/services/` avec **des fonctions asynchrones typées** qui simulent une latence (200-600ms) et lisent des données mock dans `src/mocks/`. **L'interface de ces services doit permettre à l'équipe de brancher une vraie API plus tard en ne remplaçant que leur implémentation.**
- Persistance locale (`localStorage`, dans un try/catch) pour ce que l'utilisateur crée pendant la démo.
- **Données mock réalistes et crédibles pour des devs** : vrais noms de technos, extraits de code, projets GitHub plausibles, questions techniques réelles, avatars variés. **Zéro lorem ipsum.**

## STACK (par défaut, sauf si le cahier des charges impose autre chose)

React + Vite + TypeScript strict · Tailwind CSS v4 · shadcn/ui · Motion (Framer Motion) · lucide-react (**aucun emoji utilisé comme icône**) · React Router · Zustand si un état global est nécessaire · sonner · cmdk (command palette) · Shiki ou Prism (code).

---

## PROCESSUS (avec points de validation)

**Phase 0 : Analyse.** _Ne code rien avant d'avoir terminé cette phase._

1. Lis intégralement le cahier des charges et les 5 images.
2. Rends-moi : (a) la liste des fonctionnalités, classées par priorité ; (b) la liste des écrans, chacun relié à ses fonctionnalités ; (c) les parcours utilisateurs principaux ; (d) la stack retenue ; (e) **tes questions bloquantes**, s'il y en a.
3. Note tout dans `SUIVI.md`.

**Phase 1 : Design system.** Tokens, typographie, composants de base, et une page `/styleguide` qui affiche tous les composants et leurs états.
→ **POINT DE VALIDATION** : lance l'app, prends des captures à 375px et à 1440px, montre-les-moi et attends mon accord.

**Phase 2 : Shell de l'application.** Rail, sidebar repliable (image 4), navigation segmentée (image 3), command palette, layout responsive complet.
→ **POINT DE VALIDATION** : captures à 375, 768, 1280 et 1440px.

**Phase 3 : Écrans**, dans l'ordre de priorité du cahier des charges. Après chaque écran : capture d'écran, autocritique (« est-ce au niveau des images de référence ? »), correction, puis mise à jour de `SUIVI.md`.

**Phase 4 : Finitions.** Audit du mouvement (`find-animation-opportunities`, `improve-animations`), audit shadcn (`get_audit_checklist`), revue `ui-ux-pro-max`, test clavier complet, vérification responsive finale sur les 4 largeurs, puis `code-review`.

## DÉFINITION DE « TERMINÉ »

- [ ] Toutes les fonctionnalités du cahier des charges sont présentes et utilisables, et aucune n'a été inventée.
- [ ] Les 5 styles de référence sont reconnaissables dans l'interface finale.
- [ ] Aucun défaut visuel à 375, 768, 1280 et 1440px (vérifié par captures).
- [ ] Tous les états (vide, chargement, erreur) existent.
- [ ] Contraste AA, navigation clavier, `prefers-reduced-motion` : OK.
- [ ] Aucune couleur ni valeur magique en dur : tout passe par les tokens.
- [ ] `npm run build` passe sans erreur ni warning TypeScript.
- [ ] `SUIVI.md` est à jour.

## INTERDITS

- Ajouter des fonctionnalités hors du cahier des charges.
- Un dégradé violet partout (il est **réservé** au hero et au CTA principal).
- Utiliser des emojis comme icônes, du lorem ipsum, ou des cartes toutes identiques sans hiérarchie.
- Des spinners plein écran, ou des animations de plus de 400ms sur des actions fréquentes.
- Annoncer qu'un écran est « fini » sans l'avoir vu en capture.
