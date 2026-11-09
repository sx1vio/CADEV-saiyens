package africa.devhub.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.height
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.addPathNodes
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp

/** Symbole DevHub du web (apps/web/public/logo.svg) : chevrons liés par une barre en S, dégradé bleu → turquoise. */
val BrandMark: ImageVector by lazy {
    val gradient = Brush.linearGradient(
        colors = listOf(Color(0xFF0A6CFF), Color(0xFF10B0F0), Color(0xFF20E2B4)),
        start = Offset(0f, 60f),
        end = Offset(100f, 20f),
    )
    ImageVector.Builder("DevHub", 40.dp, 32.dp, 100f, 80f).apply {
        listOf(
            "M35 21 12 40l17 14" to 9f,
            "M65 26l23 14-21 16" to 9f,
            "M19 65c10 7 21 4 25-8l10-34c4-11 15-14 25-7" to 8f,
        ).forEach { (d, width) ->
            addPath(
                pathData = addPathNodes(d),
                stroke = gradient,
                strokeLineWidth = width,
                strokeLineCap = StrokeCap.Round,
                strokeLineJoin = StrokeJoin.Round,
            )
        }
    }.build()
}

/** Logo complet : symbole + « DevHub », « Hub » en turquoise comme sur le web. */
@Composable
fun BrandLogo(height: Dp = 32.dp, modifier: Modifier = Modifier) {
    val hub = if (isSystemInDarkTheme()) Color(0xFF5EEAD4) else Color(0xFF0D9488)
    Row(modifier, verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Image(BrandMark, contentDescription = null, modifier = Modifier.height(height))
        Text(
            buildAnnotatedString {
                append("Dev")
                withStyle(SpanStyle(color = hub)) { append("Hub") }
            },
            style = MaterialTheme.typography.titleLarge.copy(
                fontSize = (height.value * 0.72f).sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = (-0.035f).em,
            ),
            color = MaterialTheme.colorScheme.onBackground,
        )
    }
}
