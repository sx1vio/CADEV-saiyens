package africa.devhub.ui.components

import africa.devhub.resources.Res
import africa.devhub.resources.retry
import africa.devhub.ui.theme.Glass
import africa.devhub.ui.theme.topSheen
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.wrapContentHeight
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import org.jetbrains.compose.resources.DrawableResource
import org.jetbrains.compose.resources.painterResource
import org.jetbrains.compose.resources.stringResource

/** Carte du web (`dh-panel`) : verre blanc translucide (sombre en mode sombre), bordure fine, filet de lumière en haut. */
@Composable
fun DevCard(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(10.dp),
        color = Glass.panel,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
    ) { Column(Modifier.topSheen(Glass.sheen), content = content) }
}

/** Titre de section, aligné sur celui des pages du web. */
@Composable
fun SectionTitle(text: String, modifier: Modifier = Modifier, action: (@Composable () -> Unit)? = null) {
    Row(modifier.fillMaxWidth().padding(top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(
            text,
            style = MaterialTheme.typography.titleMedium,
            modifier = Modifier.weight(1f).semantics { heading() },
        )
        action?.invoke()
    }
}

@Composable
fun RowDivider() = HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant, modifier = Modifier.padding(start = 16.dp))

/**
 * Ligne de liste : pastille d'icône, libellé, détail optionnel, chevron. Cible ≥ 48 dp,
 * lue comme un bouton.
 */
@Composable
fun NavRow(
    icon: ImageVector,
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    detail: String? = null,
    tint: Color = MaterialTheme.colorScheme.primary,
    chevron: Boolean = true,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .defaultMinSize(minHeight = 52.dp)
            .clickable(role = Role.Button, onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            Modifier.size(32.dp).background(tint.copy(alpha = 0.12f), RoundedCornerShape(8.dp)),
            contentAlignment = Alignment.Center,
        ) { Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(18.dp)) }
        Column(Modifier.weight(1f).padding(start = 12.dp)) {
            Text(label, style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onSurface)
            if (detail != null) {
                Text(
                    detail,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
        if (chevron) {
            Icon(
                DevHubIcons.ChevronRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(18.dp),
            )
        }
    }
}

/** Message d'état centré (vide ou erreur) : dit ce qui se passe et ce qu'on peut faire. */
@Composable
fun StateMessage(
    icon: ImageVector?,
    title: String,
    text: String? = null,
    isError: Boolean = false,
    onRetry: (() -> Unit)? = null,
    modifier: Modifier = Modifier,
    mascot: DrawableResource? = null,
) {
    val color = if (isError) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant
    Column(
        modifier = modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        if (mascot != null) {
            Image(painterResource(mascot), contentDescription = null, modifier = Modifier.height(96.dp))
        } else if (icon != null) {
            Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(28.dp))
        }
        Text(title, style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onSurface, textAlign = TextAlign.Center)
        if (text != null) Text(text, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
        if (onRetry != null) {
            OutlinedButton(onClick = onRetry, modifier = Modifier.padding(top = 8.dp)) {
                Icon(DevHubIcons.Refresh, contentDescription = null, modifier = Modifier.size(16.dp))
                Text(stringResource(Res.string.retry), modifier = Modifier.padding(start = 8.dp))
            }
        }
    }
}

/** État vide : Djeli et une phrase qui dit pourquoi c'est vide, dans une carte comme sur le web. */
@Composable
fun EmptyCard(text: String, mascot: DrawableResource, modifier: Modifier = Modifier) {
    DevCard(modifier) { StateMessage(icon = null, title = text, mascot = mascot) }
}

/** Ligne de classement : pastille de rang, titre, détail ; touchable quand `onClick` est donné. */
@Composable
fun RankRow(rank: Int, title: String, detail: String, onClick: (() -> Unit)? = null) {
    val top = rank <= 3
    Row(
        Modifier.fillMaxWidth()
            .defaultMinSize(minHeight = 56.dp)
            .then(if (onClick != null) Modifier.clickable(role = Role.Button, onClick = onClick) else Modifier)
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            Modifier.size(32.dp).background(
                if (top) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
                androidx.compose.foundation.shape.CircleShape,
            ),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                rank.toString(),
                style = MaterialTheme.typography.labelLarge,
                color = if (top) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface,
            )
        }
        Column(Modifier.weight(1f).padding(start = 12.dp)) {
            Text(title, style = MaterialTheme.typography.titleSmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(detail, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        if (onClick != null) {
            Icon(DevHubIcons.ChevronRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(18.dp))
        }
    }
}

/** Pastille d'état du web (`Badge`, taille sm) : fond teinté à 10 %, texte de la teinte, coins de 4 dp, 18 dp de haut. */
@Composable
fun Badge(text: String, tone: Color, icon: ImageVector? = null) {
    Surface(shape = RoundedCornerShape(4.dp), color = tone.copy(alpha = 0.10f), contentColor = tone) {
        Row(
            Modifier.height(18.dp).padding(horizontal = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            if (icon != null) Icon(icon, contentDescription = null, modifier = Modifier.size(12.dp))
            Text(text, style = MaterialTheme.typography.labelSmall)
        }
    }
}

/** Étiquette de technologie du web (`TechTag`) : gris clair, liseré fin, coins de 6 dp. */
@Composable
fun TechTag(label: String) {
    Surface(
        shape = RoundedCornerShape(6.dp),
        color = MaterialTheme.colorScheme.surfaceVariant,
        contentColor = MaterialTheme.colorScheme.onSurfaceVariant,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
    ) {
        Text(label, style = MaterialTheme.typography.labelMedium, modifier = Modifier.height(24.dp).padding(horizontal = 8.dp).wrapContentHeight(Alignment.CenterVertically))
    }
}
