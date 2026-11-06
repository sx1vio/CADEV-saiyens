package africa.devhub.platform

import kotlin.coroutines.resume
import kotlinx.coroutines.suspendCancellableCoroutine

/**
 * Session d'authentification implémentée en Swift avec ASWebAuthenticationSession
 * (iosApp/iosApp/WebAuthSession.swift) : l'API Apple s'utilise plus sûrement depuis Swift.
 */
interface IosAuthSession {
    /** Ouvre [url] ; [completion] reçoit l'adresse de retour, ou null en cas d'annulation. */
    fun start(url: String, callbackScheme: String, completion: (String?) -> Unit)
}

class IosAuthBrowser(private val session: IosAuthSession) : AuthBrowser {
    override suspend fun authenticate(url: String, callbackScheme: String): String? =
        suspendCancellableCoroutine { continuation ->
            session.start(url, callbackScheme) { callback ->
                if (continuation.isActive) continuation.resume(callback)
            }
        }
}
