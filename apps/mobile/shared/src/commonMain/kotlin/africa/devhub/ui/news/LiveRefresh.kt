package africa.devhub.ui.news

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.lifecycle.compose.LifecycleResumeEffect
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/** Les tableaux « en direct » se relisent toutes les 5 minutes, comme sur le web. */
private const val LIVE_REFRESH_MS = 5 * 60_000L

/**
 * Relit un tableau « en direct » au retour au premier plan puis toutes les 5 minutes tant que
 * l'écran est visible ; en arrière-plan, plus aucune requête.
 */
@Composable
fun LiveRefresh(onRefresh: () -> Unit) {
    val current by rememberUpdatedState(onRefresh)
    val scope = rememberCoroutineScope()
    LifecycleResumeEffect(Unit) {
        val loop = scope.launch {
            current()
            while (true) {
                delay(LIVE_REFRESH_MS)
                current()
            }
        }
        onPauseOrDispose { loop.cancel() }
    }
}
