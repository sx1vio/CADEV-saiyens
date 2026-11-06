package africa.devhub.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// Couleurs reprises des jetons du web (apps/web/src/styles/globals.css), pour une marque unique.
private val Light = lightColorScheme(
    primary = Color(0xFF1D4ED8),
    onPrimary = Color.White,
    primaryContainer = Color(0x141D4ED8),
    onPrimaryContainer = Color(0xFF1D4ED8),
    background = Color(0xFFEBEDEF),
    onBackground = Color(0xFF060607),
    surface = Color.White,
    onSurface = Color(0xFF060607),
    surfaceVariant = Color(0xFFE3E5E8),
    onSurfaceVariant = Color(0xFF4E5058),
    outline = Color(0xFFE1E2E4),
    error = Color(0xFFC62828),
    onError = Color.White,
)

private val Dark = darkColorScheme(
    primary = Color(0xFF2563EB),
    onPrimary = Color.White,
    primaryContainer = Color(0x1F608CFF),
    onPrimaryContainer = Color(0xFF8FB3FF),
    background = Color(0xFF2B2D31),
    onBackground = Color(0xFFF2F3F5),
    surface = Color(0xFF383A40),
    onSurface = Color(0xFFF2F3F5),
    surfaceVariant = Color(0xFF404249),
    onSurfaceVariant = Color(0xFFB5BAC1),
    outline = Color(0xFF3F4147),
    error = Color(0xFFEF6B6F),
    onError = Color(0xFF060607),
)

/** Couleur des signaux positifs (confiance vérifiée), absente du schéma Material. */
val successColor: Color
    @Composable get() = if (isSystemInDarkTheme()) Color(0xFF4CC38A) else Color(0xFF166534)

@Composable
fun DevHubTheme(darkTheme: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = if (darkTheme) Dark else Light, content = content)
}
