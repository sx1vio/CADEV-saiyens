package africa.devhub.ui.settings

import africa.devhub.resources.Res
import africa.devhub.resources.lang_en
import africa.devhub.resources.lang_fr
import africa.devhub.resources.privacy_availability
import africa.devhub.resources.privacy_country
import africa.devhub.resources.privacy_stats
import africa.devhub.resources.privacy_unlisted
import africa.devhub.resources.settings_bio
import africa.devhub.resources.settings_country
import africa.devhub.resources.settings_danger
import africa.devhub.resources.settings_delete
import africa.devhub.resources.settings_delete_handle
import africa.devhub.resources.settings_delete_text
import africa.devhub.resources.settings_email
import africa.devhub.resources.settings_languages
import africa.devhub.resources.settings_looking_for
import africa.devhub.resources.settings_mission
import africa.devhub.resources.settings_mission_hint
import africa.devhub.resources.settings_name
import africa.devhub.resources.settings_offline
import africa.devhub.resources.settings_privacy
import africa.devhub.resources.settings_profile
import africa.devhub.resources.settings_save
import africa.devhub.resources.settings_saved
import africa.devhub.resources.settings_ui_lang
import africa.devhub.settings.SettingsForm
import africa.devhub.settings.SettingsState
import africa.devhub.ui.components.ScreenColumn
import africa.devhub.ui.sos.failureLabel
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.selection.toggleable
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import org.jetbrains.compose.resources.stringResource

/** Réglages du compte (PR1, PR4, PR14, Y3) et suppression (A3). */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun SettingsScreen(
    state: SettingsState,
    handle: String,
    onEdit: ((SettingsForm) -> SettingsForm) -> Unit,
    onSave: () -> Unit,
    onDelete: (String) -> Unit,
) {
    val f = state.form
    ScreenColumn {
        Title(stringResource(Res.string.settings_profile))
        OutlinedTextField(
            value = f.displayName,
            onValueChange = { v -> onEdit { it.copy(displayName = v.take(80)) } },
            label = { Text(stringResource(Res.string.settings_name)) },
            isError = !f.displayNameValid,
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        OutlinedTextField(
            value = f.bio,
            onValueChange = { v -> onEdit { it.copy(bio = v.take(500)) } },
            label = { Text(stringResource(Res.string.settings_bio)) },
            minLines = 2,
            modifier = Modifier.fillMaxWidth(),
        )
        OutlinedTextField(
            value = f.country,
            onValueChange = { v -> onEdit { it.copy(country = v.trim().uppercase().take(2)) } },
            label = { Text(stringResource(Res.string.settings_country)) },
            isError = !f.countryValid,
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        OutlinedTextField(
            value = f.lookingFor,
            onValueChange = { v -> onEdit { it.copy(lookingFor = v.take(200)) } },
            label = { Text(stringResource(Res.string.settings_looking_for)) },
            modifier = Modifier.fillMaxWidth(),
        )
        Text(stringResource(Res.string.settings_languages), style = MaterialTheme.typography.titleSmall)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("fr" to Res.string.lang_fr, "en" to Res.string.lang_en).forEach { (code, label) ->
                val selected = code in f.languages
                FilterChip(
                    selected = selected,
                    // Au moins une langue : la dernière ne se décoche pas.
                    onClick = { onEdit { if (selected && it.languages.size > 1) it.copy(languages = it.languages - code) else if (!selected) it.copy(languages = it.languages + code) else it } },
                    label = { Text(stringResource(label)) },
                )
            }
        }
        Text(stringResource(Res.string.settings_ui_lang), style = MaterialTheme.typography.titleSmall)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("fr" to Res.string.lang_fr, "en" to Res.string.lang_en).forEach { (code, label) ->
                FilterChip(selected = f.uiLang == code, onClick = { onEdit { it.copy(uiLang = code) } }, label = { Text(stringResource(label)) })
            }
        }
        SwitchRow(stringResource(Res.string.settings_mission), f.mission, stringResource(Res.string.settings_mission_hint)) { v -> onEdit { it.copy(mission = v) } }
        SwitchRow(stringResource(Res.string.settings_email), f.emailNotifications) { v -> onEdit { it.copy(emailNotifications = v) } }

        Title(stringResource(Res.string.settings_privacy))
        SwitchRow(stringResource(Res.string.privacy_unlisted), f.privacy.unlisted) { v -> onEdit { it.copy(privacy = it.privacy.copy(unlisted = v)) } }
        SwitchRow(stringResource(Res.string.privacy_country), f.privacy.hideCountry) { v -> onEdit { it.copy(privacy = it.privacy.copy(hideCountry = v)) } }
        SwitchRow(stringResource(Res.string.privacy_availability), f.privacy.hideAvailability) { v -> onEdit { it.copy(privacy = it.privacy.copy(hideAvailability = v)) } }
        SwitchRow(stringResource(Res.string.privacy_stats), f.privacy.hideStats) { v -> onEdit { it.copy(privacy = it.privacy.copy(hideStats = v)) } }

        when {
            state.saved -> Notice(stringResource(Res.string.settings_saved), error = false)
            state.error == "offline" -> Notice(stringResource(Res.string.settings_offline), error = true)
            state.error != null -> Notice(stringResource(failureLabel(state.error)), error = true)
        }
        Button(onClick = onSave, enabled = f.valid && !state.saving, modifier = Modifier.fillMaxWidth()) {
            Text(stringResource(Res.string.settings_save))
        }

        Title(stringResource(Res.string.settings_danger))
        Text(stringResource(Res.string.settings_delete_text, handle), style = MaterialTheme.typography.bodyMedium)
        var confirm by rememberSaveable { mutableStateOf("") }
        OutlinedTextField(
            value = confirm,
            onValueChange = { confirm = it.take(40) },
            label = { Text(stringResource(Res.string.settings_delete_handle)) },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        state.deleteError?.let { Notice(stringResource(failureLabel(it)), error = true) }
        Button(
            onClick = { onDelete(confirm) },
            enabled = !state.deleting && confirm.trim().equals(handle, ignoreCase = true),
            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error, contentColor = MaterialTheme.colorScheme.onError),
            modifier = Modifier.fillMaxWidth(),
        ) { Text(stringResource(Res.string.settings_delete)) }
    }
}

@Composable
private fun SwitchRow(label: String, checked: Boolean, hint: String? = null, onChange: (Boolean) -> Unit) {
    Row(
        Modifier.fillMaxWidth().toggleable(value = checked, role = Role.Switch, onValueChange = onChange).padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(label, style = MaterialTheme.typography.bodyLarge)
            hint?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
        }
        Switch(checked = checked, onCheckedChange = null)
    }
}

@Composable
private fun Title(text: String) {
    Text(text, style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(top = 8.dp).semantics { heading() })
}

@Composable
private fun Notice(text: String, error: Boolean) {
    Text(
        text,
        color = if (error) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
    )
}
