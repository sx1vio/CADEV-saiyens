package africa.devhub.messages

import africa.devhub.network.ApiException
import africa.devhub.offline.ActionStatus
import africa.devhub.offline.CacheKey
import africa.devhub.offline.SendOutcome
import africa.devhub.offline.UserSpace
import africa.devhub.offline.readThrough
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class ConversationsState(
    val items: List<Conversation> = emptyList(),
    val unreadTotal: Int = 0,
    val loading: Boolean = true,
    val failed: Boolean = false,
    val cachedAt: Long? = null,
)

/** Mes conversations privées ; relues quand un message arrive en direct. */
class ConversationsViewModel(private val api: MessagesApi, private val space: UserSpace) : ViewModel() {
    private val _state = MutableStateFlow(ConversationsState())
    val state: StateFlow<ConversationsState> = _state.asStateFlow()

    init {
        reload()
        viewModelScope.launch { space.notifications.incoming.collect { if (it.type == "message.received") reload() } }
    }

    fun reload() {
        _state.update { it.copy(loading = true, failed = false) }
        viewModelScope.launch {
            try {
                val fetched = readThrough(space, CacheKey.conversations(), Conversations.serializer()) { api.conversations() }
                _state.update {
                    it.copy(items = fetched.value.data, unreadTotal = fetched.value.unreadTotal, loading = false, cachedAt = fetched.cachedAt)
                }
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                _state.update { it.copy(loading = false, failed = true) }
            }
        }
    }
}

/** Message écrit sur le téléphone, pas encore envoyé. */
data class PendingDirectMessage(val opId: String, val preview: String, val failed: Boolean)

sealed interface ConversationState {
    data object Loading : ConversationState

    data object NotFound : ConversationState

    data object Failed : ConversationState

    data class Loaded(
        val conversation: Conversation,
        val messages: List<DirectMessage>,
        val hasMore: Boolean = false,
        val pending: List<PendingDirectMessage> = emptyList(),
        val sent: Int = 0,
        /** Code d'erreur du dernier envoi refusé (blocage, personne inactive). */
        val error: String? = null,
        val cachedAt: Long? = null,
    ) : ConversationState
}

/** Une conversation : lecture, envoi par la file (hors ligne compris), lu à l'ouverture. */
class ConversationViewModel(
    private val api: MessagesApi,
    private val space: UserSpace,
    private val conversationId: String,
) : ViewModel() {
    private val _state = MutableStateFlow<ConversationState>(ConversationState.Loading)
    val state: StateFlow<ConversationState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            load()
            runCatching { api.markRead(conversationId) }
        }
        viewModelScope.launch {
            space.outbox.actions.collect { actions ->
                val pending = actions.filter { it.type == "dm.create" && it.target == conversationId }
                    .map { PendingDirectMessage(it.opId, it.preview, it.status != ActionStatus.Pending) }
                _state.update { (it as? ConversationState.Loaded)?.copy(pending = pending) ?: it }
            }
        }
        viewModelScope.launch {
            space.notifications.incoming.collect { n ->
                if (n.type == "message.received" && n.text("conversationId") == conversationId) {
                    load()
                    runCatching { api.markRead(conversationId) }
                }
            }
        }
        viewModelScope.launch {
            space.engine.results.collect { r -> if (r.type == "dm.create" && r.outcome is SendOutcome.Applied) load() }
        }
    }

    fun send(text: String) {
        val current = _state.value as? ConversationState.Loaded ?: return
        if (text.isBlank() || text.length > DM_MAX || !current.conversation.canWrite) return
        _state.value = current.copy(sent = current.sent + 1, error = null)
        viewModelScope.launch {
            val queued = space.writer.sendDirectMessage(conversationId, text)
            val outcome = queued.outcome
            if (outcome is SendOutcome.Rejected) {
                // Refus (blocage, personne supprimée) : le message ne repartira pas, on le dit.
                space.engine.cancel(queued.opId)
                _state.update { (it as? ConversationState.Loaded)?.copy(error = outcome.code) ?: it }
            }
        }
    }

    fun loadOlder() {
        val current = _state.value as? ConversationState.Loaded ?: return
        val first = current.messages.firstOrNull() ?: return
        if (!current.hasMore) return
        viewModelScope.launch {
            runCatching { api.messages(conversationId, before = first.createdAt) }.onSuccess { page ->
                _state.update { s ->
                    (s as? ConversationState.Loaded)?.copy(messages = page.data + s.messages, hasMore = page.hasMore) ?: s
                }
            }
        }
    }

    private suspend fun load() {
        try {
            val fetched = readThrough(space, CacheKey.conversation(conversationId), DirectMessages.serializer()) {
                api.messages(conversationId)
            }
            val pending = space.outbox.actions.value.filter { it.type == "dm.create" && it.target == conversationId }
                .map { PendingDirectMessage(it.opId, it.preview, it.status != ActionStatus.Pending) }
            _state.update { previous ->
                val old = previous as? ConversationState.Loaded
                ConversationState.Loaded(
                    conversation = fetched.value.conversation,
                    messages = fetched.value.data,
                    hasMore = fetched.value.hasMore,
                    pending = pending,
                    sent = old?.sent ?: 0,
                    error = old?.error,
                    cachedAt = fetched.cachedAt,
                )
            }
        } catch (e: CancellationException) {
            throw e
        } catch (e: ApiException) {
            if (_state.value !is ConversationState.Loaded) {
                _state.value = if (e.status == 404) ConversationState.NotFound else ConversationState.Failed
            }
        } catch (_: Exception) {
            if (_state.value !is ConversationState.Loaded) _state.value = ConversationState.Failed
        }
    }
}
