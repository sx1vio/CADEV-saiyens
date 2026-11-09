package africa.devhub.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.compositeOver
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import africa.devhub.ui.theme.Glass
import africa.devhub.ui.theme.topSheen
import androidx.compose.ui.unit.dp
import org.jetbrains.compose.resources.DrawableResource
import org.jetbrains.compose.resources.painterResource

// Briques de la charte du web (apps/web/src/components/ui) : en-tête de page, bulle de Djeli,
// cartes à choisir, barre d'étapes, onglets soulignés, boutons en pilule. Un écran qui les
// utilise n'a rien à styler lui-même.

/** Titre de page et sous-titre, comme l'en-tête d'une page du web. */
@Composable
fun PageHeader(title: String, modifier: Modifier = Modifier, subtitle: String? = null) {
    Column(modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(title, style = MaterialTheme.typography.headlineSmall, modifier = Modifier.semantics { heading() })
        if (subtitle != null) {
            Text(subtitle, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

/** Djeli qui pose la question dans une bulle : le ton des étapes d'accueil du web. */
@Composable
fun DjeliBubble(pose: DrawableResource, title: String, hint: String?, modifier: Modifier = Modifier) {
    Row(modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Image(painterResource(pose), contentDescription = null, modifier = Modifier.height(88.dp))
        Surface(
            shape = RoundedCornerShape(12.dp),
            color = MaterialTheme.colorScheme.surface,
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
            modifier = Modifier.weight(1f),
        ) {
            Column(Modifier.padding(horizontal = 14.dp, vertical = 10.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(title, style = MaterialTheme.typography.titleMedium, modifier = Modifier.semantics { heading() })
                if (hint != null) Text(hint, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

/** Carte à choisir : bordure grise ; choisie, bordure et fond bleus. [check] affiche la pastille de choix multiple. */
@Composable
fun ChoiceCard(
    selected: Boolean,
    onClick: () -> Unit,
    title: String,
    modifier: Modifier = Modifier,
    text: String? = null,
    mascot: DrawableResource? = null,
    icon: ImageVector? = null,
    check: Boolean = false,
    leading: (@Composable () -> Unit)? = null,
) {
    val scheme = MaterialTheme.colorScheme
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = if (selected) scheme.primaryContainer else scheme.surface,
        border = BorderStroke(if (selected) 1.5.dp else 1.dp, if (selected) scheme.primary else scheme.outline),
        modifier = modifier.fillMaxWidth().semantics { this.selected = selected },
    ) {
        Row(
            Modifier.clickable(role = if (check) Role.Checkbox else Role.RadioButton, onClick = onClick)
                .defaultMinSize(minHeight = 56.dp)
                .padding(horizontal = 14.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            leading?.invoke()
            if (mascot != null) Image(painterResource(mascot), contentDescription = null, modifier = Modifier.size(width = 56.dp, height = 48.dp), contentScale = androidx.compose.ui.layout.ContentScale.Fit)
            if (icon != null) Icon(icon, contentDescription = null, tint = scheme.onSurface, modifier = Modifier.size(20.dp))
            Column(Modifier.weight(1f)) {
                Text(title, style = MaterialTheme.typography.titleSmall)
                if (text != null) Text(text, style = MaterialTheme.typography.bodySmall, color = scheme.onSurfaceVariant)
            }
            if (check) {
                Box(
                    Modifier.size(22.dp).clip(CircleShape)
                        .background(if (selected) scheme.primary else Color.Transparent)
                        .border(1.5.dp, if (selected) scheme.primary else scheme.outline, CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    if (selected) Icon(DevHubIcons.Check, contentDescription = null, tint = scheme.onPrimary, modifier = Modifier.size(14.dp))
                }
            }
        }
    }
}

/** Barre de progression de l'accueil (10 dp, pilule), avec le compte « 2/6 » lu à voix haute. */
@Composable
fun StepBar(step: Int, total: Int, modifier: Modifier = Modifier) {
    Row(modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Box(
            Modifier.weight(1f).height(10.dp).clip(CircleShape).background(MaterialTheme.colorScheme.surfaceVariant),
        ) {
            Box(Modifier.fillMaxWidth(step.toFloat() / total).height(10.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary))
        }
        Text("$step/$total", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

/** Onglets soulignés du web (« Pour toi · Questions · Actualité »). */
@Composable
fun UnderlineTabs(
    labels: List<String>,
    selected: Int,
    onSelect: (Int) -> Unit,
    modifier: Modifier = Modifier,
    indicator: Color = MaterialTheme.colorScheme.primary,
) {
    Row(modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(20.dp)) {
        labels.forEachIndexed { index, label ->
            val on = index == selected
            Column(
                Modifier.width(IntrinsicSize.Max)
                    .clickable(role = Role.Tab) { onSelect(index) }
                    .defaultMinSize(minHeight = 48.dp)
                    .semantics { this.selected = on },
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Text(
                    label,
                    style = MaterialTheme.typography.titleSmall,
                    color = if (on) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(vertical = 12.dp),
                )
                Box(Modifier.height(2.dp).fillMaxWidth().background(if (on) indicator else Color.Transparent))
            }
        }
    }
}

/** Barre d'onglets pleine largeur : fond blanc, filet en dessous, onglet actif souligné. */
@Composable
fun TabBar(labels: List<String>, selected: Int, onSelect: (Int) -> Unit, modifier: Modifier = Modifier) {
    Column(modifier.fillMaxWidth().background(MaterialTheme.colorScheme.surface)) {
        UnderlineTabs(labels, selected, onSelect, Modifier.padding(horizontal = 20.dp))
        androidx.compose.material3.HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
    }
}

/** Fond `lg-tint` du web : le bleu de la marque avec un reflet blanc qui s'estompe vers le milieu. */
fun tintBrush(primary: Color): Brush = Brush.verticalGradient(
    0f to Color.White.copy(alpha = 0.22f).compositeOver(primary),
    0.55f to primary,
    1f to primary,
)

/** Liseré clair du bouton `lg-tint`. */
val TintEdge = Color.White.copy(alpha = 0.22f)

/** Bouton d'action du web : pilule bleue à reflet, liseré clair, lueur bleue dessous. */
@Composable
fun PrimaryPill(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    trailing: ImageVector? = null,
    busy: Boolean = false,
) {
    val scheme = MaterialTheme.colorScheme
    val fill = if (enabled) tintBrush(scheme.primary) else Brush.verticalGradient(listOf(scheme.primary.copy(alpha = 0.4f), scheme.primary.copy(alpha = 0.4f)))
    Surface(
        onClick = onClick,
        enabled = enabled,
        shape = CircleShape,
        color = Color.Transparent,
        contentColor = scheme.onPrimary,
        border = if (enabled) BorderStroke(1.dp, TintEdge) else null,
        modifier = modifier.then(if (enabled) Modifier.shadow(6.dp, CircleShape, ambientColor = scheme.primary, spotColor = scheme.primary) else Modifier),
    ) {
        Row(
            Modifier.background(fill).topSheen(TintEdge.copy(alpha = 0.35f), 16.dp).defaultMinSize(minHeight = 48.dp).padding(horizontal = 24.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
        ) {
            if (busy) {
                androidx.compose.material3.CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp, color = scheme.onPrimary)
            } else {
                Text(text, style = MaterialTheme.typography.labelLarge)
                if (trailing != null) Icon(trailing, contentDescription = null, modifier = Modifier.size(18.dp))
            }
        }
    }
}

/** Bouton secondaire : pilule blanche à bordure fine. */
@Composable
fun SecondaryPill(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true, leading: ImageVector? = null) {
    val scheme = MaterialTheme.colorScheme
    Surface(
        onClick = onClick,
        enabled = enabled,
        shape = CircleShape,
        color = Glass.strong,
        contentColor = scheme.onSurface,
        border = BorderStroke(1.dp, scheme.outlineVariant),
        modifier = modifier,
    ) {
        Row(
            Modifier.topSheen(Glass.sheen, 16.dp).defaultMinSize(minHeight = 48.dp).padding(horizontal = 24.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
        ) {
            if (leading != null) Icon(leading, contentDescription = null, modifier = Modifier.size(18.dp))
            Text(text, style = MaterialTheme.typography.labelLarge)
        }
    }
}
