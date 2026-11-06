package africa.devhub.app

import africa.devhub.auth.AuthApi
import africa.devhub.auth.AuthRepository
import africa.devhub.auth.SessionStore
import africa.devhub.core.AppConfig
import africa.devhub.me.MeApi
import africa.devhub.network.createHttpClient
import africa.devhub.platform.AuthBrowser
import africa.devhub.platform.SecureStore
import io.ktor.client.engine.HttpClientEngine

/**
 * Graphe des dépendances de l'application, construit une fois par processus (ADR-0021 :
 * pas de framework d'injection). Chaque plateforme fournit le stockage chiffré et le navigateur.
 */
class AppGraph(
    val config: AppConfig,
    secureStore: SecureStore,
    authBrowser: AuthBrowser,
    engine: HttpClientEngine? = null,
) {
    val sessions = SessionStore(secureStore)

    private val http = createHttpClient(
        config = config,
        sessionToken = sessions::current,
        onUnauthorized = { sessions.clear() },
        engine = engine,
    )

    val meApi = MeApi(http)
    val auth = AuthRepository(config, AuthApi(http), authBrowser, sessions)
}
