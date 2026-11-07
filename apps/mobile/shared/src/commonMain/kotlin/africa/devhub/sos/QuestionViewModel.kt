package africa.devhub.sos

import africa.devhub.network.ApiException
import africa.devhub.offline.ActionStatus
import africa.devhub.offline.CacheKey
import africa.devhub.offline.Queued
import africa.devhub.offline.SendOutcome
import africa.devhub.offline.UserSpace
import africa.devhub.offline.readThrough
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.jsonPrimitive

/** Retour d'une action, affiché sous la question. */
sealed interface SosNotice {
    data class SecretsMasked(val count: Int) : SosNotice

    data object Claimed : SosNotice

    data object Accepted : SosNotice

    data object AlreadyVoted : SosNotice

    /** Enregistrée sur le téléphone : partira au retour du réseau (O2). */
    data object Queued : SosNotice

    /** Échec : [code] de l'API (RFC 9457), ou `network`. */
    data class Failed(val code: String) : SosNotice
}

/** Réponse écrite sur le téléphone, pas encore publiée. */
data class PendingAnswer(val opId: String, val preview: String, val failed: Boolean)

sealed interface QuestionState {
    data object Loading : QuestionState

    data object NotFound : QuestionState

    data object Failed : QuestionState

    data class Loaded(
        val question: QuestionDetail,
        val busy: Boolean = false,
        val notice: SosNotice? = null,
        /** Incrémenté à chaque réponse confiée à la file : l'écran vide alors son brouillon. */
        val answersPosted: Int = 0,
        val pendingAnswers: List<PendingAnswer> = emptyList(),
        /** Copie locale affichée faute de réseau : date de la copie. */
        val cachedAt: Long? = null,
    ) : QuestionState
}

/**
 * S2, S4, S11 : une question, sa piste IA, ses réponses ; voter, valider, répondre, « Je m'en
 * occupe ». Les écritures passent par la file (ADR-0008) : elles marchent aussi hors ligne.
 */
class QuestionViewModel(
    private val api: SosApi,
    private val questionId: String,
    private val space: UserSpace,
    private val pollIntervalMs: Long = 3_000,
    /** Message à montrer à l'ouverture (secrets masqués à la publication de la question). */
    private val initialNotice: SosNotice? = null,
) : ViewModel() {
    private val _state = MutableStateFlow<QuestionState>(QuestionState.Loading)
    val state: StateFlow<QuestionState> = _state.asStateFlow()
    private var pending: List<PendingAnswer> = emptyList()

    init {
        viewModelScope.launch {
            load(showLoading = true)
            pollAiHint()
        }
        viewModelScope.launch {
            space.outbox.actions.collect { actions ->
                pending = actions.filter { it.type == "answer.create" && it.target == questionId }
                    .map { PendingAnswer(it.opId, it.preview, it.status != ActionStatus.Pending) }
                _state.update { (it as? QuestionState.Loaded)?.copy(pendingAnswers = pending) ?: it }
            }
        }
        viewModelScope.launch {
            // Une action de cette question vient de partir (retour du réseau) : on relit.
            space.engine.results.collect { r ->
                val action = r.outcome
                if (action is SendOutcome.Applied && r.type in REFRESHING) load(showLoading = false)
            }
        }
    }

    fun refresh() {
        viewModelScope.launch { load(showLoading = _state.value !is QuestionState.Loaded) }
    }

    fun vote(answerId: String) = act {
        val queued = space.writer.vote(questionId, answerId)
        queued.notice { data -> if ((data as? JsonObject)?.get("counted")?.jsonPrimitive?.booleanOrNull == false) SosNotice.AlreadyVoted else null }
    }

    fun accept(answerId: String) = act { space.writer.accept(questionId, answerId).notice { SosNotice.Accepted } }

    fun claim() = act { space.writer.claim(questionId).notice { SosNotice.Claimed } }

    fun postAnswer(body: String) {
        val text = body.trim()
        if (text.isEmpty() || text.length > SosLimits.ANSWER_MAX) return
        // Le brouillon est confié à la file : l'écran peut le vider, rien n'est perdu.
        act(onDone = { it.copy(answersPosted = it.answersPosted + 1) }) {
            val queued = space.writer.answer(questionId, text)
            queued.notice { queued.secretsMasked.takeIf { it > 0 }?.let { SosNotice.SecretsMasked(it) } }
        }
    }

    /** Traduit l'issue d'une action en message ; un vote ou une validation refusés quittent la file. */
    private suspend fun Queued.notice(applied: (kotlinx.serialization.json.JsonElement?) -> SosNotice?): SosNotice? =
        when (val o = outcome) {
            is SendOutcome.Applied -> applied(o.data)
            is SendOutcome.Rejected -> {
                if (clientId == null) space.engine.cancel(opId)
                SosNotice.Failed(o.code)
            }
            SendOutcome.Conflict -> SosNotice.Failed("version_conflict")
            null, SendOutcome.Network, is SendOutcome.Retry ->
                if (secretsMasked > 0) SosNotice.SecretsMasked(secretsMasked) else SosNotice.Queued
        }

    private fun act(
        onDone: (QuestionState.Loaded) -> QuestionState.Loaded = { it },
        action: suspend () -> SosNotice?,
    ) {
        val current = _state.value as? QuestionState.Loaded ?: return
        if (current.busy) return
        _state.value = current.copy(busy = true, notice = null)
        viewModelScope.launch {
            val notice = try {
                action()
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                SosNotice.Failed("network")
            }
            _state.update { s -> (s as? QuestionState.Loaded)?.let(onDone)?.copy(busy = false, notice = notice) ?: s }
            load(showLoading = false)
        }
    }

    private suspend fun load(showLoading: Boolean) {
        if (showLoading) _state.value = QuestionState.Loading
        try {
            val fetched = readThrough(space, CacheKey.question(questionId), QuestionDetail.serializer()) {
                api.question(questionId)
            }
            _state.update {
                (it as? QuestionState.Loaded)?.copy(question = fetched.value, cachedAt = fetched.cachedAt)
                    ?: QuestionState.Loaded(fetched.value, notice = initialNotice, pendingAnswers = pending, cachedAt = fetched.cachedAt)
            }
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
            if (loaded.question.aiStatus != "pending" || loaded.cachedAt != null) return
            delay(pollIntervalMs)
            load(showLoading = false)
        }
    }

    private companion object {
        val REFRESHING = setOf("answer.create", "answer.vote", "answer.accept", "question.claim")
    }
}
