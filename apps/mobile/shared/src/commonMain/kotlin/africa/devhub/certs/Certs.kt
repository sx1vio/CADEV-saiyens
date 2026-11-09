package africa.devhub.certs

import africa.devhub.network.apiCall
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import io.ktor.client.HttpClient
import io.ktor.client.request.get
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable

enum class CertLevel { Beginner, Intermediate, Advanced, Expert }

/** Certification DevHub : gratuite, examen chronométré corrigé par le serveur, badge vérifiable. */
data class DevHubCert(
    val id: String,
    val title: String,
    val track: String,
    val level: CertLevel,
    val minutes: Int,
    val passScore: Int,
    val draw: Int,
    val skills: List<String>,
    val description: String,
    val syllabus: List<String>,
    val topicCounts: List<Int>,
    val bankSize: Int,
    val color: Long,
    val logo: String,
    val course: String,
) {
    val questions: Int get() = minOf(draw, bankSize)
}

/** Certification d'un éditeur : fiche relevée sur le site officiel, jamais passée dans DevHub. */
data class OfficialCert(
    val id: String,
    val title: String,
    val code: String,
    val provider: String,
    val providerColor: Long,
    val domain: String,
    val level: CertLevel,
    val free: Boolean,
    val price: String,
    val format: String,
    val passScore: String,
    val validity: String,
    val url: String,
    val languages: List<String>,
    val description: String,
    val prepLabel: String,
    val prepUrl: String,
    /** Cours DevHub utile pour s'y préparer. */
    val prepPath: String,
    val note: String,
)

/** Catalogues publics, générés depuis le web par `scripts/gen-certs.mjs` : les réponses restent sur l'API. */
object CertCatalog {
    val devhub: List<DevHubCert> = GENERATED_CERTS
    val official: List<OfficialCert> = GENERATED_OFFICIAL
    const val checkedAt: String = OFFICIAL_CHECKED_AT
    fun devhub(id: String): DevHubCert? = devhub.firstOrNull { it.id == id }

    private val prepOverride = mapOf("cloud-devops" to "docker-deploiement")

    /** Certification DevHub qui prépare à celle d'un éditeur : celle du même cours. */
    fun prepFor(cert: OfficialCert): DevHubCert? =
        cert.prepPath.takeIf { it.isNotEmpty() }?.let { path -> devhub.firstOrNull { it.course == path || it.id == prepOverride[path] } }
}

@Serializable
data class CertCertificate(val code: String, val bestScore: Int, val passedAt: String)

@Serializable
data class CertAttempt(val score: Int, val passed: Boolean, val at: String)

@Serializable
data class MyCert(
    val certId: String,
    val certificate: CertCertificate? = null,
    val lastAttempt: CertAttempt? = null,
    val nextAttemptAt: String? = null,
)

@Serializable
data class MyCerts(val items: List<MyCert> = emptyList())

class CertsApi(private val http: HttpClient) {
    /** GET /api/v1/certifications/me : badges obtenus et dernières tentatives. */
    suspend fun mine(): MyCerts = apiCall { http.get("api/v1/certifications/me") }
}

data class CertsState(
    /** `free`, `paid`, `base`, `live` ou `badges` (chaîne : sûre pour rememberSaveable sur iOS). */
    val view: String = "free",
    val mine: List<MyCert> = emptyList(),
    val query: String = "",
    val price: String = "",
    val level: String = "",
)

class CertsViewModel(private val api: CertsApi, startView: String = "free") : ViewModel() {
    private val _state = MutableStateFlow(CertsState(view = startView))
    val state: StateFlow<CertsState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            try {
                val mine = api.mine()
                _state.update { it.copy(mine = mine.items) }
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                // Le catalogue est local : sans réseau, les statuts personnels manquent seulement.
            }
        }
    }

    fun setView(view: String) = _state.update { it.copy(view = view) }
    fun setQuery(query: String) = _state.update { it.copy(query = query.take(80)) }
    fun setPrice(price: String) = _state.update { it.copy(price = if (it.price == price) "" else price) }
    fun setLevel(level: String) = _state.update { it.copy(level = if (it.level == level) "" else level) }
}
