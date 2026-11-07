package africa.devhub.offline

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlin.math.min
import kotlin.random.Random

/** Résultat d'une action envoyée, pour les écrans qui l'attendent. */
data class ActionResult(val opId: String, val type: String, val outcome: SendOutcome)

/**
 * Moteur de synchronisation (04-hors-ligne-sync.md § 2, « Moteur de synchronisation »).
 * Un seul envoi à la fois ; FIFO ; une action en échec ne bloque que celles qui en dépendent ;
 * repli 1 s, 2 s, 4 s… jusqu'à 60 s, ±20 % ; reprise au retour du réseau.
 */
class SyncEngine(
    private val store: OutboxStore,
    private val sender: ActionSender,
    private val connectivity: Connectivity,
    private val scope: CoroutineScope,
    private val now: () -> Long,
    private val random: Random = Random.Default,
    /** Délai avant l'envoi, pour regrouper des actions faites coup sur coup. */
    private val settleMs: Long = 300,
) {
    private val kicks = Channel<Unit>(Channel.CONFLATED)
    private val _syncing = MutableStateFlow(false)
    val syncing: StateFlow<Boolean> = _syncing.asStateFlow()
    private val _results = MutableSharedFlow<ActionResult>(extraBufferCapacity = 64)
    val results: SharedFlow<ActionResult> = _results.asSharedFlow()
    private var wake: Job? = null
    private var networkFailures = 0

    fun start(): Job = scope.launch {
        launch { connectivity.systemOnline.collect { if (it) kick() } }
        for (k in kicks) {
            if (settleMs > 0) delay(settleMs)
            drain()
        }
    }

    fun kick() {
        kicks.trySend(Unit)
    }

    /** Relance une action en échec ou en conflit (centre de synchronisation). */
    suspend fun retry(opId: String) {
        store.update(opId) { it.copy(status = ActionStatus.Pending, attempts = 0, nextAttemptAt = 0, lastError = null) }
        kick()
    }

    /** Abandonne une action, et celles qui dépendent de la création qu'elle portait. */
    suspend fun cancel(opId: String) {
        val action = store.actions.value.firstOrNull { it.opId == opId } ?: return
        val dependents = action.clientId?.let { cid -> store.actions.value.filter { cid in it.dependsOn } }.orEmpty()
        store.remove(setOf(opId) + dependents.map { it.opId })
    }

    private suspend fun drain() {
        while (true) {
            if (!connectivity.systemOnline.value) return
            val queue = store.actions.value
            val ready = selectReady(queue, now())
            if (ready.isEmpty()) {
                scheduleWake(queue)
                return
            }
            _syncing.value = true
            try {
                val allResolved = ready.all { action -> action.dependsOn.all { store.resolved(it) != null } }
                val outcomes = if (ready.size <= SINGLE_MAX && allResolved) {
                    sendOneByOne(ready)
                } else {
                    sender.sendBatch(ready.take(BATCH_MAX))
                }
                val reachedServer = outcomes.values.any { it !is SendOutcome.Network }
                apply(ready, outcomes)
                if (reachedServer) {
                    networkFailures = 0
                    connectivity.reportReachable()
                } else {
                    // Réseau annoncé mais serveur injoignable (portail captif, 2G muette) :
                    // on réessaie plus tard, de plus en plus espacé.
                    networkFailures++
                    connectivity.reportUnreachable()
                    scheduleWakeIn(backoff(networkFailures))
                    return
                }
            } finally {
                _syncing.value = false
            }
        }
    }

    /** En attente, échéance passée, et chaque dépendance déjà créée ou envoyée dans ce même lot. */
    private fun selectReady(queue: List<OutboxAction>, at: Long): List<OutboxAction> {
        val inBatch = mutableSetOf<String>()
        return queue.filter { action ->
            val ok = action.status == ActionStatus.Pending && action.nextAttemptAt <= at &&
                action.dependsOn.all { store.resolved(it) != null || it in inBatch }
            if (ok) action.clientId?.let(inBatch::add)
            ok
        }
    }

    private suspend fun sendOneByOne(actions: List<OutboxAction>): Map<String, SendOutcome> {
        val outcomes = linkedMapOf<String, SendOutcome>()
        for (action in actions) {
            val outcome = sender.sendOne(resolveRefs(action))
            outcomes[action.opId] = outcome
            if (outcome is SendOutcome.Network) break
        }
        return outcomes
    }

    /** Remplace « client:<uuid> » par l'identifiant serveur, quand il est connu. */
    private fun resolveRefs(action: OutboxAction): OutboxAction {
        val payload = action.payload.mapValues { (_, value) ->
            val text = (value as? JsonPrimitive)?.takeIf { it.isString }?.content
            if (text != null && text.startsWith(CLIENT_REF)) {
                store.resolved(text.removePrefix(CLIENT_REF))?.let { JsonPrimitive(it) } ?: value
            } else {
                value
            }
        }
        return action.copy(payload = JsonObject(payload))
    }

    private suspend fun apply(sent: List<OutboxAction>, outcomes: Map<String, SendOutcome>) {
        val done = mutableSetOf<String>()
        for (action in sent) {
            val outcome = outcomes[action.opId] ?: continue
            when (outcome) {
                is SendOutcome.Applied -> {
                    val id = outcome.data.createdId()
                    if (action.clientId != null && id != null) store.markResolved(action.clientId, id)
                    done += action.opId
                }
                SendOutcome.Conflict -> store.update(action.opId) {
                    it.copy(status = ActionStatus.Conflict, lastError = "version_conflict")
                }
                is SendOutcome.Rejected -> store.update(action.opId) {
                    it.copy(status = ActionStatus.Failed, lastError = outcome.code)
                }
                is SendOutcome.Retry -> store.update(action.opId) {
                    val attempts = it.attempts + 1
                    val wait = outcome.retryAfterSeconds?.let { s -> s * 1000L } ?: backoff(attempts)
                    it.copy(attempts = attempts, nextAttemptAt = now() + wait, lastError = outcome.code)
                }
                // Hors ligne : on réessaiera au retour du réseau, sans pénalité.
                SendOutcome.Network -> store.update(action.opId) { it.copy(lastError = "network") }
            }
            _results.tryEmit(ActionResult(action.opId, action.type, outcome))
        }
        if (done.isNotEmpty()) store.remove(done)
    }

    private fun backoff(attempts: Int): Long {
        val base = min(MAX_BACKOFF_MS, 1000L shl min(attempts - 1, 6))
        return (base * (0.8 + random.nextDouble() * 0.4)).toLong()
    }

    private fun scheduleWake(queue: List<OutboxAction>) {
        val next = queue.filter { it.status == ActionStatus.Pending && it.nextAttemptAt > now() }
            .minOfOrNull { it.nextAttemptAt } ?: return
        scheduleWakeIn(next - now())
    }

    private fun scheduleWakeIn(delayMs: Long) {
        wake?.cancel()
        wake = scope.launch {
            delay(delayMs)
            kick()
        }
    }

    private companion object {
        const val SINGLE_MAX = 3
        const val BATCH_MAX = 50
        const val MAX_BACKOFF_MS = 60_000L
    }
}
