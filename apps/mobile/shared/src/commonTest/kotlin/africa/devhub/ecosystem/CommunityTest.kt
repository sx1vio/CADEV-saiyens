package africa.devhub.ecosystem

import africa.devhub.app.AppGraph
import africa.devhub.community.CreatePostViewModel
import africa.devhub.community.FeedViewModel
import africa.devhub.community.PostState
import africa.devhub.community.PostViewModel
import africa.devhub.testing.json
import africa.devhub.testing.problem
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
import kotlin.test.assertIs
import kotlin.test.assertTrue

private const val POST = "99999999-9999-4999-8999-999999999999"

@OptIn(ExperimentalCoroutinesApi::class)
class CommunityTest {
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

    private fun TestScope.graph(handler: MockRequestHandleScope.(HttpRequestData) -> HttpResponseData): AppGraph =
        testGraph(dispatcher = main, now = { testScheduler.currentTime }, scope = backgroundScope) { r ->
            requests += r
            handler(r)
        }

    private fun AppGraph.space() = userSpace("7f1e0c1a-0000-4000-8000-000000000001")

    private fun body(r: HttpRequestData) = Json.parseToJsonElement((r.body as TextContent).text).jsonObject

    private val author = """{"handle":"kofi","displayName":"Kofi","avatarUrl":null,"isDemo":false}"""
    private fun post(score: Int = 3, myVote: Int = 0) = """{"id":"$POST","community":"web","kind":"question","title":"Compose ou SwiftUI ?",
        "body":"Avis ?","linkUrl":null,"code":null,"tags":[],"author":$author,"score":$score,"myVote":$myVote,"comments":1,
        "mine":false,"createdAt":"2026-11-07T08:00:00.000Z","commentList":[{"id":"c1","parentId":null,"body":"Compose","author":$author,"mine":false,"createdAt":"2026-11-07T08:05:00.000Z"}]}"""

    @Test
    fun theFeedFiltersByCommunityAndSort() = runTest(main) {
        val graph = graph { json("""{"data":[${post().substringBefore(",\"commentList\"")}}],"page":{"nextCursor":null,"hasMore":false}}""") }
        val vm = FeedViewModel(graph.communityApi, graph.space()).tracked()
        settle()
        assertEquals(1, vm.state.value.items.size)
        vm.setCommunity("mobile")
        settle()
        vm.setTop(true)
        settle()
        val q = requests.last().url.parameters
        assertEquals("mobile", q["community"])
        assertEquals("top", q["sort"])
    }

    @Test
    fun votingTwiceRemovesTheVoteAndCommentsAreMasked() = runTest(main) {
        var myVote = 0
        val graph = graph { r ->
            when {
                r.method == HttpMethod.Put -> {
                    myVote = body(r)["value"]!!.jsonPrimitive.content.toInt()
                    json("""{"score":${3 + myVote},"myVote":$myVote}""")
                }
                r.method == HttpMethod.Post -> json("""{"id":"c2"}""", HttpStatusCode.Created)
                else -> json(post(3 + myVote, myVote))
            }
        }
        val vm = PostViewModel(graph.communityApi, POST, graph.space()).tracked()
        settle()
        vm.vote(1)
        settle()
        assertEquals(1, (vm.state.value as PostState.Loaded).post.myVote)
        vm.vote(1)
        settle()
        val votes = requests.filter { it.method == HttpMethod.Put }.map { body(it)["value"]!!.jsonPrimitive.content }
        assertEquals(listOf("1", "0"), votes)
        assertEquals(0, (vm.state.value as PostState.Loaded).post.myVote)

        vm.comment("Mon jeton : " + "ghp" + "_" + "e".repeat(36))
        settle()
        val comment = requests.single { it.method == HttpMethod.Post }
        assertTrue("ghp_" !in body(comment)["body"]!!.jsonPrimitive.content)
        val loaded = assertIs<PostState.Loaded>(vm.state.value)
        assertEquals(1, loaded.commented)
        assertEquals(1, loaded.secretsMasked)
    }

    @Test
    fun communityWritesNeedTheNetwork() = runTest(main) {
        val graph = graph { json(post()) }
        val space = graph.space()
        val vm = PostViewModel(graph.communityApi, POST, space).tracked()
        settle()
        space.connectivity.reportUnreachable()
        vm.vote(1)
        assertEquals("offline", (vm.state.value as PostState.Loaded).error)
        assertTrue(requests.none { it.method != HttpMethod.Get })
    }

    @Test
    fun publishingReportsTheApiLimits() = runTest(main) {
        var calls = 0
        val graph = graph {
            calls++
            if (calls == 1) problem(HttpStatusCode.TooManyRequests, "post.daily_limit") else json("""{"id":"$POST"}""", HttpStatusCode.Created)
        }
        val vm = CreatePostViewModel(graph.communityApi, graph.space()).tracked()
        vm.edit { it.copy(title = "Court") }
        assertEquals(false, vm.state.value.draft.canSend)
        vm.edit { it.copy(title = "Compose ou SwiftUI pour iOS ?", community = "mobile", kind = "question") }
        vm.send()
        settle()
        assertEquals("post.daily_limit", vm.state.value.error)
        vm.send()
        settle()
        assertEquals(POST, vm.state.value.createdId)
        val sent = body(requests.last())
        assertEquals("mobile", sent["community"]!!.jsonPrimitive.content)
        assertEquals("question", sent["kind"]!!.jsonPrimitive.content)
    }
}
