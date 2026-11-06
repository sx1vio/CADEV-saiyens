@file:OptIn(ExperimentalForeignApi::class, ExperimentalUnsignedTypes::class)

package africa.devhub.platform

import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.cinterop.addressOf
import kotlinx.cinterop.convert
import kotlinx.cinterop.usePinned
import platform.CoreCrypto.CC_SHA256
import platform.CoreCrypto.CC_SHA256_DIGEST_LENGTH
import platform.Security.SecRandomCopyBytes
import platform.Security.errSecSuccess
import platform.Security.kSecRandomDefault

actual fun secureRandomBytes(size: Int): ByteArray {
    val bytes = ByteArray(size)
    if (size == 0) return bytes
    val status = bytes.usePinned { SecRandomCopyBytes(kSecRandomDefault, size.convert(), it.addressOf(0)) }
    check(status == errSecSuccess) { "SecRandomCopyBytes a échoué ($status)" }
    return bytes
}

actual fun sha256(input: ByteArray): ByteArray {
    val digest = UByteArray(CC_SHA256_DIGEST_LENGTH)
    digest.usePinned { out ->
        if (input.isEmpty()) {
            CC_SHA256(null, 0u, out.addressOf(0))
        } else {
            input.usePinned { data -> CC_SHA256(data.addressOf(0), input.size.convert(), out.addressOf(0)) }
        }
    }
    return digest.asByteArray()
}
