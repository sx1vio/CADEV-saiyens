package africa.devhub.offline

import africa.devhub.network.DevHubJson
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.Serializable
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.builtins.MapSerializer
import kotlinx.serialization.builtins.serializer
import kotlinx.serialization.json.JsonObject

/** Préfixe d'une référence vers un contenu créé hors ligne, résolue par l'API (04 § 4). */
const val CLIENT_REF = "client:"

@Serializable
enum class ActionStatus { Pending, Failed, Conflict }

/**
 * Action de la file (ADR-0008, 04-hors-ligne-sync.md § 2). Toute écriture passe par ici, en
 * ligne comme hors ligne. [opId] sert d'Idempotency-Key : la renvoyer ne crée jamais de doublon.
 */
@Serializable
data class OutboxAction(
    val opId: String,
    /** Type de @devhub/contracts : `question.create`, `answer.create`, `answer.vote`… */
    val type: String,
    /** Corps de l'action, textes déjà masqués (O9) ; un identifiant peut valoir « client:<uuid> ». */
    val payload: JsonObject,
    val createdAt: Long,
    val status: ActionStatus = ActionStatus.Pending,
    val attempts: Int = 0,
    val nextAttemptAt: Long = 0,
    /** Code de la dernière erreur (RFC 9457) ou `network`. */
    val lastError: String? = null,
    /** clientId du contenu créé par cette action (`question.create`, `answer.create`). */
    val clientId: String? = null,
    /** clientId des créations dont elle dépend et qui n'étaient pas encore envoyées. */
    val dependsOn: List<String> = emptyList(),
    /** Aperçu lisible, pour le centre de synchronisation (O8). */
    val preview: String = "",
    /** Contenu concerné (question, salle ; identifiant serveur ou « client:<uuid> »), pour l'affichage optimiste. */
    val target: String? = null,
)

/**
 * File persistante, propre à un utilisateur (O9). Mémoire + fichier `outbox.json` réécrit à chaque
 * changement ; [resolved] retient l'identifiant serveur de chaque création envoyée.
 */
class OutboxStore(private val files: LocalFiles) {
    private val mutex = Mutex()
    private val listSerializer = ListSerializer(OutboxAction.serializer())
    private val mapSerializer = MapSerializer(String.serializer(), String.serializer())

    private val _actions = MutableStateFlow(
        files.read(OUTBOX)?.let { runCatching { DevHubJson.decodeFromString(listSerializer, it) }.getOrNull() }
            ?: emptyList(),
    )
    val actions: StateFlow<List<OutboxAction>> = _actions.asStateFlow()

    private val resolvedIds: MutableMap<String, String> =
        files.read(RESOLVED)?.let { runCatching { DevHubJson.decodeFromString(mapSerializer, it) }.getOrNull() }
            ?.toMutableMap() ?: mutableMapOf()

    /** Identifiant serveur d'une création déjà envoyée, ou null. */
    fun resolved(clientId: String): String? = resolvedIds[clientId]

    suspend fun enqueue(action: OutboxAction) = mutate { it + action }

    suspend fun update(opId: String, transform: (OutboxAction) -> OutboxAction) =
        mutate { list -> list.map { if (it.opId == opId) transform(it) else it } }

    suspend fun remove(opIds: Set<String>) = mutate { list -> list.filterNot { it.opId in opIds } }

    suspend fun markResolved(clientId: String, serverId: String) = mutex.withLock {
        resolvedIds[clientId] = serverId
        files.write(RESOLVED, DevHubJson.encodeToString(mapSerializer, resolvedIds))
    }

    private suspend fun mutate(transform: (List<OutboxAction>) -> List<OutboxAction>) = mutex.withLock {
        val next = transform(_actions.value)
        files.write(OUTBOX, DevHubJson.encodeToString(listSerializer, next))
        _actions.value = next
    }

    private companion object {
        const val OUTBOX = "outbox.json"
        const val RESOLVED = "resolved-ids.json"
    }
}
