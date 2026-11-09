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
import africa.devhub.ui.components.Badge
import africa.devhub.ui.theme.avatarTone
import africa.devhub.ui.theme.successColor
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.Column
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import org.jetbrains.compose.resources.stringResource
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
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

/** Monogramme coloré d'une salle (`RoomMark` du web) : deux lettres sur un pastel choisi par le nom. */
@Composable
fun RoomMark(name: String, size: Dp, modifier: Modifier = Modifier) {
    val (bg, fg) = avatarTone(name)
    Box(modifier.size(size).clip(RoundedCornerShape(30)).background(bg), contentAlignment = Alignment.Center) {
        Text(name.take(2), color = fg, style = MaterialTheme.typography.titleMedium, fontSize = (size.value * 0.4f).sp)
    }
}

/**
 * Logo d'une entreprise ou d'un projet : l'image (lue par le proxy du serveur) sur fond blanc, ou le
 * monogramme tant qu'elle manque, charge mal ou n'existe pas.
 */
@Composable
fun RemoteLogo(url: String?, name: String, size: Dp, modifier: Modifier = Modifier) {
    var failed by androidx.compose.runtime.remember(url) { androidx.compose.runtime.mutableStateOf(false) }
    if (url.isNullOrBlank() || failed) {
        RoomMark(name, size, modifier)
    } else {
        Box(
            modifier.size(size).clip(RoundedCornerShape(8.dp)).background(Color.White).border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(8.dp)),
            contentAlignment = Alignment.Center,
        ) {
            africa.devhub.ui.components.RemoteImage(
                url = url,
                width = (size.value * 3).toInt(),
                modifier = Modifier.matchParentSize().padding(4.dp),
                contentScale = androidx.compose.ui.layout.ContentScale.Fit,
                onFailed = { failed = true },
            )
        }
    }
}

/** Teintes d'état des salles (`STATE_TONE` du web : ambre, ciel, menthe, bleu de la marque). */
@Composable
fun stateTone(state: String): Color = when (state) {
    "idea" -> Color(0xFFB45309)
    "looking_for_help" -> Color(0xFF0369A1)
    "shipped" -> successColor
    else -> MaterialTheme.colorScheme.primary
}

/**
 * Tête d'une salle, commune à la carte de la liste et à la fiche : bandeau qui s'estompe vers la
 * carte avec l'état, monogramme qui déborde dessus, puis le nom.
 */
@Composable
fun RoomHead(name: String, state: String, asHeading: Boolean = false) {
    val scheme = MaterialTheme.colorScheme
    Box(Modifier.fillMaxWidth().height(112.dp).background(if (isSystemInDarkTheme()) Color(0xFFEEF0F5).copy(alpha = 0.7f) else Color(0xFF111827).copy(alpha = 0.7f))) {
        Box(Modifier.matchParentSize().background(Brush.verticalGradient(0.4f to Color.Transparent, 1f to scheme.surface)))
        // Le badge est posé sur un fond plein : sa teinte à 10 % seule ne se lirait pas sur le bandeau.
        Box(Modifier.align(Alignment.TopEnd).padding(12.dp).background(scheme.surface, RoundedCornerShape(4.dp))) {
            Badge(stringResource(roomStateLabel(state)), stateTone(state))
        }
        Box(
            Modifier.align(Alignment.BottomStart).offset(x = 16.dp, y = 30.dp).size(60.dp).background(scheme.surface, RoundedCornerShape(30)),
            contentAlignment = Alignment.Center,
        ) { RoomMark(name, 52.dp) }
    }
    Text(
        name,
        style = MaterialTheme.typography.titleMedium,
        maxLines = if (asHeading) 3 else 1,
        overflow = TextOverflow.Ellipsis,
        modifier = Modifier.fillMaxWidth().padding(start = 88.dp, end = 16.dp, top = 6.dp).then(if (asHeading) Modifier.semantics { heading() } else Modifier),
    )
}
