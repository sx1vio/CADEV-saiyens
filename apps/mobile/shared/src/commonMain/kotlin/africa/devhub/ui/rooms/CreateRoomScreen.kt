package africa.devhub.ui.rooms

import africa.devhub.resources.Res
import africa.devhub.resources.ask_tags_filter
import africa.devhub.resources.create_demo
import africa.devhub.resources.create_description
import africa.devhub.resources.create_description_hint
import africa.devhub.resources.create_name
import africa.devhub.resources.create_offline
import africa.devhub.resources.create_repo
import africa.devhub.resources.create_repo_hint
import africa.devhub.resources.create_repo_not_found
import africa.devhub.resources.create_send
import africa.devhub.resources.create_stack
import africa.devhub.resources.create_state
import africa.devhub.resources.create_visibility
import africa.devhub.resources.visibility_public
import africa.devhub.resources.visibility_unlisted
import africa.devhub.rooms.CreateRoomState
import africa.devhub.rooms.RoomDraft
import africa.devhub.rooms.RoomLimits
import africa.devhub.ui.components.ScreenColumn
import africa.devhub.ui.sos.failureLabel
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
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import org.jetbrains.compose.resources.stringResource

/** R1 : créer une salle (réseau exigé : le dépôt est vérifié auprès de GitHub). */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun CreateRoomScreen(
    state: CreateRoomState,
    online: Boolean,
    onEdit: ((RoomDraft) -> RoomDraft) -> Unit,
    onToggleTag: (String) -> Unit,
    onSend: () -> Unit,
) {
    val d = state.draft
    ScreenColumn {
        if (!online) Text(stringResource(Res.string.create_offline), color = MaterialTheme.colorScheme.error)
        OutlinedTextField(
            value = d.name,
            onValueChange = { v -> onEdit { it.copy(name = v.take(RoomLimits.NAME_MAX)) } },
            label = { Text(stringResource(Res.string.create_name)) },
            isError = d.name.isNotEmpty() && !state.nameValid,
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        OutlinedTextField(
            value = d.description,
            onValueChange = { v -> onEdit { it.copy(description = v.take(RoomLimits.DESCRIPTION_MAX)) } },
            label = { Text(stringResource(Res.string.create_description)) },
            placeholder = { Text(stringResource(Res.string.create_description_hint)) },
            minLines = 4,
            modifier = Modifier.fillMaxWidth(),
        )
        Text(stringResource(Res.string.create_state), style = MaterialTheme.typography.titleSmall)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            ROOM_STATES.forEach { s ->
                FilterChip(selected = d.state == s, onClick = { onEdit { it.copy(state = s) } }, label = { Text(stringResource(roomStateLabel(s))) })
            }
        }
        Text(stringResource(Res.string.create_visibility), style = MaterialTheme.typography.titleSmall)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilterChip(selected = d.visibility == "public", onClick = { onEdit { it.copy(visibility = "public") } }, label = { Text(stringResource(Res.string.visibility_public)) })
            FilterChip(selected = d.visibility == "unlisted", onClick = { onEdit { it.copy(visibility = "unlisted") } }, label = { Text(stringResource(Res.string.visibility_unlisted)) })
        }
        OutlinedTextField(
            value = d.repoFullName,
            onValueChange = { v -> onEdit { it.copy(repoFullName = v.trim().take(140)) } },
            label = { Text(stringResource(Res.string.create_repo)) },
            supportingText = { Text(stringResource(Res.string.create_repo_hint)) },
            isError = !state.repoValid,
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        OutlinedTextField(
            value = d.demoUrl,
            onValueChange = { v -> onEdit { it.copy(demoUrl = v.trim().take(300)) } },
            label = { Text(stringResource(Res.string.create_demo)) },
            isError = !state.demoValid,
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri),
            modifier = Modifier.fillMaxWidth(),
        )
        Text(stringResource(Res.string.create_stack), style = MaterialTheme.typography.titleSmall)
        var filter by rememberSaveable { mutableStateOf("") }
        OutlinedTextField(
            value = filter,
            onValueChange = { filter = it.take(40) },
            label = { Text(stringResource(Res.string.ask_tags_filter)) },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        val needle = filter.trim().lowercase()
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            state.tags.filter { it.slug in d.stack || needle.isEmpty() || it.slug.contains(needle) || it.label.lowercase().contains(needle) }
                .take(30)
                .forEach { tag ->
                    val selected = tag.slug in d.stack
                    FilterChip(
                        selected = selected,
                        onClick = { onToggleTag(tag.slug) },
                        enabled = selected || d.stack.size < RoomLimits.STACK_MAX,
                        label = { Text(tag.label) },
                    )
                }
        }
        state.error?.let { code ->
            Text(
                stringResource(
                    when (code) {
                        "offline" -> Res.string.create_offline
                        "room.repo_not_found" -> Res.string.create_repo_not_found
                        else -> failureLabel(code)
                    },
                ),
                color = MaterialTheme.colorScheme.error,
                modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
            )
        }
        Button(onClick = onSend, enabled = state.canSend && !state.sending && online, modifier = Modifier.fillMaxWidth().height(52.dp)) {
            if (state.sending) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp) else Text(stringResource(Res.string.create_send))
        }
    }
}
