package africa.devhub.passport

import africa.devhub.network.ApiException
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

sealed interface PassportState {
    data object Loading : PassportState

    data object NotFound : PassportState

    data object Failed : PassportState

    data class Loaded(val passport: Passport, val refresh: RefreshState = RefreshState.Idle) : PassportState
}

/** Réimport GitHub depuis son propre Passport. */
sealed interface RefreshState {
    data object Idle : RefreshState

    data object Running : RefreshState

    data object Done : RefreshState

    /** Déjà fait il y a moins d'une heure. */
    data class TooSoon(val retryAfterMinutes: Int) : RefreshState

    data object NotLinked : RefreshState

    /** Accès GitHub retiré : il faut se reconnecter avec GitHub. */
    data object TokenRevoked : RefreshState

    data object Unavailable : RefreshState
}

class PassportViewModel(private val api: PassportApi, private val handle: String) : ViewModel() {
    private val _state = MutableStateFlow<PassportState>(PassportState.Loading)
    val state: StateFlow<PassportState> = _state.asStateFlow()

    init {
        load()
    }

    fun load() {
        _state.value = PassportState.Loading
        viewModelScope.launch {
            _state.value = try {
                PassportState.Loaded(api.passport(handle))
            } catch (e: CancellationException) {
                throw e
            } catch (e: ApiException) {
                if (e.status == 404) PassportState.NotFound else PassportState.Failed
            } catch (_: Exception) {
                PassportState.Failed
            }
        }
    }

    fun refreshGithub() {
        val current = _state.value as? PassportState.Loaded ?: return
        if (current.refresh == RefreshState.Running) return
        _state.value = current.copy(refresh = RefreshState.Running)
        viewModelScope.launch {
            val outcome = try {
                api.refreshGithub()
                RefreshState.Done
            } catch (e: CancellationException) {
                throw e
            } catch (e: ApiException) {
                when (e.code) {
                    "rate_limited" -> RefreshState.TooSoon(((e.retryAfterSeconds ?: 3600) + 59) / 60)
                    "github.not_linked" -> RefreshState.NotLinked
                    "github.token_revoked" -> RefreshState.TokenRevoked
                    else -> RefreshState.Unavailable
                }
            } catch (_: Exception) {
                RefreshState.Unavailable
            }
            // Les scores ont pu changer : on relit le Passport, en gardant le message.
            val fresh = runCatching { api.passport(handle) }.getOrNull()
            _state.update { state ->
                val loaded = state as? PassportState.Loaded ?: return@update state
                loaded.copy(passport = fresh ?: loaded.passport, refresh = outcome)
            }
        }
    }
}
