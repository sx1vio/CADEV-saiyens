package africa.devhub.offline

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Source de connectivité de la plateforme : ConnectivityManager (Android), NWPathMonitor (iOS,
 * en Swift). [start] est appelé une fois ; [onChange] peut l'être depuis n'importe quel fil.
 */
interface ConnectivityProbe {
    fun start(onChange: (Boolean) -> Unit)
}

/**
 * Le système ne suffit pas : il dit « connecté » derrière un portail captif ou une 2G muette
 * (04 § 6). Un échec réseau réel rend l'état hors ligne jusqu'au prochain succès ou changement.
 */
class Connectivity(probe: ConnectivityProbe?) {
    private var system = true
    private var unreachable = false
    private val _online = MutableStateFlow(true)

    /** État affiché : le système a un réseau et la dernière requête est passée. */
    val online: StateFlow<Boolean> = _online.asStateFlow()

    private val _systemOnline = MutableStateFlow(true)

    /** Le système annonce un réseau : on peut tenter un envoi (qui vérifiera le reste). */
    val systemOnline: StateFlow<Boolean> = _systemOnline.asStateFlow()

    init {
        probe?.start { available ->
            system = available
            unreachable = false
            publish()
        }
    }

    /** Une requête vient d'échouer faute de réseau. */
    fun reportUnreachable() {
        unreachable = true
        publish()
    }

    /** Une requête vient d'aboutir. */
    fun reportReachable() {
        if (!unreachable && system) return
        unreachable = false
        system = true
        publish()
    }

    private fun publish() {
        _systemOnline.value = system
        _online.value = system && !unreachable
    }
}
