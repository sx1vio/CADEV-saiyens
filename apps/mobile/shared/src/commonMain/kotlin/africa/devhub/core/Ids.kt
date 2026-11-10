package africa.devhub.core

import africa.devhub.platform.secureRandomBytes

/**
 * UUID v4 (RFC 9562) tiré du générateur cryptographique du système : `clientId` des contenus
 * et `Idempotency-Key` des écritures (ADR-0008), que l'API exige au format UUID.
 */
fun newUuid(): String {
    val b = secureRandomBytes(16)
    b[6] = ((b[6].toInt() and 0x0f) or 0x40).toByte() // version 4
    b[8] = ((b[8].toInt() and 0x3f) or 0x80).toByte() // variante RFC
    val hex = b.joinToString("") { (it.toInt() and 0xff).toString(16).padStart(2, '0') }
    return "${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-" +
        "${hex.substring(16, 20)}-${hex.substring(20)}"
}
