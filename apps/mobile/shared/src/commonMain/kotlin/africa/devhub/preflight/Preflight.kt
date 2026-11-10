package africa.devhub.preflight

import africa.devhub.core.newUuid
import africa.devhub.network.ApiException
import africa.devhub.network.NetworkException
import africa.devhub.network.apiCall
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import io.ktor.client.HttpClient
import io.ktor.client.plugins.timeout
import io.ktor.client.request.get
import io.ktor.client.request.header
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

// Pré-vol (packages/contracts/src/preflight.ts) : vérifier une application en ligne et son dépôt avant
// de la lancer. Le test de charge demande la preuve de propriété du domaine : il reste sur le web.

private val REPO = Regex("^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})/[A-Za-z0-9._-]{1,100}$")

/** « owner/repo » depuis l'adresse GitHub ou la forme courte ; null si invalide (comme le contrat). */
fun normalizeRepo(raw: String): String? {
    val v = raw.trim().replace(Regex("^https?://(www\\.)?github\\.com/", RegexOption.IGNORE_CASE), "")
        .replace(Regex("\\.git$", RegexOption.IGNORE_CASE), "").trimEnd('/')
    return v.takeIf { REPO.matches(it) }
}

fun isHttpsUrl(raw: String): Boolean = raw.trim().let { it.length <= 300 && it.startsWith("https://") && it.length > 12 && ' ' !in it }

@Serializable
data class PreflightCheck(
    val id: String,
    val category: String,
    val status: String,
    val title: String,
    val detail: String = "",
    val fix: String? = null,
    val evidence: List<String> = emptyList(),
)

@Serializable
data class PreflightCounts(val pass: Int = 0, val warn: Int = 0, val fail: Int = 0, val info: Int = 0)

@Serializable
data class PreflightMetrics(
    val finalUrl: String,
    val status: Int = 0,
    val ttfbMs: Int = 0,
    val requests: Int = 0,
    val totalBytes: Int = 0,
    val estimated3gMs: Int = 0,
)

@Serializable
data class LighthouseScores(
    val performance: Int? = null,
    val accessibility: Int? = null,
    val bestPractices: Int? = null,
    val seo: Int? = null,
)

@Serializable data class Lighthouse(val scores: LighthouseScores = LighthouseScores())

@Serializable
data class PreflightReport(
    val id: String,
    val url: String? = null,
    val repo: String? = null,
    val createdAt: String,
    val durationMs: Int = 0,
    val score: Int,
    val verdict: String,
    val counts: PreflightCounts = PreflightCounts(),
    val metrics: PreflightMetrics? = null,
    val lighthouse: Lighthouse? = null,
    val checks: List<PreflightCheck> = emptyList(),
)

@Serializable
data class PreflightListItem(
    val id: String,
    val url: String? = null,
    val repo: String? = null,
    val createdAt: String,
    val score: Int,
    val verdict: String,
    val counts: PreflightCounts = PreflightCounts(),
)

@Serializable data class PreflightList(val items: List<PreflightListItem> = emptyList())

@Serializable
private data class CreatePreflight(val url: String? = null, val repo: String? = null)

class PreflightApi(private val http: HttpClient) {
    suspend fun mine(): PreflightList = apiCall { http.get("api/v1/preflight") }

    suspend fun get(id: String): PreflightReport = apiCall { http.get("api/v1/preflight/$id") }

    /** L'analyse parcourt le site et le dépôt : elle prend plus longtemps que les autres appels. */
    suspend fun create(url: String?, repo: String?): PreflightReport =
        apiCall {
            http.post("api/v1/preflight") {
                header("Idempotency-Key", newUuid())
                contentType(ContentType.Application.Json)
                timeout { requestTimeoutMillis = 150_000 }
                setBody(CreatePreflight(url?.trim()?.takeIf { it.isNotEmpty() }, repo?.let(::normalizeRepo)))
            }
        }
}

data class PreflightHomeState(
    val history: List<PreflightListItem> = emptyList(),
    val loading: Boolean = true,
    val failed: Boolean = false,
    val running: Boolean = false,
    /** Code d'erreur de la dernière analyse : `offline`, `preflight.*`, `rate_limited`… */
    val error: String? = null,
)

class PreflightViewModel(private val api: PreflightApi) : ViewModel() {
    private val _state = MutableStateFlow(PreflightHomeState())
    val state: StateFlow<PreflightHomeState> = _state.asStateFlow()

    init {
        reload()
    }

    fun reload() {
        _state.update { it.copy(loading = true, failed = false) }
        viewModelScope.launch {
            try {
                val items = api.mine().items
                _state.update { it.copy(history = items, loading = false) }
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                _state.update { it.copy(loading = false, failed = true) }
            }
        }
    }

    /** Lance l'analyse ; [onDone] reçoit l'identifiant du rapport pour l'ouvrir. */
    fun run(url: String, repo: String, onDone: (String) -> Unit) {
        if (_state.value.running) return
        val u = url.trim().takeIf { it.isNotEmpty() }
        val r = repo.trim().takeIf { it.isNotEmpty() }
        if ((u == null && r == null) || (u != null && !isHttpsUrl(u)) || (r != null && normalizeRepo(r) == null)) {
            _state.update { it.copy(error = "validation.failed") }
            return
        }
        _state.update { it.copy(running = true, error = null) }
        viewModelScope.launch {
            try {
                val report = api.create(u, r)
                _state.update { it.copy(running = false, history = listOf(PreflightListItem(report.id, report.url, report.repo, report.createdAt, report.score, report.verdict, report.counts)) + it.history) }
                onDone(report.id)
            } catch (e: CancellationException) {
                throw e
            } catch (e: ApiException) {
                _state.update { it.copy(running = false, error = e.code ?: "http_${e.status}") }
            } catch (_: NetworkException) {
                _state.update { it.copy(running = false, error = "offline") }
            }
        }
    }
}

sealed interface PreflightReportState {
    data object Loading : PreflightReportState

    data object Failed : PreflightReportState

    data class Loaded(val report: PreflightReport) : PreflightReportState
}

class PreflightReportViewModel(private val api: PreflightApi, private val id: String) : ViewModel() {
    private val _state = MutableStateFlow<PreflightReportState>(PreflightReportState.Loading)
    val state: StateFlow<PreflightReportState> = _state.asStateFlow()

    init {
        load()
    }

    fun load() {
        _state.value = PreflightReportState.Loading
        viewModelScope.launch {
            _state.value = try {
                PreflightReportState.Loaded(api.get(id))
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                PreflightReportState.Failed
            }
        }
    }
}
