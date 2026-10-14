# ADR-0009 : Sessions serveur par cookie plutôt que JWT

- **Statut** : **Accepté le 2026-10-09** (Caleb, rôle 1), conforme au code fusionné sur `main`.
- **Date** : 2026-10-06
- **Décideurs** : back-end, sécurité (Emmanuel)
- **Exigences concernées** : §9 (« sessions par cookie HttpOnly et SameSite »), A1, A3, M1

## Contexte

Le cahier des charges impose des sessions par cookie HttpOnly et SameSite. Il reste à décider ce que contient le cookie : un JWT autoportant, ou un identifiant de session vérifié en base.

## Options envisagées

| Option                                    | Pour                                                                                                              | Contre                                                                                                |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Identifiant opaque + table `sessions`** | Révocation immédiate (déconnexion, suppression de compte, bannissement par la modération) ; aucune donnée exposée | Une lecture en base par requête (rapide, indexée, et la base est de toute façon interrogée)           |
| JWT dans un cookie                        | Pas de lecture en base                                                                                            | Révocation difficile (liste noire = retour à une table) ; jeton plus gros ; rotation des clés à gérer |
| JWT dans `localStorage`                   | Simple côté front                                                                                                 | Exposé au XSS ; **contraire au cahier des charges**                                                   |

## Décision

**Cookie `__Host-sid`** (HttpOnly, Secure, SameSite=Lax) contenant un jeton aléatoire de 256 bits. La base ne stocke que son **empreinte SHA-256**. Durée de 30 jours glissants.

## Conséquences

### Positives

- La modération peut couper une session immédiatement ; la suppression de compte (A3) déconnecte partout.
- Une fuite de la table `sessions` ne permet pas d'usurper une session.

### Négatives

- Le SSE et chaque requête relisent la session (mise en cache mémoire de 60 s par process).

## Décisions liées

- [10 · Sécurité](../architecture/10-securite.md) : CSRF, CORS, en-têtes.
