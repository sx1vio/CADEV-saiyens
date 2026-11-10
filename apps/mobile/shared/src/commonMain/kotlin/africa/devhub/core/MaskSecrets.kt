package africa.devhub.core

/**
 * Masquage des secrets avant la mise en file (O9) : port de `maskSecrets` de @devhub/core
 * (packages/core/src/secrets/mask.ts), mêmes motifs et même texte de remplacement. Le serveur
 * le réapplique de toute façon ; ici, rien de secret n'est écrit sur le téléphone.
 */
const val SECRET_PLACEHOLDER = "[secret masqué]"

data class MaskResult(val text: String, val count: Int, val kinds: List<String>)

private class Rule(val name: String, val pattern: Regex, val group: Int? = null)

private val IGNORE_CASE = setOf(RegexOption.IGNORE_CASE)

private val RULES = listOf(
    Rule("private_key", Regex("""-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----""")),
    Rule("aws_access_key", Regex("""\b(?:AKIA|ASIA)[0-9A-Z]{16}\b""")),
    Rule("github_token", Regex("""\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{22,})\b""")),
    Rule("stripe_key", Regex("""\b[rs]k_(?:live|test)_[A-Za-z0-9]{16,}\b""")),
    Rule("anthropic_key", Regex("""\bsk-ant-[A-Za-z0-9_-]{20,}""")),
    Rule("openai_key", Regex("""\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}""")),
    Rule("google_api_key", Regex("""\bAIza[0-9A-Za-z_-]{35}\b""")),
    Rule("slack_token", Regex("""\bxox[abprs]-[A-Za-z0-9-]{10,}""")),
    Rule("jwt", Regex("""\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}""")),
    // postgres://user:motdepasse@hôte : seul le mot de passe est masqué.
    Rule("connection_string", Regex("""\b[a-z][a-z0-9+.-]*://[^\s:/@]+:([^\s@/]+)@""", IGNORE_CASE), group = 1),
    Rule("bearer", Regex("""\bBearer\s+([A-Za-z0-9._~+/=-]{16,})"""), group = 1),
    // API_KEY=…, "password": "…" (6 caractères ou plus), hors appels de fonction et valeurs déjà masquées.
    Rule(
        "assignment",
        Regex(
            """\b[A-Za-z0-9_]*(?:SECRET|PASSWORD|PASSWD|PWD|TOKEN|API_?KEY|PRIVATE_?KEY)[A-Za-z0-9_]*["']?\s*[:=]\s*["']?(?![^\s"'`,;]*\()([^\s"'`,;()\[\]]{6,})""",
            IGNORE_CASE,
        ),
        group = 1,
    ),
)

fun maskSecrets(input: String): MaskResult {
    var text = input
    var count = 0
    val kinds = linkedSetOf<String>()
    for (rule in RULES) {
        text = rule.pattern.replace(text) { match ->
            count++
            kinds += rule.name
            val group = rule.group
            if (group == null) {
                SECRET_PLACEHOLDER
            } else {
                match.value.replaceFirst(match.groupValues[group], SECRET_PLACEHOLDER)
            }
        }
    }
    return MaskResult(text, count, kinds.toList())
}
