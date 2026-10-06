# DevHub Africa — Frontend

> **Aider → Construire → Prouver.** La plateforme des développeurs basée sur la preuve, hors ligne d'abord.
> Rôle 3 (front-end et hors ligne) · branche `sylvio-frontend` · décisions : [`../docs/decisions.md`](../docs/decisions.md) · journal : [`../SUIVI.md`](../SUIVI.md)

## Lancer

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm run build      # build de production + service worker (PWA)
npm run preview    # sert le build sur http://localhost:4173
```

Sans configuration, l'app tourne avec un **serveur local** (IndexedDB) qui applique les vraies règles du cahier des charges. Pour la tester :
- **Essayer sans compte :** entre directement sur un compte démo (Awa Koné).
- **Se connecter avec GitHub :** lit un vrai profil public et en calcule les compétences.

## Brancher la vraie API (rôle 2)

```bash
VITE_API_URL=https://api.devhub.africa npm run build
```

Tout passe par `src/services/` :

| Fichier | Rôle |
|---|---|
| `services/types.ts` | Types du domaine, calqués sur le modèle de données du CDC (§7) |
| `services/api.ts` | **Contrat** : une méthode par point d'entrée de l'API du CDC (§8) |
| `services/http.ts` | Implémentation HTTP (cookies, en-tête `Idempotency-Key` sur les écritures) |
| `services/local/` | Serveur local : `engine.ts` (règles : Proof XP, garde-fous, matching, statuts), `seed.ts` (données de démo) |

`engine.ts` sert aussi de **spécification exécutable** : le back-end doit produire les mêmes résultats.

## Architecture

```
src/
  app/          routeur (pages chargées à la demande), fonctionnalités Motion
  components/   ui/ (design system), shell/ (rail, navigation, palette, réseau),
                AskDialog, Tour (visite de Djeli), TagPicker, domain (cartes métier)
  pages/        un fichier par écran
  offline/      état réseau, simulateur (?net=offline|2g), file d'attente IndexedDB
  i18n/         fr.ts (référence) et en.ts (typé : une clé manquante casse le build)
  lib/          règles du CDC, détection (étiquettes, secrets, qualité), cache de requêtes
  styles/       tokens (thèmes sombre et clair) et utilitaires
```

## Règles d'équipe

- **Pas de couleur en dur :** tout passe par les tokens de `styles/globals.css`.
- **Pas de texte en dur :** tout passe par `i18n/fr.ts` et `i18n/en.ts`.
- **Une action primaire par écran.** Chargement par skeletons, jamais de spinner plein écran.
- **Écritures hors ligne :** passent par `enqueue()` (question, réponse, message, tâche prise).
- **Écritures en ligne seulement :** elles appellent d'abord `requireNetwork()`.
- **Données de démo :** toujours marquées « Démo ».
- **Suivi :** chaque changement est noté, daté, dans `SUIVI.md`.

## Raccourcis

`Ctrl/⌘ K` palette · `N` je suis bloqué · `G` puis `H`/`S`/`P`/`D`/`C` navigation · `[` replier la barre · `?` aide
