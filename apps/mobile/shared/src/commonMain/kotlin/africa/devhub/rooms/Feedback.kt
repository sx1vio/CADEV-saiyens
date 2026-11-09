package africa.devhub.rooms

import africa.devhub.network.ApiException
import africa.devhub.network.NetworkException
import africa.devhub.passport.PageInfo
import africa.devhub.passport.PassportApi
import africa.devhub.passport.Tag
import africa.devhub.sos.PublicAuthor
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable

// Reflet de packages/contracts/src/feedback.ts : demandes de retour et de revue de code (R6).

@Serializable
data class FeedbackRoom(val id: String, val code: String, val name: String)

@Serializable
data class FeedbackRequest(
    val id: String,
    /** `feedback` ou `code_review`. */
    val kind: String,
    /** `open`, `in_progress`, `done` ou `cancelled`. */
    val status: String,
    val url: String? = null,
    val note: String? = null,
    val room: FeedbackRoom,
    val stack: List<Tag> = emptyList(),
    val requester: PublicAuthor,
    val reviewer: PublicAuthor? = null,
    val createdAt: String,
    val confirmedAt: String? = null,
)

@Serializable
data class FeedbackList(val data: List<FeedbackRequest>, val page: PageInfo)

@Serializable
data class FeedbackConfirmation(val request: FeedbackRequest, val points: Int = 0)

/** Ce que l'écran annonce après une action sur une demande. */
sealed interface FeedbackNotice {
    data object Taken : FeedbackNotice

    data class Confirmed(val points: Int) : FeedbackNotice

    data object Cancelled : FeedbackNotice

    /** Code d'erreur de l'API (`feedback.already_taken`…) ou `offline`. */
    data class Error(val code: String) : FeedbackNotice
}

data class FeedbackState(
    /** Seulement les demandes de ma stack (si j'en ai une), ou toutes. */
    val stackOnly: Boolean = true,
    val hasStack: Boolean = false,
    val items: List<FeedbackRequest> = emptyList(),
    val loading: Boolean = true,
    val failed: Boolean = false,
    /** Demande en cours d'action : ses boutons sont désactivés. */
    val busyId: String? = null,
    val notice: FeedbackNotice? = null,
)

/**
 * Flux « Revues demandées » de la page Projets, comme sur le web : les demandes ouvertes des salles
 * publiques, filtrées sur ma stack par défaut. Prendre, confirmer, retirer : en ligne seulement,
 * ce sont des gestes délibérés dont la réponse compte.
 */
class FeedbackViewModel(
    private val api: RoomsApi,
    private val passportApi: PassportApi,
    private val myHandle: String,
) : ViewModel() {
    private val _state = MutableStateFlow(FeedbackState())
    val state: StateFlow<FeedbackState> = _state.asStateFlow()
    private var stackSlugs: List<String> = emptyList()

    init {
        viewModelScope.launch {
            // Ma stack vient de mon passeport ; sans elle (ou en cas d'échec) on montre toutes les demandes.
            stackSlugs = try {
                passportApi.passport(myHandle).canHelp.map { it.slug }
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                emptyList()
            }
            _state.update { it.copy(hasStack = stackSlugs.isNotEmpty(), stackOnly = stackSlugs.isNotEmpty()) }
            load()
        }
    }

    fun setStackOnly(value: Boolean) {
        if (value == _state.value.stackOnly) return
        _state.update { it.copy(stackOnly = value) }
        viewModelScope.launch { load() }
    }

    fun reload() {
        viewModelScope.launch { load() }
    }

    fun dismissNotice() = _state.update { it.copy(notice = null) }

    fun isMine(item: FeedbackRequest) = item.requester.handle == myHandle

    fun isMyReview(item: FeedbackRequest) = item.reviewer?.handle == myHandle

    fun take(id: String) = act(id) { api.takeFeedback(id); FeedbackNotice.Taken }

    fun confirm(id: String) = act(id) { FeedbackNotice.Confirmed(api.confirmFeedback(id).points) }

    fun cancel(id: String) = act(id) { api.cancelFeedback(id); FeedbackNotice.Cancelled }

    private suspend fun load() {
        val s = _state.value
        _state.update { it.copy(loading = true, failed = false) }
        try {
            val list = api.feedbackRequests(tags = stackSlugs.takeIf { s.stackOnly && it.isNotEmpty() })
            _state.update { it.copy(items = list.data, loading = false) }
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            _state.update { it.copy(loading = false, failed = true) }
        }
    }

    private fun act(id: String, call: suspend () -> FeedbackNotice) {
        if (_state.value.busyId != null) return
        _state.update { it.copy(busyId = id, notice = null) }
        viewModelScope.launch {
            val notice = try {
                call()
            } catch (e: CancellationException) {
                throw e
            } catch (e: ApiException) {
                FeedbackNotice.Error(e.code ?: "http_${e.status}")
            } catch (_: NetworkException) {
                FeedbackNotice.Error("offline")
            }
            _state.update { it.copy(busyId = null, notice = notice) }
            // La demande a changé d'état (ou quelqu'un l'a prise avant moi) : on relit le flux.
            load()
        }
    }
}
