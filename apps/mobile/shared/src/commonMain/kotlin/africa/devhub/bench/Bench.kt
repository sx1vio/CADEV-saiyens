package africa.devhub.bench

import africa.devhub.network.apiCall
import africa.devhub.network.apiCallUnit
import africa.devhub.sos.PublicAuthor
import io.ktor.client.HttpClient
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType
import kotlinx.serialization.Serializable

// Banc d'essai (packages/contracts/src/bench.ts) : des devs testent l'application d'un autre sur de
// vrais appareils et réseaux ; le demandeur confirme les rapports, ce qui rapporte des Proof XP.

val BENCH_DEVICES = listOf("android_low", "android", "iphone", "tablet", "desktop")
val BENCH_NETWORKS = listOf("2g", "3g", "4g", "wifi", "offline")
val BENCH_VERDICTS = listOf("works", "issues", "broken")
val BENCH_SEVERITIES = listOf("blocking", "major", "minor")

@Serializable
data class BenchItem(
    val id: String,
    val title: String,
    val appUrl: String,
    val repoUrl: String? = null,
    val devices: List<String>,
    val networks: List<String>,
    val maxTesters: Int,
    val testers: Int = 0,
    val status: String,
    val author: PublicAuthor,
    val mine: Boolean = false,
    /** J'ai déjà rendu un rapport sur cette demande. */
    val reported: Boolean = false,
    val createdAt: String,
)

@Serializable
data class BenchStats(val open: Int = 0, val reports: Int = 0, val confirmed: Int = 0)

@Serializable
data class BenchList(val data: List<BenchItem>, val stats: BenchStats = BenchStats())

@Serializable
data class BenchFinding(val severity: String, val title: String, val details: String = "")

@Serializable
data class BenchReport(
    val id: String,
    val tester: PublicAuthor,
    val device: String,
    val model: String,
    val os: String,
    val browser: String,
    val network: String,
    val country: String? = null,
    val verdict: String,
    val findings: List<BenchFinding> = emptyList(),
    val notes: String = "",
    val status: String,
    val points: Int = 0,
    val createdAt: String,
)

/** Une case de la couverture : appareil × réseau, avec le pire verdict reçu. */
@Serializable
data class CoverageCell(val device: String, val network: String, val reports: Int, val worst: String)

@Serializable
data class BenchDetail(
    val id: String,
    val title: String,
    val appUrl: String,
    val repoUrl: String? = null,
    val devices: List<String>,
    val networks: List<String>,
    val maxTesters: Int,
    val testers: Int = 0,
    val status: String,
    val author: PublicAuthor,
    val mine: Boolean = false,
    val reported: Boolean = false,
    val createdAt: String,
    val instructions: String,
    val coverage: List<CoverageCell> = emptyList(),
    /** Tous pour le demandeur, le sien pour un testeur. */
    val reports: List<BenchReport> = emptyList(),
)

@Serializable
data class CreateBenchRequest(
    val title: String,
    val appUrl: String,
    val repoUrl: String?,
    val instructions: String,
    val devices: List<String>,
    val networks: List<String>,
    val maxTesters: Int,
)

@Serializable
data class CreatedId(val id: String)

@Serializable
private data class ReviewRequest(val decision: String)

@Serializable
data class ReviewResult(val status: String, val points: Int = 0)

class BenchApi(private val http: HttpClient) {
    /** [scope] : `open`, `mine` (mes demandes) ou `tested` (où j'ai rendu un rapport). */
    suspend fun list(scope: String, device: String? = null, network: String? = null): BenchList =
        apiCall {
            http.get("api/v1/bench") {
                parameter("scope", scope)
                device?.let { parameter("device", it) }
                network?.let { parameter("network", it) }
            }
        }

    suspend fun detail(id: String): BenchDetail = apiCall { http.get("api/v1/bench/$id") }

    suspend fun create(request: CreateBenchRequest): CreatedId =
        apiCall {
            http.post("api/v1/bench") {
                contentType(ContentType.Application.Json)
                setBody(request)
            }
        }

    suspend fun close(id: String) = apiCallUnit { http.post("api/v1/bench/$id/close") }

    suspend fun reopen(id: String) = apiCallUnit { http.post("api/v1/bench/$id/reopen") }

    suspend fun review(reportId: String, confirm: Boolean): ReviewResult =
        apiCall {
            http.post("api/v1/bench/reports/$reportId/review") {
                contentType(ContentType.Application.Json)
                setBody(ReviewRequest(if (confirm) "confirm" else "reject"))
            }
        }
}
