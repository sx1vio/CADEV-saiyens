package africa.devhub.ui.rooms

import africa.devhub.resources.Res
import africa.devhub.resources.fb_all_stacks
import africa.devhub.resources.fb_cancel
import africa.devhub.resources.fb_cancelled
import africa.devhub.resources.fb_confirm
import africa.devhub.resources.fb_confirmed
import africa.devhub.resources.fb_confirmed_xp
import africa.devhub.resources.fb_empty
import africa.devhub.resources.fb_err_already_taken
import africa.devhub.resources.fb_err_generic
import africa.devhub.resources.fb_err_invalid_status
import africa.devhub.resources.fb_err_offline
import africa.devhub.resources.fb_err_self_review
import africa.devhub.resources.fb_failed
import africa.devhub.resources.fb_hint
import africa.devhub.resources.fb_kind_code_review
import africa.devhub.resources.fb_kind_feedback
import africa.devhub.resources.fb_my_stack
import africa.devhub.resources.fb_open_room
import africa.devhub.resources.fb_reviewed_by
import africa.devhub.resources.fb_status_cancelled
import africa.devhub.resources.fb_status_done
import africa.devhub.resources.fb_status_in_progress
import africa.devhub.resources.fb_status_open
import africa.devhub.resources.fb_take
import africa.devhub.resources.fb_taken
import africa.devhub.resources.fb_waiting
import africa.devhub.resources.djeli_point
import africa.devhub.resources.retry
import africa.devhub.rooms.FeedbackNotice
import africa.devhub.rooms.FeedbackRequest
import africa.devhub.rooms.FeedbackState
import africa.devhub.ui.components.Badge
import africa.devhub.ui.components.DevCard
import africa.devhub.ui.components.DevHubIcons
import africa.devhub.ui.components.EmptyCard
import africa.devhub.ui.components.FilterChip
import africa.devhub.ui.components.Initials
import africa.devhub.ui.components.PrimaryPill
import africa.devhub.ui.components.RemoteImage
import africa.devhub.ui.components.SecondaryPill
import africa.devhub.ui.components.TechTag
import africa.devhub.ui.passport.agoLabel
import africa.devhub.ui.theme.successColor
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import org.jetbrains.compose.resources.stringResource

/** Gestes de l'onglet « Revues demandées » : tout ce que l'écran peut déclencher. */
class FeedbackActions(
    val onStackOnly: (Boolean) -> Unit,
    val onRetry: () -> Unit,
    val onTake: (String) -> Unit,
    val onConfirm: (String) -> Unit,
    val onCancel: (String) -> Unit,
    val onDismissNotice: () -> Unit,
    val onOpenRoom: (code: String) -> Unit,
    val isMine: (FeedbackRequest) -> Boolean,
    val isMyReview: (FeedbackRequest) -> Boolean,
)

/** Flux des demandes de retour et de revue : même contenu et mêmes gestes que sur le web. */
fun LazyListScope.feedbackItems(state: FeedbackState, actions: FeedbackActions, openWeb: (String) -> Unit) {
    item {
        Text(stringResource(Res.string.fb_hint), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
    if (state.hasStack) {
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(selected = state.stackOnly, onClick = { actions.onStackOnly(true) }, label = { Text(stringResource(Res.string.fb_my_stack)) })
                FilterChip(selected = !state.stackOnly, onClick = { actions.onStackOnly(false) }, label = { Text(stringResource(Res.string.fb_all_stacks)) })
            }
        }
    }
    state.notice?.let { notice -> item { NoticeCard(notice, actions.onDismissNotice) } }
    when {
        state.loading && state.items.isEmpty() -> item {
            Box(Modifier.fillMaxWidth().padding(16.dp), Alignment.Center) { CircularProgressIndicator() }
        }
        state.failed && state.items.isEmpty() -> item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(stringResource(Res.string.fb_failed), color = MaterialTheme.colorScheme.error)
                OutlinedButton(onClick = actions.onRetry, modifier = Modifier.fillMaxWidth()) { Text(stringResource(Res.string.retry)) }
            }
        }
        state.items.isEmpty() -> item { EmptyCard(stringResource(Res.string.fb_empty), Res.drawable.djeli_point) }
        else -> items(state.items, key = { it.id }) { FeedbackCard(it, state.busyId == it.id, actions, openWeb) }
    }
}

@Composable
private fun NoticeCard(notice: FeedbackNotice, onDismiss: () -> Unit) {
    val isError = notice is FeedbackNotice.Error
    val text = when (notice) {
        FeedbackNotice.Taken -> stringResource(Res.string.fb_taken)
        is FeedbackNotice.Confirmed -> if (notice.points > 0) stringResource(Res.string.fb_confirmed_xp, notice.points) else stringResource(Res.string.fb_confirmed)
        FeedbackNotice.Cancelled -> stringResource(Res.string.fb_cancelled)
        is FeedbackNotice.Error -> when (notice.code) {
            "feedback.already_taken" -> stringResource(Res.string.fb_err_already_taken)
            "feedback.self_review" -> stringResource(Res.string.fb_err_self_review)
            "feedback.invalid_status" -> stringResource(Res.string.fb_err_invalid_status)
            "offline" -> stringResource(Res.string.fb_err_offline)
            else -> stringResource(Res.string.fb_err_generic)
        }
    }
    DevCard(Modifier.clickable(role = Role.Button, onClick = onDismiss)) {
        Text(
            text,
            style = MaterialTheme.typography.bodyMedium,
            color = if (isError) MaterialTheme.colorScheme.error else successColor,
            modifier = Modifier.padding(16.dp).semantics { liveRegion = LiveRegionMode.Polite },
        )
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun FeedbackCard(item: FeedbackRequest, busy: Boolean, actions: FeedbackActions, openWeb: (String) -> Unit) {
    val scheme = MaterialTheme.colorScheme
    val mine = actions.isMine(item)
    val reviewing = actions.isMyReview(item)
    val inProgress = item.status == "in_progress"
    DevCard {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Badge(
                    stringResource(if (item.kind == "code_review") Res.string.fb_kind_code_review else Res.string.fb_kind_feedback),
                    if (item.kind == "code_review") Lavender else Sky,
                )
                Badge(
                    stringResource(statusLabel(item.status)),
                    when (item.status) {
                        "done" -> successColor
                        "cancelled" -> scheme.onSurfaceVariant
                        "in_progress" -> Amber
                        else -> scheme.primary
                    },
                )
                Text(agoLabel(item.createdAt), style = MaterialTheme.typography.labelMedium, color = scheme.onSurfaceVariant)
            }
            Text(
                item.room.name,
                style = MaterialTheme.typography.titleSmall,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.clickable(role = Role.Button, onClickLabel = stringResource(Res.string.fb_open_room, item.room.name)) { actions.onOpenRoom(item.room.code) },
            )
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Box(Modifier.size(24.dp).clip(CircleShape)) {
                    Initials(item.requester.displayName, 24.dp)
                    RemoteImage(item.requester.avatarUrl, width = 72, modifier = Modifier.matchParentSize())
                }
                Text(item.requester.displayName, style = MaterialTheme.typography.bodyMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            item.note?.let { Text(it, style = MaterialTheme.typography.bodyMedium, color = scheme.onSurfaceVariant) }
            item.url?.let { url ->
                Row(
                    Modifier.clickable(role = Role.Button) { openWeb(url) },
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    Text(
                        url.removePrefix("https://"),
                        style = MaterialTheme.typography.bodyMedium,
                        color = scheme.primary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f, fill = false),
                    )
                    Icon(DevHubIcons.ExternalLink, contentDescription = null, tint = scheme.primary, modifier = Modifier.size(14.dp))
                }
            }
            if (item.stack.isNotEmpty()) {
                FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    item.stack.forEach { TechTag(it.label) }
                }
            }
            item.reviewer?.takeIf { item.status != "cancelled" }?.let {
                Text(stringResource(Res.string.fb_reviewed_by, it.displayName), style = MaterialTheme.typography.bodySmall, color = scheme.onSurfaceVariant)
            }
            if (reviewing && inProgress) {
                Text(stringResource(Res.string.fb_waiting), style = MaterialTheme.typography.bodySmall, color = scheme.onSurfaceVariant)
            }
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if (!mine && item.status == "open") {
                    SecondaryPill(stringResource(Res.string.fb_take), { actions.onTake(item.id) }, enabled = !busy)
                }
                if (mine && inProgress) {
                    PrimaryPill(stringResource(Res.string.fb_confirm), { actions.onConfirm(item.id) }, enabled = !busy, busy = busy)
                }
                if (mine && (item.status == "open" || inProgress)) {
                    TextButton(onClick = { actions.onCancel(item.id) }, enabled = !busy) { Text(stringResource(Res.string.fb_cancel)) }
                }
            }
        }
    }
}

/** Teintes `lavender`, `sky` et ambre des pastilles du web. */
private val Lavender = Color(0xFF6D28D9)
private val Sky = Color(0xFF0369A1)
private val Amber = Color(0xFFB45309)

private fun statusLabel(status: String) = when (status) {
    "in_progress" -> Res.string.fb_status_in_progress
    "done" -> Res.string.fb_status_done
    "cancelled" -> Res.string.fb_status_cancelled
    else -> Res.string.fb_status_open
}
