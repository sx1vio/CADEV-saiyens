package africa.devhub.ui.home

import androidx.compose.runtime.setValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.getValue
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.layout.aspectRatio
import africa.devhub.ui.components.RemoteImage
import africa.devhub.community.PostView
import africa.devhub.news.NewsItem
import africa.devhub.resources.Res
import africa.devhub.resources.feed_discuss
import africa.devhub.resources.feed_read
import africa.devhub.resources.feed_watch
import africa.devhub.resources.home_composer_blocked
import africa.devhub.resources.home_composer_project
import africa.devhub.resources.home_composer_prompt
import africa.devhub.resources.home_composer_test
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import africa.devhub.resources.feed_comments
import africa.devhub.resources.post_score
import africa.devhub.ui.community.communityLabel
import africa.devhub.ui.components.DevCard
import africa.devhub.ui.components.DevHubIcons
import africa.devhub.ui.components.Initials
import africa.devhub.ui.components.dayMonthYear
import africa.devhub.ui.theme.Glass
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import org.jetbrains.compose.resources.stringResource

// Pièces du fil d'accueil, calquées sur apps/web/src/pages/Feed.tsx : barre de publication,
// carte d'actualité (source, titre, résumé, lien, actions) et carte de publication.

/** Barre de publication : avatar, invitation à écrire, puis les deux actions rapides. */
@Composable
@OptIn(ExperimentalLayoutApi::class)
fun Composer(name: String, onCompose: () -> Unit, onAsk: () -> Unit, onTest: () -> Unit, avatar: @Composable () -> Unit = { Initials(name, size = 48.dp) }) {
    DevCard {
        Column(Modifier.padding(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                avatar()
                Surface(
                    onClick = onCompose,
                    shape = CircleShape,
                    color = Glass.strong,
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                    modifier = Modifier.weight(1f).height(48.dp),
                ) {
                    Box(Modifier.padding(horizontal = 20.dp), contentAlignment = Alignment.CenterStart) {
                        Text(
                            stringResource(Res.string.home_composer_prompt),
                            style = MaterialTheme.typography.titleSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                }
            }
            // Trois raccourcis du web : ils passent à la ligne sur un écran étroit, centrés.
            FlowRow(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(4.dp, Alignment.CenterHorizontally)) {
                FeedAction(DevHubIcons.Zap, stringResource(Res.string.home_composer_blocked), onAsk)
                FeedAction(DevHubIcons.Folder, stringResource(Res.string.home_composer_project), onCompose)
                FeedAction(DevHubIcons.Smartphone, stringResource(Res.string.home_composer_test), onTest)
            }
        }
    }
}

@Composable
private fun FeedAction(
    icon: ImageVector,
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    tint: androidx.compose.ui.graphics.Color = MaterialTheme.colorScheme.onSurface,
) {
    Row(
        modifier.defaultMinSize(minHeight = 44.dp)
            .clickable(role = Role.Button, onClick = onClick)
            .padding(horizontal = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
    ) {
        Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(20.dp))
        Text(label, style = MaterialTheme.typography.labelLarge, color = tint, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

/** Domaine d'un lien (« www.exemple.com/page » → « exemple.com »). */
private fun domainOf(url: String): String = url.substringAfter("://").substringBefore('/').removePrefix("www.")

/**
 * Marque de la source (`SourceMark` du web) : son favicon, lu par le proxy du serveur ; à défaut,
 * ses initiales sans chiffres (« 01net » → « N ») sur fond gris, car un chiffre seul ressemble à une donnée cassée.
 */
@Composable
private fun SourceMark(item: NewsItem) {
    val domain = domainOf(item.url)
    val letters = item.sourceName.removePrefix("The ").filter { it.isLetter() || it.isWhitespace() }
        .split(' ').filter { it.isNotBlank() }.take(2).joinToString("") { it.first().uppercase() }.ifEmpty { "·" }
    Box(Modifier.size(48.dp).clip(RoundedCornerShape(6.dp)).background(MaterialTheme.colorScheme.surfaceVariant), contentAlignment = Alignment.Center) {
        Text(letters, style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        if (domain.isNotEmpty()) {
            RemoteImage(
                "https://www.google.com/s2/favicons?domain=$domain&sz=64",
                width = 160,
                modifier = Modifier.matchParentSize().background(MaterialTheme.colorScheme.surface),
                contentScale = ContentScale.Fit,
            )
        }
    }
}

/** Carte d'actualité : source et date, titre, résumé, lien sortant, puis Discuter / Lire. */
@Composable
fun NewsCard(item: NewsItem, categoryLabel: String?, months: List<String>, onOpen: () -> Unit, onDiscuss: (() -> Unit)? = null) {
    val video = item.kind == "video"
    DevCard {
        Row(
            Modifier.padding(start = 16.dp, end = 16.dp, top = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            SourceMark(item)
            Column(Modifier.weight(1f)) {
                Text(item.sourceName, style = MaterialTheme.typography.titleSmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(
                    listOfNotNull(categoryLabel, dayMonthYear(item.publishedAt, months)).joinToString(" · "),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
        Column(
            Modifier.fillMaxWidth().clickable(role = Role.Button, onClick = onOpen).padding(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Text(item.title, style = MaterialTheme.typography.titleMedium, maxLines = 4, overflow = TextOverflow.Ellipsis)
            if (item.summary.isNotBlank()) {
                Text(
                    item.summary,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 3,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
        var imageFailed by remember(item.id) { mutableStateOf(false) }
        if (item.image != null && !imageFailed) {
            // Même cadre que le web : 2,2 pour 1, rogné ; une vidéo porte le bouton de lecture.
            Box(Modifier.fillMaxWidth().aspectRatio(2.2f).background(MaterialTheme.colorScheme.surfaceVariant).clickable(role = Role.Button, onClick = onOpen)) {
                RemoteImage(item.image, width = 1200, modifier = Modifier.matchParentSize(), onFailed = { imageFailed = true })
                if (video) {
                    Box(Modifier.align(Alignment.Center).size(56.dp).background(Color.Black.copy(alpha = 0.7f), CircleShape), contentAlignment = Alignment.Center) {
                        Icon(DevHubIcons.Play, contentDescription = null, tint = Color.White, modifier = Modifier.size(24.dp))
                    }
                }
            }
        }
        Row(
            Modifier.fillMaxWidth().background(MaterialTheme.colorScheme.background).clickable(role = Role.Button, onClick = onOpen)
                .padding(horizontal = 16.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Icon(
                if (video) DevHubIcons.Play else DevHubIcons.ExternalLink,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(16.dp),
            )
            Text(
                if (video) "youtube.com" else domainOf(item.url),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
        Row(Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 2.dp)) {
            if (onDiscuss != null) FeedAction(DevHubIcons.Chat, stringResource(Res.string.feed_discuss), onDiscuss, Modifier.weight(1f), tint = MaterialTheme.colorScheme.onSurfaceVariant)
            FeedAction(
                if (video) DevHubIcons.Play else DevHubIcons.ExternalLink,
                stringResource(if (video) Res.string.feed_watch else Res.string.feed_read),
                onOpen,
                Modifier.weight(1f),
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

/** Carte d'une publication des communautés : auteur, communauté et date, titre, début du texte, score. */
@Composable
fun PostFeedCard(post: PostView, months: List<String>, onOpen: () -> Unit) {
    DevCard(Modifier.clickable(role = Role.Button, onClick = onOpen)) {
        Row(
            Modifier.padding(start = 16.dp, end = 16.dp, top = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Initials(post.author.displayName, size = 48.dp)
            Column(Modifier.weight(1f)) {
                Text(post.author.displayName, style = MaterialTheme.typography.titleSmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(
                    stringResource(communityLabel(post.community)) + " · " + dayMonthYear(post.createdAt, months),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
        Column(Modifier.padding(horizontal = 16.dp, vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(post.title, style = MaterialTheme.typography.titleMedium, maxLines = 3, overflow = TextOverflow.Ellipsis)
            if (post.body.isNotBlank()) {
                Text(
                    post.body,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 3,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
        Text(
            stringResource(Res.string.feed_comments, post.comments) + " · " + stringResource(Res.string.post_score, post.score),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
        )
    }
}
