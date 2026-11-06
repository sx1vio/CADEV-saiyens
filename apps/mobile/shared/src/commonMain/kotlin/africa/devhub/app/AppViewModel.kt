package africa.devhub.app

import africa.devhub.auth.AuthRepository
import africa.devhub.auth.SessionStore
import africa.devhub.auth.SignInResult
import africa.devhub.me.Me
import africa.devhub.me.MeApi
import africa.devhub.network.ApiException
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** Raison d'un échec de connexion, telle qu'affichée. */
enum class SignInError { Failed, Suspended, Network, BadCredentials, EmailTaken, RateLimited, Invalid }

/** État global : qui est connecté, et ce qu'il reste à faire avant d'entrer. */
sealed interface AppState {
    data object Loading : AppState

    data class SignedOut(val busy: Boolean = false, val error: SignInError? = null) : AppState

    /** Session présente, mais l'API ne répond pas : on garde la session et on propose de réessayer. */
    data object Unreachable : AppState

    /** Code de conduite à accepter avant d'écrire quoi que ce soit (M3). */
    data class NeedsConduct(val me: Me, val busy: Boolean = false, val failed: Boolean = false) :
        AppState

    data class SignedIn(val me: Me) : AppState
}

class AppViewModel(
    private val sessions: SessionStore,
    private val auth: AuthRepository,
    private val meApi: MeApi,
) : ViewModel() {
    private val _state = MutableStateFlow<AppState>(AppState.Loading)
    val state: StateFlow<AppState> = _state.asStateFlow()

    init {
        sessions.load()
        viewModelScope.launch {
            // Toute ouverture ou fin de session (connexion, 401, déconnexion) passe par ici.
            sessions.session.collectLatest { token ->
                if (token == null) {
                    if (_state.value !is AppState.SignedOut) _state.value = AppState.SignedOut()
                } else {
                    loadMe()
                }
            }
        }
    }

    fun retry() {
        viewModelScope.launch { loadMe() }
    }

    fun signInWithGithub(loginHint: String? = null) = runSignIn { auth.signInWithGithub(loginHint) }

    fun signInWithEmail(email: String, password: String) =
        runSignIn { auth.signInWithEmail(email, password) }

    fun registerWithEmail(displayName: String, email: String, password: String) =
        runSignIn { auth.registerWithEmail(displayName, email, password) }

    private fun runSignIn(attempt: suspend () -> SignInResult) {
        if ((_state.value as? AppState.SignedOut)?.busy == true) return
        _state.value = AppState.SignedOut(busy = true)
        viewModelScope.launch {
            when (val result = attempt()) {
                // La nouvelle session déclenche loadMe() via le collecteur.
                SignInResult.SignedIn -> Unit
                SignInResult.Cancelled -> _state.value = AppState.SignedOut()
                is SignInResult.Failed -> _state.value = AppState.SignedOut(error = result.toError())
            }
        }
    }

    fun acceptCodeOfConduct() {
        val current = _state.value as? AppState.NeedsConduct ?: return
        if (current.busy) return
        _state.value = current.copy(busy = true, failed = false)
        viewModelScope.launch {
            try {
                val accepted = meApi.acceptCodeOfConduct()
                _state.value = AppState.SignedIn(
                    current.me.copy(codeOfConductAcceptedAt = accepted.codeOfConductAcceptedAt),
                )
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                _state.update { (it as? AppState.NeedsConduct)?.copy(busy = false, failed = true) ?: it }
            }
        }
    }

    fun signOut() {
        viewModelScope.launch { auth.signOut() }
    }

    private suspend fun loadMe() {
        _state.value = AppState.Loading
        _state.value = try {
            val me = meApi.me()
            if (me.codeOfConductAcceptedAt == null) AppState.NeedsConduct(me) else AppState.SignedIn(me)
        } catch (e: CancellationException) {
            throw e
        } catch (e: ApiException) {
            // 401 : la session vient d'être effacée, le collecteur affichera la connexion.
            if (e.status == 401) AppState.SignedOut() else AppState.Unreachable
        } catch (_: Exception) {
            AppState.Unreachable
        }
    }

    private fun SignInResult.Failed.toError(): SignInError = when (reason) {
        "suspended", "auth.suspended" -> SignInError.Suspended
        "network" -> SignInError.Network
        "auth.bad_credentials" -> SignInError.BadCredentials
        "auth.email_taken" -> SignInError.EmailTaken
        "rate_limited" -> SignInError.RateLimited
        "validation.failed" -> SignInError.Invalid
        else -> SignInError.Failed
    }
}
