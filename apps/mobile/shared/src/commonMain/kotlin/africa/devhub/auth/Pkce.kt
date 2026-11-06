package africa.devhub.auth

import africa.devhub.platform.secureRandomBytes
import africa.devhub.platform.sha256
import kotlin.io.encoding.Base64

/**
 * PKCE de l'application (RFC 7636, méthode S256). Le secret ne quitte jamais le téléphone ;
 * seul le défi part dans l'URL de connexion.
 */
object Pkce {
    private val base64Url = Base64.UrlSafe.withPadding(Base64.PaddingOption.ABSENT)

    /** 32 octets aléatoires, soit 43 caractères base64url. */
    fun newVerifier(): String = base64Url.encode(secureRandomBytes(32))

    fun challenge(verifier: String): String = base64Url.encode(sha256(verifier.encodeToByteArray()))
}
