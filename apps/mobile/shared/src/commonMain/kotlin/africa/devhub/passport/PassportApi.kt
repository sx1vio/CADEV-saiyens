package africa.devhub.passport

import africa.devhub.network.apiCall
import io.ktor.client.HttpClient
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import io.ktor.client.request.post
import io.ktor.http.encodeURLPathPart

class PassportApi(private val http: HttpClient) {
    suspend fun passport(handle: String): Passport =
        apiCall { http.get("api/v1/u/${handle.encodeURLPathPart()}") }

    suspend fun certificates(handle: String): UserCertificates =
        apiCall { http.get("api/v1/u/${handle.encodeURLPathPart()}/certificates") }

    suspend fun proofs(handle: String, cursor: String? = null, limit: Int = 20): Proofs =
        apiCall {
            http.get("api/v1/u/${handle.encodeURLPathPart()}/proofs") {
                cursor?.let { parameter("cursor", it) }
                parameter("limit", limit)
            }
        }

    /** Réimport du profil GitHub (une fois par heure au plus). */
    suspend fun refreshGithub(): MySkills = apiCall { http.post("api/v1/me/github/refresh") }
}
