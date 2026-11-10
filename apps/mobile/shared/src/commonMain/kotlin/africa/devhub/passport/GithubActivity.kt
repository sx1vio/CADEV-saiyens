package africa.devhub.passport

import kotlinx.serialization.Serializable

// Reflet de packages/contracts/src/github-activity.ts : activité GitHub publique d'un membre
// (GET /api/v1/users/:handle/github). Aucun dépôt privé n'y figure.

@Serializable
data class GithubProfile(
    val login: String,
    val url: String,
    val followers: Int = 0,
    val following: Int = 0,
    val publicRepos: Int = 0,
    val since: String,
)

@Serializable
data class GithubTotals(val stars: Int = 0, val forks: Int = 0, val events90d: Int = 0, val commits90d: Int = 0)

@Serializable
data class GithubLanguage(val name: String, val repos: Int = 0)

@Serializable
data class GithubRepo(
    val name: String,
    val fullName: String,
    val description: String? = null,
    val language: String? = null,
    val stars: Int = 0,
    val forks: Int = 0,
    val pushedAt: String? = null,
    val url: String,
)

@Serializable
data class GithubCommit(val repo: String, val sha: String, val message: String, val url: String, val at: String)

@Serializable
data class GithubEvent(val kind: String, val repo: String, val label: String, val url: String, val at: String)

@Serializable
data class DayCount(val date: String, val count: Int = 0)

@Serializable
data class GithubActivity(
    val profile: GithubProfile,
    val totals: GithubTotals = GithubTotals(),
    val languages: List<GithubLanguage> = emptyList(),
    val repos: List<GithubRepo> = emptyList(),
    val commits: List<GithubCommit> = emptyList(),
    val events: List<GithubEvent> = emptyList(),
    /** 91 jours, du plus ancien au plus récent : événements publics par jour. */
    val calendar: List<DayCount> = emptyList(),
    val fetchedAt: String,
)
