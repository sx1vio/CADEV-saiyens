package africa.devhub.bench

import africa.devhub.core.maskSecrets
import africa.devhub.network.ApiException
import africa.devhub.network.NetworkException
import africa.devhub.offline.ActionStatus
import africa.devhub.offline.CacheKey
import africa.devhub.offline.SendOutcome
import africa.devhub.offline.UserSpace
import africa.devhub.offline.readThrough
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

private fun Throwable.code(): String = when (this) {
    is ApiException -> code ?: "http_$status"
    is NetworkException -> "offline"
    else -> "network"
}

/** Rapport en cours de rédaction (CreateBenchReport). */
data class BenchReportDraft(
    val device: String = "",
    val model: String = "",
    val os: String = "",
    val browser: String = "",
    val network: String = "",
    val country: String = "",
    val verdict: String = "works",
    val findings: List<BenchFinding> = emptyList(),
    val notes: String = "",
) {
    val valid get() = device.isNotEmpty() && network.isNotEmpty() &&
        model.trim().length in 2..80 && os.trim().length in 2..40 && browser.trim().length in 2..40 &&
        (country.isBlank() || Regex("^[A-Za-z]{2}$").matches(country.trim())) && notes.length <= 2_000 &&
        findings.size <= 20 && findings.all { it.title.trim().length in 3..160 && it.details.length <= 2_000 }
}

data class BenchListState(
    val scope: String = "open",
    val device: String? = null,
    val network: String? = null,
    val items: List<BenchItem> = emptyList(),
    val stats: BenchStats = BenchStats(),
    val loading: Boolean = true,
    val failed: Boolean = false,
    val cachedAt: Long? = null,
)

/** Demandes de test ouvertes, les miennes, ou celles que j'ai testées. */
class BenchListViewModel(private val api: BenchApi, private val space: UserSpace? = null) : ViewModel() {
    private val _state = MutableStateFlow(BenchListState())
    val state: StateFlow<BenchListState> = _state.asStateFlow()
    private var job: Job? = null

    init {
        reload()
    }

    fun setScope(scope: String) {
        _state.update { it.copy(scope = scope) }
        reload()
    }

    fun setDevice(device: String?) {
        _state.update { it.copy(device = device) }
        reload()
    }

    fun setNetwork(network: String?) {
        _state.update { it.copy(network = network) }
        reload()
    }

    fun reload() {
        job?.cancel()
        _state.update { it.copy(loading = true, failed = false) }
        job = viewModelScope.launch {
            val s = _state.value
            try {
                val fetched = if (s.device == null && s.network == null) {
                    readThrough(space, CacheKey.bench(s.scope), BenchList.serializer()) { api.list(s.scope) }
                } else {
                    africa.devhub.offline.Fetched(api.list(s.scope, s.device, s.network))
                }
                _state.update { it.copy(items = fetched.value.data, stats = fetched.value.stats, loading = false, cachedAt = fetched.cachedAt) }
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                _state.update { it.copy(loading = false, failed = true) }
            }
        }
    }
}

sealed interface BenchState {
    data object Loading : BenchState

    data object NotFound : BenchState

    data object Failed : BenchState

    data class Loaded(
        val bench: BenchDetail,
        val draft: BenchReportDraft,
        /** Mon rapport attend dans la file (rédigé sans réseau). */
        val reportPending: Boolean = false,
        val busy: Boolean = false,
        /** Envoi parti dans la file sans réponse encore : il partira au retour du réseau. */
        val queued: Boolean = false,
        val error: String? = null,
        val cachedAt: Long? = null,
    ) : BenchState {
        val canReport get() = !bench.mine && !bench.reported && !reportPending && bench.status == "open"
    }
}

/** Une demande : tester et rendre un rapport (par la file), ou, pour le demandeur, juger les rapports. */
class BenchViewModel(private val api: BenchApi, private val benchId: String, private val space: UserSpace) : ViewModel() {
    private val _state = MutableStateFlow<BenchState>(BenchState.Loading)
    val state: StateFlow<BenchState> = _state.asStateFlow()

    init {
        viewModelScope.launch { load() }
        viewModelScope.launch {
            space.outbox.actions.collect { actions ->
                val pending = actions.any { it.type == "bench.report" && it.target == benchId && it.status == ActionStatus.Pending }
                _state.update { (it as? BenchState.Loaded)?.copy(reportPending = pending) ?: it }
            }
        }
        viewModelScope.launch {
            space.engine.results.collect { r -> if (r.type == "bench.report" && r.outcome is SendOutcome.Applied) load() }
        }
    }

    fun refresh() {
        viewModelScope.launch { load() }
    }

    fun edit(transform: (BenchReportDraft) -> BenchReportDraft) =
        _state.update { (it as? BenchState.Loaded)?.copy(draft = transform(it.draft), error = null) ?: it }

    fun submitReport() {
        val current = _state.value as? BenchState.Loaded ?: return
        if (!current.canReport || !current.draft.valid || current.busy) return
        _state.value = current.copy(busy = true, error = null)
        viewModelScope.launch {
            val queued = space.writer.submitBenchReport(benchId, current.draft)
            when (val o = queued.outcome) {
                is SendOutcome.Applied -> {
                    _state.update { (it as? BenchState.Loaded)?.copy(busy = false) ?: it }
                    load()
                }
                is SendOutcome.Rejected -> {
                    space.engine.cancel(queued.opId)
                    // Déjà rendu (renvoi après une coupure) : ce n'est pas un échec.
                    val error = o.code.takeUnless { it == "bench.already_reported" }
                    _state.update { (it as? BenchState.Loaded)?.copy(busy = false, error = error) ?: it }
                    if (error == null) load()
                }
                else -> _state.update { (it as? BenchState.Loaded)?.copy(busy = false, queued = true) ?: it }
            }
        }
    }

    fun review(reportId: String, confirm: Boolean) = online { api.review(reportId, confirm) }

    fun close() = online { api.close(benchId) }

    fun reopen() = online { api.reopen(benchId) }

    private fun online(action: suspend () -> Unit) {
        val current = _state.value as? BenchState.Loaded ?: return
        if (current.busy) return
        if (!space.connectivity.online.value) {
            _state.value = current.copy(error = "offline")
            return
        }
        _state.value = current.copy(busy = true, error = null)
        viewModelScope.launch {
            val error = try {
                action()
                null
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                e.code()
            }
            _state.update { (it as? BenchState.Loaded)?.copy(busy = false, error = error) ?: it }
            load()
        }
    }

    private suspend fun load() {
        try {
            val fetched = readThrough(space, CacheKey.benchItem(benchId), BenchDetail.serializer()) { api.detail(benchId) }
            val b = fetched.value
            _state.update {
                (it as? BenchState.Loaded)?.copy(bench = b, cachedAt = fetched.cachedAt)
                    ?: BenchState.Loaded(
                        bench = b,
                        // Préremplissage : le premier appareil et réseau demandés.
                        draft = BenchReportDraft(device = b.devices.firstOrNull().orEmpty(), network = b.networks.firstOrNull().orEmpty()),
                        reportPending = space.outbox.actions.value.any { a -> a.type == "bench.report" && a.target == benchId },
                        cachedAt = fetched.cachedAt,
                    )
            }
        } catch (e: CancellationException) {
            throw e
        } catch (e: ApiException) {
            if (_state.value !is BenchState.Loaded) _state.value = if (e.status == 404) BenchState.NotFound else BenchState.Failed
        } catch (_: Exception) {
            if (_state.value !is BenchState.Loaded) _state.value = BenchState.Failed
        }
    }
}

data class BenchDraft(
    val title: String = "",
    val appUrl: String = "",
    val repoUrl: String = "",
    val instructions: String = "",
    val devices: List<String> = listOf("android_low"),
    val networks: List<String> = listOf("3g"),
    val maxTesters: Int = 5,
) {
    private fun https(v: String) = v.trim().startsWith("https://") && v.trim().length <= 500
    val valid get() = title.trim().length in 8..120 && https(appUrl) && (repoUrl.isBlank() || https(repoUrl)) &&
        instructions.trim().length in 20..4_000 && devices.isNotEmpty() && networks.isNotEmpty() && maxTesters in 1..20
}

data class CreateBenchState(val draft: BenchDraft = BenchDraft(), val sending: Boolean = false, val error: String? = null, val createdId: String? = null)

/** Demander un test : en ligne (pas de clé d'idempotence côté API pour la création). */
class CreateBenchViewModel(private val api: BenchApi, private val space: UserSpace) : ViewModel() {
    private val _state = MutableStateFlow(CreateBenchState())
    val state: StateFlow<CreateBenchState> = _state.asStateFlow()

    fun edit(transform: (BenchDraft) -> BenchDraft) = _state.update { it.copy(draft = transform(it.draft), error = null) }

    fun send() {
        val s = _state.value
        if (!s.draft.valid || s.sending) return
        if (!space.connectivity.online.value) {
            _state.update { it.copy(error = "offline") }
            return
        }
        _state.value = s.copy(sending = true)
        val d = s.draft
        viewModelScope.launch {
            _state.value = try {
                val created = api.create(
                    CreateBenchRequest(
                        title = d.title.trim(),
                        appUrl = d.appUrl.trim(),
                        repoUrl = d.repoUrl.trim().ifEmpty { null },
                        instructions = maskSecrets(d.instructions.trim()).text,
                        devices = d.devices,
                        networks = d.networks,
                        maxTesters = d.maxTesters,
                    ),
                )
                _state.value.copy(sending = false, createdId = created.id)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _state.value.copy(sending = false, error = e.code())
            }
        }
    }

    fun consumeCreated() = _state.update { CreateBenchState() }
}
