package africa.devhub.ui.components

import africa.devhub.resources.Res
import africa.devhub.resources.loading
import africa.devhub.resources.retry
import africa.devhub.resources.sign_out
import africa.devhub.resources.unreachable_text
import africa.devhub.resources.unreachable_title
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import org.jetbrains.compose.resources.stringResource

@Composable
fun LoadingScreen() {
    val label = stringResource(Res.string.loading)
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(Modifier.semantics { contentDescription = label })
    }
}

@Composable
fun UnreachableScreen(onRetry: () -> Unit, onSignOut: () -> Unit) {
    ScreenColumn(verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically)) {
        Text(stringResource(Res.string.unreachable_title), style = MaterialTheme.typography.headlineSmall)
        Text(
            stringResource(Res.string.unreachable_text),
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Button(onClick = onRetry, modifier = Modifier.fillMaxWidth().padding(top = 8.dp)) {
            Text(stringResource(Res.string.retry))
        }
        TextButton(onClick = onSignOut, modifier = Modifier.fillMaxWidth()) {
            Text(stringResource(Res.string.sign_out))
        }
    }
}
