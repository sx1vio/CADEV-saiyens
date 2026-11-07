package africa.devhub.ui.components

import africa.devhub.resources.Res
import africa.devhub.resources.net_failed
import africa.devhub.resources.net_offline
import africa.devhub.resources.net_open_center
import africa.devhub.resources.net_pending
import africa.devhub.resources.net_syncing
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.onClick
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import org.jetbrains.compose.resources.pluralStringResource
import org.jetbrains.compose.resources.stringResource

/**
 * État du réseau et de la file (O3), visible dès qu'il y a quelque chose à dire : hors ligne,
 * synchronisation, actions en attente ou en échec. Un appui ouvre le centre de synchronisation.
 */
@Composable
fun NetworkBar(online: Boolean, syncing: Boolean, pending: Int, failed: Int, onOpen: () -> Unit) {
    if (online && !syncing && pending == 0 && failed == 0) return
    val parts = buildList {
        when {
            !online -> add(stringResource(Res.string.net_offline))
            syncing -> add(stringResource(Res.string.net_syncing))
        }
        if (pending > 0) add(pluralStringResource(Res.plurals.net_pending, pending, pending))
        if (failed > 0) add(pluralStringResource(Res.plurals.net_failed, failed, failed))
    }
    val error = failed > 0 || !online
    val openLabel = stringResource(Res.string.net_open_center)
    Surface(
        color = if (error) MaterialTheme.colorScheme.errorContainer else MaterialTheme.colorScheme.primaryContainer,
        contentColor = if (error) MaterialTheme.colorScheme.onErrorContainer else MaterialTheme.colorScheme.onPrimaryContainer,
        modifier = Modifier
            .fillMaxWidth()
            .clickable(role = Role.Button, onClick = onOpen)
            .semantics {
                liveRegion = LiveRegionMode.Polite
                onClick(label = openLabel) { onOpen(); true }
            },
    ) {
        Text(
            parts.joinToString(" · "),
            style = MaterialTheme.typography.labelLarge,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
        )
    }
}
