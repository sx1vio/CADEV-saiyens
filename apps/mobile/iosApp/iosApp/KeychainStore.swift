import Foundation
import Security
import Shared

/// Jeton de session dans la Keychain (ADR-0021) : chiffré par le système, lisible après le
/// premier déverrouillage, jamais synchronisé iCloud ni restauré sur un autre appareil.
final class KeychainStore: NSObject, SecureStore {
    private let service = "africa.devhub.app"

    func read(key: String) -> String? {
        var query = baseQuery(key)
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess,
              let data = item as? Data
        else { return nil }
        return String(data: data, encoding: .utf8)
    }

    func write(key: String, value: String) {
        let attributes: [String: Any] = [
            kSecValueData as String: Data(value.utf8),
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
        ]
        let status = SecItemUpdate(baseQuery(key) as CFDictionary, attributes as CFDictionary)
        if status == errSecItemNotFound {
            let item = baseQuery(key).merging(attributes) { _, new in new }
            SecItemAdd(item as CFDictionary, nil)
        }
    }

    func delete(key: String) {
        SecItemDelete(baseQuery(key) as CFDictionary)
    }

    private func baseQuery(_ key: String) -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
        ]
    }
}
