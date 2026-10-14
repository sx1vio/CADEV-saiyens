# ADR-0007 : Temps réel par Server-Sent Events et LISTEN/NOTIFY

- **Statut** : **Accepté le 2026-10-09** (Caleb, rôle 1) ; pas encore implémenté (Y8, Florent, Jalon 2).
- **Date** : 2026-10-06
- **Décideurs** : back-end, front-end
- **Exigences concernées** : S3 (notification en moins d'une minute), S11, O3, M1 ; correctif v3.1 **Y8**

## Contexte

Le v3 exige des notifications en moins d'une minute, sans préciser comment le front les reçoit (point d'attention n° 5 de la v3.1). Le flux va du serveur vers le client ; les écritures passent par HTTP et la file d'actions.

## Options envisagées

| Option                         | Pour                                                                                         | Contre                                                                                                                                         |
| ------------------------------ | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **SSE + LISTEN/NOTIFY**        | HTTP standard, passe les proxys, reprise automatique (`Last-Event-ID`), aucun service ajouté | Unidirectionnel (suffisant ici)                                                                                                                |
| WebSocket (Socket.IO)          | Bidirectionnel                                                                               | Proxys mobiles parfois hostiles, reprise à gérer soi-même, inutile pour un flux descendant, et passage à plusieurs instances qui demande Redis |
| Interrogation périodique seule | Trivial                                                                                      | Latence et consommation de data, mauvais pour l'économie de data (O6)                                                                          |
| Service tiers (Pusher, Ably)   | Rien à héberger                                                                              | Service externe hors Systalink, coût, données qui sortent                                                                                      |

## Décision

**SSE** sur `GET /api/v1/events`, alimenté par **`LISTEN/NOTIFY`** PostgreSQL (une connexion d'écoute par process API), avec reprise par `notifications.seq` et **repli par interrogation toutes les 30 s** après trois échecs.

## Conséquences

### Positives

- La promesse « moins d'une minute » devient « quelques centaines de millisecondes ».
- Fonctionne avec plusieurs instances d'API sans brique supplémentaire.

### Négatives

- Une connexion ouverte par onglet connecté ; Caddy doit désactiver le tampon sur cette route.

### Risques et parades

- Risque : proxy d'opérateur qui coupe les connexions longues → Parade : ping toutes les 25 s, reprise automatique, repli par interrogation.
