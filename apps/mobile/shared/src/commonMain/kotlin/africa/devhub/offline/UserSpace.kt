package africa.devhub.offline

import africa.devhub.notifications.EventStream
import africa.devhub.notifications.NotificationHub
import africa.devhub.notifications.NotificationsApi
import africa.devhub.platform.sha256
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job

/**
 * Données hors ligne d'un compte (O9) : cache, file d'actions et moteur, dans un dossier propre à
 * l'utilisateur. Un autre compte sur le même téléphone ne voit ni n'envoie rien de celui-ci ;
 * la déconnexion efface le dossier.
 */
class UserSpace(
    val userId: String,
    private val files: LocalFiles,
    sender: ActionSender,
    val connectivity: Connectivity,
    scope: CoroutineScope,
    now: () -> Long,
    notificationsApi: NotificationsApi,
    eventStream: EventStream,
) {
    val cache = ReadCache(files, now)
    val outbox = OutboxStore(files)
    val engine = SyncEngine(outbox, sender, connectivity, scope, now)
    val writer = ActionWriter(outbox, engine, now)
    val notifications = NotificationHub(notificationsApi, eventStream, connectivity, scope)
    private val job: Job = engine.start()

    fun close(wipe: Boolean) {
        notifications.stop()
        job.cancel()
        if (wipe) files.deleteAll()
    }

    companion object {
        /** Nom de dossier dérivé de l'identifiant, sans l'exposer tel quel sur le disque. */
        fun dirName(userId: String): String =
            sha256(userId.encodeToByteArray()).take(12).joinToString("") { (it.toInt() and 0xff).toString(16).padStart(2, '0') }
    }
}
