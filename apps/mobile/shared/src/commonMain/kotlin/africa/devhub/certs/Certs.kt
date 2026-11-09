package africa.devhub.certs

import africa.devhub.network.apiCall
import africa.devhub.sos.PublicAuthor
import io.ktor.client.HttpClient
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.http.encodeURLPathPart
import kotlinx.serialization.Serializable

// Certifications (packages/contracts/src/certifications.ts) : le serveur tire les questions,
// chronomètre et corrige ; les bonnes réponses ne sont envoyées qu'avec la correction.

/** Question affichée, sans la bonne réponse. */
@Serializable
data class CertQuestion(val id: String, val q: String, val code: String? = null, val choices: List<String>, val topic: Int)

@Serializable
data class Certificate(val code: String, val bestScore: Int, val passedAt: String)

@Serializable
data class LastAttempt(val score: Int, val passed: Boolean, val at: String)

@Serializable
data class ActiveAttempt(val mode: String, val deadline: String)

@Serializable
data class MyCertification(
    val certId: String,
    val certificate: Certificate? = null,
    val lastAttempt: LastAttempt? = null,
    /** Prochaine tentative d'examen possible après un échec récent. */
    val nextAttemptAt: String? = null,
    /** Tentative en cours, à reprendre. */
    val active: ActiveAttempt? = null,
)

@Serializable
data class MyCertifications(val items: List<MyCertification>)

@Serializable
data class Practice(val questions: List<CertQuestion>)

@Serializable
private data class CheckRequest(val id: String, val choice: Int)

@Serializable
data class CheckResult(val correct: Boolean, val answer: Int, val explain: String)

@Serializable
private data class StartRequest(val mode: String)

/** `exam` (compte pour le certificat) ou `mock` (examen blanc). */
@Serializable
data class Attempt(val id: String, val certId: String, val mode: String, val deadline: String, val resumed: Boolean = false, val questions: List<CertQuestion>)

@Serializable
private data class SubmitRequest(val answers: List<Int?>)

@Serializable
data class TopicScore(val topic: Int, val ok: Int, val total: Int)

@Serializable
data class Correction(
    val id: String,
    val q: String,
    val code: String? = null,
    val choices: List<String>,
    val topic: Int,
    val given: Int? = null,
    val answer: Int,
    val explain: String,
    val correct: Boolean,
)

@Serializable
data class AttemptResult(
    val attemptId: String,
    val certId: String,
    val mode: String,
    val score: Int,
    val good: Int,
    val total: Int,
    val passed: Boolean,
    /** Envoyée après la fin du temps : les réponses ne comptent pas. */
    val late: Boolean = false,
    val topics: List<TopicScore> = emptyList(),
    val corrections: List<Correction> = emptyList(),
    val certificate: Certificate? = null,
    val nextAttemptAt: String? = null,
)

@Serializable
data class VerifiedCertificate(val certId: String, val code: String, val bestScore: Int, val passedAt: String, val holder: PublicAuthor)

class CertsApi(private val http: HttpClient) {
    suspend fun mine(): MyCertifications = apiCall { http.get("api/v1/certifications/me") }

    suspend fun practice(certId: String, topic: Int? = null, count: Int = 10): Practice =
        apiCall {
            http.get("api/v1/certifications/${certId.encodeURLPathPart()}/practice") {
                topic?.let { parameter("topic", it) }
                parameter("count", count)
            }
        }

    suspend fun check(certId: String, questionId: String, choice: Int): CheckResult =
        apiCall {
            http.post("api/v1/certifications/${certId.encodeURLPathPart()}/check") {
                contentType(ContentType.Application.Json)
                setBody(CheckRequest(questionId, choice))
            }
        }

    /** Démarre une tentative, ou reprend celle en cours (`resumed`). */
    suspend fun start(certId: String, mode: String): Attempt =
        apiCall {
            http.post("api/v1/certifications/${certId.encodeURLPathPart()}/attempts") {
                contentType(ContentType.Application.Json)
                setBody(StartRequest(mode))
            }
        }

    /** [answers] : index du choix affiché pour chaque question, null sans réponse. */
    suspend fun submit(attemptId: String, answers: List<Int?>): AttemptResult =
        apiCall {
            http.post("api/v1/certifications/attempts/$attemptId/submit") {
                contentType(ContentType.Application.Json)
                setBody(SubmitRequest(answers))
            }
        }

    suspend fun verify(code: String): VerifiedCertificate =
        apiCall { http.get("api/v1/certifications/verify/${code.trim().encodeURLPathPart()}") }
}
