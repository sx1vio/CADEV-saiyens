package africa.devhub.ui.certs

import africa.devhub.certs.CertCatalog
import africa.devhub.certs.CertLevel
import africa.devhub.certs.CertsState
import africa.devhub.certs.DevHubCert
import africa.devhub.certs.MyCert
import africa.devhub.certs.OfficialCert
import africa.devhub.news.LiveBoardState
import africa.devhub.resources.*
import africa.devhub.ui.components.Card
import africa.devhub.ui.components.CertBadge
import africa.devhub.ui.components.DevHubIcons
import africa.devhub.ui.components.FilterChip
import africa.devhub.ui.components.LevelPill
import africa.devhub.ui.components.OutlinedTextField
import africa.devhub.ui.components.PrimaryPill
import africa.devhub.ui.components.openWeb
import africa.devhub.ui.news.liveBoardItems
import africa.devhub.ui.theme.successColor
import africa.devhub.ui.theme.warningColor
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import org.jetbrains.compose.resources.stringArrayResource
import org.jetbrains.compose.resources.stringResource

internal val VIEWS = listOf("free", "paid", "base", "live", "badges")

@Composable
internal fun levelLabel(level: CertLevel): String = stringResource(
    when (level) {
        CertLevel.Beginner -> Res.string.certs_level_beginner
        CertLevel.Intermediate -> Res.string.certs_level_intermediate
        CertLevel.Advanced -> Res.string.certs_level_advanced
        CertLevel.Expert -> Res.string.certs_level_expert
    },
)

@Composable
internal fun levelTone(level: CertLevel): Color = when (level) {
    CertLevel.Beginner -> successColor
    CertLevel.Intermediate -> MaterialTheme.colorScheme.primary
    CertLevel.Advanced -> warningColor
    CertLevel.Expert -> MaterialTheme.colorScheme.error
}

@Composable
internal fun LevelTag(level: CertLevel) = LevelPill(levelLabel(level), levelTone(level))

/** Grille adaptative : `columns` colonnes de même largeur, cartes de même hauteur sur une ligne. */
private fun <T> LazyListScope.grid(list: List<T>, columns: Int, key: (T) -> String, cell: @Composable (T) -> Unit) {
    items(list.chunked(columns), key = { row -> row.joinToString("|") { key(it) } }) { row ->
        // Pas de hauteur intrinsèque : le calcul de FlowRow est approximatif et tronquerait le pied des cartes.
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.Top) {
            row.forEach { Box(Modifier.weight(1f)) { cell(it) } }
            repeat(columns - row.size) { Spacer(Modifier.weight(1f)) }
        }
    }
}

/**
 * Page « Certifications » du web : cinq vues (gratuites, payantes, base de données, en direct, mes
 * badges), trois étapes, cartes à écu. S'étend sur 1, 2 ou 3 colonnes selon la largeur disponible.
 */
@Composable
fun CertificationsScreen(
    state: CertsState,
    live: LiveBoardState,
    onView: (String) -> Unit,
    onQuery: (String) -> Unit,
    onPrice: (String) -> Unit,
    onLevel: (String) -> Unit,
    onLiveRetry: () -> Unit,
    onOpenCert: (String) -> Unit,
) {
    val months = stringArrayResource(Res.array.months)
    val uriHandler = LocalUriHandler.current
    val open: (String) -> Unit = { uriHandler.openWeb(it) }
    BoxWithConstraints(Modifier.fillMaxSize(), contentAlignment = Alignment.TopCenter) {
        val columns = when {
            maxWidth >= 840.dp -> 3
            maxWidth >= 560.dp -> 2
            else -> 1
        }
        LazyColumn(
            modifier = Modifier.widthIn(max = 1180.dp).fillMaxWidth(),
            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item(key = "header") { Header(state, onView) }
            when (state.view) {
                "free" -> freeView(state, columns, onOpenCert, open)
                "paid" -> paidView(columns, open, onOpenCert)
                "base" -> baseView(state, onQuery, onPrice, onLevel, onOpenCert, open)
                "live" -> liveBoardItems("cert", live, months, {}, {}, onLiveRetry, open)
                else -> badgesView(state, columns, onOpenCert, onView)
            }
        }
    }
}

@Composable
private fun Header(state: CertsState, onView: (String) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(
                stringResource(Res.string.certs_title),
                style = MaterialTheme.typography.headlineMedium,
                modifier = Modifier.semantics { heading() },
            )
            Text(stringResource(Res.string.certs_subtitle), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        val earned = state.mine.count { it.certificate != null }
        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            VIEWS.forEach { v ->
                FilterChip(
                    selected = state.view == v,
                    onClick = { onView(v) },
                    label = {
                        Text(
                            when (v) {
                                "free" -> stringResource(Res.string.certs_view_free)
                                "paid" -> stringResource(Res.string.certs_view_paid)
                                "base" -> stringResource(Res.string.certs_view_base)
                                "live" -> stringResource(Res.string.certs_view_live)
                                else -> if (earned > 0) stringResource(Res.string.certs_view_badges_n, earned) else stringResource(Res.string.certs_view_badges)
                            },
                        )
                    },
                )
            }
        }
    }
}

// --- Gratuites ---------------------------------------------------------------------------------

private fun LazyListScope.freeView(state: CertsState, columns: Int, onOpenCert: (String) -> Unit, open: (String) -> Unit) {
    item(key = "steps") { Steps(columns) }
    item(key = "devhub-title") { SectionHead(Res.string.certs_devhub_title, Res.string.certs_devhub_text) }
    grid(CertCatalog.devhub, columns, { it.id }) { c ->
        val mine = state.mine.firstOrNull { it.certId == c.id }
        DevHubCertCard(c, mine, onClick = { onOpenCert(c.id) })
    }
    item(key = "publisher-title") { SectionHead(Res.string.certs_publisher_title, Res.string.certs_publisher_text, Modifier.padding(top = 12.dp)) }
    grid(CertCatalog.official.filter { it.free }, columns, { it.id }) { MarketCard(it, onOpenCert, open) }
}

@Composable
private fun SectionHead(title: org.jetbrains.compose.resources.StringResource, text: org.jetbrains.compose.resources.StringResource, modifier: Modifier = Modifier) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(stringResource(title), style = MaterialTheme.typography.titleMedium, modifier = Modifier.semantics { heading() })
        Text(stringResource(text), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

private data class Step(val icon: ImageVector, val title: org.jetbrains.compose.resources.StringResource, val text: org.jetbrains.compose.resources.StringResource)

@Composable
private fun Steps(columns: Int) {
    val steps = listOf(
        Step(DevHubIcons.Certification, Res.string.certs_step1_title, Res.string.certs_step1_text),
        Step(DevHubIcons.Clock, Res.string.certs_step2_title, Res.string.certs_step2_text),
        Step(DevHubIcons.BadgeCheck, Res.string.certs_step3_title, Res.string.certs_step3_text),
    )
    val perRow = if (columns >= 3) 3 else 1
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        steps.withIndex().chunked(perRow).forEach { row ->
            Row(Modifier.fillMaxWidth().height(IntrinsicSize.Min), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                row.forEach { (i, s) ->
                    Card(Modifier.weight(1f).fillMaxHeight()) {
                        Row(Modifier.padding(16.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Box(
                                Modifier.size(32.dp).border(1.dp, MaterialTheme.colorScheme.outline, CircleShape),
                                contentAlignment = Alignment.Center,
                            ) { Text("${i + 1}", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Icon(s.icon, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(16.dp))
                                    Text(stringResource(s.title), style = MaterialTheme.typography.titleSmall)
                                }
                                Text(stringResource(s.text), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }
                repeat(perRow - row.size) { Spacer(Modifier.weight(1f)) }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun DevHubCertCard(cert: DevHubCert, mine: MyCert?, onClick: () -> Unit) {
    val passed = mine?.certificate != null
    val result = mine?.certificate?.bestScore ?: mine?.lastAttempt?.score
    Card(Modifier.fillMaxSize().clickable(role = Role.Button, onClick = onClick)) {
        Column(Modifier.fillMaxHeight().padding(16.dp), verticalArrangement = Arrangement.SpaceBetween) {
          Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                CertBadge(cert.color, cert.logo, 48.dp)
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        LevelTag(cert.level)
                        Text(cert.track, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Text(cert.title, style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold))
                }
            }
            Text(
                cert.description,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            FlowRow(horizontalArrangement = Arrangement.spacedBy(4.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                cert.syllabus.take(4).forEach { Chip(it) }
            }
          }
          Column(Modifier.padding(top = 12.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(DevHubIcons.Clock, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(14.dp))
                Text(
                    stringResource(Res.string.certs_duration, cert.minutes, cert.questions),
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(start = 4.dp).weight(1f),
                )
                when {
                    passed -> Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        Icon(DevHubIcons.BadgeCheck, contentDescription = null, tint = successColor, modifier = Modifier.size(16.dp))
                        Text(stringResource(Res.string.certs_obtained), style = MaterialTheme.typography.labelMedium, color = successColor)
                    }
                    result != null -> Text("$result %", style = MaterialTheme.typography.labelMedium, color = warningColor)
                    else -> Text(stringResource(Res.string.certs_free), style = MaterialTheme.typography.labelMedium, color = successColor)
                }
            }
          }
        }
    }
}

/** Mot-clé du programme : petit rectangle gris, comme les étiquettes de thème du web. */
@Composable
internal fun Chip(text: String, mono: Boolean = false) {
    Text(
        text,
        style = MaterialTheme.typography.labelSmall.copy(fontFamily = if (mono) FontFamily.Monospace else MaterialTheme.typography.labelSmall.fontFamily),
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier.background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(5.dp)).padding(horizontal = 6.dp, vertical = 2.dp),
    )
}

// --- Fiche éditeur ----------------------------------------------------------------------------

/** Pastille de l'éditeur (initiales sur sa couleur de marque), à la place des logos du web. */
@Composable
private fun ProviderMark(name: String, color: Long, size: androidx.compose.ui.unit.Dp = 34.dp) {
    val letters = name.split(' ', '·').filter { it.isNotBlank() }.take(2).joinToString("") { it.first().uppercase() }
    Box(Modifier.size(size).background(Color(color), RoundedCornerShape(8.dp)), contentAlignment = Alignment.Center) {
        Text(letters, style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold), color = Color.White)
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun MarketCard(cert: OfficialCert, onOpenCert: (String) -> Unit, open: (String) -> Unit) {
    val prep = CertCatalog.prepFor(cert)
    Card(Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxHeight().padding(16.dp), verticalArrangement = Arrangement.SpaceBetween) {
          Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                ProviderMark(cert.provider, cert.providerColor)
                Text(
                    cert.provider,
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f),
                )
            }
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(cert.title, style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold), modifier = Modifier.weight(1f, fill = false))
                if (cert.code.isNotEmpty()) Chip(cert.code, mono = true)
            }
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                LevelTag(cert.level)
                PricePill(cert)
            }
            Text(cert.description, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Facts(cert)
            if (cert.note.isNotEmpty()) {
                Text(
                    cert.note,
                    style = MaterialTheme.typography.labelMedium,
                    color = warningColor,
                    modifier = Modifier.fillMaxWidth().background(warningColor.copy(alpha = 0.15f), RoundedCornerShape(6.dp)).padding(horizontal = 8.dp, vertical = 4.dp),
                )
            }
          }
            FlowRow(Modifier.padding(top = 4.dp), horizontalArrangement = Arrangement.spacedBy(4.dp), verticalArrangement = Arrangement.spacedBy(0.dp)) {
                if (prep != null) {
                    TextButton(onClick = { onOpenCert(prep.id) }, contentPadding = PaddingValues(end = 12.dp)) {
                        Icon(DevHubIcons.Certification, contentDescription = null, modifier = Modifier.size(16.dp))
                        Text(stringResource(Res.string.certs_prepare), modifier = Modifier.padding(start = 6.dp))
                    }
                }
                if (cert.prepUrl.isNotEmpty()) LinkButton(cert.prepLabel) { open(cert.prepUrl) }
                LinkButton(stringResource(Res.string.certs_official_site)) { open(cert.url) }
            }
        }
    }
}

@Composable
private fun LinkButton(label: String, onClick: () -> Unit) {
    TextButton(onClick = onClick, contentPadding = PaddingValues(end = 12.dp)) {
        Text(label)
        Icon(DevHubIcons.ExternalLink, contentDescription = null, modifier = Modifier.padding(start = 6.dp).size(14.dp))
    }
}

@Composable
private fun PricePill(cert: OfficialCert) {
    val tone = if (cert.free) successColor else MaterialTheme.colorScheme.onSurface
    LevelPill(if (cert.free) stringResource(Res.string.certs_free) else cert.price, if (cert.free) tone else MaterialTheme.colorScheme.onSurfaceVariant)
}

@Composable
private fun Facts(cert: OfficialCert) {
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Fact(stringResource(Res.string.certs_format), cert.format)
        if (cert.passScore.isNotEmpty()) Fact(stringResource(Res.string.certs_pass), cert.passScore)
        Fact(stringResource(Res.string.certs_validity), cert.validity)
    }
}

@Composable
private fun Fact(label: String, value: String) {
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(0.4f))
        Text(value, style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(0.6f))
    }
}

// --- Payantes ---------------------------------------------------------------------------------

private fun LazyListScope.paidView(columns: Int, open: (String) -> Unit, onOpenCert: (String) -> Unit) {
    item(key = "paid-note") {
        val lead = stringResource(Res.string.certs_paid_lead)
        val text = stringResource(Res.string.certs_paid_text, CertCatalog.checkedAt)
        Card(Modifier.fillMaxWidth()) {
            Text(
                androidx.compose.ui.text.buildAnnotatedString {
                    pushStyle(androidx.compose.ui.text.SpanStyle(fontWeight = FontWeight.SemiBold))
                    append(lead)
                    pop()
                    append(text)
                },
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(16.dp),
            )
        }
    }
    grid(CertCatalog.official.filter { !it.free }, columns, { it.id }) { MarketCard(it, onOpenCert, open) }
}

// --- Base de données ----------------------------------------------------------------------------

private data class Row3(val id: String, val title: String, val provider: String, val domain: String, val level: CertLevel, val free: Boolean, val price: String, val validity: String, val internal: Boolean, val url: String, val color: Long, val logo: String)

private fun LazyListScope.baseView(
    state: CertsState,
    onQuery: (String) -> Unit,
    onPrice: (String) -> Unit,
    onLevel: (String) -> Unit,
    onOpenCert: (String) -> Unit,
    open: (String) -> Unit,
) {
    val rows = (
        CertCatalog.devhub.map { Row3(it.id, it.title, "DevHub", it.track, it.level, true, "", "", true, it.id, it.color, it.logo) } +
            CertCatalog.official.map {
                Row3(it.id, if (it.code.isNotEmpty()) "${it.title} (${it.code})" else it.title, it.provider, it.domain, it.level, it.free, it.price, it.validity, false, it.url, it.providerColor, "")
            }
        ).filter { r ->
        val q = state.query.trim().lowercase()
        (q.isEmpty() || "${r.title} ${r.provider} ${r.domain}".lowercase().contains(q)) &&
            (state.price.isEmpty() || (state.price == "free") == r.free) &&
            (state.level.isEmpty() || r.level.name == state.level)
    }
    item(key = "base-search") {
        OutlinedTextField(
            value = state.query,
            onValueChange = onQuery,
            label = { Text(stringResource(Res.string.certs_search)) },
            leadingIcon = { Icon(DevHubIcons.Search, contentDescription = null, modifier = Modifier.size(18.dp)) },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
    }
    item(key = "base-filters") {
        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilterChip(state.price == "free", { onPrice("free") }, { Text(stringResource(Res.string.certs_filter_free)) })
            FilterChip(state.price == "paid", { onPrice("paid") }, { Text(stringResource(Res.string.certs_filter_paid)) })
            CertLevel.entries.forEach { l -> FilterChip(state.level == l.name, { onLevel(l.name) }, { Text(levelLabel(l)) }) }
        }
    }
    item(key = "base-count") {
        Text(stringResource(Res.string.certs_results, rows.size), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
    if (rows.isEmpty()) {
        item(key = "base-none") {
            Card(Modifier.fillMaxWidth()) {
                Text(stringResource(Res.string.certs_none), style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(24.dp))
            }
        }
    } else {
        item(key = "base-list") {
            Card(Modifier.fillMaxWidth()) {
                Column {
                    rows.forEachIndexed { i, r ->
                        if (i > 0) HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                        Row(
                            Modifier.fillMaxWidth().clickable(role = Role.Button) { if (r.internal) onOpenCert(r.id) else open(r.url) }
                                .padding(horizontal = 16.dp, vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            if (r.internal) CertBadge(r.color, r.logo, 32.dp) else ProviderMark(r.provider, r.color, 32.dp)
                            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                Text(r.title, style = MaterialTheme.typography.titleSmall)
                                Text("${r.provider} · ${r.domain}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                                    LevelTag(r.level)
                                    Text(
                                        if (r.free) stringResource(Res.string.certs_free) else r.price,
                                        style = MaterialTheme.typography.labelMedium,
                                        color = if (r.free) successColor else MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                            }
                            Icon(
                                if (r.internal) DevHubIcons.ChevronRight else DevHubIcons.ExternalLink,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(18.dp),
                            )
                        }
                    }
                }
            }
        }
    }
}

// --- Mes badges ---------------------------------------------------------------------------------

private fun LazyListScope.badgesView(state: CertsState, columns: Int, onOpenCert: (String) -> Unit, onView: (String) -> Unit) {
    val earned = state.mine.filter { it.certificate != null }.mapNotNull { m -> CertCatalog.devhub(m.certId)?.let { it to m } }
    if (earned.isEmpty()) {
        item(key = "badges-empty") {
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.fillMaxWidth().padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(DevHubIcons.Award, contentDescription = null, modifier = Modifier.size(40.dp))
                    Text(stringResource(Res.string.certs_badges_empty_title), style = MaterialTheme.typography.titleSmall)
                    Text(
                        stringResource(Res.string.certs_badges_empty_text),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                    )
                    PrimaryPill(stringResource(Res.string.certs_see), onClick = { onView("free") }, modifier = Modifier.padding(top = 8.dp))
                }
            }
        }
    } else {
        grid(earned, columns, { it.first.id }) { (c, m) ->
            Card(Modifier.fillMaxSize().clickable(role = Role.Button) { onOpenCert(c.id) }) {
                Column(Modifier.fillMaxWidth().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    CertBadge(c.color, c.logo, 80.dp)
                    Text(c.title, style = MaterialTheme.typography.titleSmall, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                    m.certificate?.let { cert ->
                        Text(stringResource(Res.string.certs_badge_score, cert.bestScore), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Chip(stringResource(Res.string.certs_badge_code, cert.code), mono = true)
                    }
                }
            }
        }
    }
}
