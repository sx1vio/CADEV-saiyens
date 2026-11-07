package africa.devhub.discover

import africa.devhub.offline.CacheKey
import africa.devhub.offline.Fetched
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

data class DevsState(
    val filters: DevFilters = DevFilters(),
    val items: List<DevCard> = emptyList(),
    val loading: Boolean = true,
    val failed: Boolean = false,
    val nextCursor: String? = null,
    val hasMore: Boolean = false,
    val cachedAt: Long? = null,
)

data class LeaderboardState(
    /** null : classement des pays ; sinon, les devs de ce pays. */
    val country: String? = null,
    val board: Leaderboard? = null,
    val loading: Boolean = true,
    val failed: Boolean = false,
    val cachedAt: Long? = null,
)

/** D1 : trouver des devs ; D2 : classement par pays, calcul affiché. */
class DiscoverViewModel(private val api: DiscoverApi, private val space: UserSpace? = null) : ViewModel() {
    private val _devs = MutableStateFlow(DevsState())
    val devs: StateFlow<DevsState> = _devs.asStateFlow()
    private val _board = MutableStateFlow(LeaderboardState())
    val board: StateFlow<LeaderboardState> = _board.asStateFlow()
    private var devsJob: Job? = null

    init {
        reloadDevs()
        openCountry(null)
    }

    /** Les filtres texte (étiquette, pays) partent 400 ms après la dernière frappe. */
    fun setFilters(filters: DevFilters, debounce: Boolean = false) {
        _devs.update { it.copy(filters = filters) }
        reloadDevs(if (debounce) 400 else 0)
    }

    fun reloadDevs(debounceMs: Long = 0) = fetchDevs(reset = true, debounceMs)

    fun loadMoreDevs() {
        val s = _devs.value
        if (!s.loading && s.hasMore) fetchDevs(reset = false, 0)
    }

    private fun fetchDevs(reset: Boolean, debounceMs: Long) {
        devsJob?.cancel()
        _devs.update { it.copy(loading = true, failed = false, items = if (reset) emptyList() else it.items) }
        devsJob = viewModelScope.launch {
            if (debounceMs > 0) delay(debounceMs)
            val s = _devs.value
            try {
                // Seule la première page sans filtre est gardée hors ligne.
                val page = if (reset && s.filters == DevFilters()) {
                    readThrough(space, CacheKey.devs(), DevList.serializer()) { api.devs(s.filters) }
                } else {
                    Fetched(api.devs(s.filters, if (reset) null else s.nextCursor))
                }
                _devs.update {
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
                _devs.update { it.copy(loading = false, failed = true) }
            }
        }
    }

    /** Classement des pays ([country] null) ou des devs d'un pays. */
    fun openCountry(country: String?) {
        _board.value = LeaderboardState(country = country)
        viewModelScope.launch {
            _board.value = try {
                val fetched = readThrough(space, CacheKey.leaderboard(country), Leaderboard.serializer()) { api.leaderboard(country) }
                LeaderboardState(country, fetched.value, loading = false, cachedAt = fetched.cachedAt)
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                LeaderboardState(country, loading = false, failed = true)
            }
        }
    }
}

sealed interface RulesState {
    data object Loading : RulesState

    data object Failed : RulesState

    data class Loaded(val rules: XpRules, val cachedAt: Long? = null) : RulesState
}

/** X5 : barème et formules publics, lisibles hors ligne une fois chargés. */
class RulesViewModel(private val api: DiscoverApi, private val space: UserSpace? = null) : ViewModel() {
    private val _state = MutableStateFlow<RulesState>(RulesState.Loading)
    val state: StateFlow<RulesState> = _state.asStateFlow()

    init {
        load()
    }

    fun load() {
        _state.value = RulesState.Loading
        viewModelScope.launch {
            _state.value = try {
                val fetched = readThrough(space, CacheKey.rules(), XpRules.serializer()) { api.rules() }
                RulesState.Loaded(fetched.value, fetched.cachedAt)
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                RulesState.Failed
            }
        }
    }
}
