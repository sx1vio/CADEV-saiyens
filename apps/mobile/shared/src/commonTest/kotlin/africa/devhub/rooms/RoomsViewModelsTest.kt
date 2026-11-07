package africa.devhub.rooms

import africa.devhub.app.AppGraph
import africa.devhub.testing.ROOM_ID
import africa.devhub.testing.TASK_ID
import africa.devhub.testing.json
import africa.devhub.testing.messagesJson
import africa.devhub.testing.problem
import africa.devhub.testing.roomJson
import africa.devhub.testing.roomListJson
import africa.devhub.testing.tasksJson
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
import kotlin.test.assertFalse
import kotlin.test.assertIs
import kotlin.test.assertTrue

@OptIn(ExperimentalCoroutinesApi::class)
class RoomsViewModelsTest {
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

    private fun TestScope.graph(handler: suspend MockRequestHandleScope.(HttpRequestData) -> HttpResponseData): AppGraph =
        testGraph(dispatcher = main, now = { testScheduler.currentTime }, scope = backgroundScope) { request ->
            requests += request
            handler(request)
        }

    private fun AppGraph.space() = userSpace("7f1e0c1a-0000-4000-8000-000000000001")

    private fun body(r: HttpRequestData) = Json.parseToJsonElement((r.body as TextContent).text).jsonObject

    /** API d'une salle : lecture, plus [write] pour les écritures. */
    private fun MockRequestHandleScope.roomApi(
        request: HttpRequestData,
        role: String? = "owner",
        write: MockRequestHandleScope.(HttpRequestData) -> HttpResponseData = { json("""{"id":"x"}""") },
    ): HttpResponseData = when {
        request.method == HttpMethod.Post -> write(request)
        request.url.encodedPath == "/api/v1/rooms/abc123" -> json(roomJson(role))
        request.url.encodedPath.endsWith("/tasks") -> json(tasksJson())
        request.url.encodedPath.endsWith("/messages") -> json(messagesJson())
        request.url.encodedPath.endsWith("/join-requests") -> json(
            """{"data":[{"id":"77777777-7777-4777-8777-777777777777","roomId":"$ROOM_ID","user":{"handle":"kofi","displayName":"Kofi","avatarUrl":null,"isDemo":false},
            "message":"Je connais Compose","status":"pending","createdAt":"2026-11-07T09:00:00.000Z","decidedAt":null}]}""",
        )
        else -> json("""{"data":[],"page":{"nextCursor":null,"hasMore":false}}""")
    }

    @Test
    fun loadsTheRoomTasksChatOldestFirstAndRequests() = runTest(main) {
        val graph = graph { roomApi(it) }
        val vm = RoomViewModel(graph.roomsApi, "abc123", graph.space()).tracked()
        settle()
        val loaded = assertIs<RoomState.Loaded>(vm.state.value)
        assertEquals("DevHub Mobile", loaded.room.name)
        assertEquals(1, loaded.tasks.size)
        assertEquals(listOf("Premier", "Deuxième"), loaded.messages.map { it.body })
        assertEquals(1, loaded.joinRequests.size)
        assertTrue(loaded.canManage)
    }

    @Test
    fun aVisitorDoesNotLoadTheChatAndCanAskToJoin() = runTest(main) {
        val graph = graph { roomApi(it, role = null, write = { r -> json("""{"id":"j1","roomId":"$ROOM_ID","status":"pending"}""", HttpStatusCode.Created) }) }
        val vm = RoomViewModel(graph.roomsApi, "abc123", graph.space()).tracked()
        settle()
        val visitor = assertIs<RoomState.Loaded>(vm.state.value)
        assertFalse(visitor.isMember)
        assertTrue(visitor.messages.isEmpty())
        assertFalse(requests.any { it.url.encodedPath.endsWith("/messages") })

        vm.join("Je connais Compose")
        settle()
        val join = requests.single { it.method == HttpMethod.Post }
        assertEquals("/api/v1/rooms/$ROOM_ID/join", join.url.encodedPath)
        assertEquals("Je connais Compose", body(join)["message"]!!.jsonPrimitive.content)
        assertEquals(RoomNotice.JoinSent, (vm.state.value as RoomState.Loaded).notice)
    }

    @Test
    fun takingATaskAlreadyTakenIsExplainedAndLeavesTheQueue() = runTest(main) {
        val graph = graph { roomApi(it, role = "member", write = { problem(HttpStatusCode.Conflict, "task.already_taken") }) }
        val space = graph.space()
        val vm = RoomViewModel(graph.roomsApi, "abc123", space).tracked()
        settle()

        vm.takeTask(TASK_ID)
        settle()
        val take = requests.single { it.method == HttpMethod.Post }
        assertEquals("/api/v1/tasks/$TASK_ID/take", take.url.encodedPath)
        assertTrue(take.headers["Idempotency-Key"] != null)
        assertEquals(RoomNotice.Failed("task.already_taken"), (vm.state.value as RoomState.Loaded).notice)
        assertTrue(space.outbox.actions.value.isEmpty())
    }

    @Test
    fun offlineAMessageWaitsMaskedInTheQueue() = runTest(main) {
        var offline = false
        val graph = graph { r -> if (offline && r.method == HttpMethod.Post) throw IllegalStateException("hors ligne") else roomApi(r) }
        val space = graph.space()
        val vm = RoomViewModel(graph.roomsApi, "abc123", space).tracked()
        settle()
        offline = true

        vm.postMessage("Clé : " + "AKIA" + "IOSFODNN7" + "EXAMPLE")
        advanceTimeBy(9_000)
        runCurrent()

        val queued = space.outbox.actions.value.single()
        assertEquals("room_message.create", queued.type)
        assertTrue("AKIA" !in queued.payload["body"].toString())
        val loaded = assertIs<RoomState.Loaded>(vm.state.value)
        assertEquals(1, loaded.pendingMessages.size)
        assertEquals(1, loaded.messagesPosted)
        assertEquals(RoomNotice.SecretsMasked(1), loaded.notice)
    }

    @Test
    fun theCreatorAcceptsARequestAndClosesATaskWithItsPr() = runTest(main) {
        val graph = graph { roomApi(it) }
        val vm = RoomViewModel(graph.roomsApi, "abc123", graph.space()).tracked()
        settle()

        vm.decide("77777777-7777-4777-8777-777777777777", accept = true)
        settle()
        vm.completeTask(TASK_ID, "https://github.com/awa/devhub/pull/12")
        settle()
        vm.completeTask(TASK_ID, "https://evil.example/pull/1") // refusé avant même la file

        val posts = requests.filter { it.method == HttpMethod.Post }
        assertEquals(listOf("/api/v1/join-requests/77777777-7777-4777-8777-777777777777/decide", "/api/v1/tasks/$TASK_ID/complete"), posts.map { it.url.encodedPath })
        assertEquals("accept", body(posts[0])["decision"]!!.jsonPrimitive.content)
        assertEquals("https://github.com/awa/devhub/pull/12", body(posts[1])["prUrl"]!!.jsonPrimitive.content)
        assertFalse("requestId" in body(posts[0]))
    }

    @Test
    fun roomsListUsesTheMineFilterAndFallsBackToTheCopy() = runTest(main) {
        var down = false
        val graph = graph { r ->
            if (down) throw IllegalStateException("hors ligne")
            json(roomListJson())
        }
        val space = graph.space()
        val vm = RoomsViewModel(graph.roomsApi, space).tracked()
        settle()
        vm.setMine(true)
        settle()
        assertEquals("true", requests.last().url.parameters["mine"])
        assertEquals(1, vm.state.value.items.size)

        down = true
        vm.reload()
        settle()
        assertEquals(1, vm.state.value.items.size)
        assertTrue(vm.state.value.cachedAt != null)
    }

    @Test
    fun creatingARoomNeedsTheNetworkAndValidFields() = runTest(main) {
        val graph = graph { r ->
            when (r.url.encodedPath) {
                "/api/v1/tags" -> json("""{"data":[{"slug":"kotlin","label":"Kotlin","aliases":[]}]}""")
                else -> problem(HttpStatusCode.UnprocessableEntity, "room.repo_not_found")
            }
        }
        val space = graph.space()
        val vm = CreateRoomViewModel(graph.roomsApi, graph.sosApi, space).tracked()
        settle()
        vm.edit { it.copy(name = "DevHub Mobile", description = "Applications Android et iOS", repoFullName = "pas un dépôt") }
        vm.toggleTag("kotlin")
        assertFalse(vm.state.value.canSend)
        vm.edit { it.copy(repoFullName = "awa/inexistant") }
        assertTrue(vm.state.value.canSend)

        vm.send()
        settle()
        assertEquals("room.repo_not_found", vm.state.value.error)
        val sent = body(requests.last { it.method == HttpMethod.Post })
        assertEquals("awa/inexistant", sent["repoFullName"]!!.jsonPrimitive.content)

        space.connectivity.reportUnreachable()
        vm.send()
        assertEquals("offline", vm.state.value.error)
    }
}
