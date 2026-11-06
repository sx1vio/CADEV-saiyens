package africa.devhub.network

import kotlinx.serialization.Serializable

/** Réponse d'erreur de l'API (RFC 9457, `application/problem+json`). */
@Serializable
data class Problem(
    val code: String? = null,
    val title: String? = null,
    val status: Int? = null,
    val detail: String? = null,
)

/** Erreur HTTP de l'API, avec son code stable (`auth.required`, `github.not_linked`…). */
class ApiException(
    val status: Int,
    val problem: Problem?,
) : Exception("HTTP $status ${problem?.code ?: ""} ${problem?.title ?: ""}".trim()) {
    val code: String? get() = problem?.code
}

/** L'API n'a pas pu être jointe (pas de réseau, serveur arrêté, délai dépassé). */
class NetworkException(cause: Throwable) : Exception(cause.message, cause)
