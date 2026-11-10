package africa.devhub.news

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
import kotlin.time.Duration.Companion.seconds
import kotlin.time.TimeMark
import kotlin.time.TimeSource

data class LiveBoardState(
    /** Type de skill (`skill`, `plugin`, `mcp`, `rules`) ; vide pour tout. Sans effet sur les certifications. */
    val category: String = "",
    val query: String = "",
    val items: List<NewsItem> = emptyList(),
    val loading: Boolean = true,
    val failed: Boolean = false,
)

/** Tableau de certifications (`cert`) ou de skills et plugins IA (`skill`) collectés par l'API, comme sur le web. */
class LiveBoardViewModel(
    private val api: NewsApi,
    private val kind: String,
    private val clock: TimeSource = TimeSource.Monotonic,
) : ViewModel() {
    private val _state = MutableStateFlow(LiveBoardState())
    val state: StateFlow<LiveBoardState> = _state.asStateFlow()
    private var job: Job? = null
    private var loadedAt: TimeMark? = null

    init {
        load(debounce = false)
    }

    fun setCategory(category: String) {
        if (category == _state.value.category) return
        _state.update { it.copy(category = category) }
        load(debounce = false)
    }

    /** Recherche 400 ms après la dernière frappe, comme pour l'actualité. */
    fun setQuery(query: String) {
        _state.update { it.copy(query = query.take(80)) }
        load(debounce = true)
    }

    fun reload() = load(debounce = false)

    /**
     * Relecture silencieuse (toutes les 5 minutes et au retour au premier plan, comme le web) : la
     * liste affichée reste en place, rien ne clignote, un échec est ignoré. Sans effet si la liste
     * vient d'être lue ou si une lecture est en cours.
     */
    fun refresh() {
        if (_state.value.loading || loadedAt?.let { it.elapsedNow() < MIN_REFRESH_GAP } == true) return
        job = viewModelScope.launch {
            val s = _state.value
            try {
                val list = api.list(kind, category = s.category.takeIf { kind == "skill" }, query = s.query.trim().takeIf { it.length >= 2 })
                loadedAt = clock.markNow()
                _state.update { it.copy(items = list.items, failed = false) }
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                // On garde ce qui est affiché ; la prochaine relecture réessaiera.
            }
        }
    }

    private fun load(debounce: Boolean) {
        job?.cancel()
        _state.update { it.copy(loading = true, failed = false) }
        job = viewModelScope.launch {
            if (debounce) delay(400)
            val s = _state.value
            try {
                val list = api.list(kind, category = s.category.takeIf { kind == "skill" }, query = s.query.trim().takeIf { it.length >= 2 })
                loadedAt = clock.markNow()
                _state.update { it.copy(items = list.items, loading = false) }
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                _state.update { it.copy(loading = false, failed = true) }
            }
        }
    }
}

private val MIN_REFRESH_GAP = 30.seconds
