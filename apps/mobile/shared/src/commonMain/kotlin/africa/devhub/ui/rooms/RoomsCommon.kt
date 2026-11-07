package africa.devhub.ui.rooms

import africa.devhub.resources.Res
import africa.devhub.resources.level_easy
import africa.devhub.resources.level_first_step
import africa.devhub.resources.level_hard
import africa.devhub.resources.level_medium
import africa.devhub.resources.room_state_idea
import africa.devhub.resources.room_state_in_progress
import africa.devhub.resources.room_state_looking_for_help
import africa.devhub.resources.room_state_shipped
import africa.devhub.resources.task_done
import africa.devhub.resources.task_in_review
import africa.devhub.resources.task_open
import africa.devhub.resources.task_taken
import org.jetbrains.compose.resources.StringResource

val ROOM_STATES = listOf("idea", "in_progress", "looking_for_help", "shipped")
val TASK_LEVELS = listOf("first_step", "easy", "medium", "hard")
val TASK_STATUSES = listOf("open", "taken", "in_review", "done")

fun roomStateLabel(state: String): StringResource = when (state) {
    "idea" -> Res.string.room_state_idea
    "looking_for_help" -> Res.string.room_state_looking_for_help
    "shipped" -> Res.string.room_state_shipped
    else -> Res.string.room_state_in_progress
}

fun levelLabel(level: String): StringResource = when (level) {
    "first_step" -> Res.string.level_first_step
    "easy" -> Res.string.level_easy
    "hard" -> Res.string.level_hard
    else -> Res.string.level_medium
}

fun taskStatusLabel(status: String): StringResource = when (status) {
    "taken" -> Res.string.task_taken
    "in_review" -> Res.string.task_in_review
    "done" -> Res.string.task_done
    else -> Res.string.task_open
}
