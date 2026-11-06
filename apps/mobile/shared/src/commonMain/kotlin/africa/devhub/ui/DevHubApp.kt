package africa.devhub.ui

import africa.devhub.app.AppGraph
import africa.devhub.app.AppState
import africa.devhub.app.AppViewModel
import africa.devhub.me.Me
import africa.devhub.ui.components.LoadingScreen
import africa.devhub.ui.components.UnreachableScreen
import africa.devhub.ui.conduct.ConductScreen
import africa.devhub.ui.home.HomeScreen
import africa.devhub.ui.signin.SignInScreen
import africa.devhub.ui.theme.DevHubTheme
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import kotlinx.serialization.Serializable

/** Racine de l'interface, commune à Android et iOS. */
@Composable
fun DevHubApp(graph: AppGraph) {
    val viewModel = viewModel { AppViewModel(graph.sessions, graph.auth, graph.meApi) }
    val state by viewModel.state.collectAsStateWithLifecycle()

    DevHubTheme {
        Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
            when (val s = state) {
                AppState.Loading -> LoadingScreen()
                is AppState.SignedOut -> SignInScreen(
                    state = s,
                    devSignIn = graph.config.devSignIn,
                    onSignInWithGithub = viewModel::signInWithGithub,
                )
                AppState.Unreachable -> UnreachableScreen(viewModel::retry, viewModel::signOut)
                is AppState.NeedsConduct -> ConductScreen(s, viewModel::acceptCodeOfConduct, viewModel::signOut)
                is AppState.SignedIn -> SignedInNavHost(s.me, viewModel::signOut)
            }
        }
    }
}

// Destinations de l'espace connecté ; les étapes suivantes (ADR-0021) y ajoutent leurs écrans.
@Serializable
private data object HomeRoute

@Composable
private fun SignedInNavHost(me: Me, onSignOut: () -> Unit) {
    val navController = rememberNavController()
    NavHost(navController = navController, startDestination = HomeRoute) {
        composable<HomeRoute> { HomeScreen(me, onSignOut) }
    }
}
