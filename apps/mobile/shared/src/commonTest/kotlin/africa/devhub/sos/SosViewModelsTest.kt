package africa.devhub.sos

import africa.devhub.testing.answerJson
import africa.devhub.testing.json
import africa.devhub.testing.problem
import africa.devhub.testing.questionJson
import africa.devhub.testing.questionListJson
import africa.devhub.testing.testGraph
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import io.ktor.client.request.HttpRequestData
import io.ktor.http.HttpMethod
import io.ktor.http.HttpStatusCode
import io.ktor.http.content.TextContent
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.cancel
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
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
import kotlin.test.assertNotEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

/** Tout tourne sur un seul dispatcher de test : le temps virtuel pilote l'anti-rebond et le sondage. */
@OptIn(ExperimentalCoroutinesApi::class)
class SosViewModelsTest {
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

    private fun body(request: HttpRequestData) = Json.parseToJsonElement((request.body as TextContent).text).jsonObject

    private fun TestScope.graph(handler: suspend (HttpRequestData) -> String) =
        testGraph(dispatcher = main) { request ->
            requests += request
            json(handler(request))
        }

    @Test
    fun filtersSearchAndPages() = runTest(main) {
        val graph = graph { r -> questionListJson(listOf(1, 2), nextCursor = if (r.url.parameters["cursor"] == null) "c2" else null) }
        val vm = QuestionsViewModel(graph.sosApi).tracked()
        advanceUntilIdle()
        assertEquals(2, vm.state.value.items.size)

        vm.setFilter(QuestionFilter.Unanswered)
        advanceUntilIdle()
        assertEquals("true", requests.last().url.parameters["unanswered"])
        assertEquals("waiting", requests.last().url.parameters["sort"])

        vm.loadMore()
        advanceUntilIdle()
        assertEquals("c2", requests.last().url.parameters["cursor"])
        assertEquals(4, vm.state.value.items.size)
        assertEquals(false, vm.state.value.hasMore)

        // Anti-rebond : une seule requête pour une frappe rapide.
        val before = requests.size
        vm.setQuery("gr")
        advanceTimeBy(100)
        vm.setQuery("gradle")
        advanceUntilIdle()
        assertEquals(before + 1, requests.size)
        assertEquals("gradle", requests.last().url.parameters["q"])
    }

    @Test
    fun pollsThePendingAiHintUntilItArrives() = runTest(main) {
        var reads = 0
        val graph = graph { reads++; questionJson(aiStatus = if (reads < 3) "pending" else "done") }
        val vm = QuestionViewModel(graph.sosApi, "11111111-1111-4111-8111-111111111111", pollIntervalMs = 1_000).tracked()
        advanceUntilIdle()
        val loaded = assertIs<QuestionState.Loaded>(vm.state.value)
        assertEquals("done", loaded.question.aiStatus)
        assertEquals("Définis sdk.dir", loaded.question.aiHint)
        assertEquals(3, reads)
    }

    @Test
    fun anAnswerRetriedAfterAFailureKeepsItsKeys() = runTest(main) {
        var posts = 0
        val graph = testGraph(dispatcher = main) { request ->
            requests += request
            if (request.method == HttpMethod.Post) {
                posts++
                if (posts == 1) throw IllegalStateException("coupure")
                json("""{"id":"22222222-2222-4222-8222-222222222222","secretsMasked":1}""", HttpStatusCode.Created)
            } else {
                json(questionJson())
            }
        }
        val vm = QuestionViewModel(graph.sosApi, "11111111-1111-4111-8111-111111111111").tracked()
        advanceUntilIdle()

        vm.postAnswer("Ajoute local.properties")
        advanceUntilIdle()
        assertEquals(SosNotice.Failed("network"), (vm.state.value as QuestionState.Loaded).notice)
        vm.postAnswer("Ajoute local.properties")
        advanceUntilIdle()
        vm.postAnswer("Une deuxième réponse")
        advanceUntilIdle()

        val sent = requests.filter { it.method == HttpMethod.Post }
        assertEquals(3, sent.size)
        assertEquals(sent[0].headers["Idempotency-Key"], sent[1].headers["Idempotency-Key"])
        assertEquals(body(sent[0])["clientId"], body(sent[1])["clientId"])
        assertNotEquals(sent[1].headers["Idempotency-Key"], sent[2].headers["Idempotency-Key"])
        val loaded = assertIs<QuestionState.Loaded>(vm.state.value)
        assertEquals(SosNotice.SecretsMasked(1), loaded.notice)
        assertEquals(2, loaded.answersPosted)
        assertTrue(sent.all { it.url.encodedPath == "/api/v1/questions/11111111-1111-4111-8111-111111111111/answers" })
    }

    @Test
    fun votingTwiceIsReportedAndAcceptRefreshes() = runTest(main) {
        val answerId = "33333333-3333-4333-8333-333333333333"
        var accepted = false
        val graph = graph { r ->
            when (r.url.encodedPath) {
                "/api/v1/answers/$answerId/vote" -> """{"answerId":"$answerId","helpfulCount":2,"counted":false,"xp":{"granted":[],"withheld":[]}}"""
                "/api/v1/answers/$answerId/accept" -> {
                    accepted = true
                    """{"questionId":"q","answerId":"$answerId","status":"resolved","resolvedAt":"2026-11-07T09:00:00.000Z","xp":{"granted":[],"withheld":[]}}"""
                }
                else -> questionJson(status = if (accepted) "resolved" else "open", answers = "[${answerJson(answerId, accepted = accepted)}]")
            }
        }
        val vm = QuestionViewModel(graph.sosApi, "11111111-1111-4111-8111-111111111111").tracked()
        advanceUntilIdle()

        vm.vote(answerId)
        advanceUntilIdle()
        assertEquals(SosNotice.AlreadyVoted, (vm.state.value as QuestionState.Loaded).notice)

        vm.accept(answerId)
        advanceUntilIdle()
        val loaded = assertIs<QuestionState.Loaded>(vm.state.value)
        assertEquals(SosNotice.Accepted, loaded.notice)
        assertEquals("resolved", loaded.question.status)
        assertTrue(loaded.question.answers.single().isAccepted)
        assertTrue(requests.filter { it.method == HttpMethod.Post }.all { it.headers["Idempotency-Key"] != null })
    }

    @Test
    fun anUnknownQuestionIsNotFound() = runTest(main) {
        val graph = testGraph(dispatcher = main) { problem(HttpStatusCode.NotFound, "not_found") }
        val vm = QuestionViewModel(graph.sosApi, "11111111-1111-4111-8111-111111111111").tracked()
        advanceUntilIdle()
        assertEquals(QuestionState.NotFound, vm.state.value)
    }

    @Test
    fun askValidatesThenPublishes() = runTest(main) {
        var asks = 0
        val graph = testGraph(dispatcher = main) { request ->
            requests += request
            when (request.url.encodedPath) {
                "/api/v1/tags" -> json("""{"data":[{"slug":"kotlin","label":"Kotlin","aliases":["kt"]}]}""")
                else -> {
                    asks++
                    if (asks == 1) problem(HttpStatusCode.TooManyRequests, "rate_limited")
                    else json("""{"id":"44444444-4444-4444-8444-444444444444","clientId":"x","status":"open","aiStatus":"pending",
                        "version":1,"createdAt":"2026-11-07T08:00:00.000Z","secretsMasked":0,
                        "author":{"handle":"awa-dev","displayName":"Awa","avatarUrl":null,"isDemo":false}}""", HttpStatusCode.Created)
                }
            }
        }
        val vm = AskViewModel(graph.sosApi, uiLang = "fr").tracked()
        advanceUntilIdle()
        assertEquals(1, vm.state.value.tags.size)

        vm.edit { it.copy(title = "Trop court", body = "Détails") }
        assertEquals(false, vm.state.value.canSend)
        vm.edit { it.copy(title = "Gradle ne trouve pas le SDK Android", reproUrl = "https://abc.csb.app") }
        vm.toggleTag("kotlin")
        assertEquals(false, vm.state.value.reproValid)
        vm.edit { it.copy(reproUrl = "") }
        assertTrue(vm.state.value.canSend)

        vm.send()
        advanceUntilIdle()
        assertEquals("rate_limited", vm.state.value.error)
        vm.send()
        advanceUntilIdle()
        assertEquals("44444444-4444-4444-8444-444444444444", vm.state.value.created?.id)

        val posts = requests.filter { it.method == HttpMethod.Post }
        assertEquals(posts[0].headers["Idempotency-Key"], posts[1].headers["Idempotency-Key"])
        val sent = body(posts[1])
        assertEquals("fr", sent["lang"]!!.jsonPrimitive.content)
        assertEquals("kotlin", sent["tagSlugs"].toString().trim('[', ']', '"'))
        assertNull(sent["reproUrl"]?.jsonPrimitive?.content)

        vm.consumeCreated()
        assertEquals("", vm.state.value.draft.title)
    }
}
