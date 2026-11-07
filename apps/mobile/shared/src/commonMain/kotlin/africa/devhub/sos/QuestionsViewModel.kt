package africa.devhub.sos

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

data class QuestionsState(
    val filter: QuestionFilter = QuestionFilter.Recent,
    val query: String = "",
    val items: List<QuestionSummary> = emptyList(),
    val loading: Boolean = true,
    val failed: Boolean = false,
    val nextCursor: String? = null,
    val hasMore: Boolean = false,
)

/** S6, S16 : liste des questions, filtres et recherche, page par page. */
class QuestionsViewModel(private val api: SosApi) : ViewModel() {
    private val _state = MutableStateFlow(QuestionsState())
    val state: StateFlow<QuestionsState> = _state.asStateFlow()
    private var job: Job? = null

    init {
        reload()
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
            try {
                val page = api.questions(s.filter, s.query.trim(), cursor = if (reset) null else s.nextCursor)
                _state.update {
                    it.copy(
                        items = if (reset) page.data else it.items + page.data,
                        loading = false,
                        nextCursor = page.page.nextCursor,
                        hasMore = page.page.hasMore,
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
