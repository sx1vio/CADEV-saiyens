package africa.devhub.me

import africa.devhub.core.newUuid
import africa.devhub.network.DevHubJson
import africa.devhub.network.apiCall
import africa.devhub.network.apiCallUnit
import io.ktor.client.request.delete
import io.ktor.client.request.header
import io.ktor.client.request.patch
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.content.TextContent
import io.ktor.http.contentType
import kotlinx.serialization.json.Json
import io.ktor.client.HttpClient
import io.ktor.client.request.get
import io.ktor.client.request.post

class MeApi(private val http: HttpClient) {
    private val withNulls = Json(DevHubJson) { explicitNulls = true }

    suspend fun me(): Me = apiCall { http.get("api/v1/me") }

    /**
     * Réglages (PR1, PR4, PR14) : en ligne seulement, le profil alimente le matching et doit être
     * exact. [key] reste le même si la personne réessaie après une erreur.
     */
    suspend fun update(request: UpdateMeRequest, key: String = newUuid()): Me =
        apiCall {
            http.patch("api/v1/me") {
                header("Idempotency-Key", key)
                setBody(TextContent(withNulls.encodeToString(UpdateMeRequest.serializer(), request), ContentType.Application.Json))
            }
        }

    /** A3 : suppression du compte (anonymisation), après avoir retapé son pseudo. */
    suspend fun delete(confirmHandle: String) =
        apiCallUnit {
            http.delete("api/v1/me") {
                contentType(ContentType.Application.Json)
                setBody(DeleteMeRequest(confirmHandle))
            }
        }

    suspend fun acceptCodeOfConduct(): CodeOfConductResponse =
        apiCall { http.post("api/v1/me/code-of-conduct") }
}
