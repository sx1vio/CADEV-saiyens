package africa.devhub.rooms

import africa.devhub.passport.PageInfo
import africa.devhub.passport.Tag
import africa.devhub.sos.PublicAuthor
import kotlinx.serialization.Serializable

// Reflet de packages/contracts/src/rooms.ts et tasks.ts : champs lus par l'application.

object RoomLimits {
    const val NAME_MIN = 3
    const val NAME_MAX = 80
    const val DESCRIPTION_MIN = 10
    const val DESCRIPTION_MAX = 5_000
    const val STACK_MAX = 8
    const val TASK_TITLE_MIN = 3
    const val TASK_TITLE_MAX = 150
    const val MESSAGE_MAX = 4_000
    const val JOIN_MESSAGE_MAX = 500
}

/** « owner/repo » public, même règle que CreateRoomRequest. */
val REPO_FULL_NAME = Regex("""^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})/[A-Za-z0-9._-]{1,100}$""")

/** Lien de PR GitHub, même règle que PullRequestUrl. */
val PULL_REQUEST_URL = Regex("""^https://github\.com/[A-Za-z0-9-]{1,39}/[A-Za-z0-9._-]{1,100}/pull/\d{1,9}/?$""")

@Serializable
data class RepoLink(val fullName: String, val url: String, val verified: Boolean = false)

@Serializable
data class Deployment(
    val url: String,
    val status: String,
    val hostedOnSystalink: Boolean = false,
    val lastUp: Boolean? = null,
    val uptime: Double? = null,
)

@Serializable
data class RoomSummary(
    val id: String,
    val code: String,
    val name: String,
    val description: String,
    val state: String,
    val visibility: String = "public",
    val stack: List<Tag> = emptyList(),
    val repo: RepoLink? = null,
    val demoUrl: String? = null,
    val deployment: Deployment? = null,
    val owner: PublicAuthor,
    val memberCount: Int = 0,
    val openTaskCount: Int = 0,
    val createdAt: String,
    val lastActivityAt: String,
)

@Serializable
data class RoomList(val data: List<RoomSummary>, val page: PageInfo)

@Serializable
data class RoomMember(val user: PublicAuthor, val role: String, val joinedAt: String)

/** Ma place dans la salle : rôle si membre, ou état de ma demande d'adhésion. */
@Serializable
data class RoomViewer(val role: String? = null, val joinRequest: String? = null)

@Serializable
data class RoomDetail(
    val id: String,
    val code: String,
    val name: String,
    val description: String,
    val state: String,
    val visibility: String = "public",
    val stack: List<Tag> = emptyList(),
    val repo: RepoLink? = null,
    val demoUrl: String? = null,
    val deployment: Deployment? = null,
    val owner: PublicAuthor,
    val memberCount: Int = 0,
    val openTaskCount: Int = 0,
    val createdAt: String,
    val lastActivityAt: String,
    val members: List<RoomMember> = emptyList(),
    val viewer: RoomViewer? = null,
)

@Serializable
data class JoinRequestView(
    val id: String,
    val roomId: String,
    val user: PublicAuthor,
    val message: String? = null,
    val status: String,
    val createdAt: String,
)

@Serializable
data class JoinRequestList(val data: List<JoinRequestView>)

@Serializable
data class TaskView(
    val id: String,
    val roomId: String,
    val title: String,
    val description: String? = null,
    val level: String = "medium",
    val status: String,
    val assignee: PublicAuthor? = null,
    val prUrl: String? = null,
    /** « github_verified » ou « declared » à la clôture (R9). */
    val verification: String? = null,
    val fromGithubIssue: Boolean = false,
    val createdAt: String,
)

@Serializable
data class TaskList(val data: List<TaskView>)

@Serializable
data class MessageView(
    val id: String,
    val clientId: String,
    val roomId: String,
    val author: PublicAuthor,
    val kind: String = "text",
    val body: String,
    val createdAt: String,
)

/** Du plus récent au plus ancien, ordre fixé par le serveur (04 § 5). */
@Serializable
data class MessageList(val data: List<MessageView>, val page: PageInfo)

@Serializable
data class CreateRoomRequest(
    val name: String,
    val description: String,
    val state: String,
    val visibility: String,
    val repoFullName: String? = null,
    val demoUrl: String? = null,
    val stackTagSlugs: List<String>,
)

@Serializable
data class CreateRoomResponse(val id: String, val code: String)
