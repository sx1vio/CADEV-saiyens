package africa.devhub

import africa.devhub.app.AppGraph
import africa.devhub.auth.SignInResult
import africa.devhub.core.AppConfig
import africa.devhub.core.newUuid
import africa.devhub.offline.LocalFiles
import africa.devhub.offline.SendOutcome
import africa.devhub.rooms.CreateRoomRequest
import africa.devhub.sos.AskDraft
import okio.fakefilesystem.FakeFileSystem
import africa.devhub.sos.AskQuestionRequest
import africa.devhub.sos.PostAnswerRequest
import africa.devhub.sos.QuestionFilter
import africa.devhub.network.ApiException
import africa.devhub.platform.AuthBrowser
import africa.devhub.testing.FakeSecureStore
import io.ktor.client.HttpClient
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.http.HttpHeaders
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.runTest
import kotlin.random.Random
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

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

    private fun liveGraph(url: String) = AppGraph(
        config = AppConfig(apiBaseUrl = url),
        secureStore = FakeSecureStore(),
        authBrowser = RedirectingBrowser(),
        storage = LocalFiles(FakeFileSystem(), "/app"),
    )

    @Test
    fun signInAcceptConductAndSignOutAgainstTheRealApi() = runTest {
        val url = apiUrl ?: return@runTest
        val graph = liveGraph(url)
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
        val graph = liveGraph(url)
        val tag = Random.nextInt(0, Int.MAX_VALUE).toString(36)
        val email = "kmp-e2e-$tag@example.test"

        assertEquals(SignInResult.SignedIn, graph.auth.registerWithEmail("Kmp E2e", email, "une phrase assez longue"))
        graph.auth.signOut()
        assertEquals(SignInResult.SignedIn, graph.auth.signInWithEmail(email, "une phrase assez longue"))
        assertEquals(
            SignInResult.Failed("auth.bad_credentials"),
            liveGraph(url)
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

    @Test
    fun sosDevAskAnswerVoteAcceptAgainstTheRealApi() = runTest {
        val url = apiUrl ?: return@runTest
        val tag = Random.nextInt(0, Int.MAX_VALUE).toString(36)
        val asker = liveGraph(url)
        val helper = liveGraph(url)
        assertEquals(SignInResult.SignedIn, asker.auth.signInWithGithub(loginHint = "kmp-ask-$tag"))
        assertEquals(SignInResult.SignedIn, helper.auth.signInWithGithub(loginHint = "kmp-help-$tag"))
        asker.meApi.acceptCodeOfConduct()
        helper.meApi.acceptCodeOfConduct()

        val slug = asker.sosApi.tags().data.first().slug
        // Jeton factice construit à l'exécution : rien qui ressemble à un secret dans le dépôt.
        val fakeToken = "ghp" + "_" + "a1B2".repeat(9)
        val created = asker.sosApi.ask(
            AskQuestionRequest(
                clientId = newUuid(),
                title = "Gradle ne trouve pas le SDK Android",
                body = "Erreur au build. Mon jeton : $fakeToken",
                tagSlugs = listOf(slug),
                urgency = "high",
                lang = "fr",
            ),
        )
        assertEquals(1, created.secretsMasked)
        val stored = helper.sosApi.question(created.id)
        assertEquals(false, stored.body.contains(fakeToken))

        val answer = helper.sosApi.answer(created.id, PostAnswerRequest(newUuid(), "Ajoute sdk.dir dans local.properties."))
        assertEquals(true, asker.sosApi.vote(answer.id).counted)
        assertEquals(false, asker.sosApi.vote(answer.id).counted)
        assertEquals("resolved", asker.sosApi.accept(answer.id).status)

        val resolved = asker.sosApi.question(created.id)
        assertEquals("resolved", resolved.status)
        assertEquals(answer.id, resolved.acceptedAnswerId)
        val mine = asker.sosApi.questions(QuestionFilter.Mine)
        assertEquals(created.id, mine.data.first().id)
    }

    @Test
    fun offlineWritesAreSentAsOneSyncBatchWithLocalReferences() = runTest {
        val url = apiUrl ?: return@runTest
        val tag = Random.nextInt(0, Int.MAX_VALUE).toString(36)
        val graph = liveGraph(url)
        assertEquals(SignInResult.SignedIn, graph.auth.signInWithGithub(loginHint = "kmp-off-$tag"))
        val me = graph.meApi.me()
        graph.meApi.acceptCodeOfConduct()
        val space = graph.userSpace(me.id)
        val slug = graph.sosApi.tags().data.first().slug

        // Hors ligne : trois questions et une réponse à la première, qui n'a pas encore d'identifiant.
        val drafts = (1..3).map { i ->
            AskDraft(title = "Question écrite hors ligne numéro $i", body = "Détails $i", tagSlugs = listOf(slug), lang = "fr")
        }
        space.connectivity.reportUnreachable()
        val asked = drafts.map { space.writer.ask(it, waitMs = 0) }
        val answer = space.writer.answer("client:" + asked[0].clientId, "Réponse écrite hors ligne", waitMs = 0)
        assertEquals(4, space.outbox.actions.value.size)

        // Retour du réseau : un seul lot POST /sync, résolu par l'API.
        space.connectivity.reportReachable()
        space.engine.kick()
        val deadline = kotlin.time.TimeSource.Monotonic.markNow()
        while (space.outbox.actions.value.isNotEmpty() && deadline.elapsedNow().inWholeSeconds < 20) {
            kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.Default) { kotlinx.coroutines.delay(100) }
        }
        assertEquals(emptyList(), space.outbox.actions.value.map { it.type to it.lastError })
        val firstId = space.outbox.resolved(asked[0].clientId!!)!!
        val first = graph.sosApi.question(firstId)
        assertEquals("Question écrite hors ligne numéro 1", first.title)
        assertEquals("Réponse écrite hors ligne", first.answers.single().body)
        assertEquals(answer.clientId?.let { space.outbox.resolved(it) }, first.answers.single().id)
        graph.forgetUser()
    }

    @Test
    fun roomCreateJoinAcceptTaskAndChatAgainstTheRealApi() = runTest {
        val url = apiUrl ?: return@runTest
        // Temps réel : le moteur de la file tourne sur ses propres fils, pas sur l'horloge du test.
        kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.Default) { roomScenario(url) }
    }

    private suspend fun roomScenario(url: String) {
        val tag = Random.nextInt(0, Int.MAX_VALUE).toString(36)
        val owner = liveGraph(url)
        val member = liveGraph(url)
        assertEquals(SignInResult.SignedIn, owner.auth.signInWithGithub(loginHint = "kmp-own-$tag"))
        assertEquals(SignInResult.SignedIn, member.auth.signInWithGithub(loginHint = "kmp-mem-$tag"))
        val ownerSpace = owner.userSpace(owner.meApi.me().id)
        val memberSpace = member.userSpace(member.meApi.me().id)
        owner.meApi.acceptCodeOfConduct()
        member.meApi.acceptCodeOfConduct()
        val slug = owner.sosApi.tags().data.first().slug

        val room = owner.roomsApi.create(
            CreateRoomRequest(
                name = "Salle mobile $tag",
                description = "Salle créée par le test de bout en bout du mobile",
                state = "looking_for_help",
                visibility = "public",
                stackTagSlugs = listOf(slug),
            ),
        )
        val roomId = owner.roomsApi.room(room.code).id

        val join = memberSpace.writer.joinRoom(roomId, "Je connais Kotlin")
        assertTrue(join.outcome is SendOutcome.Applied, join.outcome.toString())
        val request = owner.roomsApi.joinRequests(roomId).data.single { it.status == "pending" }
        assertTrue(ownerSpace.writer.decideJoin(roomId, request.id, accept = true).outcome is SendOutcome.Applied)
        assertEquals("member", member.roomsApi.room(room.code).viewer?.role)

        assertTrue(ownerSpace.writer.createTask(roomId, "Écran de connexion", null, "easy").outcome is SendOutcome.Applied)
        val task = member.roomsApi.tasks(roomId).data.single()
        assertTrue(memberSpace.writer.takeTask(roomId, task.id).outcome is SendOutcome.Applied)
        assertEquals("taken", owner.roomsApi.tasks(roomId).data.single().status)
        val again = ownerSpace.writer.takeTask(roomId, task.id)
        assertTrue(again.outcome is SendOutcome.Rejected, again.outcome.toString())

        assertTrue(memberSpace.writer.postMessage(roomId, "Je commence l'écran de connexion").outcome is SendOutcome.Applied)
        assertEquals("Je commence l'écran de connexion", owner.roomsApi.messages(roomId).data.first().body)
        owner.forgetUser()
        member.forgetUser()
    }

    @Test
    fun aNewAnswerArrivesLiveThroughServerSentEvents() = runTest {
        val url = apiUrl ?: return@runTest
        kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.Default) { liveNotificationScenario(url) }
    }

    private suspend fun liveNotificationScenario(url: String) {
        val tag = Random.nextInt(0, Int.MAX_VALUE).toString(36)
        val asker = liveGraph(url)
        val helper = liveGraph(url)
        assertEquals(SignInResult.SignedIn, asker.auth.signInWithGithub(loginHint = "kmp-sse-a-$tag"))
        assertEquals(SignInResult.SignedIn, helper.auth.signInWithGithub(loginHint = "kmp-sse-b-$tag"))
        asker.meApi.acceptCodeOfConduct()
        helper.meApi.acceptCodeOfConduct()
        val askerSpace = asker.userSpace(asker.meApi.me().id)
        val slug = asker.sosApi.tags().data.first().slug
        val question = asker.sosApi.ask(
            AskQuestionRequest(newUuid(), "Une question suivie en direct", "Détails", tagSlugs = listOf(slug), urgency = "normal", lang = "fr"),
        )

        val received = kotlinx.coroutines.CompletableDeferred<africa.devhub.notifications.NotificationView>()
        val scope = kotlinx.coroutines.CoroutineScope(kotlinx.coroutines.Dispatchers.Default)
        scope.launch { askerSpace.notifications.incoming.collect { if (it.type == "answer.created") received.complete(it) } }
        askerSpace.notifications.start()
        kotlinx.coroutines.delay(1_500) // le temps d'ouvrir la connexion SSE

        helper.sosApi.answer(question.id, PostAnswerRequest(newUuid(), "Réponse reçue en direct"))
        val notification = kotlinx.coroutines.withTimeout(15_000) { received.await() }
        assertEquals(question.id, notification.text("questionId"))
        assertTrue(askerSpace.notifications.unread.value >= 1)

        askerSpace.notifications.stop()
        scope.cancel()
        asker.forgetUser()
        helper.forgetUser()
    }

    @Test
    fun settingsDiscoveryRulesAndAccountDeletionAgainstTheRealApi() = runTest {
        val url = apiUrl ?: return@runTest
        val tag = Random.nextInt(0, Int.MAX_VALUE).toString(36)
        val graph = liveGraph(url)
        assertEquals(SignInResult.SignedIn, graph.auth.signInWithGithub(loginHint = "kmp-set-$tag"))
        graph.meApi.acceptCodeOfConduct()
        val me = graph.meApi.me()

        val updated = graph.meApi.update(
            africa.devhub.me.UpdateMeRequest(
                displayName = "Kmp Réglages",
                bio = null,
                country = "SN",
                lookingFor = "Une mission Kotlin",
                languages = listOf("fr", "en"),
                uiLang = "fr",
                emailNotifications = false,
                availability = africa.devhub.me.AvailabilityUpdate(mission = true),
                privacy = africa.devhub.me.Privacy(hideStats = true),
            ),
        )
        assertEquals("Kmp Réglages", updated.displayName)
        assertEquals("SN", updated.country)
        assertEquals(null, updated.bio)
        assertEquals(true, updated.privacy.hideStats)
        assertEquals(true, graph.passportApi.passport(me.handle).user.availability?.mission)

        assertTrue(graph.discoverApi.rules().points.isNotEmpty())
        assertTrue(graph.discoverApi.leaderboard().method.isNotBlank())
        graph.discoverApi.devs(africa.devhub.discover.DevFilters(mission = true))

        graph.meApi.delete(me.handle)
        val error = assertFailsWith<ApiException> { graph.meApi.me() }
        assertEquals(401, error.status)
    }
}
