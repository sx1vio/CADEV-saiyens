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
import africa.devhub.notifications.EventStream
import africa.devhub.offline.LocalFiles
import kotlinx.coroutines.awaitCancellation
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import okio.fakefilesystem.FakeFileSystem

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
    now: () -> Long = { 0L },
    /** Portée du moteur de synchronisation ; dans un test, backgroundScope (annulée à la fin). */
    scope: CoroutineScope? = null,
    /** Flux temps réel ; par défaut, une connexion qui ne reçoit rien. */
    eventStream: EventStream = EventStream { _, _ -> awaitCancellation() },
    handler: suspend MockRequestHandleScope.(HttpRequestData) -> HttpResponseData,
): AppGraph {
    val engine = MockEngine(
        MockEngineConfig().apply {
            addHandler(handler)
            dispatcher?.let { this.dispatcher = it }
        },
    )
    // Le moteur de synchronisation tourne sur le dispatcher du test (temps virtuel), sinon à part.
    val engineScope = scope ?: CoroutineScope(SupervisorJob() + (dispatcher ?: Dispatchers.Default))
    return AppGraph(
        config = testConfig,
        secureStore = store,
        authBrowser = browser,
        storage = LocalFiles(FakeFileSystem(), "/app"),
        engine = engine,
        eventStream = eventStream,
        scope = engineScope,
        now = now,
    )
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

fun questionJson(
    aiStatus: String = "done",
    status: String = "open",
    author: String = "awa-dev",
    answers: String = "[]",
    helpers: String = "[]",
): String = """
    {"id":"11111111-1111-4111-8111-111111111111","title":"Gradle ne trouve pas le SDK Android","status":"$status",
     "urgency":"high","lang":"fr","tags":[{"slug":"kotlin","label":"Kotlin"}],"answerCount":0,
     "createdAt":"2026-11-07T08:00:00.000Z","resolvedAt":null,
     "author":{"handle":"$author","displayName":"Awa","avatarUrl":null,"isDemo":false},
     "body":"SDK location not found","codeSnippet":"./gradlew build","reproUrl":null,"version":1,
     "aiHint":${if (aiStatus == "done") "\"Définis sdk.dir\"" else "null"},"aiStatus":"$aiStatus",
     "acceptedAnswerId":null,"answers":$answers,"helpers":$helpers}
""".trimIndent()

fun answerJson(id: String, author: String = "kofi", accepted: Boolean = false): String =
    """{"id":"$id","body":"Ajoute local.properties","isAccepted":$accepted,"helpfulCount":2,"version":1,
       "createdAt":"2026-11-07T08:05:00.000Z","author":{"handle":"$author","displayName":"Kofi","avatarUrl":null,"isDemo":false}}"""

fun questionListJson(ids: List<Int>, nextCursor: String?): String {
    val items = ids.joinToString(",") { i ->
        """{"id":"00000000-0000-4000-8000-${i.toString().padStart(12, '0')}","title":"Question $i","status":"open",
           "urgency":"normal","lang":"fr","tags":[],"answerCount":0,"createdAt":"2026-11-07T08:00:00.000Z",
           "resolvedAt":null,"author":{"handle":"awa-dev","displayName":"Awa","avatarUrl":null,"isDemo":false}}"""
    }
    val cursor = nextCursor?.let { "\"$it\"" } ?: "null"
    return """{"data":[$items],"page":{"nextCursor":$cursor,"hasMore":${nextCursor != null}}}"""
}

const val ROOM_ID = "55555555-5555-4555-8555-555555555555"
const val TASK_ID = "66666666-6666-4666-8666-666666666666"

fun roomJson(role: String? = "owner", joinRequest: String? = null): String {
    val r = role?.let { "\"$it\"" } ?: "null"
    val j = joinRequest?.let { "\"$it\"" } ?: "null"
    return """
    {"id":"$ROOM_ID","code":"abc123","name":"DevHub Mobile","description":"Applications Android et iOS",
     "state":"in_progress","visibility":"public","stack":[{"slug":"kotlin","label":"Kotlin"}],
     "repo":{"fullName":"awa/devhub","url":"https://github.com/awa/devhub","verified":true},"demoUrl":null,
     "deployment":null,"owner":{"handle":"awa-dev","displayName":"Awa","avatarUrl":null,"isDemo":false},
     "memberCount":2,"openTaskCount":1,"createdAt":"2026-11-01T00:00:00.000Z","lastActivityAt":"2026-11-07T00:00:00.000Z",
     "members":[{"user":{"handle":"awa-dev","displayName":"Awa","avatarUrl":null,"isDemo":false},"role":"owner","joinedAt":"2026-11-01T00:00:00.000Z"}],
     "viewer":{"role":$r,"joinRequest":$j}}
    """.trimIndent()
}

fun tasksJson(status: String = "open"): String =
    """{"data":[{"id":"$TASK_ID","roomId":"$ROOM_ID","title":"Écran de connexion","description":null,"level":"easy",
       "status":"$status","assignee":null,"prUrl":null,"verification":null,"fromGithubIssue":false,"version":1,
       "createdAt":"2026-11-02T00:00:00.000Z","takenAt":null,"completedAt":null}]}"""

fun messagesJson(): String =
    """{"data":[
      {"id":"m2","clientId":"c2","roomId":"$ROOM_ID","author":{"handle":"kofi","displayName":"Kofi","avatarUrl":null,"isDemo":false},"kind":"text","body":"Deuxième","createdAt":"2026-11-07T10:01:00.000Z"},
      {"id":"m1","clientId":"c1","roomId":"$ROOM_ID","author":{"handle":"awa-dev","displayName":"Awa","avatarUrl":null,"isDemo":false},"kind":"text","body":"Premier","createdAt":"2026-11-07T10:00:00.000Z"}
    ],"page":{"nextCursor":null,"hasMore":false}}"""

fun roomListJson(): String =
    """{"data":[{"id":"$ROOM_ID","code":"abc123","name":"DevHub Mobile","description":"Applications Android et iOS",
       "state":"in_progress","visibility":"public","stack":[],"repo":null,"demoUrl":null,"deployment":null,
       "owner":{"handle":"awa-dev","displayName":"Awa","avatarUrl":null,"isDemo":false},"memberCount":2,"openTaskCount":1,
       "createdAt":"2026-11-01T00:00:00.000Z","lastActivityAt":"2026-11-07T00:00:00.000Z"}],
       "page":{"nextCursor":null,"hasMore":false}}"""
