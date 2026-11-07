package africa.devhub.ui.messages

import africa.devhub.messages.Conversation
import africa.devhub.messages.ConversationState
import africa.devhub.messages.ConversationsState
import africa.devhub.messages.DM_MAX
import africa.devhub.resources.Res
import africa.devhub.resources.cached_copy
import africa.devhub.resources.messages_blocked
import africa.devhub.resources.messages_empty
import africa.devhub.resources.messages_failed
import africa.devhub.resources.messages_hidden
import africa.devhub.resources.messages_older
import africa.devhub.resources.messages_refused
import africa.devhub.resources.messages_send
import africa.devhub.resources.messages_unread
import africa.devhub.resources.messages_write
import africa.devhub.resources.messages_you
import africa.devhub.resources.months
import africa.devhub.resources.pending_badge
import africa.devhub.resources.pending_failed
import africa.devhub.resources.retry
import africa.devhub.ui.components.LoadingScreen
import africa.devhub.ui.components.ScreenColumn
import africa.devhub.ui.components.dayMonthYear
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import org.jetbrains.compose.resources.stringArrayResource
import org.jetbrains.compose.resources.stringResource

@Composable
fun ConversationsScreen(state: ConversationsState, onOpen: (Conversation) -> Unit, onRetry: () -> Unit) {
    ScreenColumn {
        if (state.cachedAt != null) Text(stringResource(Res.string.cached_copy), style = MaterialTheme.typography.bodySmall)
        when {
            state.loading && state.items.isEmpty() -> LoadingScreen()
            state.failed && state.items.isEmpty() -> {
                Text(stringResource(Res.string.messages_failed), color = MaterialTheme.colorScheme.error)
                OutlinedButton(onClick = onRetry, modifier = Modifier.fillMaxWidth()) { Text(stringResource(Res.string.retry)) }
            }
            state.items.isEmpty() -> Text(stringResource(Res.string.messages_empty), color = MaterialTheme.colorScheme.onSurfaceVariant)
            else -> state.items.forEach { c ->
                Card(Modifier.fillMaxWidth().clickable(role = Role.Button, onClick = { onOpen(c) })) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(c.peer.displayName, style = MaterialTheme.typography.titleMedium, fontWeight = if (c.unread > 0) FontWeight.Bold else FontWeight.Normal)
                        c.lastMessage?.let { last ->
                            Text(
                                if (last.mine) stringResource(Res.string.messages_you, last.body) else last.body,
                                style = MaterialTheme.typography.bodyMedium,
                                maxLines = 2,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        if (c.unread > 0) Text(stringResource(Res.string.messages_unread, c.unread), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
                    }
                }
            }
        }
    }
}

@Composable
fun ConversationScreen(state: ConversationState, onSend: (String) -> Unit, onOlder: () -> Unit, onRetry: () -> Unit) {
    when (state) {
        ConversationState.Loading -> LoadingScreen()
        ConversationState.NotFound, ConversationState.Failed -> ScreenColumn {
            Text(stringResource(Res.string.messages_failed))
            Button(onClick = onRetry, modifier = Modifier.fillMaxWidth()) { Text(stringResource(Res.string.retry)) }
        }
        is ConversationState.Loaded -> {
            val months = stringArrayResource(Res.array.months)
            ScreenColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if (state.cachedAt != null) Text(stringResource(Res.string.cached_copy), style = MaterialTheme.typography.bodySmall)
                Text(state.conversation.peer.displayName, style = MaterialTheme.typography.titleLarge)
                if (state.hasMore) TextButton(onClick = onOlder) { Text(stringResource(Res.string.messages_older)) }
                state.messages.forEach { m ->
                    Bubble(
                        text = if (m.hidden) stringResource(Res.string.messages_hidden) else m.body,
                        meta = dayMonthYear(m.createdAt, months),
                        mine = m.mine,
                    )
                }
                state.pending.forEach { p ->
                    Bubble(
                        text = p.preview,
                        meta = stringResource(if (p.failed) Res.string.pending_failed else Res.string.pending_badge),
                        mine = true,
                    )
                }
                state.error?.let { Text(stringResource(Res.string.messages_refused), color = MaterialTheme.colorScheme.error) }
                if (!state.conversation.canWrite) {
                    Text(stringResource(Res.string.messages_blocked), color = MaterialTheme.colorScheme.onSurfaceVariant)
                } else {
                    var draft by rememberSaveable { mutableStateOf("") }
                    LaunchedEffect(state.sent) { if (state.sent > 0) draft = "" }
                    OutlinedTextField(
                        value = draft,
                        onValueChange = { draft = it.take(DM_MAX) },
                        label = { Text(stringResource(Res.string.messages_write)) },
                        minLines = 2,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Button(onClick = { onSend(draft) }, enabled = draft.isNotBlank(), modifier = Modifier.fillMaxWidth()) {
                        Text(stringResource(Res.string.messages_send))
                    }
                }
            }
        }
    }
}

@Composable
private fun Bubble(text: String, meta: String, mine: Boolean) {
    Box(Modifier.fillMaxWidth(), contentAlignment = if (mine) Alignment.CenterEnd else Alignment.CenterStart) {
        Surface(
            shape = RoundedCornerShape(12.dp),
            color = if (mine) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface,
            modifier = Modifier.widthIn(max = 320.dp),
        ) {
            Column(Modifier.padding(horizontal = 12.dp, vertical = 8.dp)) {
                Text(text, style = MaterialTheme.typography.bodyMedium)
                Text(meta, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}
