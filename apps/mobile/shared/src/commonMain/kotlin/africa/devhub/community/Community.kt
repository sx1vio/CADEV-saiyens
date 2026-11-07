package africa.devhub.community

import africa.devhub.network.apiCall
import africa.devhub.network.apiCallUnit
import africa.devhub.passport.PageInfo
import africa.devhub.sos.PublicAuthor
import io.ktor.client.HttpClient
import io.ktor.client.request.delete
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import io.ktor.client.request.post
import io.ktor.client.request.put
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType
import kotlinx.serialization.Serializable

// Fil de la communauté (packages/contracts/src/posts.ts) : public en lecture ; publier, commenter
// et voter demandent un compte, et le réseau (l'API n'offre pas de clé d'idempotence ici).

val COMMUNITY_SLUGS = listOf("ia", "web", "mobile", "backend", "devops", "data", "opensource", "carriere", "fintech", "showcase")
val POST_KINDS = listOf("discussion", "question", "showcase", "news", "opensource")

internal object PostLimits {
    const val TITLE_MIN = 8
    const val TITLE_MAX = 160
    const val BODY_MAX = 10_000
    const val CODE_MAX = 5_000
    const val COMMENT_MIN = 2
    const val COMMENT_MAX = 5_000
}

@Serializable
data class PostView(
    val id: String,
    val community: String,
    val kind: String,
    val title: String,
    val body: String = "",
    val linkUrl: String? = null,
    val code: String? = null,
    val tags: List<String> = emptyList(),
    val author: PublicAuthor,
    val score: Int = 0,
    /** Vote du visiteur : 1, -1 ou 0. */
    val myVote: Int = 0,
    val comments: Int = 0,
    val mine: Boolean = false,
    val createdAt: String,
)

@Serializable
data class PostList(val data: List<PostView>, val page: PageInfo)

@Serializable
data class PostComment(
    val id: String,
    val parentId: String? = null,
    val body: String,
    val author: PublicAuthor,
    val mine: Boolean = false,
    val createdAt: String,
)

@Serializable
data class PostDetail(
    val id: String,
    val community: String,
    val kind: String,
    val title: String,
    val body: String = "",
    val linkUrl: String? = null,
    val code: String? = null,
    val tags: List<String> = emptyList(),
    val author: PublicAuthor,
    val score: Int = 0,
    val myVote: Int = 0,
    val comments: Int = 0,
    val mine: Boolean = false,
    val createdAt: String,
    val commentList: List<PostComment> = emptyList(),
)

@Serializable
data class CreatePostRequest(
    val community: String,
    val kind: String,
    val title: String,
    val body: String,
    val linkUrl: String?,
    val code: String?,
    val tags: List<String>,
)

@Serializable
data class CreatedId(val id: String)

@Serializable
private data class CommentRequest(val body: String, val parentId: String? = null)

@Serializable
private data class VoteRequest(val value: Int)

@Serializable
data class VoteResult(val score: Int, val myVote: Int)

class CommunityApi(private val http: HttpClient) {
    suspend fun posts(community: String?, top: Boolean, cursor: String? = null): PostList =
        apiCall {
            http.get("api/v1/posts") {
                community?.let { parameter("community", it) }
                parameter("sort", if (top) "top" else "recent")
                cursor?.let { parameter("cursor", it) }
                parameter("limit", 20)
            }
        }

    suspend fun post(id: String): PostDetail = apiCall { http.get("api/v1/posts/$id") }

    suspend fun create(request: CreatePostRequest): CreatedId =
        apiCall {
            http.post("api/v1/posts") {
                contentType(ContentType.Application.Json)
                setBody(request)
            }
        }

    suspend fun comment(postId: String, body: String, parentId: String? = null): CreatedId =
        apiCall {
            http.post("api/v1/posts/$postId/comments") {
                contentType(ContentType.Application.Json)
                setBody(CommentRequest(body, parentId))
            }
        }

    /** Vote idempotent par nature (la valeur est posée, pas ajoutée) : 1, -1 ou 0 pour retirer. */
    suspend fun vote(postId: String, value: Int): VoteResult =
        apiCall {
            http.put("api/v1/posts/$postId/vote") {
                contentType(ContentType.Application.Json)
                setBody(VoteRequest(value))
            }
        }

    suspend fun delete(postId: String) = apiCallUnit { http.delete("api/v1/posts/$postId") }
}
