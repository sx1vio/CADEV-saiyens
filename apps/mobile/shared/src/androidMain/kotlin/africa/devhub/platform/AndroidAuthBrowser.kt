package africa.devhub.platform

import android.app.Activity
import android.content.ActivityNotFoundException
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import java.lang.ref.WeakReference
import kotlinx.coroutines.CompletableDeferred

/**
 * Connexion dans un Custom Tab (navigateur système). Le retour `devhub://…` rouvre
 * l'activité (launchMode singleTask), qui le transmet par [onDeepLink].
 *
 * L'activité appelle [attach], [onPause], [onResume] et [onDeepLink] ; tout se passe sur le
 * fil principal. Revenir dans l'application sans lien de retour vaut annulation.
 */
class AndroidAuthBrowser : AuthBrowser {
    private var activity: WeakReference<Activity>? = null
    private var pending: CompletableDeferred<String?>? = null
    private var scheme: String? = null
    private var leftForBrowser = false

    fun attach(activity: Activity) {
        this.activity = WeakReference(activity)
    }

    override suspend fun authenticate(url: String, callbackScheme: String): String? {
        val host = activity?.get() ?: return null
        pending?.complete(null)
        val result = CompletableDeferred<String?>()
        pending = result
        scheme = callbackScheme
        leftForBrowser = false
        try {
            CustomTabsIntent.Builder().setShowTitle(true).build().launchUrl(host, Uri.parse(url))
        } catch (_: ActivityNotFoundException) {
            pending = null
            return null
        }
        return try {
            result.await()
        } finally {
            if (pending === result) pending = null
        }
    }

    /** Lien reçu par l'activité ; renvoie true s'il s'agissait du retour de connexion. */
    fun onDeepLink(uri: String?): Boolean {
        val expected = scheme ?: return false
        if (uri == null || !uri.startsWith("$expected:")) return false
        pending?.complete(uri)
        pending = null
        return true
    }

    fun onPause() {
        if (pending != null) leftForBrowser = true
    }

    fun onResume() {
        // onNewIntent (le lien de retour) arrive avant onResume : s'il n'est pas venu, c'est une annulation.
        if (leftForBrowser) pending?.complete(null)
        leftForBrowser = false
    }
}
