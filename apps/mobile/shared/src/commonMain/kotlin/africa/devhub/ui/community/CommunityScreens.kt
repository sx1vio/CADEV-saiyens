package africa.devhub.ui.community

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.background
import androidx.compose.material3.HorizontalDivider
import africa.devhub.ui.components.Initials
import africa.devhub.ui.components.DevHubIcons
import africa.devhub.ui.components.SecondaryPill
import africa.devhub.ui.components.DevCard
import africa.devhub.ui.home.PostFeedCard
import africa.devhub.ui.components.openWeb
import africa.devhub.community.COMMUNITY_SLUGS
import africa.devhub.community.CreatePostState
import africa.devhub.community.FeedState
import africa.devhub.community.POST_KINDS
import africa.devhub.community.PostDraft
import africa.devhub.community.PostLimits
import africa.devhub.community.PostState
import africa.devhub.community.PostView
import africa.devhub.resources.Res
import africa.devhub.ui.components.EmptyCard
import africa.devhub.resources.djeli_wave
import africa.devhub.resources.cached_copy
import africa.devhub.resources.code_title
import africa.devhub.resources.community_all
import africa.devhub.resources.community_backend
import africa.devhub.resources.community_carriere
import africa.devhub.resources.community_daily_limit
import africa.devhub.resources.community_data
import africa.devhub.resources.community_devops
import africa.devhub.resources.community_fintech
import africa.devhub.resources.community_ia
import africa.devhub.resources.community_links_too_early
import africa.devhub.resources.community_mobile
import africa.devhub.resources.community_offline
import africa.devhub.resources.community_opensource
import africa.devhub.resources.community_showcase
import africa.devhub.resources.community_web
import africa.devhub.resources.create_post_body
import africa.devhub.resources.create_post_code
import africa.devhub.resources.create_post_community
import africa.devhub.resources.create_post_kind
import africa.devhub.resources.create_post_link
import africa.devhub.resources.create_post_title
import africa.devhub.resources.feed_empty
import africa.devhub.resources.feed_failed
import africa.devhub.resources.feed_publish
import africa.devhub.resources.feed_recent
import africa.devhub.resources.feed_top
import africa.devhub.resources.kind_discussion
import africa.devhub.resources.kind_news
import africa.devhub.resources.kind_opensource
import africa.devhub.resources.kind_question
import africa.devhub.resources.kind_showcase
import africa.devhub.resources.months
import africa.devhub.resources.notice_secrets
import africa.devhub.resources.post_comment
import africa.devhub.resources.post_comment_hint
import africa.devhub.resources.post_comments
import africa.devhub.resources.post_down
import africa.devhub.resources.post_failed
import africa.devhub.resources.post_meta
import africa.devhub.resources.post_no_comments
import africa.devhub.resources.post_not_found
import africa.devhub.resources.post_open_link
import africa.devhub.resources.post_score
import africa.devhub.resources.post_up
import africa.devhub.resources.proofs_more
import africa.devhub.resources.question_meta
import africa.devhub.resources.retry
import africa.devhub.resources.trust_demo
import africa.devhub.ui.components.LoadingScreen
import africa.devhub.ui.components.Pill
import africa.devhub.ui.components.ScreenColumn
import africa.devhub.ui.components.dayMonthYear
import africa.devhub.ui.sos.failureLabel
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import africa.devhub.ui.components.Button
import africa.devhub.ui.components.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import africa.devhub.ui.components.ExtendedFloatingActionButton
import africa.devhub.ui.components.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import africa.devhub.ui.components.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.pluralStringResource
import org.jetbrains.compose.resources.stringArrayResource
import org.jetbrains.compose.resources.stringResource

fun communityLabel(slug: String): StringResource = when (slug) {
    "ia" -> Res.string.community_ia
    "mobile" -> Res.string.community_mobile
    "backend" -> Res.string.community_backend
    "devops" -> Res.string.community_devops
    "data" -> Res.string.community_data
    "opensource" -> Res.string.community_opensource
    "carriere" -> Res.string.community_carriere
    "fintech" -> Res.string.community_fintech
    "showcase" -> Res.string.community_showcase
    else -> Res.string.community_web
}

private fun kindLabel(kind: String): StringResource = when (kind) {
    "question" -> Res.string.kind_question
    "showcase" -> Res.string.kind_showcase
    "news" -> Res.string.kind_news
    "opensource" -> Res.string.kind_opensource
    else -> Res.string.kind_discussion
}

/** Message d'échec d'une écriture des communautés. */
@Composable
private fun communityError(code: String): String = when (code) {
    "offline" -> stringResource(Res.string.community_offline)
    "post.daily_limit" -> stringResource(Res.string.community_daily_limit)
    "post.links_too_early" -> stringResource(Res.string.community_links_too_early)
    else -> stringResource(failureLabel(code))
}

@Composable
fun FeedScreen(
    state: FeedState,
    onCommunity: (String?) -> Unit,
    onTop: (Boolean) -> Unit,
    onRetry: () -> Unit,
    onLoadMore: () -> Unit,
    onOpen: (String) -> Unit,
    onPublish: () -> Unit,
) {
    val months = stringArrayResource(Res.array.months)
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.TopCenter) {
        LazyColumn(
            modifier = Modifier.widthIn(max = 560.dp).fillMaxWidth(),
            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 16.dp, bottom = 96.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            item {
                Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(selected = state.community == null, onClick = { onCommunity(null) }, label = { Text(stringResource(Res.string.community_all)) })
                    COMMUNITY_SLUGS.forEach { slug ->
                        FilterChip(selected = state.community == slug, onClick = { onCommunity(slug) }, label = { Text(stringResource(communityLabel(slug))) })
                    }
                }
            }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(selected = !state.top, onClick = { onTop(false) }, label = { Text(stringResource(Res.string.feed_recent)) })
                    FilterChip(selected = state.top, onClick = { onTop(true) }, label = { Text(stringResource(Res.string.feed_top)) })
                }
            }
            if (state.cachedAt != null) item { Text(stringResource(Res.string.cached_copy), style = MaterialTheme.typography.bodySmall) }
            if (!state.loading && !state.failed && state.items.isEmpty()) {
                item { EmptyCard(stringResource(Res.string.feed_empty), Res.drawable.djeli_wave) }
            }
            items(state.items, key = { it.id }) { PostFeedCard(it, months) { onOpen(it.id) } }
            item {
                when {
                    state.loading -> Box(Modifier.fillMaxWidth().padding(16.dp), Alignment.Center) { CircularProgressIndicator() }
                    state.failed -> Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(stringResource(Res.string.feed_failed), color = MaterialTheme.colorScheme.error)
                        OutlinedButton(onClick = onRetry, modifier = Modifier.fillMaxWidth()) { Text(stringResource(Res.string.retry)) }
                    }
                    state.hasMore -> OutlinedButton(onClick = onLoadMore, modifier = Modifier.fillMaxWidth()) { Text(stringResource(Res.string.proofs_more)) }
                }
            }
        }
        ExtendedFloatingActionButton(onClick = onPublish, modifier = Modifier.align(Alignment.BottomEnd).padding(16.dp)) {
            Text(stringResource(Res.string.feed_publish))
        }
    }
}

@Composable
fun PostScreen(state: PostState, onVote: (Int) -> Unit, onComment: (String) -> Unit, onRetry: () -> Unit) {
    when (state) {
        PostState.Loading -> LoadingScreen()
        PostState.NotFound -> ScreenColumn { Text(stringResource(Res.string.post_not_found)) }
        PostState.Failed -> ScreenColumn {
            Text(stringResource(Res.string.post_failed))
            Button(onClick = onRetry, modifier = Modifier.fillMaxWidth()) { Text(stringResource(Res.string.retry)) }
        }
        is PostState.Loaded -> {
            val p = state.post
            val months = stringArrayResource(Res.array.months)
            val uriHandler = LocalUriHandler.current
            ScreenColumn {
                if (state.cachedAt != null) Text(stringResource(Res.string.cached_copy), style = MaterialTheme.typography.bodySmall)
                DevCard {
                    Row(Modifier.padding(start = 16.dp, end = 16.dp, top = 16.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Initials(p.author.displayName, size = 48.dp)
                        Column(Modifier.weight(1f)) {
                            Text(p.author.displayName, style = MaterialTheme.typography.titleSmall)
                            Text(
                                stringResource(communityLabel(p.community)) + " · " + dayMonthYear(p.createdAt, months),
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                    Column(Modifier.padding(horizontal = 16.dp, vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text(p.title, style = MaterialTheme.typography.titleLarge, modifier = Modifier.semantics { heading() })
                        if (p.body.isNotBlank()) Text(p.body, style = MaterialTheme.typography.bodyLarge)
                        p.code?.takeIf { it.isNotBlank() }?.let { code ->
                            Text(code, fontFamily = FontFamily.Monospace, style = MaterialTheme.typography.bodySmall, softWrap = false, modifier = Modifier.fillMaxWidth().background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(8.dp)).horizontalScroll(rememberScrollState()).padding(12.dp))
                        }
                        p.linkUrl?.let { url -> SecondaryPill(stringResource(Res.string.post_open_link), { uriHandler.openWeb(url) }, Modifier.fillMaxWidth(), leading = DevHubIcons.ExternalLink) }
                    }
                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                    Row(Modifier.padding(horizontal = 8.dp, vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        VoteButton(stringResource(Res.string.post_up), selected = p.myVote == 1, enabled = !state.busy) { onVote(1) }
                        Text(stringResource(Res.string.post_score, p.score), fontWeight = FontWeight.SemiBold)
                        VoteButton(stringResource(Res.string.post_down), selected = p.myVote == -1, enabled = !state.busy) { onVote(-1) }
                    }
                }
                state.error?.let { Text(communityError(it), color = MaterialTheme.colorScheme.error, modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite }) }
                if (state.secretsMasked > 0) Text(pluralStringResource(Res.plurals.notice_secrets, state.secretsMasked, state.secretsMasked))

                Text(stringResource(Res.string.post_comments), style = MaterialTheme.typography.titleMedium, modifier = Modifier.semantics { heading() })
                if (p.commentList.isEmpty()) Text(stringResource(Res.string.post_no_comments), color = MaterialTheme.colorScheme.onSurfaceVariant)
                p.commentList.forEach { c ->
                    // Les réponses (parentId) sont décalées d'un cran.
                    Column(Modifier.fillMaxWidth().padding(start = if (c.parentId != null) 16.dp else 0.dp).semantics(mergeDescendants = true) {}) {
                        Text(
                            stringResource(Res.string.question_meta, c.author.displayName, dayMonthYear(c.createdAt, months)),
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Text(c.body, style = MaterialTheme.typography.bodyMedium)
                    }
                }
                var draft by rememberSaveable { mutableStateOf("") }
                LaunchedEffect(state.commented) { if (state.commented > 0) draft = "" }
                OutlinedTextField(
                    value = draft,
                    onValueChange = { draft = it.take(PostLimits.COMMENT_MAX) },
                    label = { Text(stringResource(Res.string.post_comment_hint)) },
                    minLines = 2,
                    modifier = Modifier.fillMaxWidth(),
                )
                Button(onClick = { onComment(draft) }, enabled = !state.busy && draft.trim().length >= PostLimits.COMMENT_MIN, modifier = Modifier.fillMaxWidth()) {
                    Text(stringResource(Res.string.post_comment))
                }
            }
        }
    }
}

@Composable
private fun VoteButton(label: String, selected: Boolean, enabled: Boolean, onClick: () -> Unit) {
    if (selected) Button(onClick = onClick, enabled = enabled) { Text(label) } else OutlinedButton(onClick = onClick, enabled = enabled) { Text(label) }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun CreatePostScreen(state: CreatePostState, online: Boolean, onEdit: ((PostDraft) -> PostDraft) -> Unit, onSend: () -> Unit) {
    val d = state.draft
    ScreenColumn {
        if (!online) Text(stringResource(Res.string.community_offline), color = MaterialTheme.colorScheme.error)
        Text(stringResource(Res.string.create_post_community), style = MaterialTheme.typography.titleSmall)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            COMMUNITY_SLUGS.forEach { slug -> FilterChip(selected = d.community == slug, onClick = { onEdit { it.copy(community = slug) } }, label = { Text(stringResource(communityLabel(slug))) }) }
        }
        Text(stringResource(Res.string.create_post_kind), style = MaterialTheme.typography.titleSmall)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            POST_KINDS.forEach { kind -> FilterChip(selected = d.kind == kind, onClick = { onEdit { it.copy(kind = kind) } }, label = { Text(stringResource(kindLabel(kind))) }) }
        }
        OutlinedTextField(
            value = d.title,
            onValueChange = { v -> onEdit { it.copy(title = v.take(PostLimits.TITLE_MAX)) } },
            label = { Text(stringResource(Res.string.create_post_title)) },
            isError = d.title.isNotEmpty() && !d.titleValid,
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        OutlinedTextField(
            value = d.body,
            onValueChange = { v -> onEdit { it.copy(body = v.take(PostLimits.BODY_MAX)) } },
            label = { Text(stringResource(Res.string.create_post_body)) },
            minLines = 4,
            modifier = Modifier.fillMaxWidth(),
        )
        OutlinedTextField(
            value = d.linkUrl,
            onValueChange = { v -> onEdit { it.copy(linkUrl = v.trim().take(500)) } },
            label = { Text(stringResource(Res.string.create_post_link)) },
            isError = !d.linkValid,
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        OutlinedTextField(
            value = d.code,
            onValueChange = { v -> onEdit { it.copy(code = v.take(PostLimits.CODE_MAX)) } },
            label = { Text(stringResource(Res.string.create_post_code)) },
            textStyle = MaterialTheme.typography.bodySmall.copy(fontFamily = FontFamily.Monospace),
            minLines = 2,
            modifier = Modifier.fillMaxWidth(),
        )
        state.error?.let { Text(communityError(it), color = MaterialTheme.colorScheme.error, modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite }) }
        Button(onClick = onSend, enabled = d.canSend && !state.sending && online, modifier = Modifier.fillMaxWidth()) {
            if (state.sending) CircularProgressIndicator(strokeWidth = 2.dp) else Text(stringResource(Res.string.feed_publish))
        }
    }
}
