# Essais réels (session de vérification)

Parcours joués dans un vrai navigateur (Playwright, Chromium) contre l'API locale avec le faux
fournisseur GitHub (`AUTH_FAKE_PROVIDER=true`) et le front en `VITE_API_MODE=http`. Ils complètent
les e2e de `apps/web/e2e` : on les lance à la main après une fusion importante, et chacun affiche
ce qu'il observe (pas d'assertion bloquante).

```bash
# API sur 3002, front sur 5175 (DEVHUB_API_PROXY=http://127.0.0.1:3002 pnpm --filter @devhub/web dev --port 5175)
WEB=http://localhost:5175 OUT=/tmp/verif node scripts/verif/onboarding.mjs awa-dev CI
node scripts/verif/sos.mjs awa-dev kofi-dev        # S1 à S4, temps réel, XP
node scripts/verif/offline-read.mjs <id-question>  # O1 : build + vite preview (service worker)
API=http://localhost:3002 node scripts/verif/share-preview.mjs  # R7 : aperçus, injection, PR14
```

| Script               | Ce qu'il vérifie                                                                                     |
| -------------------- | ---------------------------------------------------------------------------------------------------- |
| `onboarding.mjs`     | Les 5 étapes de `/bienvenue` (BUG-027), pays, fuseau et code de conduite enregistrés                 |
| `sos.mjs`            | Question, secret masqué, piste IA, réponse en direct, validation, Proof XP, notifications            |
| `offline-read.mjs`   | Lecture hors ligne des pages ouvertes, vidage du cache (session, changement de compte)               |
| `offline-write.mjs`  | Rédaction hors ligne (`?net=offline`), file IndexedDB, `POST /sync` sans doublon                     |
| `share-preview.mjs`  | Balises de partage `/u/:handle` et `/p/:code`, échappement, `hideStats`                              |
| `rooms.mjs`          | Salle liée à un dépôt, adhésion, tâche prise puis clôturée avec PR vérifiée, +15 XP                  |
| `rooms-rights.mjs`   | Droits des salles côté serveur (non-membre, membre, anonyme, en-tête CSRF)                           |
| `screens.mjs`        | Passport, découverte, classement, /systalink, /impact comparés à l'API                               |
| `moderation.mjs`     | Signalement depuis l'interface, retrait par un admin, journal `admin_actions`                        |
| `realtime.mjs`       | Réception en direct d'une réponse selon le moment de sa publication (BUG-033)                        |
| `conflict.mjs`       | Conflit de version (O4) : « Garder celle en ligne » sur une question, fusion sur une réponse, droits |
| `report-user.mjs`    | Signaler un compte depuis son Passport, traitement dans /admin (BUG-036)                             |
| `delete-account.mjs` | Suppression du compte (A3) : confirmation, protections, anonymisation, reconnexion                   |
| `phone-offline.mjs`  | Jalon 3 en émulation Moto G4 : vraie coupure, rechargement hors ligne, synchronisation sans doublon  |
