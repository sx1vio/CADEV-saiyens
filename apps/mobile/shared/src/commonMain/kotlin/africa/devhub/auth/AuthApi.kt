package africa.devhub.auth

import africa.devhub.network.apiCall
import africa.devhub.network.apiCallUnit
import io.ktor.client.HttpClient
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType
import kotlinx.serialization.Serializable

/** POST /api/v1/auth/mobile/token (`MobileTokenRequest` de @devhub/contracts). */
@Serializable
data class MobileTokenRequest(val code: String, val codeVerifier: String)

/** `MobileTokenResponse` de @devhub/contracts. */
@Serializable
data class MobileTokenResponse(val sessionToken: String, val expiresAt: String)

class AuthApi(private val http: HttpClient) {
    suspend fun exchange(code: String, codeVerifier: String): MobileTokenResponse =
        apiCall {
            http.post("api/v1/auth/mobile/token") {
                contentType(ContentType.Application.Json)
                setBody(MobileTokenRequest(code, codeVerifier))
            }
        }

    suspend fun logout() = apiCallUnit { http.post("api/v1/auth/logout") }
}
