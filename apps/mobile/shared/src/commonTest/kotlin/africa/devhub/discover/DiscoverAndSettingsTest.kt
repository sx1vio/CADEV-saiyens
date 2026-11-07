package africa.devhub.discover

import africa.devhub.app.AppGraph
import africa.devhub.me.Me
import africa.devhub.network.DevHubJson
import africa.devhub.settings.SettingsViewModel
import africa.devhub.testing.json
import africa.devhub.testing.meJson
import africa.devhub.testing.passportJson
import africa.devhub.testing.testGraph
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import io.ktor.client.engine.mock.MockRequestHandleScope
import io.ktor.client.engine.mock.respond
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
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlin.test.AfterTest
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

@OptIn(ExperimentalCoroutinesApi::class)
class DiscoverAndSettingsTest {
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

    private val devsJson = """{"data":[{"handle":"kofi","displayName":"Kofi","avatarUrl":null,"country":"GH","timezone":null,
        "lookingFor":null,"isDemo":false,"totalXp":120,"availableNow":true,"availableForMission":false,
        "topSkills":[{"slug":"kotlin","label":"Kotlin","score":70}],"canHelp":[]}],"page":{"nextCursor":null,"hasMore":false}}"""

    private val countriesJson = """{"scope":"country","method":"Somme du journal XP","countries":[
        {"country":"SN","totalXp":500,"devs":12,"rank":1},{"country":"CI","totalXp":300,"devs":8,"rank":2}],"devs":[]}"""

    @Test
    fun filtersAndLeaderboardHitTheRightQueries() = runTest(main) {
        val graph = graph { r ->
            when (r.url.encodedPath) {
                "/api/v1/discover/devs" -> json(devsJson)
                else -> json(if (r.url.parameters["scope"] == "devs") """{"scope":"devs","method":"m","countries":[],"devs":[
                    {"handle":"awa","displayName":"Awa","country":"SN","totalXp":200,"rank":1,"isDemo":false}]}""" else countriesJson)
            }
        }
        val vm = DiscoverViewModel(graph.discoverApi, graph.space()).tracked()
        settle()
        assertEquals(1, vm.devs.value.items.size)
        assertEquals(2, vm.board.value.board?.countries?.size)
        assertEquals("Somme du journal XP", vm.board.value.board?.method)

        vm.setFilters(DevFilters(tag = "Kotlin", country = "gh", mission = true))
        settle()
        val q = requests.last { it.url.encodedPath == "/api/v1/discover/devs" }.url.parameters
        assertEquals("kotlin", q["tag"])
        assertEquals("GH", q["country"])
        assertEquals("true", q["mission"])
        assertNull(q["available"])

        vm.openCountry("SN")
        settle()
        val board = requests.last { it.url.encodedPath == "/api/v1/leaderboard" }.url.parameters
        assertEquals("devs", board["scope"])
        assertEquals("SN", board["country"])
        assertEquals("awa", vm.board.value.board?.devs?.single()?.handle)
    }

    @Test
    fun theRulesComeFromTheApi() = runTest(main) {
        val graph = graph {
            json("""{"points":{"answer_accepted":10,"answer_fast_bonus":5},"limits":{"dailyCap":50,"uncappedKinds":[],
                "fastBonusMinutes":15,"helpfulVotesPerAnswer":3,"validationsPerPairPerWeek":2,"minVoterAccountAgeHours":24},
                "scoring":{"githubPerRepo":5,"githubCap":40,"platformCap":60,"activeMonths":24,"minLanguageShare":0.2}}""")
        }
        val vm = RulesViewModel(graph.discoverApi, graph.space()).tracked()
        settle()
        val rules = assertIs<RulesState.Loaded>(vm.state.value).rules
        assertEquals(10, rules.points["answer_accepted"])
        assertEquals(15, rules.limits.fastBonusMinutes)
        assertEquals(40, rules.scoring.githubCap)
    }

    private fun me(): Me = DevHubJson.decodeFromString(Me.serializer(), meJson())

    @Test
    fun settingsSendEveryFieldWithExplicitNullsAndAKey() = runTest(main) {
        var saved: Me? = null
        val graph = graph { r ->
            when {
                r.method == HttpMethod.Patch -> json(meJson())
                else -> json(passportJson())
            }
        }
        val vm = SettingsViewModel(graph.meApi, graph.passportApi, me(), graph.space(), onSaved = { saved = it }, onDeleted = {}).tracked()
        settle()
        assertEquals(true, vm.state.value.form.mission) // lu sur le Passport

        vm.edit { it.copy(bio = "", country = "", privacy = it.privacy.copy(hideStats = true)) }
        vm.save()
        settle()

        val patch = requests.single { it.method == HttpMethod.Patch }
        assertNotNull(patch.headers["Idempotency-Key"])
        val body = Json.parseToJsonElement((patch.body as TextContent).text).jsonObject
        assertEquals(JsonNull, body["bio"])
        assertEquals(JsonNull, body["country"])
        assertEquals("true", body["privacy"]!!.jsonObject["hideStats"]!!.jsonPrimitive.content)
        assertEquals("true", body["availability"]!!.jsonObject["mission"]!!.jsonPrimitive.content)
        assertTrue(vm.state.value.saved)
        assertEquals("awa-dev", saved?.handle)
    }

    @Test
    fun settingsNeedTheNetworkAndValidFields() = runTest(main) {
        val graph = graph { json(passportJson()) }
        val space = graph.space()
        val vm = SettingsViewModel(graph.meApi, graph.passportApi, me(), space, onSaved = {}, onDeleted = {}).tracked()
        settle()
        vm.edit { it.copy(country = "SEN") }
        assertEquals(false, vm.state.value.form.valid)
        vm.edit { it.copy(country = "SN") }
        space.connectivity.reportUnreachable()
        vm.save()
        assertEquals("offline", vm.state.value.error)
        assertTrue(requests.none { it.method == HttpMethod.Patch })
    }

    @Test
    fun deletingTheAccountNeedsTheExactHandle() = runTest(main) {
        var deleted = false
        val graph = graph { r -> if (r.method == HttpMethod.Delete) respond("", HttpStatusCode.NoContent) else json(passportJson()) }
        val vm = SettingsViewModel(graph.meApi, graph.passportApi, me(), graph.space(), onSaved = {}, onDeleted = { deleted = true }).tracked()
        settle()

        vm.deleteAccount("quelqu-un")
        settle()
        assertTrue(requests.none { it.method == HttpMethod.Delete })

        vm.deleteAccount("AWA-DEV")
        settle()
        val delete = requests.single { it.method == HttpMethod.Delete }
        assertEquals("AWA-DEV", Json.parseToJsonElement((delete.body as TextContent).text).jsonObject["confirmHandle"]!!.jsonPrimitive.content)
        assertTrue(deleted)
    }
}
