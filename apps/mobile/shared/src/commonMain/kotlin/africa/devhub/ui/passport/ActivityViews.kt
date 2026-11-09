package africa.devhub.ui.passport

import africa.devhub.passport.GithubActivity
import africa.devhub.passport.GithubCommit
import africa.devhub.passport.GithubEvent
import africa.devhub.passport.GithubRepo
import africa.devhub.passport.coverLevel
import africa.devhub.passport.epochDayOf
import africa.devhub.passport.githubLevel
import africa.devhub.resources.*
import africa.devhub.ui.components.DevCard
import africa.devhub.ui.components.DevHubIcons
import africa.devhub.ui.components.openWeb
import africa.devhub.ui.components.safeExternalUrl
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Surface
import africa.devhub.ui.theme.Glass
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import org.jetbrains.compose.resources.stringResource
import kotlin.time.ExperimentalTime

private val COVER_BG = Color(0xFF0F1117)

/** Les cinq nuances du bandeau, fixes : le bandeau reste sombre dans les deux thèmes (comme sur le web). */
private val COVER_CELLS = listOf(0xFF1A1E29, 0xFF173D29, 0xFF1F6B42, 0xFF2F9E5F, 0xFF4CC38A).map { Color(it) }

private val CELLS_LIGHT = listOf(0xFFE9ECF1, 0xFFB7E4C4, 0xFF6BC58A, 0xFF2F9E5A, 0xFF1A6F3C).map { Color(it) }
private val CELLS_DARK = listOf(0xFF191D27, 0xFF173D29, 0xFF1F6B42, 0xFF2F9E5F, 0xFF4CC38A).map { Color(it) }

/** Bouton rond « Partager » du profil (icône seule, comme sur le web) ; [description] est lue par les lecteurs d'écran. */
@Composable
fun ShareButton(description: String, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        shape = CircleShape,
        color = Glass.strong,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
        modifier = Modifier.size(48.dp).semantics { contentDescription = description },
    ) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Icon(DevHubIcons.Share, contentDescription = null, modifier = Modifier.size(18.dp))
        }
    }
}

/** Numéro du jour d'aujourd'hui (UTC), pour caler les grilles. */
@OptIn(ExperimentalTime::class)
fun todayEpochDay(): Long = kotlin.time.Clock.System.now().epochSeconds / 86_400

/**
 * Bandeau du profil : l'activité du dev sur DevHub dessinée en cases, comme le graphe de contributions
 * de GitHub. [days] va du plus ancien au plus récent ; les jours sans activité restent dans la nuit.
 * Les cases s'alignent à droite et s'estompent vers la gauche, comme sur le web.
 */
@Composable
fun ProfileCover(days: List<Int>, description: String) {
    BoxWithConstraints(
        Modifier.fillMaxWidth().height(COVER_HEIGHT).background(COVER_BG).clearAndSetSemantics { contentDescription = description },
    ) {
        val cell = 11.dp
        val gap = 3.dp
        val columns = ((maxWidth - 16.dp + gap) / (cell + gap)).toInt().coerceAtLeast(1)
        val shown = days.takeLast(columns * 7)
        Canvas(Modifier.fillMaxSize()) {
            val c = cell.toPx()
            val step = c + gap.toPx()
            val gridWidth = columns * step - gap.toPx()
            val left = size.width - 16.dp.toPx() - gridWidth
            val top = (size.height - (7 * step - gap.toPx())) / 2
            // Les jours les plus anciens manquants (profil récent) restent des cases éteintes.
            val missing = columns * 7 - shown.size
            for (i in 0 until columns * 7) {
                val count = if (i < missing) 0 else shown[i - missing]
                val col = i / 7
                val row = i % 7
                drawRoundRect(
                    COVER_CELLS[coverLevel(count)],
                    Offset(left + col * step, top + row * step),
                    Size(c, c),
                    CornerRadius(2.dp.toPx()),
                )
            }
            drawRect(
                Brush.horizontalGradient(
                    0.08f to COVER_BG,
                    0.4f to COVER_BG.copy(alpha = 0.6f),
                    0.7f to Color.Transparent,
                ),
            )
        }
    }
}

private val COVER_HEIGHT = 112.dp

/** Nombre d'événements de la grille GitHub (pour la description lue à voix haute). */
private fun GithubActivity.total() = calendar.sumOf { it.count }

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun GithubPanel(g: GithubActivity) {
    val uri = LocalUriHandler.current
    val scheme = MaterialTheme.colorScheme
    val year = g.profile.since.take(4).toIntOrNull()
    DevCard {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(DevHubIcons.Github, contentDescription = null, modifier = Modifier.size(16.dp))
                Text(stringResource(Res.string.gh_title), style = MaterialTheme.typography.titleSmall, modifier = Modifier.semantics { heading() })
                val link = safeExternalUrl(g.profile.url)
                Text(
                    "@${g.profile.login}",
                    style = MaterialTheme.typography.labelLarge,
                    color = scheme.primary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f, fill = false).then(
                        if (link != null) Modifier.clickable(role = Role.Button) { uri.openWeb(link) } else Modifier,
                    ).padding(vertical = 8.dp),
                )
            }
            Text(
                stringResource(Res.string.gh_public_data, agoLabel(g.fetchedAt)),
                style = MaterialTheme.typography.bodySmall,
                color = scheme.onSurfaceVariant,
            )
            Column(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(scheme.surfaceVariant).padding(14.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                val stats = listOf(
                    Res.string.gh_repos to g.profile.publicRepos,
                    Res.string.gh_stars to g.totals.stars,
                    Res.string.gh_commits to g.totals.commits90d,
                    Res.string.gh_followers to g.profile.followers,
                )
                stats.chunked(2).forEach { pair ->
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        pair.forEach { (label, value) ->
                            Column(Modifier.weight(1f)) {
                                Text(stringResource(label), style = MaterialTheme.typography.bodySmall, color = scheme.onSurfaceVariant)
                                Text(value.toString(), style = MaterialTheme.typography.titleLarge)
                            }
                        }
                    }
                }
                if (year != null) {
                    Text(stringResource(Res.string.gh_since, year), style = MaterialTheme.typography.bodySmall, color = scheme.onSurfaceVariant)
                }
                if (g.calendar.isNotEmpty()) {
                    Text(stringResource(Res.string.gh_calendar), style = MaterialTheme.typography.labelMedium, color = scheme.onSurfaceVariant)
                    GithubGrid(g.calendar.map { it.count }, stringResource(Res.string.gh_grid_desc, g.total()))
                }
                if (g.languages.isNotEmpty()) {
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        g.languages.forEach { l ->
                            Row(
                                Modifier.clip(RoundedCornerShape(8.dp)).background(scheme.surface).padding(horizontal = 8.dp, vertical = 4.dp),
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                            ) {
                                Text(l.name, style = MaterialTheme.typography.labelMedium)
                                Text(l.repos.toString(), style = MaterialTheme.typography.labelMedium, color = scheme.onSurfaceVariant)
                            }
                        }
                    }
                }
            }
            if (g.repos.isNotEmpty()) {
                Text(stringResource(Res.string.gh_featured), style = MaterialTheme.typography.labelLarge, color = scheme.onSurfaceVariant)
                g.repos.take(6).forEach { RepoCard(it) { url -> uri.openWeb(url) } }
            }
            if (g.commits.isNotEmpty()) {
                Text(stringResource(Res.string.gh_commits_recent), style = MaterialTheme.typography.labelLarge, color = scheme.onSurfaceVariant)
                g.commits.take(5).forEach { CommitRow(it) { url -> uri.openWeb(url) } }
            }
            if (g.events.isNotEmpty()) {
                Text(stringResource(Res.string.gh_events_recent), style = MaterialTheme.typography.labelLarge, color = scheme.onSurfaceVariant)
                g.events.take(5).forEach { EventRow(it) { url -> uri.openWeb(url) } }
            }
        }
    }
}

/** Grille de 7 lignes (les jours), une colonne par semaine, cases carrées qui remplissent la largeur. */
@Composable
private fun GithubGrid(counts: List<Int>, description: String) {
    val palette = if (isSystemInDarkTheme()) CELLS_DARK else CELLS_LIGHT
    val columns = (counts.size + 6) / 7
    BoxWithConstraints(Modifier.fillMaxWidth()) {
        val gap = 3.dp
        val cell = ((maxWidth - gap * (columns - 1)) / columns).coerceAtMost(22.dp)
        val gridHeight = cell * 7 + gap * 6
        Canvas(Modifier.fillMaxWidth().height(gridHeight).clearAndSetSemantics { contentDescription = description }) {
            val c = cell.toPx()
            val step = c + gap.toPx()
            counts.forEachIndexed { i, n ->
                drawRoundRect(
                    palette[githubLevel(n)],
                    Offset((i / 7) * step, (i % 7) * step),
                    Size(c, c),
                    CornerRadius(3.dp.toPx()),
                )
            }
        }
    }
}

@Composable
private fun RepoCard(r: GithubRepo, onOpen: (String) -> Unit) {
    val scheme = MaterialTheme.colorScheme
    Column(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(scheme.surfaceVariant)
            .clickable(role = Role.Button) { onOpen(r.url) }.padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Text(r.name, style = MaterialTheme.typography.titleSmall, color = scheme.primary, maxLines = 1, overflow = TextOverflow.Ellipsis)
        r.description?.takeIf { it.isNotBlank() }?.let {
            Text(it, style = MaterialTheme.typography.bodySmall, color = scheme.onSurfaceVariant, maxLines = 2, overflow = TextOverflow.Ellipsis)
        }
        FlowRow(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            r.language?.let { Text(it, style = MaterialTheme.typography.labelMedium) }
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(DevHubIcons.Star, contentDescription = null, tint = scheme.onSurfaceVariant, modifier = Modifier.size(13.dp))
                Text(r.stars.toString(), style = MaterialTheme.typography.labelMedium, color = scheme.onSurfaceVariant)
            }
            r.pushedAt?.let { Text(agoLabel(it), style = MaterialTheme.typography.labelMedium, color = scheme.onSurfaceVariant) }
        }
    }
}

@Composable
private fun CommitRow(c: GithubCommit, onOpen: (String) -> Unit) {
    val scheme = MaterialTheme.colorScheme
    Column(Modifier.fillMaxWidth().clickable(role = Role.Button) { onOpen(c.url) }.padding(vertical = 4.dp)) {
        Text(c.message.lineSequence().first(), style = MaterialTheme.typography.bodyMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
        Text(
            "${c.sha.take(7)} · ${c.repo.substringAfter('/')} · ${agoLabel(c.at)}",
            style = MaterialTheme.typography.bodySmall,
            color = scheme.onSurfaceVariant,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
private fun EventRow(e: GithubEvent, onOpen: (String) -> Unit) {
    val scheme = MaterialTheme.colorScheme
    Column(Modifier.fillMaxWidth().clickable(role = Role.Button) { onOpen(e.url) }.padding(vertical = 4.dp)) {
        Text(e.label, style = MaterialTheme.typography.bodyMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
        Text("${e.repo} · ${agoLabel(e.at)}", style = MaterialTheme.typography.bodySmall, color = scheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

/** « aujourd'hui », « il y a 3 j », « il y a 2 mois » : l'âge d'un horodatage ISO. */
@Composable
private fun agoLabel(iso: String): String {
    val days = remember(iso) { epochDayOf(iso)?.let { (todayEpochDay() - it).coerceAtLeast(0) } } ?: return ""
    return when {
        days == 0L -> stringResource(Res.string.gh_ago_today)
        days < 60 -> stringResource(Res.string.gh_ago_days, days.toInt())
        else -> stringResource(Res.string.gh_ago_months, (days / 30).toInt())
    }
}
