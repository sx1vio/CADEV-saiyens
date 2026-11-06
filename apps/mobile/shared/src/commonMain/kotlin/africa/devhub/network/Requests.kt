package africa.devhub.network

import io.ktor.client.call.body
import io.ktor.client.statement.HttpResponse
import kotlinx.coroutines.CancellationException

/**
 * Exécute un appel à l'API : erreurs HTTP en [ApiException], erreurs de transport en
 * [NetworkException]. L'annulation de la coroutine n'est jamais avalée.
 */
suspend inline fun <reified T> apiCall(crossinline request: suspend () -> HttpResponse): T {
    val response = try {
        request()
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        throw NetworkException(e)
    }
    return response.ensureSuccess().body()
}

/** Variante sans corps de réponse (204). */
suspend inline fun apiCallUnit(crossinline request: suspend () -> HttpResponse) {
    val response = try {
        request()
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        throw NetworkException(e)
    }
    response.ensureSuccess()
}
