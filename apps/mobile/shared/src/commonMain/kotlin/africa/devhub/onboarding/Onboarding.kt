package africa.devhub.onboarding

/** Où en est la personne avec le code : adapte les objectifs proposés et la disponibilité. */
enum class Level { Curious, Beginner, Junior, Senior }

enum class Goal { Learn, Job, GetHelp, Help, Project, BuildAi, News }

/** Première page affichée une fois l'accueil terminé, choisie d'après les objectifs. */
enum class StartTarget { Home, Certifications, Jobs, Sos }

/** Ce que l'accueil envoie à l'API : pays, langues, ce que la personne cherche, disponibilité. */
data class OnboardingProfile(
    val country: String?,
    val languages: List<String>,
    val lookingFor: String?,
    val mission: Boolean,
    val start: StartTarget,
)

/** Les devs confirmés n'ont pas besoin d'« apprendre à coder » dans leur liste. */
fun goalsFor(level: Level): List<Goal> = if (level == Level.Senior) Goal.entries - Goal.Learn else Goal.entries

fun startFor(goals: Set<Goal>): StartTarget = when {
    Goal.Job in goals -> StartTarget.Jobs
    Goal.Learn in goals -> StartTarget.Certifications
    Goal.GetHelp in goals || Goal.Help in goals -> StartTarget.Sos
    else -> StartTarget.Home
}
