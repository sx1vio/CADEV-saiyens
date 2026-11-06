package africa.devhub.platform

/**
 * Navigateur d'authentification du système (Custom Tabs sur Android,
 * ASWebAuthenticationSession sur iOS) : jamais une WebView, que GitHub refuse (RFC 8252).
 */
interface AuthBrowser {
    /**
     * Ouvre [url] et attend le retour par [callbackScheme].
     * @return l'adresse de retour complète, ou null si la personne a fermé le navigateur.
     */
    suspend fun authenticate(url: String, callbackScheme: String): String?
}
