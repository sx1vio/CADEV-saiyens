package africa.devhub.sos

import africa.devhub.core.newUuid
import africa.devhub.network.apiCall
import io.ktor.client.HttpClient
import io.ktor.client.request.HttpRequestBuilder
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.parameter
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType

/** Filtres de la liste (S6, S16). */
enum class QuestionFilter { Recent, Unanswered, ForMe, Mine }

class SosApi(private val http: HttpClient) {
    suspend fun questions(filter: QuestionFilter, query: String? = null, cursor: String? = null): QuestionList =
        apiCall {
            http.get("api/v1/questions") {
                when (filter) {
                    QuestionFilter.Recent -> Unit
                    QuestionFilter.Unanswered -> {
                        parameter("unanswered", "true")
                        parameter("sort", "waiting")
                    }
                    QuestionFilter.ForMe -> parameter("forMe", "true")
                    QuestionFilter.Mine -> parameter("mine", "true")
                }
                query?.takeIf { it.length >= 2 }?.let { parameter("q", it) }
                cursor?.let { parameter("cursor", it) }
                parameter("limit", 20)
            }
        }

    suspend fun question(id: String): QuestionDetail = apiCall { http.get("api/v1/questions/$id") }

    suspend fun tags(): TagList = apiCall { http.get("api/v1/tags") }

    // Écritures : une clé d'idempotence par action, que le rejeu ne duplique pas (ADR-0008).
    // [key] est fourni par l'appelant quand il doit survivre à un nouvel essai.

    suspend fun ask(request: AskQuestionRequest, key: String = newUuid()): AskQuestionResponse =
        apiCall { http.post("api/v1/questions") { json(request, key) } }

    suspend fun answer(questionId: String, request: PostAnswerRequest, key: String = newUuid()): PostAnswerResponse =
        apiCall { http.post("api/v1/questions/$questionId/answers") { json(request, key) } }

    suspend fun vote(answerId: String, key: String = newUuid()): VoteResponse =
        apiCall { http.post("api/v1/answers/$answerId/vote") { header(IDEMPOTENCY_KEY, key) } }

    suspend fun accept(answerId: String, key: String = newUuid()): AcceptAnswerResponse =
        apiCall { http.post("api/v1/answers/$answerId/accept") { header(IDEMPOTENCY_KEY, key) } }

    suspend fun claim(questionId: String, key: String = newUuid()) {
        apiCall<kotlinx.serialization.json.JsonObject> {
            http.post("api/v1/questions/$questionId/claim") { header(IDEMPOTENCY_KEY, key) }
        }
    }

    private inline fun <reified T> HttpRequestBuilder.json(body: T, key: String) {
        header(IDEMPOTENCY_KEY, key)
        contentType(ContentType.Application.Json)
        setBody(body)
    }

    private companion object {
        const val IDEMPOTENCY_KEY = "Idempotency-Key"
    }
}
