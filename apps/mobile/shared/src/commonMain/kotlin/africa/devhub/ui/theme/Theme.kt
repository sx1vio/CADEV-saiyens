package africa.devhub.ui.theme

import africa.devhub.resources.Res
import africa.devhub.resources.poppins_medium
import africa.devhub.resources.poppins_regular
import africa.devhub.resources.poppins_semibold
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.jetbrains.compose.resources.Font

// Jetons du web v3 (apps/web/src/styles/globals.css) : fond gris, cartes blanches, bordures fines,
// aucune teinte tonale Material. Une seule marque sur le web et sur mobile.
private val Light = lightColorScheme(
    primary = Color(0xFF1D4ED8),
    onPrimary = Color.White,
    primaryContainer = Color(0x141D4ED8),
    onPrimaryContainer = Color(0xFF1D4ED8),
    secondaryContainer = Color(0xFFEBEDEF),
    onSecondaryContainer = Color(0xFF060607),
    background = Color(0xFFF2F3F5),
    onBackground = Color(0xFF060607),
    surface = Color.White,
    onSurface = Color(0xFF060607),
    surfaceVariant = Color(0xFFEBEDEF),
    onSurfaceVariant = Color(0xFF4E5058),
    surfaceTint = Color.Transparent,
    surfaceContainerLowest = Color.White,
    surfaceContainerLow = Color.White,
    surfaceContainer = Color.White,
    surfaceContainerHigh = Color(0xFFEBEDEF),
    surfaceContainerHighest = Color(0xFFE3E5E8),
    outline = Color(0xFFC4C9CE),
    outlineVariant = Color(0xFFE1E2E4),
    error = Color(0xFFC62828),
    onError = Color.White,
    errorContainer = Color(0x1AC62828),
    onErrorContainer = Color(0xFFC62828),
)

private val Dark = darkColorScheme(
    primary = Color(0xFF2563EB),
    onPrimary = Color.White,
    primaryContainer = Color(0x1F608CFF),
    onPrimaryContainer = Color(0xFF8FB3FF),
    secondaryContainer = Color(0xFF383A40),
    onSecondaryContainer = Color(0xFFF2F3F5),
    background = Color(0xFF313338),
    onBackground = Color(0xFFF2F3F5),
    surface = Color(0xFF2B2D31),
    onSurface = Color(0xFFF2F3F5),
    surfaceVariant = Color(0xFF383A40),
    onSurfaceVariant = Color(0xFFB5BAC1),
    surfaceTint = Color.Transparent,
    surfaceContainerLowest = Color(0xFF232428),
    surfaceContainerLow = Color(0xFF2B2D31),
    surfaceContainer = Color(0xFF2B2D31),
    surfaceContainerHigh = Color(0xFF383A40),
    surfaceContainerHighest = Color(0xFF404249),
    outline = Color(0xFF4E5058),
    outlineVariant = Color(0xFF3F4147),
    error = Color(0xFFEF6B6F),
    onError = Color(0xFF060607),
    errorContainer = Color(0x26EF6B6F),
    onErrorContainer = Color(0xFFEF6B6F),
)

/** Rayons du web : 8 (contrôles), 10 (cartes), 12 (feuilles). */
private val DevHubShapes = Shapes(
    extraSmall = RoundedCornerShape(6.dp),
    small = RoundedCornerShape(8.dp),
    medium = RoundedCornerShape(10.dp),
    large = RoundedCornerShape(12.dp),
    extraLarge = RoundedCornerShape(16.dp),
)

@Composable
private fun devHubTypography(): Typography {
    val poppins = FontFamily(
        Font(Res.font.poppins_regular, FontWeight.Normal),
        Font(Res.font.poppins_medium, FontWeight.Medium),
        Font(Res.font.poppins_semibold, FontWeight.SemiBold),
    )
    return remember(poppins) {
        fun style(size: Int, line: Int, weight: FontWeight) =
            TextStyle(fontFamily = poppins, fontSize = size.sp, lineHeight = line.sp, fontWeight = weight)
        Typography(
            headlineMedium = style(26, 34, FontWeight.SemiBold),
            headlineSmall = style(22, 30, FontWeight.SemiBold),
            titleLarge = style(20, 28, FontWeight.SemiBold),
            titleMedium = style(16, 22, FontWeight.Medium),
            titleSmall = style(14, 20, FontWeight.Medium),
            bodyLarge = style(15, 23, FontWeight.Normal),
            bodyMedium = style(14, 21, FontWeight.Normal),
            bodySmall = style(12, 17, FontWeight.Normal),
            labelLarge = style(14, 20, FontWeight.Medium),
            labelMedium = style(12, 16, FontWeight.Medium),
            labelSmall = style(11, 15, FontWeight.Medium),
        )
    }
}

/** Couleur des signaux positifs (confiance vérifiée), absente du schéma Material. */
val successColor: Color
    @Composable get() = if (isSystemInDarkTheme()) Color(0xFF4CC38A) else Color(0xFF166534)

/** Couleur des avertissements (retard, hors ligne). */
val warningColor: Color
    @Composable get() = if (isSystemInDarkTheme()) Color(0xFFF0B35A) else Color(0xFFB45309)

@Composable
fun DevHubTheme(darkTheme: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (darkTheme) Dark else Light,
        shapes = DevHubShapes,
        typography = devHubTypography(),
        content = content,
    )
}

/** Les cinq pastels d'avatar du web (lavande, ciel, rose, ambre, menthe) et leur texte. */
@Composable
fun avatarTone(seed: String): Pair<Color, Color> {
    val dark = isSystemInDarkTheme()
    val tones = if (dark) {
        listOf(0xFF1C2133, 0xFF1B2530, 0xFF2A2026, 0xFF2B261C, 0xFF1A2A22)
    } else {
        listOf(0xFFEBEEF8, 0xFFEAF1F7, 0xFFF6ECEF, 0xFFF6F0E3, 0xFFE8F3EC)
    }
    var h = 0L
    for (c in seed) h = (h * 31 + c.code) and 0xFFFFFFFFL
    return Color(tones[(h % tones.size).toInt()]) to (if (dark) Color(0xFFEEF0F5) else Color(0xFF111827))
}

/**
 * Fond du web : le gris de la page avec trois reflets doux (indigo en haut à droite, bleu ciel à
 * droite, rose en bas), fixes derrière le contenu. Valeurs de `--page-tint-*` de globals.css.
 */
@Composable
fun Modifier.pageTint(): Modifier {
    val dark = isSystemInDarkTheme()
    val indigo = Color(0xFF5865F2).copy(alpha = if (dark) 0.14f else 0.10f)
    val sky = Color(0xFF0EA5E9).copy(alpha = 0.08f)
    val pink = Color(0xFFEC4899).copy(alpha = if (dark) 0.06f else 0.05f)
    return drawBehind {
        val w = size.width
        val h = size.height
        drawRect(Brush.radialGradient(listOf(indigo, Color.Transparent), center = Offset(w * 0.72f, -h * 0.04f), radius = w * 1.1f))
        drawRect(Brush.radialGradient(listOf(sky, Color.Transparent), center = Offset(w * 1.08f, h * 0.30f), radius = w * 0.9f))
        drawRect(Brush.radialGradient(listOf(pink, Color.Transparent), center = Offset(w * 0.70f, h * 1.02f), radius = w * 1.1f))
    }
}

/**
 * Verre du web (`--glass-*`) : surfaces translucides qui laissent voir les reflets du fond.
 * Le flou d'arrière-plan du web n'existe pas en Compose multiplateforme : on garde la
 * translucidité, le liseré clair et le filet de lumière en haut, qui font l'essentiel de l'effet.
 */
object Glass {
    /** Carte (`--glass-bg`). */
    val panel: Color @Composable get() = if (isSystemInDarkTheme()) Color(0xFF2B2D31).copy(alpha = 0.62f) else Color.White.copy(alpha = 0.68f)

    /** Contrôles posés sur une carte : pilules, puces, champs (`--glass-strong`). */
    val strong: Color @Composable get() = if (isSystemInDarkTheme()) Color(0xFF2B2D31).copy(alpha = 0.82f) else Color.White.copy(alpha = 0.82f)

    /** Filet de lumière du haut (`--glass-sheen`). */
    val sheen: Color @Composable get() = if (isSystemInDarkTheme()) Color.White.copy(alpha = 0.06f) else Color.White.copy(alpha = 0.9f)
}

/** Filet de lumière d'1 dp en haut d'une surface, retiré des angles arrondis (`inset 0 1px 0`). */
fun Modifier.topSheen(color: Color, inset: androidx.compose.ui.unit.Dp = 12.dp): Modifier = drawBehind {
    val y = 0.5.dp.toPx()
    drawLine(color, Offset(inset.toPx(), y), Offset(size.width - inset.toPx(), y), strokeWidth = 1.dp.toPx())
}
