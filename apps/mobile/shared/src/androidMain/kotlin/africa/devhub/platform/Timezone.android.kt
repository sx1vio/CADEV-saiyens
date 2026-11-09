package africa.devhub.platform

import java.time.Instant
import java.time.ZoneId

actual fun utcOffsetMinutes(timezone: String): Int? = runCatching {
    ZoneId.of(timezone).rules.getOffset(Instant.now()).totalSeconds / 60
}.getOrNull()

actual fun deviceTimezone(): String = ZoneId.systemDefault().id
