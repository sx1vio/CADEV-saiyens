# ADR-0016 : Périmètre du MVP, services « écosystème » et données de démonstration

- **Statut** : **Accepté le 2026-10-09** (Caleb, rôle 1, qui « a le dernier mot sur le périmètre », CDC §3 et §10). Points 1 et 3 de la décision **remplacés** par l'[ADR-0020](0020-services-ecosysteme-conserves.md) le 2026-10-14.
- **Date** : 2026-10-09
- **Décideurs** : Caleb (rôle 1)
- **Exigences concernées** : CDC v3 §2, §3, §6.6, §9, §13 ; PR #96 et #97 ; BUG-005

## Contexte

Le front proposé dans #97 (environ 39 000 lignes) suit un pivot décidé côté front le 6 octobre (`docs/front/decisions.md` §11, sur la branche de #97) : « Oublie le cahier des charges. […] une vraie plateforme écosystème avec multi services ». Il ajoute des écrans que le cahier des charges v3 range **explicitement** en roadmap (§3 : « à présenter, pas à coder ») :

| Écran de #97                                  | Place dans le CDC v3                                            |
| --------------------------------------------- | --------------------------------------------------------------- |
| Fil d'actualité, vidéos (module API `news`)   | « Fil d'actualité Dev Pulse », « Dev Media » : roadmap          |
| Emplois, publication d'offres                 | « Offres d'emploi, recrutement par preuves » : roadmap          |
| Certifications, examens                       | « Challenges Verified Skill et certifications » : roadmap       |
| Skills et plugins pour agents IA              | « Hub de skills et de plugins pour agents IA » : roadmap        |
| Apprendre, guide « Créer avec l'IA », modèles | « Parcours d'apprentissage et assistant de création » : roadmap |

Ces écrans s'appuient sur un **serveur simulé dans le navigateur**, avec des données de démonstration. Ce serveur est aussi le mode par défaut de toute l'application dès que `VITE_API_URL` n'est pas définie. L'accueil pèse 312 Ko en mode local, au-dessus du budget de 300 Ko (§9).

Le back-end (Caleb, Florent, Joachim) construit le CDC v3 : SOS Dev, salles, Passport, Proof XP. Il ne peut pas servir en 13 jours une dizaine de services de plus.

## Critères de décision

- **Gagner le challenge** : une démo qui marche et un produit compris en 20 secondes (§2) ; la réponse « pourquoi pas GitHub, Discord ou Reddit » (§1) doit rester vraie.
- **Tenir les dates** : gel du code le 22 octobre ; règle d'arbitrage « on coupe avant de repousser » (§3).
- **Honnêteté** : aucune donnée inventée présentée comme réelle (§6.6, §13).
- **Ne pas jeter le travail de Sylvio** : il sert la roadmap et le pitch.

## Options envisagées

### Option A : adopter le pivot « écosystème »

- **Pour** : produit plus vaste, impression de richesse.
- **Contre** : contredit le CDC adopté par l'équipe ; positionnement brouillé (« un Reddit de plus ») ; dix services sans back-end, donc des données simulées en démo ; charge impossible pour trois développeurs back-end en 13 jours.

### Option B : supprimer les écrans hors périmètre

- **Pour** : périmètre net.
- **Contre** : perd un travail utile pour présenter la roadmap au jury.

### Option C : garder le CDC v3, montrer les services comme roadmap

- **Pour** : produit focalisé et démontrable ; le travail de Sylvio sert le pitch sous une forme honnête.
- **Contre** : il faut retravailler la navigation de #97.

## Décision

**Option C.** Le périmètre du MVP reste celui du **CDC v3**, avec les ajouts v3.1 retenus dans l'[ADR-0017](0017-tri-des-propositions-v3-1.md).

1. **Navigation du MVP** : accueil, SOS Dev, salles de projet, Découvrir et classement, Passport, Systalink et impact, règles, réglages, administration. Rien d'autre dans les menus.
2. **Services écosystème** (fil d'actualité, vidéos, emplois, certifications, skills IA, apprendre, guide, modèles) : ils ne sont plus accessibles dans l'application. Ils sont montrés sur **une page « Feuille de route »** statique, présentée comme telle (« Bientôt »), sans données simulées. Le code est conservé sur une branche (`roadmap/ecosysteme`) pour la suite.
3. **Module API `news`** : il **n'entre pas** dans `main` pendant le challenge. Il reste un candidat sérieux pour l'après-challenge (Dev Pulse), à reprendre avec ses points de sécurité (voir la relecture de #97).
4. **Serveur simulé du front** : il reste un outil de **développement**. En production, le front parle à l'API réelle (`/api/v1` sur la même origine, ADR-0011), et la construction de production échoue si le mode local y est activé. En développement, un bandeau « Données de démonstration » est affiché en permanence.
5. **Budget** : l'accueil passe sous 300 Ko en conditions de production, contrôlé en CI (ADR-0003, `size-limit`).

## Conséquences

### Positives

- Un produit lisible pour le jury, fidèle au document que l'équipe a adopté ; aucune donnée simulée en démo.
- Le back-end reste aligné sur ce que le front affiche.

### Négatives

- #97 doit être retravaillée avant fusion : retrait des écrans hors périmètre de la navigation, retrait du module `news`, mode local réservé au développement.
- Une partie du travail visuel de Sylvio attend l'après-challenge.

### Risques et parades

- Risque : désaccord de Sylvio, qui a demandé ce pivot. Parade : décision expliquée en point d'équipe, travail conservé sur une branche et valorisé dans le pitch comme roadmap crédible (§12, démo 3:35). Le rôle 1 a le dernier mot sur le périmètre (§10).

## Décisions liées

- [ADR-0017](0017-tri-des-propositions-v3-1.md) : ajouts v3.1 retenus.
- [ADR-0018](0018-pile-front-reelle.md) : pile front réelle.
