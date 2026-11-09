package africa.devhub.ecosystem

import africa.devhub.app.AppGraph
import africa.devhub.certs.CertsViewModel
import africa.devhub.certs.ExamState
import africa.devhub.certs.ExamViewModel
import africa.devhub.certs.PracticeViewModel
import africa.devhub.testing.json
import africa.devhub.testing.problem
import africa.devhub.testing.testGraph
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import io.ktor.client.engine.mock.MockRequestHandleScope
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
import kotlin.test.AfterTest
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertTrue

private const val ATTEMPT = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"

@OptIn(ExperimentalCoroutinesApi::class)
class CertsTest {
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

    private fun TestScope.settle(ms: Long = 2_000) {
        advanceTimeBy(ms)
        runCurrent()
    }

    private fun TestScope.graph(handler: MockRequestHandleScope.(HttpRequestData) -> HttpResponseData): AppGraph =
        testGraph(dispatcher = main, now = { testScheduler.currentTime }, scope = backgroundScope) { r ->
            requests += r
            handler(r)
        }

    private fun question(id: String) = """{"id":"$id","q":"Que fait git rebase ?","code":null,"choices":["A","B","C"],"topic":1}"""

    private val result = """{"attemptId":"$ATTEMPT","certId":"git-fondamentaux","mode":"exam","score":50,"good":1,"total":2,"passed":false,
        "late":false,"topics":[{"topic":1,"ok":1,"total":2}],"corrections":[],"certificate":null,"nextAttemptAt":"2026-11-10T00:00:00.000Z"}"""

    @Test
    fun practiceIsCorrectedQuestionByQuestion() = runTest(main) {
        val graph = graph { r ->
            if (r.method == HttpMethod.Post) json("""{"correct":false,"answer":2,"explain":"rebase réécrit l'historique"}""")
            else json("""{"questions":[${question("q1")},${question("q2")}]}""")
        }
        val vm = PracticeViewModel(graph.certsApi, "git-fondamentaux").tracked()
        settle()
        assertEquals(2, vm.state.value.questions.size)
        vm.answer(0)
        settle()
        assertEquals(2, vm.state.value.result?.answer)
        assertTrue((requests.last().body as TextContent).text.contains("\"choice\":0"))
        vm.answer(1) // déjà corrigée : ignorée
        settle()
        assertEquals(1, requests.count { it.method == HttpMethod.Post })
        vm.next()
        vm.next()
        assertTrue(vm.state.value.finished)
    }

    @Test
    fun theExamSubmitsByItselfWhenTimeRunsOutWithBlankAnswersAsNull() = runTest(main) {
        val graph = graph { r ->
            if (r.url.encodedPath.endsWith("/submit")) json(result)
            else json("""{"id":"$ATTEMPT","certId":"git-fondamentaux","mode":"exam","deadline":"1970-01-01T00:00:10.000Z","resumed":false,
                "questions":[${question("q1")},${question("q2")}]}""")
        }
        val vm = ExamViewModel(graph.certsApi, "git-fondamentaux", "exam", now = { testScheduler.currentTime }).tracked()
        runCurrent()
        val running = assertIs<ExamState.Running>(vm.state.value)
        assertEquals(10, running.remainingSeconds)
        vm.choose(1)
        settle(11_000)

        val submit = requests.single { it.url.encodedPath == "/api/v1/certifications/attempts/$ATTEMPT/submit" }
        assertEquals("""{"answers":[1,null]}""", (submit.body as TextContent).text)
        val done = assertIs<ExamState.Done>(vm.state.value)
        assertEquals(50, done.result.score)
    }

    @Test
    fun aRecentFailureMakesTheExamWait() = runTest(main) {
        val graph = graph { problem(HttpStatusCode.TooManyRequests, "cert.retry_later") }
        val vm = ExamViewModel(graph.certsApi, "git-fondamentaux", "exam", now = { 0L }).tracked()
        settle()
        assertEquals(ExamState.Failed("cert.retry_later"), vm.state.value)
    }

    @Test
    fun myProgressIsIndexedByCertification() = runTest(main) {
        val graph = graph {
            json("""{"items":[{"certId":"git-fondamentaux","certificate":{"code":"GIT-ABC","bestScore":90,"passedAt":"2026-11-01T00:00:00.000Z"},
                "lastAttempt":null,"nextAttemptAt":null,"active":null}]}""")
        }
        val vm = CertsViewModel(graph.certsApi, graph.userSpace("7f1e0c1a-0000-4000-8000-000000000001")).tracked()
        settle()
        assertEquals("GIT-ABC", vm.state.value.mine["git-fondamentaux"]?.certificate?.code)
    }
}
