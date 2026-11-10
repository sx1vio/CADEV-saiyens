package africa.devhub.ui.discover

import africa.devhub.discover.RulesState
import africa.devhub.resources.Res
import africa.devhub.resources.cached_copy
import africa.devhub.resources.proof_answer_accepted
import africa.devhub.resources.proof_demo
import africa.devhub.resources.proof_deployment
import africa.devhub.resources.proof_field_test
import africa.devhub.resources.proof_helpful
import africa.devhub.resources.proof_resolved
import africa.devhub.resources.proof_review
import africa.devhub.resources.proof_task
import africa.devhub.resources.retry
import africa.devhub.resources.rules_age
import africa.devhub.resources.rules_bonus
import africa.devhub.resources.rules_cap
import africa.devhub.resources.rules_failed
import africa.devhub.resources.rules_guards
import africa.devhub.resources.rules_levels
import africa.devhub.resources.rules_log
import africa.devhub.resources.rules_pairs
import africa.devhub.resources.rules_repo
import africa.devhub.resources.rules_scale
import africa.devhub.resources.rules_score
import africa.devhub.resources.rules_score_text
import africa.devhub.resources.rules_self
import africa.devhub.resources.rules_subtitle
import africa.devhub.resources.rules_votes
import africa.devhub.ui.components.LoadingScreen
import africa.devhub.ui.components.ScreenColumn
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import africa.devhub.ui.components.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import org.jetbrains.compose.resources.stringResource

/** X5 : barème, garde-fous et formule du score, servis par l'API (rien n'est recopié ici). */
@Composable
fun RulesScreen(state: RulesState, onRetry: () -> Unit) {
    when (state) {
        RulesState.Loading -> LoadingScreen()
        RulesState.Failed -> ScreenColumn {
            Text(stringResource(Res.string.rules_failed))
            Button(onClick = onRetry, modifier = Modifier.fillMaxWidth()) { Text(stringResource(Res.string.retry)) }
        }
        is RulesState.Loaded -> {
            val r = state.rules
            ScreenColumn {
                if (state.cachedAt != null) Text(stringResource(Res.string.cached_copy), style = MaterialTheme.typography.bodySmall)
                Text(stringResource(Res.string.rules_subtitle), style = MaterialTheme.typography.bodyLarge)
                Title(stringResource(Res.string.rules_scale))
                val rows = listOf(
                    "answer_accepted" to stringResource(Res.string.proof_answer_accepted),
                    "answer_fast_bonus" to stringResource(Res.string.rules_bonus, r.limits.fastBonusMinutes),
                    "answer_helpful_vote" to stringResource(Res.string.proof_helpful),
                    "task_completed" to stringResource(Res.string.proof_task),
                    "code_review_given" to stringResource(Res.string.proof_review),
                    "project_demo_shared" to stringResource(Res.string.proof_demo),
                    "question_resolved" to stringResource(Res.string.proof_resolved),
                    "deployment_verified" to stringResource(Res.string.proof_deployment),
                    "field_test_confirmed" to stringResource(Res.string.proof_field_test),
                )
                rows.forEach { (kind, label) ->
                    val points = r.points[kind] ?: return@forEach
                    Row(Modifier.fillMaxWidth()) {
                        Text(label, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
                        Text("+$points", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                    }
                }
                Title(stringResource(Res.string.rules_guards))
                listOf(
                    stringResource(Res.string.rules_cap, r.limits.dailyCap),
                    stringResource(Res.string.rules_votes, r.limits.helpfulVotesPerAnswer),
                    stringResource(Res.string.rules_pairs, r.limits.validationsPerPairPerWeek),
                    stringResource(Res.string.rules_age, r.limits.minVoterAccountAgeHours),
                    stringResource(Res.string.rules_self),
                    stringResource(Res.string.rules_log),
                ).forEach { Text("• $it", style = MaterialTheme.typography.bodyMedium) }
                Title(stringResource(Res.string.rules_score))
                Text(stringResource(Res.string.rules_score_text, r.scoring.githubCap, r.scoring.githubPerRepo, r.scoring.platformCap), style = MaterialTheme.typography.bodyMedium)
                Text(stringResource(Res.string.rules_repo, r.scoring.activeMonths), style = MaterialTheme.typography.bodyMedium)
                Text(stringResource(Res.string.rules_levels), style = MaterialTheme.typography.bodyMedium)
            }
        }
    }
}

@Composable
private fun Title(text: String) {
    Text(text, style = MaterialTheme.typography.titleMedium, modifier = Modifier.semantics { heading() })
}
