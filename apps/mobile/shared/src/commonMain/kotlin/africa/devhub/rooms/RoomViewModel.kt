package africa.devhub.rooms

import africa.devhub.network.ApiException
import africa.devhub.offline.ActionStatus
import africa.devhub.offline.CacheKey
import africa.devhub.offline.Queued
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
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonPrimitive

/** Retour d'une action dans une salle. */
sealed interface RoomNotice {
    data class SecretsMasked(val count: Int) : RoomNotice

    /** Enregistrée sur le téléphone : partira au retour du réseau. */
    data object Queued : RoomNotice

    data object JoinSent : RoomNotice

    data object Done : RoomNotice

    data class Failed(val code: String) : RoomNotice
}

/** Message écrit sur le téléphone, pas encore publié. */
data class PendingMessage(val opId: String, val preview: String, val failed: Boolean)

sealed interface RoomState {
    data object Loading : RoomState

    data object NotFound : RoomState

    data object Failed : RoomState

    data class Loaded(
        val room: RoomDetail,
        val tasks: List<TaskView> = emptyList(),
        /** Du plus ancien au plus récent, pour l'affichage d'une discussion. */
        val messages: List<MessageView> = emptyList(),
        val joinRequests: List<JoinRequestView> = emptyList(),
        val pendingMessages: List<PendingMessage> = emptyList(),
        /** Tâches visées par une action encore dans la file (prise, PR, clôture). */
        val pendingTaskIds: Set<String> = emptySet(),
        /** Une demande d'adhésion attend dans la file. */
        val joinPending: Boolean = false,
        val busy: Boolean = false,
        val notice: RoomNotice? = null,
        /** Incrémenté quand un message part dans la file : l'écran vide son brouillon. */
        val messagesPosted: Int = 0,
        val cachedAt: Long? = null,
    ) : RoomState {
        val isMember get() = room.viewer?.role != null
        val canManage get() = room.viewer?.role == "owner" || room.viewer?.role == "maintainer"
    }
}

/**
 * Une salle (R1 à R9) : présentation, tâches, discussion, membres ; rejoindre, prendre une
 * tâche, proposer sa PR, clore, écrire. Les écritures passent par la file (ADR-0008).
 */
class RoomViewModel(
    private val api: RoomsApi,
    private val code: String,
    private val space: UserSpace,
) : ViewModel() {
    private val _state = MutableStateFlow<RoomState>(RoomState.Loading)
    val state: StateFlow<RoomState> = _state.asStateFlow()

    init {
        viewModelScope.launch { load(showLoading = true) }
        viewModelScope.launch {
            space.outbox.actions.collect { actions -> _state.update { (it as? RoomState.Loaded)?.withPending(actions) ?: it } }
        }
        viewModelScope.launch {
            space.engine.results.collect { r ->
                val roomId = (_state.value as? RoomState.Loaded)?.room?.id
                if (r.outcome is SendOutcome.Applied && roomId != null && r.type in ROOM_TYPES) load(showLoading = false)
            }
        }
    }

    fun refresh() {
        viewModelScope.launch { load(showLoading = _state.value !is RoomState.Loaded) }
    }

    fun join(message: String?) = act { roomId -> space.writer.joinRoom(roomId, message).notice(RoomNotice.JoinSent) }

    fun decide(requestId: String, accept: Boolean) =
        act { roomId -> space.writer.decideJoin(roomId, requestId, accept).notice(RoomNotice.Done) }

    fun takeTask(taskId: String) = act { roomId -> space.writer.takeTask(roomId, taskId).notice(null) }

    fun submitTask(taskId: String, prUrl: String) {
        if (!PULL_REQUEST_URL.matches(prUrl.trim())) return
        act { roomId -> space.writer.submitTask(roomId, taskId, prUrl).notice(null) }
    }

    fun completeTask(taskId: String, prUrl: String?) {
        if (!prUrl.isNullOrBlank() && !PULL_REQUEST_URL.matches(prUrl.trim())) return
        act { roomId -> space.writer.completeTask(roomId, taskId, prUrl).notice(RoomNotice.Done) }
    }

    fun createTask(title: String, description: String?, level: String) {
        if (title.trim().length !in RoomLimits.TASK_TITLE_MIN..RoomLimits.TASK_TITLE_MAX) return
        act { roomId -> space.writer.createTask(roomId, title, description, level).notice(null) }
    }

    fun postMessage(text: String) {
        if (text.isBlank() || text.length > RoomLimits.MESSAGE_MAX) return
        act(onDone = { it.copy(messagesPosted = it.messagesPosted + 1) }) { roomId ->
            space.writer.postMessage(roomId, text).notice(null)
        }
    }

    private suspend fun Queued.notice(applied: RoomNotice?): RoomNotice? = when (val o = outcome) {
        is SendOutcome.Applied -> if (secretsMasked > 0) RoomNotice.SecretsMasked(secretsMasked) else applied
        is SendOutcome.Rejected -> {
            // Une action refusée (tâche déjà prise, droits) n'a pas à rester dans la file.
            space.engine.cancel(opId)
            RoomNotice.Failed(o.code)
        }
        SendOutcome.Conflict -> RoomNotice.Failed("version_conflict")
        null, SendOutcome.Network, is SendOutcome.Retry ->
            if (secretsMasked > 0) RoomNotice.SecretsMasked(secretsMasked) else RoomNotice.Queued
    }

    private fun act(
        onDone: (RoomState.Loaded) -> RoomState.Loaded = { it },
        action: suspend (roomId: String) -> RoomNotice?,
    ) {
        val current = _state.value as? RoomState.Loaded ?: return
        if (current.busy) return
        _state.value = current.copy(busy = true, notice = null)
        viewModelScope.launch {
            val notice = try {
                action(current.room.id)
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                RoomNotice.Failed("storage")
            }
            _state.update { s -> (s as? RoomState.Loaded)?.let(onDone)?.copy(busy = false, notice = notice) ?: s }
            load(showLoading = false)
        }
    }

    private suspend fun load(showLoading: Boolean) {
        if (showLoading) _state.value = RoomState.Loading
        val room = try {
            readThrough(space, CacheKey.room(code), RoomDetail.serializer()) { api.room(code) }
        } catch (e: CancellationException) {
            throw e
        } catch (e: ApiException) {
            if (_state.value !is RoomState.Loaded) _state.value = if (e.status == 404) RoomState.NotFound else RoomState.Failed
            return
        } catch (_: Exception) {
            if (_state.value !is RoomState.Loaded) _state.value = RoomState.Failed
            return
        }
        val id = room.value.id
        // Tâches, discussion et demandes : utiles mais pas indispensables à l'affichage de la salle.
        val tasks = runCatching { readThrough(space, CacheKey.tasks(id), TaskList.serializer()) { api.tasks(id) }.value.data }.getOrNull()
        val messages = if (room.value.viewer?.role != null) {
            runCatching { readThrough(space, CacheKey.messages(id), MessageList.serializer()) { api.messages(id) }.value.data }.getOrNull()
        } else {
            emptyList()
        }
        val manages = room.value.viewer?.role == "owner" || room.value.viewer?.role == "maintainer"
        val requests = if (manages && room.cachedAt == null) runCatching { api.joinRequests(id).data }.getOrNull() else null
        _state.update { previous ->
            val old = previous as? RoomState.Loaded
            (old ?: RoomState.Loaded(room.value)).copy(
                room = room.value,
                tasks = tasks ?: old?.tasks.orEmpty(),
                messages = messages?.reversed() ?: old?.messages.orEmpty(),
                joinRequests = requests?.filter { it.status == "pending" } ?: old?.joinRequests.orEmpty(),
                cachedAt = room.cachedAt,
            ).withPending(space.outbox.actions.value)
        }
    }

    private fun RoomState.Loaded.withPending(actions: List<africa.devhub.offline.OutboxAction>): RoomState.Loaded {
        val mine = actions.filter { it.target == room.id }
        return copy(
            pendingMessages = mine.filter { it.type == "room_message.create" }
                .map { PendingMessage(it.opId, it.preview, it.status != ActionStatus.Pending) },
            pendingTaskIds = mine.mapNotNull { it.payload["taskId"]?.jsonPrimitive?.contentOrNull }.toSet(),
            joinPending = mine.any { it.type == "join_request.create" },
        )
    }

    private companion object {
        val ROOM_TYPES = setOf(
            "join_request.create", "join_request.decide", "task.create", "task.take",
            "task.submit", "task.complete", "room_message.create",
        )
    }
}
