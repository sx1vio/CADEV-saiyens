package africa.devhub.ui.home

import africa.devhub.me.Me
import africa.devhub.resources.Res
import africa.devhub.resources.home_greeting
import africa.devhub.resources.home_next_text
import africa.devhub.resources.home_next_title
import africa.devhub.resources.sign_out
import africa.devhub.ui.components.Initials
import africa.devhub.ui.components.ScreenColumn
import africa.devhub.ui.components.TrustPills
import africa.devhub.ui.components.TrustSignals
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import org.jetbrains.compose.resources.stringResource

/** Accueil connecté (étape 1) : identité, signaux de confiance, déconnexion. */
@Composable
fun HomeScreen(me: Me, onSignOut: () -> Unit) {
    ScreenColumn {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Initials(me.displayName)
            Column(Modifier.padding(start = 16.dp)) {
                Text(
                    stringResource(Res.string.home_greeting, me.displayName),
                    style = MaterialTheme.typography.titleLarge,
                    modifier = Modifier.semantics { heading() },
                )
                Text(
                    "@${me.handle}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        TrustPills(
            TrustSignals(
                githubLinked = me.trust.githubLinked,
                githubAccountYears = me.trust.githubAccountYears,
                emailVerified = me.trust.emailVerified,
                founder = me.trust.founder,
                demo = me.trust.demo,
            ),
        )

        Card(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(stringResource(Res.string.home_next_title), style = MaterialTheme.typography.titleMedium)
                Text(
                    stringResource(Res.string.home_next_text),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        OutlinedButton(onClick = onSignOut, modifier = Modifier.fillMaxWidth()) {
            Text(stringResource(Res.string.sign_out))
        }
    }
}
