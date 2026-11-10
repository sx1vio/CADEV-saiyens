package africa.devhub.platform

/** Octets aléatoires d'un générateur cryptographique du système. */
expect fun secureRandomBytes(size: Int): ByteArray

/** Empreinte SHA-256. */
expect fun sha256(input: ByteArray): ByteArray
