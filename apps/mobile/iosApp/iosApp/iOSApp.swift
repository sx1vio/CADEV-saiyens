import SwiftUI

@main
struct iOSApp: App {
    var body: some Scene {
        WindowGroup {
            // Compose gère lui-même les zones sûres (encoche, clavier).
            ContentView().ignoresSafeArea()
        }
    }
}
