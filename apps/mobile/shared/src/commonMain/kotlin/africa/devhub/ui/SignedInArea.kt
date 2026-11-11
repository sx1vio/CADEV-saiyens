package africa.devhub.ui

import africa.devhub.resources.home_jobs
import africa.devhub.resources.nav_devs
import africa.devhub.resources.nav_projects
import africa.devhub.resources.nav_questions
import africa.devhub.resources.nav_tools
import africa.devhub.resources.nav_profile
import africa.devhub.resources.drawer_progress
import africa.devhub.resources.drawer_network
import africa.devhub.resources.drawer_platform
import africa.devhub.resources.nav_rules
import africa.devhub.resources.nav_leaderboard
import africa.devhub.resources.signout_title
import africa.devhub.resources.signout_pending
import africa.devhub.resources.signout_cancel
import africa.devhub.resources.sign_out
import africa.devhub.ui.components.AppDrawer
import africa.devhub.ui.components.CreateAction
import africa.devhub.ui.components.CreateSheet
import africa.devhub.ui.components.MainTab
import africa.devhub.ui.components.SearchSheet
import africa.devhub.ui.components.WebTabBar
import africa.devhub.ui.components.WebTopBar
import africa.devhub.resources.create_sheet_app
import africa.devhub.resources.create_sheet_app_hint
import africa.devhub.resources.create_sheet_ask
import africa.devhub.resources.create_sheet_ask_hint
import africa.devhub.resources.create_sheet_post
import africa.devhub.resources.create_sheet_post_hint
import africa.devhub.resources.create_sheet_room
import africa.devhub.resources.create_sheet_room_hint
import africa.devhub.ui.components.DrawerEntry
import africa.devhub.ui.components.DrawerGroup
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDrawerState
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.ui.Alignment
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.clickable
import androidx.compose.foundation.background
import africa.devhub.ui.components.DevCard
import africa.devhub.resources.feed_publish
import africa.devhub.resources.sos_ask
import africa.devhub.resources.create_post_hint
import africa.devhub.resources.create_ask_hint
import africa.devhub.resources.create_title
import africa.devhub.app.AppGraph
import africa.devhub.me.Me
import africa.devhub.onboarding.StartTarget
import africa.devhub.passport.PassportViewModel
import africa.devhub.passport.ProofsViewModel
import africa.devhub.resources.Res
import africa.devhub.resources.email_back
import africa.devhub.resources.nav_home
import africa.devhub.resources.home_menu
import africa.devhub.notifications.NotificationTarget
import africa.devhub.notifications.NotificationsViewModel
import africa.devhub.resources.nav_notifications
import africa.devhub.resources.notif_badge
import africa.devhub.ui.notifications.NotificationsScreen
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.lifecycle.compose.LifecycleStartEffect
import org.jetbrains.compose.resources.pluralStringResource
import africa.devhub.resources.rooms_create
import africa.devhub.rooms.CreateRoomViewModel
import africa.devhub.rooms.RoomViewModel
import africa.devhub.rooms.RoomsViewModel
import africa.devhub.rooms.FeedbackViewModel
import africa.devhub.ui.rooms.CreateRoomScreen
import africa.devhub.ui.rooms.RoomActions
import africa.devhub.ui.rooms.RoomScreen
import africa.devhub.ui.rooms.RoomsScreen
import africa.devhub.ui.rooms.FeedbackActions
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
import africa.devhub.discover.DiscoverViewModel
import africa.devhub.jobs.ApplicationsViewModel
import africa.devhub.jobs.JobViewModel
import africa.devhub.jobs.JobsViewModel
import africa.devhub.resources.jobs_title
import africa.devhub.ui.jobs.ApplicationsScreen
import africa.devhub.ui.jobs.JobScreen
import africa.devhub.ui.jobs.JobsScreen
import africa.devhub.bench.BenchCreateViewModel
import africa.devhub.bench.BenchDetailViewModel
import africa.devhub.bench.BenchListViewModel
import africa.devhub.bench.BenchReportViewModel
import africa.devhub.devmap.DevMapViewModel
import africa.devhub.preflight.PreflightReportViewModel
import africa.devhub.preflight.PreflightViewModel
import africa.devhub.ui.bench.BenchCreateScreen
import africa.devhub.ui.bench.BenchDetailScreen
import africa.devhub.ui.bench.BenchReportScreen
import africa.devhub.ui.bench.BenchScreen
import africa.devhub.ui.devmap.DevMapScreen
import africa.devhub.ui.preflight.PreflightReportScreen
import africa.devhub.ui.preflight.PreflightScreen
import africa.devhub.resources.nav_preflight
import africa.devhub.resources.nav_bench
import africa.devhub.resources.nav_devmap
import africa.devhub.resources.drawer_deliver
import africa.devhub.resources.pf_report
import africa.devhub.resources.bn_new
import africa.devhub.resources.bn_r_title
import africa.devhub.resources.community_title
import africa.devhub.ui.community.CreatePostScreen
import africa.devhub.ui.community.FeedScreen
import africa.devhub.ui.community.PostScreen
import africa.devhub.messages.ConversationViewModel
import africa.devhub.messages.ConversationsViewModel
import africa.devhub.certs.CertsViewModel
import africa.devhub.news.LiveBoardViewModel
import africa.devhub.ui.certs.CertDetailScreen
import africa.devhub.ui.certs.CertificationsScreen
import africa.devhub.news.NewsViewModel
import africa.devhub.resources.certs_title
import africa.devhub.resources.skills_title
import africa.devhub.ui.components.openWeb
import africa.devhub.ui.news.LiveBoardScreen
import africa.devhub.ui.news.LiveRefresh
import androidx.compose.ui.platform.LocalUriHandler
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
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.ui.unit.dp
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
private data object CertsRoute

@Serializable
private data class CertRoute(val id: String)

@Serializable
private data object SkillsRoute

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
private data class RoomRoute(val code: String)

@Serializable
private data object CreateRoomRoute

@Serializable
private data object PreflightRoute

@Serializable
private data class PreflightReportRoute(val id: String)

@Serializable
private data object BenchRoute

@Serializable
private data class BenchRequestRoute(val id: String)

@Serializable
private data object BenchNewRoute

@Serializable
private data class BenchReportFormRoute(val id: String)

@Serializable
private data object DevMapRoute


/** Espace connecté : barre de navigation en bas, pile d'écrans par onglet. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SignedInArea(
    graph: AppGraph,
    me: Me,
    start: StartTarget,
    onStartHandled: () -> Unit,
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
    val unread by space.notifications.unread.collectAsStateWithLifecycle()
    // Juste après l'accueil : on ouvre la page que le plan a annoncée, une seule fois.
    LaunchedEffect(start) {
        when (start) {
            StartTarget.Certifications -> navController.navigate(CertsRoute)
            StartTarget.Jobs -> navController.navigate(JobsRoute)
            StartTarget.Sos -> navController.navigate(SosRoute)
            StartTarget.Projects -> navController.navigate(RoomsRoute)
            StartTarget.Preflight -> navController.navigate(PreflightRoute)
            StartTarget.Home -> Unit
        }
        if (start != StartTarget.Home) onStartHandled()
    }
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
    val onCert = destination?.hasRoute<CertRoute>() == true
    val onCerts = destination?.hasRoute<CertsRoute>() == true || onCert
    val onSkills = destination?.hasRoute<SkillsRoute>() == true
    val onCommunity = destination?.hasRoute<FeedRoute>() == true || destination?.hasRoute<PostRoute>() == true ||
        destination?.hasRoute<CreatePostRoute>() == true
    val onJobs = destination?.hasRoute<JobsRoute>() == true || destination?.hasRoute<JobRoute>() == true ||
        destination?.hasRoute<ApplicationsRoute>() == true
    val onConversations = destination?.hasRoute<ConversationsRoute>() == true || destination?.hasRoute<ConversationRoute>() == true
    val onSos = destination?.hasRoute<SosRoute>() == true
    val onRooms = destination?.hasRoute<RoomsRoute>() == true
    val onAlerts = destination?.hasRoute<NotificationsRoute>() == true
    val onPreflight = destination?.hasRoute<PreflightRoute>() == true
    val onPreflightReport = destination?.hasRoute<PreflightReportRoute>() == true
    val onBench = destination?.hasRoute<BenchRoute>() == true || destination?.hasRoute<BenchRequestRoute>() == true
    val onBenchNew = destination?.hasRoute<BenchNewRoute>() == true
    val onBenchReport = destination?.hasRoute<BenchReportFormRoute>() == true
    val onDevMap = destination?.hasRoute<DevMapRoute>() == true
    val onOwnProfile = destination?.hasRoute<PassportRoute>() == true && entry?.toRoute<PassportRoute>()?.handle == me.handle
    // Écrans empilés : titre et retour en haut ; l'onglet parent reste sélectionné en bas.
    val nestedTitle = when {
        onProofs -> Res.string.proofs_title
        onQuestion -> Res.string.nav_questions
        onAsk -> Res.string.ask_title
        onSync -> Res.string.sync_title
        onRoom -> Res.string.nav_projects
        onCreateRoom -> Res.string.rooms_create
        onDiscover -> Res.string.discover_title
        onRules -> Res.string.rules_title
        onSettings -> Res.string.home_settings
        onNews -> Res.string.news_title
        onCerts -> Res.string.certs_title
        onSkills -> Res.string.skills_title
        onCommunity -> Res.string.community_title
        onJobs -> Res.string.jobs_title
        onConversations -> Res.string.messages_title
        onSos -> Res.string.nav_questions
        onRooms -> Res.string.nav_projects
        onAlerts -> Res.string.nav_notifications
        onOwnProfile -> Res.string.nav_profile
        onPreflight -> Res.string.nav_preflight
        onPreflightReport -> Res.string.pf_report
        onBench -> Res.string.nav_bench
        onBenchNew -> Res.string.bn_new
        onBenchReport -> Res.string.bn_r_title
        onDevMap -> Res.string.nav_devmap
        else -> null
    }

    val drawerState = rememberDrawerState(DrawerValue.Closed)
    var confirmSignOut by remember { mutableStateOf(false) }
    // Feuilles de l'en-tête et de la barre d'onglets, comme le web mobile.
    var showCreate by remember { mutableStateOf(false) }
    var showSearch by remember { mutableStateOf(false) }
    if (confirmSignOut) {
        AlertDialog(
            onDismissRequest = { confirmSignOut = false },
            title = { Text(stringResource(Res.string.signout_title)) },
            text = { Text(pluralStringResource(Res.plurals.signout_pending, actions.size, actions.size)) },
            confirmButton = {
                TextButton(onClick = {
                    confirmSignOut = false
                    onSignOut()
                }) { Text(stringResource(Res.string.sign_out)) }
            },
            dismissButton = { TextButton(onClick = { confirmSignOut = false }) { Text(stringResource(Res.string.signout_cancel)) } },
        )
    }
    // Une entrée du tiroir ouvre toujours la racine de sa page : ni pile restaurée (on retombait sur
    // un détail au lieu de la liste), ni second Accueil empilé. Accueil, lui, dépile jusqu'à sa racine.
    val go: (Any) -> Unit = { route ->
        scope.launch { drawerState.close() }
        if (route == HomeRoute) {
            navController.popBackStack(HomeRoute, inclusive = false)
        } else {
            navController.navigate(route) {
                popUpTo(navController.graph.findStartDestination().id)
                launchSingleTop = true
            }
        }
    }
    val leaderboard = entry?.takeIf { onDiscover }?.toRoute<DiscoverRoute>()?.leaderboard == true
    val drawerKey = when {
        destination?.hasRoute<HomeRoute>() == true -> "home"
        onJobs -> "jobs"
        onDiscover && !leaderboard -> "devs"
        destination?.hasRoute<RoomsRoute>() == true || onRoom || onCreateRoom -> "projects"
        destination?.hasRoute<SosRoute>() == true || onQuestion || onAsk -> "questions"
        onCerts -> "certs"
        onSkills -> "tools"
        destination?.hasRoute<PassportRoute>() == true || onProofs -> "profile"
        onPreflight || onPreflightReport -> "preflight"
        onBench || onBenchNew || onBenchReport -> "bench"
        onDevMap -> "devmap"
        else -> null
    }
    val groups = listOf(
        DrawerGroup(
            null,
            listOf(
                DrawerEntry("home", stringResource(Res.string.nav_home), DevHubIcons.Home) { go(HomeRoute) },
                DrawerEntry("jobs", stringResource(Res.string.home_jobs), DevHubIcons.Jobs) { go(JobsRoute) },
                DrawerEntry("devs", stringResource(Res.string.nav_devs), DevHubIcons.Compass) { go(DiscoverRoute()) },
                DrawerEntry("projects", stringResource(Res.string.nav_projects), DevHubIcons.Folder) { go(RoomsRoute) },
            ),
        ),
        DrawerGroup(
            stringResource(Res.string.drawer_progress),
            listOf(
                DrawerEntry("certs", stringResource(Res.string.certs_title), DevHubIcons.Certification) { go(CertsRoute) },
                DrawerEntry("tools", stringResource(Res.string.nav_tools), DevHubIcons.Puzzle) { go(SkillsRoute) },
            ),
        ),
        DrawerGroup(
            stringResource(Res.string.drawer_deliver),
            listOf(
                DrawerEntry("preflight", stringResource(Res.string.nav_preflight), DevHubIcons.Rocket) { go(PreflightRoute) },
                DrawerEntry("bench", stringResource(Res.string.nav_bench), DevHubIcons.Smartphone) { go(BenchRoute) },
            ),
        ),
        DrawerGroup(
            stringResource(Res.string.drawer_network),
            listOf(
                DrawerEntry("profile", stringResource(Res.string.nav_profile), DevHubIcons.Person) { go(PassportRoute(me.handle)) },
                DrawerEntry("devmap", stringResource(Res.string.nav_devmap), DevHubIcons.Map) { go(DevMapRoute) },
            ),
        ),
    )
    // Écrans que le tiroir ou la barre du bas atteignent directement : menu en haut, pas de retour.
    val isRoot = listOf<kotlin.reflect.KClass<*>>(
        JobsRoute::class, DiscoverRoute::class, CertsRoute::class, NewsRoute::class, SkillsRoute::class,
        FeedRoute::class, ConversationsRoute::class, RulesRoute::class, SosRoute::class, RoomsRoute::class,
        NotificationsRoute::class, PreflightRoute::class, BenchRoute::class, DevMapRoute::class,
    ).any { destination?.hasRoute(it) == true } || onOwnProfile
    val onHome = destination?.hasRoute<HomeRoute>() == true
    // En-tête et barre d'onglets du web sur l'accueil et les écrans racine ; flèche retour ailleurs.
    val webChrome = onHome || isRoot
    val selectedTab = when {
        onHome -> MainTab.Home
        destination?.hasRoute<JobsRoute>() == true -> MainTab.Jobs
        destination?.hasRoute<CertsRoute>() == true -> MainTab.Certs
        onPreflight -> MainTab.Preflight
        else -> null
    }
    if (showCreate) {
        val createActions = listOf(
            CreateAction(stringResource(Res.string.create_sheet_post), stringResource(Res.string.create_sheet_post_hint), DevHubIcons.PenSquare) {
                showCreate = false
                navController.navigate(CreatePostRoute)
            },
            CreateAction(stringResource(Res.string.create_sheet_ask), stringResource(Res.string.create_sheet_ask_hint), DevHubIcons.Zap) {
                showCreate = false
                navController.navigate(AskRoute)
            },
            CreateAction(stringResource(Res.string.create_sheet_room), stringResource(Res.string.create_sheet_room_hint), DevHubIcons.FolderPlus) {
                showCreate = false
                navController.navigate(CreateRoomRoute)
            },
            CreateAction(stringResource(Res.string.create_sheet_app), stringResource(Res.string.create_sheet_app_hint), DevHubIcons.PlaneTakeoff) {
                showCreate = false
                go(PreflightRoute)
            },
        )
        CreateSheet(createActions, onDismiss = { showCreate = false })
    }
    if (showSearch) {
        val searchEntries = groups.flatMap { it.entries } + listOf(
            DrawerEntry("messages", stringResource(Res.string.messages_title), DevHubIcons.Chat) { navController.navigate(ConversationsRoute) },
            DrawerEntry("alerts", stringResource(Res.string.nav_notifications), DevHubIcons.Bell) { navController.navigate(NotificationsRoute) },
            DrawerEntry("questions", stringResource(Res.string.nav_questions), DevHubIcons.Help) { go(SosRoute) },
            DrawerEntry("news", stringResource(Res.string.news_title), DevHubIcons.News) { go(NewsRoute) },
            DrawerEntry("settings", stringResource(Res.string.home_settings), DevHubIcons.Settings) { go(SettingsRoute) },
        )
        SearchSheet(
            entries = searchEntries.map { e -> DrawerEntry(e.key, e.label, e.icon) { showSearch = false; e.onClick() } },
            onDismiss = { showSearch = false },
        )
    }
    ModalNavigationDrawer(
        drawerState = drawerState,
        gesturesEnabled = true,
        drawerContent = {
            AppDrawer(
                groups = groups,
                selectedKey = drawerKey,
                name = me.displayName,
                subtitle = "@${me.handle}",
                settingsLabel = stringResource(Res.string.home_settings),
                onSettings = { go(SettingsRoute) },
                // O9 : prévenir avant d'effacer des actions qui n'ont pas encore été envoyées.
                signOut = DrawerEntry("signout", stringResource(Res.string.sign_out), DevHubIcons.SignOut) {
                    scope.launch { drawerState.close() }
                    if (actions.isNotEmpty()) confirmSignOut = true else onSignOut()
                },
            )
        },
    ) {
    Scaffold(
        topBar = {
            if (webChrome) {
                Column {
                    WebTopBar(
                        me = me,
                        unread = unread,
                        onMenu = { scope.launch { drawerState.open() } },
                        onSearch = { showSearch = true },
                        onMessages = { navController.navigate(ConversationsRoute) { launchSingleTop = true } },
                        onAlerts = { navController.navigate(NotificationsRoute) { launchSingleTop = true } },
                        onProfile = { go(PassportRoute(me.handle)) },
                    )
                    // Titre de la page sous l'en-tête, comme le titre en tête des pages du web.
                    if (!onHome && !onCerts && nestedTitle != null) {
                        Text(
                            stringResource(nestedTitle),
                            style = MaterialTheme.typography.headlineSmall,
                            modifier = Modifier.padding(start = 20.dp, end = 20.dp, top = 16.dp, bottom = 4.dp),
                        )
                    }
                }
            } else if (nestedTitle != null) {
                TopAppBar(
                    title = { if (!onCerts) Text(stringResource(nestedTitle), style = MaterialTheme.typography.titleMedium) },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
                    actions = {
                        // Un écran de détail n'a que la flèche retour : un accès direct à l'accueil, comme le logo du web.
                        if (!isRoot) {
                            IconButton(onClick = { go(HomeRoute) }) {
                                Icon(DevHubIcons.Home, contentDescription = stringResource(Res.string.nav_home))
                            }
                        }
                        // Les alertes restent à portée de pouce partout, pas seulement sur l'accueil.
                        if (isRoot && !onConversations) {
                            IconButton(onClick = { navController.navigate(ConversationsRoute) { launchSingleTop = true } }) {
                                Icon(DevHubIcons.Chat, contentDescription = stringResource(Res.string.messages_title))
                            }
                        }
                        if (isRoot && !onAlerts) {
                            IconButton(onClick = { navController.navigate(NotificationsRoute) { launchSingleTop = true } }) {
                                BadgedBox(badge = { if (unread > 0) Badge { Text(if (unread > 99) "99+" else unread.toString()) } }) {
                                    Icon(DevHubIcons.Bell, contentDescription = stringResource(Res.string.nav_notifications))
                                }
                            }
                        }
                    },
                    navigationIcon = {
                        if (isRoot) {
                            IconButton(onClick = { scope.launch { drawerState.open() } }) {
                                Icon(DevHubIcons.Menu, contentDescription = stringResource(Res.string.home_menu))
                            }
                        } else {
                            IconButton(onClick = { navController.navigateUp() }) {
                                Icon(DevHubIcons.Back, contentDescription = stringResource(Res.string.email_back))
                            }
                        }
                    },
                )
            }
        },
        bottomBar = {
            if (webChrome) {
                WebTabBar(
                    selected = selectedTab,
                    onSelect = { tab ->
                        when (tab) {
                            MainTab.Home -> go(HomeRoute)
                            MainTab.Jobs -> go(JobsRoute)
                            MainTab.Certs -> go(CertsRoute)
                            MainTab.Preflight -> go(PreflightRoute)
                        }
                    },
                    onCreate = { showCreate = true },
                )
            }
        },
        containerColor = androidx.compose.ui.graphics.Color.Transparent,
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
                    val newsVm = viewModel { NewsViewModel(graph.newsApi, space, lang = "all") }
                    val newsState by newsVm.state.collectAsStateWithLifecycle()
                    val feedVm = viewModel { FeedViewModel(graph.communityApi, space) }
                    val feedState by feedVm.state.collectAsStateWithLifecycle()
                    val uriHandler = LocalUriHandler.current
                    HomeScreen(
                        me = me,
                        unread = unread,
                        news = newsState,
                        feed = feedState,
                        links = HomeLinks(
                            onOpenArticle = { uriHandler.openWeb(it.url) },
                            onCompose = { navController.navigate(CreatePostRoute) },
                            onAsk = { navController.navigate(AskRoute) },
                            onOpenPost = { navController.navigate(PostRoute(it)) },
                            onMenu = { scope.launch { drawerState.open() } },
                            onAlerts = { navController.navigate(NotificationsRoute) },
                            onMessages = { navController.navigate(ConversationsRoute) },
                            onQuestions = { navController.navigate(SosRoute) },
                            onTest = { navController.navigate(BenchNewRoute) },
                        ),
                        onCommunity = feedVm::setCommunity,
                        onReload = {
                            newsVm.reload()
                            feedVm.reload()
                        },
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
                composable<CertsRoute> {
                    val vm = viewModel { CertsViewModel(graph.certsApi) }
                    val state by vm.state.collectAsStateWithLifecycle()
                    val liveVm = viewModel { LiveBoardViewModel(graph.newsApi, "cert") }
                    val live by liveVm.state.collectAsStateWithLifecycle()
                    LiveRefresh(liveVm::refresh)
                    CertificationsScreen(
                        state = state,
                        live = live,
                        onView = vm::setView,
                        onQuery = vm::setQuery,
                        onPrice = vm::setPrice,
                        onLevel = vm::setLevel,
                        onLiveRetry = liveVm::reload,
                        onOpenCert = { navController.navigate(CertRoute(it)) },
                    )
                }
                composable<CertRoute> { entry ->
                    val id = entry.toRoute<CertRoute>().id
                    val vm = viewModel { CertsViewModel(graph.certsApi) }
                    val state by vm.state.collectAsStateWithLifecycle()
                    CertDetailScreen(id, state.mine.firstOrNull { it.certId == id })
                }
                composable<SkillsRoute> {
                    val vm = viewModel { LiveBoardViewModel(graph.newsApi, "skill") }
                    val board by vm.state.collectAsStateWithLifecycle()
                    LiveRefresh(vm::refresh)
                    LiveBoardScreen("skill", board, onCategory = vm::setCategory, onQuery = vm::setQuery, onRetry = vm::reload)
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
                    val liveVm = viewModel { LiveBoardViewModel(graph.newsApi, "job") }
                    val live by liveVm.state.collectAsStateWithLifecycle()
                    LiveRefresh(liveVm::refresh)
                    JobsScreen(
                        state = state,
                        onFilters = vm::setFilters,
                        onRetry = vm::reload,
                        onOpen = { navController.navigate(JobRoute(it)) },
                        onApplications = { navController.navigate(ApplicationsRoute) },
                        live = live,
                        onLiveRefresh = { liveVm.reload() },
                        onLiveRetry = liveVm::reload,
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
                composable<RulesRoute> {
                    val vm = viewModel { RulesViewModel(graph.discoverApi, space) }
                    val state by vm.state.collectAsStateWithLifecycle()
                    RulesScreen(state, vm::load)
                }
                composable<PreflightRoute> {
                    val vm = viewModel { PreflightViewModel(graph.preflightApi) }
                    val state by vm.state.collectAsStateWithLifecycle()
                    LaunchedEffect(Unit) { vm.reload() }
                    PreflightScreen(
                        state = state,
                        onRun = { url, repo -> vm.run(url, repo) { navController.navigate(PreflightReportRoute(it)) } },
                        onOpen = { navController.navigate(PreflightReportRoute(it)) },
                        onRetry = vm::reload,
                    )
                }
                composable<PreflightReportRoute> { backStack ->
                    val id = backStack.toRoute<PreflightReportRoute>().id
                    val vm = viewModel { PreflightReportViewModel(graph.preflightApi, id) }
                    val state by vm.state.collectAsStateWithLifecycle()
                    PreflightReportScreen(state, vm::load)
                }
                composable<BenchRoute> {
                    val vm = viewModel { BenchListViewModel(graph.benchApi) }
                    val state by vm.state.collectAsStateWithLifecycle()
                    // Au retour d'une fiche ou d'un formulaire, la liste se relit.
                    LaunchedEffect(Unit) { vm.reload() }
                    BenchScreen(state, vm::setScope, onOpen = { navController.navigate(BenchRequestRoute(it)) }, onNew = { navController.navigate(BenchNewRoute) }, onRetry = vm::reload)
                }
                composable<BenchRequestRoute> { backStack ->
                    val id = backStack.toRoute<BenchRequestRoute>().id
                    val vm = viewModel { BenchDetailViewModel(graph.benchApi, id) }
                    val state by vm.state.collectAsStateWithLifecycle()
                    LaunchedEffect(Unit) { vm.load() }
                    BenchDetailScreen(state, onReport = { navController.navigate(BenchReportFormRoute(id)) }, onReview = vm::review, onToggle = vm::setOpen, onRetry = vm::load)
                }
                composable<BenchNewRoute> {
                    val vm = viewModel { BenchCreateViewModel(graph.benchApi) }
                    val state by vm.state.collectAsStateWithLifecycle()
                    BenchCreateScreen(state, vm::edit) {
                        vm.send { id -> navController.navigate(BenchRequestRoute(id)) { popUpTo<BenchNewRoute> { inclusive = true } } }
                    }
                }
                composable<BenchReportFormRoute> { backStack ->
                    val id = backStack.toRoute<BenchReportFormRoute>().id
                    val vm = viewModel { BenchReportViewModel(graph.benchApi, id) }
                    val state by vm.state.collectAsStateWithLifecycle()
                    BenchReportScreen(state, vm::edit) { vm.send { navController.popBackStack() } }
                }
                composable<DevMapRoute> {
                    val vm = viewModel { DevMapViewModel(graph.discoverApi) }
                    val state by vm.state.collectAsStateWithLifecycle()
                    DevMapScreen(state, vm::reload)
                }
                composable<SettingsRoute> {
                    val vm = viewModel { SettingsViewModel(graph.meApi, graph.passportApi, me, space, onMeUpdated, onAccountDeleted) }
                    val state by vm.state.collectAsStateWithLifecycle()
                    SettingsScreen(state, me.handle, vm::edit, vm::save, vm::deleteAccount, onRules = { navController.navigate(RulesRoute) })
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
                        lang = me.uiLang,
                        onRetry = vm::load,
                        onRefreshGithub = vm::refreshGithub,
                        onSeeProofs = { navController.navigate(ProofsRoute(handle)) },
                        onEdit = { navController.navigate(SettingsRoute) },
                        onCerts = { navController.navigate(CertsRoute) },
                        shareUrl = "${graph.config.apiBaseUrl.trimEnd('/')}/u/$handle",
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
                    val reviewsVm = viewModel { FeedbackViewModel(graph.roomsApi, graph.passportApi, me.handle) }
                    val reviews by reviewsVm.state.collectAsStateWithLifecycle()
                    RoomsScreen(
                        state = state,
                        onMine = vm::setMine,
                        onQuery = vm::setQuery,
                        onRetry = { vm.reload() },
                        onLoadMore = vm::loadMore,
                        onOpen = { navController.navigate(RoomRoute(it)) },
                        onCreate = { navController.navigate(CreateRoomRoute) },
                        reviews = reviews,
                        reviewActions = FeedbackActions(
                            onStackOnly = reviewsVm::setStackOnly,
                            onRetry = reviewsVm::reload,
                            onTake = reviewsVm::take,
                            onConfirm = reviewsVm::confirm,
                            onCancel = reviewsVm::cancel,
                            onDismissNotice = reviewsVm::dismissNotice,
                            onOpenRoom = { navController.navigate(RoomRoute(it)) },
                            isMine = reviewsVm::isMine,
                            isMyReview = reviewsVm::isMyReview,
                        ),
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
}
