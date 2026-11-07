package africa.devhub.ui

import africa.devhub.app.AppGraph
import africa.devhub.app.AppState
import africa.devhub.app.AppViewModel
import africa.devhub.ui.components.LoadingScreen
import africa.devhub.ui.components.UnreachableScreen
import africa.devhub.ui.conduct.ConductScreen
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

/** Racine de l'interface, commune à Android et iOS. */
@Composable
fun DevHubApp(graph: AppGraph) {
    val viewModel = viewModel {
        AppViewModel(graph.sessions, graph.auth, graph.meApi, graph.deviceCache, graph::forgetUser)
    }
    val state by viewModel.state.collectAsStateWithLifecycle()

    DevHubTheme {
        Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
            when (val s = state) {
                AppState.Loading -> LoadingScreen()
                is AppState.SignedOut -> SignInScreen(
                    state = s,
                    devSignIn = graph.config.devSignIn,
                    onSignInWithGithub = viewModel::signInWithGithub,
                    onSignInWithEmail = viewModel::signInWithEmail,
                    onRegisterWithEmail = viewModel::registerWithEmail,
                )
                AppState.Unreachable -> UnreachableScreen(viewModel::retry, viewModel::signOut)
                is AppState.NeedsConduct -> ConductScreen(s, viewModel::acceptCodeOfConduct, viewModel::signOut)
                is AppState.SignedIn -> SignedInArea(graph, s.me, viewModel::signOut)
            }
        }
    }
}
