package africa.devhub.passport

import kotlinx.serialization.Serializable

// Reflet de packages/contracts/src/passport.ts, skills.ts et xp.ts : champs lus par l'application.

@Serializable
data class Tag(val slug: String, val label: String)

/** GET /api/v1/u/:handle (PR2) : chaque chiffre est calculé, jamais saisi. */
@Serializable
data class Passport(
    val user: PassportUser,
    val trust: PassportTrust,
    val skills: List<Skill> = emptyList(),
    val canHelp: List<Tag> = emptyList(),
    val wantLearn: List<Tag> = emptyList(),
    /** null si la personne masque ses statistiques (PR14). */
    val stats: PassportStats? = null,
    val projects: List<PassportProject> = emptyList(),
)

@Serializable
data class PassportUser(
    val id: String,
    val handle: String,
    val displayName: String,
    val avatarUrl: String? = null,
    val bio: String? = null,
    val country: String? = null,
    val lookingFor: String? = null,
    val availability: Availability? = null,
    val isDemo: Boolean = false,
    val memberSince: String,
)

@Serializable
data class Availability(val now: Boolean? = null, val mission: Boolean? = null)

@Serializable
data class PassportTrust(
    val githubLinked: Boolean,
    val githubAccountYears: Int? = null,
    val emailVerified: Boolean,
    val demo: Boolean,
    val founder: Boolean,
)

/** Score d'une compétence (PR3, PR7) : min(100, G + P). */
@Serializable
data class Skill(
    val tag: Tag,
    val score: Int,
    val level: String,
    /** G : part GitHub, 0 à 40. */
    val githubSignal: Int,
    val githubRepos: Int = 0,
    /** P : Proof XP de la plateforme, plafonnés à 60. */
    val platformPoints: Int,
)

@Serializable
data class PassportStats(
    val totalXp: Int,
    val answersAccepted: Int,
    val helpfulVotes: Int,
    val questionsResolved: Int,
    val medianMinutesToHelp: Double? = null,
    val contributions: Int,
    val contributionsVerified: Int,
    val reviews: Int,
)

@Serializable
data class PassportProject(
    val code: String,
    val name: String,
    val state: String,
    val role: String,
    val repoFullName: String? = null,
)

/** GET /api/v1/me/skills et POST /api/v1/me/github/refresh. */
@Serializable
data class MySkills(val skills: List<Skill>, val lastImportedAt: String? = null)

/** GET /api/v1/u/:handle/proofs (X1) : journal public des Proof XP, paginé par curseur. */
@Serializable
data class Proofs(val totalXp: Int, val events: List<ProofEvent>, val page: PageInfo)

@Serializable
data class ProofEvent(
    val id: String,
    val kind: String,
    val points: Int,
    val tag: Tag? = null,
    val createdAt: String,
    val revertedAt: String? = null,
)

@Serializable
data class PageInfo(val nextCursor: String? = null, val hasMore: Boolean)
