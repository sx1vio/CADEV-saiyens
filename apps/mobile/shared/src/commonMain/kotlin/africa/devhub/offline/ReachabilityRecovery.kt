package africa.devhub.offline

import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.launch

/**
 * Sans cela, le bandeau « Hors ligne » reste affiché tant qu'aucune requête ne réussit : sur un écran qui
 * n'en lance pas (l'accueil), il ne disparaîtrait jamais. Tant que l'API est jugée injoignable alors que
 * le système a un réseau, on la sonde avec un délai croissant (3 s, puis le double, au plus 30 s).
 *
 * @param ping `true` si l'API répond ; toute exception compte comme un échec.
 */
class ReachabilityRecovery(
    private val connectivity: Connectivity,
    scope: CoroutineScope,
    private val ping: suspend () -> Boolean,
    private val firstDelayMs: Long = 3_000,
    private val maxDelayMs: Long = 30_000,
) {
    private val job: Job = scope.launch {
        // Seulement si le système annonce un réseau : hors réseau, c'est lui qui prévient du retour.
        connectivity.online.combine(connectivity.systemOnline) { online, system -> !online && system }
            .distinctUntilChanged()
            .collectLatest { needed ->
            if (!needed) return@collectLatest
            var wait = firstDelayMs
            while (true) {
                delay(wait)
                val ok = try {
                    ping()
                } catch (e: CancellationException) {
                    throw e
                } catch (_: Exception) {
                    false
                }
                if (ok) {
                    connectivity.reportReachable()
                    return@collectLatest
                }
                wait = (wait * 2).coerceAtMost(maxDelayMs)
            }
        }
    }

    fun stop() = job.cancel()
}
