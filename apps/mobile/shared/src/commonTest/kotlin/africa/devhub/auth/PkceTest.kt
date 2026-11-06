package africa.devhub.auth

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotEquals
import kotlin.test.assertTrue

class PkceTest {
    @Test
    fun challengeIsBase64UrlSha256WithoutPadding() {
        // Valeur attendue calculée hors de l'application (Python hashlib + base64).
        assertEquals(
            "HO-S88e2FNBLuticnLssfXQONLufrAJ052ZVM1poWl8",
            Pkce.challenge("devhub-test-verifier-0123456789abcdefghijklmnop"),
        )
    }

    @Test
    fun verifierHas256RandomBitsInBase64Url() {
        val a = Pkce.newVerifier()
        val b = Pkce.newVerifier()
        assertEquals(43, a.length)
        assertTrue(a.all { it.isLetterOrDigit() || it == '-' || it == '_' })
        assertNotEquals(a, b)
    }
}
