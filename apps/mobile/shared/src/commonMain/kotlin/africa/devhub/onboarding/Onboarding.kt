package africa.devhub.onboarding

/** Où en est la personne avec le code : adapte les objectifs proposés et la disponibilité. */
enum class Level { Curious, Beginner, Junior, Senior }

enum class Goal { Learn, Job, GetHelp, Help, Project, BuildAi, News }

/** Première page affichée une fois l'accueil terminé, choisie d'après les objectifs. */
enum class StartTarget { Home, Certifications, Jobs, Sos }

/** Les étapes de l'accueil : leur suite dépend du niveau, comme sur le web. */
enum class Step { Level, Goals, Course, Domains, Rhythm, Help, Where, Plan }

/** Un débutant choisit un cours et un rythme ; un dev confirmé dit comment il veut aider. */
fun flowFor(level: Level?): List<Step> = when (level) {
    Level.Curious, Level.Beginner -> listOf(Step.Level, Step.Goals, Step.Course, Step.Rhythm, Step.Where, Step.Plan)
    Level.Senior -> listOf(Step.Level, Step.Goals, Step.Domains, Step.Help, Step.Where, Step.Plan)
    else -> listOf(Step.Level, Step.Goals, Step.Domains, Step.Rhythm, Step.Where, Step.Plan)
}

fun Level?.isLearner() = this == Level.Curious || this == Level.Beginner
fun Level?.isExperienced() = this == Level.Junior || this == Level.Senior

enum class Domain { Web, Mobile, Backend, Data, Cloud, Ai }

/** Cours proposés aux débutants (mêmes cours que le web) ; [color] est la teinte de la pastille. */
enum class Course(val color: Long) {
    Web(0xFF2563EB), Python(0xFFCA8A04), Git(0xFFEA580C), Sql(0xFF0891B2), Mobile(0xFF7C3AED), Ia(0xFFDB2777),
}

/** Objectif du jour, en minutes. */
val RHYTHMS = listOf(5, 10, 20, 30)

/** Compétences à choisir au minimum (dev confirmé) et nombre que l'API retient. */
const val MIN_SKILLS = 3
const val MAX_SKILLS = 5

/** Disponibilité pour aider les autres : seul « maintenant » est une disponibilité côté API. */
enum class Availability { Now, Today, Busy }

/**
 * Ce que l'accueil envoie à l'API : pays, fuseau, langues, ce que la personne cherche, disponibilité,
 * compétences. [dailyGoal] est gardé sur l'appareil.
 */
data class OnboardingProfile(
    val country: String?,
    val timezone: String?,
    val languages: List<String>,
    val lookingFor: String?,
    val mission: Boolean,
    /** Null quand la personne n'a pas été interrogée (débutant) : la disponibilité reste ce qu'elle était. */
    val availableNow: Boolean?,
    val skillSlugs: List<String>,
    val dailyGoal: Int?,
    val start: StartTarget,
)

/** Les devs confirmés n'ont pas besoin d'« apprendre à coder » dans leur liste. */
fun goalsFor(level: Level): List<Goal> = if (level == Level.Senior) Goal.entries - Goal.Learn else Goal.entries

fun startFor(goals: Set<Goal>, learner: Boolean = false, hasDomains: Boolean = false): StartTarget = when {
    learner -> StartTarget.Certifications
    hasDomains && Goal.Learn in goals -> StartTarget.Certifications
    Goal.Job in goals -> StartTarget.Jobs
    Goal.GetHelp in goals || Goal.Help in goals -> StartTarget.Sos
    else -> StartTarget.Home
}
