package africa.devhub.ui.onboarding

import africa.devhub.app.AppState
import africa.devhub.me.Me
import africa.devhub.onboarding.Country
import africa.devhub.onboarding.Goal
import africa.devhub.onboarding.Level
import africa.devhub.onboarding.OnboardingProfile
import africa.devhub.onboarding.StartTarget
import africa.devhub.onboarding.goalsFor
import africa.devhub.onboarding.searchCountries
import africa.devhub.onboarding.startFor
import africa.devhub.resources.Res
import africa.devhub.resources.conduct_1
import africa.devhub.resources.conduct_2
import africa.devhub.resources.conduct_3
import africa.devhub.resources.conduct_4
import africa.devhub.resources.conduct_title
import africa.devhub.resources.djeli_book
import africa.devhub.resources.djeli_celebrate
import africa.devhub.resources.djeli_laptop
import africa.devhub.resources.djeli_point
import africa.devhub.resources.djeli_trophy
import africa.devhub.resources.djeli_wave
import africa.devhub.resources.lang_en
import africa.devhub.resources.lang_fr
import africa.devhub.resources.onb_accept
import africa.devhub.resources.onb_back
import africa.devhub.resources.onb_continue
import africa.devhub.resources.onb_country
import africa.devhub.resources.onb_country_none
import africa.devhub.resources.onb_country_optional
import africa.devhub.resources.onb_country_search
import africa.devhub.resources.onb_failed
import africa.devhub.resources.onb_go
import africa.devhub.resources.onb_goal_build_ai
import africa.devhub.resources.onb_goal_get_help
import africa.devhub.resources.onb_goal_help
import africa.devhub.resources.onb_goal_job
import africa.devhub.resources.onb_goal_learn
import africa.devhub.resources.onb_goal_news
import africa.devhub.resources.onb_goal_project
import africa.devhub.resources.onb_h_goals
import africa.devhub.resources.onb_h_level
import africa.devhub.resources.onb_h_plan
import africa.devhub.resources.onb_h_where
import africa.devhub.resources.onb_languages
import africa.devhub.resources.onb_level_beginner
import africa.devhub.resources.onb_level_beginner_t
import africa.devhub.resources.onb_level_curious
import africa.devhub.resources.onb_level_curious_t
import africa.devhub.resources.onb_level_junior
import africa.devhub.resources.onb_level_junior_t
import africa.devhub.resources.onb_level_senior
import africa.devhub.resources.onb_level_senior_t
import africa.devhub.resources.onb_mission
import africa.devhub.resources.onb_mission_text
import africa.devhub.resources.onb_plan_first
import africa.devhub.resources.onb_plan_home
import africa.devhub.resources.onb_plan_certs
import africa.devhub.resources.onb_plan_jobs
import africa.devhub.resources.onb_plan_langs
import africa.devhub.resources.onb_plan_sos
import africa.devhub.resources.onb_plan_where
import africa.devhub.resources.onb_progress
import africa.devhub.resources.onb_q_goals
import africa.devhub.resources.onb_q_level
import africa.devhub.resources.onb_q_plan
import africa.devhub.resources.onb_q_where
import africa.devhub.resources.sign_out
import africa.devhub.ui.components.BrandLogo
import africa.devhub.ui.components.ChoiceCard
import africa.devhub.ui.components.DevCard
import africa.devhub.ui.components.DevHubIcons
import africa.devhub.ui.components.DjeliBubble
import africa.devhub.ui.components.NavRow
import africa.devhub.ui.components.OutlinedTextField
import africa.devhub.ui.components.PrimaryPill
import africa.devhub.ui.components.RowDivider
import africa.devhub.ui.components.StepBar
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.stringResource

private const val STEPS = 4

private val LevelCopy = mapOf(
    Level.Curious to Triple(Res.string.onb_level_curious, Res.string.onb_level_curious_t, Res.drawable.djeli_point),
    Level.Beginner to Triple(Res.string.onb_level_beginner, Res.string.onb_level_beginner_t, Res.drawable.djeli_book),
    Level.Junior to Triple(Res.string.onb_level_junior, Res.string.onb_level_junior_t, Res.drawable.djeli_laptop),
    Level.Senior to Triple(Res.string.onb_level_senior, Res.string.onb_level_senior_t, Res.drawable.djeli_trophy),
)

private fun goalLabel(goal: Goal): StringResource = when (goal) {
    Goal.Learn -> Res.string.onb_goal_learn
    Goal.Job -> Res.string.onb_goal_job
    Goal.GetHelp -> Res.string.onb_goal_get_help
    Goal.Help -> Res.string.onb_goal_help
    Goal.Project -> Res.string.onb_goal_project
    Goal.BuildAi -> Res.string.onb_goal_build_ai
    Goal.News -> Res.string.onb_goal_news
}

private fun goalIcon(goal: Goal) = when (goal) {
    Goal.Learn -> DevHubIcons.Certification
    Goal.Job -> DevHubIcons.Jobs
    Goal.GetHelp -> DevHubIcons.Help
    Goal.Help -> DevHubIcons.People
    Goal.Project -> DevHubIcons.Folder
    Goal.BuildAi -> DevHubIcons.Sparkles
    Goal.News -> DevHubIcons.News
}

/**
 * Accueil de la première connexion, comme sur le web : Djeli pose une question par étape, une barre
 * de progression, des cartes à choisir. Il remplace l'écran du code de conduite, qui devient la
 * dernière étape. Rien n'est envoyé avant « C'est parti » ; un échec garde les réponses.
 */
@Composable
fun OnboardingScreen(
    state: AppState.NeedsConduct,
    onFinish: (OnboardingProfile) -> Unit,
    onSignOut: () -> Unit,
) {
    val me = state.me
    var step by rememberSaveable { mutableStateOf(0) }
    // Des chaînes plutôt que des enums : rememberSaveable doit pouvoir les restaurer sur Android comme sur iOS.
    var levelName by rememberSaveable { mutableStateOf<String?>(null) }
    var goalsCsv by rememberSaveable { mutableStateOf("") }
    var country by rememberSaveable { mutableStateOf(me.country) }
    var languagesCsv by rememberSaveable { mutableStateOf(me.languages.joinToString(",").ifEmpty { "fr" }) }
    val level = Level.entries.firstOrNull { it.name == levelName }
    val goals = goalsCsv.split(",").mapNotNull { n -> Goal.entries.firstOrNull { it.name == n } }.toSet()
    val languages = languagesCsv.split(",").filter { it == "fr" || it == "en" }.toSet()
    val goalTexts = Goal.entries.associateWith { stringResource(goalLabel(it)) }
    var mission by rememberSaveable { mutableStateOf(false) }
    var accepted by rememberSaveable { mutableStateOf(false) }

    val canContinue = when (step) {
        0 -> level != null
        1 -> goals.isNotEmpty()
        2 -> languages.isNotEmpty()
        else -> accepted && !state.busy
    }
    val progress = stringResource(Res.string.onb_progress, step + 1, STEPS)

    Box(Modifier.fillMaxSize().windowInsetsPadding(WindowInsets.safeDrawing), contentAlignment = Alignment.TopCenter) {
        Column(Modifier.widthIn(max = 560.dp).fillMaxSize()) {
            Row(
                Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                BrandLogo(height = 24.dp)
                StepBar(step + 1, STEPS, Modifier.weight(1f).semantics { contentDescription = progress })
            }
            Column(
                Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(horizontal = 20.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                when (step) {
                    0 -> LevelStep(level) { l ->
                        levelName = l.name
                        goalsCsv = goals.intersect(goalsFor(l).toSet()).joinToString(",") { it.name }
                    }
                    1 -> GoalsStep(level ?: Level.Beginner, goals) { g ->
                        goalsCsv = (if (g in goals) goals - g else goals + g).joinToString(",") { it.name }
                    }
                    2 -> WhereStep(me, country, languages, mission, level == Level.Senior, { country = it }, { languagesCsv = it.joinToString(",") }, { mission = it })
                    else -> PlanStep(me, goals, country, languages, accepted, state.failed) { accepted = it }
                }
            }
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
            Row(
                Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                TextButton(onClick = { if (step == 0) onSignOut() else step -= 1 }, enabled = !state.busy) {
                    if (step > 0) Icon(DevHubIcons.Back, contentDescription = null, modifier = Modifier.size(16.dp))
                    Text(
                        stringResource(if (step == 0) Res.string.sign_out else Res.string.onb_back),
                        modifier = Modifier.padding(start = if (step > 0) 6.dp else 0.dp),
                    )
                }
                Box(Modifier.weight(1f))
                PrimaryPill(
                    text = stringResource(if (step == STEPS - 1) Res.string.onb_go else Res.string.onb_continue),
                    onClick = {
                        if (step < STEPS - 1) step += 1
                        else onFinish(
                            OnboardingProfile(
                                country = country,
                                languages = languages.toList(),
                                lookingFor = goals.joinToString(", ") { goalTexts.getValue(it) }.take(200).ifEmpty { null },
                                mission = mission && level == Level.Senior,
                                start = startFor(goals),
                            ),
                        )
                    },
                    enabled = canContinue,
                    trailing = DevHubIcons.ChevronRight,
                )
            }
        }
    }
}

@Composable
private fun LevelStep(level: Level?, onPick: (Level) -> Unit) {
    DjeliBubble(Res.drawable.djeli_wave, stringResource(Res.string.onb_q_level), stringResource(Res.string.onb_h_level))
    Level.entries.forEach { l ->
        val (title, text, pose) = LevelCopy.getValue(l)
        ChoiceCard(level == l, { onPick(l) }, stringResource(title), text = stringResource(text), mascot = pose)
    }
}

@Composable
private fun GoalsStep(level: Level, goals: Set<Goal>, onToggle: (Goal) -> Unit) {
    DjeliBubble(Res.drawable.djeli_point, stringResource(Res.string.onb_q_goals), stringResource(Res.string.onb_h_goals))
    goalsFor(level).forEach { g ->
        ChoiceCard(g in goals, { onToggle(g) }, stringResource(goalLabel(g)), icon = goalIcon(g), check = true)
    }
}

@Composable
private fun WhereStep(
    me: Me,
    country: String?,
    languages: Set<String>,
    mission: Boolean,
    senior: Boolean,
    onCountry: (String?) -> Unit,
    onLanguages: (Set<String>) -> Unit,
    onMission: (Boolean) -> Unit,
) {
    var query by rememberSaveable { mutableStateOf("") }
    DjeliBubble(Res.drawable.djeli_wave, stringResource(Res.string.onb_q_where), stringResource(Res.string.onb_h_where))
    Text(stringResource(Res.string.onb_country), style = MaterialTheme.typography.titleSmall)
    OutlinedTextField(
        value = query,
        onValueChange = { query = it.take(40) },
        label = { Text(stringResource(Res.string.onb_country_search)) },
        leadingIcon = { Icon(DevHubIcons.Search, contentDescription = null, modifier = Modifier.size(18.dp)) },
        singleLine = true,
        modifier = Modifier.fillMaxWidth(),
    )
    val matches = searchCountries(query, me.uiLang).take(5)
    if (matches.isEmpty()) {
        Text(stringResource(Res.string.onb_country_none), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    } else {
        DevCard {
            matches.forEachIndexed { i, c: Country ->
                if (i > 0) RowDivider()
                CountryRow(c.name(me.uiLang), selected = country == c.code) { onCountry(if (country == c.code) null else c.code) }
            }
        }
    }
    if (country == null) {
        Text(stringResource(Res.string.onb_country_optional), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
    Text(stringResource(Res.string.onb_languages), style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(top = 8.dp))
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        listOf("fr" to Res.string.lang_fr, "en" to Res.string.lang_en).forEach { (code, label) ->
            ChoiceCard(
                code in languages,
                { onLanguages(if (code in languages) languages - code else languages + code) },
                stringResource(label),
                modifier = Modifier.weight(1f),
                check = true,
            )
        }
    }
    if (senior) {
        ChoiceCard(mission, { onMission(!mission) }, stringResource(Res.string.onb_mission), text = stringResource(Res.string.onb_mission_text), icon = DevHubIcons.Jobs, check = true)
    }
}

@Composable
private fun CountryRow(name: String, selected: Boolean, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().clickable(onClick = onClick).padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(name, style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f))
        if (selected) Icon(DevHubIcons.Check, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(18.dp))
    }
}

@Composable
private fun PlanStep(
    me: Me,
    goals: Set<Goal>,
    country: String?,
    languages: Set<String>,
    accepted: Boolean,
    failed: Boolean,
    onAccept: (Boolean) -> Unit,
) {
    DjeliBubble(Res.drawable.djeli_celebrate, stringResource(Res.string.onb_q_plan), stringResource(Res.string.onb_h_plan))
    val target = when (startFor(goals)) {
        StartTarget.Home -> Res.string.onb_plan_home
        StartTarget.Certifications -> Res.string.onb_plan_certs
        StartTarget.Jobs -> Res.string.onb_plan_jobs
        StartTarget.Sos -> Res.string.onb_plan_sos
    }
    val countryName = country?.let { code -> africa.devhub.onboarding.AfricanCountries.firstOrNull { it.code == code }?.name(me.uiLang) }
    val langs = languages.sorted().joinToString(" · ") { if (it == "en") "English" else "Français" }
    DevCard {
        NavRow(DevHubIcons.Sparkles, stringResource(Res.string.onb_plan_first, stringResource(target)), {}, chevron = false)
        if (countryName != null) {
            RowDivider()
            NavRow(DevHubIcons.MapPin, stringResource(Res.string.onb_plan_where, countryName), {}, chevron = false)
        }
        RowDivider()
        NavRow(DevHubIcons.Chat, stringResource(Res.string.onb_plan_langs, langs), {}, chevron = false)
    }
    DevCard {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(stringResource(Res.string.conduct_title), style = MaterialTheme.typography.titleSmall)
            listOf(Res.string.conduct_1, Res.string.conduct_2, Res.string.conduct_3, Res.string.conduct_4).forEach { rule ->
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(DevHubIcons.Check, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(top = 3.dp).size(16.dp))
                    Text(stringResource(rule), style = MaterialTheme.typography.bodyMedium)
                }
            }
        }
        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
        ChoiceCardlessCheck(accepted, onAccept)
    }
    if (failed) {
        Text(
            stringResource(Res.string.onb_failed),
            color = MaterialTheme.colorScheme.error,
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
        )
    }
}

@Composable
private fun ChoiceCardlessCheck(checked: Boolean, onChange: (Boolean) -> Unit) {
    Row(
        Modifier.fillMaxWidth().clickable { onChange(!checked) }.padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        androidx.compose.material3.Checkbox(checked = checked, onCheckedChange = null)
        Text(stringResource(Res.string.onb_accept), style = MaterialTheme.typography.titleSmall)
    }
}
