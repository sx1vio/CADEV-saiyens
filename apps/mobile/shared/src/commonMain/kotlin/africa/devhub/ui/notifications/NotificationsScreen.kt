package africa.devhub.ui.notifications

import androidx.compose.ui.graphics.Color
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.background
import africa.devhub.ui.components.SecondaryPill
import africa.devhub.ui.components.DevCard
import africa.devhub.notifications.NotificationView
import africa.devhub.notifications.NotificationsState
import africa.devhub.resources.Res
import africa.devhub.ui.components.EmptyCard
import africa.devhub.resources.djeli_wave
import africa.devhub.resources.months
import africa.devhub.resources.notif_accepted
import africa.devhub.resources.notif_answer
import africa.devhub.resources.notif_contact
import africa.devhub.resources.notif_empty
import africa.devhub.resources.notif_failed
import africa.devhub.resources.notif_feedback
import africa.devhub.resources.notif_join_decided
import africa.devhub.resources.notif_join_request
import africa.devhub.resources.notif_mark_all
import africa.devhub.resources.notif_match
import africa.devhub.resources.notif_other
import africa.devhub.resources.notif_task_done
import africa.devhub.resources.notif_unread
import africa.devhub.resources.proofs_more
import africa.devhub.resources.retry
import africa.devhub.ui.components.dayMonthYear
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import africa.devhub.ui.components.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import org.jetbrains.compose.resources.stringArrayResource
import org.jetbrains.compose.resources.stringResource

@Composable
fun NotificationsScreen(
    state: NotificationsState,
    onOpen: (NotificationView) -> Unit,
    onMarkAll: () -> Unit,
    onRetry: () -> Unit,
    onLoadMore: () -> Unit,
) {
    val months = stringArrayResource(Res.array.months)
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.TopCenter) {
        LazyColumn(
            modifier = Modifier.widthIn(max = 560.dp).fillMaxWidth(),
            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            if (state.items.any { it.readAt == null }) {
                item { SecondaryPill(stringResource(Res.string.notif_mark_all), onMarkAll, Modifier.fillMaxWidth()) }
            }
            if (!state.loading && !state.failed && state.items.isEmpty()) {
                item { EmptyCard(stringResource(Res.string.notif_empty), Res.drawable.djeli_wave) }
            }
            items(state.items, key = { it.id }) { n -> NotificationCard(n, months, onOpen) }
            item {
                when {
                    state.loading -> Box(Modifier.fillMaxWidth().padding(16.dp), Alignment.Center) { CircularProgressIndicator() }
                    state.failed -> Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(stringResource(Res.string.notif_failed), color = MaterialTheme.colorScheme.error)
                        OutlinedButton(onClick = onRetry, modifier = Modifier.fillMaxWidth()) { Text(stringResource(Res.string.retry)) }
                    }
                    state.hasMore -> OutlinedButton(onClick = onLoadMore, modifier = Modifier.fillMaxWidth()) {
                        Text(stringResource(Res.string.proofs_more))
                    }
                }
            }
        }
    }
}

@Composable
private fun NotificationCard(n: NotificationView, months: List<String>, onOpen: (NotificationView) -> Unit) {
    val unread = n.readAt == null
    DevCard(Modifier.clickable(role = Role.Button, onClick = { onOpen(n) })) {
        Row(Modifier.padding(16.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            // Pastille bleue : non lu. Le texte « Non lu » reste dans la ligne de date pour les lecteurs d'écran.
            Box(
                Modifier.padding(top = 7.dp).size(8.dp).background(if (unread) MaterialTheme.colorScheme.primary else Color.Transparent, CircleShape),
            )
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(notificationText(n), style = MaterialTheme.typography.bodyLarge, fontWeight = if (unread) FontWeight.SemiBold else FontWeight.Normal)
                Text(
                    listOfNotNull(if (unread) stringResource(Res.string.notif_unread) else null, dayMonthYear(n.createdAt, months)).joinToString(" · "),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

/** Texte construit côté application à partir du type et du payload (contrat des notifications). */
@Composable
fun notificationText(n: NotificationView): String {
    val title = n.text("title").orEmpty()
    val room = n.text("roomName").orEmpty()
    return when (n.type) {
        "match.request" -> stringResource(Res.string.notif_match, title)
        "answer.created" -> stringResource(Res.string.notif_answer, n.text("by") ?: "?", title)
        "answer.accepted" -> stringResource(Res.string.notif_accepted, title)
        "join.request" -> stringResource(Res.string.notif_join_request, room)
        "join.decided" -> stringResource(Res.string.notif_join_decided, room)
        "task.completed" -> stringResource(Res.string.notif_task_done, n.text("taskTitle").orEmpty())
        "contact.request" -> stringResource(Res.string.notif_contact, n.text("byName") ?: n.text("by") ?: "?")
        "feedback.requested", "feedback.taken", "feedback.confirmed", "feedback.cancelled" ->
            stringResource(Res.string.notif_feedback, room)
        else -> stringResource(Res.string.notif_other)
    }
}
