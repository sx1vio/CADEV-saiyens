package africa.devhub

import africa.devhub.app.AppGraph
import africa.devhub.core.AppConfig
import africa.devhub.platform.IosAuthBrowser
import africa.devhub.platform.IosAuthSession
import africa.devhub.platform.SecureStore
import africa.devhub.ui.DevHubApp
import androidx.compose.ui.window.ComposeUIViewController
import platform.UIKit.UIViewController

/**
 * Point d'entrée iOS, appelé une fois depuis Swift (ContentView.swift).
 *
 * @param secureStore Keychain (KeychainStore.swift).
 * @param authSession ASWebAuthenticationSession (WebAuthSession.swift).
 */
fun MainViewController(
    apiBaseUrl: String,
    devSignIn: Boolean,
    secureStore: SecureStore,
    authSession: IosAuthSession,
): UIViewController {
    val graph = AppGraph(
        config = AppConfig(apiBaseUrl = apiBaseUrl, devSignIn = devSignIn),
        secureStore = secureStore,
        authBrowser = IosAuthBrowser(authSession),
    )
    return ComposeUIViewController { DevHubApp(graph) }
}
