package africa.devhub.discover

import africa.devhub.network.apiCall
import africa.devhub.passport.PageInfo
import io.ktor.client.HttpClient
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import kotlinx.serialization.Serializable

// Reflet de packages/contracts/src/discovery.ts et xp.ts (règles) : champs lus par l'application.

@Serializable
data class SkillScore(val slug: String, val label: String, val score: Int = 0)

/** Carte d'un dev (D1) ; les profils non listés n'apparaissent jamais. */
@Serializable
data class DevCard(
    val handle: String,
    val displayName: String,
    val country: String? = null,
    val lookingFor: String? = null,
    val isDemo: Boolean = false,
    val totalXp: Int = 0,
    val availableNow: Boolean = false,
    val availableForMission: Boolean = false,
    val topSkills: List<SkillScore> = emptyList(),
)

@Serializable
data class DevList(val data: List<DevCard>, val page: PageInfo)

@Serializable
data class CountryRank(val country: String, val totalXp: Int, val devs: Int, val rank: Int)

@Serializable
data class DevRank(
    val handle: String,
    val displayName: String,
    val country: String? = null,
    val totalXp: Int,
    val rank: Int,
    val isDemo: Boolean = false,
)

/** D2 : classement par pays, ou les devs d'un pays. [method] est affichée telle quelle. */
@Serializable
data class Leaderboard(
    val scope: String,
    val method: String = "",
    val countries: List<CountryRank> = emptyList(),
    val devs: List<DevRank> = emptyList(),
)

@Serializable
data class XpLimits(
    val dailyCap: Int,
    val fastBonusMinutes: Int,
    val helpfulVotesPerAnswer: Int,
    val validationsPerPairPerWeek: Int,
    val minVoterAccountAgeHours: Int,
)

@Serializable
data class XpScoring(
    val githubPerRepo: Int,
    val githubCap: Int,
    val platformCap: Int,
    val activeMonths: Int,
    val minLanguageShare: Double,
)

/** GET /api/v1/rules/xp : barème et formules publiés (X5). */
@Serializable
data class XpRules(val points: Map<String, Int>, val limits: XpLimits, val scoring: XpScoring)

/** Filtres de la découverte (D1). */
data class DevFilters(
    val tag: String = "",
    val country: String = "",
    val availableNow: Boolean = false,
    val mission: Boolean = false,
)

class DiscoverApi(private val http: HttpClient) {
    suspend fun devs(filters: DevFilters, cursor: String? = null): DevList =
        apiCall {
            http.get("api/v1/discover/devs") {
                filters.tag.trim().lowercase().takeIf { it.isNotEmpty() }?.let { parameter("tag", it) }
                filters.country.trim().uppercase().takeIf { it.length == 2 }?.let { parameter("country", it) }
                if (filters.availableNow) parameter("available", "true")
                if (filters.mission) parameter("mission", "true")
                cursor?.let { parameter("cursor", it) }
                parameter("limit", 20)
            }
        }

    suspend fun leaderboard(country: String? = null): Leaderboard =
        apiCall {
            http.get("api/v1/leaderboard") {
                if (country == null) {
                    parameter("scope", "country")
                } else {
                    parameter("scope", "devs")
                    parameter("country", country)
                }
            }
        }

    suspend fun rules(): XpRules = apiCall { http.get("api/v1/rules/xp") }
}
