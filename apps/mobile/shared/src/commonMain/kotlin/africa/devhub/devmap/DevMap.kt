package africa.devhub.devmap

import africa.devhub.discover.DiscoverApi
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable

// Carte des devs (GET /api/v1/leaderboard/map, packages/contracts/src/discovery.ts) : où vivent les devs
// et combien sont actifs. Les comptes de démonstration et les devs sans pays restent comptés à part.

@Serializable
data class MapCountry(
    val country: String,
    val devs: Int,
    val activeDevs: Int = 0,
    val questionsUnblocked: Int = 0,
    val totalXp: Int = 0,
)

@Serializable data class MapUnlocated(val devs: Int = 0)

@Serializable data class MapDemo(val devs: Int = 0, val totalXp: Int = 0)

@Serializable
data class DevMap(
    val method: String = "",
    val activeWindowDays: Int = 0,
    val countries: List<MapCountry> = emptyList(),
    val unlocated: MapUnlocated = MapUnlocated(),
    val demo: MapDemo = MapDemo(),
)

data class DevMapState(val map: DevMap? = null, val loading: Boolean = true, val failed: Boolean = false) {
    val located get() = map?.countries.orEmpty().sumOf { it.devs }
    val active get() = map?.countries.orEmpty().sumOf { it.activeDevs }
}

class DevMapViewModel(private val api: DiscoverApi) : ViewModel() {
    private val _state = MutableStateFlow(DevMapState())
    val state: StateFlow<DevMapState> = _state.asStateFlow()

    init {
        reload()
    }

    fun reload() {
        _state.update { it.copy(loading = true, failed = false) }
        viewModelScope.launch {
            try {
                val map = api.map()
                _state.update { it.copy(map = map.copy(countries = map.countries.sortedByDescending { c -> c.devs }), loading = false) }
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                _state.update { it.copy(loading = false, failed = true) }
            }
        }
    }
}
