package africa.devhub.offline

import africa.devhub.core.maskSecrets
import africa.devhub.core.newUuid
import africa.devhub.sos.AskDraft
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withTimeoutOrNull
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

/** Action mise en file ; [outcome] est connu si l'envoi a abouti pendant l'attente. */
data class Queued(val opId: String, val clientId: String?, val secretsMasked: Int, val outcome: SendOutcome?)

/**
 * Écritures SOS Dev : toujours par la file (04 § 2, « tout passe par la file »), textes masqués
 * avant d'être écrits sur le téléphone (O9). En ligne, on attend un court instant la réponse
 * pour l'afficher ; sinon l'action part au retour du réseau.
 */
class SosWriter(
    private val outbox: OutboxStore,
    private val engine: SyncEngine,
    private val now: () -> Long,
) {
    suspend fun ask(draft: AskDraft, waitMs: Long = WAIT_MS): Queued {
        val title = maskSecrets(draft.title.trim())
        val body = maskSecrets(draft.body.trim())
        val code = draft.code.takeIf { it.isNotBlank() }?.let(::maskSecrets)
        val clientId = newUuid()
        val payload = buildMap<String, JsonElement> {
            put("clientId", JsonPrimitive(clientId))
            put("title", JsonPrimitive(title.text))
            put("body", JsonPrimitive(body.text))
            put("codeSnippet", code?.let { JsonPrimitive(it.text) } ?: JsonNull)
            put("tagSlugs", JsonArray(draft.tagSlugs.map(::JsonPrimitive)))
            put("urgency", JsonPrimitive(draft.urgency))
            put("lang", JsonPrimitive(draft.lang))
            put("reproUrl", draft.reproUrl.trim().ifEmpty { null }?.let(::JsonPrimitive) ?: JsonNull)
        }
        val masked = title.count + body.count + (code?.count ?: 0)
        return enqueue("question.create", payload, clientId, preview = title.text, questionRef = "$CLIENT_REF$clientId", masked, waitMs)
    }

    suspend fun answer(questionId: String, text: String, waitMs: Long = WAIT_MS): Queued {
        val body = maskSecrets(text.trim())
        val clientId = newUuid()
        val payload = mapOf(
            "questionId" to JsonPrimitive(questionId),
            "clientId" to JsonPrimitive(clientId),
            "body" to JsonPrimitive(body.text),
        )
        return enqueue("answer.create", payload, clientId, preview = body.text.take(140), questionRef = questionId, body.count, waitMs)
    }

    suspend fun vote(questionId: String, answerId: String, waitMs: Long = WAIT_MS) =
        enqueue("answer.vote", mapOf("answerId" to JsonPrimitive(answerId)), null, "", questionId, 0, waitMs)

    suspend fun accept(questionId: String, answerId: String, waitMs: Long = WAIT_MS) =
        enqueue("answer.accept", mapOf("answerId" to JsonPrimitive(answerId)), null, "", questionId, 0, waitMs)

    suspend fun claim(questionId: String, waitMs: Long = WAIT_MS) =
        enqueue("question.claim", mapOf("questionId" to JsonPrimitive(questionId)), null, "", questionId, 0, waitMs)

    private suspend fun enqueue(
        type: String,
        payload: Map<String, JsonElement>,
        clientId: String?,
        preview: String,
        questionRef: String?,
        masked: Int,
        waitMs: Long,
    ): Queued = coroutineScope {
        val opId = newUuid()
        // Abonné avant l'envoi, pour ne pas manquer un résultat très rapide.
        val result = async(start = CoroutineStart.UNDISPATCHED) { engine.results.first { it.opId == opId } }
        outbox.enqueue(
            OutboxAction(
                opId = opId,
                type = type,
                payload = JsonObject(payload),
                createdAt = now(),
                clientId = clientId,
                preview = preview,
                questionRef = questionRef,
            ),
        )
        engine.kick()
        val outcome = withTimeoutOrNull(waitMs) { result.await() }?.outcome
        result.cancel()
        Queued(opId, clientId, masked, outcome)
    }

    private companion object {
        const val WAIT_MS = 8_000L
    }
}
