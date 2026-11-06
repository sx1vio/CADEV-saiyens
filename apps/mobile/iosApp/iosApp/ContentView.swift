import Shared
import SwiftUI
import UIKit

/// Héberge l'interface Compose partagée (module Kotlin `shared`).
struct ContentView: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> UIViewController {
        let info = Bundle.main.infoDictionary ?? [:]
        let apiUrl = info["DevHubApiUrl"] as? String ?? "http://localhost:3000"
        let devSignIn = (info["DevHubDevSignIn"] as? String) == "YES"
        return MainViewControllerKt.MainViewController(
            apiBaseUrl: apiUrl,
            devSignIn: devSignIn,
            secureStore: KeychainStore(),
            authSession: WebAuthSession()
        )
    }

    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {}
}
