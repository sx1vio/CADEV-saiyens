package africa.devhub.ui

import africa.devhub.app.AppGraph
import africa.devhub.me.Me
import africa.devhub.passport.PassportViewModel
import africa.devhub.passport.ProofsViewModel
import africa.devhub.resources.Res
import africa.devhub.resources.email_back
import africa.devhub.resources.nav_home
import africa.devhub.resources.nav_passport
import africa.devhub.resources.nav_rooms
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
import africa.devhub.ui.home.HomeScreen
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
private data class RoomRoute(val code: String)

@Serializable
private data object CreateRoomRoute

private data class TopLevel(val label: StringResource, val icon: ImageVector, val route: Any)

/** Espace connecté : barre de navigation en bas, pile d'écrans par onglet. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SignedInArea(graph: AppGraph, me: Me, onSignOut: () -> Unit) {
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
        TopLevel(Res.string.nav_passport, DevHubIcons.Person, PassportRoute(me.handle)),
    )
    val onProofs = destination?.hasRoute<ProofsRoute>() == true
    val onQuestion = destination?.hasRoute<QuestionRoute>() == true
    val onAsk = destination?.hasRoute<AskRoute>() == true
    val onSync = destination?.hasRoute<SyncRoute>() == true
    val onRoom = destination?.hasRoute<RoomRoute>() == true
    val onCreateRoom = destination?.hasRoute<CreateRoomRoute>() == true
    // Écrans empilés : titre et retour en haut ; l'onglet parent reste sélectionné en bas.
    val nestedTitle = when {
        onProofs -> Res.string.proofs_title
        onQuestion -> Res.string.nav_sos
        onAsk -> Res.string.ask_title
        onSync -> Res.string.sync_title
        onRoom -> Res.string.nav_rooms
        onCreateRoom -> Res.string.rooms_create
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
                        is HomeRoute -> destination?.hasRoute<HomeRoute>() == true
                        is SosRoute -> destination?.hasRoute<SosRoute>() == true || onQuestion || onAsk
                        is RoomsRoute -> destination?.hasRoute<RoomsRoute>() == true || onRoom || onCreateRoom
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
                        icon = { Icon(tab.icon, contentDescription = null) },
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
                composable<HomeRoute> { HomeScreen(me, actions.size, onSignOut) }
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
                    PassportScreen(
                        state = state,
                        isMine = handle.equals(me.handle, ignoreCase = true),
                        onRetry = vm::load,
                        onRefreshGithub = vm::refreshGithub,
                        onSeeProofs = { navController.navigate(ProofsRoute(handle)) },
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
