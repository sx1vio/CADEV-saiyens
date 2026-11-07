package africa.devhub.ui.news

import africa.devhub.news.NewsItem
import africa.devhub.news.NewsState
import africa.devhub.resources.Res
import africa.devhub.resources.cached_copy
import africa.devhub.resources.lang_en
import africa.devhub.resources.lang_fr
import africa.devhub.resources.months
import africa.devhub.resources.news_empty
import africa.devhub.resources.news_failed
import africa.devhub.resources.news_lang_all
import africa.devhub.resources.news_real
import africa.devhub.resources.news_search
import africa.devhub.resources.news_source
import africa.devhub.resources.news_top
import africa.devhub.resources.news_videos
import africa.devhub.resources.retry
import africa.devhub.ui.components.dayMonthYear
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.PrimaryTabRow
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import org.jetbrains.compose.resources.stringArrayResource
import org.jetbrains.compose.resources.stringResource

/**
 * Actualités réelles (ADR-0020) : la une par rubrique et les vidéos. Sans images, par économie de
 * données ; un article s'ouvre dans le navigateur.
 */
@Composable
fun NewsScreen(state: NewsState, onLang: (String) -> Unit, onQuery: (String) -> Unit, onRetry: () -> Unit) {
    val months = stringArrayResource(Res.array.months)
    val uriHandler = LocalUriHandler.current
    val open: (NewsItem) -> Unit = { uriHandler.openUri(it.url) }
    var tab by rememberSaveable { mutableIntStateOf(0) }
    Column(Modifier.fillMaxSize()) {
        PrimaryTabRow(selectedTabIndex = tab) {
            Tab(selected = tab == 0, onClick = { tab = 0 }, text = { Text(stringResource(Res.string.news_top)) })
            Tab(selected = tab == 1, onClick = { tab = 1 }, text = { Text(stringResource(Res.string.news_videos)) })
        }
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.TopCenter) {
            LazyColumn(
                modifier = Modifier.widthIn(max = 560.dp).fillMaxWidth(),
                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                item { Text(stringResource(Res.string.news_real), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("all" to Res.string.news_lang_all, "fr" to Res.string.lang_fr, "en" to Res.string.lang_en).forEach { (code, label) ->
                            FilterChip(selected = state.lang == code, onClick = { onLang(code) }, label = { Text(stringResource(label)) })
                        }
                    }
                }
                if (tab == 0) {
                    item {
                        OutlinedTextField(
                            value = state.query,
                            onValueChange = { onQuery(it.take(80)) },
                            label = { Text(stringResource(Res.string.news_search)) },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                }
                if (state.cachedAt != null) item { Text(stringResource(Res.string.cached_copy), style = MaterialTheme.typography.bodySmall) }
                val home = state.home
                when {
                    state.loading && home == null -> item { Spinner() }
                    state.failed && home == null -> item {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(stringResource(Res.string.news_failed), color = MaterialTheme.colorScheme.error)
                            OutlinedButton(onClick = onRetry, modifier = Modifier.fillMaxWidth()) { Text(stringResource(Res.string.retry)) }
                        }
                    }
                    home == null -> Unit
                    tab == 1 -> articles(home.videos, months, open)
                    state.results != null -> if (state.searching) item { Spinner() } else articles(state.results, months, open)
                    else -> {
                        articles(home.hero, months, open)
                        home.sections.forEach { (key, list) ->
                            if (list.isEmpty()) return@forEach
                            item {
                                Text(
                                    home.sectionLabels[key] ?: key,
                                    style = MaterialTheme.typography.titleMedium,
                                    modifier = Modifier.padding(top = 8.dp).semantics { heading() },
                                )
                            }
                            articles(list.take(5), months, open, keyPrefix = key)
                        }
                    }
                }
            }
        }
    }
}

private fun LazyListScope.articles(list: List<NewsItem>, months: List<String>, open: (NewsItem) -> Unit, keyPrefix: String = "") {
    if (list.isEmpty()) {
        item(key = "$keyPrefix-empty") { Text(stringResource(Res.string.news_empty), color = MaterialTheme.colorScheme.onSurfaceVariant) }
        return
    }
    items(list, key = { keyPrefix + it.id }) { item ->
        Card(Modifier.fillMaxWidth().clickable(role = Role.Button, onClick = { open(item) })) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(item.title, style = MaterialTheme.typography.titleSmall)
                if (item.summary.isNotBlank()) Text(item.summary, style = MaterialTheme.typography.bodySmall, maxLines = 3)
                Text(
                    stringResource(Res.string.news_source, item.sourceName, dayMonthYear(item.publishedAt, months)),
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun Spinner() = Box(Modifier.fillMaxWidth().padding(16.dp), Alignment.Center) { CircularProgressIndicator() }
