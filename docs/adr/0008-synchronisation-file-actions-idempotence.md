# ADR-0008 : Hors ligne : file d'actions unique et idempotence

- **Statut** : Proposé
- **Date** : 2026-10-06
- **Décideurs** : back-end (sync) et front-end ; contrat à figer ensemble (§10)
- **Exigences concernées** : O1–O5, O8, O9 ; §6.5

## Contexte

Le hors ligne est le différenciateur le plus spectaculaire et le chantier le plus risqué. Le cahier des charges fixe les grandes lignes (§6.5) : UUID par action, file IndexedDB envoyée dans l'ordre, en-tête `Idempotency-Key`, table `idempotency_keys`, `POST /sync` par lot, conflits à deux colonnes avec un plan B « dernière modification gagnante ». Il reste à décider _comment_ le front et l'API s'articulent.

## Options envisagées

### Option A : deux chemins (en ligne : appels directs ; hors ligne : file)

- **Pour** : en ligne, le code est « classique ».
- **Contre** : deux chemins à maintenir ; le chemin hors ligne, rarement exécuté pendant le développement, casse sans qu'on le voie. C'est exactement ce qui plante en démo.

### Option B : file unique pour toutes les écritures

- **Pour** : **un seul chemin**, exécuté en permanence par toute l'équipe ; le simulateur O5 devient trivial ; idempotence garantie partout.
- **Contre** : une légère latence ajoutée (écriture IndexedDB avant l'envoi, quelques millisecondes).

### Option C : moteur de synchronisation générique (CRDT, RxDB, PouchDB/CouchDB…)

- **Pour** : conflits gérés automatiquement.
- **Contre** : change de base de données ou ajoute une couche lourde ; surdimensionné pour des créations surtout additives ; bundle plus gros.

## Décision

**Option B.** Toutes les écritures passent par la file Dexie (`outbox`). Chaque action porte un `opId` (UUID v4) envoyé comme `Idempotency-Key`. L'API enregistre la clé **dans la même transaction** que l'effet métier. Les créations portent un `clientId` unique par auteur. Les modifications de texte portent une `baseVersion`. Les entités créées hors ligne se référencent par `client:<uuid>`.

## Conséquences

### Positives

- Aucun doublon possible, même avec des réseaux qui coupent au milieu d'une réponse.
- Le parcours hors ligne est testé à chaque utilisation de l'application.
- Le plan B (dernière modification gagnante) ne change pas le contrat.

### Négatives

- Les endpoints d'écriture exigent tous l'en-tête `Idempotency-Key` (y compris pour les outils de test : un helper est fourni).

### Risques et parades

- Risque : retard de l'écran de conflit → Parade : plan B prévu, contrat inchangé.
- Risque : secrets stockés en clair dans IndexedDB → Parade : masquage avant la mise en file (O9), purge à la déconnexion.

## Mise en œuvre

Contrat détaillé : [04 · Hors ligne et synchronisation](../architecture/04-hors-ligne-sync.md). Toute modification exige l'approbation d'un back-end **et** du front-end.
