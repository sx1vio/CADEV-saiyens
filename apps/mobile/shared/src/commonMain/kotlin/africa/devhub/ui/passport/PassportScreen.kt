package africa.devhub.ui.passport

import africa.devhub.passport.Passport
import africa.devhub.passport.PassportState
import africa.devhub.passport.PassportStats
import africa.devhub.passport.RefreshState
import africa.devhub.passport.Skill
import africa.devhub.passport.Tag
import africa.devhub.resources.Res
import africa.devhub.resources.cached_copy
import africa.devhub.resources.hours_short
import africa.devhub.resources.legend_g
import africa.devhub.resources.legend_p
import africa.devhub.resources.level_advanced
import africa.devhub.resources.level_beginner
import africa.devhub.resources.level_confirmed
import africa.devhub.resources.level_expert
import africa.devhub.resources.minutes_short
import africa.devhub.resources.months
import africa.devhub.resources.passport_can_help
import africa.devhub.resources.passport_demo
import africa.devhub.resources.passport_failed
import africa.devhub.resources.passport_member_since
import africa.devhub.resources.passport_mission
import africa.devhub.resources.passport_no_skills
import africa.devhub.resources.passport_not_found
import africa.devhub.resources.passport_projects
import africa.devhub.resources.passport_see_proofs
import africa.devhub.resources.passport_skills
import africa.devhub.resources.passport_stats
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
import africa.devhub.ui.components.Initials
import africa.devhub.ui.components.LoadingScreen
import africa.devhub.ui.components.Pill
import africa.devhub.ui.components.ScreenColumn
import africa.devhub.ui.components.TrustPills
import africa.devhub.ui.components.TrustSignals
import africa.devhub.ui.components.monthYear
import africa.devhub.ui.theme.successColor
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import org.jetbrains.compose.resources.stringArrayResource
import org.jetbrains.compose.resources.stringResource
import kotlin.math.roundToInt

/** Developer Passport (PR2, PR3, PR7) : chaque chiffre renvoie à ses preuves. */
@Composable
fun PassportScreen(
    state: PassportState,
    isMine: Boolean,
    onRetry: () -> Unit,
    onRefreshGithub: () -> Unit,
    onSeeProofs: () -> Unit,
    /** Écrire à ce dev (Passport d'un autre membre) ; null sur son propre Passport. */
    onWrite: (() -> Unit)? = null,
    writeFailed: Boolean = false,
) {
    when (state) {
        PassportState.Loading -> LoadingScreen()
        PassportState.NotFound -> Message(stringResource(Res.string.passport_not_found), null)
        PassportState.Failed -> Message(stringResource(Res.string.passport_failed), onRetry)
        is PassportState.Loaded -> Loaded(state, isMine, onRefreshGithub, onSeeProofs, onWrite, writeFailed)
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

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Loaded(
    state: PassportState.Loaded,
    isMine: Boolean,
    onRefreshGithub: () -> Unit,
    onSeeProofs: () -> Unit,
    onWrite: (() -> Unit)?,
    writeFailed: Boolean,
) {
    val passport = state.passport
    val user = passport.user
    val months = stringArrayResource(Res.array.months)
    ScreenColumn {
        if (state.cachedAt != null) {
            Text(stringResource(Res.string.cached_copy), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Row(verticalAlignment = Alignment.CenterVertically) {
            Initials(user.displayName, size = 64.dp)
            Column(Modifier.padding(start = 16.dp)) {
                Text(
                    user.displayName,
                    style = MaterialTheme.typography.titleLarge,
                    modifier = Modifier.semantics { heading() },
                )
                Text(
                    listOfNotNull("@${user.handle}", user.country).joinToString(" · "),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(
                    stringResource(Res.string.passport_member_since, monthYear(user.memberSince, months)),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        if (user.isDemo) Text(stringResource(Res.string.passport_demo), color = MaterialTheme.colorScheme.error)
        TrustPills(
            TrustSignals(
                githubLinked = passport.trust.githubLinked,
                githubAccountYears = passport.trust.githubAccountYears,
                emailVerified = passport.trust.emailVerified,
                founder = passport.trust.founder,
                demo = passport.trust.demo,
            ),
        )
        if (user.availability?.mission == true) Pill(stringResource(Res.string.passport_mission), successColor)
        user.bio?.takeIf { it.isNotBlank() }?.let { Text(it, style = MaterialTheme.typography.bodyLarge) }

        SectionTitle(stringResource(Res.string.passport_stats))
        val stats = passport.stats
        if (stats == null) {
            Text(stringResource(Res.string.stats_hidden), color = MaterialTheme.colorScheme.onSurfaceVariant)
        } else {
            Stats(stats)
        }

        SectionTitle(stringResource(Res.string.passport_skills))
        if (passport.skills.isEmpty()) {
            Text(stringResource(Res.string.passport_no_skills), color = MaterialTheme.colorScheme.onSurfaceVariant)
        } else {
            Legend()
            passport.skills.forEach { SkillRow(it) }
        }

        TagSection(stringResource(Res.string.passport_can_help), passport.canHelp)
        TagSection(stringResource(Res.string.passport_want_learn), passport.wantLearn)

        if (passport.projects.isNotEmpty()) {
            SectionTitle(stringResource(Res.string.passport_projects))
            passport.projects.forEach { project ->
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp)) {
                        Text(project.name, style = MaterialTheme.typography.titleSmall)
                        project.repoFullName?.let {
                            Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
        }

        Button(onClick = onSeeProofs, modifier = Modifier.fillMaxWidth()) {
            Text(stringResource(Res.string.passport_see_proofs))
        }
        if (!isMine && onWrite != null) {
            OutlinedButton(onClick = onWrite, modifier = Modifier.fillMaxWidth()) { Text(stringResource(Res.string.passport_write)) }
            if (writeFailed) Text(stringResource(Res.string.passport_write_failed), color = MaterialTheme.colorScheme.error)
        }
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
}

@Composable
private fun SectionTitle(text: String) {
    Text(
        text,
        style = MaterialTheme.typography.titleMedium,
        modifier = Modifier.padding(top = 8.dp).semantics { heading() },
    )
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Stats(stats: PassportStats) {
    val median = stats.medianMinutesToHelp?.roundToInt()?.let { minutes ->
        if (minutes < 60) stringResource(Res.string.minutes_short, minutes)
        else stringResource(Res.string.hours_short, (minutes + 30) / 60)
    }
    val tiles = listOfNotNull(
        stats.totalXp.toString() to stringResource(Res.string.stat_xp),
        stats.answersAccepted.toString() to stringResource(Res.string.stat_accepted),
        stats.helpfulVotes.toString() to stringResource(Res.string.stat_helpful),
        stats.questionsResolved.toString() to stringResource(Res.string.stat_resolved),
        stats.contributions.toString() to stringResource(Res.string.stat_contributions),
        stats.reviews.toString() to stringResource(Res.string.stat_reviews),
        median?.let { it to stringResource(Res.string.stat_median) },
    )
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        tiles.forEach { (value, label) ->
            Card(Modifier.widthIn(min = 100.dp)) {
                Column(Modifier.padding(12.dp).semantics(mergeDescendants = true) {}) {
                    Text(value, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
                    Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
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

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun TagSection(title: String, tags: List<Tag>) {
    if (tags.isEmpty()) return
    SectionTitle(title)
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        tags.forEach { Pill(it.label) }
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
