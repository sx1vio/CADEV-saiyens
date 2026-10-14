# ADR-0011 : Déploiement Docker Compose + Caddy sur le VPS Systalink

- **Statut** : **Accepté le 2026-10-09** (Caleb, rôle 1) ; fichiers en place (`infra/`, CI), **aucun déploiement réalisé** (Emmanuel, #6).
- **Date** : 2026-10-06
- **Décideurs** : rôle 4 (Emmanuel)
- **Exigences concernées** : §8 (VPS Systalink, Docker Compose, Caddy, GitHub Actions), §9 (déploiement reproductible), critère Systalink (40 %)

## Contexte

Le cahier des charges fixe l'hébergement : VPS Systalink, Docker Compose, proxy HTTPS automatique (Caddy), déploiement à chaque fusion sur `main` via GitHub Actions. Il reste à préciser la chaîne.

## Décision

- **Images** construites en CI (`Dockerfile.api` pour l'API et le worker, `Dockerfile.web` qui embarque le build du front dans une image Caddy), étiquetées avec le **SHA du commit**, poussées sur GitHub Container Registry.
- **Déploiement** par SSH : `infra/scripts/deploy.sh <sha>` → migrations → `docker compose up -d` → attente de `/readyz` → smoke test → **retour arrière automatique** à l'image précédente en cas d'échec.
- **Caddy** sert les fichiers statiques et route `/api`, `/u`, `/p`, `/og`, `/badge` vers l'API ; TLS automatique ; en-têtes de sécurité.
- **Un seul environnement** de production (= URL de démo), sécurisé par la CI, les migrations compatibles avec la version précédente et le retour arrière.

## Options écartées

| Option                            | Raison                                                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Kubernetes, Swarm                 | Surdimensionné pour un VPS et 20 jours                                                                       |
| Build des images sur le VPS       | Lent, consomme les ressources de production, non reproductible                                               |
| Nginx + Certbot                   | Caddy fait la même chose avec TLS automatique et une configuration plus courte (choix du cahier des charges) |
| Hébergeur tiers (Vercel, Render…) | Contraire au critère Systalink                                                                               |

## Conséquences

### Positives

- « Déploiement reproductible en une commande » (§8) ; démo toujours à jour.
- Retour arrière en moins d'une minute.

### Négatives

- Pas de préproduction : une erreur de logique passe en production si les tests ne la voient pas → renforcer les tests de bout en bout sur le parcours de la démo.

## Mise en œuvre

[11 · Infrastructure et déploiement](../architecture/11-infrastructure-deploiement.md), [`infra/`](../../infra/), [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml).
