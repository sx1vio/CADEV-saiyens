package africa.devhub.ui.sos

import africa.devhub.resources.answers_count
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.graphics.Color
import androidx.compose.material3.Surface
import androidx.compose.material3.Icon
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.clickable
import androidx.compose.foundation.border
import androidx.compose.foundation.background
import africa.devhub.resources.urgency_high
import africa.devhub.resources.status_resolved
import africa.devhub.resources.status_closed
import africa.devhub.resources.status_open
import africa.devhub.ui.theme.warningColor
import africa.devhub.ui.components.TechTag
import africa.devhub.ui.components.SecondaryPill
import africa.devhub.ui.components.Initials
import africa.devhub.ui.components.DevHubIcons
import africa.devhub.ui.components.DevCard
import africa.devhub.ui.components.Badge
import africa.devhub.ui.components.openWeb
import africa.devhub.resources.Res
import africa.devhub.resources.accept_answer
import africa.devhub.resources.ai_disclaimer
import africa.devhub.resources.ai_failed
import africa.devhub.resources.ai_pending
import africa.devhub.resources.ai_title
import africa.devhub.resources.answer_accepted
import africa.devhub.resources.answer_hint
import africa.devhub.resources.answers_title
import africa.devhub.resources.cached_copy
import africa.devhub.resources.notice_queued
import africa.devhub.resources.pending_badge
import africa.devhub.resources.pending_failed
import africa.devhub.resources.claim
import africa.devhub.resources.claimed_by
import africa.devhub.resources.code_title
import africa.devhub.resources.months
import africa.devhub.resources.no_answers
import africa.devhub.resources.notice_accepted
import africa.devhub.resources.notice_already_voted
import africa.devhub.resources.notice_claimed
import africa.devhub.resources.notice_secrets
import africa.devhub.resources.question_failed
import africa.devhub.resources.question_meta
import africa.devhub.resources.question_not_found
import africa.devhub.resources.repro_open
import africa.devhub.resources.retry
import africa.devhub.resources.send_answer
import africa.devhub.resources.trust_demo
import africa.devhub.resources.vote_helpful
import africa.devhub.resources.your_answer
import africa.devhub.sos.Answer
import africa.devhub.sos.QuestionDetail
import africa.devhub.sos.QuestionState
import africa.devhub.sos.SosLimits
import africa.devhub.sos.SosNotice
import africa.devhub.ui.components.LoadingScreen
import africa.devhub.ui.components.Pill
import africa.devhub.ui.components.ScreenColumn
import africa.devhub.ui.components.dayMonthYear
import africa.devhub.ui.theme.successColor
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import africa.devhub.ui.components.Button
import africa.devhub.ui.components.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import africa.devhub.ui.components.OutlinedCard
import africa.devhub.ui.components.OutlinedTextField
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
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import org.jetbrains.compose.resources.pluralStringResource
import org.jetbrains.compose.resources.stringArrayResource
import org.jetbrains.compose.resources.stringResource

/** Ce que l'écran peut faire sur la question. */
class QuestionActions(
    val onRetry: () -> Unit,
    val onVote: (answerId: String) -> Unit,
    val onAccept: (answerId: String) -> Unit,
    val onClaim: () -> Unit,
    val onPostAnswer: (body: String) -> Unit,
)

@Composable
fun QuestionScreen(state: QuestionState, meHandle: String, actions: QuestionActions) {
    when (state) {
        QuestionState.Loading -> LoadingScreen()
        QuestionState.NotFound -> ScreenColumn { Text(stringResource(Res.string.question_not_found)) }
        QuestionState.Failed -> ScreenColumn {
            Text(stringResource(Res.string.question_failed))
            Button(onClick = actions.onRetry, modifier = Modifier.fillMaxWidth()) { Text(stringResource(Res.string.retry)) }
        }
        is QuestionState.Loaded -> Loaded(state, meHandle, actions)
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Loaded(state: QuestionState.Loaded, meHandle: String, actions: QuestionActions) {
    val q = state.question
    val months = stringArrayResource(Res.array.months)
    val isAuthor = q.author.handle.equals(meHandle, ignoreCase = true)
    ScreenColumn(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        if (state.cachedAt != null) {
            Text(stringResource(Res.string.cached_copy), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            val resolved = q.status == "resolved"
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                if (q.urgency == "high" && !resolved) Badge(stringResource(Res.string.urgency_high), MaterialTheme.colorScheme.error)
                when (q.status) {
                    "resolved" -> Badge(stringResource(Res.string.status_resolved), successColor, DevHubIcons.CircleCheck)
                    "closed" -> Badge(stringResource(Res.string.status_closed), MaterialTheme.colorScheme.onSurfaceVariant)
                    else -> Badge(stringResource(Res.string.status_open), MaterialTheme.colorScheme.primary)
                }
                if (q.author.isDemo) Badge(stringResource(Res.string.trust_demo), MaterialTheme.colorScheme.error)
            }
            Text(q.title, style = MaterialTheme.typography.headlineSmall, modifier = Modifier.semantics { heading() })
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Initials(q.author.displayName, size = 24.dp)
                Text(
                    stringResource(Res.string.question_meta, q.author.displayName, dayMonthYear(q.createdAt, months)),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                q.tags.forEach { TechTag(it.label) }
            }
        }
        DevCard {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(q.body, style = MaterialTheme.typography.bodyLarge)
                q.codeSnippet?.takeIf { it.isNotBlank() }?.let { CodeBlock(it) }
                q.reproUrl?.let { url ->
                    val uriHandler = LocalUriHandler.current
                    Row(
                        Modifier.clickable(role = Role.Button) { uriHandler.openWeb(url) }.defaultMinSize(minHeight = 40.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        Text(stringResource(Res.string.repro_open), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
                        Icon(DevHubIcons.ExternalLink, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(14.dp))
                    }
                }
            }
        }

        AiHint(q)
        Helpers(q, meHandle, isAuthor, state.busy, actions.onClaim)

        state.notice?.let { Notice(it) }

        Text(
            pluralStringResource(Res.plurals.answers_count, q.answers.size, q.answers.size),
            style = MaterialTheme.typography.titleMedium,
            modifier = Modifier.padding(top = 4.dp).semantics { heading() },
        )
        if (q.answers.isEmpty() && state.pendingAnswers.isEmpty()) {
            Surface(
                shape = RoundedCornerShape(10.dp),
                color = Color.Transparent,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(
                    stringResource(Res.string.no_answers),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(20.dp),
                )
            }
        }
        q.answers.forEach { answer ->
            AnswerCard(
                answer = answer,
                months = months,
                canVote = !answer.author.handle.equals(meHandle, ignoreCase = true),
                canAccept = isAuthor && q.status == "open" && !answer.isAccepted &&
                    !answer.author.handle.equals(meHandle, ignoreCase = true),
                busy = state.busy,
                onVote = { actions.onVote(answer.id) },
                onAccept = { actions.onAccept(answer.id) },
            )
        }
        state.pendingAnswers.forEach { pending ->
            DevCard {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(pending.preview, style = MaterialTheme.typography.bodyMedium)
                    Text(
                        stringResource(if (pending.failed) Res.string.pending_failed else Res.string.pending_badge),
                        style = MaterialTheme.typography.labelLarge,
                        color = if (pending.failed) MaterialTheme.colorScheme.error else warningColor,
                    )
                }
            }
        }
        if (q.status != "closed") Composer(state.busy, state.answersPosted, actions.onPostAnswer)
    }
}

@Composable
private fun CodeBlock(code: String) {
    Text(stringResource(Res.string.code_title), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
    Surface(shape = RoundedCornerShape(8.dp), color = MaterialTheme.colorScheme.background, modifier = Modifier.fillMaxWidth()) {
        Text(
            code,
            fontFamily = FontFamily.Monospace,
            style = MaterialTheme.typography.bodySmall,
            softWrap = false,
            modifier = Modifier.horizontalScroll(rememberScrollState()).padding(12.dp),
        )
    }
}

/** S2 : toujours présentée comme générée par IA, jamais comme vérifiée. */
@Composable
private fun AiHint(q: QuestionDetail) {
    if (q.aiStatus !in listOf("done", "pending", "failed")) return
    DevCard {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Box(Modifier.size(36.dp).background(Color.Black, RoundedCornerShape(8.dp)), contentAlignment = Alignment.Center) {
                    Icon(DevHubIcons.Sparkles, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                }
                Text(stringResource(Res.string.ai_title), style = MaterialTheme.typography.titleSmall)
            }
            when (q.aiStatus) {
                "done" -> q.aiHint?.let { hint ->
                    Text(hint, style = MaterialTheme.typography.bodyMedium)
                    Text(
                        stringResource(Res.string.ai_disclaimer),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                "pending" -> Text(
                    stringResource(Res.string.ai_pending),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
                )
                else -> Text(stringResource(Res.string.ai_failed), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

/** S3, S11 : aidants sollicités ; « Je m'en occupe » pour celui qui prend la question. */
@Composable
private fun Helpers(q: QuestionDetail, meHandle: String, isAuthor: Boolean, busy: Boolean, onClaim: () -> Unit) {
    q.helpers.filter { it.claimedAt != null }.forEach {
        Text(stringResource(Res.string.claimed_by, it.helper.displayName), color = successColor)
    }
    val solicited = q.helpers.firstOrNull { it.helper.handle.equals(meHandle, ignoreCase = true) }
    if (!isAuthor && q.status == "open" && solicited != null && solicited.claimedAt == null) {
        Button(onClick = onClaim, enabled = !busy, modifier = Modifier.fillMaxWidth()) {
            Text(stringResource(Res.string.claim))
        }
    }
}

@Composable
private fun Notice(notice: SosNotice) {
    val (text, error) = when (notice) {
        is SosNotice.SecretsMasked -> pluralStringResource(Res.plurals.notice_secrets, notice.count, notice.count) to false
        SosNotice.Claimed -> stringResource(Res.string.notice_claimed) to false
        SosNotice.Accepted -> stringResource(Res.string.notice_accepted) to false
        SosNotice.AlreadyVoted -> stringResource(Res.string.notice_already_voted) to false
        SosNotice.Queued -> stringResource(Res.string.notice_queued) to false
        is SosNotice.Failed -> stringResource(failureLabel(notice.code)) to true
    }
    Text(
        text,
        color = if (error) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
    )
}

@Composable
private fun AnswerCard(
    answer: Answer,
    months: List<String>,
    canVote: Boolean,
    canAccept: Boolean,
    busy: Boolean,
    onVote: () -> Unit,
    onAccept: () -> Unit,
) {
    DevCard(if (answer.isAccepted) Modifier.border(1.5.dp, successColor, RoundedCornerShape(10.dp)) else Modifier) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Initials(answer.author.displayName, size = 32.dp)
                Column(Modifier.weight(1f)) {
                    Text(answer.author.displayName, style = MaterialTheme.typography.titleSmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text(dayMonthYear(answer.createdAt, months), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                if (answer.isAccepted) Badge(stringResource(Res.string.answer_accepted), successColor, DevHubIcons.CircleCheck)
            }
            Text(answer.body, style = MaterialTheme.typography.bodyMedium)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                if (canVote) {
                    SecondaryPill(stringResource(Res.string.vote_helpful, answer.helpfulCount), onVote, enabled = !busy)
                } else {
                    Text(stringResource(Res.string.vote_helpful, answer.helpfulCount), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                if (canAccept) TextButton(onClick = onAccept, enabled = !busy) { Text(stringResource(Res.string.accept_answer)) }
            }
        }
    }
}

@Composable
private fun Composer(busy: Boolean, answersPosted: Int, onPost: (String) -> Unit) {
    var draft by rememberSaveable { mutableStateOf("") }
    // Réponse publiée : le brouillon est vidé (pas avant, pour ne rien perdre en cas d'échec).
    LaunchedEffect(answersPosted) { if (answersPosted > 0) draft = "" }
    DevCard {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(
                value = draft,
                onValueChange = { draft = it.take(SosLimits.ANSWER_MAX) },
                label = { Text(stringResource(Res.string.your_answer)) },
                placeholder = { Text(stringResource(Res.string.answer_hint)) },
                minLines = 4,
                modifier = Modifier.fillMaxWidth().heightIn(min = 120.dp),
            )
            Button(onClick = { onPost(draft) }, enabled = !busy && draft.isNotBlank(), modifier = Modifier.align(Alignment.End)) {
                Text(stringResource(Res.string.send_answer))
            }
        }
    }
}
