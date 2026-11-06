package africa.devhub.passport

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/** Journal des preuves, chargé page par page. */
data class ProofsState(
    val events: List<ProofEvent> = emptyList(),
    val totalXp: Int? = null,
    val loading: Boolean = true,
    val failed: Boolean = false,
    val nextCursor: String? = null,
    val hasMore: Boolean = false,
)

class ProofsViewModel(private val api: PassportApi, private val handle: String) : ViewModel() {
    private val _state = MutableStateFlow(ProofsState())
    val state: StateFlow<ProofsState> = _state.asStateFlow()

    init {
        loadMore()
    }

    private var inFlight = false

    /** Page suivante ; rejoue la même page si la précédente a échoué. */
    fun loadMore() {
        val current = _state.value
        if (inFlight || (current.totalXp != null && !current.hasMore)) return
        inFlight = true
        _state.value = current.copy(loading = true, failed = false)
        viewModelScope.launch {
            _state.value = try {
                val page = api.proofs(handle, cursor = current.nextCursor)
                _state.value.copy(
                    events = _state.value.events + page.events,
                    totalXp = page.totalXp,
                    loading = false,
                    nextCursor = page.page.nextCursor,
                    hasMore = page.page.hasMore,
                )
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                _state.value.copy(loading = false, failed = true)
            } finally {
                inFlight = false
            }
        }
    }
}
