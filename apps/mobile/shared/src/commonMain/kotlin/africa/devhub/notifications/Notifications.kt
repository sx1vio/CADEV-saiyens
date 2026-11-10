package africa.devhub.notifications

import africa.devhub.network.apiCall
import africa.devhub.passport.PageInfo
import io.ktor.client.HttpClient
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull

/**
 * Notification (S3, S4, R3, R8, PR4). Le serveur ne renvoie pas de texte : l'application le
 * construit à partir du type et du payload (packages/contracts/src/notifications.ts).
 */
@Serializable
data class NotificationView(
    val id: String,
    val type: String,
    val payload: JsonObject = JsonObject(emptyMap()),
    val readAt: String? = null,
    val createdAt: String,
) {
    fun text(key: String): String? = (payload[key] as? JsonPrimitive)?.contentOrNull
}

@Serializable
data class NotificationList(val data: List<NotificationView>, val unreadCount: Int, val page: PageInfo)

@Serializable
private data class ReadRequest(val ids: List<String>? = null, val all: Boolean? = null)

class NotificationsApi(private val http: HttpClient) {
    suspend fun list(cursor: String? = null, unreadOnly: Boolean = false): NotificationList =
        apiCall {
            http.get("api/v1/notifications") {
                if (unreadOnly) parameter("unread", "true")
                cursor?.let { parameter("cursor", it) }
                parameter("limit", 20)
            }
        }

    suspend fun markRead(ids: List<String>) {
        if (ids.isEmpty()) return
        apiCall<JsonObject> {
            http.post("api/v1/notifications/read") {
                contentType(ContentType.Application.Json)
                setBody(ReadRequest(ids = ids.take(100)))
            }
        }
    }

    suspend fun markAllRead() {
        apiCall<JsonObject> {
            http.post("api/v1/notifications/read") {
                contentType(ContentType.Application.Json)
                setBody(ReadRequest(all = true))
            }
        }
    }
}
