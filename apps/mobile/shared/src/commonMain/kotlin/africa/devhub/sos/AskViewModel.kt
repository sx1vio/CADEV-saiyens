package africa.devhub.sos

import africa.devhub.core.newUuid
import africa.devhub.network.ApiException
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
) {
    val titleValid get() = draft.title.trim().length in SosLimits.TITLE_MIN..SosLimits.TITLE_MAX
    val bodyValid get() = draft.body.trim().length in 1..SosLimits.BODY_MAX
    val tagsValid get() = draft.tagSlugs.size in SosLimits.TAGS_MIN..SosLimits.TAGS_MAX
    val reproValid get() = draft.reproUrl.isBlank() || isReproUrl(draft.reproUrl.trim())
    val canSend get() = titleValid && bodyValid && tagsValid && reproValid && draft.code.length <= SosLimits.CODE_MAX
}

class AskViewModel(private val api: SosApi, uiLang: String) : ViewModel() {
    private val _state = MutableStateFlow(AskState(AskDraft(lang = if (uiLang == "en") "en" else "fr")))
    val state: StateFlow<AskState> = _state.asStateFlow()

    private var clientId = newUuid()
    private var key = newUuid()

    init {
        loadTags()
    }

    fun loadTags() {
        viewModelScope.launch {
            try {
                val tags = api.tags().data
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
        val d = s.draft
        viewModelScope.launch {
            try {
                val created = api.ask(
                    AskQuestionRequest(
                        clientId = clientId,
                        title = d.title.trim(),
                        body = d.body.trim(),
                        codeSnippet = d.code.takeIf { it.isNotBlank() },
                        tagSlugs = d.tagSlugs,
                        urgency = d.urgency,
                        lang = d.lang,
                        reproUrl = d.reproUrl.trim().ifEmpty { null },
                    ),
                    key,
                )
                clientId = newUuid()
                key = newUuid()
                _state.update { it.copy(sending = false, created = created) }
            } catch (e: CancellationException) {
                throw e
            } catch (e: ApiException) {
                _state.update { it.copy(sending = false, error = e.code ?: "http_${e.status}") }
            } catch (_: Exception) {
                _state.update { it.copy(sending = false, error = "network") }
            }
        }
    }

    /** Après l'ouverture de la question publiée : formulaire vierge pour la suivante. */
    fun consumeCreated() = _state.update { AskState(AskDraft(lang = it.draft.lang), tags = it.tags) }
}
