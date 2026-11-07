package africa.devhub.ui.discover

import africa.devhub.discover.DevCard
import africa.devhub.discover.DevFilters
import africa.devhub.discover.DevsState
import africa.devhub.discover.LeaderboardState
import africa.devhub.resources.Res
import africa.devhub.resources.board_back
import africa.devhub.resources.board_country_line
import africa.devhub.resources.board_dev_line
import africa.devhub.resources.board_failed
import africa.devhub.resources.board_method
import africa.devhub.resources.cached_copy
import africa.devhub.resources.dev_available
import africa.devhub.resources.dev_xp
import africa.devhub.resources.devs_empty
import africa.devhub.resources.devs_failed
import africa.devhub.resources.filter_available
import africa.devhub.resources.filter_country
import africa.devhub.resources.filter_mission
import africa.devhub.resources.filter_tag
import africa.devhub.resources.passport_mission
import africa.devhub.resources.proofs_more
import africa.devhub.resources.retry
import africa.devhub.resources.tab_devs
import africa.devhub.resources.tab_leaderboard
import africa.devhub.resources.trust_demo
import africa.devhub.ui.components.Pill
import africa.devhub.ui.theme.successColor
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
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.PrimaryTabRow
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import org.jetbrains.compose.resources.stringResource

/** D1 et D2 : trouver des devs, et le classement par pays. */
@Composable
fun DiscoverScreen(
    devs: DevsState,
    board: LeaderboardState,
    startOnLeaderboard: Boolean,
    onFilters: (DevFilters, Boolean) -> Unit,
    onRetryDevs: () -> Unit,
    onMoreDevs: () -> Unit,
    onCountry: (String?) -> Unit,
    onOpenDev: (handle: String) -> Unit,
) {
    var tab by rememberSaveable { mutableIntStateOf(if (startOnLeaderboard) 1 else 0) }
    Column(Modifier.fillMaxSize()) {
        PrimaryTabRow(selectedTabIndex = tab) {
            Tab(selected = tab == 0, onClick = { tab = 0 }, text = { Text(stringResource(Res.string.tab_devs)) })
            Tab(selected = tab == 1, onClick = { tab = 1 }, text = { Text(stringResource(Res.string.tab_leaderboard)) })
        }
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.TopCenter) {
            LazyColumn(
                modifier = Modifier.widthIn(max = 560.dp).fillMaxWidth(),
                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                if (tab == 0) devsTab(devs, onFilters, onRetryDevs, onMoreDevs, onOpenDev)
                else boardTab(board, onCountry, onOpenDev)
            }
        }
    }
}

private fun LazyListScope.devsTab(
    state: DevsState,
    onFilters: (DevFilters, Boolean) -> Unit,
    onRetry: () -> Unit,
    onMore: () -> Unit,
    onOpen: (String) -> Unit,
) {
    val f = state.filters
    item {
        OutlinedTextField(
            value = f.tag,
            onValueChange = { onFilters(f.copy(tag = it.trim().take(40)), true) },
            label = { Text(stringResource(Res.string.filter_tag)) },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
    }
    item {
        OutlinedTextField(
            value = f.country,
            onValueChange = { onFilters(f.copy(country = it.trim().uppercase().take(2)), true) },
            label = { Text(stringResource(Res.string.filter_country)) },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
    }
    item {
        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilterChip(selected = f.availableNow, onClick = { onFilters(f.copy(availableNow = !f.availableNow), false) }, label = { Text(stringResource(Res.string.filter_available)) })
            FilterChip(selected = f.mission, onClick = { onFilters(f.copy(mission = !f.mission), false) }, label = { Text(stringResource(Res.string.filter_mission)) })
        }
    }
    if (state.cachedAt != null) item { CachedNote() }
    if (!state.loading && !state.failed && state.items.isEmpty()) {
        item { Text(stringResource(Res.string.devs_empty), color = MaterialTheme.colorScheme.onSurfaceVariant) }
    }
    items(state.items, key = { it.handle }) { DevCardView(it, onOpen) }
    item {
        when {
            state.loading -> Box(Modifier.fillMaxWidth().padding(16.dp), Alignment.Center) { CircularProgressIndicator() }
            state.failed -> Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(stringResource(Res.string.devs_failed), color = MaterialTheme.colorScheme.error)
                OutlinedButton(onClick = onRetry, modifier = Modifier.fillMaxWidth()) { Text(stringResource(Res.string.retry)) }
            }
            state.hasMore -> OutlinedButton(onClick = onMore, modifier = Modifier.fillMaxWidth()) { Text(stringResource(Res.string.proofs_more)) }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun DevCardView(dev: DevCard, onOpen: (String) -> Unit) {
    Card(Modifier.fillMaxWidth().clickable(role = Role.Button, onClick = { onOpen(dev.handle) })) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(dev.displayName, style = MaterialTheme.typography.titleMedium)
            Text(
                listOfNotNull("@${dev.handle}", dev.country, stringResource(Res.string.dev_xp, dev.totalXp)).joinToString(" · "),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                if (dev.availableNow) Pill(stringResource(Res.string.dev_available), successColor)
                if (dev.availableForMission) Pill(stringResource(Res.string.passport_mission), successColor)
                if (dev.isDemo) Pill(stringResource(Res.string.trust_demo), MaterialTheme.colorScheme.error)
                dev.topSkills.take(3).forEach { Pill("${it.label} ${it.score}") }
            }
            dev.lookingFor?.let { Text(it, style = MaterialTheme.typography.bodySmall, maxLines = 2) }
        }
    }
}

private fun LazyListScope.boardTab(state: LeaderboardState, onCountry: (String?) -> Unit, onOpen: (String) -> Unit) {
    if (state.country != null) item { TextButton(onClick = { onCountry(null) }) { Text(stringResource(Res.string.board_back)) } }
    if (state.cachedAt != null) item { CachedNote() }
    val board = state.board
    when {
        state.loading -> item { Box(Modifier.fillMaxWidth().padding(16.dp), Alignment.Center) { CircularProgressIndicator() } }
        state.failed || board == null -> item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(stringResource(Res.string.board_failed), color = MaterialTheme.colorScheme.error)
                OutlinedButton(onClick = { onCountry(state.country) }, modifier = Modifier.fillMaxWidth()) { Text(stringResource(Res.string.retry)) }
            }
        }
        state.country == null -> items(board.countries, key = { it.country }) { c ->
            Card(Modifier.fillMaxWidth().clickable(role = Role.Button, onClick = { onCountry(c.country) })) {
                Text(
                    stringResource(Res.string.board_country_line, c.rank, c.country, c.totalXp, c.devs),
                    style = MaterialTheme.typography.bodyLarge,
                    modifier = Modifier.padding(16.dp),
                )
            }
        }
        else -> items(board.devs, key = { it.handle }) { d ->
            Card(Modifier.fillMaxWidth().clickable(role = Role.Button, onClick = { onOpen(d.handle) })) {
                Text(
                    stringResource(Res.string.board_dev_line, d.rank, d.displayName, d.totalXp),
                    style = MaterialTheme.typography.bodyLarge,
                    modifier = Modifier.padding(16.dp),
                )
            }
        }
    }
    // Calcul transparent (D2) : la méthode de l'API est affichée telle quelle.
    board?.method?.takeIf { it.isNotBlank() }?.let { method ->
        item {
            Column(Modifier.padding(top = 8.dp)) {
                Text(stringResource(Res.string.board_method), style = MaterialTheme.typography.titleSmall)
                Text(method, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

@Composable
private fun CachedNote() {
    Text(stringResource(Res.string.cached_copy), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
}
