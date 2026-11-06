package africa.devhub.ui.components

import africa.devhub.resources.Res
import africa.devhub.resources.trust_demo
import africa.devhub.resources.trust_email
import africa.devhub.resources.trust_founder
import africa.devhub.resources.trust_github
import africa.devhub.resources.trust_github_years
import africa.devhub.ui.theme.successColor
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import org.jetbrains.compose.resources.pluralStringResource
import org.jetbrains.compose.resources.stringResource

/** Signaux de confiance (PR11), communs à /me et au Passport public. */
data class TrustSignals(
    val githubLinked: Boolean,
    val githubAccountYears: Int?,
    val emailVerified: Boolean,
    val founder: Boolean,
    val demo: Boolean,
)

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun TrustPills(trust: TrustSignals) {
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
fun Pill(text: String, color: Color = MaterialTheme.colorScheme.onSurfaceVariant) {
    Surface(shape = RoundedCornerShape(50), color = color.copy(alpha = 0.12f), contentColor = color) {
        Text(
            text,
            style = MaterialTheme.typography.labelLarge,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
        )
    }
}

/** Initiales du nom ; décoratif (le nom est lu à côté). */
@Composable
fun Initials(name: String, size: Dp = 56.dp) {
    val initials = name.split(' ', '-', '_')
        .filter { it.isNotBlank() }
        .take(2)
        .joinToString("") { it.first().uppercase() }
        .ifEmpty { "?" }
    Surface(shape = CircleShape, color = MaterialTheme.colorScheme.primaryContainer, modifier = Modifier.size(size)) {
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
