package africa.devhub.ui.jobs

import africa.devhub.jobs.APPLY_MESSAGE_MAX
import africa.devhub.jobs.APPLY_MESSAGE_MIN
import africa.devhub.jobs.ApplicationsState
import africa.devhub.jobs.Job
import africa.devhub.jobs.JobFilters
import africa.devhub.jobs.JobState
import africa.devhub.jobs.JobsState
import africa.devhub.resources.Res
import africa.devhub.resources.app_status_hired
import africa.devhub.resources.app_status_interview
import africa.devhub.resources.app_status_rejected
import africa.devhub.resources.app_status_seen
import africa.devhub.resources.app_status_submitted
import africa.devhub.resources.app_status_withdrawn
import africa.devhub.resources.applications_empty
import africa.devhub.resources.applications_withdraw
import africa.devhub.resources.cached_copy
import africa.devhub.resources.contract_alternance
import africa.devhub.resources.contract_cdd
import africa.devhub.resources.contract_cdi
import africa.devhub.resources.contract_freelance
import africa.devhub.resources.contract_stage
import africa.devhub.resources.job_apply_external
import africa.devhub.resources.job_apply_hint
import africa.devhub.resources.job_apply_offline
import africa.devhub.resources.job_apply_send
import africa.devhub.resources.job_apply_title
import africa.devhub.resources.job_applied
import africa.devhub.resources.job_failed
import africa.devhub.resources.job_not_found
import africa.devhub.resources.job_source
import africa.devhub.resources.jobs_empty
import africa.devhub.resources.jobs_failed
import africa.devhub.resources.jobs_intro
import africa.devhub.resources.jobs_my_applications
import africa.devhub.resources.jobs_search
import africa.devhub.resources.mode_hybrid
import africa.devhub.resources.mode_onsite
import africa.devhub.resources.mode_remote
import africa.devhub.resources.months
import africa.devhub.resources.retry
import africa.devhub.resources.seniority_confirme
import africa.devhub.resources.seniority_junior
import africa.devhub.resources.seniority_lead
import africa.devhub.resources.seniority_senior
import africa.devhub.ui.components.LoadingScreen
import africa.devhub.ui.components.Pill
import africa.devhub.ui.components.ScreenColumn
import africa.devhub.ui.components.dayMonthYear
import africa.devhub.ui.sos.failureLabel
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
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
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
import org.jetbrains.compose.resources.stringArrayResource
import org.jetbrains.compose.resources.stringResource

private val CONTRACTS = listOf("cdi", "cdd", "freelance", "stage", "alternance")
private val MODES = listOf("remote", "hybrid", "onsite")

private fun contractLabel(c: String): StringResource = when (c) {
    "cdd" -> Res.string.contract_cdd
    "freelance" -> Res.string.contract_freelance
    "stage" -> Res.string.contract_stage
    "alternance" -> Res.string.contract_alternance
    else -> Res.string.contract_cdi
}

private fun modeLabel(m: String): StringResource = when (m) {
    "hybrid" -> Res.string.mode_hybrid
    "onsite" -> Res.string.mode_onsite
    else -> Res.string.mode_remote
}

private fun seniorityLabel(s: String): StringResource = when (s) {
    "junior" -> Res.string.seniority_junior
    "senior" -> Res.string.seniority_senior
    "lead" -> Res.string.seniority_lead
    else -> Res.string.seniority_confirme
}

private fun statusLabel(s: String): StringResource = when (s) {
    "seen" -> Res.string.app_status_seen
    "interview" -> Res.string.app_status_interview
    "rejected" -> Res.string.app_status_rejected
    "hired" -> Res.string.app_status_hired
    "withdrawn" -> Res.string.app_status_withdrawn
    else -> Res.string.app_status_submitted
}

@Composable
fun JobsScreen(
    state: JobsState,
    onFilters: (JobFilters) -> Unit,
    onRetry: () -> Unit,
    onOpen: (String) -> Unit,
    onApplications: () -> Unit,
) {
    val f = state.filters
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.TopCenter) {
        LazyColumn(
            modifier = Modifier.widthIn(max = 560.dp).fillMaxWidth(),
            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            item { Text(stringResource(Res.string.jobs_intro), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            item { TextButton(onClick = onApplications) { Text(stringResource(Res.string.jobs_my_applications)) } }
            item {
                OutlinedTextField(
                    value = f.text,
                    onValueChange = { onFilters(f.copy(text = it.take(80))) },
                    label = { Text(stringResource(Res.string.jobs_search)) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            item {
                Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    CONTRACTS.forEach { c ->
                        FilterChip(selected = f.contract == c, onClick = { onFilters(f.copy(contract = if (f.contract == c) null else c)) }, label = { Text(stringResource(contractLabel(c))) })
                    }
                }
            }
            item {
                Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    MODES.forEach { m ->
                        FilterChip(selected = f.workMode == m, onClick = { onFilters(f.copy(workMode = if (f.workMode == m) null else m)) }, label = { Text(stringResource(modeLabel(m))) })
                    }
                }
            }
            if (state.cachedAt != null) item { Text(stringResource(Res.string.cached_copy), style = MaterialTheme.typography.bodySmall) }
            when {
                state.loading && state.all.isEmpty() -> item { Box(Modifier.fillMaxWidth().padding(16.dp), Alignment.Center) { CircularProgressIndicator() } }
                state.failed && state.all.isEmpty() -> item {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(stringResource(Res.string.jobs_failed), color = MaterialTheme.colorScheme.error)
                        OutlinedButton(onClick = onRetry, modifier = Modifier.fillMaxWidth()) { Text(stringResource(Res.string.retry)) }
                    }
                }
                state.items.isEmpty() -> item { Text(stringResource(Res.string.jobs_empty), color = MaterialTheme.colorScheme.onSurfaceVariant) }
                else -> items(state.items, key = { it.id }) { JobCard(it, onOpen) }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun JobCard(job: Job, onOpen: (String) -> Unit) {
    Card(Modifier.fillMaxWidth().clickable(role = Role.Button, onClick = { onOpen(job.id) })) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(job.title, style = MaterialTheme.typography.titleMedium)
            Text("${job.company} · ${job.location}", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            JobPills(job)
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun JobPills(job: Job) {
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Pill(stringResource(contractLabel(job.contract)), MaterialTheme.colorScheme.primary)
        Pill(stringResource(modeLabel(job.workMode)))
        Pill(stringResource(seniorityLabel(job.seniority)))
        job.salary?.let { Pill(it) }
    }
}

@Composable
fun JobScreen(state: JobState, onApply: (String) -> Unit, onRetry: () -> Unit) {
    when (state) {
        JobState.Loading -> LoadingScreen()
        JobState.NotFound -> ScreenColumn { Text(stringResource(Res.string.job_not_found)) }
        JobState.Failed -> ScreenColumn {
            Text(stringResource(Res.string.job_failed))
            Button(onClick = onRetry, modifier = Modifier.fillMaxWidth()) { Text(stringResource(Res.string.retry)) }
        }
        is JobState.Loaded -> {
            val job = state.job
            val uriHandler = LocalUriHandler.current
            val months = stringArrayResource(Res.array.months)
            ScreenColumn {
                Text(job.title, style = MaterialTheme.typography.titleLarge, modifier = Modifier.semantics { heading() })
                Text("${job.company} · ${job.location}", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                JobPills(job)
                Text(job.description, style = MaterialTheme.typography.bodyMedium)
                job.sourceUrl?.let { url -> OutlinedButton(onClick = { uriHandler.openUri(url) }, modifier = Modifier.fillMaxWidth()) { Text(stringResource(Res.string.job_source)) } }
                val external = job.applyUrl
                val application = state.application
                when {
                    // Offre d'une entreprise non inscrite : on candidate chez elle.
                    external != null -> Button(onClick = { uriHandler.openUri(external) }, modifier = Modifier.fillMaxWidth()) {
                        Text(stringResource(Res.string.job_apply_external))
                    }
                    application != null -> Text(
                        stringResource(Res.string.job_applied, dayMonthYear(application.createdAt, months), stringResource(statusLabel(application.status))),
                        style = MaterialTheme.typography.titleSmall,
                        color = MaterialTheme.colorScheme.primary,
                    )
                    else -> {
                        Text(stringResource(Res.string.job_apply_title), style = MaterialTheme.typography.titleMedium, modifier = Modifier.semantics { heading() })
                        var message by rememberSaveable { mutableStateOf("") }
                        OutlinedTextField(
                            value = message,
                            onValueChange = { message = it.take(APPLY_MESSAGE_MAX) },
                            label = { Text(stringResource(Res.string.job_apply_hint)) },
                            minLines = 4,
                            modifier = Modifier.fillMaxWidth(),
                        )
                        state.error?.let {
                            Text(
                                if (it == "offline") stringResource(Res.string.job_apply_offline) else stringResource(failureLabel(it)),
                                color = MaterialTheme.colorScheme.error,
                                modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
                            )
                        }
                        Button(onClick = { onApply(message) }, enabled = !state.sending && message.trim().length >= APPLY_MESSAGE_MIN, modifier = Modifier.fillMaxWidth()) {
                            Text(stringResource(Res.string.job_apply_send))
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ApplicationsScreen(state: ApplicationsState, onWithdraw: (String) -> Unit, onOpenJob: (String) -> Unit, onRetry: () -> Unit) {
    val months = stringArrayResource(Res.array.months)
    ScreenColumn {
        when {
            state.loading && state.items.isEmpty() -> LoadingScreen()
            state.failed && state.items.isEmpty() -> OutlinedButton(onClick = onRetry, modifier = Modifier.fillMaxWidth()) { Text(stringResource(Res.string.retry)) }
            state.items.isEmpty() -> Text(stringResource(Res.string.applications_empty), color = MaterialTheme.colorScheme.onSurfaceVariant)
            else -> state.items.forEach { a ->
                Card(Modifier.fillMaxWidth().clickable(role = Role.Button, onClick = { onOpenJob(a.job.id) })) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(a.job.title, style = MaterialTheme.typography.titleMedium)
                        Text("${a.job.company} · ${dayMonthYear(a.createdAt, months)}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Pill(stringResource(statusLabel(a.status)), MaterialTheme.colorScheme.primary)
                        if (a.status !in setOf("withdrawn", "rejected", "hired")) {
                            TextButton(onClick = { onWithdraw(a.id) }) { Text(stringResource(Res.string.applications_withdraw)) }
                        }
                    }
                }
            }
        }
        state.error?.let { Text(if (it == "offline") stringResource(Res.string.job_apply_offline) else stringResource(failureLabel(it)), color = MaterialTheme.colorScheme.error) }
    }
}
