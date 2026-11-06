package africa.devhub.ui.signin

import africa.devhub.app.AppState
import africa.devhub.app.SignInError
import africa.devhub.resources.Res
import africa.devhub.resources.app_name
import africa.devhub.resources.signin_dev_login
import africa.devhub.resources.signin_failed
import africa.devhub.resources.signin_github
import africa.devhub.resources.signin_network
import africa.devhub.resources.signin_suspended
import africa.devhub.resources.signin_tagline
import africa.devhub.resources.signin_text
import africa.devhub.ui.components.ScreenColumn
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import org.jetbrains.compose.resources.stringResource

/** A1 : connexion GitHub. Le login de développement n'existe que dans les versions de dev. */
@Composable
fun SignInScreen(
    state: AppState.SignedOut,
    devSignIn: Boolean,
    onSignInWithGithub: (loginHint: String?) -> Unit,
) {
    var devLogin by rememberSaveable { mutableStateOf("") }

    ScreenColumn(verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically)) {
        Text(
            stringResource(Res.string.app_name),
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary,
        )
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
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Go),
                modifier = Modifier.fillMaxWidth(),
            )
        }

        Button(
            onClick = { onSignInWithGithub(devLogin.ifBlank { null }) },
            enabled = !state.busy,
            modifier = Modifier.fillMaxWidth().height(52.dp),
        ) {
            if (state.busy) {
                CircularProgressIndicator(
                    modifier = Modifier.size(20.dp),
                    strokeWidth = 2.dp,
                    color = MaterialTheme.colorScheme.onPrimary,
                )
            } else {
                Text(stringResource(Res.string.signin_github))
            }
        }

        state.error?.let { error ->
            Text(
                text = stringResource(
                    when (error) {
                        SignInError.Suspended -> Res.string.signin_suspended
                        SignInError.Network -> Res.string.signin_network
                        SignInError.Failed -> Res.string.signin_failed
                    },
                ),
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
            )
        }
    }
}
