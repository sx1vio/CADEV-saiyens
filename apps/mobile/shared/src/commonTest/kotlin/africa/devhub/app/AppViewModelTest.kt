package africa.devhub.app

import africa.devhub.testing.FakeAuthBrowser
import africa.devhub.testing.FakeSecureStore
import africa.devhub.testing.SESSION_KEY
import africa.devhub.testing.json
import africa.devhub.testing.meJson
import africa.devhub.testing.problem
import africa.devhub.testing.testGraph
import io.ktor.http.HttpMethod
import io.ktor.http.HttpStatusCode
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.first
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

@OptIn(ExperimentalCoroutinesApi::class)
class AppViewModelTest {
    private val main = UnconfinedTestDispatcher()

    @BeforeTest
    fun setUp() = Dispatchers.setMain(main)

    private val created = mutableListOf<AppViewModel>()

    @AfterTest
    fun tearDown() {
        created.forEach { it.viewModelScope.cancel() }
        Dispatchers.resetMain()
    }

    private fun viewModel(graph: AppGraph) =
        AppViewModel(graph.sessions, graph.auth, graph.meApi).also(created::add)

    /** Les requêtes passent par le moteur HTTP, hors du fil principal : on attend l'état stable. */
    private suspend fun AppViewModel.settled(): AppState =
        state.first { it != AppState.Loading && (it as? AppState.SignedOut)?.busy != true &&
            (it as? AppState.NeedsConduct)?.busy != true }

    @Test
    fun withoutSessionShowsSignIn() = runTest {
        val vm = viewModel(testGraph(dispatcher = main) { error("aucune requête attendue") })
        assertEquals(AppState.SignedOut(), vm.state.value)
    }

    @Test
    fun signInThenCodeOfConductThenHome() = runTest {
        var accepted = false
        val graph = testGraph(dispatcher = main, browser = FakeAuthBrowser { "devhub://auth/callback?code=c" }) { request ->
            when (request.url.encodedPath) {
                "/api/v1/auth/mobile/token" ->
                    json("""{"sessionToken":"tok","expiresAt":"2026-12-06T00:00:00.000Z"}""")
                "/api/v1/me" -> json(meJson(codeOfConductAcceptedAt = null))
                "/api/v1/me/code-of-conduct" -> {
                    assertEquals(HttpMethod.Post, request.method)
                    accepted = true
                    json("""{"codeOfConductAcceptedAt":"2026-11-06T10:00:00.000Z"}""")
                }
                else -> error("route inattendue ${request.url}")
            }
        }
        val vm = viewModel(graph)

        vm.signInWithGithub()
        val conduct = assertIs<AppState.NeedsConduct>(vm.settled())
        assertEquals("awa-dev", conduct.me.handle)

        vm.acceptCodeOfConduct()
        val home = assertIs<AppState.SignedIn>(vm.settled())
        assertEquals("2026-11-06T10:00:00.000Z", home.me.codeOfConductAcceptedAt)
        assertEquals(true, accepted)
    }

    @Test
    fun aSuspendedAccountIsExplained() = runTest {
        val graph = testGraph(dispatcher = main, browser = FakeAuthBrowser { "devhub://auth/callback?error=suspended" }) {
            error("aucune requête attendue")
        }
        val vm = viewModel(graph)
        vm.signInWithGithub()
        assertEquals(AppState.SignedOut(error = SignInError.Suspended), vm.settled())
    }

    @Test
    fun keepsTheSessionWhenTheApiIsUnreachable() = runTest {
        val store = FakeSecureStore(mapOf(SESSION_KEY to "tok"))
        var calls = 0
        val graph = testGraph(store, dispatcher = main) {
            calls++
            if (calls == 1) throw IllegalStateException("hors ligne") else json(meJson())
        }
        val vm = viewModel(graph)
        assertEquals(AppState.Unreachable, vm.settled())
        assertEquals("tok", store.values[SESSION_KEY])

        vm.retry()
        assertIs<AppState.SignedIn>(vm.state.first { it is AppState.SignedIn })
    }

    @Test
    fun anExpiredSessionReturnsToSignIn() = runTest {
        val store = FakeSecureStore(mapOf(SESSION_KEY to "expired"))
        val graph = testGraph(store, dispatcher = main) { problem(HttpStatusCode.Unauthorized, "auth.required") }
        val vm = viewModel(graph)
        assertEquals(AppState.SignedOut(), vm.settled())
        assertNull(store.values[SESSION_KEY])
    }

    @Test
    fun signOutReturnsToSignIn() = runTest {
        val store = FakeSecureStore(mapOf(SESSION_KEY to "tok"))
        val graph = testGraph(store, dispatcher = main) { request ->
            if (request.url.encodedPath == "/api/v1/me") json(meJson()) else json("", HttpStatusCode.NoContent)
        }
        val vm = viewModel(graph)
        assertIs<AppState.SignedIn>(vm.settled())
        vm.signOut()
        assertEquals(AppState.SignedOut(), vm.state.first { it is AppState.SignedOut })
    }

    @Test
    fun aWrongPasswordIsExplained() = runTest {
        val graph = testGraph(dispatcher = main) { problem(HttpStatusCode.Unauthorized, "auth.bad_credentials") }
        val vm = viewModel(graph)
        vm.signInWithEmail("awa@example.test", "faux")
        assertEquals(AppState.SignedOut(error = SignInError.BadCredentials), vm.settled())
    }
}
