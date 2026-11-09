package africa.devhub.app

import africa.devhub.auth.AuthRepository
import africa.devhub.auth.SessionStore
import africa.devhub.auth.SignInResult
import africa.devhub.me.Me
import africa.devhub.me.MeApi
import africa.devhub.me.AvailabilityUpdate
import africa.devhub.me.UpdateMeRequest
import africa.devhub.network.ApiException
import africa.devhub.me.OnboardingAvailability
import africa.devhub.me.OnboardingExtras
import africa.devhub.onboarding.OnboardingProfile
import kotlinx.serialization.builtins.serializer
import africa.devhub.onboarding.StartTarget
import africa.devhub.offline.CacheKey
import africa.devhub.offline.ReadCache
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

    /** [start] : première page, choisie à l'accueil ; seulement juste après celui-ci. */
    data class SignedIn(val me: Me, val start: StartTarget = StartTarget.Home) : AppState
}

class AppViewModel(
    private val sessions: SessionStore,
    private val auth: AuthRepository,
    private val meApi: MeApi,
    /** Dernier profil connu : ouvrir l'application hors ligne (O1). */
    private val deviceCache: ReadCache? = null,
    /** Efface les données hors ligne du compte à la déconnexion (O9). */
    private val forgetUser: () -> Unit = {},
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

    /**
     * Fin de l'accueil : profil d'abord, code de conduite ensuite. Si le second échoue après le
     * premier, réessayer renvoie le même profil, sans effet de bord.
     */
    fun completeOnboarding(profile: OnboardingProfile) {
        val current = _state.value as? AppState.NeedsConduct ?: return
        if (current.busy) return
        _state.value = current.copy(busy = true, failed = false)
        viewModelScope.launch {
            try {
                val me = current.me
                val updated = meApi.update(
                    UpdateMeRequest(
                        displayName = me.displayName,
                        bio = me.bio,
                        country = profile.country ?: me.country,
                        lookingFor = profile.lookingFor ?: me.lookingFor,
                        languages = profile.languages.ifEmpty { me.languages },
                        uiLang = me.uiLang,
                        emailNotifications = me.emailNotifications,
                        availability = AvailabilityUpdate(mission = profile.mission),
                        privacy = me.privacy,
                    ),
                )
                val extras = OnboardingExtras(
                    timezone = profile.timezone,
                    canHelpTagSlugs = profile.skillSlugs.takeIf { it.isNotEmpty() },
                    availability = profile.availableNow?.let { OnboardingAvailability(it, profile.mission) },
                )
                val withExtras = if (extras.timezone != null || extras.canHelpTagSlugs != null || extras.availability != null) {
                    meApi.updateOnboardingExtras(extras)
                } else {
                    updated
                }
                profile.dailyGoal?.let { deviceCache?.put(CacheKey.dailyGoal(), it, Int.serializer()) }
                val accepted = meApi.acceptCodeOfConduct()
                val done = withExtras.copy(codeOfConductAcceptedAt = accepted.codeOfConductAcceptedAt)
                deviceCache?.put(CacheKey.me(), done, Me.serializer())
                _state.value = AppState.SignedIn(done, profile.start)
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                _state.update { (it as? AppState.NeedsConduct)?.copy(busy = false, failed = true) ?: it }
            }
        }
    }

    /** La page annoncée par le plan est ouverte : on n'y retourne pas si l'écran est recréé (rotation, thème). */
    fun startHandled() {
        _state.update { if (it is AppState.SignedIn && it.start != StartTarget.Home) it.copy(start = StartTarget.Home) else it }
    }

    /** Réglages enregistrés : le profil affiché suit sans tout recharger. */
    fun meUpdated(me: Me) {
        deviceCache?.put(CacheKey.me(), me, Me.serializer())
        _state.update { if (it is AppState.SignedIn) AppState.SignedIn(me, it.start) else it }
    }

    /** Compte supprimé (A3) : l'API a fermé toutes les sessions ; on efface tout ici aussi. */
    fun accountDeleted() {
        forgetUser()
        sessions.clear()
    }

    fun signOut() {
        viewModelScope.launch {
            auth.signOut()
            forgetUser()
        }
    }

    private suspend fun loadMe() {
        _state.value = AppState.Loading
        _state.value = try {
            val me = meApi.me()
            deviceCache?.put(CacheKey.me(), me, Me.serializer())
            route(me)
        } catch (e: CancellationException) {
            throw e
        } catch (e: ApiException) {
            // 401 : la session vient d'être effacée, le collecteur affichera la connexion.
            if (e.status == 401) AppState.SignedOut() else cachedMe() ?: AppState.Unreachable
        } catch (_: Exception) {
            // Hors ligne : on entre avec le dernier profil connu, s'il y en a un.
            cachedMe() ?: AppState.Unreachable
        }
    }

    private fun route(me: Me): AppState =
        if (me.codeOfConductAcceptedAt == null) AppState.NeedsConduct(me) else AppState.SignedIn(me)

    private fun cachedMe(): AppState? = deviceCache?.get(CacheKey.me(), Me.serializer())?.value?.let(::route)

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
