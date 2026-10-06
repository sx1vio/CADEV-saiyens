# ADR-0006 : File de tâches dans PostgreSQL avec pg-boss

- **Statut** : Proposé
- **Date** : 2026-10-06
- **Décideurs** : back-end
- **Exigences concernées** : §8 (« File dans PostgreSQL, pas de service supplémentaire »), S2, S3, §6.1 (escalade à 15 minutes), Y3

## Contexte

Piste IA, matching, e-mails, escalade, vérifications GitHub et sondes Systalink doivent tourner hors de la requête HTTP, avec reprise en cas d'échec. Le cahier des charges impose une file dans PostgreSQL.

## Options envisagées

| Option | Pour | Contre |
|---|---|---|
| **pg-boss** | Mature, délais (`startAfter`), cron, reprises, unicité, archivage ; s'insère dans une transaction existante | Interroge la base en continu (négligeable à notre échelle) |
| graphile-worker | Très rapide (LISTEN/NOTIFY), bon support des transactions | Tâches planifiées moins souples, API moins connue |
| BullMQ + Redis | Très répandu, tableau de bord | **Ajoute Redis** : contraire au cahier des charges et à « moins de pièces à héberger » |
| Table maison + `SELECT … FOR UPDATE SKIP LOCKED` | Aucune dépendance | Reprises, délais, cron et nettoyage à réécrire |

## Décision

**pg-boss**, dans un process `worker` séparé (même code que l'API). Les jobs sont **créés dans la transaction** de l'action métier (boîte d'envoi transactionnelle).

## Conséquences

### Positives
- Pas de job perdu, pas de job orphelin ; pas de nouveau service à héberger, surveiller et sauvegarder.
- Escalade à 15 minutes = un job avec `startAfter`, sans planificateur externe.

### Négatives
- Les jobs doivent être idempotents (exécution possible deux fois).

### Risques et parades
- Risque : charge sur la base si le volume explose → Parade : très improbable pendant le challenge ; réglage de l'intervalle d'interrogation et de l'archivage.

## Mise en œuvre

Catalogue des jobs et règles d'écriture : [07 · Tâches de fond et temps réel](../architecture/07-taches-fond-temps-reel.md).
