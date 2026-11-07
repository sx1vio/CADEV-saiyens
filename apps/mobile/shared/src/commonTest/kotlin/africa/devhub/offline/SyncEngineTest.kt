package africa.devhub.offline

import africa.devhub.testing.json
import africa.devhub.testing.problem
import africa.devhub.testing.testGraph
import io.ktor.client.request.HttpRequestData
import io.ktor.http.HttpStatusCode
import io.ktor.http.content.OutgoingContent
import io.ktor.http.content.TextContent
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.builtins.serializer
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import okio.fakefilesystem.FakeFileSystem
import kotlin.random.Random
import kotlin.test.AfterTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

private class FakeProbe : ConnectivityProbe {
    var listener: (Boolean) -> Unit = {}
    override fun start(onChange: (Boolean) -> Unit) {
        listener = onChange
    }
}

@OptIn(ExperimentalCoroutinesApi::class)
class SyncEngineTest {
    private val dispatcher = StandardTestDispatcher()
    private val fs = FakeFileSystem()
    private val files = LocalFiles(fs, "/user")
    private val requests = mutableListOf<HttpRequestData>()
    private val probe = FakeProbe()
    private var job: Job? = null

    @AfterTest
    fun tearDown() {
        job?.cancel()
        fs.checkNoOpenFiles()
    }

    private fun action(type: String, payload: Map<String, String>, clientId: String? = null, dependsOn: List<String> = emptyList()) =
        OutboxAction(
            opId = "00000000-0000-4000-8000-${(requests.size + payload.hashCode()).toUInt().toString().padStart(12, '0').take(12)}",
            type = type,
            payload = JsonObject(payload.mapValues { JsonPrimitive(it.value) }),
            createdAt = 0,
            clientId = clientId,
            dependsOn = dependsOn,
        )

    private fun TestScope.engine(
        store: OutboxStore,
        handler: suspend (HttpRequestData) -> Pair<String, HttpStatusCode>,
    ): Pair<SyncEngine, Connectivity> {
        val graph = testGraph(dispatcher = dispatcher) { request ->
            requests += request
            val (body, status) = handler(request)
            if (status.value >= 400) problem(status, body) else json(body, status)
        }
        val connectivity = Connectivity(probe)
        val engine = SyncEngine(
            store = store,
            sender = ActionSender(graph.http),
            connectivity = connectivity,
            scope = backgroundScope,
            now = { testScheduler.currentTime },
            random = Random(1),
            settleMs = 0,
        )
        job = engine.start()
        return engine to connectivity
    }

    private fun body(request: HttpRequestData) =
        Json.parseToJsonElement(((request.body as? TextContent)?.text) ?: "{}").jsonObject

    @Test
    fun aSingleActionGoesToItsEndpointWithItsOpIdAsKey() = runTest(dispatcher) {
        val store = OutboxStore(files)
        val (engine, _) = engine(store) { """{"id":"srv-q1","secretsMasked":0}""" to HttpStatusCode.Created }
        val create = action("question.create", mapOf("clientId" to "c-q1", "title" to "Titre assez long"), clientId = "c-q1")
        store.enqueue(create)
        engine.kick()
        runCurrent()

        val sent = requests.single()
        assertEquals("/api/v1/questions", sent.url.encodedPath)
        assertEquals(create.opId, sent.headers["Idempotency-Key"])
        assertTrue(store.actions.value.isEmpty())
        assertEquals("srv-q1", store.resolved("c-q1"))
    }

    @Test
    fun aDependentActionUsesTheServerIdOnceKnown() = runTest(dispatcher) {
        val store = OutboxStore(files)
        store.markResolved("c-q1", "srv-q1")
        val (engine, _) = engine(store) { """{"id":"srv-a1"}""" to HttpStatusCode.Created }
        store.enqueue(action("answer.create", mapOf("questionId" to "client:c-q1", "clientId" to "c-a1", "body" to "Réponse"), "c-a1", listOf("c-q1")))
        engine.kick()
        runCurrent()
        assertEquals("/api/v1/questions/srv-q1/answers", requests.single().url.encodedPath)
        assertFalse("questionId" in body(requests.single()))
    }

    @Test
    fun manyActionsOrALocalReferenceGoInOneSyncBatch() = runTest(dispatcher) {
        val store = OutboxStore(files)
        val (engine, _) = engine(store) { r ->
            val ops = body(r)["actions"]!!.jsonArray.map { it.jsonObject["opId"]!!.jsonPrimitive.content }
            val results = ops.mapIndexed { i, op ->
                if (i == 0) """{"opId":"$op","status":"applied","httpStatus":201,"data":{"id":"srv-q1"}}"""
                else """{"opId":"$op","status":"applied","httpStatus":201,"data":{"id":"srv-a$i"}}"""
            }
            """{"results":[${results.joinToString(",")}],"serverTime":"2026-11-07T10:00:00.000Z"}""" to HttpStatusCode.OK
        }
        store.enqueue(action("question.create", mapOf("clientId" to "c-q1", "title" to "Titre assez long"), clientId = "c-q1"))
        store.enqueue(action("answer.create", mapOf("questionId" to "client:c-q1", "clientId" to "c-a1", "body" to "R"), "c-a1", listOf("c-q1")))
        engine.kick()
        runCurrent()

        val batch = requests.single()
        assertEquals("/api/v1/sync", batch.url.encodedPath)
        val sentRef = body(batch)["actions"]!!.jsonArray[1].jsonObject["payload"]!!.jsonObject["questionId"]!!.jsonPrimitive.content
        assertEquals("client:c-q1", sentRef)
        assertTrue(store.actions.value.isEmpty())
        assertEquals("srv-q1", store.resolved("c-q1"))
    }

    @Test
    fun offlineNothingLeavesThenTheReturnOfTheNetworkSends() = runTest(dispatcher) {
        val store = OutboxStore(files)
        val (engine, connectivity) = engine(store) { """{"answerId":"a","helpfulCount":1,"counted":true}""" to HttpStatusCode.OK }
        probe.listener(false)
        store.enqueue(action("answer.vote", mapOf("answerId" to "srv-a1")))
        engine.kick()
        runCurrent()
        assertTrue(requests.isEmpty())
        assertFalse(connectivity.online.value)

        probe.listener(true)
        runCurrent()
        assertEquals(1, requests.size)
        assertTrue(store.actions.value.isEmpty())
    }

    @Test
    fun anUnreachableServerIsRetriedLater() = runTest(dispatcher) {
        val store = OutboxStore(files)
        var down = true
        val (engine, connectivity) = engine(store) {
            if (down) throw IllegalStateException("portail captif") else """{"answerId":"a","helpfulCount":1,"counted":true}""" to HttpStatusCode.OK
        }
        store.enqueue(action("answer.vote", mapOf("answerId" to "srv-a1")))
        engine.kick()
        runCurrent()
        assertFalse(connectivity.online.value)
        assertEquals("network", store.actions.value.single().lastError)

        // Repli exponentiel : la prochaine tentative part au plus tard dans quelques secondes.
        down = false
        advanceTimeBy(5_000)
        runCurrent()
        assertTrue(store.actions.value.isEmpty())
        assertTrue(connectivity.online.value)
    }

    @Test
    fun aRefusalBlocksOnlyItsDependentsAndCancelDropsThem() = runTest(dispatcher) {
        val store = OutboxStore(files)
        val create = action("question.create", mapOf("clientId" to "c-q1", "title" to "court"), clientId = "c-q1")
        val dependent = action("question.claim", mapOf("questionId" to "client:c-q1"), dependsOn = listOf("c-q1"))
        val other = action("answer.vote", mapOf("answerId" to "srv-a9"))
        // Réponse de l'API pour ce lot : création refusée, dépendante ignorée (424), l'autre faite.
        val (engine, _) = engine(store) {
            """{"results":[
              {"opId":"${create.opId}","status":"rejected","httpStatus":400,"error":{"code":"validation.failed","title":"t","status":400}},
              {"opId":"${dependent.opId}","status":"skipped","httpStatus":424,"error":{"code":"sync.dependency_failed","title":"t","status":424}},
              {"opId":"${other.opId}","status":"applied","httpStatus":200,"data":{"answerId":"srv-a9","helpfulCount":1,"counted":true}}
            ],"serverTime":"2026-11-07T10:00:00.000Z"}""" to HttpStatusCode.OK
        }
        store.enqueue(create)
        store.enqueue(dependent)
        store.enqueue(other)
        engine.kick()
        runCurrent()

        assertEquals("/api/v1/sync", requests.single().url.encodedPath)
        val left = store.actions.value
        assertEquals(ActionStatus.Failed, left.first { it.opId == create.opId }.status)
        assertEquals("validation.failed", left.first { it.opId == create.opId }.lastError)
        // La dépendante attend : sa création a échoué, elle n'est plus envoyée.
        assertEquals(ActionStatus.Pending, left.first { it.opId == dependent.opId }.status)
        assertFalse(left.any { it.opId == other.opId })
        advanceTimeBy(120_000)
        runCurrent()
        assertEquals(1, requests.size)

        engine.cancel(create.opId)
        assertTrue(store.actions.value.isEmpty())
    }

    @Test
    fun aTransientErrorBacksOffThenSucceeds() = runTest(dispatcher) {
        val store = OutboxStore(files)
        var calls = 0
        val (engine, _) = engine(store) {
            calls++
            if (calls == 1) "internal" to HttpStatusCode.ServiceUnavailable
            else """{"answerId":"a","helpfulCount":1,"counted":true}""" to HttpStatusCode.OK
        }
        store.enqueue(action("answer.vote", mapOf("answerId" to "srv-a1")))
        engine.kick()
        runCurrent()
        val waiting = store.actions.value.single()
        assertEquals(1, waiting.attempts)
        assertTrue(waiting.nextAttemptAt in 800L..1_200L)

        advanceTimeBy(1_500)
        runCurrent()
        assertTrue(store.actions.value.isEmpty())
        assertEquals(2, calls)
    }

    @Test
    fun theQueueSurvivesARestart() = runTest(dispatcher) {
        val store = OutboxStore(files)
        store.enqueue(action("answer.vote", mapOf("answerId" to "srv-a1")))
        store.markResolved("c-q1", "srv-q1")
        val reopened = OutboxStore(files)
        assertEquals(1, reopened.actions.value.size)
        assertEquals("srv-q1", reopened.resolved("c-q1"))
    }

    @Test
    fun theReadCacheEvictsTheOldestButKeepsMine() {
        var clock = 0L
        val cache = ReadCache(files, now = { clock++ }, maxEvictable = 2)
        val s = String.serializer()
        cache.put(CacheKey.me(), "moi", s)
        cache.put(CacheKey.question("1"), "q1", s)
        cache.put(CacheKey.question("2"), "q2", s)
        cache.get(CacheKey.question("1"), s)
        cache.put(CacheKey.question("3"), "q3", s)

        assertEquals("moi", cache.get(CacheKey.me(), s)?.value)
        assertEquals("q1", cache.get(CacheKey.question("1"), s)?.value)
        assertEquals(null, cache.get(CacheKey.question("2"), s))
        assertEquals("q3", cache.get(CacheKey.question("3"), s)?.value)
    }
}
