package africa.devhub.notifications

import africa.devhub.network.DevHubJson
import africa.devhub.offline.Connectivity
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlin.math.min

/**
 * Notifications en direct (Y8) pendant que l'application est au premier plan : un flux SSE,
 * repris après une coupure avec Last-Event-ID (l'API rejoue les manquées), plus le compteur
 * de non-lues. Le push hors de l'application (FCM, APNs) est une étape à part (ADR-0021).
 */
class NotificationHub(
    private val api: NotificationsApi,
    private val stream: EventStream,
    private val connectivity: Connectivity,
    private val scope: CoroutineScope,
) {
    private val _unread = MutableStateFlow(0)
    val unread: StateFlow<Int> = _unread.asStateFlow()

    private val _incoming = MutableSharedFlow<NotificationView>(extraBufferCapacity = 32)

    /** Notifications reçues en direct : les écrans concernés se relisent. */
    val incoming: SharedFlow<NotificationView> = _incoming.asSharedFlow()

    private var job: Job? = null
    private var lastEventId: String? = null

    /** Premier plan : se connecte, et se reconnecte tant que [stop] n'est pas appelé. */
    fun start() {
        if (job?.isActive == true) return
        job = scope.launch {
            refreshCount()
            var failures = 0
            while (true) {
                connectivity.online.first { it }
                val ended = try {
                    stream.open(lastEventId) { event -> handle(event) }
                    failures = 0
                    false
                } catch (e: CancellationException) {
                    throw e
                } catch (_: SessionEnded) {
                    true
                } catch (_: Exception) {
                    failures++
                    false
                }
                if (ended) return@launch
                // L'API conseille 3 s (« retry: 3000 ») ; on espace davantage si l'échec se répète.
                delay(min(30_000L, 3_000L * (1 shl min(failures, 4))))
                refreshCount()
            }
        }
    }

    /** Arrière-plan : coupe la connexion (pas de batterie consommée hors de l'application). */
    fun stop() {
        job?.cancel()
        job = null
    }

    fun markedRead(count: Int) = _unread.update { (it - count).coerceAtLeast(0) }

    fun allRead() {
        _unread.value = 0
    }

    suspend fun refreshCount() {
        runCatching { api.list(unreadOnly = true) }.onSuccess { _unread.value = it.unreadCount }
    }

    private suspend fun handle(event: StreamEvent) {
        event.id?.let { lastEventId = it }
        when (event.event) {
            "notification.created" -> {
                val n = event.data?.let { runCatching { DevHubJson.decodeFromString(NotificationView.serializer(), it) }.getOrNull() }
                    ?: return
                _unread.update { it + 1 }
                _incoming.emit(n)
            }
            // Session révoquée ou expirée : la connexion ne reprendra pas.
            "session.ended" -> throw SessionEnded()
        }
    }

    private class SessionEnded : Exception()
}
