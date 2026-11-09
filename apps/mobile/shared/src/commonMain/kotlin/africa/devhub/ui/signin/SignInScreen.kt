package africa.devhub.ui.signin

import africa.devhub.app.AppState
import africa.devhub.app.SignInError
import africa.devhub.resources.Res
import africa.devhub.resources.djeli_wave
import africa.devhub.resources.email_address
import africa.devhub.resources.email_back
import africa.devhub.resources.email_name
import africa.devhub.resources.email_password
import africa.devhub.resources.email_password_hint
import africa.devhub.resources.email_submit_login
import africa.devhub.resources.email_submit_register
import africa.devhub.resources.email_switch_login
import africa.devhub.resources.email_switch_register
import africa.devhub.resources.email_title_login
import africa.devhub.resources.email_title_register
import africa.devhub.resources.error_bad_credentials
import africa.devhub.resources.error_email_taken
import africa.devhub.resources.error_invalid
import africa.devhub.resources.error_rate_limited
import africa.devhub.resources.signin_dev_login
import africa.devhub.resources.signin_email
import africa.devhub.resources.signin_failed
import africa.devhub.resources.signin_github
import africa.devhub.resources.signin_network
import africa.devhub.resources.signin_or
import africa.devhub.resources.signin_suspended
import africa.devhub.resources.signin_tagline
import africa.devhub.resources.signin_text
import africa.devhub.ui.components.BrandLogo
import africa.devhub.ui.components.PrimaryPill
import africa.devhub.ui.components.ScreenColumn
import africa.devhub.ui.components.SecondaryPill
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import africa.devhub.ui.components.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import africa.devhub.ui.components.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import org.jetbrains.compose.resources.painterResource
import org.jetbrains.compose.resources.stringResource

private enum class Mode { Choice, EmailLogin, EmailRegister }

/** Connexion : GitHub (A1) ou e-mail et mot de passe, pour qui n'a pas encore de compte GitHub. */
@Composable
fun SignInScreen(
    state: AppState.SignedOut,
    devSignIn: Boolean,
    onSignInWithGithub: (loginHint: String?) -> Unit,
    onSignInWithEmail: (email: String, password: String) -> Unit,
    onRegisterWithEmail: (displayName: String, email: String, password: String) -> Unit,
) {
    var mode by rememberSaveable { mutableStateOf(Mode.Choice) }

    ScreenColumn(verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically)) {
        BrandLogo(height = 40.dp)
        when (mode) {
            Mode.Choice -> Choice(
                busy = state.busy,
                devSignIn = devSignIn,
                onGithub = onSignInWithGithub,
                onEmail = { mode = Mode.EmailLogin },
            )
            Mode.EmailLogin, Mode.EmailRegister -> EmailForm(
                register = mode == Mode.EmailRegister,
                busy = state.busy,
                onSubmit = { name, email, password ->
                    if (mode == Mode.EmailRegister) onRegisterWithEmail(name, email, password)
                    else onSignInWithEmail(email, password)
                },
                onSwitch = { mode = if (mode == Mode.EmailLogin) Mode.EmailRegister else Mode.EmailLogin },
                onBack = { mode = Mode.Choice },
            )
        }
        state.error?.let { ErrorText(it) }
    }
}

@Composable
private fun Choice(busy: Boolean, devSignIn: Boolean, onGithub: (String?) -> Unit, onEmail: () -> Unit) {
    var devLogin by rememberSaveable { mutableStateOf("") }
    Image(painterResource(Res.drawable.djeli_wave), contentDescription = null, modifier = Modifier.height(112.dp))
    Text(stringResource(Res.string.signin_tagline), style = MaterialTheme.typography.titleLarge)
    Text(
        stringResource(Res.string.signin_text),
        style = MaterialTheme.typography.bodyLarge,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
    Spacer(Modifier.height(8.dp))
    if (devSignIn) {
        OutlinedTextField(
            value = devLogin,
            onValueChange = { devLogin = it.trim().take(39) },
            label = { Text(stringResource(Res.string.signin_dev_login)) },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
    }
    PrimaryButton(stringResource(Res.string.signin_github), busy) { onGithub(devLogin.ifBlank { null }) }
    Text(
        stringResource(Res.string.signin_or),
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        textAlign = TextAlign.Center,
        modifier = Modifier.fillMaxWidth(),
    )
    SecondaryPill(stringResource(Res.string.signin_email), onClick = onEmail, enabled = !busy, modifier = Modifier.fillMaxWidth())
}

@Composable
private fun EmailForm(
    register: Boolean,
    busy: Boolean,
    onSubmit: (name: String, email: String, password: String) -> Unit,
    onSwitch: () -> Unit,
    onBack: () -> Unit,
) {
    var name by rememberSaveable { mutableStateOf("") }
    var email by rememberSaveable { mutableStateOf("") }
    // Le mot de passe n'est jamais sauvegardé dans l'état restauré (rotation, arrêt du processus).
    var password by remember { mutableStateOf("") }
    // Mêmes règles que @devhub/contracts (EmailRegisterRequest, EmailLoginRequest).
    val valid = email.trim().let { '@' in it && '.' in it.substringAfter('@') && it.length <= 254 } &&
        (if (register) name.trim().length in 2..80 && password.length in 8..200 else password.isNotEmpty())
    val submit = { if (valid && !busy) onSubmit(name, email, password) }

    Text(
        stringResource(if (register) Res.string.email_title_register else Res.string.email_title_login),
        style = MaterialTheme.typography.titleLarge,
    )
    if (register) {
        OutlinedTextField(
            value = name,
            onValueChange = { name = it.take(80) },
            label = { Text(stringResource(Res.string.email_name)) },
            singleLine = true,
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
            modifier = Modifier.fillMaxWidth(),
        )
    }
    OutlinedTextField(
        value = email,
        onValueChange = { email = it.trim().take(254) },
        label = { Text(stringResource(Res.string.email_address)) },
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
        modifier = Modifier.fillMaxWidth(),
    )
    OutlinedTextField(
        value = password,
        onValueChange = { password = it.take(200) },
        label = { Text(stringResource(Res.string.email_password)) },
        supportingText = if (register) ({ Text(stringResource(Res.string.email_password_hint)) }) else null,
        singleLine = true,
        visualTransformation = PasswordVisualTransformation(),
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
        keyboardActions = KeyboardActions(onDone = { submit() }),
        modifier = Modifier.fillMaxWidth(),
    )
    PrimaryButton(
        stringResource(if (register) Res.string.email_submit_register else Res.string.email_submit_login),
        busy = busy,
        enabled = valid,
        onClick = submit,
    )
    TextButton(onClick = onSwitch, enabled = !busy, modifier = Modifier.fillMaxWidth()) {
        Text(stringResource(if (register) Res.string.email_switch_login else Res.string.email_switch_register))
    }
    TextButton(onClick = onBack, enabled = !busy, modifier = Modifier.fillMaxWidth()) {
        Text(stringResource(Res.string.email_back))
    }
}

@Composable
private fun PrimaryButton(label: String, busy: Boolean, enabled: Boolean = true, onClick: () -> Unit) {
    PrimaryPill(label, onClick = onClick, enabled = enabled && !busy, busy = busy, modifier = Modifier.fillMaxWidth())
}

@Composable
private fun ErrorText(error: SignInError) {
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
        modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
    )
}
