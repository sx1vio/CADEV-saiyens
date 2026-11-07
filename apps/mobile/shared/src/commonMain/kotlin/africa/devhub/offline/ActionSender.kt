package africa.devhub.offline

import africa.devhub.network.ApiException
import africa.devhub.network.DevHubJson
import africa.devhub.network.ensureSuccess
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import kotlinx.coroutines.CancellationException
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonPrimitive

/** Issue de l'envoi d'une action, quel que soit le chemin (unitaire ou /sync). */
sealed interface SendOutcome {
    /** Faite (ou déjà faite : rejeu idempotent) ; [data] = réponse de l'endpoint. */
    data class Applied(val data: JsonElement?) : SendOutcome

    data object Conflict : SendOutcome

    /** Refus définitif : l'action passe en échec, à corriger ou abandonner. */
    data class Rejected(val code: String) : SendOutcome

    /** Erreur passagère (429, 5xx, clé en cours, dépendance non prête) : on réessaiera. */
    data class Retry(val code: String, val retryAfterSeconds: Int? = null) : SendOutcome

    /** Le serveur n'a pas pu être joint. */
    data object Network : SendOutcome
}

@Serializable
private data class SyncActionBody(val opId: String, val type: String, val payload: JsonObject)

@Serializable
private data class SyncRequestBody(val actions: List<SyncActionBody>)

@Serializable
private data class SyncError(val code: String = "unknown")

@Serializable
private data class SyncResultBody(
    val opId: String,
    val status: String,
    val httpStatus: Int = 0,
    val data: JsonElement? = null,
    val error: SyncError? = null,
)

@Serializable
private data class SyncResponseBody(val results: List<SyncResultBody>)

/**
 * Envoie les actions à l'API. Peu d'actions prêtes : une à une par leur endpoint, avec l'opId en
 * Idempotency-Key (latence minimale). Davantage, ou une référence encore locale : un lot
 * `POST /sync` (50 au plus), où l'API résout « client:<uuid> » (04-hors-ligne-sync.md § 2 et 4).
 */
class ActionSender(private val http: HttpClient) {
    suspend fun sendOne(action: OutboxAction): SendOutcome {
        val p = action.payload
        fun id(field: String) = p[field]?.jsonPrimitive?.contentOrNull.orEmpty()
        val (path, body) = when (action.type) {
            "question.create" -> "api/v1/questions" to p
            "answer.create" -> "api/v1/questions/${id("questionId")}/answers" to
                JsonObject(p.filterKeys { it != "questionId" })
            "answer.vote" -> "api/v1/answers/${id("answerId")}/vote" to null
            "answer.accept" -> "api/v1/answers/${id("answerId")}/accept" to null
            "question.claim" -> "api/v1/questions/${id("questionId")}/claim" to null
            else -> return SendOutcome.Rejected("validation.failed")
        }
        val response = try {
            http.post(path) {
                header("Idempotency-Key", action.opId)
                if (body != null) {
                    contentType(ContentType.Application.Json)
                    setBody(body)
                }
            }
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            return SendOutcome.Network
        }
        return classify(response)
    }

    suspend fun sendBatch(actions: List<OutboxAction>): Map<String, SendOutcome> {
        val response = try {
            http.post("api/v1/sync") {
                contentType(ContentType.Application.Json)
                setBody(SyncRequestBody(actions.map { SyncActionBody(it.opId, it.type, it.payload) }))
            }
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            return actions.associate { it.opId to SendOutcome.Network }
        }
        if (!response.status.isSuccess()) {
            val outcome = classify(response)
            return actions.associate { it.opId to outcome }
        }
        val results = runCatching { response.body<SyncResponseBody>().results }.getOrElse {
            return actions.associate { it.opId to SendOutcome.Retry("invalid_response") }
        }
        return results.associate { r ->
            r.opId to when (r.status) {
                "applied", "duplicate" -> SendOutcome.Applied(r.data)
                "conflict" -> SendOutcome.Conflict
                "rejected" -> SendOutcome.Rejected(r.error?.code ?: "http_${r.httpStatus}")
                else -> SendOutcome.Retry(r.error?.code ?: "http_${r.httpStatus}")
            }
        }
    }

    private suspend fun classify(response: HttpResponse): SendOutcome {
        if (response.status.isSuccess()) {
            val text = runCatching { response.bodyAsText() }.getOrNull()
            val data = text?.takeIf { it.isNotBlank() }?.let { runCatching { DevHubJson.parseToJsonElement(it) }.getOrNull() }
            return SendOutcome.Applied(data)
        }
        val error = runCatching { response.ensureSuccess() }.exceptionOrNull() as? ApiException
        val status = response.status.value
        val code = error?.code ?: "http_$status"
        return when {
            code == "version_conflict" -> SendOutcome.Conflict
            status >= 500 || status == 429 || code == "idempotency_key.in_progress" ->
                SendOutcome.Retry(code, error?.retryAfterSeconds)
            else -> SendOutcome.Rejected(code)
        }
    }
}

/** Identifiant serveur renvoyé par une création (`{ "id": … }`). */
fun JsonElement?.createdId(): String? =
    (this as? JsonObject)?.get("id")?.let { (it as? JsonPrimitive)?.contentOrNull }
