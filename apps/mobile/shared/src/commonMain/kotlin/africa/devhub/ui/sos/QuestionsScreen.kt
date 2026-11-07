package africa.devhub.ui.sos

import africa.devhub.resources.Res
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
import africa.devhub.sos.PendingQuestion
import africa.devhub.sos.QuestionFilter
import africa.devhub.sos.QuestionSummary
import africa.devhub.sos.QuestionsState
import africa.devhub.ui.components.dayMonthYear
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
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.OutlinedTextField
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
                item { Text(stringResource(Res.string.sos_empty), color = MaterialTheme.colorScheme.onSurfaceVariant) }
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
        QuestionFilter.Recent to Res.string.filter_recent,
        QuestionFilter.Unanswered to Res.string.filter_unanswered,
        QuestionFilter.ForMe to Res.string.filter_for_me,
        QuestionFilter.Mine to Res.string.filter_mine,
    )
    Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        filters.forEach { (filter, label) ->
            FilterChip(
                selected = filter == selected,
                onClick = { onFilter(filter) },
                label = { Text(stringResource(label)) },
            )
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun QuestionCard(question: QuestionSummary, months: List<String>, onOpen: (String) -> Unit) {
    Card(
        Modifier.fillMaxWidth().clickable(role = Role.Button, onClick = { onOpen(question.id) }),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(question.title, style = MaterialTheme.typography.titleMedium)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                StatusPill(question.status)
                UrgencyPill(question.urgency)
                question.tags.forEach { Text("#${it.slug}", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary) }
            }
            Text(
                stringResource(
                    Res.string.question_meta,
                    question.author.displayName,
                    dayMonthYear(question.createdAt, months),
                ) + " · " + pluralStringResource(Res.plurals.answers_count, question.answerCount, question.answerCount),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}
