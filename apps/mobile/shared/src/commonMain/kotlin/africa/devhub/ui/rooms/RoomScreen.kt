package africa.devhub.ui.rooms

import africa.devhub.resources.Res
import africa.devhub.resources.cached_copy
import africa.devhub.resources.chat_empty
import africa.devhub.resources.chat_members_only
import africa.devhub.resources.chat_message
import africa.devhub.resources.chat_send
import africa.devhub.resources.join_accept
import africa.devhub.resources.join_message
import africa.devhub.resources.join_pending
import africa.devhub.resources.join_refuse
import africa.devhub.resources.join_refused
import africa.devhub.resources.join_requests
import africa.devhub.resources.join_room
import africa.devhub.resources.join_send
import africa.devhub.resources.months
import africa.devhub.resources.notice_queued
import africa.devhub.resources.notice_secrets
import africa.devhub.resources.pending_badge
import africa.devhub.resources.pending_failed
import africa.devhub.resources.question_meta
import africa.devhub.resources.retry
import africa.devhub.resources.room_by
import africa.devhub.resources.room_demo
import africa.devhub.resources.room_deploy_pending
import africa.devhub.resources.room_deployed
import africa.devhub.resources.room_failed
import africa.devhub.resources.room_not_found
import africa.devhub.resources.room_notice_done
import africa.devhub.resources.room_notice_join_sent
import africa.devhub.resources.room_repo
import africa.devhub.resources.room_repo_verified
import africa.devhub.resources.tab_chat
import africa.devhub.resources.tab_members
import africa.devhub.resources.tab_tasks
import africa.devhub.resources.task_add
import africa.devhub.resources.task_assignee
import africa.devhub.resources.task_complete
import africa.devhub.resources.task_declared
import africa.devhub.resources.task_description
import africa.devhub.resources.task_from_issue
import africa.devhub.resources.task_level
import africa.devhub.resources.task_new
import africa.devhub.resources.task_pending
import africa.devhub.resources.task_pr
import africa.devhub.resources.task_pr_hint
import africa.devhub.resources.task_submit
import africa.devhub.resources.task_take
import africa.devhub.resources.task_title
import africa.devhub.resources.task_verified
import africa.devhub.resources.tasks_empty
import africa.devhub.resources.trust_demo
import africa.devhub.rooms.PULL_REQUEST_URL
import africa.devhub.rooms.RoomLimits
import africa.devhub.rooms.RoomNotice
import africa.devhub.rooms.RoomState
import africa.devhub.rooms.TaskView
import africa.devhub.ui.components.LoadingScreen
import africa.devhub.ui.components.Pill
import africa.devhub.ui.components.ScreenColumn
import africa.devhub.ui.components.dayMonthYear
import africa.devhub.ui.sos.failureLabel
import africa.devhub.ui.theme.successColor
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.PrimaryTabRow
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import org.jetbrains.compose.resources.pluralStringResource
import org.jetbrains.compose.resources.stringArrayResource
import org.jetbrains.compose.resources.stringResource

/** Ce que l'écran d'une salle peut faire. */
class RoomActions(
    val onRetry: () -> Unit,
    val onJoin: (message: String?) -> Unit,
    val onDecide: (requestId: String, accept: Boolean) -> Unit,
    val onTake: (taskId: String) -> Unit,
    val onSubmit: (taskId: String, prUrl: String) -> Unit,
    val onComplete: (taskId: String, prUrl: String?) -> Unit,
    val onCreateTask: (title: String, description: String?, level: String) -> Unit,
    val onPostMessage: (String) -> Unit,
)

@Composable
fun RoomScreen(state: RoomState, meHandle: String, actions: RoomActions) {
    when (state) {
        RoomState.Loading -> LoadingScreen()
        RoomState.NotFound -> ScreenColumn { Text(stringResource(Res.string.room_not_found)) }
        RoomState.Failed -> ScreenColumn {
            Text(stringResource(Res.string.room_failed))
            Button(onClick = actions.onRetry, modifier = Modifier.fillMaxWidth()) { Text(stringResource(Res.string.retry)) }
        }
        is RoomState.Loaded -> Loaded(state, meHandle, actions)
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Loaded(state: RoomState.Loaded, meHandle: String, actions: RoomActions) {
    val room = state.room
    val uriHandler = LocalUriHandler.current
    var tab by rememberSaveable { mutableIntStateOf(0) }
    ScreenColumn {
        if (state.cachedAt != null) {
            Text(stringResource(Res.string.cached_copy), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Text(room.name, style = MaterialTheme.typography.titleLarge, modifier = Modifier.semantics { heading() })
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Pill(stringResource(roomStateLabel(room.state)), MaterialTheme.colorScheme.primary)
            room.stack.forEach { Pill(it.label) }
            room.deployment?.let {
                if (it.status == "verified" && it.hostedOnSystalink) Pill(stringResource(Res.string.room_deployed), successColor)
                else Pill(stringResource(Res.string.room_deploy_pending))
            }
            if (room.owner.isDemo) Pill(stringResource(Res.string.trust_demo), MaterialTheme.colorScheme.error)
        }
        Text(stringResource(Res.string.room_by, room.owner.displayName), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(room.description, style = MaterialTheme.typography.bodyLarge)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            room.repo?.let { repo ->
                OutlinedButton(onClick = { uriHandler.openUri(repo.url) }) {
                    Text(stringResource(if (repo.verified) Res.string.room_repo_verified else Res.string.room_repo))
                }
            }
            room.demoUrl?.let { url -> OutlinedButton(onClick = { uriHandler.openUri(url) }) { Text(stringResource(Res.string.room_demo)) } }
        }

        Membership(state, actions)
        if (state.canManage && state.joinRequests.isNotEmpty()) JoinRequests(state, actions)
        state.notice?.let { Notice(it) }

        PrimaryTabRow(selectedTabIndex = tab) {
            listOf(Res.string.tab_tasks, Res.string.tab_chat, Res.string.tab_members).forEachIndexed { i, label ->
                Tab(selected = tab == i, onClick = { tab = i }, text = { Text(stringResource(label)) })
            }
        }
        when (tab) {
            0 -> Tasks(state, meHandle, actions)
            1 -> Chat(state, actions)
            else -> state.room.members.forEach { m ->
                Text("${m.user.displayName} · @${m.user.handle} · ${m.role}", style = MaterialTheme.typography.bodyMedium)
            }
        }
    }
}

@Composable
private fun Membership(state: RoomState.Loaded, actions: RoomActions) {
    if (state.isMember) return
    when {
        state.joinPending || state.room.viewer?.joinRequest == "pending" ->
            Text(stringResource(Res.string.join_pending), color = MaterialTheme.colorScheme.onSurfaceVariant)
        state.room.viewer?.joinRequest == "refused" ->
            Text(stringResource(Res.string.join_refused), color = MaterialTheme.colorScheme.onSurfaceVariant)
        else -> {
            var message by rememberSaveable { mutableStateOf("") }
            OutlinedTextField(
                value = message,
                onValueChange = { message = it.take(RoomLimits.JOIN_MESSAGE_MAX) },
                label = { Text(stringResource(Res.string.join_message)) },
                modifier = Modifier.fillMaxWidth(),
            )
            Button(onClick = { actions.onJoin(message.ifBlank { null }) }, enabled = !state.busy, modifier = Modifier.fillMaxWidth()) {
                Text(stringResource(Res.string.join_send))
            }
        }
    }
}

@Composable
private fun JoinRequests(state: RoomState.Loaded, actions: RoomActions) {
    Text(stringResource(Res.string.join_requests), style = MaterialTheme.typography.titleMedium)
    state.joinRequests.forEach { request ->
        Card(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text("${request.user.displayName} · @${request.user.handle}", style = MaterialTheme.typography.titleSmall)
                request.message?.let { Text(it, style = MaterialTheme.typography.bodyMedium) }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(onClick = { actions.onDecide(request.id, true) }, enabled = !state.busy) { Text(stringResource(Res.string.join_accept)) }
                    TextButton(onClick = { actions.onDecide(request.id, false) }, enabled = !state.busy) { Text(stringResource(Res.string.join_refuse)) }
                }
            }
        }
    }
}

@Composable
private fun Notice(notice: RoomNotice) {
    val (text, error) = when (notice) {
        is RoomNotice.SecretsMasked -> pluralStringResource(Res.plurals.notice_secrets, notice.count, notice.count) to false
        RoomNotice.Queued -> stringResource(Res.string.notice_queued) to false
        RoomNotice.JoinSent -> stringResource(Res.string.room_notice_join_sent) to false
        RoomNotice.Done -> stringResource(Res.string.room_notice_done) to false
        is RoomNotice.Failed -> stringResource(failureLabel(notice.code)) to true
    }
    Text(
        text,
        color = if (error) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
    )
}

/** Tâches par colonne du Kanban (R11), dans l'ordre du travail. */
@Composable
private fun Tasks(state: RoomState.Loaded, meHandle: String, actions: RoomActions) {
    if (state.tasks.isEmpty()) Text(stringResource(Res.string.tasks_empty), color = MaterialTheme.colorScheme.onSurfaceVariant)
    TASK_STATUSES.forEach { status ->
        val column = state.tasks.filter { it.status == status }
        if (column.isEmpty()) return@forEach
        Text(stringResource(taskStatusLabel(status)) + " · ${column.size}", style = MaterialTheme.typography.titleMedium)
        column.forEach { task -> TaskCard(task, state, meHandle, actions) }
    }
    if (state.isMember) NewTask(state.busy, actions.onCreateTask)
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun TaskCard(task: TaskView, state: RoomState.Loaded, meHandle: String, actions: RoomActions) {
    val uriHandler = LocalUriHandler.current
    val mine = task.assignee?.handle.equals(meHandle, ignoreCase = true)
    val pending = task.id in state.pendingTaskIds
    OutlinedCard(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(task.title, style = MaterialTheme.typography.titleSmall)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Pill(stringResource(levelLabel(task.level)))
                if (task.fromGithubIssue) Pill(stringResource(Res.string.task_from_issue))
                when (task.verification) {
                    "github_verified" -> Pill(stringResource(Res.string.task_verified), successColor)
                    "declared" -> Pill(stringResource(Res.string.task_declared))
                }
            }
            task.description?.takeIf { it.isNotBlank() }?.let { Text(it, style = MaterialTheme.typography.bodySmall, maxLines = 4) }
            task.assignee?.let { Text(stringResource(Res.string.task_assignee, it.displayName), style = MaterialTheme.typography.bodySmall) }
            task.prUrl?.let { url -> TextButton(onClick = { uriHandler.openUri(url) }) { Text(stringResource(Res.string.task_pr)) } }
            if (pending) {
                Text(stringResource(Res.string.task_pending), color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.labelLarge)
                return@Column
            }
            when {
                task.status == "open" && state.isMember ->
                    Button(onClick = { actions.onTake(task.id) }, enabled = !state.busy) { Text(stringResource(Res.string.task_take)) }
                task.status == "taken" && mine -> PrField(Res.string.task_submit, required = true, state.busy) { actions.onSubmit(task.id, it.orEmpty()) }
                task.status in setOf("taken", "in_review") && state.canManage ->
                    PrField(Res.string.task_complete, required = false, state.busy, initial = task.prUrl.orEmpty()) { actions.onComplete(task.id, it) }
            }
        }
    }
}

@Composable
private fun PrField(
    label: org.jetbrains.compose.resources.StringResource,
    required: Boolean,
    busy: Boolean,
    initial: String = "",
    onSend: (String?) -> Unit,
) {
    var url by rememberSaveable { mutableStateOf(initial) }
    val valid = if (url.isBlank()) !required else PULL_REQUEST_URL.matches(url.trim())
    OutlinedTextField(
        value = url,
        onValueChange = { url = it.trim().take(300) },
        label = { Text(stringResource(Res.string.task_pr)) },
        placeholder = { Text(stringResource(Res.string.task_pr_hint)) },
        isError = url.isNotBlank() && !valid,
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri),
        modifier = Modifier.fillMaxWidth(),
    )
    OutlinedButton(onClick = { onSend(url.ifBlank { null }) }, enabled = valid && !busy) { Text(stringResource(label)) }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun NewTask(busy: Boolean, onCreate: (String, String?, String) -> Unit) {
    var title by rememberSaveable { mutableStateOf("") }
    var description by rememberSaveable { mutableStateOf("") }
    var level by rememberSaveable { mutableStateOf("medium") }
    Text(stringResource(Res.string.task_new), style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(top = 8.dp))
    OutlinedTextField(
        value = title,
        onValueChange = { title = it.take(RoomLimits.TASK_TITLE_MAX) },
        label = { Text(stringResource(Res.string.task_title)) },
        singleLine = true,
        modifier = Modifier.fillMaxWidth(),
    )
    OutlinedTextField(
        value = description,
        onValueChange = { description = it.take(5_000) },
        label = { Text(stringResource(Res.string.task_description)) },
        minLines = 2,
        modifier = Modifier.fillMaxWidth(),
    )
    Text(stringResource(Res.string.task_level), style = MaterialTheme.typography.titleSmall)
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        TASK_LEVELS.forEach { l -> FilterChip(selected = level == l, onClick = { level = l }, label = { Text(stringResource(levelLabel(l))) }) }
    }
    Button(
        onClick = {
            onCreate(title, description.ifBlank { null }, level)
            title = ""
            description = ""
        },
        enabled = !busy && title.trim().length >= RoomLimits.TASK_TITLE_MIN,
        modifier = Modifier.fillMaxWidth(),
    ) { Text(stringResource(Res.string.task_add)) }
}

/** R4 : discussion de la salle, du plus ancien au plus récent ; rédigeable hors ligne. */
@Composable
private fun Chat(state: RoomState.Loaded, actions: RoomActions) {
    if (!state.isMember) {
        Text(stringResource(Res.string.chat_members_only), color = MaterialTheme.colorScheme.onSurfaceVariant)
        return
    }
    val months = stringArrayResource(Res.array.months)
    if (state.messages.isEmpty() && state.pendingMessages.isEmpty()) {
        Text(stringResource(Res.string.chat_empty), color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
    state.messages.forEach { m ->
        Column(Modifier.fillMaxWidth().semantics(mergeDescendants = true) {}) {
            Text(
                stringResource(Res.string.question_meta, m.author.displayName, dayMonthYear(m.createdAt, months)),
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(m.body, style = MaterialTheme.typography.bodyMedium)
        }
    }
    state.pendingMessages.forEach { m ->
        Column(Modifier.fillMaxWidth()) {
            Text(m.preview, style = MaterialTheme.typography.bodyMedium)
            Text(
                stringResource(if (m.failed) Res.string.pending_failed else Res.string.pending_badge),
                style = MaterialTheme.typography.labelMedium,
                color = if (m.failed) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary,
            )
        }
    }
    var draft by rememberSaveable { mutableStateOf("") }
    LaunchedEffect(state.messagesPosted) { if (state.messagesPosted > 0) draft = "" }
    OutlinedTextField(
        value = draft,
        onValueChange = { draft = it.take(RoomLimits.MESSAGE_MAX) },
        label = { Text(stringResource(Res.string.chat_message)) },
        minLines = 2,
        modifier = Modifier.fillMaxWidth(),
    )
    Button(onClick = { actions.onPostMessage(draft) }, enabled = !state.busy && draft.isNotBlank(), modifier = Modifier.fillMaxWidth()) {
        Text(stringResource(Res.string.chat_send))
    }
}
