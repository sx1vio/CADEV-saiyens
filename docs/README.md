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

**Toujours d'abord : [`context.md`](../context.md)**, la source de vérité partagée (objectif, état actuel, décisions, risques ouverts), à lire au début de chaque session et à mettre à jour avant de clôturer une action.

| Je suis…                           | Je lis d'abord                                                                                                                                                                                 |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nouveau sur le projet              | [`context.md`](../context.md), le [guide de démarrage](guides/demarrage.md), puis la [vue d'ensemble](architecture/00-vue-ensemble.md) et l'[organisation de l'équipe](equipe/organisation.md) |
| Je veux savoir où en est le projet | [Suivi du cahier des charges](suivi/suivi-cahier-des-charges.md), [registre des anomalies](suivi/anomalies.md)                                                                                 |
| Back-end                           | [Back-end](architecture/02-backend.md), [Modèle de données](architecture/05-modele-donnees.md), [Contrat d'API](architecture/06-api.md)                                                        |
| Front-end                          | [Front-end](architecture/03-frontend.md), [Hors ligne et synchronisation](architecture/04-hors-ligne-sync.md)                                                                                  |
| DevOps / sécurité                  | [Infrastructure et déploiement](architecture/11-infrastructure-deploiement.md), [Sécurité](architecture/10-securite.md)                                                                        |
| IA et intégrations                 | [IA et GitHub](architecture/09-ia-integrations.md), [Algorithmes](architecture/08-algorithmes.md)                                                                                              |
| Sur le point d'ouvrir une PR       | [Workflow Git](equipe/workflow-git.md), [Revue de code](equipe/revue-de-code.md), [Définition de « terminé »](equipe/definition-of-done.md)                                                    |

## Sommaire

### Architecture (`architecture/`)

| #   | Document                                                                       | Contenu                                                                 |
| --- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| 00  | [Vue d'ensemble](architecture/00-vue-ensemble.md)                              | Principes, schéma de contexte, conteneurs, flux principaux              |
| 01  | [Structure du monorepo](architecture/01-structure-monorepo.md)                 | Arborescence complète, rôle de chaque paquet, règles de dépendance      |
| 02  | [Back-end](architecture/02-backend.md)                                         | Monolithe modulaire NestJS, modules métier, couches, événements         |
| 03  | [Front-end](architecture/03-frontend.md)                                       | PWA React, organisation par fonctionnalité, routes, i18n, performance   |
| 04  | [Hors ligne et synchronisation](architecture/04-hors-ligne-sync.md)            | Service worker, file d'actions, idempotence, conflits                   |
| 05  | [Modèle de données](architecture/05-modele-donnees.md)                         | Tables, relations, index, invariants, migrations                        |
| 06  | [Contrat d'API](architecture/06-api.md)                                        | Conventions REST, erreurs, pagination, idempotence, liste des endpoints |
| 07  | [Tâches de fond et temps réel](architecture/07-taches-fond-temps-reel.md)      | File pg-boss, jobs, Server-Sent Events, LISTEN/NOTIFY                   |
| 08  | [Algorithmes](architecture/08-algorithmes.md)                                  | Matching, Proof XP, scores de compétence, garde-fous                    |
| 09  | [IA et intégrations](architecture/09-ia-integrations.md)                       | Appels au modèle de langage, injection de prompt, API GitHub            |
| 10  | [Sécurité](architecture/10-securite.md)                                        | Authentification, sessions, secrets, CSP, abus, données personnelles    |
| 11  | [Infrastructure et déploiement](architecture/11-infrastructure-deploiement.md) | Systalink, Docker Compose, Caddy, CI/CD, sauvegardes                    |
| 12  | [Tests et qualité](architecture/12-tests-qualite.md)                           | Pyramide de tests, tests hors ligne, budgets de performance             |

### Guides (`guides/`)

| Document                         | Contenu                                                                                                                                                       |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Démarrage](guides/demarrage.md) | Prérequis, installation, `.env`, base de données, lancement, connexion factice, tests, problèmes fréquents                                                    |
| [Pré-vol](guides/prevol.md)      | Vérifier une application avant la mise en production : page `/prevol`, jetons d'API, serveur MCP pour l'agent IA, action GitHub (contrôle du code et pré-vol) |

### Suivi (`suivi/`)

| Document                                                         | Contenu                                                                               |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [Suivi du cahier des charges](suivi/suivi-cahier-des-charges.md) | Statut de chaque exigence v3 et v3.1, tableau de bord, jalons, travail hors périmètre |
| [Registre des anomalies](suivi/anomalies.md)                     | Bugs et écarts (code, CI, outillage, processus), cause racine et correctif            |

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
- Une PR qui fait avancer une exigence met à jour le [suivi du cahier des charges](suivi/suivi-cahier-des-charges.md) ; une PR qui trouve ou corrige un bug met à jour le [registre des anomalies](suivi/anomalies.md) ; une PR qui change l'état ou les décisions du projet met à jour [`context.md`](../context.md).
- Une décision structurante nouvelle ou modifiée devient un ADR (voir [`adr/template.md`](adr/template.md)). On ne réécrit jamais un ADR accepté : on en écrit un nouveau qui le remplace.
- Les schémas sont en [Mermaid](https://mermaid.js.org/), rendus directement par GitHub.
