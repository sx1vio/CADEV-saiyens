package africa.devhub.sos

import africa.devhub.offline.ActionStatus
import africa.devhub.offline.CacheKey
import africa.devhub.offline.SendOutcome
import africa.devhub.offline.UserSpace
import africa.devhub.offline.readThrough
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** Question écrite hors ligne, pas encore publiée. */
data class PendingQuestion(val opId: String, val title: String, val failed: Boolean)

data class QuestionsState(
    val filter: QuestionFilter = QuestionFilter.Recent,
    val query: String = "",
    val items: List<QuestionSummary> = emptyList(),
    val loading: Boolean = true,
    val failed: Boolean = false,
    val nextCursor: String? = null,
    val hasMore: Boolean = false,
    /** Copie locale affichée faute de réseau : date de la copie. */
    val cachedAt: Long? = null,
    val pending: List<PendingQuestion> = emptyList(),
)

/** S6, S16 : liste des questions, filtres et recherche, page par page ; hors ligne : dernière copie. */
class QuestionsViewModel(private val api: SosApi, private val space: UserSpace? = null) : ViewModel() {
    private val _state = MutableStateFlow(QuestionsState())
    val state: StateFlow<QuestionsState> = _state.asStateFlow()
    private var job: Job? = null

    init {
        reload()
        space?.let { s ->
            viewModelScope.launch {
                s.outbox.actions.collect { actions ->
                    val pending = actions.filter { it.type == "question.create" }
                        .map { PendingQuestion(it.opId, it.preview, it.status != ActionStatus.Pending) }
                    _state.update { it.copy(pending = pending) }
                }
            }
            viewModelScope.launch {
                // Une question ou une réponse vient d'être publiée : la liste a changé.
                s.engine.results.collect { r ->
                    if (r.outcome is SendOutcome.Applied && r.type in setOf("question.create", "answer.create")) reload()
                }
            }
        }
    }

    fun setFilter(filter: QuestionFilter) {
        if (filter == _state.value.filter) return
        _state.update { it.copy(filter = filter) }
        reload()
    }

    /** La recherche part 400 ms après la dernière frappe ; moins de 2 caractères = pas de recherche. */
    fun setQuery(query: String) {
        _state.update { it.copy(query = query) }
        reload(debounceMs = 400)
    }

    fun reload(debounceMs: Long = 0) = fetch(reset = true, debounceMs = debounceMs)

    fun loadMore() {
        val s = _state.value
        if (s.loading || !s.hasMore) return
        fetch(reset = false)
    }

    private fun fetch(reset: Boolean, debounceMs: Long = 0) {
        // Une seule requête à la fois : la plus récente gagne (filtre ou recherche changés entre-temps).
        job?.cancel()
        _state.update { it.copy(loading = true, failed = false, items = if (reset) emptyList() else it.items) }
        job = viewModelScope.launch {
            if (debounceMs > 0) delay(debounceMs)
            val s = _state.value
            val query = s.query.trim()
            try {
                // Seule la première page sans recherche est gardée hors ligne (04 § 1).
                val page = if (reset && query.length < 2) {
                    readThrough(space, CacheKey.questions(s.filter.name), QuestionList.serializer()) {
                        api.questions(s.filter)
                    }
                } else {
                    africa.devhub.offline.Fetched(api.questions(s.filter, query, cursor = if (reset) null else s.nextCursor))
                }
                _state.update {
                    it.copy(
                        items = if (reset) page.value.data else it.items + page.value.data,
                        loading = false,
                        nextCursor = page.value.page.nextCursor,
                        hasMore = page.value.page.hasMore && page.cachedAt == null,
                        cachedAt = page.cachedAt,
                    )
                }
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                _state.update { it.copy(loading = false, failed = true) }
            }
        }
    }
}
