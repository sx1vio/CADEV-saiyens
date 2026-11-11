package africa.devhub.ui.home

import africa.devhub.ui.components.UserAvatar
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import africa.devhub.resources.home_my_topics
import africa.devhub.community.COMMUNITY_SLUGS
import africa.devhub.community.FeedState
import africa.devhub.community.PostView
import africa.devhub.me.Me
import africa.devhub.news.NewsItem
import africa.devhub.news.NewsState
import africa.devhub.resources.Res
import africa.devhub.resources.community_all
import africa.devhub.resources.home_headlines
import africa.devhub.resources.nav_questions
import africa.devhub.resources.home_tab_for_you
import africa.devhub.resources.home_tab_news
import africa.devhub.resources.home_talks
import africa.devhub.resources.home_talks_meta
import africa.devhub.resources.home_topic_ai
import africa.devhub.resources.home_topic_dev
import africa.devhub.resources.months
import africa.devhub.resources.news_failed
import africa.devhub.resources.news_videos
import africa.devhub.ui.community.communityLabel
import africa.devhub.ui.components.DevCard
import africa.devhub.ui.components.DevHubIcons
import africa.devhub.ui.components.FilterChip
import africa.devhub.ui.components.RowDivider
import africa.devhub.ui.components.StateMessage
import africa.devhub.ui.components.UnderlineTabs
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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import org.jetbrains.compose.resources.stringArrayResource
import org.jetbrains.compose.resources.stringResource

/** Accès depuis l'accueil aux écrans sans onglet, et aux gestes du fil. */
class HomeLinks(
    val onOpenArticle: (NewsItem) -> Unit,
    val onCompose: () -> Unit,
    val onAsk: () -> Unit,
    val onOpenPost: (String) -> Unit,
    val onMenu: () -> Unit,
    val onAlerts: () -> Unit,
    val onMessages: () -> Unit,
    val onQuestions: () -> Unit,
    val onTest: () -> Unit,
)

/** Une ligne du fil « Pour toi » : une actualité ou une publication, triées par date. */
private sealed interface Entry {
    val at: String

    data class News(val item: NewsItem) : Entry {
        override val at get() = item.publishedAt
    }

    data class Post(val post: PostView) : Entry {
        override val at get() = post.createdAt
    }
}

private const val TOPIC_ALL = ""
private const val TOPIC_HEADLINES = "une"
private const val MAX_ENTRIES = 40

/**
 * Accueil connecté, comme celui du web : barre de publication, onglets « Pour toi » et
 * « Actualité », puces de sujets, puis le fil. Les autres écrans sont dans le menu, la
 * déconnexion en bas du menu, derrière une confirmation si des actions attendent d'être envoyées.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    me: Me,
    unread: Int,
    news: NewsState,
    feed: FeedState,
    links: HomeLinks,
    onCommunity: (String?) -> Unit,
    onReload: () -> Unit,
    ) {
    var tab by rememberSaveable { mutableStateOf(0) }
    var topic by rememberSaveable { mutableStateOf(TOPIC_ALL) }
    var newsTopic by rememberSaveable { mutableStateOf(TOPIC_ALL) }
    val months = stringArrayResource(Res.array.months)
    val home = news.home
    val labels = home?.sectionLabels.orEmpty()
    fun label(item: NewsItem): String? = labels[item.category]

    val forYou = remember(home, feed.items, topic) {
        if (topic != TOPIC_ALL || home == null && feed.items.isEmpty()) {
            feed.items.map { Entry.Post(it) }
        } else {
            val seen = mutableSetOf<String>()
            val articles = (home?.hero.orEmpty() + home?.sections?.values?.flatten().orEmpty() + home?.videos.orEmpty())
                .filter { seen.add(it.id) }
            (articles.map { Entry.News(it) } + feed.items.map { Entry.Post(it) }).sortedByDescending { it.at }.take(MAX_ENTRIES)
        }
    }
    val headlines = remember(home) {
        val seen = mutableSetOf<String>()
        (home?.hero.orEmpty() + home?.sections?.values?.mapNotNull { it.firstOrNull() }.orEmpty())
            .filter { seen.add(it.id) }
            .sortedByDescending { it.publishedAt }
    }
    val newsList = remember(home, newsTopic) {
        when (newsTopic) {
            "videos" -> home?.videos.orEmpty()
            "ia", "dev" -> home?.sections?.get(newsTopic).orEmpty()
            else -> {
                val seen = mutableSetOf<String>()
                (home?.hero.orEmpty() + home?.sections?.values?.flatten().orEmpty()).filter { seen.add(it.id) }
                    .sortedByDescending { it.publishedAt }.take(MAX_ENTRIES)
            }
        }
    }
    val loading = if (tab == 0) news.loading && feed.loading && home == null && feed.items.isEmpty() else news.loading && home == null
    val failed = if (tab == 0) news.failed && feed.failed && forYou.isEmpty() else news.failed && home == null

    // L'en-tête (menu, recherche, messages, alertes, avatar) est celui de la coque, comme sur le web.
    Column(Modifier.fillMaxSize()) {
    Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.TopCenter) {
        LazyColumn(
            modifier = Modifier.widthIn(max = 560.dp).fillMaxWidth(),
            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 8.dp, bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item { Composer(me.displayName, links.onCompose, links.onAsk, links.onTest, avatar = { UserAvatar(me, 48) }) }
            item {
                Column {
                    UnderlineTabs(
                        // Ordre du web : Pour toi, Questions, Actualité.
                        labels = listOf(stringResource(Res.string.home_tab_for_you), stringResource(Res.string.nav_questions), stringResource(Res.string.home_tab_news)),
                        selected = if (tab == 0) 0 else 2,
                        onSelect = {
                            when (it) {
                                1 -> links.onQuestions()
                                2 -> tab = 1
                                else -> tab = 0
                            }
                        },
                        indicator = MaterialTheme.colorScheme.onSurface,
                    )
                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                }
            }
            item {
                if (tab == 0) {
                    TopicChips(
                        selected = topic,
                        onSelect = {
                            topic = it
                            onCommunity(it.takeIf { slug -> slug != TOPIC_ALL && slug != TOPIC_HEADLINES })
                        },
                    )
                } else {
                    NewsChips(newsTopic) { newsTopic = it }
                }
            }
            when {
                loading -> item {
                    Box(Modifier.fillMaxWidth().padding(24.dp), Alignment.Center) { CircularProgressIndicator() }
                }
                failed -> item {
                    DevCard { StateMessage(DevHubIcons.WifiOff, stringResource(Res.string.news_failed), isError = false, onRetry = onReload) }
                }
                tab == 0 && topic == TOPIC_HEADLINES -> {
                    val talks = home?.hn.orEmpty().filter { it.comments > 0 }.take(5)
                    if (talks.isNotEmpty()) item {
                        DevCard {
                            Text(stringResource(Res.string.home_talks), style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(16.dp))
                            talks.forEachIndexed { i, talk ->
                                if (i > 0) RowDivider()
                                Row(
                                    Modifier.fillMaxWidth().clickable(role = Role.Button) { links.onOpenArticle(talk) }.padding(16.dp),
                                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                                ) {
                                    Text("${i + 1}", style = MaterialTheme.typography.titleSmall)
                                    Column(Modifier.weight(1f)) {
                                        Text(talk.title, style = MaterialTheme.typography.titleSmall)
                                        Text(
                                            stringResource(Res.string.home_talks_meta, talk.comments),
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                    }
                                }
                            }
                        }
                    }
                    items(headlines, key = { "h-" + it.id }) { NewsEntry(it, ::label, months, links) }
                }
                tab == 0 -> items(forYou, key = { entryKey(it) }) { entry ->
                    when (entry) {
                        is Entry.News -> NewsEntry(entry.item, ::label, months, links)
                        is Entry.Post -> PostFeedCard(entry.post, months) { links.onOpenPost(entry.post.id) }
                    }
                }
                else -> items(newsList, key = { "n-" + it.id }) { NewsEntry(it, ::label, months, links) }
            }
        }
    }
    }
}

private fun entryKey(e: Entry): String = when (e) {
    is Entry.News -> "n-" + e.item.id
    is Entry.Post -> "p-" + e.post.id
}

@Composable
private fun NewsEntry(item: NewsItem, label: (NewsItem) -> String?, months: List<String>, links: HomeLinks) {
    NewsCard(item, label(item), months, onOpen = { links.onOpenArticle(item) }, onDiscuss = links.onCompose)
}

/** Puces de sujets du fil : tout, la une, puis une par communauté. */
@Composable
private fun TopicChips(selected: String, onSelect: (String) -> Unit) {
    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        item { FilterChip(selected == TOPIC_ALL, { onSelect(TOPIC_ALL) }, { Text(stringResource(Res.string.home_my_topics)) }) }
        item { FilterChip(selected == TOPIC_HEADLINES, { onSelect(TOPIC_HEADLINES) }, { Text(stringResource(Res.string.home_headlines)) }) }
        items(COMMUNITY_SLUGS) { slug -> FilterChip(selected == slug, { onSelect(slug) }, { Text(stringResource(communityLabel(slug))) }) }
    }
}

/** Puces de l'onglet Actualité : tout, IA, dev, vidéos. */
@Composable
private fun NewsChips(selected: String, onSelect: (String) -> Unit) {
    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        item { FilterChip(selected == TOPIC_ALL, { onSelect(TOPIC_ALL) }, { Text(stringResource(Res.string.community_all)) }) }
        item { FilterChip(selected == "ia", { onSelect("ia") }, { Text(stringResource(Res.string.home_topic_ai)) }) }
        item { FilterChip(selected == "dev", { onSelect("dev") }, { Text(stringResource(Res.string.home_topic_dev)) }) }
        item { FilterChip(selected == "videos", { onSelect("videos") }, { Text(stringResource(Res.string.news_videos)) }) }
    }
}
