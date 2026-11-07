# DevHub Africa : applications Android et iOS

Applications natives en **Kotlin Multiplatform** et **Compose Multiplatform** : une seule base de code, une interface partagée. Les choix et le protocole de connexion sont décrits dans l'[ADR-0021](../../docs/adr/0021-applications-mobiles-kmp.md).

## Structure

```text
apps/mobile/
├── shared/                         Code commun (Kotlin)
│   └── src/
│       ├── commonMain/             Réseau, session, écrans Compose, traductions FR/EN
│       ├── androidMain/            Keystore, Custom Tabs, SHA-256 et aléa du JDK
│       ├── iosMain/                SHA-256 et aléa natifs, point d'entrée MainViewController
│       ├── commonTest/             Tests du code commun (API simulée)
│       └── androidHostTest/        Test de bout en bout contre une vraie API (facultatif)
├── androidApp/                     Application Android (activité, manifeste, icône)
└── iosApp/                         Application iOS (SwiftUI, Keychain, ASWebAuthenticationSession)
```

| Couche (`shared/…/africa/devhub`) | Rôle                                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------ |
| `core`                            | Réglages fournis par la plateforme (`AppConfig`)                                                 |
| `platform`                        | Contrats propres à chaque plateforme : stockage chiffré, navigateur, hash                        |
| `network`                         | Client Ktor : base, JSON tolérant, Bearer, erreurs RFC 9457                                      |
| `auth`                            | PKCE, session, connexion GitHub, déconnexion                                                     |
| `me`                              | `GET /me`, code de conduite                                                                      |
| `passport`                        | Passport public, preuves paginées, réimport GitHub                                               |
| `sos`                             | SOS Dev : liste, question, piste IA, réponses, votes, validation, « Je m\'en occupe »            |
| `rooms`                           | Salles : liste, création, tâches (Kanban), adhésion, discussion                                  |
| `offline`                         | Hors ligne : cache de lecture, file d\'actions, synchronisation, connectivité, espace par compte |
| `app`                             | Graphe des dépendances (`AppGraph`) et état global (`AppViewModel`)                              |
| `ui`                              | Thème (couleurs du web), écrans, navigation                                                      |

## Prérequis

| Outil        | Version          | Pour                                     |
| ------------ | ---------------- | ---------------------------------------- |
| JDK          | 21               | Gradle, Android                          |
| SDK Android  | plateforme 37    | Android (`local.properties` : `sdk.dir`) |
| macOS, Xcode | Xcode 16 ou plus | iOS uniquement                           |
| XcodeGen     | 2.x              | Générer le projet Xcode (`brew install`) |

Gradle est fourni par le wrapper (`./gradlew`) : rien à installer.

## Android

```bash
cd apps/mobile
./gradlew :shared:testAndroidHostTest      # tests du code commun
./gradlew :androidApp:assembleDebug        # APK de développement
./gradlew :androidApp:lintDebug            # lint (avertissements bloquants)
./gradlew :androidApp:installDebug         # sur un téléphone branché ou un émulateur
```

### Contre l'API locale

1. Démarrer l'API avec le faux fournisseur GitHub (`AUTH_FAKE_PROVIDER=true`, voir le [guide de démarrage](../../docs/guides/demarrage.md)).
2. Rendre l'API du poste visible du téléphone : `adb reverse tcp:3000 tcp:3000`.
3. Lancer l'application : en version de développement, un champ « Login GitHub » permet de choisir le compte du faux fournisseur.

L'adresse de l'API vient de `devhub.apiUrl` (`gradle.properties`, `http://localhost:3000` par défaut). Une version publiée exige HTTPS :

```bash
./gradlew :androidApp:assembleRelease -Pdevhub.apiUrl=https://api.exemple.africa
```

## iOS (sur macOS)

```bash
brew install xcodegen
cd apps/mobile/iosApp
xcodegen                 # génère DevHub.xcodeproj depuis project.yml
open DevHub.xcodeproj    # lancer sur un simulateur
```

La phase de build « Compile Kotlin framework » appelle `./gradlew :shared:embedAndSignAppleFrameworkForXcode`. L'adresse de l'API vient du réglage de build `DEVHUB_API_URL` (`http://localhost:3000` par défaut ; le simulateur joint l'API du Mac directement). Pour une version publiée : `xcodebuild … DEVHUB_API_URL=https://…`.

## Connexion GitHub

Le navigateur système ouvre `GET /api/v1/auth/github/mobile?challenge=…` (PKCE S256). L'API revient par `devhub://auth/callback?code=…` avec un code chiffré, valable 2 minutes, que l'application échange contre la session (`POST /api/v1/auth/mobile/token`) avec son secret PKCE. La session est ensuite envoyée en `Authorization: Bearer`, avec `X-DevHub-Client: mobile`. Le jeton est chiffré sur le téléphone : Keystore Android, Keychain iOS ; il n'est jamais sauvegardé ni transféré.

## Test de bout en bout

`LiveApiTest` exécute la connexion, l'acceptation du code de conduite et la déconnexion contre une vraie API. Il est ignoré si `DEVHUB_E2E_API_URL` n'est pas défini :

```bash
DEVHUB_E2E_API_URL=http://localhost:3000 ./gradlew :shared:testAndroidHostTest --tests 'africa.devhub.LiveApiTest'
```

## Étapes suivantes

Livraison pas à pas (ADR-0021, §5) : 1. socle ; 2. Passport et connexion par e-mail ; 3. SOS Dev ; 4. hors ligne ; 5. salles de projet (cette version) ; 6. notifications ; 7. découverte, classement, règles, réglages ; 8. services écosystème.
