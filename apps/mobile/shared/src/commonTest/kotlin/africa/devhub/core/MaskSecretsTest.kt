package africa.devhub.core

import kotlin.test.Test
import kotlin.test.assertEquals

/**
 * Mêmes cas que packages/core/src/secrets/mask.spec.ts. Les faux secrets sont assemblés à
 * l'exécution, pour que l'analyse de secrets du dépôt (gitleaks) ne les prenne pas pour de vrais.
 */
class MaskSecretsTest {
    private val m = SECRET_PLACEHOLDER
    private fun j(vararg parts: String) = parts.joinToString("")

    @Test
    fun masksEachKnownFormat() {
        val cases = listOf(
            Triple("key " + j("AKIA", "IOSFODNN7", "EXAMPLE") + " ok", "key $m ok", "aws_access_key"),
            Triple("token " + j("ghp", "_") + "a".repeat(36), "token $m", "github_token"),
            Triple(j("github", "_pat_") + "A1_".repeat(10), m, "github_token"),
            Triple(j("sk", "_live_") + "x".repeat(24), m, "stripe_key"),
            Triple(j("sk-", "ant-api03-") + "z".repeat(30), m, "anthropic_key"),
            Triple(j("sk-", "proj-") + "q".repeat(30), m, "openai_key"),
            Triple(j("AI", "za") + "b".repeat(35), m, "google_api_key"),
            Triple(j("xo", "xb-", "1234567890-abcdef"), m, "slack_token"),
            Triple(
                j("eyJ", "hbGciOiJIUzI1NiJ9", ".eyJ", "zdWIiOiIxMjM0NTY3ODkwIn0", ".dozjgNryP4J3jVmNHl0w5N"),
                m,
                "jwt",
            ),
        )
        for ((input, expected, kind) in cases) {
            val result = maskSecrets(input)
            assertEquals(expected, result.text, kind)
            assertEquals(1, result.count, kind)
            assertEquals(listOf(kind), result.kinds, kind)
        }
    }

    @Test
    fun masksAWholePemKey() {
        val pem = j("-----BEGIN RSA ", "PRIVATE KEY-----\nMIIEow\nabc\n-----END RSA ", "PRIVATE KEY-----")
        assertEquals("avant\n$m\naprès", maskSecrets("avant\n$pem\naprès").text)
    }

    @Test
    fun masksOnlyTheConnectionStringPassword() {
        assertEquals(
            "DATABASE=postgres://awa:$m@db:5432/app",
            maskSecrets(j("DATABASE=postgres://awa:", "S3cr3t!x", "@db:5432/app")).text,
        )
    }

    @Test
    fun masksABearerHeader() {
        assertEquals("Authorization: Bearer $m", maskSecrets(j("Authorization: Bearer ", "abcdefghijklmnop1234")).text)
    }

    @Test
    fun masksAssignments() {
        assertEquals("API_KEY=$m", maskSecrets(j("API_KEY=", "abc123def456")).text)
        assertEquals("\"password\": \"$m\"", maskSecrets(j("\"password\": \"", "hunter22\"")).text)
        assertEquals("DB_PASSWORD: $m", maskSecrets(j("DB_PASSWORD: ", "tr0ub4dor")).text)
        assertEquals("const secretToken = '$m'", maskSecrets(j("const secretToken = '", "q1w2e3r4t5'")).text)
    }

    @Test
    fun leavesOrdinaryTextAlone() {
        val text = "ECONNREFUSED 127.0.0.1:5432\npassword: abc\nconst token = getToken();"
        assertEquals(MaskResult(text, 0, emptyList()), maskSecrets(text))
    }

    @Test
    fun countsSeveralAndIsIdempotent() {
        val once = maskSecrets(j("AKIA", "IOSFODNN7", "EXAMPLE") + " et " + j("ghp", "_") + "b".repeat(36))
        assertEquals(2, once.count)
        assertEquals(MaskResult(once.text, 0, emptyList()), maskSecrets(once.text))
        assertEquals(0, maskSecrets("API_KEY=$m").count)
    }
}
