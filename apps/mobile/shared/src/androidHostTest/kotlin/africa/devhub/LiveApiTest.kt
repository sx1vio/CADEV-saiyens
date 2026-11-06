package africa.devhub

import africa.devhub.app.AppGraph
import africa.devhub.auth.SignInResult
import africa.devhub.core.AppConfig
import africa.devhub.network.ApiException
import africa.devhub.platform.AuthBrowser
import africa.devhub.testing.FakeSecureStore
import io.ktor.client.HttpClient
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.http.HttpHeaders
import kotlinx.coroutines.test.runTest
import kotlin.random.Random
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNotNull

/**
 * Parcours complet contre une vraie API (faux fournisseur GitHub) : le contrat entre ce client
 * et NestJS, sans simulation. Ignoré sans DEVHUB_E2E_API_URL ; voir apps/mobile/README.md.
 */
class LiveApiTest {
    private val apiUrl: String? = System.getenv("DEVHUB_E2E_API_URL")

    /** Navigateur minimal : suit les redirections et renvoie les cookies, comme Custom Tabs. */
    private class RedirectingBrowser : AuthBrowser {
        private val http = HttpClient { followRedirects = false }
        private val cookies = mutableMapOf<String, String>()

        override suspend fun authenticate(url: String, callbackScheme: String): String? {
            var next = url
            repeat(5) {
                val response = http.get(next) {
                    if (cookies.isNotEmpty()) {
                        header(HttpHeaders.Cookie, cookies.entries.joinToString("; ") { "${it.key}=${it.value}" })
                    }
                }
                response.headers.getAll(HttpHeaders.SetCookie).orEmpty().forEach { line ->
                    val pair = line.substringBefore(';')
                    cookies[pair.substringBefore('=')] = pair.substringAfter('=')
                }
                val location = response.headers[HttpHeaders.Location] ?: return null
                if (location.startsWith("$callbackScheme:")) return location
                next = location
            }
            return null
        }
    }

    @Test
    fun signInAcceptConductAndSignOutAgainstTheRealApi() = runTest {
        val url = apiUrl ?: return@runTest
        val graph = AppGraph(AppConfig(apiBaseUrl = url), FakeSecureStore(), RedirectingBrowser())
        val login = "kmp-e2e-${Random.nextInt(0, Int.MAX_VALUE).toString(36)}"

        assertEquals(SignInResult.SignedIn, graph.auth.signInWithGithub(loginHint = login))
        val me = graph.meApi.me()
        assertEquals(login, me.handle)
        assertEquals(true, me.trust.githubLinked)

        // Écriture : session en Bearer et X-DevHub-Client: mobile, sans origine web.
        assertNotNull(graph.meApi.acceptCodeOfConduct().codeOfConductAcceptedAt)

        graph.auth.signOut()
        val error = assertFailsWith<ApiException> { graph.meApi.me() }
        assertEquals(401, error.status)
    }

    @Test
    fun emailAccountThenPassportAndProofsAgainstTheRealApi() = runTest {
        val url = apiUrl ?: return@runTest
        val graph = AppGraph(AppConfig(apiBaseUrl = url), FakeSecureStore(), RedirectingBrowser())
        val tag = Random.nextInt(0, Int.MAX_VALUE).toString(36)
        val email = "kmp-e2e-$tag@example.test"

        assertEquals(SignInResult.SignedIn, graph.auth.registerWithEmail("Kmp E2e", email, "une phrase assez longue"))
        graph.auth.signOut()
        assertEquals(SignInResult.SignedIn, graph.auth.signInWithEmail(email, "une phrase assez longue"))
        assertEquals(
            SignInResult.Failed("auth.bad_credentials"),
            AppGraph(AppConfig(apiBaseUrl = url), FakeSecureStore(), RedirectingBrowser())
                .auth.signInWithEmail(email, "mauvais mot de passe"),
        )

        val me = graph.meApi.me()
        val passport = graph.passportApi.passport(me.handle)
        assertEquals(me.handle, passport.user.handle)
        assertEquals(false, passport.trust.githubLinked)
        val proofs = graph.passportApi.proofs(me.handle)
        assertEquals(0, proofs.totalXp)
        assertEquals(false, proofs.page.hasMore)
        graph.auth.signOut()
    }
}
