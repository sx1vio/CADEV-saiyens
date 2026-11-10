package africa.devhub.passport

/** Numéro du jour (depuis le 1er janvier 1970) d'une date « AAAA-MM-JJ » ou d'un horodatage ISO ; null si illisible. */
fun epochDayOf(iso: String): Long? {
    val parts = iso.take(10).split("-")
    if (parts.size != 3) return null
    val y = parts[0].toIntOrNull() ?: return null
    val m = parts[1].toIntOrNull()?.takeIf { it in 1..12 } ?: return null
    val d = parts[2].toIntOrNull()?.takeIf { it in 1..31 } ?: return null
    // Jours depuis une date civile (algorithme de Howard Hinnant).
    val yy = if (m <= 2) y - 1 else y
    val era = (if (yy >= 0) yy else yy - 399) / 400
    val yoe = yy - era * 400
    val doy = (153 * (m + (if (m > 2) -3 else 9)) + 2) / 5 + d - 1
    val doe = yoe * 365 + yoe / 4 - yoe / 100 + doy
    return era * 146097L + doe - 719468L
}

/** Preuves du journal rangées par jour (le jour, pas l'heure) : sert à la grille du bandeau. */
fun proofsPerDay(events: List<ProofEvent>): Map<Long, Int> =
    events.filter { it.revertedAt == null }
        .mapNotNull { epochDayOf(it.createdAt) }
        .groupingBy { it }
        .eachCount()

/** Les [days] derniers jours jusqu'à [today] compris, du plus ancien au plus récent ; 0 sans activité. */
fun lastDays(perDay: Map<Long, Int>, today: Long, days: Int): List<Int> =
    List(days) { i -> perDay[today - (days - 1 - i)] ?: 0 }

/** Niveau (0 à 4) d'une case du bandeau du profil. */
fun coverLevel(count: Int): Int = when {
    count <= 0 -> 0
    count < 2 -> 1
    count < 4 -> 2
    count < 7 -> 3
    else -> 4
}

/** Niveau (0 à 4) d'une case de la grille GitHub, comme la `Heatmap` du web. */
fun githubLevel(count: Int): Int = when {
    count <= 0 -> 0
    count == 1 -> 1
    count <= 2 -> 2
    count <= 4 -> 3
    else -> 4
}
