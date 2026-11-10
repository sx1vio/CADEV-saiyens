package africa.devhub.ui.components

import androidx.compose.ui.platform.UriHandler

// http ou https, avec un hôte, sans identifiants dans l'adresse (utilisateur:mot-de-passe@hôte).
private val WEB_URL = Regex("^https?://[^/\\s?#@]+(?:[/?#]|$)", RegexOption.IGNORE_CASE)

/**
 * Les liens viennent du serveur, donc de flux tiers ou d'utilisateurs : on n'ouvre que du web.
 * Sinon `javascript:`, `intent:` ou un schéma d'application serait confié au système.
 * Renvoie `null` si le lien n'est pas sûr.
 */
fun safeExternalUrl(url: String): String? = url.trim().takeIf { WEB_URL.containsMatchIn(it) }

private val MAIL_URL = Regex("^mailto:[^\\s@]+@[^\\s@]+\\.[^\\s@]+$", RegexOption.IGNORE_CASE)

/** Comme [safeExternalUrl], mais accepte aussi `mailto:` (lien de candidature : le contrat de l'API l'autorise). */
fun safeExternalUrlOrMail(url: String): String? = safeExternalUrl(url) ?: url.trim().takeIf { MAIL_URL.matches(it) }

/** Ouvre [url] seulement si c'est un lien web ; sinon ne fait rien (jamais d'exception à l'écran). */
fun UriHandler.openWeb(url: String, allowMail: Boolean = false) {
    val safe = (if (allowMail) safeExternalUrlOrMail(url) else safeExternalUrl(url)) ?: return
    runCatching { openUri(safe) }
}
