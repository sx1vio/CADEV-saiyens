# ADR-0012 : Aperçus de partage par injection serveur dans `index.html`

- **Statut** : **Accepté le 2026-10-09** (Caleb, rôle 1) ; pas encore implémenté (PR2, R7, PR5).
- **Date** : 2026-10-06
- **Décideurs** : front-end, back-end
- **Exigences concernées** : PR2 (aperçu Open Graph), R7 (lien d'invitation riche), PR5 (Proof Card), §8 (« route serveur légère pour les aperçus »)

## Contexte

Le vote du public se joue sur WhatsApp, Telegram et LinkedIn. Leurs robots lisent les balises `og:*` du HTML **sans exécuter le JavaScript**. Une SPA Vite renvoie le même `index.html` pour toutes les URL : les aperçus seraient tous identiques.

## Options envisagées

| Option                                                                                                                   | Pour                                                                                | Contre                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Injection serveur** : l'API sert `/u/*` et `/p/*` en lisant `index.html` et en y injectant les balises de la ressource | Simple ; même réponse pour un humain et un robot ; aucune dépendance au rendu React | L'API doit connaître l'emplacement du build du front                                                 |
| Détection des robots par agent utilisateur, pré-rendu pour eux                                                           | Classique                                                                           | Liste de robots à maintenir ; comportement différent selon le visiteur (fragile, difficile à tester) |
| Rendu serveur complet (Next.js, Vite SSR)                                                                                | Référencement complet                                                               | Réécriture du front, contraire au choix Vite, budget et délai                                        |
| Pré-rendu statique au build                                                                                              | Rapide                                                                              | Les Passports changent en permanence                                                                 |

## Décision

**Injection serveur** : Caddy envoie `/u/*` et `/p/*` à l'API, qui renvoie `index.html` enrichi de `<title>`, `og:title`, `og:description`, `og:image`, `og:url`, `twitter:card`. L'image (`/og/u/:handle.png`, 1200 × 630) est générée avec `satori` + `@resvg/resvg-js`, puis mise en cache une heure.

## Conséquences

### Positives

- Aperçus corrects et propres à chaque Passport et chaque salle (critère « correct sur WhatsApp et LinkedIn », R7).
- La Proof Card (PR5) réutilise le même mécanisme.

### Négatives

- L'image Docker de l'API embarque une copie de `index.html` du build du front (copiée à la construction) ; les deux images doivent venir du même commit (garanti par l'étiquette SHA).
- Un Passport non listé ou supprimé renvoie des balises génériques (pas de fuite d'information).
