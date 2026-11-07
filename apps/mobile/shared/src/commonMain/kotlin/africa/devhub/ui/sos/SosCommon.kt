package africa.devhub.ui.sos

import africa.devhub.resources.Res
import africa.devhub.resources.ask_invalid
import africa.devhub.resources.ask_rate_limited
import africa.devhub.resources.notice_failed
import africa.devhub.resources.notice_network
import africa.devhub.resources.notice_rate_limited
import africa.devhub.resources.status_closed
import africa.devhub.resources.status_open
import africa.devhub.resources.status_resolved
import africa.devhub.resources.urgency_high
import africa.devhub.resources.urgency_low
import africa.devhub.resources.urgency_normal
import africa.devhub.ui.components.Pill
import africa.devhub.ui.theme.successColor
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.stringResource

@Composable
fun StatusPill(status: String) {
    when (status) {
        "resolved" -> Pill(stringResource(Res.string.status_resolved), successColor)
        "closed" -> Pill(stringResource(Res.string.status_closed))
        else -> Pill(stringResource(Res.string.status_open), MaterialTheme.colorScheme.primary)
    }
}

@Composable
fun UrgencyPill(urgency: String) {
    // « Normale » n'est pas affichée dans les listes : seuls les écarts comptent.
    when (urgency) {
        "high" -> Pill(stringResource(Res.string.urgency_high), MaterialTheme.colorScheme.error)
        "low" -> Pill(stringResource(Res.string.urgency_low))
    }
}

fun urgencyLabel(urgency: String): StringResource = when (urgency) {
    "high" -> Res.string.urgency_high
    "low" -> Res.string.urgency_low
    else -> Res.string.urgency_normal
}

/** Message d'échec d'une écriture, à partir du code de l'API. */
fun failureLabel(code: String, asking: Boolean = false): StringResource = when (code) {
    "network" -> Res.string.notice_network
    "rate_limited" -> if (asking) Res.string.ask_rate_limited else Res.string.notice_rate_limited
    "validation.failed" -> Res.string.ask_invalid
    else -> Res.string.notice_failed
}
