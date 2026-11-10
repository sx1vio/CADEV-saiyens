package africa.devhub.platform

/**
 * Stockage chiffré de petites valeurs (le jeton de session). Android : clé du Keystore ;
 * iOS : Keychain, implémenté en Swift et passé au démarrage.
 */
interface SecureStore {
    fun read(key: String): String?

    fun write(key: String, value: String)

    fun delete(key: String)
}
