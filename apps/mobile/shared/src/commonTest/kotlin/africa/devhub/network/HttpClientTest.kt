package africa.devhub.network

import africa.devhub.testing.FakeSecureStore
import africa.devhub.testing.SESSION_KEY
import africa.devhub.testing.meJson
import africa.devhub.testing.json
import africa.devhub.testing.problem
import africa.devhub.testing.testGraph
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull

class HttpClientTest {
    @Test
    fun sendsTheSessionAsBearerAndIgnoresUnknownFields() = runTest {
        var auth: String? = null
        val graph = testGraph(FakeSecureStore(mapOf(SESSION_KEY to "tok-1"))) { request ->
            auth = request.headers[HttpHeaders.Authorization]
            json(meJson())
        }
        graph.sessions.load()
        assertEquals("awa-dev", graph.meApi.me().handle)
        assertEquals("Bearer tok-1", auth)
    }

    @Test
    fun aRefusedSessionIsForgotten() = runTest {
        val store = FakeSecureStore(mapOf(SESSION_KEY to "revoked"))
        val graph = testGraph(store) { problem(HttpStatusCode.Unauthorized, "auth.required") }
        graph.sessions.load()

        val error = assertFailsWith<ApiException> { graph.meApi.me() }

        assertEquals(401, error.status)
        assertEquals("auth.required", error.code)
        assertNull(graph.sessions.current())
        assertNull(store.values[SESSION_KEY])
    }

    @Test
    fun transportFailuresBecomeNetworkExceptions() = runTest {
        val graph = testGraph { throw IllegalStateException("hors ligne") }
        assertFailsWith<NetworkException> { graph.meApi.me() }
    }
}
