package africa.devhub.sos

import africa.devhub.passport.PageInfo
import africa.devhub.passport.Tag
import kotlinx.serialization.Serializable

// Reflet de packages/contracts/src/questions.ts et answers.ts : champs lus par l'application.

/** Limites de @devhub/contracts (QUESTION_LIMITS, ANSWER_LIMITS). */
object SosLimits {
    const val TITLE_MIN = 10
    const val TITLE_MAX = 150
    const val BODY_MAX = 10_000
    const val CODE_MAX = 10_000
    const val TAGS_MIN = 1
    const val TAGS_MAX = 5
    const val ANSWER_MAX = 10_000
}

@Serializable
data class PublicAuthor(
    val handle: String,
    val displayName: String,
    val avatarUrl: String? = null,
    /** Compte de démonstration, toujours signalé comme tel (§6.6). */
    val isDemo: Boolean = false,
)

@Serializable
data class QuestionSummary(
    val id: String,
    val title: String,
    val status: String,
    val urgency: String = "normal",
    val lang: String = "fr",
    val tags: List<Tag> = emptyList(),
    val answerCount: Int = 0,
    val createdAt: String,
    val resolvedAt: String? = null,
    val author: PublicAuthor,
)

@Serializable
data class QuestionList(val data: List<QuestionSummary>, val page: PageInfo)

@Serializable
data class Answer(
    val id: String,
    val body: String,
    val isAccepted: Boolean = false,
    val helpfulCount: Int = 0,
    val version: Int = 1,
    val createdAt: String,
    val author: PublicAuthor,
)

@Serializable
data class MatchedHelper(val helper: PublicAuthor, val claimedAt: String? = null)

/** GET /api/v1/questions/:id. */
@Serializable
data class QuestionDetail(
    val id: String,
    val title: String,
    val status: String,
    val urgency: String = "normal",
    val lang: String = "fr",
    val tags: List<Tag> = emptyList(),
    val answerCount: Int = 0,
    val createdAt: String,
    val resolvedAt: String? = null,
    val author: PublicAuthor,
    val body: String,
    val codeSnippet: String? = null,
    val reproUrl: String? = null,
    val version: Int = 1,
    /** Présente seulement si aiStatus = done ; toujours affichée « Générée par IA, à vérifier ». */
    val aiHint: String? = null,
    val aiStatus: String = "skipped",
    val acceptedAnswerId: String? = null,
    val answers: List<Answer> = emptyList(),
    val helpers: List<MatchedHelper> = emptyList(),
)

@Serializable
data class AskQuestionRequest(
    val clientId: String,
    val title: String,
    val body: String,
    val codeSnippet: String? = null,
    val tagSlugs: List<String>,
    val urgency: String,
    val lang: String,
    val reproUrl: String? = null,
)

@Serializable
data class AskQuestionResponse(val id: String, val secretsMasked: Int = 0)

@Serializable
data class PostAnswerRequest(val clientId: String, val body: String)

@Serializable
data class PostAnswerResponse(val id: String, val secretsMasked: Int = 0)

@Serializable
data class VoteResponse(val answerId: String, val helpfulCount: Int, val counted: Boolean)

@Serializable
data class AcceptAnswerResponse(val questionId: String, val answerId: String, val status: String)

@Serializable
data class TagOption(val slug: String, val label: String, val aliases: List<String> = emptyList())

@Serializable
data class TagList(val data: List<TagOption>)
