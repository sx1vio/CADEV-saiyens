package africa.devhub.jobs

import africa.devhub.core.maskSecrets
import africa.devhub.network.ApiException
import africa.devhub.network.NetworkException
import africa.devhub.offline.CacheKey
import africa.devhub.offline.UserSpace
import africa.devhub.offline.readThrough
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** Filtres appliqués sur la liste reçue (l'API sert toutes les offres ouvertes en une fois). */
data class JobFilters(val text: String = "", val contract: String? = null, val workMode: String? = null) {
    fun matches(job: Job): Boolean {
        val needle = text.trim().lowercase()
        return (contract == null || job.contract == contract) &&
            (workMode == null || job.workMode == workMode) &&
            (needle.isEmpty() || listOf(job.title, job.company, job.location).any { it.lowercase().contains(needle) } ||
                job.tags.any { it.lowercase().contains(needle) })
    }
}

data class JobsState(
    val all: List<Job> = emptyList(),
    val filters: JobFilters = JobFilters(),
    val loading: Boolean = true,
    val failed: Boolean = false,
    val cachedAt: Long? = null,
) {
    val items get() = all.filter(filters::matches)
}

class JobsViewModel(private val api: JobsApi, private val space: UserSpace? = null) : ViewModel() {
    private val _state = MutableStateFlow(JobsState())
    val state: StateFlow<JobsState> = _state.asStateFlow()

    init {
        reload()
    }

    fun setFilters(filters: JobFilters) = _state.update { it.copy(filters = filters) }

    fun reload() {
        _state.update { it.copy(loading = true, failed = false) }
        viewModelScope.launch {
            try {
                val fetched = readThrough(space, CacheKey.jobs(), JobList.serializer()) { api.jobs() }
                _state.update { it.copy(all = fetched.value.data, loading = false, cachedAt = fetched.cachedAt) }
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                _state.update { it.copy(loading = false, failed = true) }
            }
        }
    }
}

sealed interface JobState {
    data object Loading : JobState

    data object NotFound : JobState

    data object Failed : JobState

    data class Loaded(
        val job: Job,
        /** Ma candidature à cette offre, si j'en ai une. */
        val application: MyApplication? = null,
        val sending: Boolean = false,
        /** Code d'erreur de la dernière candidature, ou `offline`. */
        val error: String? = null,
    ) : JobState
}

/** Une offre ; candidater sur DevHub (en ligne : c'est un envoi délibéré, réponse immédiate). */
class JobViewModel(private val api: JobsApi, private val jobId: String, private val space: UserSpace) : ViewModel() {
    private val _state = MutableStateFlow<JobState>(JobState.Loading)
    val state: StateFlow<JobState> = _state.asStateFlow()

    init {
        viewModelScope.launch { load() }
    }

    fun refresh() {
        viewModelScope.launch { load() }
    }

    fun apply(message: String) {
        val current = _state.value as? JobState.Loaded ?: return
        val text = maskSecrets(message.trim()).text
        if (current.sending || text.length !in APPLY_MESSAGE_MIN..APPLY_MESSAGE_MAX || current.job.applyUrl != null) return
        if (!space.connectivity.online.value) {
            _state.value = current.copy(error = "offline")
            return
        }
        _state.value = current.copy(sending = true, error = null)
        viewModelScope.launch {
            val error = try {
                api.apply(jobId, text)
                null
            } catch (e: CancellationException) {
                throw e
            } catch (e: ApiException) {
                e.code ?: "http_${e.status}"
            } catch (_: NetworkException) {
                space.connectivity.reportUnreachable()
                "offline"
            }
            // « Déjà candidaté » n'est pas un échec : la candidature existe, on la relit.
            _state.update { (it as? JobState.Loaded)?.copy(sending = false, error = error.takeUnless { e -> e == "application.exists" }) ?: it }
            if (error == null || error == "application.exists") load()
        }
    }

    private suspend fun load() {
        try {
            val job = readThrough(space, CacheKey.job(jobId), Job.serializer()) { api.job(jobId) }.value
            val mine = runCatching { api.myApplications().data.firstOrNull { it.job.id == jobId && it.status != "withdrawn" } }.getOrNull()
            _state.update { (it as? JobState.Loaded)?.copy(job = job, application = mine) ?: JobState.Loaded(job, mine) }
        } catch (e: CancellationException) {
            throw e
        } catch (e: ApiException) {
            if (_state.value !is JobState.Loaded) _state.value = if (e.status == 404) JobState.NotFound else JobState.Failed
        } catch (_: Exception) {
            if (_state.value !is JobState.Loaded) _state.value = JobState.Failed
        }
    }
}

data class ApplicationsState(
    val items: List<MyApplication> = emptyList(),
    val loading: Boolean = true,
    val failed: Boolean = false,
    val error: String? = null,
)

/** Mes candidatures et leur avancement ; retirer une candidature. */
class ApplicationsViewModel(private val api: JobsApi, private val space: UserSpace) : ViewModel() {
    private val _state = MutableStateFlow(ApplicationsState())
    val state: StateFlow<ApplicationsState> = _state.asStateFlow()

    init {
        reload()
        // Une entreprise fait avancer une candidature : la liste se relit.
        viewModelScope.launch { space.notifications.incoming.collect { if (it.type == "application.status") reload() } }
    }

    fun reload() {
        _state.update { it.copy(loading = true, failed = false) }
        viewModelScope.launch {
            try {
                val data = api.myApplications().data
                _state.update { it.copy(items = data, loading = false) }
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                _state.update { it.copy(loading = false, failed = true) }
            }
        }
    }

    fun withdraw(id: String) {
        if (!space.connectivity.online.value) {
            _state.update { it.copy(error = "offline") }
            return
        }
        viewModelScope.launch {
            try {
                api.withdraw(id)
                _state.update { s -> s.copy(error = null, items = s.items.map { if (it.id == id) it.copy(status = "withdrawn") else it }) }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _state.update { it.copy(error = (e as? ApiException)?.code ?: "offline") }
            }
        }
    }
}
