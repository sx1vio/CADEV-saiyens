package africa.devhub.ui

import androidx.compose.runtime.remember
import androidx.compose.runtime.CompositionLocalProvider
import io.ktor.http.encodeURLParameter
import coil3.network.ktor3.KtorNetworkFetcherFactory
import coil3.compose.setSingletonImageLoaderFactory
import coil3.ImageLoader
import africa.devhub.ui.components.LocalImageProxy
import africa.devhub.app.AppGraph
import africa.devhub.app.AppState
import africa.devhub.app.AppViewModel
import africa.devhub.ui.components.LoadingScreen
import africa.devhub.ui.components.UnreachableScreen
import africa.devhub.ui.onboarding.OnboardingScreen
import africa.devhub.ui.signin.SignInScreen
import africa.devhub.ui.theme.DevHubTheme
import africa.devhub.ui.theme.pageTint
import androidx.compose.foundation.background
import androidx.compose.ui.graphics.Color
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

    val imageBase = graph.config.apiBaseUrl.trimEnd('/')
    val imageProxy = remember(imageBase) {
        { url: String, width: Int -> "$imageBase/api/v1/img?w=$width&u=${url.encodeURLParameter()}" }
    }
    setSingletonImageLoaderFactory { context -> ImageLoader.Builder(context).components { add(KtorNetworkFetcherFactory()) }.build() }

    DevHubTheme {
      CompositionLocalProvider(LocalImageProxy provides imageProxy) {
        Surface(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background).pageTint(), color = Color.Transparent) {
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
                is AppState.NeedsConduct -> OnboardingScreen(s, viewModel::completeOnboarding, viewModel::signOut)
                is AppState.SignedIn -> SignedInArea(graph, s.me, s.start, viewModel::signOut, viewModel::meUpdated, viewModel::accountDeleted)
            }
        }
      }
    }
}
