package africa.devhub.auth

import africa.devhub.core.AppConfig
import africa.devhub.network.ApiException
import africa.devhub.network.NetworkException
import africa.devhub.platform.AuthBrowser
import io.ktor.http.URLBuilder
import io.ktor.http.Url
import io.ktor.http.appendPathSegments
import kotlinx.coroutines.CancellationException

/** Issue d'une tentative de connexion. */
sealed interface SignInResult {
    data object SignedIn : SignInResult

    /** La personne a fermé le navigateur : pas une erreur. */
    data object Cancelled : SignInResult

    /** Échec, avec la raison renvoyée par l'API (`access_denied`, `suspended`…) ou `network`. */
    data class Failed(val reason: String) : SignInResult
}

/**
 * Connexion GitHub mobile (ADR-0021) : navigateur système avec le défi PKCE, retour par
 * `devhub://auth/callback?code=…`, puis échange du code avec le secret PKCE.
 */
class AuthRepository(
    private val config: AppConfig,
    private val api: AuthApi,
    private val browser: AuthBrowser,
    private val sessions: SessionStore,
) {
    /** URL de départ ; [loginHint] ne sert qu'avec le faux fournisseur de développement. */
    fun signInUrl(challenge: String, loginHint: String? = null): String =
        URLBuilder(config.apiBaseUrl)
            .apply {
                appendPathSegments("api", "v1", "auth", "github", "mobile")
                parameters.append("challenge", challenge)
                if (!loginHint.isNullOrBlank()) parameters.append("login", loginHint)
            }
            .buildString()

    suspend fun signInWithGithub(loginHint: String? = null): SignInResult {
        val verifier = Pkce.newVerifier()
        val callback = browser.authenticate(
            signInUrl(Pkce.challenge(verifier), loginHint),
            config.redirectScheme,
        ) ?: return SignInResult.Cancelled
        return complete(callback, verifier)
    }

    /** Termine la connexion à partir de l'adresse de retour reçue par l'application. */
    suspend fun complete(callback: String, verifier: String): SignInResult {
        val url = runCatching { Url(callback) }.getOrNull()
        // On n'accepte que notre propre adresse de retour, pas n'importe quel lien devhub://.
        if (url == null || !callback.startsWith(config.redirectUri)) {
            return SignInResult.Failed("invalid_state")
        }
        url.parameters["error"]?.let { return SignInResult.Failed(it) }
        val code = url.parameters["code"] ?: return SignInResult.Failed("invalid_state")
        return openSession { api.exchange(code, verifier) }
    }

    /** Connexion par e-mail et mot de passe ; la raison d'un échec est le code de l'API. */
    suspend fun signInWithEmail(email: String, password: String): SignInResult =
        openSession { api.emailLogin(email.trim(), password) }

    /** Inscription par e-mail ; le compte est ouvert et connecté d'un coup. */
    suspend fun registerWithEmail(displayName: String, email: String, password: String): SignInResult =
        openSession { api.emailRegister(displayName.trim(), email.trim(), password) }

    private suspend fun openSession(request: suspend () -> MobileTokenResponse): SignInResult =
        try {
            sessions.save(request().sessionToken)
            SignInResult.SignedIn
        } catch (e: CancellationException) {
            throw e
        } catch (e: ApiException) {
            SignInResult.Failed(e.code ?: "http_${e.status}")
        } catch (e: NetworkException) {
            SignInResult.Failed("network")
        }

    /** Révoque la session côté serveur si possible, puis l'efface du téléphone dans tous les cas. */
    suspend fun signOut() {
        try {
            if (sessions.current() != null) api.logout()
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            // Hors ligne : la session expirera côté serveur ; l'important est de l'oublier ici.
        } finally {
            sessions.clear()
        }
    }
}
