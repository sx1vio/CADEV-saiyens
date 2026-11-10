package africa.devhub.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Matrix
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Fill
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.unit.dp

private const val OUTER = "M50 3 92 25v42c0 21-17 34-42 40C25 101 8 88 8 67V25Z"
private const val INNER = "M50 14 82 31v35c0 15-12 25-32 30-20-5-32-15-32-30V31Z"

/** Abréviation de la techno dans l'écu (« JavaScript » → « JS »). */
private fun monogram(logo: String): String = when (logo) {
    "JavaScript" -> "JS"
    "TypeScript" -> "TS"
    "Python" -> "Py"
    "" -> ""
    else -> if (logo.length <= 4) logo else logo.take(2)
}

/** Écu de certification du web (`CertBadge`) : fond sombre, liseré dégradé à la couleur de la certification. */
@Composable
fun CertBadge(color: Long, logo: String, size: Dp, modifier: Modifier = Modifier) {
    val tone = Color(color)
    val outer = remember { PathParser().parsePathString(OUTER).toPath() }
    val inner = remember { PathParser().parsePathString(INNER).toPath() }
    Box(modifier.width(size).height(size * 1.1f), contentAlignment = Alignment.Center) {
        Canvas(Modifier.size(width = size, height = size * 1.1f)) {
            val scale = this.size.width / 100f
            fun scaled(p: Path): Path = Path().apply { addPath(p); transform(Matrix().apply { scale(scale, scale) }) }
            drawPath(scaled(outer), Color(0xFF14161C), style = Fill)
            drawPath(
                scaled(outer),
                Brush.verticalGradient(listOf(tone.copy(alpha = 0.95f), tone.copy(alpha = 0.55f)), startY = 0f, endY = this.size.height),
                style = Stroke(width = 5f * scale),
            )
            drawPath(scaled(inner), tone.copy(alpha = 0.12f), style = Fill)
        }
        Text(
            monogram(logo),
            style = TextStyle(fontSize = (size.value * 0.27f).sp, fontWeight = FontWeight.Bold, color = Color.White),
        )
    }
}

/** Pastille du niveau : vert, bleu, ambre ou rouge selon la difficulté, comme `LevelPill` du web. */
@Composable
fun LevelPill(label: String, tone: Color, modifier: Modifier = Modifier) {
    Box(
        modifier.height(20.dp).background(tone.copy(alpha = 0.15f), CircleShape),
        contentAlignment = Alignment.Center,
    ) {
        Text(label, style = MaterialTheme.typography.labelSmall, color = tone, modifier = Modifier.padding(horizontal = 8.dp))
    }
}
