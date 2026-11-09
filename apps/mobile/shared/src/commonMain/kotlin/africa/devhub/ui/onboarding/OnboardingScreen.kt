package africa.devhub.ui.onboarding

import africa.devhub.app.AppState
import africa.devhub.me.Me
import africa.devhub.onboarding.Availability
import africa.devhub.onboarding.Country
import africa.devhub.onboarding.Course
import africa.devhub.onboarding.Domain
import africa.devhub.onboarding.Goal
import africa.devhub.onboarding.Level
import africa.devhub.onboarding.MAX_SKILLS
import africa.devhub.onboarding.MIN_SKILLS
import africa.devhub.onboarding.OnboardingProfile
import africa.devhub.onboarding.RHYTHMS
import africa.devhub.onboarding.StartTarget
import africa.devhub.onboarding.Step
import africa.devhub.onboarding.flowFor
import africa.devhub.onboarding.goalsFor
import africa.devhub.onboarding.isExperienced
import africa.devhub.onboarding.isLearner
import africa.devhub.onboarding.searchCountries
import africa.devhub.onboarding.startFor
import africa.devhub.onboarding.timezoneOf
import africa.devhub.sos.TagOption
import africa.devhub.platform.deviceTimezone
import africa.devhub.platform.formatUtc
import africa.devhub.platform.utcOffsetMinutes
import africa.devhub.resources.*
import africa.devhub.ui.components.BrandLogo
import africa.devhub.ui.components.ChoiceCard
import africa.devhub.ui.components.DevCard
import africa.devhub.ui.components.DevHubIcons
import africa.devhub.ui.components.DjeliBubble
import africa.devhub.ui.components.FilterChip
import africa.devhub.ui.components.NavRow
import africa.devhub.ui.components.OutlinedTextField
import africa.devhub.ui.components.PrimaryPill
import africa.devhub.ui.components.RowDivider
import africa.devhub.ui.components.StepBar
import africa.devhub.ui.theme.successColor
import africa.devhub.ui.theme.warningColor
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.stringResource

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

private fun courseTitle(c: Course): StringResource = when (c) {
    Course.Web -> Res.string.onb_course_web
    Course.Python -> Res.string.onb_course_python
    Course.Git -> Res.string.onb_course_git
    Course.Sql -> Res.string.onb_course_sql
    Course.Mobile -> Res.string.onb_course_mobile
    Course.Ia -> Res.string.onb_course_ia
}

private fun courseText(c: Course): StringResource = when (c) {
    Course.Web -> Res.string.onb_course_web_t
    Course.Python -> Res.string.onb_course_python_t
    Course.Git -> Res.string.onb_course_git_t
    Course.Sql -> Res.string.onb_course_sql_t
    Course.Mobile -> Res.string.onb_course_mobile_t
    Course.Ia -> Res.string.onb_course_ia_t
}

private fun courseIcon(c: Course) = when (c) {
    Course.Web -> DevHubIcons.Globe
    Course.Python -> DevHubIcons.Terminal
    Course.Git -> DevHubIcons.GitBranch
    Course.Sql -> DevHubIcons.Database
    Course.Mobile -> DevHubIcons.Smartphone
    Course.Ia -> DevHubIcons.Sparkles
}

private fun domainTitle(d: Domain): StringResource = when (d) {
    Domain.Web -> Res.string.onb_domain_web
    Domain.Mobile -> Res.string.onb_domain_mobile
    Domain.Backend -> Res.string.onb_domain_backend
    Domain.Data -> Res.string.onb_domain_data
    Domain.Cloud -> Res.string.onb_domain_cloud
    Domain.Ai -> Res.string.onb_domain_ai
}

private fun domainIcon(d: Domain) = when (d) {
    Domain.Web -> DevHubIcons.Code
    Domain.Mobile -> DevHubIcons.Smartphone
    Domain.Backend -> DevHubIcons.Server
    Domain.Data -> DevHubIcons.Database
    Domain.Cloud -> DevHubIcons.Cloud
    Domain.Ai -> DevHubIcons.Sparkles
}

private fun rhythmTitle(min: Int): StringResource = when (min) {
    5 -> Res.string.onb_rhythm_5
    10 -> Res.string.onb_rhythm_10
    20 -> Res.string.onb_rhythm_20
    else -> Res.string.onb_rhythm_30
}

private fun csv(values: Collection<String>) = values.joinToString(",")
private fun split(csv: String) = csv.split(",").filter { it.isNotBlank() }

/**
 * Accueil de la première connexion, comme sur le web : Djeli pose une question par étape, une barre
 * de progression, des cartes à choisir. Les étapes suivent le niveau (cours et rythme pour un débutant,
 * domaines et compétences pour un dev). Le code de conduite est la dernière étape. Rien n'est envoyé avant
 * « C'est parti » ; un échec garde les réponses.
 */
@Composable
fun OnboardingScreen(
    state: AppState.NeedsConduct,
    loadTags: suspend () -> List<TagOption>,
    onFinish: (OnboardingProfile) -> Unit,
    onSignOut: () -> Unit,
) {
    val me = state.me
    var step by rememberSaveable { mutableStateOf(0) }
    // Des chaînes plutôt que des enums : rememberSaveable doit pouvoir les restaurer sur Android comme sur iOS.
    var levelName by rememberSaveable { mutableStateOf<String?>(null) }
    var goalsCsv by rememberSaveable { mutableStateOf("") }
    var courseName by rememberSaveable { mutableStateOf<String?>(null) }
    var domainsCsv by rememberSaveable { mutableStateOf("") }
    var skillsCsv by rememberSaveable { mutableStateOf("") }
    var rhythm by rememberSaveable { mutableStateOf(10) }
    var availName by rememberSaveable { mutableStateOf(Availability.Busy.name) }
    var country by rememberSaveable { mutableStateOf(me.country) }
    var languagesCsv by rememberSaveable { mutableStateOf(me.languages.joinToString(",").ifEmpty { "fr" }) }
    var mission by rememberSaveable { mutableStateOf(false) }
    var accepted by rememberSaveable { mutableStateOf(false) }

    val level = Level.entries.firstOrNull { it.name == levelName }
    val goals = split(goalsCsv).mapNotNull { n -> Goal.entries.firstOrNull { it.name == n } }.toSet()
    val course = Course.entries.firstOrNull { it.name == courseName }
    val domains = split(domainsCsv).mapNotNull { n -> Domain.entries.firstOrNull { it.name == n } }.toSet()
    val skills = split(skillsCsv)
    val languages = split(languagesCsv).filter { it == "fr" || it == "en" }.toSet()
    val availability = Availability.entries.firstOrNull { it.name == availName } ?: Availability.Busy
    val goalTexts = Goal.entries.associateWith { stringResource(goalLabel(it)) }
    val learner = level.isLearner()
    val experienced = level.isExperienced()

    // La liste des compétences vient de l'API ; vide si elle n'a pas pu être chargée (l'étape ne bloque alors pas).
    var tags by remember { mutableStateOf<List<TagOption>?>(null) }
    LaunchedEffect(Unit) { tags = runCatching { loadTags() }.getOrDefault(emptyList()) }

    val flow = flowFor(level)
    val last = flow.lastIndex
    val current = flow[step.coerceIn(0, last)]
    val canContinue = when (current) {
        Step.Level -> level != null
        Step.Goals -> goals.isNotEmpty()
        Step.Course -> course != null
        Step.Domains -> domains.isNotEmpty() && (!experienced || skills.size >= MIN_SKILLS || tags?.isEmpty() == true)
        Step.Rhythm, Step.Help -> true
        Step.Where -> country != null && languages.isNotEmpty()
        Step.Plan -> accepted && !state.busy
    }
    val progress = stringResource(Res.string.onb_progress, step + 1, flow.size)

    Box(Modifier.fillMaxSize().windowInsetsPadding(WindowInsets.safeDrawing), contentAlignment = Alignment.TopCenter) {
        Column(Modifier.widthIn(max = 560.dp).fillMaxSize()) {
            Row(
                Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                BrandLogo(height = 24.dp)
                StepBar(step + 1, flow.size, Modifier.weight(1f).semantics { contentDescription = progress })
            }
            Column(
                Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(horizontal = 20.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                when (current) {
                    Step.Level -> LevelStep(level) { l ->
                        levelName = l.name
                        goalsCsv = csv(goals.intersect(goalsFor(l).toSet()).map { it.name })
                    }
                    Step.Goals -> GoalsStep(level ?: Level.Beginner, goals) { g ->
                        goalsCsv = csv((if (g in goals) goals - g else goals + g).map { it.name })
                    }
                    Step.Course -> CourseStep(course) { courseName = it.name }
                    Step.Domains -> DomainsStep(
                        domains, skills, tags, experienced,
                        onDomain = { d -> domainsCsv = csv((if (d in domains) domains - d else domains + d).map { it.name }) },
                        onSkill = { slug ->
                            skillsCsv = csv(if (slug in skills) skills - slug else if (skills.size < MAX_SKILLS) skills + slug else skills)
                        },
                    )
                    Step.Rhythm -> {
                        RhythmStep(rhythm) { rhythm = it }
                        if (experienced) AvailabilityBlock(availability, mission, heading = true, { availName = it.name }, { mission = it })
                    }
                    Step.Help -> AvailabilityBlock(availability, mission, heading = false, { availName = it.name }, { mission = it })
                    Step.Where -> WhereStep(me, country, languages, { country = it }, { languagesCsv = csv(it) })
                    Step.Plan -> PlanStep(me, goals, learner, course, rhythm, experienced, domains.isNotEmpty(), country, languages, accepted, state.failed) { accepted = it }
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
                    text = stringResource(if (step >= last) Res.string.onb_go else Res.string.onb_continue),
                    onClick = {
                        if (step < last) step += 1
                        else {
                            val zone = timezoneOf(country) ?: deviceTimezone()
                            onFinish(
                                OnboardingProfile(
                                    country = country,
                                    timezone = zone,
                                    languages = languages.toList(),
                                    lookingFor = goals.joinToString(", ") { goalTexts.getValue(it) }.take(200).ifEmpty { null },
                                    mission = mission && experienced,
                                    availableNow = if (experienced) availability == Availability.Now else null,
                                    skillSlugs = if (experienced) skills.take(MAX_SKILLS) else emptyList(),
                                    dailyGoal = if (Step.Rhythm in flow) rhythm else null,
                                    start = startFor(goals, learner, domains.isNotEmpty()),
                                ),
                            )
                        }
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

/** Pastille colorée d'un cours, comme celle du web. */
@Composable
private fun CourseBadge(course: Course) {
    Box(
        Modifier.size(44.dp).clip(RoundedCornerShape(12.dp)).background(Color(course.color)),
        contentAlignment = Alignment.Center,
    ) { Icon(courseIcon(course), contentDescription = null, tint = Color.White, modifier = Modifier.size(22.dp)) }
}

@Composable
private fun CourseStep(selected: Course?, onPick: (Course) -> Unit) {
    DjeliBubble(Res.drawable.djeli_book, stringResource(Res.string.onb_q_course), stringResource(Res.string.onb_h_course))
    Course.entries.forEach { c ->
        ChoiceCard(
            selected == c, { onPick(c) }, stringResource(courseTitle(c)),
            text = stringResource(courseText(c)),
            leading = { CourseBadge(c) },
        )
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun DomainsStep(
    domains: Set<Domain>,
    skills: List<String>,
    tags: List<TagOption>?,
    experienced: Boolean,
    onDomain: (Domain) -> Unit,
    onSkill: (String) -> Unit,
) {
    var filter by rememberSaveable { mutableStateOf("") }
    DjeliBubble(Res.drawable.djeli_laptop, stringResource(Res.string.onb_q_domains), stringResource(Res.string.onb_h_domains))
    Domain.entries.chunked(2).forEach { pair ->
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            pair.forEach { d ->
                ChoiceCard(
                    d in domains, { onDomain(d) }, stringResource(domainTitle(d)),
                    modifier = Modifier.weight(1f), icon = domainIcon(d), check = true,
                )
            }
        }
    }
    if (!experienced) return
    Text(stringResource(Res.string.onb_skills), style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(top = 8.dp))
    Text(stringResource(Res.string.onb_skills_hint), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    OutlinedTextField(
        value = filter,
        onValueChange = { filter = it.take(40) },
        label = { Text(stringResource(Res.string.onb_skills_search)) },
        leadingIcon = { Icon(DevHubIcons.Search, contentDescription = null, modifier = Modifier.size(18.dp)) },
        singleLine = true,
        modifier = Modifier.fillMaxWidth(),
    )
    val shown = (tags ?: emptyList()).filter { t ->
        filter.isBlank() || t.label.contains(filter.trim(), ignoreCase = true) || t.slug.contains(filter.trim(), ignoreCase = true)
    }
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        shown.forEach { t ->
            FilterChip(selected = t.slug in skills, onClick = { onSkill(t.slug) }, label = { Text(t.label) })
        }
    }
    val enough = skills.size >= MIN_SKILLS
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        if (enough) Icon(DevHubIcons.Check, contentDescription = null, tint = successColor, modifier = Modifier.size(16.dp))
        Text(
            stringResource(Res.string.onb_skills_count, skills.size),
            style = MaterialTheme.typography.bodySmall,
            color = if (enough) successColor else MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun RhythmStep(rhythm: Int, onPick: (Int) -> Unit) {
    DjeliBubble(Res.drawable.djeli_trophy, stringResource(Res.string.onb_q_rhythm), stringResource(Res.string.onb_h_rhythm))
    RHYTHMS.forEach { min ->
        ChoiceCard(
            rhythm == min, { onPick(min) }, stringResource(rhythmTitle(min)),
            text = stringResource(Res.string.onb_rhythm_t, min),
            leading = {
                Text(min.toString(), style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center, modifier = Modifier.width(44.dp))
            },
        )
    }
}

/** Disponibilité pour aider, et ouverture aux missions : demandées aux devs seulement. */
@Composable
private fun AvailabilityBlock(
    availability: Availability,
    mission: Boolean,
    heading: Boolean,
    onAvailability: (Availability) -> Unit,
    onMission: (Boolean) -> Unit,
) {
    if (!heading) DjeliBubble(Res.drawable.djeli_laptop, stringResource(Res.string.onb_q_help), stringResource(Res.string.onb_h_help))
    else Text(stringResource(Res.string.onb_help_others), style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(top = 8.dp))
    val options = listOf(
        Triple(Availability.Now, Res.string.onb_avail_now, successColor),
        Triple(Availability.Today, Res.string.onb_avail_today, warningColor),
        Triple(Availability.Busy, Res.string.onb_avail_busy, MaterialTheme.colorScheme.outline),
    )
    options.forEach { (a, label, dot) ->
        ChoiceCard(
            availability == a, { onAvailability(a) }, stringResource(label),
            leading = { Box(Modifier.size(10.dp).background(dot, CircleShape)) },
        )
    }
    ChoiceCard(
        mission, { onMission(!mission) }, stringResource(Res.string.onb_mission_paid),
        text = stringResource(Res.string.onb_mission_paid_t), icon = DevHubIcons.Jobs, check = true,
    )
}

@Composable
private fun WhereStep(
    me: Me,
    country: String?,
    languages: Set<String>,
    onCountry: (String?) -> Unit,
    onLanguages: (Set<String>) -> Unit,
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
    val picked = country?.let { code -> africa.devhub.onboarding.AfricanCountries.firstOrNull { it.code == code }?.name(me.uiLang) }
    if (picked != null) {
        Text(stringResource(Res.string.onb_country_picked, picked), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.primary)
        val zone = timezoneOf(country) ?: deviceTimezone()
        Text(
            stringResource(Res.string.onb_timezone, zone, utcOffsetMinutes(zone)?.let { formatUtc(it) } ?: "UTC"),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
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
    learner: Boolean,
    course: Course?,
    rhythm: Int,
    experienced: Boolean,
    hasDomains: Boolean,
    country: String?,
    languages: Set<String>,
    accepted: Boolean,
    failed: Boolean,
    onAccept: (Boolean) -> Unit,
) {
    DjeliBubble(Res.drawable.djeli_celebrate, stringResource(Res.string.onb_q_plan), stringResource(Res.string.onb_h_plan))
    val target = when (startFor(goals, learner, hasDomains)) {
        StartTarget.Home -> Res.string.onb_plan_home
        StartTarget.Certifications -> Res.string.onb_plan_certs
        StartTarget.Jobs -> Res.string.onb_plan_jobs
        StartTarget.Sos -> Res.string.onb_plan_sos
    }
    val countryName = country?.let { code -> africa.devhub.onboarding.AfricanCountries.firstOrNull { it.code == code }?.name(me.uiLang) }
    val langs = languages.sorted().joinToString(" · ") { if (it == "en") "English" else "Français" }
    DevCard {
        if (learner && course != null) {
            NavRow(courseIcon(course), stringResource(Res.string.onb_plan_course, stringResource(courseTitle(course))), {}, chevron = false, detail = stringResource(Res.string.onb_plan_course_t, rhythm))
            RowDivider()
        }
        NavRow(DevHubIcons.Sparkles, stringResource(Res.string.onb_plan_first, stringResource(target)), {}, chevron = false)
        if (experienced && Goal.Help in goals) {
            RowDivider()
            NavRow(DevHubIcons.People, stringResource(Res.string.onb_plan_skills), {}, chevron = false, detail = stringResource(Res.string.onb_plan_skills_t))
        }
        if (Goal.Job in goals) {
            RowDivider()
            NavRow(DevHubIcons.Jobs, stringResource(Res.string.onb_plan_jobs_t), {}, chevron = false, detail = stringResource(Res.string.onb_plan_jobs_d))
        }
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
