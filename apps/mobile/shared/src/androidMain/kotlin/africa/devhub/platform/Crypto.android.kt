package africa.devhub.platform

import java.security.MessageDigest
import java.security.SecureRandom

private val random = SecureRandom()

actual fun secureRandomBytes(size: Int): ByteArray = ByteArray(size).also(random::nextBytes)

actual fun sha256(input: ByteArray): ByteArray = MessageDigest.getInstance("SHA-256").digest(input)
