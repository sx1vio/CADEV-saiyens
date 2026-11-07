package africa.devhub.ui.rooms

import africa.devhub.resources.Res
import africa.devhub.resources.cached_copy
import africa.devhub.resources.proofs_more
import africa.devhub.resources.retry
import africa.devhub.resources.room_members
import africa.devhub.resources.room_open_tasks
import africa.devhub.resources.rooms_all
import africa.devhub.resources.rooms_create
import africa.devhub.resources.rooms_empty
import africa.devhub.resources.rooms_failed
import africa.devhub.resources.rooms_mine
import africa.devhub.resources.rooms_search
import africa.devhub.rooms.RoomSummary
import africa.devhub.rooms.RoomsState
import africa.devhub.ui.components.Pill
import androidx.compose.foundation.clickable
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
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import org.jetbrains.compose.resources.pluralStringResource
import org.jetbrains.compose.resources.stringResource

/** Salles de projet : découvrir ou retrouver les miennes. */
@Composable
fun RoomsScreen(
    state: RoomsState,
    onMine: (Boolean) -> Unit,
    onQuery: (String) -> Unit,
    onRetry: () -> Unit,
    onLoadMore: () -> Unit,
    onOpen: (code: String) -> Unit,
    onCreate: () -> Unit,
) {
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
                    label = { Text(stringResource(Res.string.rooms_search)) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(selected = !state.mine, onClick = { onMine(false) }, label = { Text(stringResource(Res.string.rooms_all)) })
                    FilterChip(selected = state.mine, onClick = { onMine(true) }, label = { Text(stringResource(Res.string.rooms_mine)) })
                }
            }
            if (state.cachedAt != null) {
                item { Text(stringResource(Res.string.cached_copy), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            }
            if (!state.loading && !state.failed && state.items.isEmpty()) {
                item { Text(stringResource(Res.string.rooms_empty), color = MaterialTheme.colorScheme.onSurfaceVariant) }
            }
            items(state.items, key = { it.id }) { RoomCard(it, onOpen) }
            item {
                when {
                    state.loading -> Box(Modifier.fillMaxWidth().padding(16.dp), Alignment.Center) { CircularProgressIndicator() }
                    state.failed -> Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(stringResource(Res.string.rooms_failed), color = MaterialTheme.colorScheme.error)
                        OutlinedButton(onClick = onRetry, modifier = Modifier.fillMaxWidth()) { Text(stringResource(Res.string.retry)) }
                    }
                    state.hasMore -> OutlinedButton(onClick = onLoadMore, modifier = Modifier.fillMaxWidth()) {
                        Text(stringResource(Res.string.proofs_more))
                    }
                }
            }
        }
        ExtendedFloatingActionButton(onClick = onCreate, modifier = Modifier.align(Alignment.BottomEnd).padding(16.dp)) {
            Text(stringResource(Res.string.rooms_create))
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun RoomCard(room: RoomSummary, onOpen: (String) -> Unit) {
    Card(Modifier.fillMaxWidth().clickable(role = Role.Button, onClick = { onOpen(room.code) })) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(room.name, style = MaterialTheme.typography.titleMedium)
            Text(room.description, style = MaterialTheme.typography.bodyMedium, maxLines = 2, color = MaterialTheme.colorScheme.onSurfaceVariant)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Pill(stringResource(roomStateLabel(room.state)), MaterialTheme.colorScheme.primary)
                room.stack.take(4).forEach { Text("#${it.slug}", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary) }
            }
            Text(
                pluralStringResource(Res.plurals.room_members, room.memberCount, room.memberCount) + " · " +
                    pluralStringResource(Res.plurals.room_open_tasks, room.openTaskCount, room.openTaskCount),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}
