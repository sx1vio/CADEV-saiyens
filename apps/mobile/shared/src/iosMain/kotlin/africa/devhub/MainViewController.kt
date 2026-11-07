package africa.devhub

import africa.devhub.app.AppGraph
import africa.devhub.core.AppConfig
import africa.devhub.offline.ConnectivityProbe
import africa.devhub.offline.LocalFiles
import africa.devhub.platform.IosAuthBrowser
import africa.devhub.platform.IosAuthSession
import africa.devhub.platform.SecureStore
import africa.devhub.ui.DevHubApp
import androidx.compose.ui.window.ComposeUIViewController
import okio.FileSystem
import platform.Foundation.NSApplicationSupportDirectory
import platform.Foundation.NSSearchPathForDirectoriesInDomains
import platform.Foundation.NSUserDomainMask
import platform.UIKit.UIViewController

/**
 * Point d'entrée iOS, appelé une fois depuis Swift (ContentView.swift).
 *
 * @param secureStore Keychain (KeychainStore.swift).
 * @param authSession ASWebAuthenticationSession (WebAuthSession.swift).
 * @param connectivity NWPathMonitor (NetworkMonitor.swift).
 */
fun MainViewController(
    apiBaseUrl: String,
    devSignIn: Boolean,
    secureStore: SecureStore,
    authSession: IosAuthSession,
    connectivity: ConnectivityProbe,
): UIViewController {
    val graph = AppGraph(
        config = AppConfig(apiBaseUrl = apiBaseUrl, devSignIn = devSignIn),
        secureStore = secureStore,
        authBrowser = IosAuthBrowser(authSession),
        storage = LocalFiles(FileSystem.SYSTEM, "${applicationSupportDirectory()}/devhub"),
        connectivityProbe = connectivity,
    )
    return ComposeUIViewController { DevHubApp(graph) }
}

/** Dossier « Application Support » de l'application : privé, sauvegardé, jamais visible de l'utilisateur. */
private fun applicationSupportDirectory(): String =
    NSSearchPathForDirectoriesInDomains(NSApplicationSupportDirectory, NSUserDomainMask, true).first() as String
