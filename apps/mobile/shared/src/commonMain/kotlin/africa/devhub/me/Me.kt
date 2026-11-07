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
    val languages: List<String> = listOf("fr"),
    val uiLang: String = "fr",
    val emailNotifications: Boolean = true,
    val lookingFor: String? = null,
    val privacy: Privacy = Privacy(),
    val githubLinked: Boolean = false,
    val codeOfConductAcceptedAt: String? = null,
    val isDemo: Boolean = false,
    val createdAt: String,
    val trust: Trust,
)

/** PR14 : confidentialité telle qu'elle s'applique. */
@Serializable
data class Privacy(
    val unlisted: Boolean = false,
    val hideCountry: Boolean = false,
    val hideTimezone: Boolean = false,
    val hideAvailability: Boolean = false,
    val hideStats: Boolean = false,
)

/**
 * PATCH /api/v1/me (`UpdateMeRequest`) : le formulaire des réglages envoie tous ses champs ;
 * null efface (bio, pays, recherche), d'où un encodage qui garde les null.
 */
@Serializable
data class UpdateMeRequest(
    val displayName: String,
    val bio: String?,
    val country: String?,
    val lookingFor: String?,
    val languages: List<String>,
    val uiLang: String,
    val emailNotifications: Boolean,
    val availability: AvailabilityUpdate,
    val privacy: Privacy,
)

/** PR4 : « Disponible pour une mission ». */
@Serializable
data class AvailabilityUpdate(val mission: Boolean)

@Serializable
data class DeleteMeRequest(val confirmHandle: String)

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
