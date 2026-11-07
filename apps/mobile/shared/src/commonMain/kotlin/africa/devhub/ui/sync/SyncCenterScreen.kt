package africa.devhub.ui.sync

import africa.devhub.offline.ActionStatus
import africa.devhub.offline.OutboxAction
import africa.devhub.resources.Res
import africa.devhub.resources.action_accept
import africa.devhub.resources.action_answer
import africa.devhub.resources.action_claim
import africa.devhub.resources.action_question
import africa.devhub.resources.action_vote
import africa.devhub.resources.sync_cancel
import africa.devhub.resources.sync_cancel_create_hint
import africa.devhub.resources.sync_empty
import africa.devhub.resources.sync_intro
import africa.devhub.resources.sync_now
import africa.devhub.resources.sync_retry
import africa.devhub.resources.sync_status_conflict
import africa.devhub.resources.sync_status_failed
import africa.devhub.resources.sync_status_pending
import africa.devhub.ui.components.ScreenColumn
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.stringResource

/** O8 : ce qui attend d'être envoyé, avec la possibilité de relancer ou d'abandonner. */
@Composable
fun SyncCenterScreen(
    actions: List<OutboxAction>,
    onSyncNow: () -> Unit,
    onRetry: (String) -> Unit,
    onCancel: (String) -> Unit,
) {
    ScreenColumn {
        Text(stringResource(Res.string.sync_intro), color = MaterialTheme.colorScheme.onSurfaceVariant)
        if (actions.isEmpty()) {
            Text(stringResource(Res.string.sync_empty), style = MaterialTheme.typography.titleMedium)
            return@ScreenColumn
        }
        Button(onClick = onSyncNow, modifier = Modifier.fillMaxWidth()) { Text(stringResource(Res.string.sync_now)) }
        if (actions.any { it.type == "question.create" }) {
            Text(
                stringResource(Res.string.sync_cancel_create_hint),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        actions.forEach { action -> ActionCard(action, onRetry, onCancel) }
    }
}

@Composable
private fun ActionCard(action: OutboxAction, onRetry: (String) -> Unit, onCancel: (String) -> Unit) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(stringResource(label(action.type)), style = MaterialTheme.typography.titleSmall)
            if (action.preview.isNotBlank()) Text(action.preview, style = MaterialTheme.typography.bodyMedium, maxLines = 3)
            val (status, error) = when (action.status) {
                ActionStatus.Pending -> stringResource(Res.string.sync_status_pending) to false
                ActionStatus.Failed -> stringResource(Res.string.sync_status_failed, action.lastError ?: "?") to true
                ActionStatus.Conflict -> stringResource(Res.string.sync_status_conflict) to true
            }
            Text(
                status,
                style = MaterialTheme.typography.bodySmall,
                color = if (error) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (action.status != ActionStatus.Pending) {
                    OutlinedButton(onClick = { onRetry(action.opId) }) { Text(stringResource(Res.string.sync_retry)) }
                }
                TextButton(onClick = { onCancel(action.opId) }) { Text(stringResource(Res.string.sync_cancel)) }
            }
        }
    }
}

private fun label(type: String): StringResource = when (type) {
    "question.create" -> Res.string.action_question
    "answer.create" -> Res.string.action_answer
    "answer.vote" -> Res.string.action_vote
    "answer.accept" -> Res.string.action_accept
    else -> Res.string.action_claim
}
