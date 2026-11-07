package africa.devhub.android

import africa.devhub.app.AppGraph
import africa.devhub.core.AppConfig
import africa.devhub.offline.LocalFiles
import africa.devhub.platform.AndroidAuthBrowser
import africa.devhub.platform.AndroidConnectivityProbe
import africa.devhub.platform.AndroidSecureStore
import android.app.Application
import okio.FileSystem

/** Le graphe vit autant que le processus : la session survit aux rotations d'écran. */
class DevHubApplication : Application() {
    val authBrowser = AndroidAuthBrowser()

    val graph: AppGraph by lazy {
        AppGraph(
            config = AppConfig(apiBaseUrl = BuildConfig.API_URL, devSignIn = BuildConfig.DEBUG),
            secureStore = AndroidSecureStore(this),
            authBrowser = authBrowser,
            storage = LocalFiles(FileSystem.SYSTEM, filesDir.resolve("devhub").absolutePath),
            connectivityProbe = AndroidConnectivityProbe(this),
        )
    }
}
