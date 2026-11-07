package africa.devhub.offline

import africa.devhub.network.ApiException
import africa.devhub.network.NetworkException
import kotlinx.serialization.KSerializer

/** Valeur lue ; [cachedAt] non nul = copie locale (hors ligne), à signaler à l'écran. */
data class Fetched<T>(val value: T, val cachedAt: Long? = null)

/**
 * Lecture « réseau d'abord, cache en secours » (O1). Hors ligne annoncé : le cache directement,
 * sans attendre un délai d'expiration. Une erreur métier (404, 403…) n'est jamais masquée par
 * une vieille copie ; une panne (réseau, 5xx) l'est, si le cache a de quoi répondre.
 */
suspend fun <T> readThrough(
    space: UserSpace?,
    key: CacheKey,
    serializer: KSerializer<T>,
    fetch: suspend () -> T,
): Fetched<T> {
    val cache = space?.cache
    val connectivity = space?.connectivity
    fun cached() = cache?.get(key, serializer)?.let { Fetched(it.value, it.savedAt) }
    if (connectivity != null && !connectivity.online.value) cached()?.let { return it }
    return try {
        val value = fetch()
        cache?.put(key, value, serializer)
        connectivity?.reportReachable()
        Fetched(value)
    } catch (e: NetworkException) {
        connectivity?.reportUnreachable()
        cached() ?: throw e
    } catch (e: ApiException) {
        if (e.status >= 500) cached() ?: throw e else throw e
    }
}
