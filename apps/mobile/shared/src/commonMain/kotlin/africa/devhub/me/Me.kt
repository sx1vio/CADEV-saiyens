package africa.devhub.me

import kotlinx.serialization.Serializable

/** GET /api/v1/me (`MeResponse` de @devhub/contracts) : champs utilisés par l'application. */
@Serializable
data class Me(
    val id: String,
    val handle: String,
    val displayName: String,
    val avatarUrl: String? = null,
    val email: String? = null,
    val emailVerified: Boolean = false,
    val bio: String? = null,
    val country: String? = null,
    val uiLang: String = "fr",
    val githubLinked: Boolean = false,
    val codeOfConductAcceptedAt: String? = null,
    val isDemo: Boolean = false,
    val createdAt: String,
    val trust: Trust,
)

/** Signaux de confiance (PR11), dérivés de données vérifiables. */
@Serializable
data class Trust(
    val githubLinked: Boolean,
    val githubAccountYears: Int? = null,
    val emailVerified: Boolean,
    val demo: Boolean,
    val founder: Boolean,
)

/** POST /api/v1/me/code-of-conduct. */
@Serializable
data class CodeOfConductResponse(val codeOfConductAcceptedAt: String)
