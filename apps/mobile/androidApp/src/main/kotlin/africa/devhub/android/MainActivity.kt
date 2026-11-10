package africa.devhub.android

import africa.devhub.ui.DevHubApp
import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge

class MainActivity : ComponentActivity() {
    private val app: DevHubApplication get() = application as DevHubApplication

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        app.authBrowser.attach(this)
        app.authBrowser.onDeepLink(intent?.dataString)
        setContent { DevHubApp(app.graph) }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        app.authBrowser.onDeepLink(intent.dataString)
    }

    override fun onPause() {
        super.onPause()
        app.authBrowser.onPause()
    }

    override fun onResume() {
        super.onResume()
        app.authBrowser.attach(this)
        app.authBrowser.onResume()
        app.graph.onForeground()
    }
}
