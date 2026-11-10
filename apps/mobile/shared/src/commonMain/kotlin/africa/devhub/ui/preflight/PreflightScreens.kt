package africa.devhub.ui.preflight

import africa.devhub.preflight.PreflightCheck
import africa.devhub.preflight.PreflightHomeState
import africa.devhub.preflight.PreflightListItem
import africa.devhub.preflight.PreflightReport
import africa.devhub.preflight.PreflightReportState
import africa.devhub.resources.*
import africa.devhub.ui.components.Badge
import africa.devhub.ui.components.DevCard
import africa.devhub.ui.components.DevHubIcons
import africa.devhub.ui.components.LoadingScreen
import africa.devhub.ui.components.OutlinedTextField
import africa.devhub.ui.components.PrimaryPill
import africa.devhub.ui.components.ScreenColumn
import africa.devhub.ui.components.StateMessage
import africa.devhub.ui.components.TechTag
import africa.devhub.ui.components.dayMonthYear
import africa.devhub.ui.theme.successColor
import africa.devhub.ui.theme.warningColor
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.stringArrayResource
import org.jetbrains.compose.resources.stringResource

@Composable
private fun verdictTone(verdict: String): Color = when (verdict) {
    "ready" -> successColor
    "review" -> warningColor
    else -> MaterialTheme.colorScheme.error
}

private fun verdictLabel(verdict: String): StringResource = when (verdict) {
    "ready" -> Res.string.pf_verdict_ready
    "review" -> Res.string.pf_verdict_review
    else -> Res.string.pf_verdict_fix
}

@Composable
private fun statusTone(status: String): Color = when (status) {
    "pass" -> successColor
    "warn" -> warningColor
    "fail" -> MaterialTheme.colorScheme.error
    else -> MaterialTheme.colorScheme.onSurfaceVariant
}

private fun statusLabel(status: String): StringResource = when (status) {
    "pass" -> Res.string.pf_st_pass
    "warn" -> Res.string.pf_st_warn
    "fail" -> Res.string.pf_st_fail
    else -> Res.string.pf_st_info
}

private fun categoryLabel(c: String): StringResource = when (c) {
    "security" -> Res.string.pf_cat_security
    "network" -> Res.string.pf_cat_network
    "performance" -> Res.string.pf_cat_performance
    "accessibility" -> Res.string.pf_cat_accessibility
    "load" -> Res.string.pf_cat_load
    "dependencies" -> Res.string.pf_cat_dependencies
    "licences" -> Res.string.pf_cat_licences
    else -> Res.string.pf_cat_hosting
}

private fun errorLabel(code: String): StringResource = when (code) {
    "validation.failed", "preflight.bad_url", "http_400", "http_422" -> Res.string.pf_err_validation
    "offline" -> Res.string.pf_err_offline
    "rate_limited", "http_429" -> Res.string.pf_err_rate
    else -> Res.string.pf_err_generic
}

/** Pré-vol : lancer une vérification (site, dépôt ou les deux) et retrouver mes rapports. */
@Composable
fun PreflightScreen(state: PreflightHomeState, onRun: (url: String, repo: String) -> Unit, onOpen: (String) -> Unit, onRetry: () -> Unit) {
    val months = stringArrayResource(Res.array.months)
    var url by rememberSaveable { mutableStateOf("") }
    var repo by rememberSaveable { mutableStateOf("") }
    ScreenColumn {
        Text(stringResource(Res.string.pf_subtitle), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        DevCard {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = url,
                    onValueChange = { url = it.trim().take(300) },
                    label = { Text(stringResource(Res.string.pf_url)) },
                    placeholder = { Text(stringResource(Res.string.pf_url_hint)) },
                    singleLine = true,
                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Uri),
                    enabled = !state.running,
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = repo,
                    onValueChange = { repo = it.trim().take(160) },
                    label = { Text(stringResource(Res.string.pf_repo)) },
                    placeholder = { Text(stringResource(Res.string.pf_repo_hint)) },
                    singleLine = true,
                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Uri),
                    enabled = !state.running,
                    modifier = Modifier.fillMaxWidth(),
                )
                state.error?.let {
                    Text(stringResource(errorLabel(it)), color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite })
                }
                if (state.running) {
                    Text(stringResource(Res.string.pf_running), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite })
                }
                PrimaryPill(
                    stringResource(Res.string.pf_run),
                    onClick = { onRun(url, repo) },
                    enabled = !state.running && (url.isNotBlank() || repo.isNotBlank()),
                    busy = state.running,
                    trailing = DevHubIcons.Rocket,
                    modifier = Modifier.fillMaxWidth(),
                )
                Text(stringResource(Res.string.pf_load_web), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        Text(stringResource(Res.string.pf_history), style = MaterialTheme.typography.titleMedium)
        when {
            state.loading && state.history.isEmpty() -> Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) { CircularProgressIndicator() }
            state.failed && state.history.isEmpty() -> StateMessage(DevHubIcons.Alert, stringResource(Res.string.pf_failed), isError = true, onRetry = onRetry)
            state.history.isEmpty() -> StateMessage(DevHubIcons.Rocket, stringResource(Res.string.pf_empty))
            else -> state.history.forEach { HistoryRow(it, months, onOpen) }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun HistoryRow(item: PreflightListItem, months: List<String>, onOpen: (String) -> Unit) {
    DevCard(Modifier.clickable(role = Role.Button) { onOpen(item.id) }) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(stringResource(Res.string.pf_score, item.score), style = MaterialTheme.typography.titleLarge, color = verdictTone(item.verdict))
                Column(Modifier.weight(1f)) {
                    Text(listOfNotNull(item.url?.removePrefix("https://"), item.repo).joinToString(" · "), style = MaterialTheme.typography.titleSmall, maxLines = 1)
                    Text(dayMonthYear(item.createdAt, months), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Badge(stringResource(verdictLabel(item.verdict)), verdictTone(item.verdict))
            }
            FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Badge(stringResource(Res.string.pf_count_pass, item.counts.pass), successColor)
                if (item.counts.warn > 0) Badge(stringResource(Res.string.pf_count_warn, item.counts.warn), warningColor)
                if (item.counts.fail > 0) Badge(stringResource(Res.string.pf_count_fail, item.counts.fail), MaterialTheme.colorScheme.error)
            }
        }
    }
}

/** Rapport de pré-vol : verdict et score, mesures, Lighthouse, puis chaque vérification avec sa correction. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun PreflightReportScreen(state: PreflightReportState, onRetry: () -> Unit) {
    when (state) {
        PreflightReportState.Loading -> LoadingScreen()
        PreflightReportState.Failed -> ScreenColumn { StateMessage(DevHubIcons.Alert, stringResource(Res.string.pf_failed), isError = true, onRetry = onRetry) }
        is PreflightReportState.Loaded -> ScreenColumn { ReportBody(state.report) }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ReportBody(r: PreflightReport) {
    val tone = verdictTone(r.verdict)
    DevCard {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                Text(stringResource(Res.string.pf_score, r.score), style = MaterialTheme.typography.headlineMedium, color = tone)
                Column(Modifier.weight(1f)) {
                    Text(stringResource(verdictLabel(r.verdict)), style = MaterialTheme.typography.titleMedium, color = tone)
                    Text(listOfNotNull(r.url?.removePrefix("https://"), r.repo).joinToString(" · "), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Badge(stringResource(Res.string.pf_count_pass, r.counts.pass), successColor)
                if (r.counts.warn > 0) Badge(stringResource(Res.string.pf_count_warn, r.counts.warn), warningColor)
                if (r.counts.fail > 0) Badge(stringResource(Res.string.pf_count_fail, r.counts.fail), MaterialTheme.colorScheme.error)
            }
        }
    }
    r.lighthouse?.scores?.let { s ->
        DevCard {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(stringResource(Res.string.pf_lighthouse), style = MaterialTheme.typography.titleMedium)
                Row(Modifier.fillMaxWidth()) {
                    LhScore(s.performance, stringResource(Res.string.pf_lh_perf), Modifier.weight(1f))
                    LhScore(s.accessibility, stringResource(Res.string.pf_lh_a11y), Modifier.weight(1f))
                    LhScore(s.bestPractices, stringResource(Res.string.pf_lh_bp), Modifier.weight(1f))
                    LhScore(s.seo, stringResource(Res.string.pf_lh_seo), Modifier.weight(1f))
                }
            }
        }
    }
    r.metrics?.let { m ->
        DevCard {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(stringResource(Res.string.pf_metrics), style = MaterialTheme.typography.titleMedium)
                MetricRow(stringResource(Res.string.pf_m_ttfb), stringResource(Res.string.pf_ms, m.ttfbMs))
                MetricRow(stringResource(Res.string.pf_m_3g), stringResource(Res.string.pf_ms, m.estimated3gMs))
                MetricRow(stringResource(Res.string.pf_m_requests), m.requests.toString())
                MetricRow(stringResource(Res.string.pf_m_weight), stringResource(Res.string.pf_kb, m.totalBytes / 1024))
            }
        }
    }
    Text(stringResource(Res.string.pf_checks), style = MaterialTheme.typography.titleMedium)
    r.checks.sortedBy { listOf("fail", "warn", "info", "pass").indexOf(it.status) }.forEach { CheckCard(it) }
}

@Composable
private fun LhScore(value: Int?, label: String, modifier: Modifier) {
    val tone = when {
        value == null -> MaterialTheme.colorScheme.onSurfaceVariant
        value >= 90 -> successColor
        value >= 50 -> warningColor
        else -> MaterialTheme.colorScheme.error
    }
    Column(modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value?.toString() ?: "–", style = MaterialTheme.typography.titleLarge, color = tone)
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2)
    }
}

@Composable
private fun MetricRow(label: String, value: String) {
    Row(Modifier.fillMaxWidth()) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(1f))
        Text(value, style = MaterialTheme.typography.titleSmall)
    }
}

@Composable
private fun CheckCard(c: PreflightCheck) {
    DevCard {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Badge(stringResource(statusLabel(c.status)), statusTone(c.status))
                TechTag(stringResource(categoryLabel(c.category)))
            }
            Text(c.title, style = MaterialTheme.typography.titleSmall)
            if (c.detail.isNotBlank()) Text(c.detail, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            c.evidence.take(3).forEach {
                Text(it, style = MaterialTheme.typography.bodySmall.copy(fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace), color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2)
            }
            c.fix?.takeIf { it.isNotBlank() }?.let {
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                Text(stringResource(Res.string.pf_fix), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary)
                Text(it, style = MaterialTheme.typography.bodyMedium)
            }
        }
    }
}
