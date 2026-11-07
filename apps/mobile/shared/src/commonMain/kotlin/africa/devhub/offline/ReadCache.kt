package africa.devhub.offline

import africa.devhub.network.DevHubJson
import kotlinx.serialization.KSerializer
import kotlinx.serialization.Serializable
import kotlinx.serialization.builtins.MapSerializer
import kotlinx.serialization.builtins.serializer

/**
 * Cache de lecture (O1) : dernière réponse connue de chaque ressource consultée, pour l'afficher
 * hors ligne. Les clés « gardées » (mon profil, mes listes) ne sont jamais évincées ; les autres
 * suivent un LRU de [maxEvictable] entrées (04-hors-ligne-sync.md § 1 : 100 ressources).
 */
class ReadCache(
    private val files: LocalFiles,
    private val now: () -> Long,
    private val maxEvictable: Int = 100,
) {
    private val indexSerializer = MapSerializer(String.serializer(), Long.serializer())
    private val index: MutableMap<String, Long> by lazy {
        files.read(INDEX)?.let { runCatching { DevHubJson.decodeFromString(indexSerializer, it) }.getOrNull() }
            ?.toMutableMap() ?: mutableMapOf()
    }

    fun <T> get(key: CacheKey, serializer: KSerializer<T>): Cached<T>? {
        val text = files.read(key.file) ?: return null
        val entry = runCatching { DevHubJson.decodeFromString(Entry.serializer(serializer), text) }.getOrNull()
            ?: return null
        touch(key)
        return Cached(entry.value, entry.savedAt)
    }

    fun <T> put(key: CacheKey, value: T, serializer: KSerializer<T>) {
        val savedAt = now()
        files.write(key.file, DevHubJson.encodeToString(Entry.serializer(serializer), Entry(value, savedAt)))
        touch(key)
        evict()
    }

    private fun touch(key: CacheKey) {
        if (key.kept) return
        index[key.file] = now()
        files.write(INDEX, DevHubJson.encodeToString(indexSerializer, index))
    }

    private fun evict() {
        if (index.size <= maxEvictable) return
        index.entries.sortedBy { it.value }.take(index.size - maxEvictable).forEach {
            files.delete(it.key)
            index.remove(it.key)
        }
        files.write(INDEX, DevHubJson.encodeToString(indexSerializer, index))
    }

    @Serializable
    private data class Entry<T>(val value: T, val savedAt: Long)

    private companion object {
        const val INDEX = "cache-index.json"
    }
}

data class Cached<T>(val value: T, val savedAt: Long)

/** Clé de cache : [kept] = jamais évincée. */
class CacheKey private constructor(name: String, val kept: Boolean) {
    val file: String = "cache-" + name.map { if (it.isLetterOrDigit() || it == '-') it else '_' }.joinToString("") + ".json"

    companion object {
        fun me() = CacheKey("me", kept = true)
        fun passport(handle: String, mine: Boolean) = CacheKey("passport-${handle.lowercase()}", kept = mine)
        fun questions(filter: String) = CacheKey("questions-$filter", kept = true)
        fun question(id: String) = CacheKey("question-$id", kept = false)
        fun tags() = CacheKey("tags", kept = true)
    }
}
