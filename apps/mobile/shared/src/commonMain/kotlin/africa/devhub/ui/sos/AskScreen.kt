package africa.devhub.ui.sos

import africa.devhub.resources.Res
import africa.devhub.resources.ask_body
import africa.devhub.resources.ask_body_hint
import africa.devhub.resources.ask_code
import africa.devhub.resources.ask_lang
import africa.devhub.resources.ask_q_title
import africa.devhub.resources.ask_q_title_hint
import africa.devhub.resources.ask_repro
import africa.devhub.resources.ask_repro_hint
import africa.devhub.resources.ask_send
import africa.devhub.resources.ask_tags
import africa.devhub.resources.ask_tags_failed
import africa.devhub.resources.ask_tags_filter
import africa.devhub.resources.conduct_4
import africa.devhub.resources.lang_en
import africa.devhub.resources.lang_fr
import africa.devhub.resources.retry
import africa.devhub.resources.urgency_label
import africa.devhub.sos.AskDraft
import africa.devhub.sos.AskState
import africa.devhub.sos.SosLimits
import africa.devhub.ui.components.ScreenColumn
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import org.jetbrains.compose.resources.stringResource

/** S1 : poser une question ; la piste IA (S2) et le matching (S3) partent à la publication. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun AskScreen(
    state: AskState,
    onEdit: ((AskDraft) -> AskDraft) -> Unit,
    onToggleTag: (String) -> Unit,
    onRetryTags: () -> Unit,
    onSend: () -> Unit,
) {
    val d = state.draft
    ScreenColumn {
        Text(
            stringResource(Res.string.conduct_4),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        OutlinedTextField(
            value = d.title,
            onValueChange = { v -> onEdit { it.copy(title = v.take(SosLimits.TITLE_MAX)) } },
            label = { Text(stringResource(Res.string.ask_q_title)) },
            supportingText = { Text(stringResource(Res.string.ask_q_title_hint)) },
            isError = d.title.isNotEmpty() && !state.titleValid,
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        OutlinedTextField(
            value = d.body,
            onValueChange = { v -> onEdit { it.copy(body = v.take(SosLimits.BODY_MAX)) } },
            label = { Text(stringResource(Res.string.ask_body)) },
            placeholder = { Text(stringResource(Res.string.ask_body_hint)) },
            minLines = 5,
            modifier = Modifier.fillMaxWidth(),
        )
        OutlinedTextField(
            value = d.code,
            onValueChange = { v -> onEdit { it.copy(code = v.take(SosLimits.CODE_MAX)) } },
            label = { Text(stringResource(Res.string.ask_code)) },
            textStyle = MaterialTheme.typography.bodySmall.copy(fontFamily = FontFamily.Monospace),
            minLines = 3,
            modifier = Modifier.fillMaxWidth(),
        )

        Text(stringResource(Res.string.ask_tags), style = MaterialTheme.typography.titleSmall, modifier = Modifier.semantics { heading() })
        if (state.tagsFailed) {
            Text(stringResource(Res.string.ask_tags_failed), color = MaterialTheme.colorScheme.error)
            TextButton(onClick = onRetryTags) { Text(stringResource(Res.string.retry)) }
        } else {
            var filter by rememberSaveable { mutableStateOf("") }
            OutlinedTextField(
                value = filter,
                onValueChange = { filter = it.take(40) },
                label = { Text(stringResource(Res.string.ask_tags_filter)) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            val needle = filter.trim().lowercase()
            val shown = state.tags.filter { tag ->
                tag.slug in d.tagSlugs || needle.isEmpty() ||
                    tag.slug.contains(needle) || tag.label.lowercase().contains(needle) ||
                    tag.aliases.any { it.lowercase().contains(needle) }
            }.take(30)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                shown.forEach { tag ->
                    val selected = tag.slug in d.tagSlugs
                    FilterChip(
                        selected = selected,
                        onClick = { onToggleTag(tag.slug) },
                        enabled = selected || d.tagSlugs.size < SosLimits.TAGS_MAX,
                        label = { Text(tag.label) },
                    )
                }
            }
        }

        Text(stringResource(Res.string.urgency_label), style = MaterialTheme.typography.titleSmall)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("low", "normal", "high").forEach { u ->
                FilterChip(
                    selected = d.urgency == u,
                    onClick = { onEdit { it.copy(urgency = u) } },
                    label = { Text(stringResource(urgencyLabel(u))) },
                )
            }
        }
        Text(stringResource(Res.string.ask_lang), style = MaterialTheme.typography.titleSmall)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("fr" to Res.string.lang_fr, "en" to Res.string.lang_en).forEach { (code, label) ->
                FilterChip(
                    selected = d.lang == code,
                    onClick = { onEdit { it.copy(lang = code) } },
                    label = { Text(stringResource(label)) },
                )
            }
        }
        OutlinedTextField(
            value = d.reproUrl,
            onValueChange = { v -> onEdit { it.copy(reproUrl = v.trim().take(500)) } },
            label = { Text(stringResource(Res.string.ask_repro)) },
            supportingText = { Text(stringResource(Res.string.ask_repro_hint)) },
            isError = !state.reproValid,
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri),
            modifier = Modifier.fillMaxWidth(),
        )

        state.error?.let {
            Text(
                stringResource(failureLabel(it, asking = true)),
                color = MaterialTheme.colorScheme.error,
                modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
            )
        }
        Button(
            onClick = onSend,
            enabled = state.canSend && !state.sending,
            modifier = Modifier.fillMaxWidth().height(52.dp),
        ) {
            if (state.sending) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp)
            else Text(stringResource(Res.string.ask_send))
        }
    }
}
