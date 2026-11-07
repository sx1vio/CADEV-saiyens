import Network
import Shared

/// État du réseau du système (NWPathMonitor) pour l'indicateur et la reprise des envois (O3).
/// L'accès réel à DevHub est vérifié par les envois eux-mêmes, côté Kotlin.
final class NetworkMonitor: NSObject, ConnectivityProbe {
    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "africa.devhub.network")

    func start(onChange: @escaping (KotlinBoolean) -> Void) {
        monitor.pathUpdateHandler = { path in
            onChange(KotlinBoolean(value: path.status == .satisfied))
        }
        monitor.start(queue: queue)
    }

    deinit {
        monitor.cancel()
    }
}
