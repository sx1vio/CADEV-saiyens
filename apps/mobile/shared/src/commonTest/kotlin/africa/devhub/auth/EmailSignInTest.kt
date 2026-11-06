package africa.devhub.auth

import africa.devhub.testing.FakeSecureStore
import africa.devhub.testing.SESSION_KEY
import africa.devhub.testing.json
import africa.devhub.testing.problem
import africa.devhub.testing.testGraph
import io.ktor.http.HttpStatusCode
import io.ktor.http.content.TextContent
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class EmailSignInTest {
    private val token = """{"sessionToken":"tok-mail","expiresAt":"2026-12-06T00:00:00.000Z"}"""

    @Test
    fun signsInWithEmailAndKeepsTheSession() = runTest {
        val store = FakeSecureStore()
        var path = ""
        var body = ""
        val graph = testGraph(store) { request ->
            path = request.url.encodedPath
            body = (request.body as TextContent).text
            json(token)
        }

        assertEquals(SignInResult.SignedIn, graph.auth.signInWithEmail(" awa@example.test ", "secret-1"))

        assertEquals("/api/v1/auth/email/login/mobile", path)
        val sent = Json.parseToJsonElement(body).jsonObject
        assertEquals("awa@example.test", sent["email"]!!.jsonPrimitive.content)
        assertEquals("secret-1", sent["password"]!!.jsonPrimitive.content)
        assertEquals("tok-mail", store.values[SESSION_KEY])
    }

    @Test
    fun registersWithEmail() = runTest {
        var path = ""
        val graph = testGraph { request ->
            path = request.url.encodedPath
            json(token, HttpStatusCode.Created)
        }
        assertEquals(SignInResult.SignedIn, graph.auth.registerWithEmail("Awa", "awa@example.test", "phrase longue"))
        assertEquals("/api/v1/auth/email/register/mobile", path)
    }

    @Test
    fun keepsTheApiErrorCode() = runTest {
        val store = FakeSecureStore()
        val graph = testGraph(store) { problem(HttpStatusCode.Unauthorized, "auth.bad_credentials") }
        assertEquals(
            SignInResult.Failed("auth.bad_credentials"),
            graph.auth.signInWithEmail("awa@example.test", "faux"),
        )
        assertTrue(store.values.isEmpty())
    }
}
