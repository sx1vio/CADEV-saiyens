package africa.devhub.ui.components

import africa.devhub.me.Me
import africa.devhub.resources.Res
import africa.devhub.resources.create_sheet
import africa.devhub.resources.home_jobs
import africa.devhub.resources.home_menu
import africa.devhub.resources.messages_title
import africa.devhub.resources.nav_home
import africa.devhub.resources.nav_notifications
import africa.devhub.resources.nav_preflight
import africa.devhub.resources.nav_profile
import africa.devhub.resources.search_empty
import africa.devhub.resources.search_placeholder
import africa.devhub.resources.search_title
import africa.devhub.resources.tab_certs
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.jetbrains.compose.resources.stringResource

// Coque de l'espace connecté, identique au web mobile (apps/web/src/components/shell/AppShell.tsx,
// 11/11/2026) : en-tête (menu, symbole, recherche, messages, alertes, avatar) et barre d'onglets
// flottante sombre (Accueil, Emplois, « + », Certifs, Pré-vol). Le « + » ouvre la même feuille
// « Créer » que le web.

/** Encre de la barre d'onglets du web (`.dh-ink`). */
private val Ink = Color(0xFF1E1F22)

/** Les quatre onglets de la barre du bas, dans l'ordre du web. */
enum class MainTab { Home, Jobs, Certs, Preflight }

/** En-tête du web mobile, sur tous les écrans racine. */
@Composable
fun WebTopBar(
    me: Me,
    unread: Int,
    onMenu: () -> Unit,
    onSearch: () -> Unit,
    onMessages: () -> Unit,
    onAlerts: () -> Unit,
    onProfile: () -> Unit,
) {
    Surface(color = MaterialTheme.colorScheme.surface) {
        Column(Modifier.fillMaxWidth().windowInsetsPadding(WindowInsets.statusBars)) {
            Row(
                Modifier.fillMaxWidth().height(60.dp).padding(start = 4.dp, end = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(onClick = onMenu) {
                    Icon(DevHubIcons.Menu, contentDescription = stringResource(Res.string.home_menu), modifier = Modifier.size(24.dp))
                }
                Image(BrandMark, contentDescription = null, modifier = Modifier.padding(start = 4.dp).height(26.dp))
                Spacer(Modifier.weight(1f))
                IconButton(onClick = onSearch) {
                    Icon(DevHubIcons.Search, contentDescription = stringResource(Res.string.search_title), modifier = Modifier.size(23.dp))
                }
                IconButton(onClick = onMessages) {
                    Icon(DevHubIcons.Chat, contentDescription = stringResource(Res.string.messages_title), modifier = Modifier.size(23.dp))
                }
                IconButton(onClick = onAlerts) {
                    BadgedBox(badge = { if (unread > 0) Badge { Text(if (unread > 99) "99+" else unread.toString()) } }) {
                        Icon(DevHubIcons.Bell, contentDescription = stringResource(Res.string.nav_notifications), modifier = Modifier.size(23.dp))
                    }
                }
                val profile = stringResource(Res.string.nav_profile)
                Box(
                    Modifier.padding(start = 6.dp)
                        .size(38.dp)
                        .clip(CircleShape)
                        .clickable(role = Role.Button, onClick = onProfile)
                        .semantics { contentDescription = profile },
                    contentAlignment = Alignment.Center,
                ) {
                    UserAvatar(me, 38)
                }
            }
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
        }
    }
}

/** Photo du compte si elle se charge, sinon ses initiales (comme l'avatar du web). */
@Composable
fun UserAvatar(me: Me, sizeDp: Int) {
    var failed by remember(me.avatarUrl) { mutableStateOf(me.avatarUrl == null) }
    Box(Modifier.size(sizeDp.dp).clip(CircleShape), contentAlignment = Alignment.Center) {
        Initials(me.displayName, size = sizeDp.dp)
        if (!failed) {
            RemoteImage(me.avatarUrl, width = sizeDp * 3, modifier = Modifier.fillMaxSize(), onFailed = { failed = true })
        }
    }
}

/** Barre d'onglets flottante du web mobile ; [selected] null sur un écran hors onglets. */
@Composable
fun WebTabBar(selected: MainTab?, onSelect: (MainTab) -> Unit, onCreate: () -> Unit) {
    val create = stringResource(Res.string.create_sheet)
    Box(
        Modifier.fillMaxWidth()
            .windowInsetsPadding(WindowInsets.navigationBars)
            .padding(start = 12.dp, end = 12.dp, top = 4.dp, bottom = 12.dp),
    ) {
        Row(
            Modifier.fillMaxWidth()
                .shadow(10.dp, RoundedCornerShape(10.dp))
                .clip(RoundedCornerShape(10.dp))
                .background(Ink)
                .height(64.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            TabItem(DevHubIcons.Home, stringResource(Res.string.nav_home), selected == MainTab.Home) { onSelect(MainTab.Home) }
            TabItem(DevHubIcons.Jobs, stringResource(Res.string.home_jobs), selected == MainTab.Jobs) { onSelect(MainTab.Jobs) }
            Box(Modifier.weight(1f), contentAlignment = Alignment.Center) {
                Box(
                    Modifier.size(44.dp)
                        .clip(CircleShape)
                        .background(Color.White)
                        .clickable(role = Role.Button, onClick = onCreate)
                        .semantics { contentDescription = create },
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(DevHubIcons.Plus, contentDescription = null, tint = Color.Black, modifier = Modifier.size(24.dp))
                }
            }
            TabItem(DevHubIcons.Certification, stringResource(Res.string.tab_certs), selected == MainTab.Certs) { onSelect(MainTab.Certs) }
            TabItem(DevHubIcons.PlaneTakeoff, stringResource(Res.string.nav_preflight), selected == MainTab.Preflight) {
                onSelect(MainTab.Preflight)
            }
        }
    }
}

@Composable
private fun RowScope.TabItem(icon: ImageVector, label: String, active: Boolean, onClick: () -> Unit) {
    val tint = if (active) Color.White else Color.White.copy(alpha = 0.55f)
    Column(
        Modifier.weight(1f).fillMaxHeight().selectable(selected = active, role = Role.Tab, onClick = onClick),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp, Alignment.CenterVertically),
    ) {
        Box(
            Modifier.width(44.dp).height(28.dp).clip(CircleShape)
                .background(if (active) MaterialTheme.colorScheme.primary else Color.Transparent),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(19.dp))
        }
        Text(
            label,
            style = MaterialTheme.typography.labelSmall,
            fontSize = 10.5.sp,
            color = tint,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

/** Une action de la feuille « Créer ». */
class CreateAction(val label: String, val hint: String, val icon: ImageVector, val onClick: () -> Unit)

/** Feuille « Créer » du « + », mêmes actions que le web. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateSheet(actions: List<CreateAction>, onDismiss: () -> Unit) {
    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = MaterialTheme.colorScheme.surface) {
        Column(
            Modifier.fillMaxWidth().padding(start = 16.dp, end = 16.dp, bottom = 28.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Text(
                stringResource(Res.string.create_sheet),
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(start = 4.dp, bottom = 6.dp),
            )
            actions.forEach { a ->
                Row(
                    Modifier.fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .background(MaterialTheme.colorScheme.background)
                        .clickable(role = Role.Button, onClick = a.onClick)
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Box(
                        Modifier.size(40.dp).clip(CircleShape).background(MaterialTheme.colorScheme.surface),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(a.icon, contentDescription = null, modifier = Modifier.size(20.dp))
                    }
                    Column(Modifier.weight(1f)) {
                        Text(a.label, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                        Text(a.hint, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
    }
}

/** Recherche de l'en-tête : toutes les pages et services, filtrés au fil de la saisie (palette du web). */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SearchSheet(entries: List<DrawerEntry>, onDismiss: () -> Unit) {
    var query by remember { mutableStateOf("") }
    val q = query.trim().lowercase()
    val shown = if (q.isEmpty()) entries else entries.filter { it.label.lowercase().contains(q) }
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = MaterialTheme.colorScheme.surface,
    ) {
        Column(Modifier.fillMaxWidth().padding(start = 16.dp, end = 16.dp, bottom = 28.dp)) {
            OutlinedTextField(
                value = query,
                onValueChange = { query = it.take(80) },
                placeholder = { Text(stringResource(Res.string.search_placeholder)) },
                leadingIcon = { Icon(DevHubIcons.Search, contentDescription = null, modifier = Modifier.size(20.dp)) },
                singleLine = true,
                shape = CircleShape,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(8.dp))
            if (shown.isEmpty()) {
                Text(
                    stringResource(Res.string.search_empty),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(16.dp),
                )
            }
            shown.forEach { e ->
                Row(
                    Modifier.fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .clickable(role = Role.Button, onClick = e.onClick)
                        .padding(horizontal = 12.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Icon(e.icon, contentDescription = null, modifier = Modifier.size(20.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(e.label, style = MaterialTheme.typography.bodyLarge)
                }
            }
        }
    }
}
