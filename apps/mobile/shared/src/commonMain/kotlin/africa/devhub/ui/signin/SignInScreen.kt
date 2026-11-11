package africa.devhub.ui.signin

import africa.devhub.app.AppState
import africa.devhub.app.SignInError
import africa.devhub.resources.Res
import africa.devhub.resources.auth_accept_after
import africa.devhub.resources.auth_accept_before
import africa.devhub.resources.auth_accept_link
import africa.devhub.resources.auth_create_account
import africa.devhub.resources.auth_email_label
import africa.devhub.resources.auth_email_placeholder
import africa.devhub.resources.auth_err_accept
import africa.devhub.resources.auth_err_email_empty
import africa.devhub.resources.auth_err_email_invalid
import africa.devhub.resources.auth_err_name
import africa.devhub.resources.auth_err_pw_empty
import africa.devhub.resources.auth_err_pw_short
import africa.devhub.resources.auth_forgot
import africa.devhub.resources.auth_have_account
import africa.devhub.resources.auth_hide_password
import africa.devhub.resources.auth_name_placeholder
import africa.devhub.resources.auth_no_account
import africa.devhub.resources.auth_or_email
import africa.devhub.resources.auth_pw_hint
import africa.devhub.resources.auth_secure_note
import africa.devhub.resources.auth_show_password
import africa.devhub.resources.auth_strength_0
import africa.devhub.resources.auth_strength_1
import africa.devhub.resources.auth_strength_2
import africa.devhub.resources.auth_strength_3
import africa.devhub.resources.auth_strength_4
import africa.devhub.resources.auth_title_login
import africa.devhub.resources.auth_title_register
import africa.devhub.resources.djeli_wave
import africa.devhub.resources.email_name
import africa.devhub.resources.email_password
import africa.devhub.resources.email_submit_login
import africa.devhub.resources.email_submit_register
import africa.devhub.resources.error_bad_credentials
import africa.devhub.resources.error_email_taken
import africa.devhub.resources.error_invalid
import africa.devhub.resources.error_rate_limited
import africa.devhub.resources.signin_dev_login
import africa.devhub.resources.signin_failed
import africa.devhub.resources.signin_github
import africa.devhub.resources.signin_network
import africa.devhub.resources.signin_suspended
import africa.devhub.ui.components.BrandLogo
import africa.devhub.ui.components.DevHubIcons
import africa.devhub.ui.components.OutlinedTextField
import africa.devhub.ui.components.PrimaryPill
import africa.devhub.ui.components.ScreenColumn
import africa.devhub.ui.components.SecondaryPill
import africa.devhub.ui.components.openWeb
import africa.devhub.ui.theme.successColor
import africa.devhub.ui.theme.warningColor
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Checkbox
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.painterResource
import org.jetbrains.compose.resources.stringResource

// Connexion et inscription, identiques au web mobile (apps/web/src/pages/Login.tsx, 11/11/2026) :
// titre et lien de bascule, Djeli, « Continuer avec GitHub », séparateur, e-mail et mot de passe
// avec libellés au-dessus, erreur sous chaque champ (A11Y-02), force du mot de passe et règles de
// la communauté à l'inscription, puis le bouton principal et la note de sécurité.

/** Force du mot de passe, même règle que le web : longueur, variété, pas de motif évident. 0 à 4. */
internal fun passwordStrength(pw: String): Int {
    if (pw.isEmpty()) return 0
    var s = 0
    if (pw.length >= 8) s++
    if (pw.length >= 12) s++
    if (pw.any { it.isLowerCase() } && pw.any { it.isUpperCase() }) s++
    if (pw.any { it.isDigit() } && pw.any { !it.isLetterOrDigit() }) s++
    val lower = pw.lowercase()
    val repeated = pw.length > 1 && pw.all { it == pw[0] }
    if (repeated || listOf("123", "azerty", "qwerty", "password", "motdepasse").any { lower.startsWith(it) }) s = 0
    return minOf(4, s)
}

/** Adresse e-mail plausible, même règle que le web (`/^\S+@\S+\.\S+$/`). */
internal fun looksLikeEmail(email: String): Boolean =
    Regex("^\\S+@\\S+\\.\\S+$").matches(email.trim()) && email.trim().length <= 254

private val STRENGTH = listOf(
    Res.string.auth_strength_0,
    Res.string.auth_strength_1,
    Res.string.auth_strength_2,
    Res.string.auth_strength_3,
    Res.string.auth_strength_4,
)

@Composable
fun SignInScreen(
    state: AppState.SignedOut,
    devSignIn: Boolean,
    webBaseUrl: String,
    onSignInWithGithub: (loginHint: String?) -> Unit,
    onSignInWithEmail: (email: String, password: String) -> Unit,
    onRegisterWithEmail: (displayName: String, email: String, password: String) -> Unit,
) {
    var signup by rememberSaveable { mutableStateOf(false) }
    var name by rememberSaveable { mutableStateOf("") }
    var email by rememberSaveable { mutableStateOf("") }
    // Le mot de passe n'est jamais sauvegardé dans l'état restauré (rotation, arrêt du processus).
    var password by remember { mutableStateOf("") }
    var show by remember { mutableStateOf(false) }
    var accept by rememberSaveable { mutableStateOf(false) }
    var devLogin by rememberSaveable { mutableStateOf("") }
    val errors = remember { mutableStateMapOf<String, StringResource>() }
    val uri = LocalUriHandler.current
    val base = webBaseUrl.trimEnd('/')
    val busy = state.busy

    fun submit() {
        errors.clear()
        if (signup && name.trim().length < 2) errors["name"] = Res.string.auth_err_name
        if (email.isBlank()) errors["email"] = Res.string.auth_err_email_empty
        else if (!looksLikeEmail(email)) errors["email"] = Res.string.auth_err_email_invalid
        if (password.isEmpty()) errors["pw"] = Res.string.auth_err_pw_empty
        else if (signup && password.length < 8) errors["pw"] = Res.string.auth_err_pw_short
        if (signup && !accept) errors["accept"] = Res.string.auth_err_accept
        if (errors.isNotEmpty() || busy) return
        if (signup) onRegisterWithEmail(name.trim(), email.trim(), password) else onSignInWithEmail(email.trim(), password)
    }

    ScreenColumn(verticalArrangement = Arrangement.spacedBy(0.dp)) {
        BrandLogo(height = 32.dp)
        Spacer(Modifier.height(28.dp))

        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            Column(Modifier.weight(1f)) {
                Text(
                    stringResource(if (signup) Res.string.auth_title_register else Res.string.auth_title_login),
                    style = MaterialTheme.typography.headlineMedium.copy(fontSize = 34.sp, lineHeight = 38.sp, letterSpacing = (-0.03f).em),
                    fontWeight = FontWeight.Bold,
                )
                Spacer(Modifier.height(8.dp))
                val prefix = stringResource(if (signup) Res.string.auth_have_account else Res.string.auth_no_account)
                val link = stringResource(if (signup) Res.string.auth_title_login else Res.string.auth_create_account)
                val accent = MaterialTheme.colorScheme.primary
                Text(
                    buildAnnotatedString {
                        append(prefix)
                        withStyle(SpanStyle(color = accent, fontWeight = FontWeight.SemiBold)) { append(link) }
                    },
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.clickable(enabled = !busy, role = Role.Button) {
                        signup = !signup
                        errors.clear()
                    },
                )
            }
            Image(painterResource(Res.drawable.djeli_wave), contentDescription = null, modifier = Modifier.size(88.dp))
        }

        Spacer(Modifier.height(28.dp))
        if (devSignIn) {
            OutlinedTextField(
                value = devLogin,
                onValueChange = { devLogin = it.trim().take(39) },
                label = { Text(stringResource(Res.string.signin_dev_login)) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(12.dp))
        }
        SecondaryPill(
            stringResource(Res.string.signin_github),
            onClick = { onSignInWithGithub(devLogin.ifBlank { null }) },
            enabled = !busy,
            leading = DevHubIcons.Github,
            modifier = Modifier.fillMaxWidth(),
        )

        Row(Modifier.fillMaxWidth().padding(vertical = 24.dp), verticalAlignment = Alignment.CenterVertically) {
            HorizontalDivider(Modifier.weight(1f), color = MaterialTheme.colorScheme.outline)
            Text(
                stringResource(Res.string.auth_or_email),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = 12.dp),
            )
            HorizontalDivider(Modifier.weight(1f), color = MaterialTheme.colorScheme.outline)
        }

        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            if (signup) {
                Field(errors["name"]) {
                    OutlinedTextField(
                        value = name,
                        onValueChange = { name = it.take(80) },
                        label = { Text(stringResource(Res.string.email_name)) },
                        placeholder = { Text(stringResource(Res.string.auth_name_placeholder)) },
                        isError = errors["name"] != null,
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }
            Field(errors["email"]) {
                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it.trim().take(254) },
                    label = { Text(stringResource(Res.string.auth_email_label)) },
                    placeholder = { Text(stringResource(Res.string.auth_email_placeholder)) },
                    isError = errors["email"] != null,
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            Field(errors["pw"], hint = if (signup && errors["pw"] == null) Res.string.auth_pw_hint else null) {
                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it.take(200) },
                    label = { Text(stringResource(Res.string.email_password)) },
                    isError = errors["pw"] != null,
                    singleLine = true,
                    visualTransformation = if (show) VisualTransformation.None else PasswordVisualTransformation(),
                    trailingIcon = {
                        IconButton(onClick = { show = !show }) {
                            Icon(
                                if (show) DevHubIcons.EyeOff else DevHubIcons.Eye,
                                contentDescription = stringResource(if (show) Res.string.auth_hide_password else Res.string.auth_show_password),
                                modifier = Modifier.size(18.dp),
                            )
                        }
                    },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
                    keyboardActions = KeyboardActions(onDone = { submit() }),
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            if (!signup) {
                Text(
                    stringResource(Res.string.auth_forgot),
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.align(Alignment.End).clickable(role = Role.Button) {
                        val q = email.trim().takeIf { it.isNotEmpty() }?.let { "?email=$it" }.orEmpty()
                        uri.openWeb("$base/mot-de-passe$q")
                    },
                )
            }
            if (signup && password.isNotEmpty()) StrengthMeter(password)
            if (signup) {
                Column {
                    Row(verticalAlignment = Alignment.Top) {
                        Checkbox(checked = accept, onCheckedChange = { accept = it })
                        val accent = MaterialTheme.colorScheme.primary
                        Text(
                            buildAnnotatedString {
                                append(stringResource(Res.string.auth_accept_before))
                                withStyle(SpanStyle(color = accent, fontWeight = FontWeight.Medium)) {
                                    append(stringResource(Res.string.auth_accept_link))
                                }
                                append(stringResource(Res.string.auth_accept_after))
                            },
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(top = 12.dp).clickable(role = Role.Button) { uri.openWeb("$base/regles") },
                        )
                    }
                    errors["accept"]?.let { FieldError(it) }
                }
            }
            state.error?.let { ErrorBox(it) }
            PrimaryPill(
                stringResource(if (signup) Res.string.email_submit_register else Res.string.email_submit_login),
                onClick = { submit() },
                enabled = !busy,
                busy = busy,
                trailing = DevHubIcons.ArrowRight,
                modifier = Modifier.fillMaxWidth(),
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(DevHubIcons.Lock, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(16.dp))
                Text(
                    stringResource(Res.string.auth_secure_note),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

/** Champ avec son message d'erreur (ou son aide) dessous, comme `Field` du web. */
@Composable
private fun Field(error: StringResource?, hint: StringResource? = null, content: @Composable () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        content()
        when {
            error != null -> FieldError(error)
            hint != null -> Text(
                stringResource(hint),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun FieldError(error: StringResource) {
    Text(
        stringResource(error),
        style = MaterialTheme.typography.bodySmall,
        color = MaterialTheme.colorScheme.error,
        modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
    )
}

/** Jauge à quatre segments et libellé, comme sous le champ du web. */
@Composable
private fun StrengthMeter(password: String) {
    val pw = passwordStrength(password)
    val level = if (password.length < 8) 0 else pw
    val color = when (level) {
        0, 1 -> MaterialTheme.colorScheme.error
        2 -> warningColor
        else -> successColor
    }
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(Modifier.weight(1f), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            repeat(4) { i ->
                Box(
                    Modifier.weight(1f).height(4.dp).clip(CircleShape)
                        .background(if (i < maxOf(1, level)) color else MaterialTheme.colorScheme.surfaceVariant),
                )
            }
        }
        Text(
            stringResource(STRENGTH[level]),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.width(80.dp),
        )
    }
}

@Composable
private fun ErrorBox(error: SignInError) {
    Text(
        text = stringResource(
            when (error) {
                SignInError.Suspended -> Res.string.signin_suspended
                SignInError.Network -> Res.string.signin_network
                SignInError.BadCredentials -> Res.string.error_bad_credentials
                SignInError.EmailTaken -> Res.string.error_email_taken
                SignInError.RateLimited -> Res.string.error_rate_limited
                SignInError.Invalid -> Res.string.error_invalid
                SignInError.Failed -> Res.string.signin_failed
            },
        ),
        color = MaterialTheme.colorScheme.error,
        style = MaterialTheme.typography.bodyMedium,
        modifier = Modifier.fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(MaterialTheme.colorScheme.errorContainer)
            .padding(horizontal = 12.dp, vertical = 10.dp)
            .semantics { liveRegion = LiveRegionMode.Polite },
    )
}
