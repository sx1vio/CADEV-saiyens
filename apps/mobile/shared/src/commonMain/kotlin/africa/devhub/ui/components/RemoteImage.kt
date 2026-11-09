package africa.devhub.ui.components

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import coil3.compose.AsyncImage

/**
 * Construit l'adresse d'une image servie par le proxy du serveur (`/api/v1/img`, comme `img()` du web) :
 * redimensionnée, en WebP, mise en cache, et l'éditeur ne voit jamais l'adresse IP de la personne.
 * Fourni par la racine de l'app ; sans lui, aucune image distante n'est chargée.
 */
val LocalImageProxy = staticCompositionLocalOf<(url: String, width: Int) -> String?> { { _, _ -> null } }

/**
 * Image distante. Rien ne s'affiche tant qu'elle n'est pas chargée, et plus rien si elle échoue :
 * [onFailed] laisse l'appelant retirer son cadre (le web fait de même avec `onError`).
 */
@Composable
fun RemoteImage(
    url: String?,
    width: Int,
    modifier: Modifier = Modifier,
    contentScale: ContentScale = ContentScale.Crop,
    onFailed: () -> Unit = {},
) {
    val proxy = LocalImageProxy.current
    val src = url?.takeIf { it.startsWith("https://") || it.startsWith("http://") }?.let { proxy(it, width) } ?: return
    var failed by remember(src) { mutableStateOf(false) }
    if (failed) return
    AsyncImage(
        model = src,
        contentDescription = null,
        modifier = modifier,
        contentScale = contentScale,
        onError = {
            failed = true
            onFailed()
        },
    )
}
