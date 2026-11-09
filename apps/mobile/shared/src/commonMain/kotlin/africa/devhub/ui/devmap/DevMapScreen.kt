package africa.devhub.ui.devmap

import africa.devhub.devmap.DevMapState
import africa.devhub.resources.*
import africa.devhub.ui.components.DevCard
import africa.devhub.ui.components.LoadingScreen
import africa.devhub.ui.components.ScreenColumn
import africa.devhub.ui.components.StateMessage
import africa.devhub.ui.components.DevHubIcons
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import org.jetbrains.compose.resources.stringResource

/** Carte des devs : où vivent les devs de DevHub, pays par pays, avec ceux qui sont actifs. */
@Composable
fun DevMapScreen(state: DevMapState, onRetry: () -> Unit) {
    val map = state.map
    when {
        state.loading && map == null -> LoadingScreen()
        map == null -> ScreenColumn {
            StateMessage(DevHubIcons.Alert, stringResource(Res.string.map_failed), isError = true, onRetry = onRetry)
        }
        else -> ScreenColumn {
            Text(stringResource(Res.string.map_subtitle), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            DevCard {
                Row(Modifier.padding(vertical = 16.dp)) {
                    Stat(state.located.toString(), stringResource(Res.string.map_devs), Modifier.weight(1f))
                    Stat(state.active.toString(), stringResource(Res.string.map_active), Modifier.weight(1f))
                    Stat(map.countries.sumOf { it.questionsUnblocked }.toString(), stringResource(Res.string.map_unblocked), Modifier.weight(1f))
                }
            }
            if (map.countries.isEmpty()) {
                StateMessage(DevHubIcons.Map, stringResource(Res.string.map_empty))
            } else {
                Text(stringResource(Res.string.map_countries), style = MaterialTheme.typography.titleMedium)
                val top = map.countries.maxOf { it.devs }.coerceAtLeast(1)
                DevCard {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                        map.countries.forEach { c ->
                            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                    Box(
                                        Modifier.clip(RoundedCornerShape(4.dp)).background(MaterialTheme.colorScheme.surfaceVariant).padding(horizontal = 6.dp, vertical = 2.dp),
                                    ) { Text(c.country, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                                    Text(countryName(c.country), style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f), maxLines = 1)
                                    Text(c.devs.toString(), style = MaterialTheme.typography.titleSmall)
                                }
                                Box(Modifier.fillMaxWidth().height(6.dp).clip(CircleShape).background(MaterialTheme.colorScheme.surfaceVariant)) {
                                    Box(Modifier.fillMaxWidth(c.devs.toFloat() / top).height(6.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary))
                                }
                                Text(
                                    stringResource(Res.string.map_active_n, c.activeDevs) + " · " + stringResource(Res.string.dev_xp, c.totalXp),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                    }
                }
            }
            val note = MaterialTheme.typography.bodySmall
            val muted = MaterialTheme.colorScheme.onSurfaceVariant
            if (map.unlocated.devs > 0) Text(stringResource(Res.string.map_unlocated, map.unlocated.devs), style = note, color = muted)
            if (map.demo.devs > 0) Text(stringResource(Res.string.map_demo, map.demo.devs, map.demo.totalXp), style = note, color = muted)
            if (map.activeWindowDays > 0) Text(stringResource(Res.string.map_method, map.activeWindowDays), style = note, color = muted)
        }
    }
}

@Composable
private fun Stat(value: String, label: String, modifier: Modifier) {
    Column(modifier.padding(horizontal = 8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, style = MaterialTheme.typography.titleLarge)
        Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2)
    }
}
