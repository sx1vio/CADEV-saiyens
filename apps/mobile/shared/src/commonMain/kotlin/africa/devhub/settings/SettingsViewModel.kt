package africa.devhub.settings

import africa.devhub.core.newUuid
import africa.devhub.me.AvailabilityUpdate
import africa.devhub.me.Me
import africa.devhub.me.MeApi
import africa.devhub.me.Privacy
import africa.devhub.me.UpdateMeRequest
import africa.devhub.network.ApiException
import africa.devhub.offline.UserSpace
import africa.devhub.passport.PassportApi
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** Formulaire des réglages (PR1, PR4, PR14, Y3). */
data class SettingsForm(
    val displayName: String,
    val bio: String,
    val country: String,
    val lookingFor: String,
    val languages: List<String>,
    val uiLang: String,
    val emailNotifications: Boolean,
    val mission: Boolean,
    val privacy: Privacy,
) {
    val displayNameValid get() = displayName.trim().length in 1..80
    val countryValid get() = country.isBlank() || Regex("^[A-Z]{2}$").matches(country.trim())
    val valid get() = displayNameValid && countryValid && bio.length <= 500 && lookingFor.length <= 200 && languages.isNotEmpty()

    fun toRequest() = UpdateMeRequest(
        displayName = displayName.trim(),
        bio = bio.trim().ifEmpty { null },
        country = country.trim().uppercase().ifEmpty { null },
        lookingFor = lookingFor.trim().ifEmpty { null },
        languages = languages,
        uiLang = uiLang,
        emailNotifications = emailNotifications,
        availability = AvailabilityUpdate(mission),
        privacy = privacy,
    )

    companion object {
        fun from(me: Me, mission: Boolean) = SettingsForm(
            displayName = me.displayName,
            bio = me.bio.orEmpty(),
            country = me.country.orEmpty(),
            lookingFor = me.lookingFor.orEmpty(),
            languages = me.languages.ifEmpty { listOf("fr") },
            uiLang = me.uiLang,
            emailNotifications = me.emailNotifications,
            mission = mission,
            privacy = me.privacy,
        )
    }
}

data class SettingsState(
    val form: SettingsForm,
    val saving: Boolean = false,
    val saved: Boolean = false,
    /** Code de l'API, `offline` ou `network`. */
    val error: String? = null,
    val deleting: Boolean = false,
    val deleteError: String? = null,
)

/**
 * Réglages du compte : en ligne seulement (le profil nourrit le matching et doit être exact),
 * et suppression du compte (A3) après avoir retapé son pseudo.
 */
class SettingsViewModel(
    private val meApi: MeApi,
    passportApi: PassportApi,
    private val me: Me,
    private val space: UserSpace,
    private val onSaved: (Me) -> Unit,
    private val onDeleted: () -> Unit,
) : ViewModel() {
    private val _state = MutableStateFlow(SettingsState(SettingsForm.from(me, mission = false)))
    val state: StateFlow<SettingsState> = _state.asStateFlow()
    private var key = newUuid()

    init {
        // « Disponible pour une mission » n'est pas dans /me : on le lit sur son Passport.
        viewModelScope.launch {
            runCatching { passportApi.passport(me.handle) }.getOrNull()?.user?.availability?.mission?.let { mission ->
                _state.update { it.copy(form = it.form.copy(mission = mission)) }
            }
        }
    }

    fun edit(transform: (SettingsForm) -> SettingsForm) =
        _state.update { it.copy(form = transform(it.form), saved = false, error = null) }

    fun save() {
        val s = _state.value
        if (!s.form.valid || s.saving) return
        if (!space.connectivity.online.value) {
            _state.update { it.copy(error = "offline") }
            return
        }
        _state.value = s.copy(saving = true, error = null)
        viewModelScope.launch {
            try {
                val updated = meApi.update(s.form.toRequest(), key)
                key = newUuid()
                onSaved(updated)
                _state.update { it.copy(saving = false, saved = true) }
            } catch (e: CancellationException) {
                throw e
            } catch (e: ApiException) {
                _state.update { it.copy(saving = false, error = e.code ?: "http_${e.status}") }
            } catch (_: Exception) {
                space.connectivity.reportUnreachable()
                _state.update { it.copy(saving = false, error = "offline") }
            }
        }
    }

    fun deleteAccount(confirmHandle: String) {
        val s = _state.value
        if (s.deleting || !confirmHandle.trim().equals(me.handle, ignoreCase = true)) return
        _state.value = s.copy(deleting = true, deleteError = null)
        viewModelScope.launch {
            try {
                meApi.delete(confirmHandle.trim())
                onDeleted()
            } catch (e: CancellationException) {
                throw e
            } catch (e: ApiException) {
                _state.update { it.copy(deleting = false, deleteError = e.code ?: "http_${e.status}") }
            } catch (_: Exception) {
                _state.update { it.copy(deleting = false, deleteError = "offline") }
            }
        }
    }
}
