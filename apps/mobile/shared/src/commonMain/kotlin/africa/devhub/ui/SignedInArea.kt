package africa.devhub.ui

import africa.devhub.app.AppGraph
import africa.devhub.me.Me
import africa.devhub.passport.PassportViewModel
import africa.devhub.passport.ProofsViewModel
import africa.devhub.resources.Res
import africa.devhub.resources.email_back
import africa.devhub.resources.nav_home
import africa.devhub.resources.nav_passport
import africa.devhub.resources.proofs_title
import africa.devhub.ui.components.DevHubIcons
import africa.devhub.ui.home.HomeScreen
import africa.devhub.ui.passport.PassportScreen
import africa.devhub.ui.passport.ProofsScreen
import androidx.compose.foundation.layout.Box
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

private data class TopLevel(val label: StringResource, val icon: ImageVector, val route: Any)

/** Espace connecté : barre de navigation en bas, pile d'écrans par onglet. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SignedInArea(graph: AppGraph, me: Me, onSignOut: () -> Unit) {
    val navController = rememberNavController()
    val entry by navController.currentBackStackEntryAsState()
    val destination = entry?.destination
    val tabs = listOf(
        TopLevel(Res.string.nav_home, DevHubIcons.Home, HomeRoute),
        TopLevel(Res.string.nav_passport, DevHubIcons.Person, PassportRoute(me.handle)),
    )
    val onProofs = destination?.hasRoute<ProofsRoute>() == true

    Scaffold(
        topBar = {
            if (onProofs) {
                TopAppBar(
                    title = { Text(stringResource(Res.string.proofs_title)) },
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
        Box(Modifier.fillMaxSize().padding(padding).consumeWindowInsets(padding)) {
            NavHost(navController = navController, startDestination = HomeRoute) {
                composable<HomeRoute> { HomeScreen(me, onSignOut) }
                composable<PassportRoute> { backStack ->
                    val handle = backStack.toRoute<PassportRoute>().handle
                    val vm = viewModel { PassportViewModel(graph.passportApi, handle) }
                    val state by vm.state.collectAsStateWithLifecycle()
                    PassportScreen(
                        state = state,
                        isMine = handle.equals(me.handle, ignoreCase = true),
                        onRetry = vm::load,
                        onRefreshGithub = vm::refreshGithub,
                        onSeeProofs = { navController.navigate(ProofsRoute(handle)) },
                    )
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
