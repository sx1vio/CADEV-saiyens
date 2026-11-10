package africa.devhub.rooms

import africa.devhub.testing.json
import africa.devhub.testing.passportJson
import africa.devhub.testing.problem
import africa.devhub.testing.testGraph
import androidx.lifecycle.viewModelScope
import io.ktor.http.HttpMethod
import io.ktor.http.HttpStatusCode
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.cancel
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import kotlin.test.AfterTest
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertNull
import kotlin.test.assertTrue

@OptIn(ExperimentalCoroutinesApi::class)
class FeedbackViewModelTest {
    private val main = UnconfinedTestDispatcher()
    private val created = mutableListOf<FeedbackViewModel>()

    @BeforeTest
    fun setUp() = Dispatchers.setMain(main)

    @AfterTest
    fun tearDown() {
        created.forEach { it.viewModelScope.cancel() }
        Dispatchers.resetMain()
    }

    private fun request(id: String, requester: String, status: String = "open") = """
        {"id":"$id","kind":"code_review","status":"$status","url":"https://github.com/o/r/pull/1","note":"Les erreurs de paiement",
         "room":{"id":"r1","code":"abc","name":"Mobile Money Kit"},"stack":[{"slug":"kotlin","label":"Kotlin"}],
         "requester":{"handle":"$requester","displayName":"$requester"},"reviewer":null,
         "createdAt":"2026-11-08T10:00:00.000Z","confirmedAt":null}
    """.trimIndent()

    private fun list(vararg items: String) = """{"data":[${items.joinToString(",")}],"page":{"hasMore":false,"nextCursor":null}}"""

    @Test
    fun loadsOpenRequestsAndKnowsWhichAreMine() = runTest {
        val graph = testGraph(dispatcher = main) { request ->
            if (request.url.encodedPath.endsWith("/feedback-requests")) json(list(request("a", "kofi"), request("b", "awa-dev")))
            else json(passportJson())
        }
        val vm = FeedbackViewModel(graph.roomsApi, graph.passportApi, "awa-dev").also(created::add)
        val items = vm.state.value.items
        assertEquals(listOf("a", "b"), items.map { it.id })
        assertEquals(listOf(false, true), items.map(vm::isMine))
    }

    @Test
    fun takingARequestAlreadyTakenIsExplainedAndTheFeedReloads() = runTest {
        var loads = 0
        val graph = testGraph(dispatcher = main) { request ->
            when {
                request.method == HttpMethod.Post -> problem(HttpStatusCode.Conflict, "feedback.already_taken")
                request.url.encodedPath.endsWith("/feedback-requests") -> { loads++; json(list(request("a", "kofi"))) }
                else -> json(passportJson())
            }
        }
        val vm = FeedbackViewModel(graph.roomsApi, graph.passportApi, "awa-dev").also(created::add)

        vm.take("a")

        assertEquals(FeedbackNotice.Error("feedback.already_taken"), vm.state.value.notice)
        assertNull(vm.state.value.busyId)
        assertEquals(2, loads) // le flux est relu : la demande a peut-être changé
    }

    @Test
    fun confirmingReportsThePointsAndDismissClearsTheNotice() = runTest {
        val graph = testGraph(dispatcher = main) { request ->
            when {
                request.method == HttpMethod.Post ->
                    json("""{"request":${request("a", "awa-dev", "done")},"points":8,"withheld":[]}""")
                request.url.encodedPath.endsWith("/feedback-requests") -> json(list(request("a", "awa-dev", "in_progress")))
                else -> json(passportJson())
            }
        }
        val vm = FeedbackViewModel(graph.roomsApi, graph.passportApi, "awa-dev").also(created::add)

        vm.confirm("a")
        assertEquals(FeedbackNotice.Confirmed(8), assertIs<FeedbackNotice.Confirmed>(vm.state.value.notice))

        vm.dismissNotice()
        assertTrue(vm.state.value.notice == null)
    }
}
