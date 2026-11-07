package africa.devhub.notifications

import io.ktor.client.HttpClient
import io.ktor.client.plugins.HttpTimeoutConfig
import io.ktor.client.plugins.sse.sse
import io.ktor.client.plugins.timeout
import io.ktor.client.request.header
import kotlinx.coroutines.flow.collect

/** Événement du flux temps réel (GET /api/v1/events, ADR-0007). */
data class StreamEvent(val event: String?, val data: String?, val id: String?)

/**
 * Flux temps réel : une connexion longue, qui se termine (ou lève) quand le réseau ou le serveur
 * la coupe. La reprise est à la charge de l'appelant, avec [lastEventId] (rejeu des manqués).
 */
fun interface EventStream {
    suspend fun open(lastEventId: String?, onEvent: suspend (StreamEvent) -> Unit)
}

/** Flux SSE de l'API, par Ktor (OkHttp sur Android, Darwin sur iOS). */
class SseEventStream(private val http: HttpClient) : EventStream {
    override suspend fun open(lastEventId: String?, onEvent: suspend (StreamEvent) -> Unit) {
        http.sse("api/v1/events", request = {
            lastEventId?.let { header("Last-Event-ID", it) }
            // Connexion longue : pas de durée maximale ; l'API envoie un ping toutes les 25 s,
            // 60 s de silence veulent donc dire que la connexion est morte.
            timeout {
                requestTimeoutMillis = HttpTimeoutConfig.INFINITE_TIMEOUT_MS
                socketTimeoutMillis = 60_000
            }
        }) {
            incoming.collect { e -> onEvent(StreamEvent(e.event, e.data, e.id)) }
        }
    }
}
