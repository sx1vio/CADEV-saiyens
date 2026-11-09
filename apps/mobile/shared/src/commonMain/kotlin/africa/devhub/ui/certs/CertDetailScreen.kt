package africa.devhub.ui.certs

import africa.devhub.certs.CertCatalog
import africa.devhub.certs.MyCert
import africa.devhub.resources.*
import africa.devhub.ui.components.Card
import africa.devhub.ui.components.CertBadge
import africa.devhub.ui.components.DevHubIcons
import africa.devhub.ui.components.EmptyCard
import africa.devhub.ui.theme.successColor
import africa.devhub.ui.theme.warningColor
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import org.jetbrains.compose.resources.stringResource

/** Fiche d'une certification DevHub : écu, niveau, programme par thème, règles de l'examen, statut personnel. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun CertDetailScreen(certId: String, mine: MyCert?) {
    val cert = CertCatalog.devhub(certId)
    if (cert == null) {
        Box(Modifier.fillMaxSize().padding(20.dp)) { EmptyCard(stringResource(Res.string.cert_not_found), Res.drawable.djeli_book) }
        return
    }
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.TopCenter) {
        Column(
            Modifier.widthIn(max = 720.dp).fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                CertBadge(cert.color, cert.logo, 72.dp)
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        LevelTag(cert.level)
                        Text(cert.track, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Text(cert.title, style = MaterialTheme.typography.headlineSmall, modifier = Modifier.semantics { heading() })
                }
            }
            Text(cert.description, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)

            mine?.let { m ->
                val c = m.certificate
                val last = m.lastAttempt
                if (c != null || last != null) {
                    Card(Modifier.fillMaxWidth()) {
                        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            if (c != null) {
                                Icon(DevHubIcons.BadgeCheck, contentDescription = null, tint = successColor, modifier = Modifier.size(20.dp))
                                Text(stringResource(Res.string.cert_status_obtained, c.bestScore), style = MaterialTheme.typography.titleSmall, color = successColor)
                            } else if (last != null) {
                                Icon(DevHubIcons.Clock, contentDescription = null, tint = warningColor, modifier = Modifier.size(20.dp))
                                Text(stringResource(Res.string.cert_status_last, last.score), style = MaterialTheme.typography.titleSmall, color = warningColor)
                            }
                        }
                    }
                }
            }

            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(stringResource(Res.string.cert_rules), style = MaterialTheme.typography.titleMedium, modifier = Modifier.semantics { heading() })
                    Rule(DevHubIcons.Clock, stringResource(Res.string.cert_rule_time, cert.minutes))
                    Rule(DevHubIcons.Certification, stringResource(Res.string.cert_rule_draw, cert.questions))
                    Rule(DevHubIcons.BadgeCheck, stringResource(Res.string.cert_rule_pass, cert.passScore))
                    Rule(DevHubIcons.Refresh, stringResource(Res.string.cert_rule_retry))
                }
            }

            Card(Modifier.fillMaxWidth()) {
                Column {
                    Text(
                        stringResource(Res.string.cert_syllabus),
                        style = MaterialTheme.typography.titleMedium,
                        modifier = Modifier.padding(start = 16.dp, top = 16.dp, end = 16.dp, bottom = 8.dp).semantics { heading() },
                    )
                    cert.syllabus.forEachIndexed { i, topic ->
                        if (i > 0) HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant, modifier = Modifier.padding(start = 16.dp))
                        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text(topic, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
                            Text(
                                stringResource(Res.string.cert_topic_count, cert.topicCounts.getOrElse(i) { 0 }),
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
            }

            if (cert.skills.isNotEmpty()) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(stringResource(Res.string.cert_skills), style = MaterialTheme.typography.titleMedium, modifier = Modifier.semantics { heading() })
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) { cert.skills.forEach { Chip(it) } }
                }
            }

            Text(stringResource(Res.string.cert_exam_web), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun Rule(icon: androidx.compose.ui.graphics.vector.ImageVector, text: String) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(18.dp))
        Text(text, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Normal)
    }
}
