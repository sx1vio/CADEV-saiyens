package africa.devhub.platform

import africa.devhub.offline.ConnectivityProbe
import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities

/** Réseau par défaut du système (ConnectivityManager) ; l'accès réel est vérifié par les envois. */
class AndroidConnectivityProbe(context: Context) : ConnectivityProbe {
    private val manager = context.applicationContext.getSystemService(ConnectivityManager::class.java)

    override fun start(onChange: (Boolean) -> Unit) {
        val current = manager.getNetworkCapabilities(manager.activeNetwork)
        onChange(current?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true)
        manager.registerDefaultNetworkCallback(
            object : ConnectivityManager.NetworkCallback() {
                override fun onAvailable(network: Network) = onChange(true)

                override fun onLost(network: Network) = onChange(false)
            },
        )
    }
}
