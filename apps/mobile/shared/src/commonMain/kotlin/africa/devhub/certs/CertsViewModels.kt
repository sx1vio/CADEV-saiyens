@file:OptIn(kotlin.time.ExperimentalTime::class)

package africa.devhub.certs

import africa.devhub.network.ApiException
import africa.devhub.network.NetworkException
import africa.devhub.offline.CacheKey
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
import kotlin.time.Instant

private fun Throwable.code(): String = when (this) {
    is ApiException -> code ?: "http_$status"
    is NetworkException -> "offline"
    else -> "network"
}

data class CertsState(
    /** Mon état par certification (certificat, dernière tentative, attente, tentative en cours). */
    val mine: Map<String, MyCertification> = emptyMap(),
    val loading: Boolean = true,
    val failed: Boolean = false,
    val cachedAt: Long? = null,
)

/** Le catalogue (public, embarqué) et mon avancement (API). */
class CertsViewModel(private val api: CertsApi, private val space: UserSpace) : ViewModel() {
    private val _state = MutableStateFlow(CertsState())
    val state: StateFlow<CertsState> = _state.asStateFlow()

    init {
        reload()
    }

    fun reload() {
        _state.update { it.copy(loading = true, failed = false) }
        viewModelScope.launch {
            try {
                val fetched = readThrough(space, CacheKey.certs(), MyCertifications.serializer()) { api.mine() }
                _state.update { it.copy(mine = fetched.value.items.associateBy { c -> c.certId }, loading = false, cachedAt = fetched.cachedAt) }
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                _state.update { it.copy(loading = false, failed = true) }
            }
        }
    }
}

data class PracticeState(
    val questions: List<CertQuestion> = emptyList(),
    val index: Int = 0,
    val chosen: Int? = null,
    val result: CheckResult? = null,
    val good: Int = 0,
    val loading: Boolean = true,
    val error: String? = null,
) {
    val current get() = questions.getOrNull(index)
    val finished get() = !loading && questions.isNotEmpty() && index >= questions.size
}

/** Entraînement sans chrono : chaque réponse est corrigée tout de suite, avec l'explication. */
class PracticeViewModel(private val api: CertsApi, private val certId: String, private val topic: Int? = null) : ViewModel() {
    private val _state = MutableStateFlow(PracticeState())
    val state: StateFlow<PracticeState> = _state.asStateFlow()

    init {
        restart()
    }

    fun restart() {
        _state.value = PracticeState()
        viewModelScope.launch {
            _state.value = try {
                PracticeState(questions = api.practice(certId, topic).questions, loading = false)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                PracticeState(loading = false, error = e.code())
            }
        }
    }

    fun answer(choice: Int) {
        val s = _state.value
        val q = s.current ?: return
        if (s.result != null) return
        _state.value = s.copy(chosen = choice, error = null)
        viewModelScope.launch {
            try {
                val result = api.check(certId, q.id, choice)
                _state.update { it.copy(result = result, good = it.good + if (result.correct) 1 else 0) }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _state.update { it.copy(chosen = null, error = e.code()) }
            }
        }
    }

    fun next() = _state.update { it.copy(index = it.index + 1, chosen = null, result = null) }
}

sealed interface ExamState {
    data object Starting : ExamState

    data class Failed(val code: String) : ExamState

    data class Running(
        val attempt: Attempt,
        val answers: List<Int?>,
        val index: Int = 0,
        val remainingSeconds: Long,
        val submitting: Boolean = false,
        val error: String? = null,
    ) : ExamState

    data class Done(val result: AttemptResult) : ExamState
}

/**
 * Examen ([mode] `exam`) ou examen blanc (`mock`) : le serveur fixe l'échéance et corrige ; le
 * chronomètre affiché en découle, et les réponses partent seules à la fin du temps.
 */
class ExamViewModel(
    private val api: CertsApi,
    private val certId: String,
    private val mode: String,
    private val now: () -> Long,
) : ViewModel() {
    private val _state = MutableStateFlow<ExamState>(ExamState.Starting)
    val state: StateFlow<ExamState> = _state.asStateFlow()
    private var timer: Job? = null

    init {
        start()
    }

    fun start() {
        _state.value = ExamState.Starting
        viewModelScope.launch {
            try {
                val attempt = api.start(certId, mode)
                val deadline = Instant.parse(attempt.deadline).toEpochMilliseconds()
                _state.value = ExamState.Running(attempt, List(attempt.questions.size) { null }, remainingSeconds = remaining(deadline))
                tick(deadline)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _state.value = ExamState.Failed(e.code())
            }
        }
    }

    fun choose(choice: Int) = _state.update { s ->
        if (s !is ExamState.Running || s.submitting) s
        else s.copy(answers = s.answers.toMutableList().also { it[s.index] = choice })
    }

    fun goTo(index: Int) = _state.update { s ->
        if (s !is ExamState.Running) s else s.copy(index = index.coerceIn(0, s.attempt.questions.lastIndex))
    }

    fun submit() {
        val s = _state.value as? ExamState.Running ?: return
        if (s.submitting) return
        _state.value = s.copy(submitting = true, error = null)
        viewModelScope.launch {
            try {
                val result = api.submit(s.attempt.id, s.answers)
                timer?.cancel()
                _state.value = ExamState.Done(result)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                // Réseau coupé : les réponses restent à l'écran, on peut réessayer avant l'échéance.
                _state.update { (it as? ExamState.Running)?.copy(submitting = false, error = e.code()) ?: it }
            }
        }
    }

    private fun remaining(deadline: Long) = ((deadline - now()) / 1000).coerceAtLeast(0)

    private fun tick(deadline: Long) {
        timer?.cancel()
        timer = viewModelScope.launch {
            while (true) {
                val left = remaining(deadline)
                _state.update { (it as? ExamState.Running)?.copy(remainingSeconds = left) ?: it }
                if (left <= 0) {
                    submit()
                    return@launch
                }
                delay(1_000)
            }
        }
    }
}
