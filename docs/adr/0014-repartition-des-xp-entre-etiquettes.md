# ADR-0014 : Répartition des Proof XP entre les étiquettes

- **Statut** : **Accepté le 2026-10-09** (Caleb, rôle 1), déjà implémenté (#101, #102)
- **Date** : 2026-10-09
- **Décideurs** : Caleb (rôle 1, propriétaire de `reputation`)
- **Exigences concernées** : X1, PR3, §6.3 (« attribués aux étiquettes de la question »)

## Contexte

Une validation rapporte 10 Proof XP « attribués aux étiquettes de la question » (§6.3), et une question porte de 1 à 5 étiquettes. Le score d'une compétence vaut `min(100, G + min(60, XP sur l'étiquette))`. Le cahier des charges ne dit pas comment répartir les points entre plusieurs étiquettes. La question restait ouverte dans [08 · Algorithmes](../architecture/08-algorithmes.md).

## Critères de décision

- Le total de Proof XP ne doit pas dépendre du nombre d'étiquettes, sinon on triche en ajoutant des étiquettes.
- Le journal `xp_events` doit rester simple : la somme de ses points égale le total affiché (invariant de [05 · Modèle de données](../architecture/05-modele-donnees.md)).
- Le score de compétence doit progresser à un rythme crédible.

## Options envisagées

### Option A : répartir les points entre les étiquettes (4, 3, 3)

- **Pour** : le total est indépendant du nombre d'étiquettes ; un seul journal, une seule somme ; l'aide sur un sujet transversal se partage.
- **Contre** : une compétence progresse moins vite quand la question a plusieurs étiquettes.

### Option B : créditer la totalité sur chaque étiquette, mais une seule fois dans le total

- **Pour** : les compétences progressent plus vite.
- **Contre** : il faut deux comptabilités (« XP total » et « XP par étiquette ») et rompre l'invariant « somme du journal = total » ; une question à 5 étiquettes rapporte 50 points de compétence, ce qui pousse à multiplier les étiquettes.

## Décision

**Option A.** Les points sont répartis en entiers (`splitPoints` dans `@devhub/core`), le reste allant aux premières étiquettes ; une part nulle ne crée pas d'événement.

## Conséquences

### Positives

- Aucun intérêt à ajouter des étiquettes ; journal et total toujours cohérents.

### Négatives

- La progression d'une compétence est plus lente sur les questions multi-étiquettes. Elle reste lisible : la part G (GitHub) apporte jusqu'à 40 points dès l'inscription.

### Risques et parades

- Risque : des scores jugés trop bas pendant la démo. Parade : comptes de démonstration crédibles et barème publié sur `/regles` (X5), où la règle est expliquée.
