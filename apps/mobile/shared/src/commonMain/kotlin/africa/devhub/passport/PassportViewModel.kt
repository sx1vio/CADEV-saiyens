package africa.devhub.passport

import africa.devhub.network.ApiException
import africa.devhub.offline.CacheKey
import africa.devhub.offline.UserSpace
import africa.devhub.offline.readThrough
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

    data class Loaded(
        val passport: Passport,
        val refresh: RefreshState = RefreshState.Idle,
        /** Copie locale affichée faute de réseau : date de la copie. */
        val cachedAt: Long? = null,
        /** Badges de certification publics ; vide si la liste n'a pas pu être lue. */
        val certs: List<UserCertificate> = emptyList(),
        /** Preuves par jour, pour la grille du bandeau ; vide tant qu'elles n'ont pas été lues. */
        val proofDays: Map<Long, Int> = emptyMap(),
        /** Activité GitHub publique ; null si GitHub n'est pas relié, masqué ou injoignable. */
        val github: GithubActivity? = null,
    ) : PassportState
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

class PassportViewModel(
    private val api: PassportApi,
    private val handle: String,
    private val space: UserSpace? = null,
    private val mine: Boolean = false,
) : ViewModel() {
    private val _state = MutableStateFlow<PassportState>(PassportState.Loading)
    val state: StateFlow<PassportState> = _state.asStateFlow()

    init {
        load()
    }

    fun load() {
        _state.value = PassportState.Loading
        viewModelScope.launch {
            _state.value = try {
                val fetched = readThrough(space, CacheKey.passport(handle, mine), Passport.serializer()) { api.passport(handle) }
                PassportState.Loaded(
                    fetched.value,
                    cachedAt = fetched.cachedAt,
                    certs = runCatching { api.certificates(handle).items }.getOrDefault(emptyList()),
                ).also { enrich() }
            } catch (e: CancellationException) {
                throw e
            } catch (e: ApiException) {
                if (e.status == 404) PassportState.NotFound else PassportState.Failed
            } catch (_: Exception) {
                PassportState.Failed
            }
        }
    }

    /** Grille du bandeau et bloc GitHub : lus après le profil, qui s'affiche sans les attendre. */
    private fun enrich() {
        viewModelScope.launch {
            val days = runCatching { proofsPerDay(api.proofs(handle, limit = PROOF_DAYS_PAGE).events) }.getOrNull()
            if (days != null) _state.update { (it as? PassportState.Loaded)?.copy(proofDays = days) ?: it }
        }
        viewModelScope.launch {
            val github = runCatching { api.githubActivity(handle) }.getOrNull()
            if (github != null) _state.update { (it as? PassportState.Loaded)?.copy(github = github) ?: it }
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

private const val PROOF_DAYS_PAGE = 50
