package africa.devhub.passport

import africa.devhub.testing.json
import africa.devhub.testing.passportJson
import africa.devhub.testing.problem
import africa.devhub.testing.proofsJson
import africa.devhub.testing.testGraph
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import io.ktor.client.engine.mock.respond
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpMethod
import io.ktor.http.HttpStatusCode
import io.ktor.http.headersOf
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

@OptIn(ExperimentalCoroutinesApi::class)
private const val CERTIFICATES = """{"items":[{"certId":"git-bases","code":"DH-AB12","bestScore":90,"passedAt":"2026-11-01T10:00:00.000Z"}]}"""

class PassportViewModelTest {
    private val main = UnconfinedTestDispatcher()
    private val created = mutableListOf<ViewModel>()

    @BeforeTest
    fun setUp() = Dispatchers.setMain(main)

    @AfterTest
    fun tearDown() {
        created.forEach { it.viewModelScope.cancel() }
        Dispatchers.resetMain()
    }

    private fun <T : ViewModel> T.tracked(): T = also(created::add)

    @Test
    fun loadsThePassport() = runTest {
        val paths = mutableListOf<String>()
        val graph = testGraph(dispatcher = main) { request ->
            paths += request.url.encodedPath
            when {
                request.url.encodedPath.endsWith("/certificates") -> json(CERTIFICATES)
                request.url.encodedPath.endsWith("/proofs") -> json(proofsJson(emptyList(), null))
                request.url.encodedPath.endsWith("/github") -> problem(HttpStatusCode.NotFound, "not_found")
                else -> json(passportJson())
            }
        }
        val vm = PassportViewModel(graph.passportApi, "awa-dev").tracked()
        val loaded = assertIs<PassportState.Loaded>(vm.state.value)
        // Le profil et les badges d'abord ; la bannière et le bloc GitHub se chargent ensuite.
        assertEquals(listOf("/api/v1/u/awa-dev", "/api/v1/u/awa-dev/certificates"), paths.take(2))
        assertEquals(setOf("/api/v1/u/awa-dev/proofs", "/api/v1/users/awa-dev/github"), paths.drop(2).toSet())
        assertEquals(null, loaded.github)
        assertEquals("DH-AB12", loaded.certs.single().code)
        assertEquals(42, loaded.passport.stats?.totalXp)
        assertEquals(35, loaded.passport.skills.single().githubSignal)
        assertEquals(true, loaded.passport.user.availability?.mission)
    }

    @Test
    fun theProfileStillLoadsWhenTheCertificatesCannotBeRead() = runTest {
        val graph = testGraph(dispatcher = main) { request ->
            if (request.url.encodedPath.endsWith("/certificates")) problem(HttpStatusCode.InternalServerError, "server_error")
            else json(passportJson())
        }
        val loaded = assertIs<PassportState.Loaded>(PassportViewModel(graph.passportApi, "awa-dev").tracked().state.value)
        assertEquals(42, loaded.passport.stats?.totalXp)
        assertEquals(emptyList(), loaded.certs)
    }

    @Test
    fun anUnknownHandleIsNotFound() = runTest {
        val graph = testGraph(dispatcher = main) { problem(HttpStatusCode.NotFound, "not_found") }
        assertEquals(PassportState.NotFound, PassportViewModel(graph.passportApi, "nobody").tracked().state.value)
    }

    @Test
    fun aRefreshTooSoonReportsTheWaitAndReloads() = runTest {
        var loads = 0
        val graph = testGraph(dispatcher = main) { request ->
            if (request.method == HttpMethod.Post) {
                respond(
                    """{"code":"rate_limited","title":"t"}""",
                    HttpStatusCode.TooManyRequests,
                    headersOf(
                        HttpHeaders.ContentType to listOf("application/problem+json"),
                        HttpHeaders.RetryAfter to listOf("90"),
                    ),
                )
            } else if (request.url.encodedPath.endsWith("/certificates")) {
                json(CERTIFICATES)
            } else if (request.url.encodedPath.endsWith("/proofs")) {
                json(proofsJson(emptyList(), null))
            } else if (request.url.encodedPath.endsWith("/github")) {
                problem(HttpStatusCode.NotFound, "not_found")
            } else {
                loads++
                json(passportJson(totalXp = 40 + loads))
            }
        }
        val vm = PassportViewModel(graph.passportApi, "awa-dev").tracked()

        vm.refreshGithub()

        val loaded = assertIs<PassportState.Loaded>(vm.state.value)
        assertEquals(RefreshState.TooSoon(retryAfterMinutes = 2), loaded.refresh)
        assertEquals(2, loads)
        assertEquals(42, loaded.passport.stats?.totalXp)
    }

    @Test
    fun aRevokedGithubAccessIsExplained() = runTest {
        val graph = testGraph(dispatcher = main) { request ->
            if (request.method == HttpMethod.Post) problem(HttpStatusCode.UnprocessableEntity, "github.token_revoked")
            else json(passportJson())
        }
        val vm = PassportViewModel(graph.passportApi, "awa-dev").tracked()
        vm.refreshGithub()
        assertEquals(RefreshState.TokenRevoked, assertIs<PassportState.Loaded>(vm.state.value).refresh)
    }

    @Test
    fun proofsArePagedThenStop() = runTest {
        val cursors = mutableListOf<String?>()
        val graph = testGraph(dispatcher = main) { request ->
            val cursor = request.url.parameters["cursor"]
            cursors += cursor
            json(if (cursor == null) proofsJson(listOf(1, 2), nextCursor = "c2") else proofsJson(listOf(3), nextCursor = null))
        }
        val vm = ProofsViewModel(graph.passportApi, "awa-dev").tracked()
        assertEquals(2, vm.state.value.events.size)
        assertEquals(true, vm.state.value.hasMore)

        vm.loadMore()
        vm.loadMore() // plus rien à charger : aucune requête de plus

        assertEquals(listOf(null, "c2"), cursors)
        assertEquals(3, vm.state.value.events.size)
        assertEquals(false, vm.state.value.hasMore)
    }

    @Test
    fun aFailedPageCanBeRetried() = runTest {
        var calls = 0
        val graph = testGraph(dispatcher = main) {
            calls++
            if (calls == 1) throw IllegalStateException("hors ligne") else json(proofsJson(listOf(1), nextCursor = null))
        }
        val vm = ProofsViewModel(graph.passportApi, "awa-dev").tracked()
        assertEquals(true, vm.state.value.failed)
        vm.loadMore()
        assertEquals(1, vm.state.value.events.size)
        assertEquals(false, vm.state.value.failed)
    }
}
