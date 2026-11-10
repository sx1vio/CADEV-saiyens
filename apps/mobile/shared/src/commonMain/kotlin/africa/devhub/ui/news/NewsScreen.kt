package africa.devhub.ui.news

import africa.devhub.ui.home.NewsCard
import africa.devhub.ui.components.openWeb
import africa.devhub.news.NewsItem
import africa.devhub.news.NewsState
import africa.devhub.resources.Res
import africa.devhub.ui.components.EmptyCard
import africa.devhub.resources.djeli_book
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
import africa.devhub.ui.components.TabBar
import androidx.compose.foundation.layout.size
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
import africa.devhub.ui.components.Card
import androidx.compose.material3.CircularProgressIndicator
import africa.devhub.ui.components.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import africa.devhub.ui.components.OutlinedTextField
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
    val open: (NewsItem) -> Unit = { uriHandler.openWeb(it.url) }
    var tab by rememberSaveable { mutableIntStateOf(0) }
    Column(Modifier.fillMaxSize()) {
        TabBar(listOf(stringResource(Res.string.news_top), stringResource(Res.string.news_videos)), tab, onSelect = { tab = it })
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
                            leadingIcon = { androidx.compose.material3.Icon(africa.devhub.ui.components.DevHubIcons.Search, contentDescription = null, modifier = Modifier.size(18.dp)) },
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
                    tab == 1 -> articles(home.videos, months, open, labels = home.sectionLabels)
                    state.results != null -> if (state.searching) item { Spinner() } else articles(state.results, months, open, labels = home.sectionLabels)
                    else -> {
                        if (home.hero.isNotEmpty() || home.sections.values.all { it.isEmpty() }) articles(home.hero, months, open, labels = home.sectionLabels)
                        home.sections.forEach { (key, list) ->
                            if (list.isEmpty()) return@forEach
                            item {
                                Text(
                                    home.sectionLabels[key] ?: key,
                                    style = MaterialTheme.typography.titleMedium,
                                    modifier = Modifier.padding(top = 8.dp).semantics { heading() },
                                )
                            }
                            articles(list.take(5), months, open, keyPrefix = key, labels = home.sectionLabels)
                        }
                    }
                }
            }
        }
    }
}

private fun LazyListScope.articles(
    list: List<NewsItem>,
    months: List<String>,
    open: (NewsItem) -> Unit,
    keyPrefix: String = "",
    labels: Map<String, String> = emptyMap(),
) {
    if (list.isEmpty()) {
        item(key = "$keyPrefix-empty") { EmptyCard(stringResource(Res.string.news_empty), Res.drawable.djeli_book) }
        return
    }
    // Même carte que le fil d'accueil : logo de la source, titre, résumé, image, lien.
    items(list, key = { keyPrefix + it.id }) { item -> NewsCard(item, labels[item.category], months, onOpen = { open(item) }) }
}

@Composable
private fun Spinner() = Box(Modifier.fillMaxWidth().padding(16.dp), Alignment.Center) { CircularProgressIndicator() }
