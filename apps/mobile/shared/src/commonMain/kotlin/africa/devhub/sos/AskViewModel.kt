package africa.devhub.sos

import africa.devhub.offline.CacheKey
import africa.devhub.offline.SendOutcome
import africa.devhub.offline.UserSpace
import africa.devhub.offline.createdId
import africa.devhub.offline.readThrough
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** Brouillon d'une question (S1) ; garde ses identifiants jusqu'à la publication. */
data class AskDraft(
    val title: String = "",
    val body: String = "",
    val code: String = "",
    val tagSlugs: List<String> = emptyList(),
    val urgency: String = "normal",
    val lang: String,
    val reproUrl: String = "",
)

data class AskState(
    val draft: AskDraft,
    val tags: List<TagOption> = emptyList(),
    val tagsFailed: Boolean = false,
    val sending: Boolean = false,
    /** Code de l'API ou `network` si la publication a échoué. */
    val error: String? = null,
    /** Question publiée : l'écran ouvre son détail. */
    val created: AskQuestionResponse? = null,
    /** Hors ligne : la question attend dans la file, l'écran revient à la liste. */
    val queued: Boolean = false,
) {
    val titleValid get() = draft.title.trim().length in SosLimits.TITLE_MIN..SosLimits.TITLE_MAX
    val bodyValid get() = draft.body.trim().length in 1..SosLimits.BODY_MAX
    val tagsValid get() = draft.tagSlugs.size in SosLimits.TAGS_MIN..SosLimits.TAGS_MAX
    val reproValid get() = draft.reproUrl.isBlank() || isReproUrl(draft.reproUrl.trim())
    val canSend get() = titleValid && bodyValid && tagsValid && reproValid && draft.code.length <= SosLimits.CODE_MAX
}

class AskViewModel(private val api: SosApi, private val space: UserSpace, uiLang: String) : ViewModel() {
    private val _state = MutableStateFlow(AskState(AskDraft(lang = if (uiLang == "en") "en" else "fr")))
    val state: StateFlow<AskState> = _state.asStateFlow()

    init {
        loadTags()
    }

    fun loadTags() {
        viewModelScope.launch {
            try {
                val tags = readThrough(space, CacheKey.tags(), TagList.serializer()) { api.tags() }.value.data
                _state.update { it.copy(tags = tags, tagsFailed = false) }
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                _state.update { it.copy(tagsFailed = true) }
            }
        }
    }

    fun edit(transform: (AskDraft) -> AskDraft) = _state.update { it.copy(draft = transform(it.draft), error = null) }

    fun toggleTag(slug: String) = edit { draft ->
        when {
            slug in draft.tagSlugs -> draft.copy(tagSlugs = draft.tagSlugs - slug)
            draft.tagSlugs.size >= SosLimits.TAGS_MAX -> draft
            else -> draft.copy(tagSlugs = draft.tagSlugs + slug)
        }
    }

    fun send() {
        val s = _state.value
        if (!s.canSend || s.sending) return
        _state.value = s.copy(sending = true, error = null)
        viewModelScope.launch {
            val queued = try {
                space.writer.ask(s.draft)
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                _state.update { it.copy(sending = false, error = "storage") }
                return@launch
            }
            _state.update { state ->
                when (val o = queued.outcome) {
                    is SendOutcome.Applied -> o.data.createdId()?.let { id ->
                        state.copy(sending = false, created = AskQuestionResponse(id, queued.secretsMasked))
                    } ?: state.copy(sending = false, queued = true)
                    // Refus : le brouillon reste à l'écran pour être corrigé ; la file l'oublie.
                    is SendOutcome.Rejected -> {
                        viewModelScope.launch { space.engine.cancel(queued.opId) }
                        state.copy(sending = false, error = o.code)
                    }
                    else -> state.copy(sending = false, queued = true)
                }
            }
        }
    }

    /** Après l'ouverture de la question publiée : formulaire vierge pour la suivante. */
    fun consumeCreated() = _state.update { AskState(AskDraft(lang = it.draft.lang), tags = it.tags) }
}
