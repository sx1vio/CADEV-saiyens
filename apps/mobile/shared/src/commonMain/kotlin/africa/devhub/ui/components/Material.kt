package africa.devhub.ui.components

import africa.devhub.ui.theme.Glass
import africa.devhub.ui.theme.topSheen
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.CardColors
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextFieldColors
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.compositeOver
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp

// Les écrans importent ces versions à la place de celles de Material : une seule définition du
// style du web (cartes blanches à bordure fine, puces en pilule, champs blancs, bouton d'action en pilule).

@Composable
private fun cardColors(): CardColors =
    CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface, contentColor = MaterialTheme.colorScheme.onSurface)

@Composable
fun Card(
    modifier: Modifier = Modifier,
    colors: CardColors = cardColors(),
    border: BorderStroke = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
    content: @Composable ColumnScope.() -> Unit,
) = androidx.compose.material3.Card(
    modifier = modifier,
    shape = RoundedCornerShape(10.dp),
    colors = colors,
    elevation = CardDefaults.cardElevation(0.dp),
    border = border,
    content = content,
)

@Composable
fun OutlinedCard(
    modifier: Modifier = Modifier,
    border: BorderStroke = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
    content: @Composable ColumnScope.() -> Unit,
) = Card(modifier = modifier, border = border, content = content)

/**
 * Puce de filtre du web : `lg-clear` (blanc, liseré fin) au repos ; sélectionnée, `lg-tint` —
 * bleu de la marque avec un reflet blanc en haut et une lueur bleue dessous.
 */
@Composable
fun FilterChip(
    selected: Boolean,
    onClick: () -> Unit,
    label: @Composable () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    leadingIcon: @Composable (() -> Unit)? = null,
) {
    val scheme = MaterialTheme.colorScheme
    val fill = if (selected) {
        tintBrush(scheme.primary)
    } else {
        androidx.compose.ui.graphics.SolidColor(Glass.strong)
    }
    androidx.compose.material3.Surface(
        onClick = onClick,
        enabled = enabled,
        shape = CircleShape,
        color = androidx.compose.ui.graphics.Color.Transparent,
        contentColor = if (selected) scheme.onPrimary else scheme.onSurface,
        border = androidx.compose.foundation.BorderStroke(
            1.dp,
            if (selected) TintEdge else scheme.outlineVariant,
        ),
        modifier = modifier
            .then(
                if (selected) {
                    Modifier.glow(scheme.primary)
                } else {
                    Modifier
                },
            )
            .semantics { this.selected = selected },
    ) {
        androidx.compose.foundation.layout.Row(
            Modifier
                .background(fill)
                .topSheen(if (selected) TintEdge.copy(alpha = 0.35f) else Glass.sheen, 14.dp)
                .defaultMinSize(minHeight = 36.dp)
                .padding(horizontal = 16.dp),
            verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
            horizontalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(6.dp),
        ) {
            leadingIcon?.invoke()
            androidx.compose.runtime.CompositionLocalProvider(
                androidx.compose.material3.LocalTextStyle provides MaterialTheme.typography.labelLarge,
            ) { label() }
        }
    }
}

private fun Modifier.glow(tint: androidx.compose.ui.graphics.Color): Modifier =
    this.shadow(6.dp, CircleShape, ambientColor = tint, spotColor = tint)

/** Bouton d'action flottant : même pilule `lg-tint` que les boutons du web (reflet, liseré, lueur). */
@Composable
fun ExtendedFloatingActionButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    content: @Composable RowScope.() -> Unit,
) = TintButton(onClick, modifier, enabled = true, minHeight = 48.dp, horizontalPadding = 20.dp, glowDp = 8.dp, content = content)

/**
 * Bouton plein du web (`lg-tint`) : pilule bleue à reflet blanc, liseré clair et lueur bleue.
 * Remplace le `Button` de Material dans tous les écrans.
 */
@Composable
fun Button(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    destructive: Boolean = false,
    content: @Composable RowScope.() -> Unit,
) = TintButton(onClick, modifier, enabled, minHeight = 48.dp, horizontalPadding = 24.dp, glowDp = 6.dp, destructive = destructive, content = content)

@Composable
private fun TintButton(
    onClick: () -> Unit,
    modifier: Modifier,
    enabled: Boolean,
    minHeight: androidx.compose.ui.unit.Dp,
    horizontalPadding: androidx.compose.ui.unit.Dp,
    glowDp: androidx.compose.ui.unit.Dp,
    destructive: Boolean = false,
    content: @Composable RowScope.() -> Unit,
) {
    val scheme = MaterialTheme.colorScheme
    val base = if (destructive) scheme.error else scheme.primary
    val fill = if (enabled) tintBrush(base) else androidx.compose.ui.graphics.SolidColor(base.copy(alpha = 0.4f))
    Surface(
        onClick = onClick,
        enabled = enabled,
        shape = CircleShape,
        color = Color.Transparent,
        contentColor = if (destructive) scheme.onError else scheme.onPrimary,
        border = if (enabled) BorderStroke(1.dp, TintEdge) else null,
        modifier = modifier.then(if (enabled) Modifier.shadow(glowDp, CircleShape, ambientColor = base, spotColor = base) else Modifier),
    ) {
        Row(
            Modifier.background(fill).topSheen(TintEdge.copy(alpha = 0.35f), 16.dp).defaultMinSize(minHeight = minHeight).padding(horizontal = horizontalPadding),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
        ) {
            androidx.compose.runtime.CompositionLocalProvider(
                androidx.compose.material3.LocalTextStyle provides MaterialTheme.typography.labelLarge,
            ) { content() }
        }
    }
}

/** Champ de texte à fond blanc sur le fond gris de l'écran, comme les champs du web. */
@Composable
fun OutlinedTextField(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    readOnly: Boolean = false,
    textStyle: TextStyle = MaterialTheme.typography.bodyLarge,
    label: @Composable (() -> Unit)? = null,
    placeholder: @Composable (() -> Unit)? = null,
    leadingIcon: @Composable (() -> Unit)? = null,
    trailingIcon: @Composable (() -> Unit)? = null,
    supportingText: @Composable (() -> Unit)? = null,
    isError: Boolean = false,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    keyboardActions: KeyboardActions = KeyboardActions.Default,
    singleLine: Boolean = false,
    maxLines: Int = if (singleLine) 1 else Int.MAX_VALUE,
    minLines: Int = 1,
    interactionSource: MutableInteractionSource? = null,
    shape: Shape = RoundedCornerShape(10.dp),
    colors: TextFieldColors = fieldColors(),
) {
    // Libellé au-dessus du champ, comme sur le web : un libellé flottant coupe la bordure et laisse
    // voir le fond gris dans la moitié blanche du champ. Fusionné au champ pour les lecteurs d'écran.
    Column(modifier.semantics(mergeDescendants = true) {}, verticalArrangement = Arrangement.spacedBy(6.dp)) {
        val inline = leadingIcon != null && label != null
        if (label != null && !inline) {
            androidx.compose.runtime.CompositionLocalProvider(
                androidx.compose.material3.LocalContentColor provides MaterialTheme.colorScheme.onSurfaceVariant,
            ) { androidx.compose.material3.ProvideTextStyle(MaterialTheme.typography.labelLarge, label) }
        }
        FieldBody(
            value, onValueChange, Modifier.fillMaxWidth(), enabled, readOnly, textStyle, if (inline) label else placeholder, leadingIcon, trailingIcon,
            supportingText, isError, visualTransformation, keyboardOptions, keyboardActions, singleLine, maxLines, minLines,
            interactionSource, shape, colors,
        )
    }
}

@Composable
private fun FieldBody(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier,
    enabled: Boolean,
    readOnly: Boolean,
    textStyle: TextStyle,
    placeholder: @Composable (() -> Unit)?,
    leadingIcon: @Composable (() -> Unit)?,
    trailingIcon: @Composable (() -> Unit)?,
    supportingText: @Composable (() -> Unit)?,
    isError: Boolean,
    visualTransformation: VisualTransformation,
    keyboardOptions: KeyboardOptions,
    keyboardActions: KeyboardActions,
    singleLine: Boolean,
    maxLines: Int,
    minLines: Int,
    interactionSource: MutableInteractionSource?,
    shape: Shape,
    colors: TextFieldColors,
) = androidx.compose.material3.OutlinedTextField(
    value = value,
    onValueChange = onValueChange,
    modifier = modifier,
    enabled = enabled,
    readOnly = readOnly,
    textStyle = textStyle,
    placeholder = placeholder,
    leadingIcon = leadingIcon,
    trailingIcon = trailingIcon,
    supportingText = supportingText,
    isError = isError,
    visualTransformation = visualTransformation,
    keyboardOptions = keyboardOptions,
    keyboardActions = keyboardActions,
    singleLine = singleLine,
    maxLines = maxLines,
    minLines = minLines,
    interactionSource = interactionSource,
    shape = shape,
    colors = colors,
)

@Composable
private fun fieldColors(): TextFieldColors = OutlinedTextFieldDefaults.colors(
    focusedContainerColor = MaterialTheme.colorScheme.surface,
    unfocusedContainerColor = MaterialTheme.colorScheme.surface,
    disabledContainerColor = MaterialTheme.colorScheme.surface,
    errorContainerColor = MaterialTheme.colorScheme.surface,
    unfocusedBorderColor = MaterialTheme.colorScheme.outline,
)
