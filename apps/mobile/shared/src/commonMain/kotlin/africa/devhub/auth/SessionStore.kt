package africa.devhub.auth

import africa.devhub.platform.SecureStore
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Session courante : le jeton vit chiffré dans [SecureStore] et en mémoire pour les requêtes.
 * Son expiration est gérée par l'API (30 jours glissants) : un 401 efface la session.
 */
class SessionStore(private val secure: SecureStore) {
    private val token = MutableStateFlow<String?>(null)
    private var loaded = false

    /** Jeton courant ; null quand personne n'est connecté. */
    val session: StateFlow<String?> = token.asStateFlow()

    /** Relit le jeton chiffré. À appeler une fois au démarrage. */
    fun load() {
        if (loaded) return
        token.value = runCatching { secure.read(KEY) }.getOrNull()
        loaded = true
    }

    fun current(): String? = token.value

    fun save(sessionToken: String) {
        secure.write(KEY, sessionToken)
        token.value = sessionToken
    }

    fun clear() {
        runCatching { secure.delete(KEY) }
        token.value = null
    }

    private companion object {
        const val KEY = "devhub.session"
    }
}
