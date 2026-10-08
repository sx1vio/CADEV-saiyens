# Définition de « terminé »

Reprise du cahier des charges (§10) : une tâche est terminée quand elle **fonctionne sur l'URL de démo**, qu'elle a été **testée par une personne qui n'a pas écrit le code**, et qu'elle est **documentée dans le README si le jury la voit**. Le détail opérationnel est ci-dessous.

## Pour une user story (issue)

- [ ] Les **critères d'acceptation** du cahier des charges sont tenus (par exemple pour S2 : piste IA en moins de 10 s, marquée « générée par IA », jamais bloquante).
- [ ] Le code est **fusionné sur `main`** par une PR approuvée par une autre personne.
- [ ] La CI est verte : lint, types, tests, build, tests de bout en bout, sécurité, budgets.
- [ ] La fonctionnalité est **visible et fonctionne en production** (URL Systalink), vérifiée par l'auteur après le déploiement.
- [ ] Une **autre personne** l'a essayée sur la production, sans explication, en moins de 2 minutes (critère commun des P0, §5).
- [ ] Elle fonctionne **en français et en anglais**.
- [ ] Elle fonctionne **sur mobile** (écran étroit, tactile) et **hors ligne** dans la mesure prévue par [04](../architecture/04-hors-ligne-sync.md) (lecture en cache, actions en file, ou message clair si le réseau est indispensable).
- [ ] Les **tests** prévus par [12](../architecture/12-tests-qualite.md) existent (unitaires pour la logique, bout en bout pour le chemin de la démo).
- [ ] La **documentation** est à jour : contrat d'API, modèle de données, ADR si besoin ; README si le jury la voit.
- [ ] Aucune **donnée inventée** présentée comme réelle ; comptes de démo marqués.
- [ ] L'issue est déplacée dans _Terminé_ sur le tableau GitHub Projects.

## Pour un jalon

- [ ] Le **critère de sortie** du jalon est démontré sur la production, devant l'équipe (revue de jalon).
- [ ] Les bugs bloquants découverts sont corrigés ou ont une issue étiquetée `démo`.
- [ ] L'étiquette de version est posée (voir le [workflow Git](workflow-git.md#jalons-et-étiquettes-de-version)).

| Jalon      | Date    | Critère de sortie                                                                                                 |
| ---------- | ------- | ----------------------------------------------------------------------------------------------------------------- |
| 1          | 8 oct.  | Connexion GitHub, profil, base de données et URL Systalink en ligne                                               |
| 2          | 14 oct. | Poser une question, recevoir une piste IA et une réponse d'un autre dev, de bout en bout ; 30+ devs invités       |
| 3          | 16 oct. | Poser, lire et répondre sans réseau, puis synchronisation au retour de la connexion, testés sur un vrai téléphone |
| 4          | 18 oct. | Créer une salle, lier un dépôt, rejoindre, créer et prendre des tâches                                            |
| 5          | 22 oct. | Passport, Proof XP, découverte, écran Systalink et écran d'impact fonctionnent ; le code est gelé                 |
| Soumission | 24 oct. | Démo testée par un tiers, vidéo, README et soumission envoyée                                                     |

## Pour la soumission (checklist §15 du cahier des charges)

- [ ] Équipe déclarée sur le tableau de bord du challenge
- [ ] Projet déclaré (nom, description, thème)
- [ ] Au moins un produit Systalink actif et utilisé en production (idéalement VPS, base, sauvegarde, messagerie)
- [ ] Démo accessible en ligne, testée par une personne extérieure à l'équipe
- [ ] Passport public accessible sans compte, aperçu de partage vérifié
- [ ] Mode hors ligne testé sur un vrai téléphone, réseau coupé
- [ ] 30+ devs invités, questions et projets réels dans la plateforme
- [ ] Dépôt git propre, public ou partagé selon le règlement, historique de commits régulier
- [ ] README : concept, captures, installation, architecture, liste des produits Systalink utilisés
- [ ] Vidéo de démo de 3 à 4 minutes
- [ ] Deck de pitch de 5 minutes
- [ ] Sauvegarde de la base de données testée par une restauration
- [ ] Compte de secours, vidéo de secours et partage de connexion prêts
- [ ] Soumission envoyée le 24 oct., confirmation reçue
