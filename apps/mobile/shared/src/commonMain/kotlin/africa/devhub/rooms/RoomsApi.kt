package africa.devhub.rooms

import africa.devhub.core.newUuid
import africa.devhub.network.apiCall
import io.ktor.client.HttpClient
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.parameter
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.http.encodeURLPathPart

/** Lectures des salles (R1 à R9) ; les écritures passent par la file (ActionWriter). */
class RoomsApi(private val http: HttpClient) {
    suspend fun rooms(mine: Boolean, query: String? = null, cursor: String? = null): RoomList =
        apiCall {
            http.get("api/v1/rooms") {
                if (mine) parameter("mine", "true")
                query?.takeIf { it.length >= 2 }?.let { parameter("q", it) }
                cursor?.let { parameter("cursor", it) }
                parameter("limit", 20)
            }
        }

    /** Une salle par son code d'invitation (URL publique /p/:code). */
    suspend fun room(code: String): RoomDetail = apiCall { http.get("api/v1/rooms/${code.encodeURLPathPart()}") }

    suspend fun tasks(roomId: String): TaskList = apiCall { http.get("api/v1/rooms/$roomId/tasks") }

    suspend fun messages(roomId: String, cursor: String? = null): MessageList =
        apiCall {
            http.get("api/v1/rooms/$roomId/messages") {
                cursor?.let { parameter("cursor", it) }
                parameter("limit", 50)
            }
        }

    suspend fun joinRequests(roomId: String): JoinRequestList =
        apiCall { http.get("api/v1/rooms/$roomId/join-requests") }

    /**
     * Création (R1) : le dépôt est vérifié auprès de GitHub, donc jamais hors ligne
     * (04 § 2 : « exige le réseau »). [key] reste le même si la personne réessaie.
     */
    suspend fun create(request: CreateRoomRequest, key: String = newUuid()): CreateRoomResponse =
        apiCall {
            http.post("api/v1/rooms") {
                header("Idempotency-Key", key)
                contentType(ContentType.Application.Json)
                setBody(request)
            }
        }
}
