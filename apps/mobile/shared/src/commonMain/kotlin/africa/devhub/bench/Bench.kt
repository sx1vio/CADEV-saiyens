package africa.devhub.bench

import africa.devhub.core.newUuid
import africa.devhub.network.ApiException
import africa.devhub.network.NetworkException
import africa.devhub.network.apiCall
import africa.devhub.network.apiCallUnit
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import io.ktor.client.HttpClient
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.parameter
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable

// Banc d'essai (packages/contracts/src/bench.ts) : un dev demande à d'autres de tester son application sur
// de vrais appareils et réseaux ; chaque testeur rend un rapport, le demandeur le confirme (Proof XP).

val BENCH_DEVICES = listOf("android_low", "android", "iphone", "tablet", "desktop")
val BENCH_NETWORKS = listOf("2g", "3g", "4g", "wifi", "offline")
val BENCH_VERDICTS = listOf("works", "issues", "broken")
val BENCH_SEVERITIES = listOf("blocking", "major", "minor")
val BENCH_SCOPES = listOf("open", "mine", "tested")
val BENCH_TESTERS = listOf(1, 3, 5, 10, 20)

@Serializable data class BenchAuthor(val handle: String, val displayName: String, val isDemo: Boolean = false)

@Serializable
data class BenchItem(
    val id: String,
    val title: String,
    val appUrl: String,
    val repoUrl: String? = null,
    val devices: List<String> = emptyList(),
    val networks: List<String> = emptyList(),
    val maxTesters: Int = 0,
    val testers: Int = 0,
    val status: String = "open",
    val author: BenchAuthor,
    val mine: Boolean = false,
    val reported: Boolean = false,
    val createdAt: String = "",
)

@Serializable data class BenchStats(val open: Int = 0, val reports: Int = 0, val confirmed: Int = 0)

@Serializable data class BenchList(val data: List<BenchItem> = emptyList(), val stats: BenchStats = BenchStats())

@Serializable data class BenchCell(val device: String, val network: String, val reports: Int = 0, val worst: String = "works")

@Serializable
data class BenchFinding(val severity: String, val title: String, val details: String = "")

@Serializable
data class BenchReport(
    val id: String,
    val tester: BenchAuthor,
    val device: String,
    val model: String,
    val os: String,
    val browser: String,
    val network: String,
    val country: String? = null,
    val verdict: String,
    val findings: List<BenchFinding> = emptyList(),
    val notes: String = "",
    val status: String = "submitted",
    val points: Int = 0,
    val createdAt: String = "",
)

@Serializable
data class BenchDetail(
    val id: String,
    val title: String,
    val appUrl: String,
    val repoUrl: String? = null,
    val devices: List<String> = emptyList(),
    val networks: List<String> = emptyList(),
    val maxTesters: Int = 0,
    val testers: Int = 0,
    val status: String = "open",
    val author: BenchAuthor,
    val mine: Boolean = false,
    val reported: Boolean = false,
    val createdAt: String = "",
    val instructions: String = "",
    val coverage: List<BenchCell> = emptyList(),
    val reports: List<BenchReport> = emptyList(),
)

@Serializable
data class CreateBench(
    val title: String,
    val appUrl: String,
    val repoUrl: String? = null,
    val instructions: String,
    val devices: List<String>,
    val networks: List<String>,
    val maxTesters: Int,
)

@Serializable
data class CreateBenchReport(
    val device: String,
    val model: String,
    val os: String,
    val browser: String,
    val network: String,
    val country: String? = null,
    val verdict: String,
    val findings: List<BenchFinding> = emptyList(),
    val notes: String = "",
)

@Serializable private data class Review(val decision: String)

@Serializable data class Created(val id: String)

class BenchApi(private val http: HttpClient) {
    suspend fun list(scope: String): BenchList = apiCall { http.get("api/v1/bench") { parameter("scope", scope) } }

    suspend fun detail(id: String): BenchDetail = apiCall { http.get("api/v1/bench/$id") }

    suspend fun create(body: CreateBench): Created =
        apiCall {
            http.post("api/v1/bench") {
                header("Idempotency-Key", newUuid())
                contentType(ContentType.Application.Json)
                setBody(body)
            }
        }

    suspend fun report(id: String, body: CreateBenchReport): Created =
        apiCall {
            http.post("api/v1/bench/$id/reports") {
                header("Idempotency-Key", newUuid())
                contentType(ContentType.Application.Json)
                setBody(body)
            }
        }

    suspend fun review(reportId: String, decision: String) =
        apiCallUnit {
            http.post("api/v1/bench/reports/$reportId/review") {
                header("Idempotency-Key", newUuid())
                contentType(ContentType.Application.Json)
                setBody(Review(decision))
            }
        }

    suspend fun setOpen(id: String, open: Boolean) =
        apiCallUnit { http.post("api/v1/bench/$id/${if (open) "reopen" else "close"}") { header("Idempotency-Key", newUuid()) } }
}

private fun Throwable.code(): String = when (this) {
    is ApiException -> code ?: "http_$status"
    is NetworkException -> "offline"
    else -> "failed"
}

data class BenchListState(
    val scope: String = "open",
    val items: List<BenchItem> = emptyList(),
    val stats: BenchStats = BenchStats(),
    val loading: Boolean = true,
    val failed: Boolean = false,
)

class BenchListViewModel(private val api: BenchApi) : ViewModel() {
    private val _state = MutableStateFlow(BenchListState())
    val state: StateFlow<BenchListState> = _state.asStateFlow()

    init {
        reload()
    }

    fun setScope(scope: String) {
        _state.update { it.copy(scope = scope) }
        reload()
    }

    fun reload() {
        val scope = _state.value.scope
        _state.update { it.copy(loading = true, failed = false) }
        viewModelScope.launch {
            try {
                val list = api.list(scope)
                _state.update { if (it.scope == scope) it.copy(items = list.data, stats = list.stats, loading = false) else it }
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                _state.update { it.copy(loading = false, failed = true) }
            }
        }
    }
}

data class BenchDetailState(
    val detail: BenchDetail? = null,
    val loading: Boolean = true,
    val failed: Boolean = false,
    val busy: Boolean = false,
    val error: String? = null,
)

class BenchDetailViewModel(private val api: BenchApi, private val id: String) : ViewModel() {
    private val _state = MutableStateFlow(BenchDetailState())
    val state: StateFlow<BenchDetailState> = _state.asStateFlow()

    init {
        load()
    }

    fun load() {
        _state.update { it.copy(loading = it.detail == null, failed = false) }
        viewModelScope.launch {
            try {
                val d = api.detail(id)
                _state.update { it.copy(detail = d, loading = false) }
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                _state.update { it.copy(loading = false, failed = it.detail == null) }
            }
        }
    }

    fun review(reportId: String, decision: String) = act { api.review(reportId, decision) }

    fun setOpen(open: Boolean) = act { api.setOpen(id, open) }

    private fun act(call: suspend () -> Unit) {
        if (_state.value.busy) return
        _state.update { it.copy(busy = true, error = null) }
        viewModelScope.launch {
            try {
                call()
                _state.update { it.copy(busy = false) }
                load()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _state.update { it.copy(busy = false, error = e.code()) }
            }
        }
    }
}

/** Brouillon d'un rapport de test ; les contraintes reprennent celles du contrat. */
data class ReportDraft(
    val device: String = "android_low",
    val model: String = "",
    val os: String = "",
    val browser: String = "",
    val network: String = "4g",
    val country: String = "",
    val verdict: String = "works",
    val findings: List<BenchFinding> = emptyList(),
    val notes: String = "",
) {
    val valid get() = model.trim().length in 2..80 && os.trim().length in 2..40 && browser.trim().length in 2..40 &&
        (country.isEmpty() || country.length == 2) && findings.all { it.title.trim().length in 3..160 }
}

data class BenchRequestDraft(
    val title: String = "",
    val appUrl: String = "",
    val repoUrl: String = "",
    val instructions: String = "",
    val devices: Set<String> = setOf("android_low"),
    val networks: Set<String> = setOf("3g"),
    val maxTesters: Int = 5,
) {
    private fun https(v: String) = v.startsWith("https://") && v.length in 12..500 && ' ' !in v
    val valid get() = title.trim().length in 8..120 && https(appUrl.trim()) && (repoUrl.isBlank() || https(repoUrl.trim())) &&
        instructions.trim().length in 20..4_000 && devices.isNotEmpty() && networks.isNotEmpty()
}

data class BenchFormState<D>(val draft: D, val sending: Boolean = false, val error: String? = null)

class BenchReportViewModel(private val api: BenchApi, private val id: String) : ViewModel() {
    private val _state = MutableStateFlow(BenchFormState(ReportDraft()))
    val state: StateFlow<BenchFormState<ReportDraft>> = _state.asStateFlow()

    fun edit(change: (ReportDraft) -> ReportDraft) = _state.update { it.copy(draft = change(it.draft)) }

    fun send(onDone: () -> Unit) {
        val d = _state.value.draft
        if (_state.value.sending || !d.valid) return
        _state.update { it.copy(sending = true, error = null) }
        viewModelScope.launch {
            try {
                api.report(
                    id,
                    CreateBenchReport(
                        d.device, d.model.trim(), d.os.trim(), d.browser.trim(), d.network, d.country.takeIf { it.length == 2 },
                        d.verdict, d.findings.map { it.copy(title = it.title.trim(), details = it.details.trim()) }, d.notes.trim(),
                    ),
                )
                _state.update { it.copy(sending = false) }
                onDone()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _state.update { it.copy(sending = false, error = e.code()) }
            }
        }
    }
}

class BenchCreateViewModel(private val api: BenchApi) : ViewModel() {
    private val _state = MutableStateFlow(BenchFormState(BenchRequestDraft()))
    val state: StateFlow<BenchFormState<BenchRequestDraft>> = _state.asStateFlow()

    fun edit(change: (BenchRequestDraft) -> BenchRequestDraft) = _state.update { it.copy(draft = change(it.draft)) }

    fun send(onDone: (String) -> Unit) {
        val d = _state.value.draft
        if (_state.value.sending || !d.valid) return
        _state.update { it.copy(sending = true, error = null) }
        viewModelScope.launch {
            try {
                val created = api.create(
                    CreateBench(d.title.trim(), d.appUrl.trim(), d.repoUrl.trim().takeIf { it.isNotEmpty() }, d.instructions.trim(), d.devices.toList(), d.networks.toList(), d.maxTesters),
                )
                _state.update { it.copy(sending = false) }
                onDone(created.id)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _state.update { it.copy(sending = false, error = e.code()) }
            }
        }
    }
}
