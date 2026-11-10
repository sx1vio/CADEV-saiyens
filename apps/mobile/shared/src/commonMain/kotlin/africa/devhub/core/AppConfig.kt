package africa.devhub.core

/**
 * Réglages fournis par chaque plateforme au démarrage.
 *
 * @property apiBaseUrl origine de l'API, sans chemin (`https://devhub.africa`).
 * @property redirectUri retour de la connexion GitHub ; doit valoir MOBILE_REDIRECT_URI côté API.
 * @property devSignIn version de développement : propose un login GitHub pour le faux fournisseur
 *   de l'API (AUTH_FAKE_PROVIDER), qui l'ignore partout ailleurs.
 */
data class AppConfig(
    val apiBaseUrl: String,
    val redirectUri: String = DEFAULT_REDIRECT_URI,
    val devSignIn: Boolean = false,
) {
    /** Schéma seul (`devhub`), attendu par les navigateurs d'authentification. */
    val redirectScheme: String get() = redirectUri.substringBefore("://")

    companion object {
        const val DEFAULT_REDIRECT_URI = "devhub://auth/callback"
    }
}
