package africa.devhub.news

import africa.devhub.network.apiCall
import io.ktor.client.HttpClient
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import kotlinx.serialization.Serializable

/** Actualité réelle agrégée par l'API (sources publiques, collecte du worker), jamais inventée. */
@Serializable
data class NewsItem(
    val id: String,
    val kind: String,
    val sourceName: String,
    val category: String = "",
    val lang: String = "en",
    val title: String,
    val summary: String = "",
    val url: String,
    val publishedAt: String,
    val score: Int = 0,
    val comments: Int = 0,
)

/** GET /api/v1/news/home : la une, les rubriques et les vidéos, en un appel. */
@Serializable
data class NewsHome(
    val hero: List<NewsItem> = emptyList(),
    val sections: Map<String, List<NewsItem>> = emptyMap(),
    val sectionLabels: Map<String, String> = emptyMap(),
    val videos: List<NewsItem> = emptyList(),
    val hn: List<NewsItem> = emptyList(),
    val releases: List<NewsItem> = emptyList(),
    val updatedAt: String? = null,
)

@Serializable
data class NewsList(val items: List<NewsItem>)

class NewsApi(private val http: HttpClient) {
    /** [lang] : `fr`, `en` ou `all`. */
    suspend fun home(lang: String): NewsHome = apiCall { http.get("api/v1/news/home") { parameter("lang", lang) } }

    suspend fun search(query: String, lang: String): NewsList =
        apiCall {
            http.get("api/v1/news") {
                parameter("q", query.take(80))
                parameter("lang", lang)
                parameter("limit", 40)
            }
        }
}
