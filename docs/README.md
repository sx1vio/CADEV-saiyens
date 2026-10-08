# Documentation DevHub Africa

> Nom de travail. Projet de l'équipe **CADEV-saiyens** pour le Systalink Challenge, Coupe d'Afrique des Développeurs 2026.
> Gel du code : **jeudi 22 octobre**. Soumission : **samedi 24 octobre avant midi**.

Cette documentation traduit les cahiers des charges en architecture exécutable. Les deux PDF de ce dossier restent les références produit :

| Document                                                                             | Rôle                                                          |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| [`Cahier_des_charges_v3_DevHub_Africa.pdf`](Cahier_des_charges_v3_DevHub_Africa.pdf) | Référence produit (périmètre, user stories, règles, planning) |
| [`CDC_v3.1_DevHub_Africa_Propositions.pdf`](CDC_v3.1_DevHub_Africa_Propositions.pdf) | Propositions d'ajouts et correctifs, à trier en équipe        |

**Règle de lecture** : quand cette documentation et le cahier des charges divergent sur le _quoi_ (fonctionnalités, priorités), le cahier des charges gagne. Sur le _comment_ (code, structure, conventions), cette documentation gagne. Toute divergence découverte s'ouvre en issue.

## Par où commencer

| Je suis…                     | Je lis d'abord                                                                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Nouveau sur le projet        | [Vue d'ensemble](architecture/00-vue-ensemble.md), puis [Organisation de l'équipe](equipe/organisation.md)                                  |
| Back-end                     | [Back-end](architecture/02-backend.md), [Modèle de données](architecture/05-modele-donnees.md), [Contrat d'API](architecture/06-api.md)     |
| Front-end                    | [Front-end](architecture/03-frontend.md), [Hors ligne et synchronisation](architecture/04-hors-ligne-sync.md)                               |
| DevOps / sécurité            | [Infrastructure et déploiement](architecture/11-infrastructure-deploiement.md), [Sécurité](architecture/10-securite.md)                     |
| IA et intégrations           | [IA et GitHub](architecture/09-ia-integrations.md), [Algorithmes](architecture/08-algorithmes.md)                                           |
| Sur le point d'ouvrir une PR | [Workflow Git](equipe/workflow-git.md), [Revue de code](equipe/revue-de-code.md), [Définition de « terminé »](equipe/definition-of-done.md) |

## Sommaire

### Architecture (`architecture/`)

| #   | Document                                                                       | Contenu                                                                 |
| --- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| 00  | [Vue d'ensemble](architecture/00-vue-ensemble.md)                              | Principes, schéma de contexte, conteneurs, flux principaux              |
| 01  | [Structure du monorepo](architecture/01-structure-monorepo.md)                 | Arborescence complète, rôle de chaque paquet, règles de dépendance      |
| 02  | [Back-end](architecture/02-backend.md)                                         | Monolithe modulaire NestJS, modules métier, couches, événements         |
| 03  | [Front-end](architecture/03-frontend.md)                                       | PWA React, organisation par fonctionnalité, routes, i18n, performance   |
| 04  | [Hors ligne et synchronisation](architecture/04-hors-ligne-sync.md)            | Service worker, file d'actions, idempotence, conflits, simulateur       |
| 05  | [Modèle de données](architecture/05-modele-donnees.md)                         | Tables, relations, index, invariants, migrations                        |
| 06  | [Contrat d'API](architecture/06-api.md)                                        | Conventions REST, erreurs, pagination, idempotence, liste des endpoints |
| 07  | [Tâches de fond et temps réel](architecture/07-taches-fond-temps-reel.md)      | File pg-boss, jobs, Server-Sent Events, LISTEN/NOTIFY                   |
| 08  | [Algorithmes](architecture/08-algorithmes.md)                                  | Matching, Proof XP, scores de compétence, garde-fous                    |
| 09  | [IA et intégrations](architecture/09-ia-integrations.md)                       | Appels au modèle de langage, injection de prompt, API GitHub            |
| 10  | [Sécurité](architecture/10-securite.md)                                        | Authentification, sessions, secrets, CSP, abus, données personnelles    |
| 11  | [Infrastructure et déploiement](architecture/11-infrastructure-deploiement.md) | Systalink, Docker Compose, Caddy, CI/CD, sauvegardes                    |
| 12  | [Tests et qualité](architecture/12-tests-qualite.md)                           | Pyramide de tests, tests hors ligne, budgets de performance             |

### Décisions d'architecture (`adr/`)

L'[index des ADR](adr/README.md) liste toutes les décisions techniques, leur statut et leur justification. **Une décision structurante sans ADR n'est pas prise.**

### Front-end (`front/`)

| Document                                           | Contenu                                                                |
| -------------------------------------------------- | ---------------------------------------------------------------------- |
| [Décisions front](front/decisions.md)              | Toutes les décisions d'interface, de design et de périmètre du front   |
| [Analyse de la phase 0](front/phase0-analyse.md)   | Lecture du cahier des charges côté front, parcours, écrans, contrastes |
| [Brief de design](front/prompt-frontend-design.md) | Brief UX/UI initial et [images d'inspiration](front/inspirations/)     |

Le journal daté de tout le travail front est dans [`SUIVI.md`](../SUIVI.md), à la racine.

### Équipe (`equipe/`)

| Document                                                  | Contenu                                                                 |
| --------------------------------------------------------- | ----------------------------------------------------------------------- |
| [Organisation](equipe/organisation.md)                    | Qui fait quoi, propriétaires de modules, rituels, planning par personne |
| [Workflow Git](equipe/workflow-git.md)                    | Branches, commits, pull requests, protection de `main`, gel             |
| [Revue de code](equipe/revue-de-code.md)                  | Comment relire, étiquettes de sévérité, checklists                      |
| [Définition de « terminé »](equipe/definition-of-done.md) | Les critères pour fermer une tâche                                      |
| [Glossaire](equipe/glossaire.md)                          | Le vocabulaire commun du produit et du code                             |

## Tenir cette documentation à jour

- Une PR qui change un comportement visible, un contrat d'API ou le modèle de données **met à jour le document concerné dans la même PR**.
- Une décision structurante nouvelle ou modifiée devient un ADR (voir [`adr/template.md`](adr/template.md)). On ne réécrit jamais un ADR accepté : on en écrit un nouveau qui le remplace.
- Les schémas sont en [Mermaid](https://mermaid.js.org/), rendus directement par GitHub.
