package africa.devhub.ui.home

import africa.devhub.me.Me
import africa.devhub.resources.Res
import africa.devhub.resources.home_greeting
import africa.devhub.resources.home_next_text
import africa.devhub.resources.home_next_title
import africa.devhub.resources.sign_out
import africa.devhub.resources.trust_demo
import africa.devhub.resources.trust_email
import africa.devhub.resources.trust_founder
import africa.devhub.resources.trust_github
import africa.devhub.resources.trust_github_years
import africa.devhub.ui.components.ScreenColumn
import africa.devhub.ui.theme.successColor
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import org.jetbrains.compose.resources.pluralStringResource
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

        TrustSignals(me)

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

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun TrustSignals(me: Me) {
    val trust = me.trust
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        if (trust.githubLinked) {
            val years = trust.githubAccountYears
            Pill(
                if (years != null && years > 0) {
                    pluralStringResource(Res.plurals.trust_github_years, years, years)
                } else {
                    stringResource(Res.string.trust_github)
                },
                successColor,
            )
        }
        if (trust.emailVerified) Pill(stringResource(Res.string.trust_email), successColor)
        if (trust.founder) Pill(stringResource(Res.string.trust_founder), MaterialTheme.colorScheme.primary)
        // Un compte démo est toujours signalé comme tel (CDC §6.6).
        if (trust.demo) Pill(stringResource(Res.string.trust_demo), MaterialTheme.colorScheme.error)
    }
}

@Composable
private fun Pill(text: String, color: Color) {
    Surface(
        shape = RoundedCornerShape(50),
        color = color.copy(alpha = 0.12f),
        contentColor = color,
    ) {
        Text(
            text,
            style = MaterialTheme.typography.labelLarge,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
        )
    }
}

@Composable
private fun Initials(name: String) {
    val initials = name.split(' ', '-', '_')
        .filter { it.isNotBlank() }
        .take(2)
        .joinToString("") { it.first().uppercase() }
        .ifEmpty { "?" }
    Surface(shape = CircleShape, color = MaterialTheme.colorScheme.primaryContainer, modifier = Modifier.size(56.dp)) {
        Box(contentAlignment = Alignment.Center, modifier = Modifier.clearAndSetSemantics {}) {
            Text(
                initials,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onPrimaryContainer,
            )
        }
    }
}
