package africa.devhub.network

import africa.devhub.core.AppConfig
import io.ktor.client.HttpClient
import io.ktor.client.engine.HttpClientEngine
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.api.createClientPlugin
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.defaultRequest
import io.ktor.client.plugins.sse.SSE
import io.ktor.client.statement.HttpResponse
import io.ktor.client.statement.bodyAsText
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.isSuccess
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json

/** En-tête qui identifie le client auprès de l'API ; exigé avec le Bearer pour écrire (ADR-0021). */
const val CLIENT_HEADER = "X-DevHub-Client"
const val MOBILE_CLIENT = "mobile"

/**
 * JSON tolérant : un champ ajouté côté API ne doit pas casser une version déjà publiée.
 */
val DevHubJson: Json = Json {
    ignoreUnknownKeys = true
    explicitNulls = false
    coerceInputValues = true
}

/**
 * Client HTTP de l'API : base, JSON, en-tête client, session en Bearer.
 *
 * @param sessionToken jeton courant, lu à chaque requête.
 * @param onUnauthorized appelé quand l'API refuse la session (expirée ou révoquée).
 * @param engine moteur imposé (tests) ; sinon celui de la plateforme (OkHttp, Darwin).
 */
fun createHttpClient(
    config: AppConfig,
    sessionToken: () -> String?,
    onUnauthorized: suspend () -> Unit,
    engine: HttpClientEngine? = null,
): HttpClient {
    val session = createClientPlugin("DevHubSession") {
        onRequest { request, _ ->
            sessionToken()?.let { request.headers[HttpHeaders.Authorization] = "Bearer $it" }
        }
        onResponse { response ->
            val sentToken = response.call.request.headers[HttpHeaders.Authorization] != null
            if (sentToken && response.status == HttpStatusCode.Unauthorized) onUnauthorized()
        }
    }
    val configure: io.ktor.client.HttpClientConfig<*>.() -> Unit = {
        expectSuccess = false
        install(ContentNegotiation) { json(DevHubJson) }
        install(HttpTimeout) {
            connectTimeoutMillis = 10_000
            requestTimeoutMillis = 30_000
        }
        install(session)
        // Flux temps réel (GET /api/v1/events) ; la reprise est gérée par NotificationHub.
        install(SSE)
        defaultRequest {
            url(config.apiBaseUrl.trimEnd('/') + "/")
            headers.append(CLIENT_HEADER, MOBILE_CLIENT)
        }
    }
    return if (engine != null) HttpClient(engine, configure) else HttpClient(configure)
}

/** Lève [ApiException] si la réponse n'est pas un succès, avec le problème décodé s'il y en a un. */
suspend fun HttpResponse.ensureSuccess(): HttpResponse {
    if (status.isSuccess()) return this
    val problem = runCatching { DevHubJson.decodeFromString(Problem.serializer(), bodyAsText()) }
        .getOrNull()
    throw ApiException(status.value, problem, headers[HttpHeaders.RetryAfter]?.trim()?.toIntOrNull())
}
