package africa.devhub.ui.news

import africa.devhub.news.LiveBoardState
import africa.devhub.news.NewsItem
import africa.devhub.resources.Res
import africa.devhub.resources.live_empty
import africa.devhub.resources.live_empty_search
import africa.devhub.resources.live_failed
import africa.devhub.resources.live_failed_text
import africa.devhub.resources.live_search_skills
import africa.devhub.resources.live_type_all
import africa.devhub.resources.live_type_mcp
import africa.devhub.resources.live_type_plugin
import africa.devhub.resources.live_type_rules
import africa.devhub.resources.live_type_skill
import africa.devhub.resources.live_open
import africa.devhub.resources.months
import africa.devhub.ui.components.DevCard
import africa.devhub.ui.components.DevHubIcons
import africa.devhub.ui.components.Pill
import africa.devhub.ui.components.StateMessage
import africa.devhub.ui.components.dayMonthYear
import africa.devhub.ui.components.openWeb
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.CircularProgressIndicator
import africa.devhub.ui.components.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import africa.devhub.ui.components.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import org.jetbrains.compose.resources.stringArrayResource
import org.jetbrains.compose.resources.stringResource

/**
 * Certifications (`cert`) ou skills et plugins IA (`skill`), collectés par l'API chez des sources
 * publiques ; un élément s'ouvre sur sa page d'origine. Mêmes filtres et même recherche que le web.
 */
@Composable
fun LiveBoardScreen(
    kind: String,
    state: LiveBoardState,
    onCategory: (String) -> Unit,
    onQuery: (String) -> Unit,
    onRetry: () -> Unit,
) {
    val months = stringArrayResource(Res.array.months)
    val uriHandler = LocalUriHandler.current
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.TopCenter) {
        LazyColumn(
            modifier = Modifier.widthIn(max = 560.dp).fillMaxWidth(),
            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            liveBoardItems(kind, state, months, onCategory, onQuery, onRetry) { uriHandler.openWeb(it) }
        }
    }
}

/** Contenu du tableau (recherche, types, éléments) : réutilisé par l'onglet « En direct » des certifications. */
fun LazyListScope.liveBoardItems(
    kind: String,
    state: LiveBoardState,
    months: List<String>,
    onCategory: (String) -> Unit,
    onQuery: (String) -> Unit,
    onRetry: () -> Unit,
    open: (String) -> Unit,
) {
    val isSkill = kind == "skill"
    if (isSkill) {
        item {
            OutlinedTextField(
                value = state.query,
                onValueChange = onQuery,
                label = { Text(stringResource(Res.string.live_search_skills)) },
                leadingIcon = { Icon(DevHubIcons.Search, contentDescription = null, modifier = Modifier.size(18.dp)) },
                singleLine = true,
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                modifier = Modifier.fillMaxWidth(),
            )
        }
        item {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(SkillTypes) { (code, label) ->
                    FilterChip(
                        selected = state.category == code,
                        onClick = { onCategory(code) },
                        label = { Text(stringResource(label)) },
                    )
                }
            }
        }
    }
    when {
        state.loading && state.items.isEmpty() -> item {
            Box(Modifier.fillMaxWidth().padding(32.dp), Alignment.Center) { CircularProgressIndicator() }
        }
        state.failed && state.items.isEmpty() -> item {
            DevCard {
                StateMessage(
                    icon = DevHubIcons.WifiOff,
                    title = stringResource(Res.string.live_failed),
                    text = stringResource(Res.string.live_failed_text),
                    isError = true,
                    onRetry = onRetry,
                )
            }
        }
        state.items.isEmpty() -> item {
            DevCard {
                StateMessage(
                    icon = DevHubIcons.Search,
                    title = stringResource(if (state.query.isBlank()) Res.string.live_empty else Res.string.live_empty_search),
                )
            }
        }
        else -> items(state.items, key = { it.id }) { item ->
            BoardCard(item, isSkill, months) { open(item.url) }
        }
    }
}

private val SkillTypes = listOf(
    "" to Res.string.live_type_all,
    "skill" to Res.string.live_type_skill,
    "plugin" to Res.string.live_type_plugin,
    "mcp" to Res.string.live_type_mcp,
    "rules" to Res.string.live_type_rules,
)

@Composable
private fun BoardCard(item: NewsItem, isSkill: Boolean, months: List<String>, onOpen: () -> Unit) {
    DevCard(Modifier.clickable(role = Role.Button, onClickLabel = stringResource(Res.string.live_open), onClick = onOpen)) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(verticalAlignment = Alignment.Top) {
                Text(
                    item.title,
                    style = MaterialTheme.typography.titleSmall,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f),
                )
                Icon(
                    DevHubIcons.ExternalLink,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(start = 8.dp, top = 2.dp).size(16.dp),
                )
            }
            if (item.summary.isNotBlank()) {
                Text(
                    item.summary,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 3,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                if (isSkill && item.category.isNotBlank()) Pill(item.category, MaterialTheme.colorScheme.primary)
                Text(
                    item.sourceName,
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f, fill = false),
                )
                if (isSkill && item.score > 0) {
                    Icon(DevHubIcons.Star, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(12.dp))
                    Text(item.score.toString(), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                } else if (!isSkill) {
                    Text(
                        dayMonthYear(item.publishedAt, months),
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}
