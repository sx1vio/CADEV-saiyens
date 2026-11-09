package africa.devhub.ui.bench

import africa.devhub.bench.BENCH_DEVICES
import africa.devhub.bench.BENCH_NETWORKS
import africa.devhub.bench.BENCH_SCOPES
import africa.devhub.bench.BENCH_SEVERITIES
import africa.devhub.bench.BENCH_TESTERS
import africa.devhub.bench.BENCH_VERDICTS
import africa.devhub.bench.BenchDetailState
import africa.devhub.bench.BenchFinding
import africa.devhub.bench.BenchFormState
import africa.devhub.bench.BenchItem
import africa.devhub.bench.BenchListState
import africa.devhub.bench.BenchReport
import africa.devhub.bench.BenchRequestDraft
import africa.devhub.bench.ReportDraft
import africa.devhub.resources.*
import africa.devhub.ui.components.Badge
import africa.devhub.ui.components.DevCard
import africa.devhub.ui.components.DevHubIcons
import africa.devhub.ui.components.FilterChip
import africa.devhub.ui.components.LoadingScreen
import africa.devhub.ui.components.OutlinedTextField
import africa.devhub.ui.components.PrimaryPill
import africa.devhub.ui.components.ScreenColumn
import africa.devhub.ui.components.SecondaryPill
import africa.devhub.ui.components.StateMessage
import africa.devhub.ui.components.TechTag
import africa.devhub.ui.components.UnderlineTabs
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
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.stringArrayResource
import org.jetbrains.compose.resources.stringResource

fun deviceLabel(d: String): StringResource = when (d) {
    "android_low" -> Res.string.bn_dev_android_low
    "android" -> Res.string.bn_dev_android
    "iphone" -> Res.string.bn_dev_iphone
    "tablet" -> Res.string.bn_dev_tablet
    else -> Res.string.bn_dev_desktop
}

fun networkLabel(n: String): StringResource = when (n) {
    "2g" -> Res.string.bn_net_2g
    "3g" -> Res.string.bn_net_3g
    "4g" -> Res.string.bn_net_4g
    "wifi" -> Res.string.bn_net_wifi
    else -> Res.string.bn_net_offline
}

private fun verdictLabel(v: String): StringResource = when (v) {
    "works" -> Res.string.bn_v_works
    "issues" -> Res.string.bn_v_issues
    else -> Res.string.bn_v_broken
}

@Composable
private fun verdictTone(v: String): Color = when (v) {
    "works" -> successColor
    "issues" -> warningColor
    else -> MaterialTheme.colorScheme.error
}

private fun severityLabel(s: String): StringResource = when (s) {
    "blocking" -> Res.string.bn_sev_blocking
    "major" -> Res.string.bn_sev_major
    else -> Res.string.bn_sev_minor
}

@Composable
private fun severityTone(s: String): Color = when (s) {
    "blocking" -> MaterialTheme.colorScheme.error
    "major" -> warningColor
    else -> MaterialTheme.colorScheme.onSurfaceVariant
}

private fun scopeLabel(s: String): StringResource = when (s) {
    "open" -> Res.string.bn_scope_open
    "mine" -> Res.string.bn_scope_mine
    else -> Res.string.bn_scope_tested
}

private fun errorLabel(code: String): StringResource = when (code) {
    "bench.own_request" -> Res.string.bn_err_own
    "bench.closed" -> Res.string.bn_err_closed
    "bench.full" -> Res.string.bn_err_full
    "bench.already_reported", "bench.already_reviewed" -> Res.string.bn_err_already
    "bench.device_not_requested", "bench.network_not_requested" -> Res.string.bn_err_device
    "bench.open_limit", "bench.daily_limit", "rate_limited", "http_429" -> Res.string.bn_err_limit
    "bench.account_too_new" -> Res.string.bn_err_new
    "offline" -> Res.string.bn_err_offline
    else -> Res.string.bn_err_generic
}

@Composable
private fun ErrorLine(code: String?) {
    if (code != null) Text(stringResource(errorLabel(code)), color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite })
}

/** Banc d'essai : les demandes de test ouvertes, les miennes, celles où j'ai déjà testé. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun BenchScreen(state: BenchListState, onScope: (String) -> Unit, onOpen: (String) -> Unit, onNew: () -> Unit, onRetry: () -> Unit) {
    ScreenColumn {
        Text(stringResource(Res.string.bn_subtitle), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        PrimaryPill(stringResource(Res.string.bn_new), onClick = onNew, trailing = DevHubIcons.Plus, modifier = Modifier.fillMaxWidth())
        Text(
            stringResource(Res.string.bn_stats, state.stats.open, state.stats.reports, state.stats.confirmed),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        UnderlineTabs(BENCH_SCOPES.map { stringResource(scopeLabel(it)) }, BENCH_SCOPES.indexOf(state.scope), { onScope(BENCH_SCOPES[it]) })
        when {
            state.loading && state.items.isEmpty() -> Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) { CircularProgressIndicator() }
            state.failed && state.items.isEmpty() -> StateMessage(DevHubIcons.Alert, stringResource(Res.string.bn_failed), isError = true, onRetry = onRetry)
            state.items.isEmpty() -> StateMessage(DevHubIcons.Smartphone, stringResource(Res.string.bn_empty))
            else -> state.items.forEach { BenchCard(it, onOpen) }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun BenchCard(item: BenchItem, onOpen: (String) -> Unit) {
    DevCard(Modifier.clickable(role = Role.Button) { onOpen(item.id) }) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(item.title, style = MaterialTheme.typography.titleSmall)
            Text(
                stringResource(Res.string.bn_by, item.author.displayName) + " · " + stringResource(Res.string.bn_testers, item.testers, item.maxTesters),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                if (item.status == "closed") Badge(stringResource(Res.string.bn_closed), MaterialTheme.colorScheme.onSurfaceVariant)
                item.devices.forEach { TechTag(stringResource(deviceLabel(it))) }
                item.networks.forEach { TechTag(stringResource(networkLabel(it))) }
            }
        }
    }
}

/** Une demande : consigne, couverture appareil × réseau, rapports ; rendre un rapport ou juger ceux reçus. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun BenchDetailScreen(
    state: BenchDetailState,
    onReport: () -> Unit,
    onReview: (reportId: String, decision: String) -> Unit,
    onToggle: (open: Boolean) -> Unit,
    onRetry: () -> Unit,
) {
    val d = state.detail
    when {
        state.loading && d == null -> LoadingScreen()
        d == null -> ScreenColumn { StateMessage(DevHubIcons.Alert, stringResource(Res.string.bn_failed), isError = true, onRetry = onRetry) }
        else -> ScreenColumn {
            val months = stringArrayResource(Res.array.months)
            val uri = LocalUriHandler.current
            Text(d.title, style = MaterialTheme.typography.titleLarge)
            Text(
                stringResource(Res.string.bn_by, d.author.displayName) + " · " + dayMonthYear(d.createdAt, months) + " · " + stringResource(Res.string.bn_testers, d.testers, d.maxTesters),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            DevCard {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(stringResource(Res.string.bn_instructions), style = MaterialTheme.typography.titleSmall)
                    Text(d.instructions, style = MaterialTheme.typography.bodyMedium)
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        if (d.status == "closed") Badge(stringResource(Res.string.bn_closed), MaterialTheme.colorScheme.onSurfaceVariant)
                        d.devices.forEach { TechTag(stringResource(deviceLabel(it))) }
                        d.networks.forEach { TechTag(stringResource(networkLabel(it))) }
                    }
                    if (d.appUrl.startsWith("https://")) SecondaryPill(stringResource(Res.string.bn_open_app), onClick = { uri.openUri(d.appUrl) }, leading = DevHubIcons.ExternalLink, modifier = Modifier.fillMaxWidth())
                }
            }
            ErrorLine(state.error)
            if (!d.mine && d.status == "open" && !d.reported) PrimaryPill(stringResource(Res.string.bn_report_cta), onClick = onReport, modifier = Modifier.fillMaxWidth())
            if (d.mine) SecondaryPill(
                stringResource(if (d.status == "open") Res.string.bn_close else Res.string.bn_reopen),
                onClick = { onToggle(d.status != "open") },
                enabled = !state.busy,
                modifier = Modifier.fillMaxWidth(),
            )
            if (d.coverage.isNotEmpty()) {
                Text(stringResource(Res.string.bn_coverage), style = MaterialTheme.typography.titleMedium)
                DevCard {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        d.coverage.forEach { c ->
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text(stringResource(deviceLabel(c.device)) + " · " + stringResource(networkLabel(c.network)), style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
                                Badge(stringResource(Res.string.bn_cover_n, c.reports, stringResource(verdictLabel(c.worst))), verdictTone(c.worst))
                            }
                        }
                    }
                }
            }
            Text(stringResource(Res.string.bn_reports), style = MaterialTheme.typography.titleMedium)
            if (d.reports.isEmpty()) Text(stringResource(Res.string.bn_no_reports), color = MaterialTheme.colorScheme.onSurfaceVariant)
            d.reports.forEach { ReportCard(it, canReview = d.mine && it.status == "submitted", busy = state.busy, months = months, onReview = onReview) }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ReportCard(r: BenchReport, canReview: Boolean, busy: Boolean, months: List<String>, onReview: (String, String) -> Unit) {
    DevCard {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Column(Modifier.weight(1f)) {
                    Text(r.tester.displayName, style = MaterialTheme.typography.titleSmall)
                    Text(
                        "${r.model} · ${r.os} · ${r.browser} · " + stringResource(networkLabel(r.network)) + " · " + dayMonthYear(r.createdAt, months),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Badge(stringResource(verdictLabel(r.verdict)), verdictTone(r.verdict))
            }
            if (r.status == "confirmed") Badge(stringResource(Res.string.bn_rs_confirmed) + " · " + stringResource(Res.string.bn_points, r.points), successColor)
            if (r.status == "rejected") Badge(stringResource(Res.string.bn_rs_rejected), MaterialTheme.colorScheme.error)
            r.findings.forEach { f ->
                Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Badge(stringResource(severityLabel(f.severity)), severityTone(f.severity))
                        Text(f.title, style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f))
                    }
                    if (f.details.isNotBlank()) Text(f.details, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            if (r.notes.isNotBlank()) Text(r.notes, style = MaterialTheme.typography.bodyMedium)
            if (canReview) {
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    PrimaryPill(stringResource(Res.string.bn_confirm), onClick = { onReview(r.id, "confirm") }, enabled = !busy, modifier = Modifier.weight(1f))
                    SecondaryPill(stringResource(Res.string.bn_reject), onClick = { onReview(r.id, "reject") }, enabled = !busy, modifier = Modifier.weight(1f))
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun <T> Choices(label: String?, options: List<T>, isSelected: (T) -> Boolean, text: @Composable (T) -> String, onToggle: (T) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        if (label != null) Text(label, style = MaterialTheme.typography.titleSmall)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            options.forEach { o -> FilterChip(isSelected(o), { onToggle(o) }, { Text(text(o)) }) }
        }
    }
}

/** Demander un test : titre, adresse, consigne, appareils et réseaux voulus, nombre de testeurs. */
@Composable
fun BenchCreateScreen(state: BenchFormState<BenchRequestDraft>, onEdit: ((BenchRequestDraft) -> BenchRequestDraft) -> Unit, onSend: () -> Unit) {
    val d = state.draft
    ScreenColumn {
        DevCard {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(d.title, { v -> onEdit { it.copy(title = v.take(120)) } }, label = { Text(stringResource(Res.string.bn_f_title)) }, singleLine = true, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(
                    d.appUrl, { v -> onEdit { it.copy(appUrl = v.trim().take(500)) } },
                    label = { Text(stringResource(Res.string.bn_f_app)) }, placeholder = { Text(stringResource(Res.string.bn_f_app_hint)) },
                    singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri), modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    d.repoUrl, { v -> onEdit { it.copy(repoUrl = v.trim().take(500)) } },
                    label = { Text(stringResource(Res.string.bn_f_repo)) }, singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri), modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    d.instructions, { v -> onEdit { it.copy(instructions = v.take(4_000)) } },
                    label = { Text(stringResource(Res.string.bn_f_instr)) }, placeholder = { Text(stringResource(Res.string.bn_f_instr_hint)) },
                    minLines = 4, modifier = Modifier.fillMaxWidth(),
                )
            }
        }
        DevCard {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Choices(stringResource(Res.string.bn_f_devices), BENCH_DEVICES, { it in d.devices }, { stringResource(deviceLabel(it)) }) { v ->
                    onEdit { if (v in it.devices && it.devices.size > 1) it.copy(devices = it.devices - v) else it.copy(devices = it.devices + v) }
                }
                Choices(stringResource(Res.string.bn_f_networks), BENCH_NETWORKS, { it in d.networks }, { stringResource(networkLabel(it)) }) { v ->
                    onEdit { if (v in it.networks && it.networks.size > 1) it.copy(networks = it.networks - v) else it.copy(networks = it.networks + v) }
                }
                Choices(stringResource(Res.string.bn_f_max), BENCH_TESTERS, { it == d.maxTesters }, { it.toString() }) { v -> onEdit { it.copy(maxTesters = v) } }
            }
        }
        ErrorLine(state.error)
        PrimaryPill(stringResource(Res.string.bn_f_send), onClick = onSend, enabled = d.valid && !state.sending, busy = state.sending, modifier = Modifier.fillMaxWidth())
    }
}

/** Rendre un rapport de test : appareil réel, réseau, verdict, problèmes constatés. */
@Composable
fun BenchReportScreen(state: BenchFormState<ReportDraft>, onEdit: ((ReportDraft) -> ReportDraft) -> Unit, onSend: () -> Unit) {
    val d = state.draft
    ScreenColumn {
        DevCard {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Choices(stringResource(Res.string.bn_r_device), BENCH_DEVICES, { it == d.device }, { stringResource(deviceLabel(it)) }) { v -> onEdit { it.copy(device = v) } }
                OutlinedTextField(d.model, { v -> onEdit { it.copy(model = v.take(80)) } }, label = { Text(stringResource(Res.string.bn_r_model)) }, placeholder = { Text(stringResource(Res.string.bn_r_model_hint)) }, singleLine = true, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(d.os, { v -> onEdit { it.copy(os = v.take(40)) } }, label = { Text(stringResource(Res.string.bn_r_os)) }, placeholder = { Text(stringResource(Res.string.bn_r_os_hint)) }, singleLine = true, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(d.browser, { v -> onEdit { it.copy(browser = v.take(40)) } }, label = { Text(stringResource(Res.string.bn_r_browser)) }, placeholder = { Text(stringResource(Res.string.bn_r_browser_hint)) }, singleLine = true, modifier = Modifier.fillMaxWidth())
                Choices(stringResource(Res.string.bn_r_network), BENCH_NETWORKS, { it == d.network }, { stringResource(networkLabel(it)) }) { v -> onEdit { it.copy(network = v) } }
                OutlinedTextField(d.country, { v -> onEdit { it.copy(country = v.trim().uppercase().take(2)) } }, label = { Text(stringResource(Res.string.bn_r_country)) }, singleLine = true, modifier = Modifier.fillMaxWidth())
            }
        }
        DevCard {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Choices(stringResource(Res.string.bn_r_verdict), BENCH_VERDICTS, { it == d.verdict }, { stringResource(verdictLabel(it)) }) { v -> onEdit { it.copy(verdict = v) } }
                Text(stringResource(Res.string.bn_r_findings), style = MaterialTheme.typography.titleSmall)
                d.findings.forEachIndexed { i, f ->
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Choices(null, BENCH_SEVERITIES, { it == f.severity }, { stringResource(severityLabel(it)) }) { v ->
                            onEdit { it.copy(findings = it.findings.mapIndexed { j, x -> if (j == i) x.copy(severity = v) else x }) }
                        }
                        OutlinedTextField(f.title, { v -> onEdit { it.copy(findings = it.findings.mapIndexed { j, x -> if (j == i) x.copy(title = v.take(160)) else x }) } }, singleLine = true, modifier = Modifier.fillMaxWidth())
                        OutlinedTextField(
                            f.details, { v -> onEdit { it.copy(findings = it.findings.mapIndexed { j, x -> if (j == i) x.copy(details = v.take(2_000)) else x }) } },
                            placeholder = { Text(stringResource(Res.string.bn_r_f_details)) }, minLines = 2, modifier = Modifier.fillMaxWidth(),
                        )
                        TextButton(onClick = { onEdit { it.copy(findings = it.findings.filterIndexed { j, _ -> j != i }) } }) { Text(stringResource(Res.string.bn_r_remove)) }
                    }
                }
                if (d.findings.size < 20) SecondaryPill(stringResource(Res.string.bn_r_add), onClick = { onEdit { it.copy(findings = it.findings + BenchFinding("minor", "")) } }, leading = DevHubIcons.Plus, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(d.notes, { v -> onEdit { it.copy(notes = v.take(2_000)) } }, label = { Text(stringResource(Res.string.bn_r_notes)) }, minLines = 2, modifier = Modifier.fillMaxWidth())
            }
        }
        ErrorLine(state.error)
        PrimaryPill(stringResource(Res.string.bn_r_send), onClick = onSend, enabled = d.valid && !state.sending, busy = state.sending, modifier = Modifier.fillMaxWidth())
    }
}
