package africa.devhub.ui.passport

import africa.devhub.passport.ProofEvent
import africa.devhub.passport.ProofsState
import africa.devhub.resources.Res
import africa.devhub.resources.months
import africa.devhub.resources.proof_answer_accepted
import africa.devhub.resources.proof_demo
import africa.devhub.resources.proof_deployment
import africa.devhub.resources.proof_fast_bonus
import africa.devhub.resources.proof_field_test
import africa.devhub.resources.proof_helpful
import africa.devhub.resources.proof_other
import africa.devhub.resources.proof_resolved
import africa.devhub.resources.proof_review
import africa.devhub.resources.proof_revert
import africa.devhub.resources.proof_task
import africa.devhub.resources.proofs_empty
import africa.devhub.resources.proofs_failed
import africa.devhub.resources.proofs_more
import africa.devhub.resources.proofs_reverted
import africa.devhub.resources.proofs_total
import africa.devhub.resources.retry
import africa.devhub.ui.components.dayMonthYear
import africa.devhub.ui.theme.successColor
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.stringArrayResource
import org.jetbrains.compose.resources.stringResource

/** Journal public des Proof XP (X1) : chaque point a une source datée. */
@Composable
fun ProofsScreen(state: ProofsState, onLoadMore: () -> Unit, modifier: Modifier = Modifier) {
    val months = stringArrayResource(Res.array.months)
    Box(modifier, contentAlignment = Alignment.TopCenter) {
        LazyColumn(
            modifier = Modifier.widthIn(max = 560.dp).fillMaxWidth(),
            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            state.totalXp?.let { total ->
                item {
                    Text(
                        stringResource(Res.string.proofs_total, total),
                        style = MaterialTheme.typography.titleMedium,
                        modifier = Modifier.padding(bottom = 8.dp),
                    )
                }
            }
            if (!state.loading && !state.failed && state.events.isEmpty()) {
                item { Text(stringResource(Res.string.proofs_empty), color = MaterialTheme.colorScheme.onSurfaceVariant) }
            }
            items(state.events, key = { it.id }) { ProofRow(it, months) }
            item {
                when {
                    state.loading -> Box(Modifier.fillMaxWidth().padding(16.dp), Alignment.Center) { CircularProgressIndicator() }
                    state.failed -> Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(stringResource(Res.string.proofs_failed), color = MaterialTheme.colorScheme.error)
                        OutlinedButton(onClick = onLoadMore, modifier = Modifier.fillMaxWidth()) {
                            Text(stringResource(Res.string.retry))
                        }
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
private fun ProofRow(event: ProofEvent, months: List<String>) {
    val reverted = event.revertedAt != null
    Card(Modifier.fillMaxWidth()) {
        Row(
            Modifier.padding(16.dp).semantics(mergeDescendants = true) {},
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                Text(stringResource(kindLabel(event.kind)), style = MaterialTheme.typography.titleSmall)
                Text(
                    listOfNotNull(event.tag?.label, dayMonthYear(event.createdAt, months)).joinToString(" · "),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                if (reverted) {
                    Text(
                        stringResource(Res.string.proofs_reverted),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.error,
                    )
                }
            }
            Text(
                if (event.points > 0) "+${event.points}" else event.points.toString(),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = if (event.points < 0) MaterialTheme.colorScheme.error else successColor,
                textDecoration = if (reverted) TextDecoration.LineThrough else null,
            )
        }
    }
}

private fun kindLabel(kind: String): StringResource = when (kind) {
    "answer_accepted" -> Res.string.proof_answer_accepted
    "answer_fast_bonus" -> Res.string.proof_fast_bonus
    "answer_helpful_vote" -> Res.string.proof_helpful
    "task_completed" -> Res.string.proof_task
    "code_review_given" -> Res.string.proof_review
    "project_demo_shared" -> Res.string.proof_demo
    "question_resolved" -> Res.string.proof_resolved
    "deployment_verified" -> Res.string.proof_deployment
    "field_test_confirmed" -> Res.string.proof_field_test
    "revert" -> Res.string.proof_revert
    else -> Res.string.proof_other
}
