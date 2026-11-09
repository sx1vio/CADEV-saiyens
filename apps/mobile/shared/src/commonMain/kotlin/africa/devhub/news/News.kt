package africa.devhub.news

import africa.devhub.network.apiCall
import io.ktor.client.HttpClient
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

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
    /** Image de l'article ; toujours lue par le proxy du serveur, jamais en direct chez l'éditeur. */
    val image: String? = null,
    val publishedAt: String,
    val score: Int = 0,
    val comments: Int = 0,
    /** Offres : l'entreprise qui recrute. */
    val author: String? = null,
    /** Détails propres à la source (offres : `jobType`, `location`, `salary`). */
    val extra: JsonObject = JsonObject(emptyMap()),
) {
    /** Un détail texte de [extra], ou null s'il manque ou s'il est vide. */
    fun extraText(key: String): String? =
        (extra[key] as? JsonPrimitive)?.takeIf { it.isString }?.content?.trim()?.takeIf { it.isNotEmpty() }

    /** Une liste de textes de [extra] (outils d'un skill…), vide si elle manque. */
    fun extraList(key: String): List<String> =
        (extra[key] as? JsonArray)?.mapNotNull { (it as? JsonPrimitive)?.takeIf { p -> p.isString }?.content?.takeIf { c -> c.isNotBlank() } }.orEmpty()
}

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

    /** Éléments collectés d'un type (`cert`, `skill`…) ; [category] et [query] affinent les skills. */
    suspend fun list(kind: String, category: String? = null, query: String? = null, limit: Int = 60): NewsList =
        apiCall {
            http.get("api/v1/news") {
                parameter("kind", kind)
                if (!category.isNullOrBlank()) parameter("category", category)
                if (!query.isNullOrBlank()) parameter("q", query.take(80))
                parameter("limit", limit)
            }
        }
}
