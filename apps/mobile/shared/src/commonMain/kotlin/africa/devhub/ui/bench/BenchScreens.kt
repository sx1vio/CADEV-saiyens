package africa.devhub.ui.bench

import africa.devhub.bench.BENCH_DEVICES
import africa.devhub.bench.BENCH_NETWORKS
import africa.devhub.bench.BENCH_SEVERITIES
import africa.devhub.bench.BENCH_VERDICTS
import africa.devhub.bench.BenchDraft
import africa.devhub.bench.BenchFinding
import africa.devhub.bench.BenchItem
import africa.devhub.bench.BenchListState
import africa.devhub.bench.BenchReport
import africa.devhub.bench.BenchReportDraft
import africa.devhub.bench.BenchState
import africa.devhub.bench.CreateBenchState
import africa.devhub.resources.Res
import africa.devhub.resources.*
import africa.devhub.ui.components.LoadingScreen
import africa.devhub.ui.components.Pill
import africa.devhub.ui.components.ScreenColumn
import africa.devhub.ui.sos.failureLabel
import africa.devhub.ui.theme.successColor
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.stringResource
import kotlin.math.roundToInt

private fun deviceLabel(d: String): StringResource = when (d) {
    "android_low" -> Res.string.device_android_low
    "iphone" -> Res.string.device_iphone
    "tablet" -> Res.string.device_tablet
    "desktop" -> Res.string.device_desktop
    else -> Res.string.device_android
}

private fun networkLabel(n: String): StringResource = when (n) {
    "2g" -> Res.string.network_2g
    "4g" -> Res.string.network_4g
    "wifi" -> Res.string.network_wifi
    "offline" -> Res.string.network_offline
    else -> Res.string.network_3g
}

private fun verdictLabel(v: String): StringResource = when (v) {
    "issues" -> Res.string.verdict_issues
    "broken" -> Res.string.verdict_broken
    else -> Res.string.verdict_works
}

private fun severityLabel(s: String): StringResource = when (s) {
    "blocking" -> Res.string.severity_blocking
    "major" -> Res.string.severity_major
    else -> Res.string.severity_minor
}

@Composable
private fun benchError(code: String): String = when (code) {
    "offline" -> stringResource(Res.string.bench_offline)
    "bench.account_too_new" -> stringResource(Res.string.bench_account_too_new)
    "bench.open_limit" -> stringResource(Res.string.bench_open_limit)
    "bench.daily_limit" -> stringResource(Res.string.bench_daily_limit)
    "bench.full" -> stringResource(Res.string.bench_full)
    "bench.closed" -> stringResource(Res.string.bench_closed_error)
    else -> stringResource(failureLabel(code))
}

@Composable
private fun Chips(options: List<String>, selected: (String) -> Boolean, label: (String) -> StringResource, onToggle: (String) -> Unit) {
    Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        options.forEach { o -> FilterChip(selected = selected(o), onClick = { onToggle(o) }, label = { Text(stringResource(label(o))) }) }
    }
}

@Composable
fun BenchListScreen(
    state: BenchListState,
    onScope: (String) -> Unit,
    onDevice: (String?) -> Unit,
    onNetwork: (String?) -> Unit,
    onRetry: () -> Unit,
    onOpen: (String) -> Unit,
    onRequest: () -> Unit,
) {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.TopCenter) {
        LazyColumn(
            modifier = Modifier.widthIn(max = 560.dp).fillMaxWidth(),
            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 16.dp, bottom = 96.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            item { Text(stringResource(Res.string.bench_intro), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("open" to Res.string.bench_scope_open, "mine" to Res.string.bench_scope_mine, "tested" to Res.string.bench_scope_tested).forEach { (scope, label) ->
                        FilterChip(selected = state.scope == scope, onClick = { onScope(scope) }, label = { Text(stringResource(label)) })
                    }
                }
            }
            item { Chips(BENCH_DEVICES, { state.device == it }, ::deviceLabel) { d -> onDevice(if (state.device == d) null else d) } }
            item { Chips(BENCH_NETWORKS, { state.network == it }, ::networkLabel) { n -> onNetwork(if (state.network == n) null else n) } }
            item {
                Text(
                    stringResource(Res.string.bench_stats, state.stats.open, state.stats.reports, state.stats.confirmed),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            if (state.cachedAt != null) item { Text(stringResource(Res.string.cached_copy), style = MaterialTheme.typography.bodySmall) }
            when {
                state.loading && state.items.isEmpty() -> item { Box(Modifier.fillMaxWidth().padding(16.dp), Alignment.Center) { CircularProgressIndicator() } }
                state.failed && state.items.isEmpty() -> item {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(stringResource(Res.string.bench_failed), color = MaterialTheme.colorScheme.error)
                        OutlinedButton(onClick = onRetry, modifier = Modifier.fillMaxWidth()) { Text(stringResource(Res.string.retry)) }
                    }
                }
                state.items.isEmpty() -> item { Text(stringResource(Res.string.bench_empty), color = MaterialTheme.colorScheme.onSurfaceVariant) }
                else -> items(state.items, key = { it.id }) { BenchCard(it, onOpen) }
            }
        }
        ExtendedFloatingActionButton(onClick = onRequest, modifier = Modifier.align(Alignment.BottomEnd).padding(16.dp)) {
            Text(stringResource(Res.string.bench_request))
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun BenchCard(item: BenchItem, onOpen: (String) -> Unit) {
    Card(Modifier.fillMaxWidth().clickable(role = Role.Button, onClick = { onOpen(item.id) })) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(item.title, style = MaterialTheme.typography.titleMedium)
            Text(
                item.author.displayName + " · " + stringResource(Res.string.bench_testers, item.testers, item.maxTesters),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                if (item.status == "closed") Pill(stringResource(Res.string.bench_closed))
                item.devices.forEach { Pill(stringResource(deviceLabel(it)), MaterialTheme.colorScheme.primary) }
                item.networks.forEach { Pill(stringResource(networkLabel(it))) }
            }
        }
    }
}

/** Une demande de test : l'application, la couverture, les rapports ; rendre le mien (par la file). */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun BenchScreen(
    state: BenchState,
    onEdit: ((BenchReportDraft) -> BenchReportDraft) -> Unit,
    onSubmit: () -> Unit,
    onReview: (reportId: String, confirm: Boolean) -> Unit,
    onClose: () -> Unit,
    onReopen: () -> Unit,
    onRetry: () -> Unit,
) {
    when (state) {
        BenchState.Loading -> LoadingScreen()
        BenchState.NotFound, BenchState.Failed -> ScreenColumn {
            Text(stringResource(Res.string.bench_failed))
            Button(onClick = onRetry, modifier = Modifier.fillMaxWidth()) { Text(stringResource(Res.string.retry)) }
        }
        is BenchState.Loaded -> {
            val b = state.bench
            val uriHandler = LocalUriHandler.current
            ScreenColumn {
                if (state.cachedAt != null) Text(stringResource(Res.string.cached_copy), style = MaterialTheme.typography.bodySmall)
                Text(b.title, style = MaterialTheme.typography.titleLarge, modifier = Modifier.semantics { heading() })
                Text(
                    b.author.displayName + " · " + stringResource(Res.string.bench_testers, b.testers, b.maxTesters),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                if (b.status == "closed") Pill(stringResource(Res.string.bench_closed))
                Button(onClick = { uriHandler.openUri(b.appUrl) }, modifier = Modifier.fillMaxWidth()) { Text(stringResource(Res.string.bench_open_app)) }
                Title(stringResource(Res.string.bench_instructions))
                Text(b.instructions, style = MaterialTheme.typography.bodyMedium)
                if (b.coverage.isNotEmpty()) {
                    Title(stringResource(Res.string.bench_coverage))
                    b.coverage.forEach { c ->
                        Text(
                            stringResource(Res.string.bench_coverage_line, stringResource(deviceLabel(c.device)), stringResource(networkLabel(c.network)), c.reports, stringResource(verdictLabel(c.worst))),
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                }
                state.error?.let { Text(benchError(it), color = MaterialTheme.colorScheme.error, modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite }) }
                if (b.mine) {
                    if (b.status == "open") OutlinedButton(onClick = onClose, enabled = !state.busy) { Text(stringResource(Res.string.bench_close)) }
                    else OutlinedButton(onClick = onReopen, enabled = !state.busy) { Text(stringResource(Res.string.bench_reopen)) }
                }
                if (b.reports.isNotEmpty()) {
                    Title(stringResource(Res.string.bench_reports))
                    b.reports.forEach { r -> ReportCard(r, canReview = b.mine && r.status == "submitted", busy = state.busy, onReview = onReview) }
                }
                when {
                    state.reportPending || state.queued -> Text(stringResource(Res.string.bench_report_pending), color = MaterialTheme.colorScheme.primary)
                    b.reported && !b.mine && b.reports.isEmpty() -> Text(stringResource(Res.string.bench_reported), color = MaterialTheme.colorScheme.onSurfaceVariant)
                    state.canReport -> ReportForm(b.devices, b.networks, state.draft, state.busy, onEdit, onSubmit)
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ReportCard(r: BenchReport, canReview: Boolean, busy: Boolean, onReview: (String, Boolean) -> Unit) {
    OutlinedCard(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text("${r.tester.displayName} · ${r.model} · ${r.os} · ${r.browser}", style = MaterialTheme.typography.titleSmall)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Pill(stringResource(deviceLabel(r.device)))
                Pill(stringResource(networkLabel(r.network)))
                Pill(
                    stringResource(verdictLabel(r.verdict)),
                    when (r.verdict) {
                        "works" -> successColor
                        "broken" -> MaterialTheme.colorScheme.error
                        else -> MaterialTheme.colorScheme.primary
                    },
                )
            }
            r.findings.forEach { f -> Text("• [${stringResource(severityLabel(f.severity))}] ${f.title}" + if (f.details.isNotBlank()) " : ${f.details}" else "", style = MaterialTheme.typography.bodySmall) }
            if (r.notes.isNotBlank()) Text(r.notes, style = MaterialTheme.typography.bodySmall)
            Text(
                when (r.status) {
                    "confirmed" -> stringResource(Res.string.bench_report_status_confirmed, r.points)
                    "rejected" -> stringResource(Res.string.bench_report_status_rejected)
                    else -> stringResource(Res.string.bench_report_status_submitted)
                },
                style = MaterialTheme.typography.labelLarge,
                color = if (r.status == "confirmed") successColor else MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (canReview) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(onClick = { onReview(r.id, true) }, enabled = !busy) { Text(stringResource(Res.string.bench_confirm)) }
                    TextButton(onClick = { onReview(r.id, false) }, enabled = !busy) { Text(stringResource(Res.string.bench_reject)) }
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ReportForm(
    devices: List<String>,
    networks: List<String>,
    d: BenchReportDraft,
    busy: Boolean,
    onEdit: ((BenchReportDraft) -> BenchReportDraft) -> Unit,
    onSubmit: () -> Unit,
) {
    Title(stringResource(Res.string.bench_report_title))
    Text(stringResource(Res.string.bench_device), style = MaterialTheme.typography.titleSmall)
    // Seuls les appareils et réseaux demandés sont acceptés par l'API.
    Chips(devices, { d.device == it }, ::deviceLabel) { v -> onEdit { it.copy(device = v) } }
    Text(stringResource(Res.string.bench_network), style = MaterialTheme.typography.titleSmall)
    Chips(networks, { d.network == it }, ::networkLabel) { v -> onEdit { it.copy(network = v) } }
    Field(d.model, Res.string.bench_model, 80) { v -> onEdit { it.copy(model = v) } }
    Field(d.os, Res.string.bench_os, 40) { v -> onEdit { it.copy(os = v) } }
    Field(d.browser, Res.string.bench_browser, 40) { v -> onEdit { it.copy(browser = v) } }
    Field(d.country, Res.string.bench_country, 2) { v -> onEdit { it.copy(country = v.trim().uppercase()) } }
    Text(stringResource(Res.string.bench_verdict), style = MaterialTheme.typography.titleSmall)
    Chips(BENCH_VERDICTS, { d.verdict == it }, ::verdictLabel) { v -> onEdit { it.copy(verdict = v) } }
    Text(stringResource(Res.string.bench_findings), style = MaterialTheme.typography.titleSmall)
    d.findings.forEachIndexed { i, f ->
        OutlinedCard(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Chips(BENCH_SEVERITIES, { f.severity == it }, ::severityLabel) { s -> onEdit { it.copy(findings = it.findings.replace(i, f.copy(severity = s))) } }
                Field(f.title, Res.string.bench_finding_title, 160) { v -> onEdit { it.copy(findings = it.findings.replace(i, f.copy(title = v))) } }
                Field(f.details, Res.string.bench_finding_details, 2_000, lines = 2) { v -> onEdit { it.copy(findings = it.findings.replace(i, f.copy(details = v))) } }
                TextButton(onClick = { onEdit { it.copy(findings = it.findings.filterIndexed { j, _ -> j != i }) } }) { Text(stringResource(Res.string.bench_finding_remove)) }
            }
        }
    }
    if (d.findings.size < 20) {
        TextButton(onClick = { onEdit { it.copy(findings = it.findings + BenchFinding("major", "")) } }) { Text(stringResource(Res.string.bench_finding_add)) }
    }
    Field(d.notes, Res.string.bench_notes, 2_000, lines = 3) { v -> onEdit { it.copy(notes = v) } }
    Button(onClick = onSubmit, enabled = d.valid && !busy, modifier = Modifier.fillMaxWidth()) { Text(stringResource(Res.string.bench_send)) }
}

private fun <T> List<T>.replace(index: Int, value: T) = mapIndexed { i, v -> if (i == index) value else v }

@Composable
private fun Field(value: String, label: StringResource, max: Int, lines: Int = 1, onChange: (String) -> Unit) {
    OutlinedTextField(
        value = value,
        onValueChange = { onChange(it.take(max)) },
        label = { Text(stringResource(label)) },
        singleLine = lines == 1,
        minLines = lines,
        modifier = Modifier.fillMaxWidth(),
    )
}

@Composable
private fun Title(text: String) {
    Text(text, style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(top = 8.dp).semantics { heading() })
}

@Composable
fun CreateBenchScreen(state: CreateBenchState, online: Boolean, onEdit: ((BenchDraft) -> BenchDraft) -> Unit, onSend: () -> Unit) {
    val d = state.draft
    ScreenColumn {
        if (!online) Text(stringResource(Res.string.bench_offline), color = MaterialTheme.colorScheme.error)
        Field(d.title, Res.string.create_bench_title, 120) { v -> onEdit { it.copy(title = v) } }
        Field(d.appUrl, Res.string.create_bench_app, 500) { v -> onEdit { it.copy(appUrl = v.trim()) } }
        Field(d.repoUrl, Res.string.create_bench_repo, 500) { v -> onEdit { it.copy(repoUrl = v.trim()) } }
        Field(d.instructions, Res.string.create_bench_instructions, 4_000, lines = 4) { v -> onEdit { it.copy(instructions = v) } }
        Text(stringResource(Res.string.create_bench_devices), style = MaterialTheme.typography.titleSmall)
        Chips(BENCH_DEVICES, { it in d.devices }, ::deviceLabel) { v -> onEdit { if (v in it.devices) it.copy(devices = it.devices - v) else it.copy(devices = it.devices + v) } }
        Text(stringResource(Res.string.create_bench_networks), style = MaterialTheme.typography.titleSmall)
        Chips(BENCH_NETWORKS, { it in d.networks }, ::networkLabel) { v -> onEdit { if (v in it.networks) it.copy(networks = it.networks - v) else it.copy(networks = it.networks + v) } }
        Text(stringResource(Res.string.create_bench_testers, d.maxTesters), style = MaterialTheme.typography.titleSmall)
        Slider(value = d.maxTesters.toFloat(), onValueChange = { v -> onEdit { it.copy(maxTesters = v.roundToInt()) } }, valueRange = 1f..20f, steps = 18)
        state.error?.let { Text(benchError(it), color = MaterialTheme.colorScheme.error) }
        Button(onClick = onSend, enabled = d.valid && !state.sending && online, modifier = Modifier.fillMaxWidth()) { Text(stringResource(Res.string.bench_request)) }
    }
}
