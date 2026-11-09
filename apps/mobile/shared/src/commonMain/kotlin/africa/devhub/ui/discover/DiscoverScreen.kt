package africa.devhub.ui.discover

import africa.devhub.discover.DevCard
import africa.devhub.discover.DevFilters
import africa.devhub.discover.DevsState
import africa.devhub.discover.SkillScore
import africa.devhub.platform.formatUtc
import africa.devhub.platform.utcOffsetMinutes
import africa.devhub.ui.components.RemoteImage
import africa.devhub.ui.devmap.countryName
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import africa.devhub.discover.LeaderboardState
import africa.devhub.resources.Res
import africa.devhub.resources.board_back
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
import africa.devhub.resources.filter_tag_hint
import africa.devhub.resources.filter_country_hint
import africa.devhub.resources.passport_mission
import africa.devhub.resources.proofs_more
import africa.devhub.resources.retry
import africa.devhub.resources.tab_devs
import africa.devhub.resources.tab_leaderboard
import africa.devhub.resources.trust_demo
import africa.devhub.ui.components.Badge
import africa.devhub.ui.components.DevCard as Panel
import africa.devhub.ui.components.TechTag
import africa.devhub.ui.theme.successColor
import africa.devhub.ui.components.TabBar
import africa.devhub.ui.components.RankRow
import africa.devhub.ui.components.Initials
import africa.devhub.resources.board_devs
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
import androidx.compose.material3.CircularProgressIndicator
import africa.devhub.ui.components.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import africa.devhub.ui.components.OutlinedTextField
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
        TabBar(listOf(stringResource(Res.string.tab_devs), stringResource(Res.string.tab_leaderboard)), tab, onSelect = { tab = it })
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
        Panel {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedTextField(
                        value = f.tag,
                        onValueChange = { onFilters(f.copy(tag = it.trim().take(40)), true) },
                        label = { Text(stringResource(Res.string.filter_tag)) },
                        placeholder = { Text(stringResource(Res.string.filter_tag_hint)) },
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                    )
                    OutlinedTextField(
                        value = f.country,
                        onValueChange = { onFilters(f.copy(country = it.trim().uppercase().take(2)), true) },
                        label = { Text(stringResource(Res.string.filter_country)) },
                        placeholder = { Text(stringResource(Res.string.filter_country_hint)) },
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                    )
                }
                Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(selected = f.availableNow, onClick = { onFilters(f.copy(availableNow = !f.availableNow), false) }, label = { Text(stringResource(Res.string.filter_available)) })
                    FilterChip(selected = f.mission, onClick = { onFilters(f.copy(mission = !f.mission), false) }, label = { Text(stringResource(Res.string.filter_mission)) })
                }
            }
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

/** Carte du web (`DevCard`) : avatar et disponibilité, nom, lieu et fuseau, XP, trois barres de compétences. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun DevCardView(dev: DevCard, onOpen: (String) -> Unit) {
    val scheme = MaterialTheme.colorScheme
    val offset = dev.timezone?.let { utcOffsetMinutes(it) }?.let { formatUtc(it) }
    val place = listOfNotNull(dev.country?.let { countryName(it) }, offset).joinToString(" · ")
    Panel(Modifier.clickable(role = Role.Button, onClick = { onOpen(dev.handle) })) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Box {
                    Initials(dev.displayName, 48.dp)
                    RemoteImage(dev.avatarUrl, width = 160, modifier = Modifier.size(48.dp).clip(CircleShape))
                    Box(
                        Modifier.align(Alignment.BottomEnd).size(14.dp)
                            .background(scheme.surface, CircleShape).padding(2.dp)
                            .background(if (dev.availableNow) successColor else scheme.outline, CircleShape),
                    )
                }
                Column(Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(dev.displayName, style = MaterialTheme.typography.titleSmall, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f, fill = false))
                        if (dev.isDemo) Badge(stringResource(Res.string.trust_demo), scheme.onSurfaceVariant)
                    }
                    if (place.isNotEmpty()) {
                        Text(place, style = MaterialTheme.typography.bodySmall, color = scheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(dev.totalXp.toString(), style = MaterialTheme.typography.titleSmall)
                    Text("XP", style = MaterialTheme.typography.labelSmall, color = scheme.onSurfaceVariant)
                }
            }
            if (dev.topSkills.isNotEmpty()) Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                dev.topSkills.take(3).forEach { SkillRow(it) }
            }
            if (dev.availableNow || dev.availableForMission) FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                if (dev.availableNow) Badge(stringResource(Res.string.dev_available), successColor)
                if (dev.availableForMission) Badge(stringResource(Res.string.passport_mission), successColor)
            }
        }
    }
}

/** Ligne de compétence : nom, barre de score (bleu du web), score. */
@Composable
private fun SkillRow(skill: SkillScore) {
    val scheme = MaterialTheme.colorScheme
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        Text(skill.label, style = MaterialTheme.typography.bodySmall, color = scheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.width(104.dp))
        Box(Modifier.weight(1f).height(6.dp).clip(CircleShape).background(scheme.surfaceVariant)) {
            Box(Modifier.fillMaxWidth(skill.score.coerceIn(0, 100) / 100f).height(6.dp).background(scheme.primary, CircleShape))
        }
        Text(skill.score.toString(), style = MaterialTheme.typography.labelMedium, modifier = Modifier.width(28.dp), textAlign = TextAlign.End)
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
            Panel {
                RankRow(
                    c.rank,
                    c.country,
                    stringResource(Res.string.dev_xp, c.totalXp) + " · " + stringResource(Res.string.board_devs, c.devs),
                    onClick = { onCountry(c.country) },
                )
            }
        }
        else -> items(board.devs, key = { it.handle }) { d ->
            Panel {
                RankRow(d.rank, d.displayName, stringResource(Res.string.dev_xp, d.totalXp), onClick = { onOpen(d.handle) })
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
