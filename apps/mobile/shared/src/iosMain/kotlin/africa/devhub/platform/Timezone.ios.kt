package africa.devhub.platform

import platform.Foundation.NSTimeZone
import platform.Foundation.timeZoneWithName

actual fun utcOffsetMinutes(timezone: String): Int? =
    NSTimeZone.timeZoneWithName(timezone)?.let { (it.secondsFromGMT / 60).toInt() }

actual fun deviceTimezone(): String = platform.Foundation.NSTimeZone.localTimeZone.name
