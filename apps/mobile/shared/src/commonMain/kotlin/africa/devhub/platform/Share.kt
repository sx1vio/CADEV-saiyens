package africa.devhub.platform

import androidx.compose.runtime.Composable

/**
 * Ouvre la feuille de partage du système (Android : sélecteur d'applications ; iOS : feuille de
 * partage) avec [text]. Le système propose lui-même « Copier » parmi ses actions.
 */
@Composable
expect fun rememberShareText(): (text: String) -> Unit
