package africa.devhub.platform

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import platform.UIKit.UIActivityViewController
import platform.UIKit.UIApplication
import platform.UIKit.UIViewController
import platform.UIKit.popoverPresentationController

@Composable
actual fun rememberShareText(): (text: String) -> Unit = remember { { text -> shareText(text) } }

private fun shareText(text: String) {
    val root = UIApplication.sharedApplication.keyWindow?.rootViewController ?: return
    // On présente depuis l'écran du dessus : une feuille déjà ouverte bloquerait la nôtre.
    var top: UIViewController = root
    while (true) top = top.presentedViewController ?: break
    val sheet = UIActivityViewController(activityItems = listOf(text), applicationActivities = null)
    // Sur iPad la feuille est une bulle : sans point d'ancrage, iOS interrompt l'application.
    sheet.popoverPresentationController?.sourceView = top.view
    top.presentViewController(sheet, animated = true, completion = null)
}
