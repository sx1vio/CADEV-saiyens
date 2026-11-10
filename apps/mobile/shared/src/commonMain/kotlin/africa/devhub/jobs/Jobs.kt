package africa.devhub.jobs

import africa.devhub.network.apiCall
import africa.devhub.network.apiCallUnit
import io.ktor.client.HttpClient
import io.ktor.client.request.delete
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType
import kotlinx.serialization.Serializable

// Offres d'emploi (packages/contracts/src/jobs.ts, business.ts) : chacune renvoie à sa source
// officielle ; pas d'offre inventée. Candidater sur DevHub seulement si l'entreprise y est inscrite.

internal const val APPLY_MESSAGE_MIN = 30
internal const val APPLY_MESSAGE_MAX = 3_000

@Serializable
data class CompanyRef(val id: String, val slug: String, val name: String)

@Serializable
data class Job(
    val id: String,
    val title: String,
    val company: String,
    val companyUrl: String? = null,
    val location: String,
    val country: String? = null,
    val workMode: String,
    val contract: String,
    val seniority: String,
    val salary: String? = null,
    val description: String,
    /** null : candidature sur DevHub (entreprise inscrite) ; sinon page ou mailto de l'entreprise. */
    val applyUrl: String? = null,
    /** Page officielle où l'offre a été publiée. */
    val sourceUrl: String? = null,
    val companyRef: CompanyRef? = null,
    val tags: List<String> = emptyList(),
    val expiresAt: String? = null,
    val publishedAt: String,
)

@Serializable
data class JobList(val data: List<Job>)

@Serializable
data class ApplicationJob(val id: String, val title: String, val company: String, val location: String)

@Serializable
data class MyApplication(
    val id: String,
    val status: String,
    val message: String,
    val createdAt: String,
    val updatedAt: String,
    val job: ApplicationJob,
)

@Serializable
data class MyApplications(val data: List<MyApplication>)

@Serializable
private data class ApplyRequest(val message: String)

class JobsApi(private val http: HttpClient) {
    suspend fun jobs(): JobList = apiCall { http.get("api/v1/jobs") }

    suspend fun job(id: String): Job = apiCall { http.get("api/v1/jobs/$id") }

    suspend fun apply(jobId: String, message: String) =
        apiCallUnit {
            http.post("api/v1/jobs/$jobId/apply") {
                contentType(ContentType.Application.Json)
                setBody(ApplyRequest(message))
            }
        }

    suspend fun myApplications(): MyApplications = apiCall { http.get("api/v1/me/applications") }

    suspend fun withdraw(applicationId: String) = apiCallUnit { http.delete("api/v1/me/applications/$applicationId") }
}
