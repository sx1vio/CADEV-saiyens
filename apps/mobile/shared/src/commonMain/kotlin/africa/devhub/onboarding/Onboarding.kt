package africa.devhub.onboarding

/**
 * Où en est la personne avec le code (parcours du web du 09/11/2026) ; [Unset] : « Ne pas
 * préciser », toujours possible (demande de Sylvio, 10/11/2026).
 */
enum class Level { Beginner, Junior, Senior, Unset }

/** Les objectifs du web, dans son ordre : chacun mène à un espace réel de la plateforme. */
enum class Goal { GetHelp, Help, Job, Certify, Project, Ship, News }

/** Première page affichée une fois l'accueil terminé, choisie d'après les objectifs. */
enum class StartTarget { Home, Certifications, Jobs, Sos, Projects, Preflight }

/** Les étapes de l'accueil ; [Domains] correspond aux centres d'intérêt du web. */
enum class Step { Level, Goals, Course, Domains, Help, Where, Plan }

/**
 * Comme le web : un débutant choisit un cours ; un dev qui a déjà des projets renseigne ses
 * compétences et dit comment il veut aider ; sans niveau précisé, ni cours ni disponibilité.
 */
fun flowFor(level: Level?): List<Step> = when (level) {
    Level.Beginner -> listOf(Step.Level, Step.Goals, Step.Course, Step.Domains, Step.Where, Step.Plan)
    Level.Unset -> listOf(Step.Level, Step.Goals, Step.Domains, Step.Where, Step.Plan)
    else -> listOf(Step.Level, Step.Goals, Step.Domains, Step.Help, Step.Where, Step.Plan)
}

fun Level?.isLearner() = this == Level.Beginner
fun Level?.isExperienced() = this == Level.Junior || this == Level.Senior

enum class Domain { Web, Mobile, Backend, Data, Cloud, Ai }

/** Cours proposés aux débutants (mêmes cours que le web) ; [color] est la teinte de la pastille. */
enum class Course(val color: Long) {
    Web(0xFF2563EB), Python(0xFFCA8A04), Git(0xFFEA580C), Sql(0xFF0891B2), Mobile(0xFF7C3AED), Ia(0xFFDB2777),
}

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

/** Mêmes objectifs pour tous les niveaux, comme sur le web. */
@Suppress("UNUSED_PARAMETER")
fun goalsFor(level: Level): List<Goal> = Goal.entries

/**
 * Première page, comme le web : le cours d'un débutant, sinon l'espace du premier objectif dans
 * l'ordre de la liste (questions, emplois, certifications, projets, pré-vol, actualité).
 */
fun startFor(goals: Set<Goal>, learnerWithCourse: Boolean = false): StartTarget {
    if (learnerWithCourse) return StartTarget.Certifications
    return when (Goal.entries.firstOrNull { it in goals }) {
        Goal.GetHelp, Goal.Help -> StartTarget.Sos
        Goal.Job -> StartTarget.Jobs
        Goal.Certify -> StartTarget.Certifications
        Goal.Project -> StartTarget.Projects
        Goal.Ship -> StartTarget.Preflight
        Goal.News, null -> StartTarget.Home
    }
}
