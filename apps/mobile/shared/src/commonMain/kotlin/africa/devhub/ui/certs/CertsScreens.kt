@file:OptIn(kotlin.time.ExperimentalTime::class)

package africa.devhub.ui.certs

import africa.devhub.certs.AttemptResult
import africa.devhub.certs.CERT_CATALOG
import africa.devhub.certs.CertMeta
import africa.devhub.certs.CertQuestion
import africa.devhub.certs.CertsState
import africa.devhub.certs.ExamState
import africa.devhub.certs.MyCertification
import africa.devhub.certs.PracticeState
import africa.devhub.certs.certMeta
import africa.devhub.resources.Res
import africa.devhub.resources.cached_copy
import africa.devhub.resources.cert_active
import africa.devhub.resources.cert_exam
import africa.devhub.resources.cert_facts
import africa.devhub.resources.cert_last
import africa.devhub.resources.cert_mock
import africa.devhub.resources.cert_obtained
import africa.devhub.resources.cert_online
import africa.devhub.resources.cert_practice
import africa.devhub.resources.cert_syllabus
import africa.devhub.resources.cert_wait
import africa.devhub.resources.certs_failed
import africa.devhub.resources.certs_intro
import africa.devhub.resources.code_title
import africa.devhub.resources.exam_already_submitted
import africa.devhub.resources.exam_answered
import africa.devhub.resources.exam_failed
import africa.devhub.resources.exam_mock_limit
import africa.devhub.resources.exam_next
import africa.devhub.resources.exam_prev
import africa.devhub.resources.exam_submit
import africa.devhub.resources.exam_time
import africa.devhub.resources.exam_wait_code
import africa.devhub.resources.months
import africa.devhub.resources.practice_again
import africa.devhub.resources.practice_correct
import africa.devhub.resources.practice_done
import africa.devhub.resources.practice_next
import africa.devhub.resources.practice_progress
import africa.devhub.resources.practice_wrong
import africa.devhub.resources.result_certificate
import africa.devhub.resources.result_corrections
import africa.devhub.resources.result_failed
import africa.devhub.resources.result_good_answer
import africa.devhub.resources.result_late
import africa.devhub.resources.result_no_answer
import africa.devhub.resources.result_passed
import africa.devhub.resources.result_topic_line
import africa.devhub.resources.result_topics
import africa.devhub.resources.result_your_answer
import africa.devhub.resources.retry
import africa.devhub.ui.components.LoadingScreen
import africa.devhub.ui.components.Pill
import africa.devhub.ui.components.ScreenColumn
import africa.devhub.ui.components.dayMonthYear
import africa.devhub.ui.sos.failureLabel
import africa.devhub.ui.theme.successColor
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import org.jetbrains.compose.resources.stringArrayResource
import org.jetbrains.compose.resources.stringResource

/** Catalogue (embarqué, public) et mon avancement par certification. */
@Composable
fun CertsScreen(state: CertsState, onOpen: (String) -> Unit, onRetry: () -> Unit) {
    val months = stringArrayResource(Res.array.months)
    ScreenColumn {
        Text(stringResource(Res.string.certs_intro), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        if (state.cachedAt != null) Text(stringResource(Res.string.cached_copy), style = MaterialTheme.typography.bodySmall)
        if (state.failed && state.mine.isEmpty()) {
            Text(stringResource(Res.string.certs_failed), color = MaterialTheme.colorScheme.error)
            OutlinedButton(onClick = onRetry, modifier = Modifier.fillMaxWidth()) { Text(stringResource(Res.string.retry)) }
        }
        CERT_CATALOG.forEach { meta ->
            Card(Modifier.fillMaxWidth().clickable(role = Role.Button, onClick = { onOpen(meta.id) })) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(meta.title, style = MaterialTheme.typography.titleMedium)
                    Text(stringResource(Res.string.cert_facts, meta.minutes, meta.draw, meta.passScore), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Status(state.mine[meta.id], months)
                }
            }
        }
    }
}

@Composable
private fun Status(mine: MyCertification?, months: List<String>) {
    mine ?: return
    mine.certificate?.let { Pill(stringResource(Res.string.cert_obtained, it.bestScore), successColor); return }
    mine.active?.let { Pill(stringResource(Res.string.cert_active), MaterialTheme.colorScheme.primary); return }
    mine.nextAttemptAt?.let { Text(stringResource(Res.string.cert_wait, dayMonthYear(it, months)), style = MaterialTheme.typography.bodySmall); return }
    mine.lastAttempt?.let { Text(stringResource(Res.string.cert_last, it.score), style = MaterialTheme.typography.bodySmall) }
}

/** Une certification : programme, mon état, entraînement, examen blanc, examen. */
@Composable
fun CertScreen(certId: String, mine: MyCertification?, online: Boolean, onPractice: () -> Unit, onExam: (mode: String) -> Unit, nowMillis: Long) {
    val meta: CertMeta = certMeta(certId) ?: return
    val months = stringArrayResource(Res.array.months)
    // Après un échec, l'API impose un délai avant le prochain examen (l'examen blanc reste ouvert).
    val waiting = mine?.nextAttemptAt?.let { runCatching { kotlin.time.Instant.parse(it).toEpochMilliseconds() > nowMillis }.getOrDefault(false) } == true
    ScreenColumn {
        Text(meta.title, style = MaterialTheme.typography.titleLarge, modifier = Modifier.semantics { heading() })
        Text(stringResource(Res.string.cert_facts, meta.minutes, meta.draw, meta.passScore), style = MaterialTheme.typography.bodyMedium)
        Text(meta.description, style = MaterialTheme.typography.bodyMedium)
        Status(mine, months)
        Text(stringResource(Res.string.cert_syllabus), style = MaterialTheme.typography.titleMedium, modifier = Modifier.semantics { heading() })
        meta.syllabus.forEachIndexed { i, topic -> Text("${i + 1}. $topic", style = MaterialTheme.typography.bodyMedium) }
        if (!online) Text(stringResource(Res.string.cert_online), color = MaterialTheme.colorScheme.error)
        OutlinedButton(onClick = onPractice, enabled = online, modifier = Modifier.fillMaxWidth()) { Text(stringResource(Res.string.cert_practice)) }
        OutlinedButton(onClick = { onExam("mock") }, enabled = online, modifier = Modifier.fillMaxWidth()) { Text(stringResource(Res.string.cert_mock)) }
        Button(onClick = { onExam("exam") }, enabled = online && !waiting, modifier = Modifier.fillMaxWidth()) { Text(stringResource(Res.string.cert_exam)) }
    }
}

@Composable
private fun QuestionBlock(q: CertQuestion, selected: Int?, enabled: Boolean, onChoose: (Int) -> Unit, highlight: ((Int) -> Boolean?)? = null) {
    Text(q.q, style = MaterialTheme.typography.titleMedium)
    q.code?.takeIf { it.isNotBlank() }?.let { code ->
        Text(stringResource(Res.string.code_title), style = MaterialTheme.typography.titleSmall)
        Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
            Text(code, fontFamily = FontFamily.Monospace, style = MaterialTheme.typography.bodySmall, softWrap = false, modifier = Modifier.horizontalScroll(rememberScrollState()).padding(12.dp))
        }
    }
    q.choices.forEachIndexed { i, choice ->
        val mark = highlight?.invoke(i)
        Row(
            Modifier.fillMaxWidth().selectable(selected = selected == i, enabled = enabled, role = Role.RadioButton, onClick = { onChoose(i) }).padding(vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            RadioButton(selected = selected == i, onClick = null, enabled = enabled)
            Text(
                choice,
                style = MaterialTheme.typography.bodyMedium,
                color = when (mark) {
                    true -> successColor
                    false -> MaterialTheme.colorScheme.error
                    null -> MaterialTheme.colorScheme.onSurface
                },
                modifier = Modifier.padding(start = 8.dp),
            )
        }
    }
}

@Composable
fun PracticeScreen(state: PracticeState, onAnswer: (Int) -> Unit, onNext: () -> Unit, onRestart: () -> Unit) {
    ScreenColumn {
        when {
            state.loading -> LoadingScreen()
            state.error != null && state.questions.isEmpty() -> {
                Text(stringResource(failureLabel(state.error)), color = MaterialTheme.colorScheme.error)
                Button(onClick = onRestart, modifier = Modifier.fillMaxWidth()) { Text(stringResource(Res.string.retry)) }
            }
            state.finished -> {
                Text(stringResource(Res.string.practice_done, state.good, state.questions.size), style = MaterialTheme.typography.titleLarge)
                Button(onClick = onRestart, modifier = Modifier.fillMaxWidth()) { Text(stringResource(Res.string.practice_again)) }
            }
            else -> {
                val q = state.current ?: return@ScreenColumn
                Text(stringResource(Res.string.practice_progress, state.index + 1, state.questions.size), style = MaterialTheme.typography.labelLarge)
                val result = state.result
                QuestionBlock(q, state.chosen, enabled = result == null, onChoose = onAnswer, highlight = result?.let { r -> { i: Int -> if (i == r.answer) true else if (i == state.chosen) false else null } })
                result?.let { r ->
                    Text(
                        stringResource(if (r.correct) Res.string.practice_correct else Res.string.practice_wrong),
                        color = if (r.correct) successColor else MaterialTheme.colorScheme.error,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
                    )
                    Text(r.explain, style = MaterialTheme.typography.bodyMedium)
                    Button(onClick = onNext, modifier = Modifier.fillMaxWidth()) { Text(stringResource(Res.string.practice_next)) }
                }
                state.error?.let { Text(stringResource(failureLabel(it)), color = MaterialTheme.colorScheme.error) }
            }
        }
    }
}

private fun clock(seconds: Long): String = "${seconds / 60}:${(seconds % 60).toString().padStart(2, '0')}"

@Composable
fun ExamScreen(state: ExamState, onChoose: (Int) -> Unit, onGoTo: (Int) -> Unit, onSubmit: () -> Unit, onRetry: () -> Unit) {
    when (state) {
        ExamState.Starting -> LoadingScreen()
        is ExamState.Failed -> ScreenColumn {
            Text(
                stringResource(
                    when (state.code) {
                        "cert.retry_later" -> Res.string.exam_wait_code
                        "cert.mock_limit" -> Res.string.exam_mock_limit
                        else -> Res.string.exam_failed
                    },
                ),
                color = MaterialTheme.colorScheme.error,
            )
            Button(onClick = onRetry, modifier = Modifier.fillMaxWidth()) { Text(stringResource(Res.string.retry)) }
        }
        is ExamState.Running -> ScreenColumn {
            val questions = state.attempt.questions
            Text(stringResource(Res.string.exam_time, clock(state.remainingSeconds)), style = MaterialTheme.typography.titleMedium, color = if (state.remainingSeconds < 60) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary)
            Text(stringResource(Res.string.practice_progress, state.index + 1, questions.size) + " · " + stringResource(Res.string.exam_answered, state.answers.count { it != null }, questions.size), style = MaterialTheme.typography.labelLarge)
            QuestionBlock(questions[state.index], state.answers[state.index], enabled = !state.submitting, onChoose = onChoose)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = { onGoTo(state.index - 1) }, enabled = state.index > 0) { Text(stringResource(Res.string.exam_prev)) }
                OutlinedButton(onClick = { onGoTo(state.index + 1) }, enabled = state.index < questions.lastIndex) { Text(stringResource(Res.string.exam_next)) }
            }
            state.error?.let {
                Text(
                    if (it == "cert.already_submitted") stringResource(Res.string.exam_already_submitted) else stringResource(failureLabel(it)),
                    color = MaterialTheme.colorScheme.error,
                )
            }
            Button(onClick = onSubmit, enabled = !state.submitting, modifier = Modifier.fillMaxWidth()) { Text(stringResource(Res.string.exam_submit)) }
        }
        is ExamState.Done -> ResultView(state.result)
    }
}

@Composable
private fun ResultView(r: AttemptResult) {
    val meta = certMeta(r.certId)
    ScreenColumn {
        Text(
            if (r.passed) stringResource(Res.string.result_passed, r.score) else stringResource(Res.string.result_failed, r.score, meta?.passScore ?: 0),
            style = MaterialTheme.typography.titleLarge,
            color = if (r.passed) successColor else MaterialTheme.colorScheme.error,
            modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
        )
        if (r.late) Text(stringResource(Res.string.result_late), color = MaterialTheme.colorScheme.error)
        r.certificate?.let { Pill(stringResource(Res.string.result_certificate, it.code), successColor) }
        Text(stringResource(Res.string.result_topics), style = MaterialTheme.typography.titleMedium, modifier = Modifier.semantics { heading() })
        r.topics.forEach { t ->
            Text(stringResource(Res.string.result_topic_line, meta?.syllabus?.getOrNull(t.topic) ?: "#${t.topic + 1}", t.ok, t.total), style = MaterialTheme.typography.bodyMedium)
        }
        Text(stringResource(Res.string.result_corrections), style = MaterialTheme.typography.titleMedium, modifier = Modifier.semantics { heading() })
        r.corrections.forEach { c ->
            OutlinedCard(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(c.q, style = MaterialTheme.typography.titleSmall)
                    Text(
                        stringResource(Res.string.result_your_answer, c.given?.let { c.choices.getOrNull(it) } ?: stringResource(Res.string.result_no_answer)),
                        color = if (c.correct) successColor else MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall,
                    )
                    if (!c.correct) Text(stringResource(Res.string.result_good_answer, c.choices.getOrNull(c.answer).orEmpty()), style = MaterialTheme.typography.bodySmall)
                    Text(c.explain, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}
