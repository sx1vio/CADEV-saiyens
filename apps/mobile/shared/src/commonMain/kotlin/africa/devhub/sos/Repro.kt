package africa.devhub.sos

/** S14 : sites de reproduction acceptés, comme `REPRO_HOSTS` de @devhub/contracts (hôte exact). */
val REPRO_HOSTS = listOf(
    "stackblitz.com",
    "codesandbox.io",
    "replit.com",
    "gist.github.com",
    "github.com",
    "codepen.io",
    "jsfiddle.net",
)

private val REPRO_URL = Regex("""^https://([A-Za-z0-9.-]+)(?:[/?#]\S*)?$""")

/** Même règle que `isReproUrl` de @devhub/contracts : HTTPS, hôte exact ou `www.`, sans port ni identifiants. */
fun isReproUrl(value: String): Boolean {
    if (value.length > 500) return false
    val host = REPRO_URL.matchEntire(value)?.groupValues?.get(1)?.lowercase() ?: return false
    if (host.startsWith('.') || ".." in host) return false
    return REPRO_HOSTS.any { host == it || host == "www.$it" }
}
