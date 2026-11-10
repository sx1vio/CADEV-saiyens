package africa.devhub.community

import africa.devhub.core.maskSecrets
import africa.devhub.network.ApiException
import africa.devhub.network.NetworkException
import africa.devhub.offline.CacheKey
import africa.devhub.offline.Fetched
import africa.devhub.offline.UserSpace
import africa.devhub.offline.readThrough
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** Code d'erreur d'une écriture en ligne : `offline`, ou celui de l'API. */
private fun Throwable.code(): String = when (this) {
    is ApiException -> code ?: "http_$status"
    is NetworkException -> "offline"
    else -> "network"
}

data class FeedState(
    val community: String? = null,
    val top: Boolean = false,
    val items: List<PostView> = emptyList(),
    val loading: Boolean = true,
    val failed: Boolean = false,
    val nextCursor: String? = null,
    val hasMore: Boolean = false,
    val cachedAt: Long? = null,
)

/** Fil des communautés : toutes ou une seule, récentes ou les mieux notées. */
class FeedViewModel(private val api: CommunityApi, private val space: UserSpace? = null) : ViewModel() {
    private val _state = MutableStateFlow(FeedState())
    val state: StateFlow<FeedState> = _state.asStateFlow()
    private var job: Job? = null

    init {
        reload()
    }

    fun setCommunity(community: String?) {
        if (community == _state.value.community) return
        _state.update { it.copy(community = community) }
        reload()
    }

    fun setTop(top: Boolean) {
        if (top == _state.value.top) return
        _state.update { it.copy(top = top) }
        reload()
    }

    fun reload() = fetch(reset = true)

    fun loadMore() {
        val s = _state.value
        if (!s.loading && s.hasMore) fetch(reset = false)
    }

    private fun fetch(reset: Boolean) {
        job?.cancel()
        _state.update { it.copy(loading = true, failed = false, items = if (reset) emptyList() else it.items) }
        job = viewModelScope.launch {
            val s = _state.value
            try {
                val page = if (reset && s.community == null && !s.top) {
                    readThrough(space, CacheKey.feed(), PostList.serializer()) { api.posts(null, top = false) }
                } else {
                    Fetched(api.posts(s.community, s.top, if (reset) null else s.nextCursor))
                }
                _state.update {
                    it.copy(
                        items = if (reset) page.value.data else it.items + page.value.data,
                        loading = false,
                        nextCursor = page.value.page.nextCursor,
                        hasMore = page.value.page.hasMore && page.cachedAt == null,
                        cachedAt = page.cachedAt,
                    )
                }
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                _state.update { it.copy(loading = false, failed = true) }
            }
        }
    }
}

sealed interface PostState {
    data object Loading : PostState

    data object NotFound : PostState

    data object Failed : PostState

    data class Loaded(
        val post: PostDetail,
        val busy: Boolean = false,
        /** Code de la dernière écriture refusée, ou `offline`. */
        val error: String? = null,
        val commented: Int = 0,
        val secretsMasked: Int = 0,
        val cachedAt: Long? = null,
    ) : PostState
}

/** Une publication et ses commentaires ; commenter et voter en ligne seulement. */
class PostViewModel(private val api: CommunityApi, private val postId: String, private val space: UserSpace) : ViewModel() {
    private val _state = MutableStateFlow<PostState>(PostState.Loading)
    val state: StateFlow<PostState> = _state.asStateFlow()

    init {
        viewModelScope.launch { load() }
    }

    fun refresh() {
        viewModelScope.launch { load() }
    }

    /** Même vote une seconde fois : on le retire (0). */
    fun vote(value: Int) {
        val current = _state.value as? PostState.Loaded ?: return
        val next = if (current.post.myVote == value) 0 else value
        write(current) {
            val result = api.vote(postId, next)
            _state.update { s -> (s as? PostState.Loaded)?.let { it.copy(post = it.post.copy(score = result.score, myVote = result.myVote)) } ?: s }
        }
    }

    fun comment(text: String) {
        val current = _state.value as? PostState.Loaded ?: return
        val masked = maskSecrets(text.trim())
        if (masked.text.length !in PostLimits.COMMENT_MIN..PostLimits.COMMENT_MAX) return
        write(current) {
            api.comment(postId, masked.text)
            _state.update { s -> (s as? PostState.Loaded)?.copy(commented = s.commented + 1, secretsMasked = masked.count) ?: s }
            load()
        }
    }

    private fun write(current: PostState.Loaded, action: suspend () -> Unit) {
        if (current.busy) return
        if (!space.connectivity.online.value) {
            _state.value = current.copy(error = "offline")
            return
        }
        _state.value = current.copy(busy = true, error = null)
        viewModelScope.launch {
            val error = try {
                action()
                null
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                if (e is NetworkException) space.connectivity.reportUnreachable()
                e.code()
            }
            _state.update { s -> (s as? PostState.Loaded)?.copy(busy = false, error = error) ?: s }
        }
    }

    private suspend fun load() {
        try {
            val fetched = readThrough(space, CacheKey.post(postId), PostDetail.serializer()) { api.post(postId) }
            _state.update { (it as? PostState.Loaded)?.copy(post = fetched.value, cachedAt = fetched.cachedAt) ?: PostState.Loaded(fetched.value, cachedAt = fetched.cachedAt) }
        } catch (e: CancellationException) {
            throw e
        } catch (e: ApiException) {
            if (_state.value !is PostState.Loaded) _state.value = if (e.status == 404) PostState.NotFound else PostState.Failed
        } catch (_: Exception) {
            if (_state.value !is PostState.Loaded) _state.value = PostState.Failed
        }
    }
}

data class PostDraft(
    val community: String = "web",
    val kind: String = "discussion",
    val title: String = "",
    val body: String = "",
    val linkUrl: String = "",
    val code: String = "",
) {
    val titleValid get() = title.trim().length in PostLimits.TITLE_MIN..PostLimits.TITLE_MAX
    val linkValid get() = linkUrl.isBlank() || (linkUrl.trim().startsWith("https://") && linkUrl.trim().length <= 500)
    val canSend get() = titleValid && linkValid && body.length <= PostLimits.BODY_MAX && code.length <= PostLimits.CODE_MAX
}

data class CreatePostState(
    val draft: PostDraft = PostDraft(),
    val sending: Boolean = false,
    val error: String? = null,
    val createdId: String? = null,
)

/**
 * Publier : en ligne seulement. L'API n'a pas de clé d'idempotence pour les publications ;
 * renvoyer après une coupure risquerait un doublon, donc pas de file ici.
 */
class CreatePostViewModel(private val api: CommunityApi, private val space: UserSpace) : ViewModel() {
    private val _state = MutableStateFlow(CreatePostState())
    val state: StateFlow<CreatePostState> = _state.asStateFlow()

    fun edit(transform: (PostDraft) -> PostDraft) = _state.update { it.copy(draft = transform(it.draft), error = null) }

    fun send() {
        val s = _state.value
        if (!s.draft.canSend || s.sending) return
        if (!space.connectivity.online.value) {
            _state.update { it.copy(error = "offline") }
            return
        }
        _state.value = s.copy(sending = true, error = null)
        val d = s.draft
        viewModelScope.launch {
            _state.value = try {
                val created = api.create(
                    CreatePostRequest(
                        community = d.community,
                        kind = d.kind,
                        title = maskSecrets(d.title.trim()).text,
                        body = maskSecrets(d.body.trim()).text,
                        linkUrl = d.linkUrl.trim().ifEmpty { null },
                        code = d.code.takeIf { it.isNotBlank() }?.let { maskSecrets(it).text },
                        tags = emptyList(),
                    ),
                )
                _state.value.copy(sending = false, createdId = created.id)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                if (e is NetworkException) space.connectivity.reportUnreachable()
                _state.value.copy(sending = false, error = e.code())
            }
        }
    }

    fun consumeCreated() = _state.update { CreatePostState() }
}
