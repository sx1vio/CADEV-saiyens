# ADR-0020 : Services « écosystème » conservés dans le front, signalés comme aperçus

- **Statut** : Accepté le 2026-10-16 par l'équipe (transmis par Joachim) ; **validation du rôle 1 (Caleb) à confirmer**, qui a le dernier mot sur le périmètre (CDC §3). Remplace les points 1 et 3 de la décision de l'[ADR-0016](0016-perimetre-du-mvp.md)
- **Date** : 2026-10-16
- **Décideurs** : l'équipe, après la fusion de #97 ; rédaction Joachim (rôle 5)
- **User stories ou exigences concernées** : §9 (budget), §6.6 (données de démonstration), I1, T1

## Contexte

L'[ADR-0016](0016-perimetre-du-mvp.md) (9 octobre) limitait les menus aux écrans du MVP du CDC v3 et demandait de retirer de #97 le fil d'actualités (module `news`) et les services « écosystème » : communautés, emplois, vidéos, apprendre, certifications, outils IA, guide « app avec l'IA », templates.

Le 14 octobre, #97 a été fusionnée sans ce remaniement. L'accueil d'un compte connecté est désormais un fil d'actualités servi par une vraie API (`GET /news`, `GET /videos`), et les menus présentent les services de l'écosystème. Sauf les actualités et les vidéos, ces services n'ont **pas de serveur** : leurs contenus sont des données de démonstration, et ce que fait l'utilisateur (candidatures, progression, publications) reste dans le navigateur.

Le 16 octobre, l'équipe a choisi de garder #97 telle quelle et de réviser l'ADR-0016, plutôt que de retirer ces écrans à six jours du gel.

## Critères de décision

- Indispensable : aucune donnée inventée présentée comme réelle (§6.6, honnêteté de la démo).
- Indispensable : le parcours du MVP (SOS Dev, salles, Passport, Systalink) reste entièrement sur l'API réelle.
- Souhaitable : ne pas défaire le travail fusionné de l'équipe front à six jours du gel.

## Options envisagées

### Option A : appliquer l'ADR-0016 (menus du MVP, accueil « QG »)

- **Pour** : périmètre resserré, conforme au CDC v3, moins de surface à tester.
- **Contre** : retire une partie importante de #97 juste après sa fusion ; demande de reconstruire un accueil.

### Option B : garder #97 et signaler clairement les aperçus

- **Pour** : aucun écran perdu ; les actualités, qui ont une vraie API, restent en accueil.
- **Contre** : plus d'écrans à maintenir ; risque de confusion si les aperçus ne sont pas signalés.

### Option C : compromis (menus du MVP plus « Actualités »)

- **Pour** : garde la partie qui a une API.
- **Contre** : retire quand même la plupart des écrans de #97.

## Décision

Nous choisissons **l'option B**. Les menus et l'accueil de #97 sont conservés. Chaque écran d'un service **sans serveur** affiche en permanence un bandeau « Aperçu : ce service n'a pas encore de serveur. Contenus de démonstration, ce que tu fais reste sur cet appareil. »

Restent en vigueur dans l'ADR-0016 : le point 2 (comptes de démonstration toujours marqués), le point 4 (serveur simulé réservé au développement, build de production refusé sinon, appliqué par la PR #116) et le point 5 (budget de 300 Ko pour l'accueil).

## Conséquences

### Positives

- Le travail de l'équipe front est conservé ; le fil d'actualités sert d'accueil avec des données réelles.
- Le jury voit tout de suite ce qui est réel et ce qui est un aperçu.

### Négatives

- Davantage d'écrans dans le périmètre de la démo et des tests.
- L'accueil connecté n'est pas le « QG » du CDC (questions de mes stacks, mes salles) : ces informations restent sur SOS Dev et Projets.

### Risques et parades

- Risque : un aperçu présenté comme une fonctionnalité réelle pendant la démo → Parade : bandeau permanent sur ces routes, testé (`isEcosystemPreview`).
- Risque : le poids de l'accueil dépasse 300 Ko avec le fil d'actualités → Parade : mesure à ajouter en CI (`size-limit`, ADR-0016 point 5).

## Mise en œuvre

- `apps/web/src/components/shell/nav.ts` : `isEcosystemPreview(path)` liste les routes des services sans serveur (`/communautes`, `/c/…`, `/emplois`, `/apprendre`, `/certifications`, `/skills`, `/post/…`, `/publier`, `/templates`, `/creer`).
- `AppShell.tsx` : bandeau sur ces routes (en mode simulé, c'est le bandeau « Données de démonstration » qui s'affiche partout).
- Quand un de ces services obtient une API, on le retire de la liste.

## Décisions liées

- [ADR-0016](0016-perimetre-du-mvp.md) : périmètre du MVP (points 1 et 3 remplacés par celui-ci).
- [ADR-0003](0003-frontend-react-vite-pwa.md) : budget de performance.
