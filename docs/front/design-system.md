# DevHub — Design system et patterns (v3)

- **Plateforme** : DevHub Africa, « la plateforme d'échange des devs africains, par les devs, pour les devs »
- **En ligne** : https://devafrica.tech (application), https://business.devafrica.tech (portail entreprise), https://admin.devafrica.tech (administration)
- **Version** : v3, relevée dans le code le 10/11/2026. Remplace la v2 du 08/10/2026 (Inter, bleu nuit, « jamais de soulignement »), qui ne correspond plus au site.
- **Source de vérité mécanique** : `apps/web/src/styles/globals.css` (tokens, composants CSS, animations). Ce document en donne toutes les valeurs, les règles d'usage et les recettes.

---

## 0. Mode d'emploi

Ce fichier suffit pour construire un site ou une application **dans exactement le même style visuel** que DevHub, sans avoir le code sous les yeux.

Ordre de lecture recommandé :

1. **§1 Principes** : les règles qui ne se discutent pas (décisions de Sylvio).
2. **§3 Tokens** : le bloc CSS à copier tel quel. Tout le reste en découle.
3. **§4 à §8** : typographie, couleurs, logo, icônes, mascotte.
4. **§9 à §12** : mise en page, surfaces, composants, animations.
5. **§13 à §17** : patterns de pages, responsive, accessibilité, rédaction, thèmes.
6. **§18 Check-list** avant de livrer un écran, **§19 Recette** pour démarrer un projet.

Pour un agent de code (Claude Code, Cursor…) : lis ce fichier en entier avant d'écrire du CSS ; n'invente aucune valeur qui s'y trouve ; en cas de doute, ouvre le fichier cité dans §20 et recopie la valeur exacte.

---

## 1. Identité et principes

**Positionnement visuel** : un réseau professionnel pour développeurs, **riche et informatif comme LinkedIn**, avec la précision d'un outil de dev (GitHub). Pas un tableau de bord SaaS minimaliste, pas un « template propre ».

Les règles, par ordre d'importance :

1. **Poppins partout** (interface, titres, boutons). JetBrains Mono seulement pour le code et les données techniques. Jamais de police serif ou cursive d'accent.
2. **De grands éléments** : corps de texte 15 px minimum dans le contenu, boutons de 40 à 48 px de haut, avatars généreux, cartes aérées. On doit pouvoir lire sans plisser les yeux.
3. **Un seul accent bleu** (bleu roi) pour l'action et la sélection. Le turquoise n'existe que dans la marque (logo, « Hub », dégradés de la marque).
4. **Des gris neutres façon Discord** : fond gris clair `#F2F3F5` ou anthracite `#313338`, cartes blanches ou `#2B2D31`, barre latérale `#1E1F22` dans les deux thèmes.
5. **Contenu réel uniquement** : aucun chiffre, avis, entreprise ou personne inventés. Sans données, l'écran le dit (état vide illustré par Djeli).
6. **Pas de pastille verte qui clignote** ni de panneau « En direct ». Le vert est réservé à ce qui est vérifié ou réussi.
7. **La page d'accueil publique est toujours sombre**, sans bouton clair/sombre. Le reste du site suit le thème choisi.
8. **Djeli, la mascotte, porte la personnalité** : il accueille, explique, fête et anime les états vides. L'interface autour reste sobre.
9. **Sur mobile, pas de bandes empilées** : les groupes de cartes deviennent des carrousels à faire glisser, des frises ou des grilles 2 × 2.
10. **Un bouton « Retour » en haut de chaque page**, sauf l'accueil.
11. **« Ne pas préciser » est toujours possible** dans un formulaire de profil ou d'onboarding.

---

## 2. Stack

| Couche                 | Choix                                                                                       | Notes                                    |
| ---------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------- |
| UI                     | React 19 + TypeScript                                                                       | composants fonctionnels                  |
| Build                  | Vite 8                                                                                      | PWA (`vite-plugin-pwa`)                  |
| Styles                 | **Tailwind CSS v4**                                                                         | tokens CSS + pont `@theme inline` (§3.3) |
| Primitives accessibles | Radix UI                                                                                    | Dialog, DropdownMenu, Popover, Tooltip   |
| Palette de commandes   | `cmdk`                                                                                      | ouverte par Ctrl K                       |
| Notifications          | `sonner`                                                                                    | en bas au centre (§11.17)                |
| Icônes                 | `@phosphor-icons/react` (navigation, graisse `fill`) + `lucide-react` (actions, trait 1,75) | §7                                       |
| Animations             | CSS d'abord ; `motion` seulement si nécessaire                                              | §12                                      |
| Polices                | `@fontsource/poppins` 400, 500, 600, 700 ; `@fontsource-variable/jetbrains-mono`            | auto-hébergées, licence OFL              |
| Variantes              | `class-variance-authority` + `cn()` (clsx + tailwind-merge)                                 |                                          |

Installation minimale :

```bash
pnpm add react react-dom react-router @radix-ui/react-dialog @radix-ui/react-dropdown-menu \
  cmdk sonner lucide-react @phosphor-icons/react class-variance-authority clsx tailwind-merge \
  @fontsource/poppins @fontsource-variable/jetbrains-mono
pnpm add -D tailwindcss @tailwindcss/vite
```

---

## 3. Tokens

### 3.1 Couleurs par thème (à copier tel quel)

Le thème se pose sur `<html data-theme="light|dark">`. Aucune couleur en dur dans les composants : tout passe par ces variables.

```css
@import 'tailwindcss';
@import '@fontsource/poppins/400.css';
@import '@fontsource/poppins/500.css';
@import '@fontsource/poppins/600.css';
@import '@fontsource/poppins/700.css';

:root,
:root[data-theme='light'] {
  color-scheme: light;
  --bg-rail: #1e1f22; /* barre latérale (identique dans les deux thèmes) */
  --bg-nav: #1e1f22;
  --bg-base: #f2f3f5; /* fond de page */
  --surface-1: #ffffff; /* cartes */
  --surface-2: #ebedef; /* survol, zones teintées, étiquettes */
  --surface-3: #e3e5e8; /* troisième palier (puces, pistes de barres) */
  --surface-inset: #f2f3f5; /* fonds de champs encastrés */
  --border: #e1e2e4;
  --border-strong: #c4c9ce; /* bordure de champ, carte au survol */

  --text: #060607; /* presque noir : aucun gris pâle pour lire */
  --text-muted: #313338;
  --text-subtle: #4e5058; /* métadonnées, toujours ≥ 4,5:1 */
  --text-on-accent: #ffffff;

  --glass-bg: rgba(255, 255, 255, 0.68);
  --glass-strong: rgba(255, 255, 255, 0.82);
  --glass-edge: rgba(255, 255, 255, 0.75);
  --glass-line: rgba(6, 6, 7, 0.07);
  --glass-sheen: inset 0 1px 0 rgba(255, 255, 255, 0.9);
  --page-tint-1: rgba(88, 101, 242, 0.1);
  --page-tint-2: rgba(14, 165, 233, 0.08);
  --page-tint-3: rgba(236, 72, 153, 0.05);

  --accent: #1d4ed8; /* bleu roi : action principale, liens, focus, sélection */
  --accent-hover: #1e40af;
  --accent-text: #1d4ed8; /* accent utilisé comme couleur de texte */
  --accent-soft: rgba(29, 78, 216, 0.08);
  --accent-2: #0e7490; /* bleu-vert secondaire (rare) */
  --accent-2-text: #0e7490;
  --accent-2-soft: rgba(14, 116, 144, 0.08);

  --gold: #b7791f;
  --gold-text: #8a5a12;
  --gold-soft: rgba(183, 121, 31, 0.1);
  --teal: #0f766e;
  --teal-text: #0f766e;
  --live: #16a34a;

  --success: #166534;
  --success-soft: rgba(21, 128, 61, 0.08);
  --warning: #b45309;
  --warning-soft: rgba(180, 83, 9, 0.08);
  --danger: #c62828;
  --danger-soft: rgba(198, 40, 40, 0.07);
  --badge: #dc2626;
  --badge-text: #ffffff; /* compteurs non lus : seul rouge vif */

  --pastel-rose: #f6ecef;
  --pastel-sky: #eaf1f7;
  --pastel-amber: #f6f0e3;
  --pastel-lavender: #ebeef8;
  --pastel-mint: #e8f3ec;
  --pastel-text: #111827;

  --score-g: #1d4ed8;
  --score-p: #15803d; /* score GitHub / score plateforme */
  --cell-0: #e9ecf1;
  --cell-1: #b7e4c4;
  --cell-2: #6bc58a;
  --cell-3: #2f9e5a;
  --cell-4: #1a6f3c;

  --map-land: #c3cbd8;
  --map-land-muted: #d7dde6;
  --map-border: #ffffff;

  --shadow-sm: 0 1px 2px rgb(17 24 39 / 0.05);
  --shadow-md: 0 1px 2px rgb(17 24 39 / 0.05), 0 8px 24px -12px rgb(17 24 39 / 0.14);
  --shadow-lg: 0 24px 64px -16px rgb(17 24 39 / 0.22), 0 0 0 1px rgb(17 24 39 / 0.06);
  --shadow-card: 0 1px 2px rgb(17 24 39 / 0.04);
  --scrim: rgba(17, 24, 39, 0.45);

  --code-bg: #f6f7f9;
  --code-fg: #111827;
  --code-comment: #5f687a;
  --code-keyword: #1d4ed8;
  --code-string: #15803d;
  --code-number: #b45309;
  --code-function: #0e7490;
  --code-tag: #be185d;
  --code-punct: #4b5565;
}

:root[data-theme='dark'] {
  color-scheme: dark;
  --bg-rail: #1e1f22;
  --bg-nav: #1e1f22;
  --bg-base: #313338;
  --surface-1: #2b2d31;
  --surface-2: #383a40;
  --surface-3: #404249;
  --surface-inset: #232428;
  --border: #3f4147;
  --border-strong: #4e5058;

  --text: #f2f3f5;
  --text-muted: #dbdee1;
  --text-subtle: #b5bac1;
  --text-on-accent: #ffffff;

  --glass-bg: rgba(43, 45, 49, 0.62);
  --glass-strong: rgba(43, 45, 49, 0.82);
  --glass-edge: rgba(255, 255, 255, 0.08);
  --glass-line: rgba(255, 255, 255, 0.06);
  --glass-sheen: inset 0 1px 0 rgba(255, 255, 255, 0.06);
  --page-tint-1: rgba(88, 101, 242, 0.14);
  --page-tint-2: rgba(14, 165, 233, 0.08);
  --page-tint-3: rgba(236, 72, 153, 0.06);

  --accent: #2563eb;
  --accent-hover: #3b74f0;
  --accent-text: #8fb3ff; /* l'accent en texte s'éclaircit en sombre */
  --accent-soft: rgba(96, 140, 255, 0.12);
  --accent-2: #22b8cf;
  --accent-2-text: #7dd8e6;
  --accent-2-soft: rgba(34, 184, 207, 0.12);

  --gold: #e3a93b;
  --gold-text: #f0c46e;
  --gold-soft: rgba(227, 169, 59, 0.12);
  --teal: #2dc4b0;
  --teal-text: #6fdccd;
  --live: #4cc38a;

  --success: #4cc38a;
  --success-soft: rgba(76, 195, 138, 0.1);
  --warning: #f0b84c;
  --warning-soft: rgba(240, 184, 76, 0.1);
  --danger: #ef6b6f;
  --danger-soft: rgba(239, 107, 111, 0.1);
  --badge: #e5484d;
  --badge-text: #ffffff;

  --pastel-rose: #2a2026;
  --pastel-sky: #1b2530;
  --pastel-amber: #2b261c;
  --pastel-lavender: #1c2133;
  --pastel-mint: #1a2a22;
  --pastel-text: #eef0f5;

  --score-g: #8fb3ff;
  --score-p: #4cc38a;
  --cell-0: #191d27;
  --cell-1: #173d29;
  --cell-2: #1f6b42;
  --cell-3: #2f9e5f;
  --cell-4: #4cc38a;

  --map-land: #5a5e69;
  --map-land-muted: #464952;
  --map-border: #1e1f22;

  --shadow-sm: none;
  --shadow-md: 0 1px 2px rgb(0 0 0 / 0.4), 0 8px 24px -8px rgb(0 0 0 / 0.6);
  --shadow-lg: 0 24px 64px -16px rgb(0 0 0 / 0.7), 0 0 0 1px rgb(255 255 255 / 0.06);
  --shadow-card: none;
  --scrim: rgba(0, 0, 0, 0.6);

  --code-bg: #0f121a;
  --code-fg: #e4e6ec;
  --code-comment: #858c9c;
  --code-keyword: #8fb3ff;
  --code-string: #86d9a8;
  --code-number: #f0b884;
  --code-function: #7dd8e6;
  --code-tag: #f2a5c8;
  --code-punct: #a8aebd;
}
```

### 3.2 Système (rayons, durées, gabarits)

```css
:root {
  --radius-sm: 8px;
  --radius-md: 10px;
  --radius-lg: 12px;
  --radius-pill: 999px;

  --dur-fast: 150ms;
  --dur-base: 220ms;
  --dur-slow: 320ms;
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1); /* l'easing de tout le site */
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1); /* tiroirs et feuilles */

  --side-bg: #1e1f22;
  --topbar-h: 52px;
  --tabbar-h: 64px;
  --reading-w: 720px;
}
```

### 3.3 Pont Tailwind v4

Les utilitaires Tailwind lisent les variables, donc suivent le thème : `bg-canvas`, `bg-surface-1`, `text-fg`, `text-muted`, `text-subtle`, `border-line`, `border-line-strong`, `bg-accent`, `text-accent-text`, `bg-accent-soft`, `text-success`, `bg-warning-soft`…

```css
@theme inline {
  --font-display: 'Poppins', ui-sans-serif, system-ui, sans-serif;
  --font-sans:
    'Poppins', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif;
  --font-mono:
    'JetBrains Mono Variable', ui-monospace, 'SF Mono', 'Cascadia Code', Menlo, monospace;

  --color-canvas: var(--bg-base);
  --color-surface-1: var(--surface-1);
  --color-surface-2: var(--surface-2);
  --color-surface-3: var(--surface-3);
  --color-inset: var(--surface-inset);
  --color-line: var(--border);
  --color-line-strong: var(--border-strong);
  --color-fg: var(--text);
  --color-muted: var(--text-muted);
  --color-subtle: var(--text-subtle);
  --color-accent: var(--accent);
  --color-accent-hover: var(--accent-hover);
  --color-accent-text: var(--accent-text);
  --color-accent-soft: var(--accent-soft);
  --color-success: var(--success);
  --color-success-soft: var(--success-soft);
  --color-warning: var(--warning);
  --color-warning-soft: var(--warning-soft);
  --color-danger: var(--danger);
  --color-danger-soft: var(--danger-soft);
  --color-badge: var(--badge);
  --color-badge-fg: var(--badge-text);
  --radius-sm: var(--radius-sm);
  --radius-md: var(--radius-md);
  --radius-lg: var(--radius-lg);
  --shadow-md: var(--shadow-md);
  --shadow-lg: var(--shadow-lg);
  --ease-out: var(--ease-out);
}
```

### 3.4 Base

```css
@layer base {
  * {
    border-color: var(--border);
  }
  html {
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }
  body {
    margin: 0;
    /* trois halos très doux, loin du bord gauche (les coins inversés du menu tombent sur l'uni) */
    background:
      radial-gradient(900px 560px at 72% -12%, var(--page-tint-1), transparent 70%),
      radial-gradient(800px 520px at 108% 30%, var(--page-tint-2), transparent 70%),
      radial-gradient(900px 640px at 70% 115%, var(--page-tint-3), transparent 70%), var(--bg-base);
    background-attachment: fixed;
    color: var(--text);
    font-family: var(--font-sans);
    font-size: 15px;
    line-height: 1.55;
    min-height: 100dvh;
    overflow-x: hidden;
  }
  h1,
  h2 {
    font-family: var(--font-display);
    letter-spacing: -0.01em;
    line-height: 1.2;
    text-wrap: balance;
  }
  h3,
  h4 {
    letter-spacing: 0;
    line-height: 1.35;
  }
  p {
    text-wrap: pretty;
  }
  ::selection {
    background: var(--accent-soft);
    color: var(--text);
  }
  :focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
    border-radius: 6px;
  }
  button:not(:disabled),
  [role='button'],
  [role='tab'],
  summary,
  label[for],
  select {
    cursor: pointer;
  }
  svg.lucide {
    stroke-width: 1.75;
  }
  * {
    scrollbar-width: thin;
    scrollbar-color: var(--surface-3) transparent;
  }
}
```

---

## 4. Typographie

**Poppins** pour tout (400 corps, 500 interface, 600 sous-titres et boutons, 700 titres). **JetBrains Mono** (variable) pour le code, les commandes, les codes de certificat, les noms de skills.

Graisses : ne jamais charger moins de 400/500/600/700 (sinon le gras est simulé par le navigateur et bave).

### 4.1 Échelle

| Rôle                             | Taille (mobile → ≥ 640 px)   | Interligne | Graisse | Approche            | Exemple                                                 |
| -------------------------------- | ---------------------------- | ---------- | ------- | ------------------- | ------------------------------------------------------- |
| Héros (accueil public)           | 42 → 68 px                   | 1,02       | 700     | −0,035em            | « La plateforme d'échange des devs africains. »         |
| Titre de section marketing       | 34 → 48 px                   | 1,06       | 700     | −0,03em             | « Ton IA a écrit le code. DevHub vérifie qu'il tient. » |
| Titre de page (application)      | 28 → 32 px                   | 1,1        | 700     | −0,02em             | « Emplois », « Carte de l'Afrique »                     |
| Titre de détail (offre, post)    | 24 → 30 px                   | 1,15       | 700     | −0,02em             | titre d'une offre                                       |
| Titre de carte importante        | 22 px                        | 1,25       | 700     | −0,02em             | piliers de l'accueil                                    |
| Titre de post dans le fil        | 19–20 px                     | 1,3        | 600     | 0                   | titre d'article                                         |
| Sous-titre de section            | 16–18 px                     | 1,35       | 600     | 0                   | « Le poste », « Filtres »                               |
| Corps                            | 15 px (17 px dans les héros) | 1,55       | 400     | 0                   | descriptions, extraits                                  |
| Interface (nav, boutons, champs) | 14–15 px                     | 1,45       | 500–600 | 0                   | « Créer », « Accueil »                                  |
| Métadonnée                       | 12,5–13,5 px                 | 1,4        | 400–500 | 0                   | « Jobicy · il y a 12 h »                                |
| Étiquette / puce                 | 12–13 px                     | 1          | 500–600 | 0                   | `full-time`, `EMEA`                                     |
| Capitales de rubrique            | 11 px                        | 1,4        | 600     | +0,04em, majuscules | `.label-caps`                                           |
| Code                             | 12,5–14 px mono              | 1,5        | 500     | 0                   | `dh_pat_…`, `DH-WEB-7K2Q-M9XD`                          |

Règles :

- **Rien sous 11 px**, et 11 px seulement pour les capitales de rubrique et les compteurs.
- Les titres `h1` et `h2` ont `text-wrap: balance` ; les paragraphes `text-wrap: pretty`.
- Un mot clé du titre peut porter le **dégradé de la marque** (`bg-gradient-to-r from-[#7fb0ff] to-[#5eead4] bg-clip-text text-transparent`), sur fond sombre uniquement et une fois par page.
- Chiffres alignés : `font-variant-numeric: tabular-nums` (utilitaire `tabular`) dans les tableaux, compteurs et statistiques.
- Couleur du texte : `text-fg` pour lire, `text-muted` pour le secondaire, `text-subtle` pour les métadonnées. Sur fond sombre fixe : `text-white`, `text-white/80`, `text-white/60`.

---

## 5. Couleurs d'usage

### 5.1 Rôles

| Besoin                      | Token / classe                       | Ne pas faire                          |
| --------------------------- | ------------------------------------ | ------------------------------------- |
| Fond de page                | `bg-canvas`                          | du blanc pur en pleine page (clair)   |
| Carte                       | `bg-surface-1` + `rounded-[10–24px]` | une bordure épaisse                   |
| Survol d'une ligne ou carte | `bg-surface-2`                       | changer la taille                     |
| Étiquette, piste de jauge   | `bg-surface-3`                       |                                       |
| Action principale           | `.lg-tint` (accent)                  | deux actions principales dans une vue |
| Lien, sélection, focus      | `text-accent-text`, `ring-accent`    | du violet                             |
| Réussi, vérifié             | `text-success`, `bg-success-soft`    | une pastille verte qui clignote       |
| Attention                   | `text-warning`, `bg-warning-soft`    |                                       |
| Erreur, suppression         | `text-danger`, `bg-danger-soft`      |                                       |
| Compteur non lu             | `bg-badge text-badge-fg`             | une autre couleur vive                |

### 5.2 Couleurs de la marque

| Nom                              | Valeur                                                                  | Usage                                                          |
| -------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------- |
| Dégradé du symbole               | `#0a6cff` → `#10b0f0` → `#20e2b4` (diagonale, bas-gauche → haut-droite) | logo uniquement                                                |
| « Hub » sur fond clair           | `#0d9488`                                                               | mot-symbole                                                    |
| « Hub » sur fond sombre          | `#5eead4`                                                               | mot-symbole, accents de héros                                  |
| Dégradé de barre / bouton marque | `#2563eb` → `#2dd4bf`                                                   | barres de score de la Proof Card, anneaux d'avatar             |
| Halo bleu (fond sombre)          | `radial-gradient(… rgba(37,99,235,0.45) …)` en haut à droite            | héros sombres, Proof Card                                      |
| Halo turquoise (fond sombre)     | `radial-gradient(… rgba(20,184,166,0.22) …)` en bas à gauche            | idem                                                           |
| Fond sombre profond              | `#111214`                                                               | bandeaux marketing, Proof Card                                 |
| Fond sombre standard             | `#1e1f22`                                                               | barre latérale, pied de page, bandeaux « Du prompt à la prod » |

### 5.3 Couleurs des services et des piliers

Utilisées pour de petites tuiles d'icône (fond à 15 % d'opacité, icône pleine), jamais pour de grandes surfaces.

| Pilier / service                  | Fond de tuile    | Icône     |
| --------------------------------- | ---------------- | --------- |
| Réseau (fil, entraide)            | `#3b82f6` à 15 % | `#7fb0ff` |
| Progresser (certifications)       | `#f59e0b` à 15 % | `#fbbf5a` |
| Livrer (pré-vol, banc)            | `#14b8a6` à 15 % | `#4fd1c5` |
| Portail entreprise : vérifiées    | `#e8efff`        | `#2563eb` |
| Portail entreprise : compétences  | `#dcfaf5`        | `#0d9488` |
| Portail entreprise : offres       | `#fdf3e2`        | `#b45309` |
| Portail entreprise : candidatures | `#f1e8ff`        | `#7c3aed` |

Couleurs historiques des services (`SERVICE_COLORS`, encore lues par quelques composants) : fil `#ff6b3d`, entraide `#f2575a`, emplois `#22a3ee`, certifications `#f0b232`, skills `#3b5bdb`, projets `#4f7cff`.

### 5.4 Données

- **Graphe de contributions** : 5 paliers `--cell-0` à `--cell-4` (vert).
- **Carte de l'Afrique** : terres `--map-land`, frontières `--map-border` ; paliers = `color-mix(in oklab, var(--accent) 38 | 58 | 80 %, var(--map-land))` puis `--accent` plein.
- **Coloration du code** : tokens `--code-*` (§3.1).

---

## 6. Logo et marque

### 6.1 Symbole

Chevrons `<` et `>` reliés par un S, en trait arrondi, dans le dégradé de la marque. SVG de référence (`apps/web/src/components/brand.tsx`) :

```html
<svg viewBox="0 0 100 80" width="34" height="27" aria-hidden="true">
  <defs>
    <linearGradient id="dh-mark" x1="0" y1="0.75" x2="1" y2="0.25">
      <stop offset="0" stop-color="#0a6cff" />
      <stop offset="0.5" stop-color="#10b0f0" />
      <stop offset="1" stop-color="#20e2b4" />
    </linearGradient>
  </defs>
  <g fill="none" stroke="url(#dh-mark)" stroke-linecap="round" stroke-linejoin="round">
    <path d="M35 21 12 40l17 14" stroke-width="9" />
    <path d="M65 26l23 14-21 16" stroke-width="9" />
    <path d="M19 65c10 7 21 4 25-8l10-34c4-11 15-14 25-7" stroke-width="8" />
  </g>
</svg>
```

Variante monochrome : `stroke="currentColor"` (favicon sur fond uni, impression).

### 6.2 Logo complet

Symbole + mot « Dev**Hub** » en Poppins 700, approche −0,035em, taille du texte = 0,62 × hauteur du symbole, écart 8 px.

- « Dev » : `text-fg` (clair) ou blanc (sombre).
- « Hub » : `#0d9488` sur clair, `#5eead4` sur sombre.
- Déclinaison « DevHub **Business** » : « Business » en Poppins 500, `text-white/70`, après une espace.

Tailles : 34 px dans les en-têtes, 30 px dans l'onboarding, 24 px minimum. Zone de protection : la hauteur du symbole tout autour.

Interdits : recolorer le symbole en une seule couleur vive, l'enfermer dans un carré coloré, le remplacer par le texte `</>`, ajouter une ombre, déformer les proportions.

### 6.3 Images de partage

La **Proof Card** (1200 × 630, `apps/api/src/modules/passport/domain/proof-card.ts`) est la référence des visuels de partage : fond `#111214` avec halos bleu et turquoise, logo en haut à gauche, pastille « Developer Passport » en haut à droite, avatar à anneau dégradé, panneau `#1e1f22` à bords `rgba(255,255,255,0.08)` et rayon 26 px pour les compétences, tuiles de chiffres de rayon 20 px, pied « devafrica.tech/u/<pseudo> » à gauche et « Par les devs, pour les devs » à droite.

---

## 7. Iconographie

Deux familles, chacune avec un rôle précis. Jamais d'autres bibliothèques.

### 7.1 Phosphor, graisse « fill » (pleine)

Pour **ce qui identifie un lieu** : navigation (barre latérale, barre d'onglets, menus de l'en-tête public), piliers de l'accueil, tuiles de service.

- Le shell fixe la graisse : `<IconContext.Provider value={{ weight: 'fill' }}>`.
- Taille : **22 px** dans la barre latérale, 19 px dans la barre d'onglets mobile, 20 px dans les listes de l'accueil, 24 px dans les tuiles de 44–48 px.
- Couleur : `text-white/70` au repos sur la barre sombre, `text-fg` quand l'entrée est active (elle passe sur fond clair).

| Lieu                   | Icône Phosphor    |
| ---------------------- | ----------------- |
| Accueil                | `House`           |
| Emplois                | `Briefcase`       |
| Développeurs           | `Compass`         |
| Projets                | `FolderSimple`    |
| Certifications         | `Certificate`     |
| Outils IA (skills)     | `PuzzlePiece`     |
| Pré-vol                | `AirplaneTakeoff` |
| Banc d'essai           | `DeviceMobile`    |
| Carte des devs         | `MapTrifold`      |
| Fil d'actualité        | `Newspaper`       |
| Entraide               | `ChatsCircle`     |
| Filtres                | `Faders`          |
| Badge « Par les devs » | `SealCheck`       |

### 7.2 Lucide, trait 1,75

Pour **ce qui déclenche une action ou décrit une donnée** : boutons, champs, métadonnées, états.

- Trait : `stroke-width: 1.75` partout (règle CSS globale `svg.lucide`).
- Taille : **16 px** dans un bouton (`[&_svg]:size-4`), 14 px dans une étiquette, 18 px seule dans une barre, 20 px dans une ligne de choix, 24–28 px dans une tuile.
- Couleur : héritée du texte (`currentColor`) ; `text-accent-text` pour une icône de fait (lieu, contrat) ; `text-subtle` pour une icône décorative de champ.

Correspondances courantes : `ArrowLeft` retour · `ArrowRight` continuer · `ArrowUpRight` lien sortant discret · `ExternalLink` ouvre un site tiers · `Search` · `X` fermer · `Check` coché · `Share2` partager · `MapPin` lieu · `Clock` contrat · `Wallet` salaire · `Globe2` télétravail · `Info` note · `CircleSlash` « Ne pas préciser » · `Sparkles` nouveauté · `ShieldCheck` vérifié · `BadgeCheck` compétence prouvée.

### 7.3 Logos de technologies et d'entreprises

`BrandLogo` / `TechLogo` (`apps/web/src/platform/logos`) : logos officiels en couleur (GitHub, React, Docker…), 26–28 px dans les bandeaux et tuiles. Logos d'entreprises (offres) : 48–64 px, `rounded-[8–14px]`, fond blanc, `object-contain`, liseré `ring-1 ring-line`.

### 7.4 Règles

- Une icône n'est jamais seule sans libellé, sauf si elle est universelle (fermer, rechercher, retour, menu) **et** porte un `aria-label`.
- Pas d'emoji dans l'interface. Seule exception : l'ampoule 💡 de l'animation de Djeli.
- Les icônes de navigation ne changent pas de forme à l'état actif : seule la couleur change.

---

## 8. Mascotte : Djeli

Djeli (« le djeli garde le savoir et le transmet ») est un petit robot 3D bleu roi, visière noire aux yeux bleus lumineux en arc, antenne à boule, sacoche en cuir à l'épaule. Rendu 3D doux, éclairage de studio, fond transparent.

### 8.1 Poses (`apps/web/src/assets/djeli/*.webp`, 13–27 Ko)

| Pose       | Fichier     | Usage                                               |
| ---------- | ----------- | --------------------------------------------------- |
| Salue      | `wave`      | accueil de l'onboarding, visite guidée, salutation  |
| Montre     | `point`     | explication, objectifs                              |
| Ordinateur | `laptop`    | états vides, centres d'intérêt, « il code »         |
| Livre      | `book`      | apprentissage, cours, « il révise »                 |
| Fête       | `celebrate` | réussite, fin de parcours, appel final de l'accueil |
| Trophée    | `trophy`    | dev confirmé, certification obtenue                 |
| Série      | `streak`    | série d'apprentissage                               |

### 8.2 Règles d'usage

- Taille : 56 px (choix dans une liste), 84–92 px (bulle de question, coin animé), 104–120 px (états vides, appels).
- Toujours avec une ombre portée douce : `drop-shadow(0 10px 14px rgba(10,15,31,0.22))` (`0 8px 10px rgba(0,0,0,0.35)` sur fond sombre).
- Il parle dans une **bulle** : carte à bords `border-line-strong`, rayon 18 px, petite pointe carrée tournée à 45° vers lui, titre 22–26 px 700 et indice 14 px `text-muted`.
- Flottement optionnel : `animation: float 4s ease-in-out infinite` (−6 px), coupé si `prefers-reduced-motion`.
- Une seule fois par écran.

### 8.3 Le coin de Djeli (barre latérale)

Scène en boucle de **16 s** au bas de la barre latérale, au-dessus de la carte de profil, visible si la fenêtre fait au moins 720 px de haut (`components/shell/DjeliCorner.tsx`) :

| Temps   | Pose        | Effet                                                                                               | Bulle                |
| ------- | ----------- | --------------------------------------------------------------------------------------------------- | -------------------- |
| 0–4 s   | `laptop`    | il tape (rebond de 1,5 px, 0,35 s) ; `</>`, `{ }`, `;`, `=>` s'envolent en bleu, turquoise et ambre | « Je code… »         |
| 4–8 s   | `celebrate` | il saute (−10 px, rotation ±4°) ; 6 confettis                                                       | « Ça compile ! »     |
| 8–12 s  | `book`      | il se balance (±3°) ; une ampoule apparaît                                                          | « Je révise. »       |
| 12–16 s | `wave`      | il salue (±6°)                                                                                      | « Salut <prénom> ! » |

Clic : il saute (−16 px, 0,6 s) et donne une astuce pendant 6 s. Fondu entre scènes : 3 % du cycle avec `cubic-bezier(0.22, 1, 0.36, 1)`. Avec `prefers-reduced-motion`, il reste immobile et salue.

### 8.4 Générer une nouvelle pose

Partir d'une pose existante comme référence d'image (pour garder le personnage identique) et décrire seulement l'action : « Djeli, le robot 3D bleu roi de la référence, même visière, même antenne, même sacoche, [action], rendu 3D doux, fond transparent, cadrage en pied, centré ». Exporter en WebP ≤ 30 Ko, 512 px.

---

## 9. Mise en page

### 9.1 Points de rupture

| Nom            | Largeur   | Ce qui change                                                             |
| -------------- | --------- | ------------------------------------------------------------------------- |
| mobile         | < 640 px  | barre du haut + barre d'onglets en bas, tiroir de navigation, une colonne |
| `sm`           | ≥ 640 px  | grilles à 2 colonnes, barre d'onglets masquée                             |
| `md`           | ≥ 768 px  | piliers en 3 colonnes                                                     |
| `lg`           | ≥ 1024 px | barre latérale fixe, barre du haut en verre, panneaux latéraux            |
| `xl`           | ≥ 1280 px | conteneurs à pleine largeur                                               |
| 1440 / 1600 px |           | colonne de droite supplémentaire (membres, actualité)                     |

Tester systématiquement à **375 px** et **1440 px**, en clair et en sombre.

### 9.2 Conteneurs

| Usage                      | Largeur max                       | Marges         |
| -------------------------- | --------------------------------- | -------------- |
| Accueil public, sections   | 1120–1180 px                      | `px-4 sm:px-6` |
| Pages de l'application     | 1120–1280 px                      | `px-4 sm:px-6` |
| Lecture (post, onboarding) | 720–760 px                        | `px-5`         |
| Détail + colonne latérale  | `grid-cols-[minmax(0,1fr)_320px]` | écart 20 px    |

### 9.3 Espacements

Échelle de 4 px : 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80. Entre cartes d'une grille : 12–16 px. Padding de carte : 16–20 px (mobile), 24–28 px (bureau). Entre sections de page : 24 px (application), 64–80 px (accueil public).

### 9.4 Shell de l'application (connecté)

- **Barre latérale** (≥ 1024 px) : 248 px, fond `#1e1f22`, rayon 20 px côté gauche, à 8 px du bord. Groupes « Progresser », « Livrer », « Réseau » en 12 px 600 `text-white/60`. Entrées de 40 px, texte 15 px 500 `text-white/80`, icône Phosphor 22 px.
- **Entrée active à coins inversés** : elle prend la couleur du fond de page (`bg-canvas`, texte `text-fg` 600) et se fond dans le contenu grâce à deux quarts de cercle de 18 px :

```css
.side-merge[data-active='true'] {
  position: relative;
}
.side-merge[data-active='true']::before,
.side-merge[data-active='true']::after {
  content: '';
  position: absolute;
  right: 0;
  width: 18px;
  height: 18px;
  pointer-events: none;
}
.side-merge[data-active='true']::before {
  top: -18px;
  background: radial-gradient(circle at 0 0, transparent 17.5px, var(--bg-base) 18px);
}
.side-merge[data-active='true']::after {
  bottom: -18px;
  background: radial-gradient(circle at 0 100%, transparent 17.5px, var(--bg-base) 18px);
}
```

- La liste défile seule, avec un masque de fondu de 14 px en haut et en bas, et deux petites flèches rondes (24 px, `bg-white/10`) quand des entrées sont cachées.
- En bas : le coin de Djeli puis la **carte de profil** (avatar, nom, statut, roue des réglages) sur `bg-white/[0.04]` avec `ring-1 ring-white/[0.06]`, rayon 12 px.
- **Barre du haut** (≥ 1024 px) : 56 px, verre `.dh-glassbar`, de gauche à droite : bouton « Retour », recherche en capsule (460 px max, raccourci `Ctrl K`), puis « + Créer » (`.lg-tint`), messages, notifications, avatar.
- **Mobile** : barre du haut de 56 px (menu, retour, logo, recherche, messages, notifications, avatar) ; **barre d'onglets flottante** en bas (`inset-x-3 bottom-3`, 64 px, fond `#1e1f22`, rayon 10 px, 5 cases dont un bouton central blanc rond de 44 px « + ») ; le contenu garde `padding-bottom: calc(64px + safe-area + 28px)`.

### 9.5 Shell public (visiteur)

- En-tête de 64 px en verre : retour (sauf accueil), logo, menus déroulants « Réseau / Progresser / Livrer / À propos » (≥ 1024 px), recherche (≥ 768 px), « Se connecter », « S'inscrire » (`.lg-tint`), menu burger en dessous de 1024 px.
- Pied de page `#1e1f22`, texte `white/80`, newsletter, 4 colonnes de liens, langue.

---

## 10. Surfaces et profondeur

La profondeur vient **des paliers de gris**, pas des ombres. Quatre matières :

| Matière          | Recette                                                                                                    | Usage                                           |
| ---------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Carte            | `.surface-card` : `background: var(--surface-1); border-radius: var(--radius-md);`                         | blocs de contenu                                |
| Panneau en verre | `.dh-panel` (ci-dessous), rayon 14 px                                                                      | posts du fil, panneaux posés sur le fond teinté |
| Barre en verre   | `.dh-glassbar` : `var(--glass-bg)` + `blur(24px) saturate(180%)` + `box-shadow: 0 1px 0 var(--glass-line)` | en-têtes collants                               |
| Bandeau sombre   | `#111214` ou `#1e1f22` + halos de la marque                                                                | héros, appels, Proof Card, portail entreprise   |

```css
.dh-panel {
  background: var(--glass-bg);
  border: 1px solid var(--glass-edge);
  border-radius: 14px;
  box-shadow:
    var(--glass-sheen),
    0 0 0 1px var(--glass-line),
    0 8px 24px -16px rgb(6 6 7 / 0.18);
  backdrop-filter: blur(22px) saturate(180%);
}
@media (prefers-reduced-transparency: reduce) {
  .dh-panel,
  .lg-clear,
  .dh-glassbar {
    background: var(--surface-1);
    backdrop-filter: none;
  }
}
```

**Rayons** :

| Élément                                             | Rayon                     |
| --------------------------------------------------- | ------------------------- |
| Étiquette, petite puce                              | 6 px                      |
| Champ, ligne de menu, ligne de liste                | 10–12 px                  |
| Carte de contenu, tuile                             | 10–16 px                  |
| Grande carte, panneau, bulle de Djeli               | 18–20 px                  |
| Carte flottante (formulaire du portail), Proof Card | 24–28 px                  |
| Boutons, pastilles, recherche, avatars              | capsule (999 px) / cercle |

**Ombres** : aucune sur la page. `--shadow-md` pour menus et popovers, `--shadow-lg` pour dialogues, tiroirs et toasts, ombre d'élévation forte (`0 30px 80px -20px rgba(0,0,0,.6)`) seulement pour une carte posée sur un bandeau sombre.

---

## 11. Composants

### 11.1 Boutons

Toujours en **capsule**, Poppins 500–600. Trois matières (les noms `lg-*` viennent de la v2 « Liquid Glass ») :

```css
.lg-tint,
.lg-clear,
.lg-ghost {
  transition:
    background-color 140ms var(--ease-out),
    border-color 140ms var(--ease-out),
    color 140ms var(--ease-out),
    transform 140ms var(--ease-out);
}
/* Principal : accent avec reflet en haut et ombre colorée */
.lg-tint {
  color: #fff;
  background:
    linear-gradient(180deg, rgb(255 255 255 / 0.22), rgb(255 255 255 / 0) 55%), var(--accent);
  border: 1px solid rgb(255 255 255 / 0.22);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.35),
    0 6px 16px -8px color-mix(in oklab, var(--accent), transparent 30%);
}
.lg-tint:hover {
  background:
    linear-gradient(180deg, rgb(255 255 255 / 0.26), rgb(255 255 255 / 0) 55%), var(--accent-hover);
}
/* Secondaire : verre clair */
.lg-clear {
  color: var(--text);
  background-color: var(--glass-strong);
  border: 1px solid var(--glass-edge);
  box-shadow:
    var(--glass-sheen),
    0 0 0 1px var(--glass-line);
  backdrop-filter: blur(16px) saturate(180%);
}
.lg-clear:hover {
  background-color: var(--surface-1);
}
/* Sur la barre sombre */
.side-panel .lg-clear {
  color: #fff;
  background-color: rgb(255 255 255 / 0.06);
  border-color: rgb(255 255 255 / 0.12);
}
/* Discret */
.lg-ghost:hover {
  color: var(--text);
  background-color: var(--surface-2);
}
/* Pression */
.lg-tint:active,
.lg-clear:active,
.lg-ghost:active {
  transform: scale(0.97);
}
```

| Taille        | Hauteur | Padding | Texte     | Icône    |
| ------------- | ------- | ------- | --------- | -------- |
| `xs`          | 28 px   | 12 px   | 12 px     | 14 px    |
| `sm`          | 32 px   | 14 px   | 13 px     | 16 px    |
| `md` (défaut) | 36 px   | 16 px   | 14 px     | 16 px    |
| `lg`          | 44 px   | 20 px   | 15 px     | 16 px    |
| héros         | 48 px   | 24 px   | 15 px 600 |          |
| `icon`        | 36 × 36 |         |           | 16–18 px |

Variantes : `primary` (`.lg-tint`, **une seule par vue**), `secondary` (`.lg-clear`), `ghost` (`.lg-ghost text-muted`), `danger` (`bg-danger-soft text-danger`, plein au survol), `success`. Sur bandeau sombre : bouton blanc plein (`bg-white text-[#1e1f22]`) + bouton contour (`ring-1 ring-white/30 hover:ring-white`). État chargement : spinner à la place de l'icône, `aria-busy`. Désactivé : opacité 50 %, aucun survol.

### 11.2 Pastilles de filtre et onglets

- **Pastille** (filtres, sujets, onglets de l'accueil public) : capsule de 36–40 px, padding 14–20 px, 13–14 px 500. Active `.lg-tint`, inactive `.lg-clear`. En rangée défilante horizontale (`no-scrollbar overflow-x-auto`), ou en `flex-wrap` dans un formulaire.
- **Onglets de page** (« Pour toi / Questions / Actualité ») : texte 15 px, hauteur 48 px, soulignement de 2 px `border-fg` sous l'onglet actif, `text-subtle` sinon, ligne `border-line` sous la rangée.
- **Segmenté** (2–3 choix exclusifs, ex. « Devs actifs / Proof XP ») : capsules côte à côte, l'actif en `bg-fg text-canvas`.

### 11.3 Champs

```
w-full rounded-[10px] border border-line-strong bg-canvas text-fg placeholder:text-subtle
h-11 px-4 text-[15px] (mobile) / h-10 text-sm (≥ 640 px)
focus : border-fg, sans halo · invalide : border-danger
```

- Libellé au-dessus : 13 px 500 `text-fg`, mention « facultatif » en 12 px `text-subtle` à côté.
- Aide en dessous : 12 px `text-subtle` ; erreur : 12 px `text-danger`, `role="alert"`.
- Champ de recherche : capsule de 40–48 px, icône `Search` 16 px à gauche, `.lg-clear` ou bordure `border-line-strong`.
- Case à cocher : native, `accent-color: var(--accent)`, 18–20 px.
- Liste déroulante : native, mêmes classes que le champ.

### 11.4 Cartes de choix (onboarding)

Bouton plein largeur, `border-2 border-line-strong`, rayon 16 px, padding 14–16 px. Choisie : `border-accent bg-accent-soft`. Coche ronde de 20 px dans le coin (choix multiple) ou centrée verticalement. Survol : bordure mi-accent. Pression : `scale(0.97)`.

**« Ne pas préciser »** : même carte en **bordure pointillée** (`border-dashed`), icône `CircleSlash`, texte `text-muted`. Elle désélectionne les autres choix.

### 11.5 Cartes de contenu

- **Post du fil** : `.dh-panel`, avatar ou logo de source 44 px, nom 16 px 600, métadonnée 13 px, titre 19–20 px 600, extrait 3 lignes 15 px, image pleine largeur au ratio ≈ 2,2:1 (max 440 px), enregistrer en haut à droite.
- **Offre (liste)** : `bg-surface-1` rayon 10 px, padding 16 px, logo 48 px, titre 14–15 px 600, entreprise 13 px `text-muted`, étiquettes, « source · date » 12 px `text-subtle`. Survol `bg-surface-2`.
- **Pilier** : `.surface-card` p-6, tuile d'icône colorée 44 px (§5.3), titre 22 px 700, texte 15 px `text-fg/80`, liste de liens 15 px 600 avec icône Phosphor 20 px et flèche `ArrowUpRight` au survol.
- **Statistique** : `.surface-card` px-4 py-4, libellé 14 px `text-fg/75`, valeur 26–34 px 700 `tabular-nums`.

### 11.6 Étiquettes et badges

- **Étiquette** (contrat, lieu, techno) : `rounded-[6px] bg-surface-3 px-2 py-0.5 text-[12px] font-medium text-fg`.
- **Badge à tonalité** : 22 px de haut, rayon 6 px, 12 px 500 ; tons `neutral` (`bg-surface-3 text-muted`), `accent`, `success`, `warning`, `danger`, pastels (`rose`, `sky`, `amber`, `lavender`, `mint`), `outline`.
- **Compteur** : `h-4 min-w-4 rounded-full bg-badge px-1 text-[11px] font-semibold text-badge-fg`, « 99+ » au-delà.
- **Pastille d'en-tête de héros** : capsule de 36 px `.lg-clear` (clair) ou `bg-white/10 ring-1 ring-white/15` (sombre), icône 16 px, 13–14 px 500–600.

### 11.7 Avatars

Cercle, `object-cover`, fond `bg-surface-3`. Sans image : initiales sur fond coloré, taille de police = 38 % du diamètre. Tailles : 24, 32, 40, 44, 56, 112 px (profil). Pile d'avatars : chevauchement avec anneau `ring-2 ring-surface-2`. Anneau de marque (Proof Card) : trait de 5 px dans le dégradé `#3b82f6 → #2dd4bf`.

### 11.8 En-tête de service

Pour toute page de l'application : `h1` 28–32 px 700 −0,02em, sous-titre 14 px `text-muted` (max 2xl), actions à droite (≥ 640 px), puis recherche et pastilles de filtre. Pas d'icône décorative à côté du titre.

### 11.9 Bouton « Retour »

En haut à gauche de la barre du haut sur toutes les pages sauf l'accueil : capsule de 40 px, `ArrowLeft` 18 px + « Retour » 14 px 500 (icône seule sur mobile et dans l'en-tête public), `hover:bg-surface-2`. Revient à la page précédente ; arrivé par un lien direct, il mène à la page parente (`/emplois/42` → `/emplois`).

### 11.10 Panneau de filtres

Colonne de droite collante (`sticky top-20`), **hauteur max `calc(100dvh - 6rem)` et défilement propre** (`overflow-y-auto overscroll-contain`). Titre 17 px 600, « Réinitialiser » en lien d'accent, fermer (`X`). Groupes : titre 13,5 px 600 puis pastilles ou cases.

### 11.11 Page de détail (offre, post)

Grille `minmax(0,1fr)` + colonne de 320 px collante. En-tête en carte : logo 64 px, titre 24–30 px 700, sous-titre 16 px 500, « Publiée il y a… · via Source » 13,5 px ; faits en tuiles `bg-surface-2` rayon 12 px avec icône d'accent ; actions (`.lg-tint` 44 px + `.lg-clear` « Partager »). Corps en carte : titre 18 px 600 puis texte 15 px `text-fg/85`, puces `marker:text-accent-text`, intertitres 16 px 600.

### 11.12 Carrousel mobile (piliers, groupes de cartes)

Sur mobile, **jamais plus de 3 grandes cartes empilées** :

```
conteneur : -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 no-scrollbar
            md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0
carte     : w-[84%] shrink-0 snap-start md:w-auto      (la suivante dépasse : on comprend qu'on glisse)
indicateur: points de 8 px (bg-fg/30), l'actif s'étire à 24 px (bg-fg), md:hidden
```

### 11.13 Frise (étapes)

Mobile : liste verticale, numéro dans un rond blanc de 36 px (`ring-4` couleur du fond pour couper la ligne), ligne de 2 px en dégradé `#8ab4ff/70 → white/10` qui relie les ronds, texte à droite. ≥ 640 px : cartes `bg-white/[0.06]` rayon 18 px en grille de 2 puis 4.

### 11.14 États vides

Bordure pointillée `border-line-strong`, rayon 10 px, Djeli (pose adaptée) 96–120 px, titre 16–18 px 600, texte 14 px `text-muted`, **toujours une action**. Écrire ce qui se passe et quoi faire, jamais « Aucune donnée ».

### 11.15 Chargement

**Squelettes** à la forme du contenu (classe `.skeleton` : lueur lente `shimmer` qui traverse, coupée si reduced-motion). Jamais de spinner plein écran. Spinner seulement dans un bouton.

### 11.16 Dialogues, feuilles, menus

- Radix. Fond `--scrim`. Dialogue centré (≥ 640 px) rayon 10 px, `--shadow-lg`, entrée `dh-dialog-in` (opacité + `scale(0.97)`, 220 ms). Panneau de droite (≥ 640 px) : 420 px de large, à 8 px des bords, rayon 10 px.
- Mobile : **feuille du bas** (`dh-sheet-up`, 320 ms, `--ease-drawer`), poignée, coins hauts arrondis.
- Panneau de droite (≥ 640 px) : `dh-right-in` (24 px, 220 ms).
- Menus et popovers : `bg-surface-1` rayon 10 px, padding 6 px, `--shadow-lg`, lignes de 36 px rayon 6 px ; infobulles `bg-surface-3` rayon 10 px 12 px ; entrée `dh-pop-in` 150 ms depuis l'origine Radix.

### 11.17 Notifications (toasts)

`sonner`, en bas au centre, au-dessus de la barre d'onglets (`offset: calc(var(--tabbar-h) + 24px)`). Style : `rounded-[10px] border border-line bg-surface-3 text-fg shadow-lg`. Phrase courte au passé ou à l'infinitif : « Lien copié », « Offre enregistrée ».

### 11.18 Palette de commandes

Ctrl K, `cmdk`, **aucune animation d'ouverture** (ouverte des dizaines de fois par jour). Champ en haut, groupes « Aller à », « Actions », « Aide » ; lignes de 40 px, icône à gauche, raccourci à droite en `Kbd`.

### 11.19 Visite guidée

Projecteur qui glisse d'un élément réel à l'autre (`data-tour="…"`), bulle de Djeli à côté (pose par étape), progression « 1 / 6 » et points, « Passer la visite » et « Suivant ». Démarre seule après l'onboarding, relançable depuis Ctrl K et les réglages.

---

## 12. Animations

Principe : **rapide, utile, interruptible**. Une animation explique un changement d'état ; elle ne décore pas (sauf Djeli).

### 12.1 Durées et courbes

| Usage                              | Durée      | Courbe          |
| ---------------------------------- | ---------- | --------------- |
| Survol, couleur, pression          | 120–160 ms | `--ease-out`    |
| Ouverture de menu, popover         | 150 ms     | `--ease-out`    |
| Entrée de page, dialogue           | 220 ms     | `--ease-out`    |
| Feuille du bas, tiroir             | 320 ms     | `--ease-drawer` |
| Sorties                            | 150 ms     | `ease-in`       |
| Apparition d'une capture (accueil) | 420 ms     | `--ease-out`    |

### 12.2 Bibliothèque de mouvements

```css
@keyframes dh-page-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
}
.dh-page {
  animation: dh-page-in var(--dur-base) var(--ease-out) both;
} /* chaque page */

@keyframes dh-item-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
}
.dh-stagger > * {
  animation: dh-item-in var(--dur-base) var(--ease-out) both;
}
.dh-stagger > *:nth-child(2) {
  animation-delay: 30ms;
} /* … +30 ms jusqu'à 150 ms max */

@keyframes lp-fade {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
}
.lp-fade {
  animation: lp-fade 420ms var(--ease-out) both;
} /* onglets de l'accueil */

@keyframes lp-marquee {
  to {
    transform: translateX(-50%);
  }
}
.lp-marquee {
  mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent);
}
.lp-marquee-track {
  animation: lp-marquee 40s linear infinite;
} /* logos, pause au survol */

.lp-press {
  transition:
    transform 160ms var(--ease-out),
    background-color 150ms ease;
}
.lp-press:active {
  transform: scale(0.97);
} /* tout bouton important */

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}
.animate-float {
  animation: float 4s ease-in-out infinite;
} /* Djeli seulement */
```

### 12.3 Règles

- **Pression** : tout ce qui se clique se comprime à 97 %.
- **Survol** seulement sur `(hover: hover) and (pointer: fine)` : pas d'effet collé sur mobile.
- **Ce qui s'ouvre souvent ne s'anime pas** (palette, menus de navigation répétés).
- Les listes entrent en léger décalage (30 ms entre éléments, 150 ms maximum).
- `prefers-reduced-motion: reduce` : toutes les durées passent à 0,01 ms, les boucles s'arrêtent, Djeli reste immobile.

---

## 13. Patterns de pages

### 13.1 Accueil public (toujours sombre)

1. Héros centré : pastille « Par les devs, pour les devs », `h1` 42/68 px, paragraphe 17/19 px, champ e-mail + « Rejoindre DevHub » (capsule 48 px), lien « Se connecter ».
2. Onglets d'aperçu (pastilles) + vraie capture de l'application dans un cadre de fenêtre (barre grise à 3 points, rayon 18 px, grande ombre).
3. Bandeau de logos qui défile (« Branché sur les outils que tu utilises déjà »).
4. Trois piliers (carrousel sur mobile).
5. Bandeau `#1e1f22` « Du prompt à la prod vérifiée » : 4 étapes (frise sur mobile).
6. Certifications : texte + 3 chiffres + carte « Vérifier un certificat » avec grille de logos.
7. « DevHub aujourd'hui » : vrais chiffres lus en direct dans la base, dernières questions, profils à découvrir.
8. Appel final `#1e1f22` rayon 28 px : Djeli qui fête, « Ta place est déjà prête. », bouton blanc + bouton contour.

### 13.2 Fil (accueil connecté)

Compositeur (avatar + capsule « Partage une avancée… » + 3 raccourcis), onglets soulignés, pastilles de sujets défilantes (« Mes sujets », « À la une », puis les sujets suivis), posts en `.dh-panel`, filtres dans la colonne de droite (≥ 1024 px). Choisir un sujet filtre **toute** l'actualité.

### 13.3 Liste + détail (emplois)

En-tête de service, recherche, pastilles de filtre ; liste à gauche (440 px) et détail collant à droite (≥ 1024 px), détail plein écran sur mobile. Les offres collectées s'ouvrent sur DevHub (`/emplois/direct/:id`) avec description complète ; la candidature se fait chez l'éditeur, toujours cité.

### 13.4 Onboarding

Plein écran sans shell : logo, barre de progression de 10 px en capsule, « 2/6 », **« Passer »** ; Djeli pose la question dans une bulle ; cartes de choix avec « Ne pas préciser » ; barre d'actions collée en bas (« Retour » discret à gauche, « Continuer » 44 px à droite). « Passer » mène directement à l'acceptation des règles.

### 13.5 Portail entreprise

Même charte en vouvoiement : bandeau `#111214` avec halos, logo « DevHub Business », héros à gauche (mot « prouvées » en dégradé), 4 étapes en grille 2 × 2, formulaire dans une carte blanche flottante rayon 24 px, puis fonctionnalités en tuiles colorées.

---

## 14. Responsive

- **Aucun défilement horizontal de la page** à 375 px (vérifier `document.documentElement.scrollWidth === innerWidth`).
- **Cibles tactiles de 44 px** minimum (boutons, cases de la barre d'onglets, choix).
- Groupes de grandes cartes → carrousel (§11.12) ; étapes → frise (§11.13) ; 4 chiffres → grille 2 × 2.
- Rangées de pastilles → défilement horizontal sans barre visible.
- Formulaire en 2 colonnes → 1 colonne ; actions en bas collées avec `safe-area-inset-bottom`.
- Les panneaux collants ont toujours une hauteur maximale et défilent seuls.
- Les titres passent de leur taille mobile à leur taille bureau à 640 px (`text-[28px] sm:text-[32px]`).

---

## 15. Accessibilité

- Contrastes **WCAG AA** vérifiés pour toutes les paires de tokens (métadonnées comprises).
- Focus visible partout : contour 2 px `--accent`, décalé de 2 px, jamais retiré.
- Préférences système respectées : `prefers-reduced-motion`, `prefers-reduced-transparency` (le verre devient un aplat), `prefers-contrast: more` (contours nets).
- Icône seule = `aria-label` ; état d'un choix = `aria-pressed` ; page courante = `aria-current="page"` ; progression = `role="progressbar"` avec valeurs ; messages = `role="status"` / `role="alert"`.
- Lien d'évitement « Aller au contenu » en premier élément du shell.
- Images décoratives `alt=""` ; Djeli est toujours décoratif.

---

## 16. Rédaction

- **Tutoiement** pour les devs (application, accueil). **Vouvoiement** pour les entreprises (portail Business).
- Phrases courtes, verbes d'action, aucun jargon marketing. Boutons à l'infinitif ou en promesse : « Rejoindre DevHub », « Postuler sur Remotive », « C'est parti ».
- Typographie française : apostrophe courbe `’`, guillemets « », espace insécable avant `: ; ! ?` et dans « 1 240 », points de suspension `…`.
- Jamais de contenu inventé, de chiffre arrondi ou de faux témoignage. Une donnée absente se dit.
- Les sujets s'écrivent en clair (« Intelligence artificielle »), jamais en identifiant (`c/ia`).
- Ne jamais affirmer un fait non vérifié (ex. « hébergé à Dakar » : les serveurs sont à Singapour).

---

## 17. Thèmes

- Clair et sombre, choisis par l'utilisateur (réglages, Ctrl K), mémorisés (`localStorage` clé `dh-theme2`), posés sur `<html data-theme>` avant le premier rendu pour éviter le flash.
- `meta[name="theme-color"]` : `#FFFFFF` en clair, `#0B0B0C` en sombre.
- Barre latérale, barre d'onglets mobile, pied de page et bandeaux marketing : **sombres dans les deux thèmes**.
- **Accueil public : toujours sombre**, sans bouton de thème ; le thème choisi revient sur les autres pages.
- Tester chaque écran dans les deux thèmes : une couleur posée en dur est presque toujours un bug.

---

## 18. Check-list avant de livrer un écran

- [ ] Poppins 400/500/600/700 chargées ; aucune autre police d'interface.
- [ ] Toutes les couleurs viennent des tokens ; l'écran est juste en clair **et** en sombre.
- [ ] Une seule action principale `.lg-tint` visible.
- [ ] Boutons en capsule, pression à 97 %, focus visible.
- [ ] Icônes : Phosphor `fill` pour les lieux, Lucide 1,75 pour les actions ; pas d'emoji.
- [ ] Bouton « Retour » présent (sauf accueil).
- [ ] À 375 px : pas de défilement horizontal, pas de pile de grandes cartes, cibles de 44 px.
- [ ] États vides avec Djeli et une action ; squelettes au chargement.
- [ ] « Ne pas préciser » disponible sur les questions de profil.
- [ ] Aucun contenu inventé ; textes au tutoiement (vouvoiement côté Business), typographie française.
- [ ] Animations ≤ 320 ms (hors Djeli), coupées avec `prefers-reduced-motion`.

---

## 19. Recette : démarrer un projet dans le style DevHub

1. Créer le projet (Vite + React + TypeScript), installer la stack de §2.
2. Coller §3.1 à §3.4 dans `src/styles/globals.css`, puis les composants CSS de §10, §11.1 et §12.2.
3. Poser `data-theme="dark"` ou `"light"` sur `<html>` ; ajouter `<meta name="theme-color">`.
4. Copier le symbole SVG de §6.1 dans un composant `BrandMark`, puis le logo complet de §6.2.
5. Construire le shell (§9.4 ou §9.5) : barre latérale `#1e1f22` à coins inversés, barre du haut en verre avec « Retour », barre d'onglets flottante sur mobile.
6. Chaque page : `div.dh-page` (entrée animée) → en-tête de service (§11.8) → contenu en cartes (§11.5).
7. Ajouter Djeli (§8) : états vides, onboarding, coin animé.
8. Passer la check-list (§18) à 375 et 1440 px, en clair et en sombre.

Exemple minimal d'écran :

```tsx
export function Page() {
  return (
    <div className="dh-page mx-auto w-full max-w-[1120px] px-4 py-6 sm:px-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <h1 className="text-[28px] leading-[1.1] font-bold tracking-[-0.02em] text-fg sm:text-[32px]">
            Emplois
          </h1>
          <p className="mt-2 max-w-2xl text-[14px] text-muted">
            Des offres réelles, publiées par des entreprises vérifiées.
          </p>
        </div>
        <button className="lg-tint lp-press inline-flex h-11 items-center gap-2 rounded-full px-5 text-[15px] font-semibold">
          Publier une offre
        </button>
      </header>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        <li className="surface-card flex gap-3 p-4 transition-colors hover:bg-surface-2">
          <span className="size-12 shrink-0 rounded-[8px] bg-surface-2" />
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-fg">Développeur backend</h3>
            <p className="text-[13px] text-muted">Entreprise</p>
            <span className="mt-2 inline-block rounded-[6px] bg-surface-3 px-2 py-0.5 text-[12px] font-medium text-fg">
              Télétravail
            </span>
          </div>
        </li>
      </ul>
    </div>
  );
}
```

---

## 20. Fichiers de référence

| Sujet                                                        | Fichier                                                               |
| ------------------------------------------------------------ | --------------------------------------------------------------------- |
| Tokens, composants CSS, animations                           | `apps/web/src/styles/globals.css`                                     |
| Bouton (variantes, tailles)                                  | `apps/web/src/components/ui/button.tsx`                               |
| Champs, badges, avatars, squelettes                          | `apps/web/src/components/ui/primitives.tsx`                           |
| Dialogues, feuilles, menus                                   | `apps/web/src/components/ui/overlay.tsx`                              |
| Logo                                                         | `apps/web/src/components/brand.tsx`                                   |
| Shell connecté (barre latérale, barres du haut et d'onglets) | `apps/web/src/components/shell/AppShell.tsx`                          |
| Shell public                                                 | `apps/web/src/components/shell/PublicShell.tsx`                       |
| Bouton « Retour »                                            | `apps/web/src/components/shell/BackButton.tsx`                        |
| Coin de Djeli                                                | `apps/web/src/components/shell/DjeliCorner.tsx`                       |
| Navigation et icônes de lieux                                | `apps/web/src/components/shell/nav.ts`                                |
| Djeli et états vides                                         | `apps/web/src/components/djeli.tsx`, `apps/web/src/assets/djeli/`     |
| Accueil public                                               | `apps/web/src/pages/Landing.tsx`                                      |
| Onboarding                                                   | `apps/web/src/pages/Onboarding.tsx`                                   |
| Détail d'une offre                                           | `apps/web/src/pages/JobDirect.tsx`                                    |
| Proof Card (image de partage)                                | `apps/api/src/modules/passport/domain/proof-card.ts`                  |
| Portail entreprise (styles, accueil)                         | `apps/business/src/styles.css`, `apps/business/src/pages/Welcome.tsx` |
