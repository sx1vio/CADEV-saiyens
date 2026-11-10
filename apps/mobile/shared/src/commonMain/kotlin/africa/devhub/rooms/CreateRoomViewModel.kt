package africa.devhub.rooms

import africa.devhub.core.newUuid
import africa.devhub.network.ApiException
import africa.devhub.network.NetworkException
import africa.devhub.offline.CacheKey
import africa.devhub.offline.UserSpace
import africa.devhub.offline.readThrough
import africa.devhub.sos.SosApi
import africa.devhub.sos.TagList
import africa.devhub.sos.TagOption
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class RoomDraft(
    val name: String = "",
    val description: String = "",
    val state: String = "in_progress",
    val visibility: String = "public",
    val repoFullName: String = "",
    val demoUrl: String = "",
    val stack: List<String> = emptyList(),
)

data class CreateRoomState(
    val draft: RoomDraft = RoomDraft(),
    val tags: List<TagOption> = emptyList(),
    val sending: Boolean = false,
    val error: String? = null,
    /** Code de la salle créée : l'écran l'ouvre. */
    val createdCode: String? = null,
) {
    val nameValid get() = draft.name.trim().length in RoomLimits.NAME_MIN..RoomLimits.NAME_MAX
    val descriptionValid get() = draft.description.trim().length in RoomLimits.DESCRIPTION_MIN..RoomLimits.DESCRIPTION_MAX
    val repoValid get() = draft.repoFullName.isBlank() || REPO_FULL_NAME.matches(draft.repoFullName.trim())
    val demoValid get() = draft.demoUrl.isBlank() || (draft.demoUrl.trim().startsWith("https://") && draft.demoUrl.trim().length <= 300)
    val canSend get() = nameValid && descriptionValid && repoValid && demoValid && draft.stack.size in 1..RoomLimits.STACK_MAX
}

/** R1 : créer une salle. Le dépôt est vérifié auprès de GitHub : réseau exigé (04 § 2). */
class CreateRoomViewModel(
    private val api: RoomsApi,
    private val sosApi: SosApi,
    private val space: UserSpace,
) : ViewModel() {
    private val _state = MutableStateFlow(CreateRoomState())
    val state: StateFlow<CreateRoomState> = _state.asStateFlow()
    private var key = newUuid()

    init {
        viewModelScope.launch {
            runCatching { readThrough(space, CacheKey.tags(), TagList.serializer()) { sosApi.tags() }.value.data }
                .onSuccess { tags -> _state.update { it.copy(tags = tags) } }
        }
    }

    fun edit(transform: (RoomDraft) -> RoomDraft) = _state.update { it.copy(draft = transform(it.draft), error = null) }

    fun toggleTag(slug: String) = edit { d ->
        when {
            slug in d.stack -> d.copy(stack = d.stack - slug)
            d.stack.size >= RoomLimits.STACK_MAX -> d
            else -> d.copy(stack = d.stack + slug)
        }
    }

    fun send() {
        val s = _state.value
        if (!s.canSend || s.sending) return
        if (!space.connectivity.online.value) {
            _state.update { it.copy(error = "offline") }
            return
        }
        _state.value = s.copy(sending = true, error = null)
        val d = s.draft
        viewModelScope.launch {
            _state.value = try {
                val created = api.create(
                    CreateRoomRequest(
                        name = d.name.trim(),
                        description = d.description.trim(),
                        state = d.state,
                        visibility = d.visibility,
                        repoFullName = d.repoFullName.trim().ifEmpty { null },
                        demoUrl = d.demoUrl.trim().ifEmpty { null },
                        stackTagSlugs = d.stack,
                    ),
                    key,
                )
                key = newUuid()
                _state.value.copy(sending = false, createdCode = created.code)
            } catch (e: CancellationException) {
                throw e
            } catch (e: ApiException) {
                _state.value.copy(sending = false, error = e.code ?: "http_${e.status}")
            } catch (_: NetworkException) {
                space.connectivity.reportUnreachable()
                _state.value.copy(sending = false, error = "offline")
            }
        }
    }

    fun consumeCreated() = _state.update { CreateRoomState(tags = it.tags) }
}
