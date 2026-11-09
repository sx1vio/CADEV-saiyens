package africa.devhub.news

import africa.devhub.testing.json
import africa.devhub.testing.problem
import africa.devhub.testing.testGraph
import androidx.lifecycle.viewModelScope
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
import kotlin.test.assertNull
import kotlin.time.Duration.Companion.seconds
import kotlin.time.TestTimeSource

@OptIn(ExperimentalCoroutinesApi::class)
class LiveBoardViewModelTest {
    private val main = UnconfinedTestDispatcher()
    private val created = mutableListOf<LiveBoardViewModel>()

    @BeforeTest
    fun setUp() = Dispatchers.setMain(main)

    @AfterTest
    fun tearDown() {
        created.forEach { it.viewModelScope.cancel() }
        Dispatchers.resetMain()
    }

    private fun job(id: String, title: String) = """
        {"id":"$id","kind":"job","sourceName":"Himalayas","title":"$title","url":"https://himalayas.app/jobs/$id",
         "publishedAt":"2026-11-06T16:51:29.000Z","author":"Rayyan Systems",
         "extra":{"jobType":"Full Time","location":"Benin","salary":null}}
    """.trimIndent()

    @Test
    fun jobsCarryTheirCompanyAndDetails() = runTest {
        val graph = testGraph(dispatcher = main) { json("""{"items":[${job("a", "Front End Engineer")}]}""") }
        val item = LiveBoardViewModel(graph.newsApi, "job").also(created::add).state.value.items.single()
        assertEquals("Rayyan Systems", item.author)
        assertEquals("Full Time", item.extraText("jobType"))
        assertEquals("Benin", item.extraText("location"))
        assertNull(item.extraText("salary")) // null côté API : pas de puce vide
    }

    @Test
    fun refreshReplacesTheListQuietlyOnceItIsStale() = runTest {
        var calls = 0
        val graph = testGraph(dispatcher = main) {
            calls++
            json("""{"items":[${job("a$calls", "Offre $calls")}]}""")
        }
        val clock = TestTimeSource()
        val vm = LiveBoardViewModel(graph.newsApi, "job", clock).also(created::add)
        assertEquals("Offre 1", vm.state.value.items.single().title)

        vm.refresh() // la liste vient d'être lue : aucune requête de plus
        assertEquals(1, calls)

        clock += 31.seconds
        vm.refresh()
        assertEquals(2, calls)
        assertEquals("Offre 2", vm.state.value.items.single().title)
        assertEquals(false, vm.state.value.loading) // relecture silencieuse : pas de spinner
    }

    @Test
    fun aFailedRefreshKeepsWhatIsDisplayed() = runTest {
        var calls = 0
        val graph = testGraph(dispatcher = main) {
            if (++calls == 1) json("""{"items":[${job("a", "Offre")}]}""") else problem(HttpStatusCode.InternalServerError, "server_error")
        }
        val clock = TestTimeSource()
        val vm = LiveBoardViewModel(graph.newsApi, "job", clock).also(created::add)

        clock += 60.seconds
        vm.refresh()

        assertEquals(2, calls)
        assertEquals(listOf("Offre"), vm.state.value.items.map { it.title })
        assertEquals(false, vm.state.value.failed)
    }
}
