package africa.devhub.sos

import africa.devhub.core.newUuid
import africa.devhub.network.ApiException
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** Retour d'une action, affiché sous la question. */
sealed interface SosNotice {
    data class SecretsMasked(val count: Int) : SosNotice

    data object Claimed : SosNotice

    data object Accepted : SosNotice

    data object AlreadyVoted : SosNotice

    /** Échec : [code] de l'API (RFC 9457), ou `network`. */
    data class Failed(val code: String) : SosNotice
}

sealed interface QuestionState {
    data object Loading : QuestionState

    data object NotFound : QuestionState

    data object Failed : QuestionState

    data class Loaded(
        val question: QuestionDetail,
        val busy: Boolean = false,
        val notice: SosNotice? = null,
        /** Incrémenté à chaque réponse publiée : l'écran vide alors son brouillon. */
        val answersPosted: Int = 0,
    ) : QuestionState
}

/** S2, S4, S11 : une question, sa piste IA, ses réponses ; voter, valider, répondre, « Je m'en occupe ». */
class QuestionViewModel(
    private val api: SosApi,
    private val questionId: String,
    private val pollIntervalMs: Long = 3_000,
    /** Message à montrer à l'ouverture (secrets masqués à la publication de la question). */
    private val initialNotice: SosNotice? = null,
) : ViewModel() {
    private val _state = MutableStateFlow<QuestionState>(QuestionState.Loading)
    val state: StateFlow<QuestionState> = _state.asStateFlow()

    // Brouillon de réponse : même clientId et même clé tant qu'il n'est pas publié, pour qu'un
    // nouvel essai après une coupure ne crée pas de doublon (ADR-0008).
    private var answerClientId = newUuid()
    private var answerKey = newUuid()

    init {
        viewModelScope.launch {
            load(showLoading = true)
            pollAiHint()
        }
    }

    fun refresh() {
        viewModelScope.launch { load(showLoading = _state.value !is QuestionState.Loaded) }
    }

    fun vote(answerId: String) = act { api.vote(answerId).let { if (it.counted) null else SosNotice.AlreadyVoted } }

    fun accept(answerId: String) = act { api.accept(answerId); SosNotice.Accepted }

    fun claim() = act { api.claim(questionId); SosNotice.Claimed }

    fun postAnswer(body: String) {
        val text = body.trim()
        if (text.isEmpty() || text.length > SosLimits.ANSWER_MAX) return
        act(onSuccess = { it.copy(answersPosted = it.answersPosted + 1) }) {
            val posted = api.answer(questionId, PostAnswerRequest(answerClientId, text), answerKey)
            answerClientId = newUuid()
            answerKey = newUuid()
            posted.secretsMasked.takeIf { it > 0 }?.let { SosNotice.SecretsMasked(it) }
        }
    }

    /** Exécute une écriture, puis relit la question (compteurs, statut, réponses). */
    private fun act(
        onSuccess: (QuestionState.Loaded) -> QuestionState.Loaded = { it },
        action: suspend () -> SosNotice?,
    ) {
        val current = _state.value as? QuestionState.Loaded ?: return
        if (current.busy) return
        _state.value = current.copy(busy = true, notice = null)
        viewModelScope.launch {
            val notice = try {
                action().also { _state.update { s -> (s as? QuestionState.Loaded)?.let(onSuccess) ?: s } }
            } catch (e: CancellationException) {
                throw e
            } catch (e: ApiException) {
                SosNotice.Failed(e.code ?: "http_${e.status}")
            } catch (_: Exception) {
                SosNotice.Failed("network")
            }
            load(showLoading = false)
            _state.update { (it as? QuestionState.Loaded)?.copy(busy = false, notice = notice) ?: it }
        }
    }

    private suspend fun load(showLoading: Boolean) {
        if (showLoading) _state.value = QuestionState.Loading
        try {
            val question = api.question(questionId)
            _state.update { (it as? QuestionState.Loaded)?.copy(question = question) ?: QuestionState.Loaded(question, notice = initialNotice) }
        } catch (e: CancellationException) {
            throw e
        } catch (e: ApiException) {
            if (_state.value !is QuestionState.Loaded) {
                _state.value = if (e.status == 404) QuestionState.NotFound else QuestionState.Failed
            }
        } catch (_: Exception) {
            if (_state.value !is QuestionState.Loaded) _state.value = QuestionState.Failed
        }
    }

    /** S2 : la piste IA arrive en quelques secondes ; on relit tant qu'elle est en cours (1 min au plus). */
    private suspend fun pollAiHint() {
        repeat(20) {
            val loaded = _state.value as? QuestionState.Loaded ?: return
            if (loaded.question.aiStatus != "pending") return
            delay(pollIntervalMs)
            load(showLoading = false)
        }
    }
}
