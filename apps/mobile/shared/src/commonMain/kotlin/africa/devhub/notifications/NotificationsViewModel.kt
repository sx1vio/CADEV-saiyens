package africa.devhub.notifications

import africa.devhub.rooms.RoomsApi
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** Où mène une notification. */
sealed interface NotificationTarget {
    data class Question(val id: String) : NotificationTarget

    data class Room(val code: String) : NotificationTarget

    data class Passport(val handle: String) : NotificationTarget

    data object Rooms : NotificationTarget
}

data class NotificationsState(
    val items: List<NotificationView> = emptyList(),
    val loading: Boolean = true,
    val failed: Boolean = false,
    val nextCursor: String? = null,
    val hasMore: Boolean = false,
)

class NotificationsViewModel(
    private val api: NotificationsApi,
    private val hub: NotificationHub,
    private val roomsApi: RoomsApi,
) : ViewModel() {
    private val _state = MutableStateFlow(NotificationsState())
    val state: StateFlow<NotificationsState> = _state.asStateFlow()

    init {
        load(reset = true)
        viewModelScope.launch {
            // Arrivée en direct : en tête de liste, sans recharger.
            hub.incoming.collect { n -> _state.update { s -> if (s.items.any { it.id == n.id }) s else s.copy(items = listOf(n) + s.items) } }
        }
    }

    fun reload() = load(reset = true)

    fun loadMore() {
        val s = _state.value
        if (!s.loading && s.hasMore) load(reset = false)
    }

    private fun load(reset: Boolean) {
        val cursor = if (reset) null else _state.value.nextCursor
        _state.update { it.copy(loading = true, failed = false) }
        viewModelScope.launch {
            try {
                val page = api.list(cursor)
                _state.update {
                    it.copy(
                        items = if (reset) page.data else it.items + page.data,
                        loading = false,
                        nextCursor = page.page.nextCursor,
                        hasMore = page.page.hasMore,
                    )
                }
                if (reset) hub.refreshCount()
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                _state.update { it.copy(loading = false, failed = true) }
            }
        }
    }

    /** Marque comme lue (sans bloquer si le réseau manque), puis dit où aller. */
    fun open(notification: NotificationView, navigate: (NotificationTarget?) -> Unit) {
        viewModelScope.launch {
            if (notification.readAt == null) {
                _state.update { s -> s.copy(items = s.items.map { if (it.id == notification.id) it.copy(readAt = "now") else it }) }
                hub.markedRead(1)
                runCatching { api.markRead(listOf(notification.id)) }
            }
            navigate(target(notification))
        }
    }

    fun markAllRead() {
        _state.update { s -> s.copy(items = s.items.map { if (it.readAt == null) it.copy(readAt = "now") else it }) }
        hub.allRead()
        viewModelScope.launch { runCatching { api.markAllRead() } }
    }

    private suspend fun target(n: NotificationView): NotificationTarget? {
        n.text("questionId")?.let { return NotificationTarget.Question(it) }
        n.text("roomId")?.let { roomId ->
            // La notification ne porte que l'identifiant ; la salle s'ouvre par son code.
            val code = runCatching { roomsApi.rooms(mine = true).data.firstOrNull { it.id == roomId }?.code }.getOrNull()
            return code?.let { NotificationTarget.Room(it) } ?: NotificationTarget.Rooms
        }
        n.text("by")?.let { return NotificationTarget.Passport(it) }
        return null
    }
}
