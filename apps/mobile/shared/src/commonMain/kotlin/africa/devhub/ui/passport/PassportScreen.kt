package africa.devhub.ui.passport

import africa.devhub.certs.CertCatalog
import africa.devhub.onboarding.AfricanCountries
import africa.devhub.passport.PassportProject
import africa.devhub.passport.PassportState
import africa.devhub.passport.PassportStats
import africa.devhub.passport.RefreshState
import africa.devhub.passport.Skill
import africa.devhub.passport.Tag
import africa.devhub.passport.UserCertificate
import africa.devhub.resources.Res
import africa.devhub.resources.cached_copy
import africa.devhub.resources.certs_title
import africa.devhub.resources.hours_short
import africa.devhub.resources.legend_g
import africa.devhub.resources.legend_p
import africa.devhub.resources.level_advanced
import africa.devhub.resources.level_beginner
import africa.devhub.resources.level_confirmed
import africa.devhub.resources.level_expert
import africa.devhub.resources.minutes_short
import africa.devhub.resources.months
import africa.devhub.resources.passport_about
import africa.devhub.resources.passport_can_help
import africa.devhub.resources.passport_certs_none
import africa.devhub.resources.passport_certs_none_mine
import africa.devhub.resources.passport_certs_prepare
import africa.devhub.resources.passport_cover_desc
import africa.devhub.resources.passport_edit
import africa.devhub.resources.passport_share
import africa.devhub.resources.passport_failed
import africa.devhub.resources.passport_help_title
import africa.devhub.resources.passport_member_since
import africa.devhub.resources.passport_mission
import africa.devhub.resources.passport_no_rooms
import africa.devhub.resources.passport_no_skills
import africa.devhub.resources.passport_no_timeline
import africa.devhub.resources.passport_not_found
import africa.devhub.resources.passport_projects
import africa.devhub.resources.passport_see_proofs
import africa.devhub.resources.passport_skills
import africa.devhub.resources.passport_stat_badges
import africa.devhub.resources.passport_stat_unblocked
import africa.devhub.resources.passport_tab_activity
import africa.devhub.resources.passport_tab_overview
import africa.devhub.resources.passport_timeline
import africa.devhub.resources.passport_want_learn
import africa.devhub.resources.passport_write
import africa.devhub.resources.passport_write_failed
import africa.devhub.resources.refresh_done
import africa.devhub.resources.refresh_github
import africa.devhub.resources.refresh_not_linked
import africa.devhub.resources.refresh_revoked
import africa.devhub.resources.refresh_too_soon
import africa.devhub.resources.refresh_unavailable
import africa.devhub.resources.retry
import africa.devhub.resources.skill_detail
import africa.devhub.resources.stat_accepted
import africa.devhub.resources.stat_contributions
import africa.devhub.resources.stat_helpful
import africa.devhub.resources.stat_median
import africa.devhub.resources.stat_resolved
import africa.devhub.resources.stat_reviews
import africa.devhub.resources.stat_xp
import africa.devhub.resources.stats_hidden
import africa.devhub.resources.trust_demo
import africa.devhub.resources.trust_email
import africa.devhub.resources.trust_founder
import africa.devhub.resources.trust_github
import africa.devhub.resources.trust_github_years
import africa.devhub.platform.rememberShareText
import africa.devhub.ui.components.Badge
import africa.devhub.ui.components.Button
import africa.devhub.ui.components.CertBadge
import africa.devhub.ui.components.DevCard
import africa.devhub.ui.components.DevHubIcons
import africa.devhub.ui.components.Initials
import africa.devhub.ui.components.LoadingScreen
import africa.devhub.ui.components.Pill
import africa.devhub.ui.components.PrimaryPill
import africa.devhub.ui.components.ScreenColumn
import africa.devhub.ui.components.SecondaryPill
import africa.devhub.ui.components.UnderlineTabs
import africa.devhub.ui.components.monthYear
import africa.devhub.ui.theme.successColor
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.requiredSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import africa.devhub.passport.lastDays
import africa.devhub.ui.theme.successColor
import androidx.compose.runtime.remember
import org.jetbrains.compose.resources.pluralStringResource
import org.jetbrains.compose.resources.stringArrayResource
import org.jetbrains.compose.resources.stringResource
import kotlin.math.roundToInt

/** Profil développeur (Passport : PR2, PR3, PR7), calqué sur la page profil du web : chaque chiffre renvoie à ses preuves. */
@Composable
fun PassportScreen(
    state: PassportState,
    isMine: Boolean,
    lang: String,
    onRetry: () -> Unit,
    onRefreshGithub: () -> Unit,
    onSeeProofs: () -> Unit,
    onEdit: () -> Unit,
    onCerts: () -> Unit,
    /** Adresse publique du profil, copiée par « Partager ». */
    shareUrl: String,
    /** Écrire à ce dev (profil d'un autre membre) ; null sur son propre profil. */
    onWrite: (() -> Unit)? = null,
    writeFailed: Boolean = false,
) {
    when (state) {
        PassportState.Loading -> LoadingScreen()
        PassportState.NotFound -> Message(stringResource(Res.string.passport_not_found), null)
        PassportState.Failed -> Message(stringResource(Res.string.passport_failed), onRetry)
        is PassportState.Loaded -> Loaded(state, isMine, lang, onRefreshGithub, onSeeProofs, onEdit, onCerts, shareUrl, onWrite, writeFailed)
    }
}

@Composable
private fun Message(text: String, onRetry: (() -> Unit)?) {
    ScreenColumn(verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically)) {
        Text(text, style = MaterialTheme.typography.titleMedium)
        if (onRetry != null) {
            Button(onClick = onRetry, modifier = Modifier.fillMaxWidth()) { Text(stringResource(Res.string.retry)) }
        }
    }
}

private const val TAB_OVERVIEW = 0
private const val TAB_SKILLS = 1
private const val TAB_PROJECTS = 2
private const val TAB_ACTIVITY = 3

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Loaded(
    state: PassportState.Loaded,
    isMine: Boolean,
    lang: String,
    onRefreshGithub: () -> Unit,
    onSeeProofs: () -> Unit,
    onEdit: () -> Unit,
    onCerts: () -> Unit,
    shareUrl: String,
    onWrite: (() -> Unit)?,
    writeFailed: Boolean,
) {
    val passport = state.passport
    val share = rememberShareText()
    val coverDays = remember(state.proofDays) { lastDays(state.proofDays, todayEpochDay(), 52 * 7) }
    val user = passport.user
    val months = stringArrayResource(Res.array.months)
    var tab by rememberSaveable { mutableStateOf(TAB_OVERVIEW) }
    val bioLines = user.bio.orEmpty().lines()
    val headline = bioLines.firstOrNull()?.takeIf { it.isNotBlank() }
    val about = bioLines.drop(1).joinToString("\n").trim()
    val country = user.country?.let { code -> AfricanCountries.firstOrNull { it.code == code }?.name(lang) ?: code }
    val where = listOfNotNull(
        user.timezone?.takeIf { it.isNotBlank() },
        user.languages.takeIf { it.isNotEmpty() }?.joinToString(" / ") { it.uppercase() },
    ).joinToString(" · ")
    val years = passport.trust.githubAccountYears

    ScreenColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        if (state.cachedAt != null) {
            Text(stringResource(Res.string.cached_copy), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        DevCard {
            ProfileCover(coverDays, stringResource(Res.string.passport_cover_desc))
            Column(Modifier.padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                // La moitié basse de l'avatar est ici ; sa moitié haute remonte sur le bandeau.
                Row(Modifier.fillMaxWidth().height(52.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        Modifier.offset(y = (-26).dp).requiredSize(96.dp).background(MaterialTheme.colorScheme.surface, CircleShape),
                        contentAlignment = Alignment.Center,
                    ) { Initials(user.displayName, size = 88.dp) }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        if (isMine) {
                            SecondaryPill(stringResource(Res.string.passport_edit), onEdit)
                        } else if (onWrite != null) {
                            PrimaryPill(stringResource(Res.string.passport_write), onWrite)
                        }
                        ShareButton(stringResource(Res.string.passport_share)) { share(shareUrl) }
                    }
                }
                if (writeFailed) Text(stringResource(Res.string.passport_write_failed), color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(4.dp), itemVerticalAlignment = Alignment.CenterVertically) {
                        Text(user.displayName, style = MaterialTheme.typography.headlineSmall, modifier = Modifier.semantics { heading() })
                        if (user.isDemo) Badge(stringResource(Res.string.trust_demo), MaterialTheme.colorScheme.error)
                        if (passport.trust.founder) Badge(stringResource(Res.string.trust_founder), MaterialTheme.colorScheme.primary)
                    }
                    Text(
                        headline ?: "@${user.handle}",
                        style = MaterialTheme.typography.bodyLarge,
                        color = if (headline != null) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                FlowRow(horizontalArrangement = Arrangement.spacedBy(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    if (country != null) Meta(DevHubIcons.MapPin, country)
                    if (where.isNotEmpty()) Meta(DevHubIcons.Clock, where)
                    if (passport.trust.githubLinked) {
                        Meta(
                            DevHubIcons.Github,
                            if (years != null && years > 0) pluralStringResource(Res.plurals.trust_github_years, years, years) else stringResource(Res.string.trust_github),
                        )
                    }
                    if (passport.trust.emailVerified) Meta(DevHubIcons.Check, stringResource(Res.string.trust_email))
                }
                if (user.availability?.mission == true) {
                    Row(
                        Modifier.clip(RoundedCornerShape(10.dp)).background(MaterialTheme.colorScheme.surfaceVariant).padding(horizontal = 14.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        Icon(DevHubIcons.Jobs, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(16.dp))
                        Text(stringResource(Res.string.passport_mission), style = MaterialTheme.typography.bodyMedium)
                    }
                }
                val stats = passport.stats
                if (stats == null) {
                    Text(stringResource(Res.string.stats_hidden), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                } else {
                    StatStrip(
                        listOf(
                            stats.totalXp.toString() to stringResource(Res.string.stat_xp),
                            stats.answersAccepted.toString() to stringResource(Res.string.passport_stat_unblocked),
                            stats.contributions.toString() to stringResource(Res.string.stat_contributions),
                            state.certs.size.toString() to stringResource(Res.string.passport_stat_badges),
                        ),
                    )
                }
                Spacer(Modifier.height(0.dp))
            }
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
            Box(Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp)) {
                UnderlineTabs(
                    labels = listOf(
                        stringResource(Res.string.passport_tab_overview),
                        stringResource(Res.string.passport_skills),
                        stringResource(Res.string.passport_projects),
                        stringResource(Res.string.passport_tab_activity),
                    ),
                    selected = tab,
                    onSelect = { tab = it },
                    indicator = MaterialTheme.colorScheme.onSurface,
                )
            }
        }

        when (tab) {
            TAB_OVERVIEW -> {
                if (about.isNotEmpty()) Panel(stringResource(Res.string.passport_about)) { Text(about, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                if (passport.projects.isNotEmpty()) Panel(stringResource(Res.string.passport_projects)) { Projects(passport.projects.take(4)) }
                passport.stats?.let { HelpPanel(it) }
                state.github?.let { GithubPanel(it) }
                SkillsPanel(passport.skills, limit = 5)
                TimelinePanel(passport.stats?.totalXp ?: 0, onSeeProofs)
                CertsPanel(state.certs, isMine, onCerts)
                TagsPanel(stringResource(Res.string.passport_can_help), passport.canHelp)
                TagsPanel(stringResource(Res.string.passport_want_learn), passport.wantLearn)
                Text(
                    stringResource(Res.string.passport_member_since, monthYear(user.memberSince, months)),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(horizontal = 4.dp),
                )
            }
            TAB_SKILLS -> {
                SkillsPanel(passport.skills, limit = null)
                if (isMine && passport.trust.githubLinked) {
                    OutlinedButton(
                        onClick = onRefreshGithub,
                        enabled = state.refresh != RefreshState.Running,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        if (state.refresh == RefreshState.Running) {
                            CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                        } else {
                            Text(stringResource(Res.string.refresh_github))
                        }
                    }
                    RefreshMessage(state.refresh)
                }
            }
            TAB_PROJECTS -> Panel(stringResource(Res.string.passport_projects)) {
                if (passport.projects.isEmpty()) {
                    Text(stringResource(Res.string.passport_no_rooms), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                } else {
                    Projects(passport.projects)
                }
            }
            else -> TimelinePanel(passport.stats?.totalXp ?: 0, onSeeProofs)
        }
    }
}

@Composable
private fun Meta(icon: ImageVector, text: String) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(14.dp))
        Text(text, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

/** Les quatre chiffres du profil, côte à côte, séparés par un filet. */
@Composable
private fun StatStrip(cells: List<Pair<String, String>>) {
    val line = MaterialTheme.colorScheme.outlineVariant
    Row(Modifier.fillMaxWidth().height(IntrinsicSize.Min).clip(RoundedCornerShape(10.dp)).border(1.dp, line, RoundedCornerShape(10.dp))) {
        cells.forEachIndexed { index, (value, label) ->
            if (index > 0) Box(Modifier.width(1.dp).fillMaxHeight().background(line))
            Column(
                Modifier.weight(1f).padding(horizontal = 4.dp, vertical = 10.dp).semantics(mergeDescendants = true) {},
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(value, style = MaterialTheme.typography.titleMedium, fontFamily = FontFamily.Monospace)
                Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center, maxLines = 2)
            }
        }
    }
}

/** Carte à titre du profil (`dh-panel` + h2 de 15 px du web). */
@Composable
private fun Panel(title: String, trailing: (@Composable () -> Unit)? = null, content: @Composable ColumnScope.() -> Unit) {
    DevCard {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(title, style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f).semantics { heading() })
                trailing?.invoke()
            }
            content()
        }
    }
}

@Composable
private fun HelpPanel(stats: PassportStats) {
    val median = stats.medianMinutesToHelp?.roundToInt()?.let { minutes ->
        if (minutes < 60) stringResource(Res.string.minutes_short, minutes)
        else stringResource(Res.string.hours_short, (minutes + 30) / 60)
    } ?: "–"
    val tiles = listOf(
        stats.answersAccepted.toString() to stringResource(Res.string.stat_accepted),
        stats.helpfulVotes.toString() to stringResource(Res.string.stat_helpful),
        stats.questionsResolved.toString() to stringResource(Res.string.stat_resolved),
        stats.reviews.toString() to stringResource(Res.string.stat_reviews),
    )
    Panel(stringResource(Res.string.passport_help_title)) {
        tiles.chunked(2).forEach { pair ->
            Row(Modifier.fillMaxWidth()) {
                pair.forEach { (value, label) ->
                    Column(Modifier.weight(1f).semantics(mergeDescendants = true) {}) {
                        Text(value, style = MaterialTheme.typography.titleMedium, fontFamily = FontFamily.Monospace)
                        Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
        Text(
            stringResource(Res.string.stat_median) + " : " + median,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun SkillsPanel(skills: List<Skill>, limit: Int?) {
    Panel(stringResource(Res.string.passport_skills)) {
        if (skills.isEmpty()) {
            Text(stringResource(Res.string.passport_no_skills), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        } else {
            Legend()
            (if (limit != null) skills.take(limit) else skills).forEach { SkillRow(it) }
        }
    }
}

@Composable
private fun TimelinePanel(totalXp: Int, onSeeProofs: () -> Unit) {
    Panel(stringResource(Res.string.passport_timeline)) {
        if (totalXp <= 0) {
            Text(stringResource(Res.string.passport_no_timeline), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        } else {
            SecondaryPill(stringResource(Res.string.passport_see_proofs), onSeeProofs, Modifier.fillMaxWidth())
        }
    }
}

@Composable
private fun CertsPanel(certs: List<UserCertificate>, isMine: Boolean, onCerts: () -> Unit) {
    Panel(stringResource(Res.string.certs_title)) {
        val shown = certs.mapNotNull { c -> CertCatalog.devhub(c.certId)?.let { it to c } }
        if (shown.isEmpty()) {
            Text(
                stringResource(if (isMine) Res.string.passport_certs_none_mine else Res.string.passport_certs_none),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (isMine) {
                Text(
                    stringResource(Res.string.passport_certs_prepare),
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.defaultMinSize(minHeight = 44.dp).clickable(role = Role.Button, onClick = onCerts),
                )
            }
        } else {
            shown.forEach { (cert, certificate) ->
                Row(Modifier.fillMaxWidth().semantics(mergeDescendants = true) {}, verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    CertBadge(cert.color, cert.logo, 40.dp)
                    Column(Modifier.weight(1f)) {
                        Text(cert.title, style = MaterialTheme.typography.titleSmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text(
                            "${certificate.bestScore} % · ${certificate.code}",
                            style = MaterialTheme.typography.bodySmall,
                            fontFamily = FontFamily.Monospace,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
        }
    }
}


@Composable
private fun Projects(projects: List<PassportProject>) {
    projects.forEachIndexed { index, project ->
        if (index > 0) HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
        Column(Modifier.fillMaxWidth()) {
            Text(project.name, style = MaterialTheme.typography.titleSmall)
            project.repoFullName?.let {
                Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun TagsPanel(title: String, tags: List<Tag>) {
    if (tags.isEmpty()) return
    Panel(title) {
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            tags.forEach { Pill(it.label) }
        }
    }
}

private val githubColor: Color @Composable get() = MaterialTheme.colorScheme.onSurfaceVariant
private val platformColor: Color @Composable get() = MaterialTheme.colorScheme.primary

@Composable
private fun Legend() {
    Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
        LegendItem(githubColor, stringResource(Res.string.legend_g))
        LegendItem(platformColor, stringResource(Res.string.legend_p))
    }
}

@Composable
private fun LegendItem(color: Color, label: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(10.dp).clip(RoundedCornerShape(2.dp)).background(color))
        Text(label, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(start = 6.dp))
    }
}

/** PR7 : barre bicolore, G (GitHub) puis P (plateforme), sur 100. */
@Composable
private fun SkillRow(skill: Skill) {
    val level = stringResource(
        when (skill.level) {
            "expert" -> Res.string.level_expert
            "advanced" -> Res.string.level_advanced
            "confirmed" -> Res.string.level_confirmed
            else -> Res.string.level_beginner
        },
    )
    val detail = stringResource(Res.string.skill_detail, skill.score, skill.githubSignal, skill.platformPoints)
    Column(Modifier.fillMaxWidth().semantics(mergeDescendants = true) {}) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(skill.tag.label, style = MaterialTheme.typography.titleSmall)
            Text(level, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
        }
        val g = skill.githubSignal.coerceIn(0, 100) / 100f
        val p = skill.platformPoints.coerceIn(0, 100 - skill.githubSignal.coerceIn(0, 100)) / 100f
        Row(
            Modifier
                .padding(vertical = 6.dp)
                .fillMaxWidth()
                .height(8.dp)
                .clip(RoundedCornerShape(4.dp))
                .background(MaterialTheme.colorScheme.surfaceVariant)
                .clearAndSetSemantics { contentDescription = detail },
        ) {
            if (g > 0f) Box(Modifier.fillMaxHeight().fillMaxWidth(g).background(githubColor))
            if (p > 0f) Box(Modifier.fillMaxHeight().fillMaxWidth(p / (1f - g).coerceAtLeast(0.01f)).background(platformColor))
        }
        Text(detail, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun RefreshMessage(refresh: RefreshState) {
    val (text, isError) = when (refresh) {
        RefreshState.Idle, RefreshState.Running -> return
        RefreshState.Done -> stringResource(Res.string.refresh_done) to false
        is RefreshState.TooSoon -> stringResource(Res.string.refresh_too_soon, refresh.retryAfterMinutes) to false
        RefreshState.NotLinked -> stringResource(Res.string.refresh_not_linked) to true
        RefreshState.TokenRevoked -> stringResource(Res.string.refresh_revoked) to true
        RefreshState.Unavailable -> stringResource(Res.string.refresh_unavailable) to true
    }
    Text(
        text,
        color = if (isError) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
    )
}
