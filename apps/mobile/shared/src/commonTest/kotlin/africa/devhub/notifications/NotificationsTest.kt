package africa.devhub.notifications

import africa.devhub.app.AppGraph
import africa.devhub.sos.QuestionViewModel
import africa.devhub.testing.ROOM_ID
import africa.devhub.testing.json
import africa.devhub.testing.questionJson
import africa.devhub.testing.roomListJson
import africa.devhub.testing.testGraph
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import io.ktor.client.request.HttpRequestData
import io.ktor.http.HttpMethod
import io.ktor.http.content.TextContent
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.awaitCancellation
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.channels.Channel
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

/** Flux simulé : chaque connexion est une liste d'événements, puis la coupure (ou l'attente). */
private class ScriptedStream : EventStream {
    val connections = Channel<List<StreamEvent>?>(Channel.UNLIMITED)
    val lastEventIds = mutableListOf<String?>()

    override suspend fun open(lastEventId: String?, onEvent: suspend (StreamEvent) -> Unit) {
        lastEventIds += lastEventId
        val events = connections.receive() ?: awaitCancellation()
        events.forEach { onEvent(it) }
    }
}

private fun created(seq: Int, type: String = "answer.created", questionId: String = "11111111-1111-4111-8111-111111111111") =
    StreamEvent(
        event = "notification.created",
        data = """{"id":"00000000-0000-4000-8000-00000000000$seq","type":"$type","payload":{"questionId":"$questionId","title":"Gradle","by":"kofi"},"createdAt":"2026-11-07T10:00:00.000Z"}""",
        id = seq.toString(),
    )

@OptIn(ExperimentalCoroutinesApi::class)
class NotificationsTest {
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

    private fun TestScope.settle(ms: Long = 5_000) {
        advanceTimeBy(ms)
        runCurrent()
    }

    private fun TestScope.graph(stream: EventStream, unread: Int = 2): AppGraph =
        testGraph(dispatcher = main, now = { testScheduler.currentTime }, scope = backgroundScope, eventStream = stream) { r ->
            requests += r
            when {
                r.url.encodedPath == "/api/v1/notifications" -> json(
                    """{"data":[{"id":"00000000-0000-4000-8000-000000000009","type":"join.request",
                    "payload":{"roomId":"$ROOM_ID","roomName":"DevHub Mobile","requestId":"r1"},"readAt":null,
                    "createdAt":"2026-11-07T09:00:00.000Z"}],"unreadCount":$unread,"page":{"nextCursor":null,"hasMore":false}}""",
                )
                r.url.encodedPath == "/api/v1/notifications/read" -> json("""{"updated":1}""")
                r.url.encodedPath == "/api/v1/rooms" -> json(roomListJson())
                else -> json(questionJson())
            }
        }

    private fun AppGraph.space() = userSpace("7f1e0c1a-0000-4000-8000-000000000001")

    @Test
    fun liveNotificationsRaiseTheCountAndResumeFromTheLastEvent() = runTest(main) {
        val stream = ScriptedStream()
        val hub = graph(stream).space().notifications
        val received = mutableListOf<NotificationView>()
        backgroundScope.launch { hub.incoming.collect { received += it } }

        stream.connections.send(listOf(created(1), created(2)))
        hub.start()
        runCurrent()
        assertEquals(4, hub.unread.value) // 2 non lues au départ, +2 en direct
        assertEquals(2, received.size)

        // Coupure, puis reprise avec Last-Event-ID : l'API rejoue ce qui a été manqué, et le
        // compteur est relu auprès du serveur, qui fait foi.
        stream.connections.send(null)
        settle()
        assertEquals(listOf(null, "2"), stream.lastEventIds)
        assertEquals(2, hub.unread.value)
        hub.stop()
    }

    @Test
    fun aRevokedSessionStopsTheStream() = runTest(main) {
        val stream = ScriptedStream()
        val hub = graph(stream).space().notifications
        stream.connections.send(listOf(StreamEvent("session.ended", "{}", null)))
        hub.start()
        settle(60_000)
        assertEquals(1, stream.lastEventIds.size)
    }

    @Test
    fun offlineTheStreamWaitsForTheNetwork() = runTest(main) {
        val stream = ScriptedStream()
        val space = graph(stream).space()
        space.connectivity.reportUnreachable()
        space.notifications.start()
        settle()
        assertTrue(stream.lastEventIds.isEmpty())
        space.connectivity.reportReachable()
        settle()
        assertEquals(1, stream.lastEventIds.size)
        space.notifications.stop()
    }

    @Test
    fun openingMarksReadAndLeadsToTheRoom() = runTest(main) {
        val stream = ScriptedStream()
        val graph = graph(stream, unread = 1)
        val space = graph.space()
        val vm = NotificationsViewModel(graph.notificationsApi, space.notifications, graph.roomsApi).tracked()
        settle()
        assertEquals(1, space.notifications.unread.value)

        val target = CompletableDeferred<NotificationTarget?>()
        vm.open(vm.state.value.items.single()) { target.complete(it) }
        settle()

        assertEquals(NotificationTarget.Room("abc123"), target.await())
        assertEquals(0, space.notifications.unread.value)
        val read = requests.single { it.url.encodedPath == "/api/v1/notifications/read" }
        assertTrue("00000000-0000-4000-8000-000000000009" in (read.body as TextContent).text)
    }

    @Test
    fun aLiveAnswerRefreshesTheOpenQuestion() = runTest(main) {
        val stream = ScriptedStream()
        val graph = graph(stream)
        val space = graph.space()
        val vm = QuestionViewModel(graph.sosApi, "11111111-1111-4111-8111-111111111111", space).tracked()
        settle()
        val before = requests.count { it.method == HttpMethod.Get && it.url.encodedPath.startsWith("/api/v1/questions/") }

        stream.connections.send(listOf(created(1)))
        space.notifications.start()
        settle()

        val after = requests.count { it.method == HttpMethod.Get && it.url.encodedPath.startsWith("/api/v1/questions/") }
        assertEquals(before + 1, after)
        assertIs<africa.devhub.sos.QuestionState.Loaded>(vm.state.value)
        space.notifications.stop()
    }

    @Test
    fun aNotificationWithoutTargetOpensNothing() = runTest(main) {
        val vmGraph = graph(ScriptedStream())
        val vm = NotificationsViewModel(vmGraph.notificationsApi, vmGraph.space().notifications, vmGraph.roomsApi).tracked()
        settle()
        val target = CompletableDeferred<NotificationTarget?>()
        vm.open(NotificationView(id = "00000000-0000-4000-8000-00000000000a", type = "message.received", createdAt = "2026-11-07T10:00:00.000Z", readAt = "x")) {
            target.complete(it)
        }
        settle()
        assertNull(target.await())
    }
}
