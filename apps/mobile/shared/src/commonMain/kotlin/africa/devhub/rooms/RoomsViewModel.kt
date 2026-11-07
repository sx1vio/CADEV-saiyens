package africa.devhub.rooms

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

data class RoomsState(
    val mine: Boolean = false,
    val query: String = "",
    val items: List<RoomSummary> = emptyList(),
    val loading: Boolean = true,
    val failed: Boolean = false,
    val nextCursor: String? = null,
    val hasMore: Boolean = false,
    val cachedAt: Long? = null,
)

/** Découvrir les salles, ou les miennes ; recherche ; pages ; hors ligne : dernière copie. */
class RoomsViewModel(private val api: RoomsApi, private val space: UserSpace? = null) : ViewModel() {
    private val _state = MutableStateFlow(RoomsState())
    val state: StateFlow<RoomsState> = _state.asStateFlow()
    private var job: Job? = null

    init {
        reload()
    }

    fun setMine(mine: Boolean) {
        if (mine == _state.value.mine) return
        _state.update { it.copy(mine = mine) }
        reload()
    }

    fun setQuery(query: String) {
        _state.update { it.copy(query = query) }
        reload(debounceMs = 400)
    }

    fun reload(debounceMs: Long = 0) = fetch(reset = true, debounceMs)

    fun loadMore() {
        val s = _state.value
        if (s.loading || !s.hasMore) return
        fetch(reset = false, 0)
    }

    private fun fetch(reset: Boolean, debounceMs: Long) {
        job?.cancel()
        _state.update { it.copy(loading = true, failed = false, items = if (reset) emptyList() else it.items) }
        job = viewModelScope.launch {
            if (debounceMs > 0) delay(debounceMs)
            val s = _state.value
            val query = s.query.trim()
            try {
                val page = if (reset && query.length < 2) {
                    readThrough(space, CacheKey.rooms(s.mine), RoomList.serializer()) { api.rooms(s.mine) }
                } else {
                    Fetched(api.rooms(s.mine, query, cursor = if (reset) null else s.nextCursor))
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
