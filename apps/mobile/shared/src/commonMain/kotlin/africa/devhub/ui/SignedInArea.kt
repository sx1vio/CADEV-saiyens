package africa.devhub.ui

import africa.devhub.app.AppGraph
import africa.devhub.me.Me
import africa.devhub.passport.PassportViewModel
import africa.devhub.passport.ProofsViewModel
import africa.devhub.resources.Res
import africa.devhub.resources.email_back
import africa.devhub.resources.nav_home
import africa.devhub.resources.nav_passport
import africa.devhub.notifications.NotificationTarget
import africa.devhub.notifications.NotificationsViewModel
import africa.devhub.resources.nav_notifications
import africa.devhub.resources.nav_rooms
import africa.devhub.resources.notif_badge
import africa.devhub.ui.notifications.NotificationsScreen
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.lifecycle.compose.LifecycleStartEffect
import org.jetbrains.compose.resources.pluralStringResource
import africa.devhub.resources.nav_sos
import africa.devhub.resources.rooms_create
import africa.devhub.rooms.CreateRoomViewModel
import africa.devhub.rooms.RoomViewModel
import africa.devhub.rooms.RoomsViewModel
import africa.devhub.ui.rooms.CreateRoomScreen
import africa.devhub.ui.rooms.RoomActions
import africa.devhub.ui.rooms.RoomScreen
import africa.devhub.ui.rooms.RoomsScreen
import africa.devhub.resources.ask_title
import africa.devhub.sos.AskViewModel
import africa.devhub.sos.QuestionViewModel
import africa.devhub.sos.QuestionsViewModel
import africa.devhub.sos.SosNotice
import africa.devhub.ui.sos.AskScreen
import africa.devhub.ui.sos.QuestionActions
import africa.devhub.ui.sos.QuestionScreen
import africa.devhub.ui.sos.QuestionsScreen
import androidx.compose.runtime.LaunchedEffect
import africa.devhub.resources.proofs_title
import africa.devhub.offline.ActionStatus
import africa.devhub.resources.sync_title
import africa.devhub.ui.components.DevHubIcons
import africa.devhub.ui.components.NetworkBar
import africa.devhub.ui.sync.SyncCenterScreen
import kotlinx.coroutines.launch
import africa.devhub.community.CreatePostViewModel
import africa.devhub.community.FeedViewModel
import africa.devhub.community.PostViewModel
import africa.devhub.certs.CertsViewModel
import africa.devhub.certs.ExamViewModel
import africa.devhub.certs.PracticeViewModel
import africa.devhub.discover.DiscoverViewModel
import africa.devhub.resources.certs_title
import africa.devhub.ui.certs.CertScreen
import africa.devhub.ui.certs.CertsScreen
import africa.devhub.ui.certs.ExamScreen
import africa.devhub.ui.certs.PracticeScreen
import africa.devhub.jobs.ApplicationsViewModel
import africa.devhub.jobs.JobViewModel
import africa.devhub.jobs.JobsViewModel
import africa.devhub.resources.jobs_title
import africa.devhub.ui.jobs.ApplicationsScreen
import africa.devhub.ui.jobs.JobScreen
import africa.devhub.ui.jobs.JobsScreen
import africa.devhub.resources.community_title
import africa.devhub.ui.community.CreatePostScreen
import africa.devhub.ui.community.FeedScreen
import africa.devhub.ui.community.PostScreen
import africa.devhub.messages.ConversationViewModel
import africa.devhub.messages.ConversationsViewModel
import africa.devhub.news.NewsViewModel
import africa.devhub.resources.messages_title
import africa.devhub.resources.news_title
import africa.devhub.ui.messages.ConversationScreen
import africa.devhub.ui.messages.ConversationsScreen
import africa.devhub.ui.news.NewsScreen
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import africa.devhub.discover.RulesViewModel
import africa.devhub.resources.discover_title
import africa.devhub.resources.home_settings
import africa.devhub.resources.rules_title
import africa.devhub.settings.SettingsViewModel
import africa.devhub.ui.discover.DiscoverScreen
import africa.devhub.ui.discover.RulesScreen
import africa.devhub.ui.home.HomeLinks
import africa.devhub.ui.home.HomeScreen
import africa.devhub.ui.settings.SettingsScreen
import africa.devhub.ui.passport.PassportScreen
import africa.devhub.ui.passport.ProofsScreen
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavDestination.Companion.hasRoute
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.toRoute
import kotlinx.serialization.Serializable
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.stringResource

// Destinations de l'espace connecté ; chaque étape (ADR-0021) y ajoute les siennes.
@Serializable
private data object HomeRoute

@Serializable
private data class PassportRoute(val handle: String)

@Serializable
private data class ProofsRoute(val handle: String)

@Serializable
private data object SosRoute

@Serializable
private data class QuestionRoute(val id: String, val secretsMasked: Int = 0)

@Serializable
private data object AskRoute

@Serializable
private data object SyncRoute

@Serializable
private data object RoomsRoute

@Serializable
private data object NotificationsRoute

@Serializable
private data class DiscoverRoute(val leaderboard: Boolean = false)

@Serializable
private data object RulesRoute

@Serializable
private data object SettingsRoute

@Serializable
private data object NewsRoute

@Serializable
private data object ConversationsRoute

@Serializable
private data class ConversationRoute(val id: String)

@Serializable
private data object FeedRoute

@Serializable
private data class PostRoute(val id: String)

@Serializable
private data object CreatePostRoute

@Serializable
private data object JobsRoute

@Serializable
private data class JobRoute(val id: String)

@Serializable
private data object ApplicationsRoute

@Serializable
private data object CertsRoute

@Serializable
private data class CertRoute(val id: String)

@Serializable
private data class PracticeRoute(val id: String)

@Serializable
private data class ExamRoute(val id: String, val mode: String)

@Serializable
private data class RoomRoute(val code: String)

@Serializable
private data object CreateRoomRoute

private data class TopLevel(val label: StringResource, val icon: ImageVector, val route: Any)

/** Espace connecté : barre de navigation en bas, pile d'écrans par onglet. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SignedInArea(
    graph: AppGraph,
    me: Me,
    onSignOut: () -> Unit,
    onMeUpdated: (Me) -> Unit,
    onAccountDeleted: () -> Unit,
) {
    val space = remember(me.id) { graph.userSpace(me.id) }
    val online by space.connectivity.online.collectAsStateWithLifecycle()
    val syncing by space.engine.syncing.collectAsStateWithLifecycle()
    val actions by space.outbox.actions.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()
    val navController = rememberNavController()
    val entry by navController.currentBackStackEntryAsState()
    val destination = entry?.destination
    val tabs = listOf(
        TopLevel(Res.string.nav_home, DevHubIcons.Home, HomeRoute),
        TopLevel(Res.string.nav_sos, DevHubIcons.Help, SosRoute),
        TopLevel(Res.string.nav_rooms, DevHubIcons.Folder, RoomsRoute),
        TopLevel(Res.string.nav_notifications, DevHubIcons.Bell, NotificationsRoute),
        TopLevel(Res.string.nav_passport, DevHubIcons.Person, PassportRoute(me.handle)),
    )
    val unread by space.notifications.unread.collectAsStateWithLifecycle()
    // Temps réel au premier plan seulement : la connexion est coupée en arrière-plan.
    LifecycleStartEffect(space) {
        space.notifications.start()
        onStopOrDispose { space.notifications.stop() }
    }
    val onProofs = destination?.hasRoute<ProofsRoute>() == true
    val onQuestion = destination?.hasRoute<QuestionRoute>() == true
    val onAsk = destination?.hasRoute<AskRoute>() == true
    val onSync = destination?.hasRoute<SyncRoute>() == true
    val onRoom = destination?.hasRoute<RoomRoute>() == true
    val onCreateRoom = destination?.hasRoute<CreateRoomRoute>() == true
    val onDiscover = destination?.hasRoute<DiscoverRoute>() == true
    val onRules = destination?.hasRoute<RulesRoute>() == true
    val onSettings = destination?.hasRoute<SettingsRoute>() == true
    val onNews = destination?.hasRoute<NewsRoute>() == true
    val onCommunity = destination?.hasRoute<FeedRoute>() == true || destination?.hasRoute<PostRoute>() == true ||
        destination?.hasRoute<CreatePostRoute>() == true
    val onJobs = destination?.hasRoute<JobsRoute>() == true || destination?.hasRoute<JobRoute>() == true ||
        destination?.hasRoute<ApplicationsRoute>() == true
    val onCerts = destination?.hasRoute<CertsRoute>() == true || destination?.hasRoute<CertRoute>() == true ||
        destination?.hasRoute<PracticeRoute>() == true || destination?.hasRoute<ExamRoute>() == true
    val onConversations = destination?.hasRoute<ConversationsRoute>() == true || destination?.hasRoute<ConversationRoute>() == true
    // Écrans empilés : titre et retour en haut ; l'onglet parent reste sélectionné en bas.
    val nestedTitle = when {
        onProofs -> Res.string.proofs_title
        onQuestion -> Res.string.nav_sos
        onAsk -> Res.string.ask_title
        onSync -> Res.string.sync_title
        onRoom -> Res.string.nav_rooms
        onCreateRoom -> Res.string.rooms_create
        onDiscover -> Res.string.discover_title
        onRules -> Res.string.rules_title
        onSettings -> Res.string.home_settings
        onNews -> Res.string.news_title
        onCommunity -> Res.string.community_title
        onJobs -> Res.string.jobs_title
        onCerts -> Res.string.certs_title
        onConversations -> Res.string.messages_title
        else -> null
    }

    Scaffold(
        topBar = {
            if (nestedTitle != null) {
                TopAppBar(
                    title = { Text(stringResource(nestedTitle)) },
                    navigationIcon = {
                        IconButton(onClick = { navController.navigateUp() }) {
                            Icon(DevHubIcons.Back, contentDescription = stringResource(Res.string.email_back))
                        }
                    },
                )
            }
        },
        bottomBar = {
            NavigationBar {
                tabs.forEach { tab ->
                    val selected = when (tab.route) {
                        is HomeRoute -> destination?.hasRoute<HomeRoute>() == true || onDiscover || onRules || onSettings || onNews || onConversations || onCommunity || onJobs || onCerts
                        is SosRoute -> destination?.hasRoute<SosRoute>() == true || onQuestion || onAsk
                        is RoomsRoute -> destination?.hasRoute<RoomsRoute>() == true || onRoom || onCreateRoom
                        is NotificationsRoute -> destination?.hasRoute<NotificationsRoute>() == true
                        else -> destination?.hasRoute<PassportRoute>() == true || onProofs
                    }
                    NavigationBarItem(
                        selected = selected,
                        onClick = {
                            navController.navigate(tab.route) {
                                popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = {
                            if (tab.route is NotificationsRoute && unread > 0) {
                                val label = pluralStringResource(Res.plurals.notif_badge, unread, unread)
                                BadgedBox(badge = { Badge { Text(if (unread > 99) "99+" else unread.toString()) } }) {
                                    Icon(tab.icon, contentDescription = label)
                                }
                            } else {
                                Icon(tab.icon, contentDescription = null)
                            }
                        },
                        label = { Text(stringResource(tab.label)) },
                    )
                }
            }
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).consumeWindowInsets(padding)) {
            NetworkBar(
                online = online,
                syncing = syncing,
                pending = actions.count { it.status == ActionStatus.Pending },
                failed = actions.count { it.status != ActionStatus.Pending },
                onOpen = { if (!onSync) navController.navigate(SyncRoute) },
            )
            NavHost(navController = navController, startDestination = HomeRoute, modifier = Modifier.weight(1f)) {
                composable<HomeRoute> {
                    HomeScreen(
                        me = me,
                        pendingActions = actions.size,
                        links = HomeLinks(
                            onNews = { navController.navigate(NewsRoute) },
                            onMessages = { navController.navigate(ConversationsRoute) },
                            onCommunity = { navController.navigate(FeedRoute) },
                            onJobs = { navController.navigate(JobsRoute) },
                            onCerts = { navController.navigate(CertsRoute) },
                            onDiscover = { navController.navigate(DiscoverRoute()) },
                            onLeaderboard = { navController.navigate(DiscoverRoute(leaderboard = true)) },
                            onRules = { navController.navigate(RulesRoute) },
                            onSettings = { navController.navigate(SettingsRoute) },
                        ),
                        onSignOut = onSignOut,
                    )
                }
                composable<DiscoverRoute> { backStack ->
                    val leaderboard = backStack.toRoute<DiscoverRoute>().leaderboard
                    val vm = viewModel { DiscoverViewModel(graph.discoverApi, space) }
                    val devs by vm.devs.collectAsStateWithLifecycle()
                    val board by vm.board.collectAsStateWithLifecycle()
                    DiscoverScreen(
                        devs = devs,
                        board = board,
                        startOnLeaderboard = leaderboard,
                        onFilters = vm::setFilters,
                        onRetryDevs = { vm.reloadDevs() },
                        onMoreDevs = vm::loadMoreDevs,
                        onCountry = vm::openCountry,
                        onOpenDev = { navController.navigate(PassportRoute(it)) },
                    )
                }
                composable<NewsRoute> {
                    val vm = viewModel { NewsViewModel(graph.newsApi, space, lang = "all") }
                    val state by vm.state.collectAsStateWithLifecycle()
                    NewsScreen(state, vm::setLang, vm::setQuery, vm::reload)
                }
                composable<ConversationsRoute> {
                    val vm = viewModel { ConversationsViewModel(graph.messagesApi, space) }
                    val state by vm.state.collectAsStateWithLifecycle()
                    ConversationsScreen(state, onOpen = { navController.navigate(ConversationRoute(it.id)) }, onRetry = vm::reload)
                }
                composable<ConversationRoute> { backStack ->
                    val id = backStack.toRoute<ConversationRoute>().id
                    val vm = viewModel { ConversationViewModel(graph.messagesApi, space, id) }
                    val state by vm.state.collectAsStateWithLifecycle()
                    ConversationScreen(state, vm::send, vm::loadOlder, onRetry = { navController.popBackStack() })
                }
                composable<FeedRoute> {
                    val vm = viewModel { FeedViewModel(graph.communityApi, space) }
                    val state by vm.state.collectAsStateWithLifecycle()
                    FeedScreen(
                        state = state,
                        onCommunity = vm::setCommunity,
                        onTop = vm::setTop,
                        onRetry = vm::reload,
                        onLoadMore = vm::loadMore,
                        onOpen = { navController.navigate(PostRoute(it)) },
                        onPublish = { navController.navigate(CreatePostRoute) },
                    )
                }
                composable<PostRoute> { backStack ->
                    val id = backStack.toRoute<PostRoute>().id
                    val vm = viewModel { PostViewModel(graph.communityApi, id, space) }
                    val state by vm.state.collectAsStateWithLifecycle()
                    PostScreen(state, vm::vote, vm::comment, vm::refresh)
                }
                composable<CreatePostRoute> {
                    val vm = viewModel { CreatePostViewModel(graph.communityApi, space) }
                    val state by vm.state.collectAsStateWithLifecycle()
                    val createdId = state.createdId
                    LaunchedEffect(createdId) {
                        if (createdId != null) {
                            vm.consumeCreated()
                            navController.navigate(PostRoute(createdId)) { popUpTo<CreatePostRoute> { inclusive = true } }
                        }
                    }
                    CreatePostScreen(state, online, vm::edit, vm::send)
                }
                composable<JobsRoute> {
                    val vm = viewModel { JobsViewModel(graph.jobsApi, space) }
                    val state by vm.state.collectAsStateWithLifecycle()
                    JobsScreen(
                        state = state,
                        onFilters = vm::setFilters,
                        onRetry = vm::reload,
                        onOpen = { navController.navigate(JobRoute(it)) },
                        onApplications = { navController.navigate(ApplicationsRoute) },
                    )
                }
                composable<JobRoute> { backStack ->
                    val id = backStack.toRoute<JobRoute>().id
                    val vm = viewModel { JobViewModel(graph.jobsApi, id, space) }
                    val state by vm.state.collectAsStateWithLifecycle()
                    JobScreen(state, vm::apply, vm::refresh)
                }
                composable<ApplicationsRoute> {
                    val vm = viewModel { ApplicationsViewModel(graph.jobsApi, space) }
                    val state by vm.state.collectAsStateWithLifecycle()
                    ApplicationsScreen(state, vm::withdraw, onOpenJob = { navController.navigate(JobRoute(it)) }, onRetry = vm::reload)
                }
                composable<CertsRoute> {
                    val vm = viewModel { CertsViewModel(graph.certsApi, space) }
                    val state by vm.state.collectAsStateWithLifecycle()
                    CertsScreen(state, onOpen = { navController.navigate(CertRoute(it)) }, onRetry = vm::reload)
                }
                composable<CertRoute> { backStack ->
                    val id = backStack.toRoute<CertRoute>().id
                    val vm = viewModel { CertsViewModel(graph.certsApi, space) }
                    val state by vm.state.collectAsStateWithLifecycle()
                    CertScreen(
                        certId = id,
                        mine = state.mine[id],
                        online = online,
                        onPractice = { navController.navigate(PracticeRoute(id)) },
                        onExam = { mode -> navController.navigate(ExamRoute(id, mode)) },
                        nowMillis = graph.now(),
                    )
                }
                composable<PracticeRoute> { backStack ->
                    val id = backStack.toRoute<PracticeRoute>().id
                    val vm = viewModel { PracticeViewModel(graph.certsApi, id) }
                    val state by vm.state.collectAsStateWithLifecycle()
                    PracticeScreen(state, vm::answer, vm::next, vm::restart)
                }
                composable<ExamRoute> { backStack ->
                    val route = backStack.toRoute<ExamRoute>()
                    val vm = viewModel { ExamViewModel(graph.certsApi, route.id, route.mode, graph.now) }
                    val state by vm.state.collectAsStateWithLifecycle()
                    ExamScreen(state, vm::choose, vm::goTo, vm::submit, vm::start)
                }
                composable<RulesRoute> {
                    val vm = viewModel { RulesViewModel(graph.discoverApi, space) }
                    val state by vm.state.collectAsStateWithLifecycle()
                    RulesScreen(state, vm::load)
                }
                composable<SettingsRoute> {
                    val vm = viewModel { SettingsViewModel(graph.meApi, graph.passportApi, me, space, onMeUpdated, onAccountDeleted) }
                    val state by vm.state.collectAsStateWithLifecycle()
                    SettingsScreen(state, me.handle, vm::edit, vm::save, vm::deleteAccount)
                }
                composable<SyncRoute> {
                    SyncCenterScreen(
                        actions = actions,
                        onSyncNow = space.engine::kick,
                        onRetry = { opId -> scope.launch { space.engine.retry(opId) } },
                        onCancel = { opId -> scope.launch { space.engine.cancel(opId) } },
                    )
                }
                composable<PassportRoute> { backStack ->
                    val handle = backStack.toRoute<PassportRoute>().handle
                    val mine = handle.equals(me.handle, ignoreCase = true)
                    val vm = viewModel { PassportViewModel(graph.passportApi, handle, space, mine) }
                    val state by vm.state.collectAsStateWithLifecycle()
                    var writeFailed by remember(handle) { mutableStateOf(false) }
                    PassportScreen(
                        state = state,
                        isMine = handle.equals(me.handle, ignoreCase = true),
                        onRetry = vm::load,
                        onRefreshGithub = vm::refreshGithub,
                        onSeeProofs = { navController.navigate(ProofsRoute(handle)) },
                        onWrite = {
                            scope.launch {
                                runCatching { graph.messagesApi.start(handle) }
                                    .onSuccess { navController.navigate(ConversationRoute(it.id)) }
                                    .onFailure { writeFailed = true }
                            }
                        },
                        writeFailed = writeFailed,
                    )
                }
                composable<SosRoute> {
                    val vm = viewModel { QuestionsViewModel(graph.sosApi, space) }
                    val state by vm.state.collectAsStateWithLifecycle()
                    QuestionsScreen(
                        state = state,
                        onFilter = vm::setFilter,
                        onQuery = vm::setQuery,
                        onRetry = { vm.reload() },
                        onLoadMore = vm::loadMore,
                        onOpen = { navController.navigate(QuestionRoute(it)) },
                        onAsk = { navController.navigate(AskRoute) },
                    )
                }
                composable<QuestionRoute> { backStack ->
                    val route = backStack.toRoute<QuestionRoute>()
                    val vm = viewModel {
                        QuestionViewModel(
                            api = graph.sosApi,
                            questionId = route.id,
                            space = space,
                            initialNotice = route.secretsMasked.takeIf { it > 0 }?.let { SosNotice.SecretsMasked(it) },
                        )
                    }
                    val state by vm.state.collectAsStateWithLifecycle()
                    QuestionScreen(
                        state = state,
                        meHandle = me.handle,
                        actions = QuestionActions(
                            onRetry = vm::refresh,
                            onVote = vm::vote,
                            onAccept = vm::accept,
                            onClaim = vm::claim,
                            onPostAnswer = vm::postAnswer,
                        ),
                    )
                }
                composable<AskRoute> {
                    val vm = viewModel { AskViewModel(graph.sosApi, space, me.uiLang) }
                    val state by vm.state.collectAsStateWithLifecycle()
                    val created = state.created
                    // Hors ligne : la question attend dans la file ; la liste l'affiche « en attente ».
                    LaunchedEffect(state.queued) {
                        if (state.queued) {
                            vm.consumeCreated()
                            navController.popBackStack()
                        }
                    }
                    LaunchedEffect(created) {
                        if (created != null) {
                            vm.consumeCreated()
                            navController.navigate(QuestionRoute(created.id, created.secretsMasked)) {
                                popUpTo<AskRoute> { inclusive = true }
                            }
                        }
                    }
                    AskScreen(state, vm::edit, vm::toggleTag, vm::loadTags, vm::send)
                }
                composable<NotificationsRoute> {
                    val vm = viewModel { NotificationsViewModel(graph.notificationsApi, space.notifications, graph.roomsApi) }
                    val state by vm.state.collectAsStateWithLifecycle()
                    NotificationsScreen(
                        state = state,
                        onOpen = { n ->
                            vm.open(n) { target ->
                                when (target) {
                                    is NotificationTarget.Question -> navController.navigate(QuestionRoute(target.id))
                                    is NotificationTarget.Room -> navController.navigate(RoomRoute(target.code))
                                    is NotificationTarget.Passport -> navController.navigate(PassportRoute(target.handle))
                                    NotificationTarget.Rooms -> navController.navigate(RoomsRoute)
                                    null -> Unit
                                }
                            }
                        },
                        onMarkAll = vm::markAllRead,
                        onRetry = vm::reload,
                        onLoadMore = vm::loadMore,
                    )
                }
                composable<RoomsRoute> {
                    val vm = viewModel { RoomsViewModel(graph.roomsApi, space) }
                    val state by vm.state.collectAsStateWithLifecycle()
                    RoomsScreen(
                        state = state,
                        onMine = vm::setMine,
                        onQuery = vm::setQuery,
                        onRetry = { vm.reload() },
                        onLoadMore = vm::loadMore,
                        onOpen = { navController.navigate(RoomRoute(it)) },
                        onCreate = { navController.navigate(CreateRoomRoute) },
                    )
                }
                composable<RoomRoute> { backStack ->
                    val code = backStack.toRoute<RoomRoute>().code
                    val vm = viewModel { RoomViewModel(graph.roomsApi, code, space) }
                    val state by vm.state.collectAsStateWithLifecycle()
                    RoomScreen(
                        state = state,
                        meHandle = me.handle,
                        actions = RoomActions(
                            onRetry = vm::refresh,
                            onJoin = vm::join,
                            onDecide = vm::decide,
                            onTake = vm::takeTask,
                            onSubmit = vm::submitTask,
                            onComplete = vm::completeTask,
                            onCreateTask = vm::createTask,
                            onPostMessage = vm::postMessage,
                        ),
                    )
                }
                composable<CreateRoomRoute> {
                    val vm = viewModel { CreateRoomViewModel(graph.roomsApi, graph.sosApi, space) }
                    val state by vm.state.collectAsStateWithLifecycle()
                    val createdCode = state.createdCode
                    LaunchedEffect(createdCode) {
                        if (createdCode != null) {
                            vm.consumeCreated()
                            navController.navigate(RoomRoute(createdCode)) { popUpTo<CreateRoomRoute> { inclusive = true } }
                        }
                    }
                    CreateRoomScreen(state, online, vm::edit, vm::toggleTag, vm::send)
                }
                composable<ProofsRoute> { backStack ->
                    val handle = backStack.toRoute<ProofsRoute>().handle
                    val vm = viewModel { ProofsViewModel(graph.passportApi, handle) }
                    val state by vm.state.collectAsStateWithLifecycle()
                    ProofsScreen(state, vm::loadMore, Modifier.fillMaxSize())
                }
            }
        }
    }
}
