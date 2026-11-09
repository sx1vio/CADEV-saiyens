package africa.devhub.ecosystem

import africa.devhub.app.AppGraph
import africa.devhub.jobs.ApplicationsViewModel
import africa.devhub.jobs.JobFilters
import africa.devhub.jobs.JobState
import africa.devhub.jobs.JobViewModel
import africa.devhub.jobs.JobsViewModel
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
import kotlin.test.AfterTest
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertNull
import kotlin.test.assertTrue

private const val JOB = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"

@OptIn(ExperimentalCoroutinesApi::class)
class JobsTest {
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

    private fun job(id: String = JOB, applyUrl: String? = null, contract: String = "cdi", mode: String = "remote", title: String = "Développeur Kotlin", tag: String = "kotlin") =
        """{"id":"$id","title":"$title","company":"Wave","companyUrl":null,"location":"Dakar","country":"SN","workMode":"$mode",
        "contract":"$contract","seniority":"senior","salary":null,"description":"${"Poste ouvert. ".repeat(4)}",
        "applyUrl":${applyUrl?.let { "\"$it\"" } ?: "null"},"sourceUrl":"https://wave.com/jobs/1","companyRef":null,"tags":["$tag"],
        "expiresAt":null,"publishedAt":"2026-11-08T08:00:00.000Z"}"""

    private val none = """{"data":[]}"""

    @Test
    fun filtersApplyOnTheReceivedOffers() = runTest(main) {
        val graph = graph {
            json("""{"data":[${job()},${job(id = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", contract = "stage", mode = "onsite", title = "Stage React", tag = "react")}]}""")
        }
        val vm = JobsViewModel(graph.jobsApi, graph.space()).tracked()
        settle()
        assertEquals(2, vm.state.value.items.size)
        vm.setFilters(JobFilters(contract = "stage"))
        assertEquals("Stage React", vm.state.value.items.single().title)
        vm.setFilters(JobFilters(text = "kotlin"))
        assertEquals("Développeur Kotlin", vm.state.value.items.single().title)
        assertEquals(1, requests.size) // filtrer ne relance pas de requête
    }

    @Test
    fun applyingSendsAMaskedMessageThenShowsTheApplication() = runTest(main) {
        var applied = false
        val graph = graph { r ->
            when {
                r.method == HttpMethod.Post -> {
                    applied = true
                    respond("", HttpStatusCode.NoContent)
                }
                r.url.encodedPath == "/api/v1/me/applications" -> json(
                    if (!applied) none else """{"data":[{"id":"app1","status":"submitted","message":"m","createdAt":"2026-11-09T08:00:00.000Z",
                    "updatedAt":"2026-11-09T08:00:00.000Z","job":{"id":"$JOB","title":"Développeur Kotlin","company":"Wave","location":"Dakar"}}]}""",
                )
                else -> json(job())
            }
        }
        val vm = JobViewModel(graph.jobsApi, JOB, graph.space()).tracked()
        settle()
        vm.apply("trop court")
        settle()
        assertTrue(requests.none { it.method == HttpMethod.Post })

        vm.apply("J'ai livré trois applications Kotlin en production. Clé : " + "AKIA" + "IOSFODNN7" + "EXAMPLE")
        settle()
        val post = requests.single { it.method == HttpMethod.Post }
        assertEquals("/api/v1/jobs/$JOB/apply", post.url.encodedPath)
        assertTrue("AKIA" !in (post.body as TextContent).text)
        val loaded = assertIs<JobState.Loaded>(vm.state.value)
        assertEquals("submitted", loaded.application?.status)
        assertNull(loaded.error)
    }

    @Test
    fun alreadyAppliedIsNotAnError() = runTest(main) {
        val graph = graph { r ->
            when {
                r.method == HttpMethod.Post -> problem(HttpStatusCode.Conflict, "application.exists")
                r.url.encodedPath == "/api/v1/me/applications" -> json(none)
                else -> json(job())
            }
        }
        val vm = JobViewModel(graph.jobsApi, JOB, graph.space()).tracked()
        settle()
        vm.apply("J'ai livré trois applications Kotlin en production et j'aime ça.")
        settle()
        assertNull((vm.state.value as JobState.Loaded).error)
    }

    @Test
    fun anExternalOfferIsNeverAppliedToOnDevHubAndOfflineIsExplained() = runTest(main) {
        val graph = graph { r -> if (r.url.encodedPath == "/api/v1/me/applications") json(none) else json(job(applyUrl = "https://wave.com/apply")) }
        val space = graph.space()
        val vm = JobViewModel(graph.jobsApi, JOB, space).tracked()
        settle()
        vm.apply("J'ai livré trois applications Kotlin en production et j'aime ça.")
        settle()
        assertTrue(requests.none { it.method == HttpMethod.Post })

        val internal = graph { r -> if (r.url.encodedPath == "/api/v1/me/applications") json(none) else json(job()) }
        val offlineSpace = internal.space()
        val vm2 = JobViewModel(internal.jobsApi, JOB, offlineSpace).tracked()
        settle()
        offlineSpace.connectivity.reportUnreachable()
        vm2.apply("J'ai livré trois applications Kotlin en production et j'aime ça.")
        assertEquals("offline", (vm2.state.value as JobState.Loaded).error)
    }

    @Test
    fun withdrawingMarksTheApplication() = runTest(main) {
        val graph = graph { r ->
            if (r.method == HttpMethod.Delete) respond("", HttpStatusCode.NoContent)
            else json("""{"data":[{"id":"app1","status":"seen","message":"m","createdAt":"2026-11-09T08:00:00.000Z","updatedAt":"2026-11-09T08:00:00.000Z",
                "job":{"id":"$JOB","title":"Développeur Kotlin","company":"Wave","location":"Dakar"}}]}""")
        }
        val vm = ApplicationsViewModel(graph.jobsApi, graph.space()).tracked()
        settle()
        vm.withdraw("app1")
        settle()
        assertEquals("/api/v1/me/applications/app1", requests.single { it.method == HttpMethod.Delete }.url.encodedPath)
        assertEquals("withdrawn", vm.state.value.items.single().status)
    }
}
