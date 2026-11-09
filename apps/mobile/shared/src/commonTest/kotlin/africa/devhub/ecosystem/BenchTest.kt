package africa.devhub.ecosystem

import africa.devhub.app.AppGraph
import africa.devhub.bench.BenchFinding
import africa.devhub.bench.BenchListViewModel
import africa.devhub.bench.BenchState
import africa.devhub.bench.BenchViewModel
import africa.devhub.bench.CreateBenchViewModel
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
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlin.test.AfterTest
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertNull
import kotlin.test.assertTrue

private const val BENCH = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"

@OptIn(ExperimentalCoroutinesApi::class)
class BenchTest {
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

    private fun TestScope.settle(ms: Long = 10_000) {
        advanceTimeBy(ms)
        runCurrent()
    }

    private fun TestScope.graph(handler: MockRequestHandleScope.(HttpRequestData) -> HttpResponseData): AppGraph =
        testGraph(dispatcher = main, now = { testScheduler.currentTime }, scope = backgroundScope) { r ->
            requests += r
            handler(r)
        }

    private fun AppGraph.space() = userSpace("7f1e0c1a-0000-4000-8000-000000000001")

    private fun body(r: HttpRequestData) = Json.parseToJsonElement((r.body as TextContent).text).jsonObject

    private val author = """{"handle":"kofi","displayName":"Kofi","avatarUrl":null,"isDemo":false}"""
    private fun detail(mine: Boolean = false, reported: Boolean = false, reports: String = "[]") =
        """{"id":"$BENCH","title":"Tester DevHub en 3G","appUrl":"https://devhub.africa","repoUrl":null,"devices":["android_low"],
        "networks":["3g","offline"],"maxTesters":5,"testers":0,"status":"open","author":$author,"mine":$mine,"reported":$reported,
        "createdAt":"2026-11-09T08:00:00.000Z","instructions":"Poser une question hors ligne puis revenir en ligne.","coverage":[],"reports":$reports}"""

    @Test
    fun theListUsesTheScopeAndFilters() = runTest(main) {
        val graph = graph { json("""{"data":[],"stats":{"open":3,"reports":7,"confirmed":4}}""") }
        val vm = BenchListViewModel(graph.benchApi, graph.space()).tracked()
        settle()
        assertEquals(7, vm.state.value.stats.reports)
        vm.setScope("tested")
        settle()
        vm.setNetwork("2g")
        settle()
        val q = requests.last().url.parameters
        assertEquals("tested", q["scope"])
        assertEquals("2g", q["network"])
    }

    @Test
    fun aReportWrittenOfflineWaitsMaskedInTheQueue() = runTest(main) {
        var offline = false
        val graph = graph { r -> if (offline && r.method == HttpMethod.Post) throw IllegalStateException("hors ligne") else json(detail()) }
        val space = graph.space()
        val vm = BenchViewModel(graph.benchApi, BENCH, space).tracked()
        settle()
        val loaded = assertIs<BenchState.Loaded>(vm.state.value)
        assertEquals("android_low", loaded.draft.device) // prérempli avec ce qui est demandé
        offline = true

        vm.edit {
            it.copy(
                model = "Tecno Spark 10", os = "Android 13", browser = "Chrome 120", network = "offline", verdict = "issues",
                findings = listOf(BenchFinding("major", "La file ne repart pas", "Clé : " + "AKIA" + "IOSFODNN7" + "EXAMPLE")),
            )
        }
        vm.submitReport()
        settle()

        val queued = space.outbox.actions.value.single()
        assertEquals("bench.report", queued.type)
        assertTrue("AKIA" !in queued.payload.toString())
        val state = assertIs<BenchState.Loaded>(vm.state.value)
        assertTrue(state.reportPending || state.queued)
        assertEquals(false, state.canReport)
    }

    @Test
    fun alreadyReportedIsNotAnErrorAndLeavesTheQueue() = runTest(main) {
        val graph = graph { r -> if (r.method == HttpMethod.Post) problem(HttpStatusCode.Conflict, "bench.already_reported") else json(detail()) }
        val space = graph.space()
        val vm = BenchViewModel(graph.benchApi, BENCH, space).tracked()
        settle()
        vm.edit { it.copy(model = "Tecno Spark 10", os = "Android 13", browser = "Chrome 120") }
        vm.submitReport()
        settle()
        assertEquals("/api/v1/bench/$BENCH/reports", requests.single { it.method == HttpMethod.Post }.url.encodedPath)
        assertNull((vm.state.value as BenchState.Loaded).error)
        assertTrue(space.outbox.actions.value.isEmpty())
    }

    @Test
    fun theRequesterConfirmsAReportOnline() = runTest(main) {
        val report = """[{"id":"r1","tester":$author,"device":"android_low","model":"Tecno","os":"Android 13","browser":"Chrome",
            "network":"3g","country":"SN","verdict":"works","findings":[],"notes":"","status":"submitted","points":0,"createdAt":"2026-11-09T09:00:00.000Z"}]"""
        val graph = graph { r -> if (r.method == HttpMethod.Post) json("""{"status":"confirmed","points":5,"withheld":[]}""") else json(detail(mine = true, reports = report)) }
        val space = graph.space()
        val vm = BenchViewModel(graph.benchApi, BENCH, space).tracked()
        settle()
        assertEquals(false, (vm.state.value as BenchState.Loaded).canReport)
        vm.review("r1", confirm = true)
        settle()
        val post = requests.single { it.method == HttpMethod.Post }
        assertEquals("/api/v1/bench/reports/r1/review", post.url.encodedPath)
        assertEquals("confirm", body(post)["decision"]!!.jsonPrimitive.content)

        space.connectivity.reportUnreachable()
        vm.close()
        assertEquals("offline", (vm.state.value as BenchState.Loaded).error)
    }

    @Test
    fun aTestRequestNeedsValidFieldsAndTheNetwork() = runTest(main) {
        val graph = graph { json("""{"id":"$BENCH"}""", HttpStatusCode.Created) }
        val space = graph.space()
        val vm = CreateBenchViewModel(graph.benchApi, space).tracked()
        vm.edit { it.copy(title = "Tester DevHub en 3G", appUrl = "http://pas-https.example", instructions = "Poser une question hors ligne puis revenir.") }
        assertEquals(false, vm.state.value.draft.valid)
        vm.edit { it.copy(appUrl = "https://devhub.africa") }
        vm.send()
        settle()
        assertEquals(BENCH, vm.state.value.createdId)
        val sent = body(requests.single())
        assertEquals("android_low", sent["devices"].toString().trim('[', ']', '"'))
    }
}
