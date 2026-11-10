import AuthenticationServices
import Shared
import UIKit

/// Connexion GitHub dans le navigateur système (ASWebAuthenticationSession, RFC 8252).
/// Le retour `devhub://auth/callback?…` est capté par la session, sans déclarer de schéma d'URL.
final class WebAuthSession: NSObject, IosAuthSession, ASWebAuthenticationPresentationContextProviding {
    private var session: ASWebAuthenticationSession?

    func start(url: String, callbackScheme: String, completion: @escaping (String?) -> Void) {
        guard let target = URL(string: url) else {
            completion(nil)
            return
        }
        DispatchQueue.main.async {
            self.session?.cancel()
            let session = ASWebAuthenticationSession(url: target, callbackURLScheme: callbackScheme) {
                [weak self] callback, _ in
                // Erreur ou annulation : callback est nil, ce qui vaut annulation côté Kotlin.
                self?.session = nil
                completion(callback?.absoluteString)
            }
            session.presentationContextProvider = self
            // Garde les cookies du navigateur : une session GitHub déjà ouverte évite de retaper son mot de passe.
            session.prefersEphemeralWebBrowserSession = false
            self.session = session
            if !session.start() {
                self.session = nil
                completion(nil)
            }
        }
    }

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap(\.windows)
            .first { $0.isKeyWindow } ?? ASPresentationAnchor()
    }
}
