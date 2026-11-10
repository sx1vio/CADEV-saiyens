package africa.devhub.news

import africa.devhub.offline.CacheKey
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

data class NewsState(
    /** `fr`, `en` ou `all`. */
    val lang: String = "all",
    val home: NewsHome? = null,
    val loading: Boolean = true,
    val failed: Boolean = false,
    val cachedAt: Long? = null,
    val query: String = "",
    /** Résultats de recherche ; null sans recherche en cours. */
    val results: List<NewsItem>? = null,
    val searching: Boolean = false,
)

/** Fil d'actualité réel (ADR-0020) : la une et les vidéos, lisibles hors ligne une fois chargées. */
class NewsViewModel(private val api: NewsApi, private val space: UserSpace? = null, lang: String = "all") : ViewModel() {
    private val _state = MutableStateFlow(NewsState(lang = lang))
    val state: StateFlow<NewsState> = _state.asStateFlow()
    private var searchJob: Job? = null

    init {
        reload()
    }

    fun setLang(lang: String) {
        if (lang == _state.value.lang) return
        _state.update { it.copy(lang = lang) }
        reload()
        if (_state.value.query.length >= 2) setQuery(_state.value.query)
    }

    fun reload() {
        val lang = _state.value.lang
        _state.update { it.copy(loading = true, failed = false) }
        viewModelScope.launch {
            try {
                val fetched = readThrough(space, CacheKey.newsHome(lang), NewsHome.serializer()) { api.home(lang) }
                _state.update { it.copy(home = fetched.value, loading = false, cachedAt = fetched.cachedAt) }
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                _state.update { it.copy(loading = false, failed = true) }
            }
        }
    }

    /** Recherche 400 ms après la dernière frappe ; moins de 2 caractères : retour à la une. */
    fun setQuery(query: String) {
        _state.update { it.copy(query = query) }
        searchJob?.cancel()
        if (query.trim().length < 2) {
            _state.update { it.copy(results = null, searching = false) }
            return
        }
        _state.update { it.copy(searching = true) }
        searchJob = viewModelScope.launch {
            delay(400)
            val found = runCatching { api.search(query.trim(), _state.value.lang).items }.getOrNull()
            _state.update { it.copy(results = found ?: emptyList(), searching = false) }
        }
    }
}
