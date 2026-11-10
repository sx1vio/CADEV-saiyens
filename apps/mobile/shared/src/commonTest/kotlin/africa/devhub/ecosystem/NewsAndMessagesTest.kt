package africa.devhub.ecosystem

import africa.devhub.app.AppGraph
import africa.devhub.messages.ConversationState
import africa.devhub.messages.ConversationViewModel
import africa.devhub.news.NewsViewModel
import africa.devhub.testing.json
import africa.devhub.testing.problem
import africa.devhub.testing.testGraph
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import io.ktor.client.engine.mock.MockRequestHandleScope
import io.ktor.client.engine.mock.respond
import io.ktor.client.request.HttpRequestData
import io.ktor.client.request.HttpResponseData
import io.ktor.http.HttpMethod
import io.ktor.http.HttpStatusCode
import io.ktor.http.content.TextContent
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.cancel
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlin.test.AfterTest
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertTrue

private const val CONV = "88888888-8888-4888-8888-888888888888"

@OptIn(ExperimentalCoroutinesApi::class)
class NewsAndMessagesTest {
    private val main = StandardTestDispatcher()
    private val created = mutableListOf<ViewModel>()
    private val requests = mutableListOf<HttpRequestData>()

    @BeforeTest
    fun setUp() = Dispatchers.setMain(main)

    @AfterTest
    fun tearDown() {
        created.forEach { it.viewModelScope.cancel() }
        Dispatchers.resetMain()
    }

    private fun <T : ViewModel> T.tracked(): T = also(created::add)

    private fun TestScope.settle() {
        advanceTimeBy(5_000)
        runCurrent()
    }

    private fun TestScope.graph(handler: MockRequestHandleScope.(HttpRequestData) -> HttpResponseData): AppGraph =
        testGraph(dispatcher = main, now = { testScheduler.currentTime }, scope = backgroundScope) { r ->
            requests += r
            handler(r)
        }

    private fun AppGraph.space() = userSpace("7f1e0c1a-0000-4000-8000-000000000001")

    private val article = """{"id":"n1","kind":"article","source":"s","sourceName":"Le Monde Informatique","category":"ia","lang":"fr",
        "title":"Un nouveau modèle","summary":"Résumé","url":"https://exemple.org/a","image":null,"author":null,
        "publishedAt":"2026-11-07T08:00:00.000Z","score":0,"comments":0,"extra":{}}"""

    @Test
    fun theNewsHomeFollowsTheLanguageAndSearchIsDebounced() = runTest(main) {
        val graph = graph { r ->
            if (r.url.encodedPath == "/api/v1/news/home") {
                json("""{"hero":[$article],"sections":{"ia":[$article]},"sectionLabels":{"ia":"IA"},"videos":[],"hn":[],"devto":[],"repos":[],"releases":[],"updatedAt":null,"sources":40}""")
            } else {
                json("""{"items":[$article]}""")
            }
        }
        val vm = NewsViewModel(graph.newsApi, graph.space(), lang = "all").tracked()
        settle()
        assertEquals("Un nouveau modèle", vm.state.value.home?.hero?.single()?.title)
        assertEquals("IA", vm.state.value.home?.sectionLabels?.get("ia"))

        vm.setLang("fr")
        settle()
        assertEquals("fr", requests.last { it.url.encodedPath == "/api/v1/news/home" }.url.parameters["lang"])

        vm.setQuery("mo")
        advanceTimeBy(100)
        vm.setQuery("modèle")
        settle()
        val searches = requests.filter { it.url.encodedPath == "/api/v1/news" }
        assertEquals(1, searches.size)
        assertEquals("modèle", searches.single().url.parameters["q"])
        assertEquals(1, vm.state.value.results?.size)
    }

    private val messagesJson = """{"conversation":{"id":"$CONV","peer":{"handle":"kofi","displayName":"Kofi","avatarUrl":null,"country":"GH","active":true},
        "lastMessage":null,"unread":1,"blocked":false,"canWrite":true},
        "data":[{"id":"d1","mine":false,"body":"Salut","createdAt":"2026-11-07T08:00:00.000Z","hidden":false}],"hasMore":false}"""

    @Test
    fun aMessageGoesThroughTheQueueAndTheConversationIsMarkedRead() = runTest(main) {
        val graph = graph { r ->
            when {
                r.method == HttpMethod.Post && r.url.encodedPath.endsWith("/read") -> respond("", HttpStatusCode.NoContent)
                r.method == HttpMethod.Post -> json("""{"id":"d2","mine":true,"body":"Bonjour","createdAt":"2026-11-07T08:01:00.000Z","hidden":false}""", HttpStatusCode.Created)
                else -> json(messagesJson)
            }
        }
        val space = graph.space()
        val vm = ConversationViewModel(graph.messagesApi, space, CONV).tracked()
        settle()
        assertIs<ConversationState.Loaded>(vm.state.value)
        assertTrue(requests.any { it.url.encodedPath == "/api/v1/conversations/$CONV/read" })

        vm.send("Bonjour, ma clé : " + "ghp" + "_" + "d".repeat(36))
        settle()
        val post = requests.single { it.method == HttpMethod.Post && it.url.encodedPath == "/api/v1/conversations/$CONV/messages" }
        val body = Json.parseToJsonElement((post.body as TextContent).text).jsonObject
        assertTrue("ghp_" !in body["body"]!!.jsonPrimitive.content)
        assertTrue(body["clientId"] != null)
        assertTrue("conversationId" !in body)
        assertTrue(space.outbox.actions.value.isEmpty())
        assertEquals(1, (vm.state.value as ConversationState.Loaded).sent)
    }

    @Test
    fun aRefusedMessageIsReportedAndLeavesTheQueue() = runTest(main) {
        val graph = graph { r ->
            when {
                r.method == HttpMethod.Post && r.url.encodedPath.endsWith("/read") -> respond("", HttpStatusCode.NoContent)
                r.method == HttpMethod.Post -> problem(HttpStatusCode.Forbidden, "messaging.blocked")
                else -> json(messagesJson)
            }
        }
        val space = graph.space()
        val vm = ConversationViewModel(graph.messagesApi, space, CONV).tracked()
        settle()
        vm.send("Bonjour")
        settle()
        assertEquals("messaging.blocked", (vm.state.value as ConversationState.Loaded).error)
        assertTrue(space.outbox.actions.value.isEmpty())
    }
}
