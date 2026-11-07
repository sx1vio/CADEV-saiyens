package africa.devhub.ui.home

import africa.devhub.me.Me
import africa.devhub.resources.Res
import africa.devhub.resources.home_greeting
import africa.devhub.resources.home_discover
import africa.devhub.resources.home_leaderboard
import africa.devhub.resources.home_rules
import africa.devhub.resources.home_settings
import africa.devhub.resources.sign_out
import africa.devhub.resources.signout_cancel
import africa.devhub.resources.signout_pending
import africa.devhub.resources.signout_title
import africa.devhub.ui.components.Initials
import africa.devhub.ui.components.ScreenColumn
import africa.devhub.ui.components.TrustPills
import africa.devhub.ui.components.TrustSignals
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import org.jetbrains.compose.resources.pluralStringResource
import org.jetbrains.compose.resources.stringResource

/** Accès depuis l'accueil aux écrans sans onglet. */
class HomeLinks(
    val onDiscover: () -> Unit,
    val onLeaderboard: () -> Unit,
    val onRules: () -> Unit,
    val onSettings: () -> Unit,
)

/** Accueil connecté : identité, signaux de confiance, accès aux autres écrans, déconnexion. */
@Composable
fun HomeScreen(me: Me, pendingActions: Int, links: HomeLinks, onSignOut: () -> Unit) {
    var confirm by remember { mutableStateOf(false) }
    if (confirm) {
        AlertDialog(
            onDismissRequest = { confirm = false },
            title = { Text(stringResource(Res.string.signout_title)) },
            text = { Text(pluralStringResource(Res.plurals.signout_pending, pendingActions, pendingActions)) },
            confirmButton = {
                TextButton(onClick = {
                    confirm = false
                    onSignOut()
                }) { Text(stringResource(Res.string.sign_out)) }
            },
            dismissButton = { TextButton(onClick = { confirm = false }) { Text(stringResource(Res.string.signout_cancel)) } },
        )
    }
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

        listOf(
            Res.string.home_discover to links.onDiscover,
            Res.string.home_leaderboard to links.onLeaderboard,
            Res.string.home_rules to links.onRules,
            Res.string.home_settings to links.onSettings,
        ).forEach { (label, open) ->
            Card(Modifier.fillMaxWidth().clickable(role = Role.Button, onClick = open)) {
                Text(stringResource(label), style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(16.dp))
            }
        }

        // O9 : prévenir avant d'effacer des actions qui n'ont pas encore été envoyées.
        OutlinedButton(onClick = { if (pendingActions > 0) confirm = true else onSignOut() }, modifier = Modifier.fillMaxWidth()) {
            Text(stringResource(Res.string.sign_out))
        }
    }
}
