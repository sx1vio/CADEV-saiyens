package africa.devhub.android

import africa.devhub.app.AppGraph
import africa.devhub.core.AppConfig
import africa.devhub.platform.AndroidAuthBrowser
import africa.devhub.platform.AndroidSecureStore
import android.app.Application

/** Le graphe vit autant que le processus : la session survit aux rotations d'écran. */
class DevHubApplication : Application() {
    val authBrowser = AndroidAuthBrowser()

    val graph: AppGraph by lazy {
        AppGraph(
            config = AppConfig(apiBaseUrl = BuildConfig.API_URL, devSignIn = BuildConfig.DEBUG),
            secureStore = AndroidSecureStore(this),
            authBrowser = authBrowser,
        )
    }
}
