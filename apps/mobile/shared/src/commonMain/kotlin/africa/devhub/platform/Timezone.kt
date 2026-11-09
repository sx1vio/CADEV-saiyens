package africa.devhub.platform

/** Décalage UTC (en minutes, heure d'été comprise) d'un fuseau IANA, ou null s'il est inconnu. */
expect fun utcOffsetMinutes(timezone: String): Int?

/** « UTC+3 », « UTC-5 », « UTC+5:30 » : le format des cartes du web. */
fun formatUtc(minutes: Int): String {
    val sign = if (minutes < 0) "-" else "+"
    val abs = kotlin.math.abs(minutes)
    val rest = abs % 60
    return "UTC$sign${abs / 60}" + if (rest == 0) "" else ":" + rest.toString().padStart(2, '0')
}

/** Fuseau IANA de l'appareil (« Africa/Abidjan »), « UTC » à défaut. */
expect fun deviceTimezone(): String
