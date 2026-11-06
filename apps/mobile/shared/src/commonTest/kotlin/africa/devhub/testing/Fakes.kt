package africa.devhub.testing

import africa.devhub.app.AppGraph
import africa.devhub.core.AppConfig
import africa.devhub.platform.AuthBrowser
import africa.devhub.platform.SecureStore
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.MockEngineConfig
import io.ktor.client.engine.mock.MockRequestHandleScope
import io.ktor.client.engine.mock.respond
import io.ktor.client.request.HttpRequestData
import io.ktor.client.request.HttpResponseData
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.headersOf
import kotlinx.coroutines.CoroutineDispatcher

val testConfig = AppConfig(apiBaseUrl = "https://api.test")

class FakeSecureStore(initial: Map<String, String> = emptyMap()) : SecureStore {
    val values = initial.toMutableMap()

    override fun read(key: String): String? = values[key]

    override fun write(key: String, value: String) {
        values[key] = value
    }

    override fun delete(key: String) {
        values.remove(key)
    }
}

/** Navigateur simulé : enregistre l'URL ouverte et renvoie l'adresse de retour choisie par le test. */
class FakeAuthBrowser(var answer: (url: String) -> String? = { null }) : AuthBrowser {
    val opened = mutableListOf<String>()

    override suspend fun authenticate(url: String, callbackScheme: String): String? {
        opened += url
        return answer(url)
    }
}

fun MockRequestHandleScope.json(body: String, status: HttpStatusCode = HttpStatusCode.OK): HttpResponseData =
    respond(body, status, headersOf(HttpHeaders.ContentType, "application/json"))

fun MockRequestHandleScope.problem(status: HttpStatusCode, code: String): HttpResponseData =
    respond(
        """{"code":"$code","title":"t","status":${status.value}}""",
        status,
        headersOf(HttpHeaders.ContentType, "application/problem+json"),
    )

/**
 * Graphe complet sur une API simulée. [dispatcher] : celui du test, pour que les réponses
 * arrivent sur son fil et dans son ordre (sinon le moteur répond depuis un autre fil).
 */
fun testGraph(
    store: FakeSecureStore = FakeSecureStore(),
    browser: FakeAuthBrowser = FakeAuthBrowser(),
    dispatcher: CoroutineDispatcher? = null,
    handler: suspend MockRequestHandleScope.(HttpRequestData) -> HttpResponseData,
): AppGraph {
    val engine = MockEngine(
        MockEngineConfig().apply {
            addHandler(handler)
            dispatcher?.let { this.dispatcher = it }
        },
    )
    return AppGraph(testConfig, store, browser, engine)
}

const val SESSION_KEY = "devhub.session"

fun meJson(codeOfConductAcceptedAt: String? = "2026-11-01T00:00:00.000Z"): String {
    val coc = codeOfConductAcceptedAt?.let { "\"$it\"" } ?: "null"
    // Champs en plus de ceux lus par l'application : ils doivent être ignorés.
    return """
        {"id":"7f1e0c1a-0000-4000-8000-000000000001","handle":"awa-dev","displayName":"Awa Diop",
         "avatarUrl":null,"email":"awa@example.test","emailVerified":true,"bio":null,"country":"SN",
         "timezone":null,"languages":["fr"],"uiLang":"fr","emailNotifications":true,"lookingFor":null,
         "githubLinked":true,"githubCreatedAt":null,"codeOfConductAcceptedAt":$coc,"isAdmin":false,
         "isDemo":false,"createdAt":"2026-10-01T00:00:00.000Z",
         "privacy":{"unlisted":false,"hideCountry":false,"hideTimezone":false,"hideAvailability":false,"hideStats":false},
         "trust":{"githubLinked":true,"githubAccountYears":4,"emailVerified":true,"demo":false,"founder":true},
         "futureField":{"x":1}}
    """.trimIndent()
}

fun passportJson(handle: String = "awa-dev", totalXp: Int = 42): String = """
    {"user":{"id":"7f1e0c1a-0000-4000-8000-000000000001","handle":"$handle","displayName":"Awa Diop",
      "avatarUrl":null,"bio":"Backend","country":"SN","timezone":null,"languages":["fr"],"lookingFor":null,
      "availability":{"mission":true},"isDemo":false,"memberSince":"2026-10-01T00:00:00.000Z"},
     "trust":{"githubLinked":true,"githubAccountYears":4,"emailVerified":true,"demo":false,"founder":true},
     "skills":[{"tag":{"slug":"kotlin","label":"Kotlin"},"score":55,"level":"confirmed","githubSignal":35,
       "githubRepos":7,"platformPoints":20}],
     "canHelp":[{"slug":"kotlin","label":"Kotlin"}],"wantLearn":[],
     "stats":{"totalXp":$totalXp,"answersAccepted":3,"helpfulVotes":5,"questionsResolved":1,
       "medianMinutesToHelp":12.5,"contributions":2,"contributionsVerified":1,"reviews":0},
     "projects":[]}
""".trimIndent()

fun proofsJson(ids: List<Int>, nextCursor: String?): String {
    val events = ids.joinToString(",") { i ->
        """{"id":"00000000-0000-4000-8000-${i.toString().padStart(12, '0')}","kind":"answer_accepted","points":10,
           "tag":{"slug":"kotlin","label":"Kotlin"},"source":{"type":"answer","id":"00000000-0000-4000-8000-000000000999"},
           "createdAt":"2026-11-0${i}T10:00:00.000Z","revertedAt":null,"revertsId":null}"""
    }
    val cursor = nextCursor?.let { "\"$it\"" } ?: "null"
    return """{"user":{"handle":"awa-dev","displayName":"Awa"},"totalXp":30,"events":[$events],
              "page":{"nextCursor":$cursor,"hasMore":${nextCursor != null}}}"""
}
