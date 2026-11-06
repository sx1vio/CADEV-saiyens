package africa.devhub.me

import africa.devhub.network.apiCall
import io.ktor.client.HttpClient
import io.ktor.client.request.get
import io.ktor.client.request.post

class MeApi(private val http: HttpClient) {
    suspend fun me(): Me = apiCall { http.get("api/v1/me") }

    suspend fun acceptCodeOfConduct(): CodeOfConductResponse =
        apiCall { http.post("api/v1/me/code-of-conduct") }
}
