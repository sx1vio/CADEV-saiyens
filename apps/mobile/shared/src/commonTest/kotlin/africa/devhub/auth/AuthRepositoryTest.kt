package africa.devhub.auth

import africa.devhub.network.CLIENT_HEADER
import africa.devhub.network.MOBILE_CLIENT
import africa.devhub.testing.FakeAuthBrowser
import africa.devhub.testing.FakeSecureStore
import africa.devhub.testing.SESSION_KEY
import africa.devhub.testing.json
import africa.devhub.testing.problem
import africa.devhub.testing.testGraph
import io.ktor.client.request.HttpRequestData
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.Url
import io.ktor.http.content.TextContent
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class AuthRepositoryTest {
    private val requests = mutableListOf<HttpRequestData>()

    @Test
    fun signsInWithPkceAndStoresTheSession() = runTest {
        val store = FakeSecureStore()
        val browser = FakeAuthBrowser { "devhub://auth/callback?code=sealed-code" }
        var verifierSent: String? = null
        val graph = testGraph(store, browser) { request ->
            requests += request
            val body = Json.parseToJsonElement((request.body as TextContent).text).jsonObject
            assertEquals("sealed-code", body["code"]!!.jsonPrimitive.content)
            verifierSent = body["codeVerifier"]!!.jsonPrimitive.content
            json("""{"sessionToken":"tok-1","expiresAt":"2026-12-06T00:00:00.000Z"}""")
        }

        val result = graph.auth.signInWithGithub()

        assertEquals(SignInResult.SignedIn, result)
        val start = Url(browser.opened.single())
        assertEquals("/api/v1/auth/github/mobile", start.encodedPath)
        // Le défi envoyé au navigateur correspond au secret envoyé à l'échange.
        assertEquals(Pkce.challenge(verifierSent!!), start.parameters["challenge"])
        assertEquals("/api/v1/auth/mobile/token", requests.single().url.encodedPath)
        assertEquals(MOBILE_CLIENT, requests.single().headers[CLIENT_HEADER])
        assertEquals("tok-1", store.values[SESSION_KEY])
        assertEquals("tok-1", graph.sessions.current())
    }

    @Test
    fun passesTheDevelopmentLoginHint() = runTest {
        val browser = FakeAuthBrowser { null }
        val graph = testGraph(browser = browser) { error("aucune requête attendue") }
        graph.auth.signInWithGithub(loginHint = "awa-dev")
        assertEquals("awa-dev", Url(browser.opened.single()).parameters["login"])
    }

    @Test
    fun closingTheBrowserCancelsWithoutCallingTheApi() = runTest {
        val graph = testGraph(browser = FakeAuthBrowser { null }) { error("aucune requête attendue") }
        assertEquals(SignInResult.Cancelled, graph.auth.signInWithGithub())
    }

    @Test
    fun reportsTheErrorSentBackByTheApi() = runTest {
        val graph = testGraph(browser = FakeAuthBrowser { "devhub://auth/callback?error=suspended" }) {
            error("aucune requête attendue")
        }
        assertEquals(SignInResult.Failed("suspended"), graph.auth.signInWithGithub())
    }

    @Test
    fun rejectsAForeignReturnAddress() = runTest {
        val graph = testGraph(browser = FakeAuthBrowser { "devhub://elsewhere?code=x" }) {
            error("aucune requête attendue")
        }
        assertEquals(SignInResult.Failed("invalid_state"), graph.auth.signInWithGithub())
    }

    @Test
    fun reportsARefusedCode() = runTest {
        val store = FakeSecureStore()
        val graph = testGraph(store, FakeAuthBrowser { "devhub://auth/callback?code=old" }) {
            problem(HttpStatusCode.Unauthorized, "auth.invalid_code")
        }
        assertEquals(SignInResult.Failed("auth.invalid_code"), graph.auth.signInWithGithub())
        assertTrue(store.values.isEmpty())
    }

    @Test
    fun reportsANetworkFailure() = runTest {
        val graph = testGraph(browser = FakeAuthBrowser { "devhub://auth/callback?code=c" }) {
            throw IllegalStateException("connexion refusée")
        }
        assertEquals(SignInResult.Failed("network"), graph.auth.signInWithGithub())
    }

    @Test
    fun signOutRevokesTheSessionThenForgetsIt() = runTest {
        val store = FakeSecureStore(mapOf(SESSION_KEY to "tok-1"))
        val graph = testGraph(store) { request ->
            requests += request
            json("", HttpStatusCode.NoContent)
        }
        graph.sessions.load()

        graph.auth.signOut()

        val logout = requests.single()
        assertEquals("/api/v1/auth/logout", logout.url.encodedPath)
        assertEquals("Bearer tok-1", logout.headers[HttpHeaders.Authorization])
        assertEquals(MOBILE_CLIENT, logout.headers[CLIENT_HEADER])
        assertNull(graph.sessions.current())
        assertTrue(store.values.isEmpty())
    }

    @Test
    fun signOutForgetsTheSessionEvenOffline() = runTest {
        val store = FakeSecureStore(mapOf(SESSION_KEY to "tok-1"))
        val graph = testGraph(store) { throw IllegalStateException("hors ligne") }
        graph.sessions.load()
        graph.auth.signOut()
        assertNull(graph.sessions.current())
        assertTrue(store.values.isEmpty())
    }
}
