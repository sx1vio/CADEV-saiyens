package africa.devhub.ui.conduct

import africa.devhub.app.AppState
import africa.devhub.resources.Res
import africa.devhub.resources.conduct_1
import africa.devhub.resources.conduct_2
import africa.devhub.resources.conduct_3
import africa.devhub.resources.conduct_4
import africa.devhub.resources.conduct_accept
import africa.devhub.resources.conduct_failed
import africa.devhub.resources.conduct_text
import africa.devhub.resources.conduct_title
import africa.devhub.resources.sign_out
import africa.devhub.ui.components.ScreenColumn
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import org.jetbrains.compose.resources.stringResource

/** M3 : le code de conduite est accepté une fois, avant toute contribution. */
@Composable
fun ConductScreen(state: AppState.NeedsConduct, onAccept: () -> Unit, onSignOut: () -> Unit) {
    val rules = listOf(Res.string.conduct_1, Res.string.conduct_2, Res.string.conduct_3, Res.string.conduct_4)
    ScreenColumn {
        Text(
            stringResource(Res.string.conduct_title),
            style = MaterialTheme.typography.headlineSmall,
            modifier = Modifier.semantics { heading() },
        )
        Text(
            stringResource(Res.string.conduct_text),
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Card(Modifier.fillMaxWidth()) {
            rules.forEachIndexed { index, rule ->
                Row(Modifier.padding(horizontal = 16.dp, vertical = 12.dp)) {
                    Text(
                        "${index + 1}.",
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.padding(end = 12.dp),
                    )
                    Text(stringResource(rule), style = MaterialTheme.typography.bodyLarge)
                }
            }
        }
        if (state.failed) {
            Text(
                stringResource(Res.string.conduct_failed),
                color = MaterialTheme.colorScheme.error,
                modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
            )
        }
        Button(
            onClick = onAccept,
            enabled = !state.busy,
            modifier = Modifier.fillMaxWidth().height(52.dp),
        ) {
            Text(stringResource(Res.string.conduct_accept))
        }
        TextButton(onClick = onSignOut, modifier = Modifier.fillMaxWidth()) {
            Text(stringResource(Res.string.sign_out))
        }
    }
}
