package africa.devhub.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/** Une entrée du tiroir ; [key] sert à repérer l'entrée active. */
class DrawerEntry(val key: String, val label: String, val icon: ImageVector, val onClick: () -> Unit)

/** Un groupe d'entrées sous un intitulé discret (aucun pour le premier). */
class DrawerGroup(val title: String?, val entries: List<DrawerEntry>)

private val Ink = Color(0xFF1E1F22)
private val InkText = Color(0xFFF2F3F5)

/**
 * Menu latéral du web (`.side-panel`, AppShell.tsx) : fond sombre, groupes à intitulé discret,
 * entrée active en pilule claire qui se fond dans la page par deux coins inversés, et en bas
 * la carte du compte avec l'engrenage des réglages.
 */
@Composable
fun AppDrawer(
    groups: List<DrawerGroup>,
    selectedKey: String?,
    name: String,
    subtitle: String,
    settingsLabel: String,
    onSettings: () -> Unit,
    signOut: DrawerEntry? = null,
) {
    ModalDrawerSheet(
        modifier = Modifier.width(272.dp),
        drawerContainerColor = Ink,
        drawerShape = RectangleShape,
        windowInsets = WindowInsets(0, 0, 0, 0),
    ) {
        Column(Modifier.fillMaxHeight().windowInsetsPadding(WindowInsets.safeDrawing)) {
            Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(top = 12.dp)) {
                groups.forEach { group ->
                    if (group.title != null) {
                        Text(
                            group.title,
                            color = InkText.copy(alpha = 0.55f),
                            fontSize = 12.sp,
                            lineHeight = 16.sp,
                            style = MaterialTheme.typography.labelMedium,
                            modifier = Modifier.padding(start = 20.dp, top = 22.dp, bottom = 6.dp),
                        )
                    }
                    group.entries.forEach { Entry(it, it.key == selectedKey) }
                }
            }
            if (signOut != null) {
                // Action sensible : séparée de la navigation, jamais collée à une destination.
                androidx.compose.material3.HorizontalDivider(color = Color.White.copy(alpha = 0.08f), modifier = Modifier.padding(horizontal = 20.dp))
                Entry(signOut, active = false, tint = Color(0xFFFCA5A5))
            }
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = Color.White.copy(alpha = 0.04f),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.06f)),
                modifier = Modifier.fillMaxWidth().padding(start = 10.dp, end = 10.dp, bottom = 12.dp, top = 8.dp),
            ) {
                Row(Modifier.padding(horizontal = 10.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Initials(name, size = 36.dp)
                    Column(Modifier.weight(1f)) {
                        Text(name, color = InkText, style = MaterialTheme.typography.titleSmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text(subtitle, color = InkText.copy(alpha = 0.6f), style = MaterialTheme.typography.bodySmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                    Box(
                        Modifier.size(44.dp).clickable(role = Role.Button, onClick = onSettings),
                        contentAlignment = Alignment.Center,
                    ) { Icon(DevHubIcons.Settings, contentDescription = settingsLabel, tint = InkText.copy(alpha = 0.7f), modifier = Modifier.size(20.dp)) }
                }
            }
        }
    }
}

/** Entrée du tiroir mobile du web : pilule `white/12` à texte blanc quand elle est active, `white/80` sinon. */
@Composable
private fun Entry(entry: DrawerEntry, active: Boolean, tint: Color? = null) {
    Row(
        Modifier.fillMaxWidth().padding(start = 8.dp, end = 12.dp).height(48.dp)
            .background(if (active) Color.White.copy(alpha = 0.12f) else Color.Transparent, RoundedCornerShape(10.dp))
            .clickable(role = Role.Tab, onClick = entry.onClick)
            .semantics { selected = active }
            .padding(horizontal = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Icon(entry.icon, contentDescription = null, tint = tint ?: if (active) Color.White else Color.White.copy(alpha = 0.7f), modifier = Modifier.size(22.dp))
        Text(
            entry.label,
            color = tint ?: if (active) Color.White else InkText.copy(alpha = 0.8f),
            style = MaterialTheme.typography.titleSmall,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}
