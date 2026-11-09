package africa.devhub.app

import africa.devhub.auth.AuthApi
import africa.devhub.auth.AuthRepository
import africa.devhub.auth.SessionStore
import africa.devhub.core.AppConfig
import africa.devhub.bench.BenchApi
import africa.devhub.certs.CertsApi
import africa.devhub.community.CommunityApi
import africa.devhub.discover.DiscoverApi
import africa.devhub.jobs.JobsApi
import africa.devhub.me.MeApi
import africa.devhub.messages.MessagesApi
import africa.devhub.news.NewsApi
import africa.devhub.network.createHttpClient
import africa.devhub.passport.PassportApi
import africa.devhub.notifications.EventStream
import africa.devhub.notifications.NotificationsApi
import africa.devhub.notifications.SseEventStream
import africa.devhub.rooms.RoomsApi
import africa.devhub.sos.SosApi
import africa.devhub.platform.AuthBrowser
import africa.devhub.platform.SecureStore
import africa.devhub.offline.ActionSender
import africa.devhub.offline.Connectivity
import africa.devhub.offline.ConnectivityProbe
import africa.devhub.offline.LocalFiles
import africa.devhub.offline.ReadCache
import africa.devhub.offline.UserSpace
import io.ktor.client.engine.HttpClientEngine
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob

/**
 * Graphe des dépendances de l'application, construit une fois par processus (ADR-0021 :
 * pas de framework d'injection). Chaque plateforme fournit le stockage chiffré et le navigateur.
 */
class AppGraph(
    val config: AppConfig,
    secureStore: SecureStore,
    authBrowser: AuthBrowser,
    /** Dossier privé de l'application (cache et file d'actions, O1, O2). */
    private val storage: LocalFiles,
    connectivityProbe: ConnectivityProbe? = null,
    engine: HttpClientEngine? = null,
    /** Flux temps réel imposé (tests) ; sinon le SSE de l'API. */
    eventStream: EventStream? = null,
    private val scope: CoroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.Default),
    val now: () -> Long = ::systemNowMillis,
) {
    val sessions = SessionStore(secureStore)

    internal val http = createHttpClient(
        config = config,
        sessionToken = sessions::current,
        onUnauthorized = { sessions.clear() },
        engine = engine,
    )

    val meApi = MeApi(http)
    val passportApi = PassportApi(http)
    val sosApi = SosApi(http)
    val roomsApi = RoomsApi(http)
    val discoverApi = DiscoverApi(http)
    val newsApi = NewsApi(http)
    val messagesApi = MessagesApi(http)
    val communityApi = CommunityApi(http)
    val jobsApi = JobsApi(http)
    val certsApi = CertsApi(http)
    val benchApi = BenchApi(http)
    val notificationsApi = NotificationsApi(http)
    private val events: EventStream = eventStream ?: SseEventStream(http)
    val auth = AuthRepository(config, AuthApi(http), authBrowser, sessions)

    val connectivity = Connectivity(connectivityProbe)
    private val sender = ActionSender(http)

    /** Dernier profil connu, hors de tout espace utilisateur : ouvrir l'application hors ligne. */
    val deviceCache = ReadCache(storage.child("device"), now)

    private var space: UserSpace? = null

    /** Espace hors ligne du compte connecté ; en change si un autre compte se connecte. */
    fun userSpace(userId: String): UserSpace {
        space?.takeIf { it.userId == userId }?.let { return it }
        space?.close(wipe = false)
        return UserSpace(
            userId = userId,
            files = storage.child("users").child(UserSpace.dirName(userId)),
            sender = sender,
            connectivity = connectivity,
            scope = scope,
            now = now,
            notificationsApi = notificationsApi,
            eventStream = events,
        ).also { space = it }
    }

    /** Retour au premier plan : un envoi a peut-être été retardé pendant la mise en veille. */
    fun onForeground() {
        space?.engine?.kick()
    }

    /** Déconnexion : efface le cache, la file et le dernier profil (O9). */
    fun forgetUser() {
        space?.close(wipe = true)
        space = null
        storage.child("device").deleteAll()
    }
}

@OptIn(kotlin.time.ExperimentalTime::class)
private fun systemNowMillis(): Long = kotlin.time.Clock.System.now().toEpochMilliseconds()
