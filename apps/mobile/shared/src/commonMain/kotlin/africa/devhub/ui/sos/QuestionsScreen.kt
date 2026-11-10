package africa.devhub.ui.sos

import africa.devhub.resources.Res
import africa.devhub.ui.components.EmptyCard
import africa.devhub.resources.djeli_laptop
import africa.devhub.resources.answers_count
import africa.devhub.resources.cached_copy
import africa.devhub.resources.pending_badge
import africa.devhub.resources.pending_failed
import africa.devhub.resources.filter_for_me
import africa.devhub.resources.filter_mine
import africa.devhub.resources.filter_recent
import africa.devhub.resources.filter_unanswered
import africa.devhub.resources.months
import africa.devhub.resources.proofs_more
import africa.devhub.resources.question_meta
import africa.devhub.resources.retry
import africa.devhub.resources.sos_ask
import africa.devhub.resources.sos_empty
import africa.devhub.resources.sos_failed
import africa.devhub.resources.sos_search
import africa.devhub.resources.sos_no_answer
import africa.devhub.resources.status_resolved
import africa.devhub.resources.urgency_high
import africa.devhub.ui.components.Badge
import africa.devhub.ui.components.DevCard
import africa.devhub.ui.components.DevHubIcons
import africa.devhub.ui.components.Initials
import africa.devhub.ui.components.TechTag
import africa.devhub.ui.theme.Glass
import africa.devhub.ui.theme.successColor
import africa.devhub.ui.theme.warningColor
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import africa.devhub.sos.PendingQuestion
import africa.devhub.sos.QuestionFilter
import africa.devhub.sos.QuestionSummary
import africa.devhub.sos.QuestionsState
import africa.devhub.ui.components.dayMonthYear
import androidx.compose.foundation.layout.size
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
import africa.devhub.ui.components.Card
import androidx.compose.material3.CircularProgressIndicator
import africa.devhub.ui.components.ExtendedFloatingActionButton
import africa.devhub.ui.components.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import africa.devhub.ui.components.OutlinedCard
import africa.devhub.ui.components.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import org.jetbrains.compose.resources.pluralStringResource
import org.jetbrains.compose.resources.stringArrayResource
import org.jetbrains.compose.resources.stringResource

/** S6, S16 : questions récentes, sans réponse, pour moi, les miennes ; recherche plein texte. */
@Composable
fun QuestionsScreen(
    state: QuestionsState,
    onFilter: (QuestionFilter) -> Unit,
    onQuery: (String) -> Unit,
    onRetry: () -> Unit,
    onLoadMore: () -> Unit,
    onOpen: (String) -> Unit,
    onAsk: () -> Unit,
) {
    val months = stringArrayResource(Res.array.months)
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.TopCenter) {
        LazyColumn(
            modifier = Modifier.widthIn(max = 560.dp).fillMaxWidth(),
            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 16.dp, bottom = 96.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            item {
                OutlinedTextField(
                    value = state.query,
                    onValueChange = { onQuery(it.take(200)) },
                    label = { Text(stringResource(Res.string.sos_search)) },
                    leadingIcon = { androidx.compose.material3.Icon(africa.devhub.ui.components.DevHubIcons.Search, contentDescription = null, modifier = Modifier.size(18.dp)) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            item { Filters(state.filter, onFilter) }
            if (state.cachedAt != null) {
                item { Text(stringResource(Res.string.cached_copy), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            }
            items(state.pending, key = { "pending-" + it.opId }) { PendingCard(it) }
            if (!state.loading && !state.failed && state.items.isEmpty()) {
                item { EmptyCard(stringResource(Res.string.sos_empty), Res.drawable.djeli_laptop) }
            }
            items(state.items, key = { it.id }) { QuestionCard(it, months, onOpen) }
            item {
                when {
                    state.loading -> Box(Modifier.fillMaxWidth().padding(16.dp), Alignment.Center) { CircularProgressIndicator() }
                    state.failed -> Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(stringResource(Res.string.sos_failed), color = MaterialTheme.colorScheme.error)
                        OutlinedButton(onClick = onRetry, modifier = Modifier.fillMaxWidth()) {
                            Text(stringResource(Res.string.retry))
                        }
                    }
                    state.hasMore -> OutlinedButton(onClick = onLoadMore, modifier = Modifier.fillMaxWidth()) {
                        Text(stringResource(Res.string.proofs_more))
                    }
                }
            }
        }
        ExtendedFloatingActionButton(
            onClick = onAsk,
            modifier = Modifier.align(Alignment.BottomEnd).padding(16.dp),
        ) { Text(stringResource(Res.string.sos_ask)) }
    }
}

@Composable
private fun PendingCard(pending: PendingQuestion) {
    OutlinedCard(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(pending.title, style = MaterialTheme.typography.titleMedium)
            Text(
                stringResource(if (pending.failed) Res.string.pending_failed else Res.string.pending_badge),
                style = MaterialTheme.typography.labelLarge,
                color = if (pending.failed) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary,
            )
        }
    }
}

@Composable
private fun Filters(selected: QuestionFilter, onFilter: (QuestionFilter) -> Unit) {
    val filters = listOf(
        Triple(QuestionFilter.ForMe, Res.string.filter_for_me, DevHubIcons.Sparkles),
        Triple(QuestionFilter.Unanswered, Res.string.filter_unanswered, DevHubIcons.Inbox),
        Triple(QuestionFilter.Recent, Res.string.filter_recent, DevHubIcons.Layers),
        Triple(QuestionFilter.Mine, Res.string.filter_mine, DevHubIcons.Person),
    )
    Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        filters.forEach { (filter, label, icon) -> InkChip(filter == selected, { onFilter(filter) }, stringResource(label), icon) }
    }
}

/** Puce des onglets de questions du web : encre pleine quand elle est choisie, liseré gris sinon, avec son icône. */
@Composable
private fun InkChip(selected: Boolean, onClick: () -> Unit, label: String, icon: ImageVector) {
    val scheme = MaterialTheme.colorScheme
    Surface(
        onClick = onClick,
        shape = CircleShape,
        color = if (selected) scheme.onSurface else Glass.strong,
        contentColor = if (selected) scheme.background else scheme.onSurfaceVariant,
        border = if (selected) null else BorderStroke(1.dp, scheme.outline),
        modifier = Modifier.semantics { this.selected = selected },
    ) {
        Row(
            Modifier.defaultMinSize(minHeight = 36.dp).padding(horizontal = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Icon(icon, contentDescription = null, modifier = Modifier.size(14.dp))
            Text(label, style = MaterialTheme.typography.labelMedium)
        }
    }
}

/** Carte de question du web : auteur et date, états, titre, étiquettes, nombre de réponses. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun QuestionCard(question: QuestionSummary, months: List<String>, onOpen: (String) -> Unit) {
    val resolved = question.status == "resolved"
    val noAnswer = question.answerCount == 0 && !resolved
    DevCard(Modifier.clickable(role = Role.Button, onClick = { onOpen(question.id) })) {
        Column(Modifier.padding(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Initials(question.author.displayName, size = 24.dp)
                Text(question.author.displayName, style = MaterialTheme.typography.labelLarge, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f, fill = false))
                Text(dayMonthYear(question.createdAt, months), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
                Spacer(Modifier.weight(1f))
                if (question.urgency == "high" && !resolved) Badge(stringResource(Res.string.urgency_high), MaterialTheme.colorScheme.error)
                if (resolved) Badge(stringResource(Res.string.status_resolved), successColor, DevHubIcons.CircleCheck)
            }
            Text(question.title, style = MaterialTheme.typography.titleMedium, maxLines = 2, overflow = TextOverflow.Ellipsis)
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                FlowRow(Modifier.weight(1f), horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    question.tags.take(4).forEach { TechTag(it.label.ifBlank { it.slug }) }
                }
                val tone = if (noAnswer) warningColor else MaterialTheme.colorScheme.onSurfaceVariant
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Icon(DevHubIcons.MessageText, contentDescription = null, tint = tone, modifier = Modifier.size(16.dp))
                    Text(
                        if (question.answerCount > 0) question.answerCount.toString() else stringResource(Res.string.sos_no_answer),
                        style = MaterialTheme.typography.labelLarge,
                        color = tone,
                    )
                }
            }
        }
    }
}
