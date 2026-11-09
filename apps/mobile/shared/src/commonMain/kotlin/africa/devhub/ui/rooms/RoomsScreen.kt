package africa.devhub.ui.rooms

import africa.devhub.resources.Res
import africa.devhub.ui.components.EmptyCard
import africa.devhub.resources.djeli_point
import africa.devhub.resources.cached_copy
import africa.devhub.resources.proofs_more
import africa.devhub.resources.retry
import africa.devhub.resources.room_members
import africa.devhub.resources.room_open_tasks
import africa.devhub.resources.rooms_all
import africa.devhub.resources.rooms_new
import africa.devhub.resources.rooms_subtitle
import africa.devhub.resources.rooms_empty
import africa.devhub.resources.rooms_failed
import africa.devhub.resources.rooms_mine
import africa.devhub.resources.rooms_search
import africa.devhub.rooms.RoomSummary
import africa.devhub.rooms.RoomsState
import africa.devhub.ui.components.Pill
import androidx.compose.foundation.layout.size
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
import africa.devhub.ui.components.Badge
import africa.devhub.ui.components.DevCard
import africa.devhub.ui.components.DevHubIcons
import africa.devhub.ui.components.TechTag
import africa.devhub.ui.theme.successColor
import androidx.compose.foundation.background
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.material3.CircularProgressIndicator
import africa.devhub.ui.components.ExtendedFloatingActionButton
import africa.devhub.ui.components.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import africa.devhub.ui.components.OutlinedTextField
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
                Text(stringResource(Res.string.rooms_subtitle), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            item {
                OutlinedTextField(
                    value = state.query,
                    onValueChange = { onQuery(it.take(200)) },
                    label = { Text(stringResource(Res.string.rooms_search)) },
                    leadingIcon = { androidx.compose.material3.Icon(africa.devhub.ui.components.DevHubIcons.Search, contentDescription = null, modifier = Modifier.size(18.dp)) },
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
                item { EmptyCard(stringResource(Res.string.rooms_empty), Res.drawable.djeli_point) }
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
            Text(stringResource(Res.string.rooms_new))
        }
    }
}

/** Carte de salle du web (`RoomCard`) : bandeau avec l'état, monogramme qui chevauche, nom, description, étiquettes, pied. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun RoomCard(room: RoomSummary, onOpen: (String) -> Unit) {
    val scheme = MaterialTheme.colorScheme
    val open = room.openTaskCount > 0
    DevCard(Modifier.clickable(role = Role.Button, onClick = { onOpen(room.code) })) {
        RoomHead(room.name, room.state)
        Column(Modifier.padding(start = 16.dp, end = 16.dp, top = 18.dp, bottom = 12.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(room.description, style = MaterialTheme.typography.bodyMedium, maxLines = 2, overflow = TextOverflow.Ellipsis, color = scheme.onSurfaceVariant)
            if (room.stack.isNotEmpty()) {
                FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    room.stack.take(4).forEach { TechTag(it.label) }
                }
            }
        }
        HorizontalDivider(color = scheme.outlineVariant)
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(
                pluralStringResource(Res.plurals.room_members, room.memberCount, room.memberCount),
                style = MaterialTheme.typography.bodySmall,
                color = scheme.onSurfaceVariant,
            )
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Icon(DevHubIcons.Folder, contentDescription = null, tint = if (open) scheme.primary else scheme.onSurfaceVariant, modifier = Modifier.size(14.dp))
                Text(
                    pluralStringResource(Res.plurals.room_open_tasks, room.openTaskCount, room.openTaskCount),
                    style = MaterialTheme.typography.labelLarge,
                    color = if (open) scheme.primary else scheme.onSurfaceVariant,
                )
            }
        }
    }
}
