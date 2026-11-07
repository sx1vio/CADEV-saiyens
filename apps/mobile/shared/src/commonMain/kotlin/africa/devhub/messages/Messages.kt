package africa.devhub.messages

import africa.devhub.network.apiCall
import africa.devhub.network.apiCallUnit
import io.ktor.client.HttpClient
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType
import kotlinx.serialization.Serializable

// Messagerie privée à deux (packages/contracts/src/messages.ts).

@Serializable
data class ConversationPeer(val handle: String, val displayName: String, val country: String? = null, val active: Boolean = true)

@Serializable
data class LastMessage(val body: String, val at: String, val mine: Boolean)

@Serializable
data class Conversation(
    val id: String,
    val peer: ConversationPeer,
    val lastMessage: LastMessage? = null,
    val unread: Int = 0,
    val blocked: Boolean = false,
    /** Personne active et aucun blocage : on peut écrire. */
    val canWrite: Boolean = true,
)

@Serializable
data class Conversations(val data: List<Conversation>, val unreadTotal: Int = 0)

@Serializable
data class DirectMessage(val id: String, val mine: Boolean, val body: String, val createdAt: String, val hidden: Boolean = false)

/** Du plus ancien au plus récent. */
@Serializable
data class DirectMessages(val conversation: Conversation, val data: List<DirectMessage>, val hasMore: Boolean = false)

@Serializable
private data class StartRequest(val handle: String)

@Serializable
data class StartResponse(val id: String)

const val DM_MAX = 4_000

class MessagesApi(private val http: HttpClient) {
    suspend fun conversations(): Conversations = apiCall { http.get("api/v1/conversations") }

    /** Ouvre, ou retrouve, la conversation avec ce membre. */
    suspend fun start(handle: String): StartResponse =
        apiCall {
            http.post("api/v1/conversations") {
                contentType(ContentType.Application.Json)
                setBody(StartRequest(handle.removePrefix("@")))
            }
        }

    suspend fun messages(conversationId: String, before: String? = null): DirectMessages =
        apiCall { http.get("api/v1/conversations/$conversationId/messages") { before?.let { parameter("before", it) } } }

    suspend fun markRead(conversationId: String) = apiCallUnit { http.post("api/v1/conversations/$conversationId/read") }
}
