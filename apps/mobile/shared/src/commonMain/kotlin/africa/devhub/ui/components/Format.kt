package africa.devhub.ui.components

/** « 2026-10-01T… » → « oct. 2026 » ; [months] : noms courts traduits, janvier en premier. */
fun monthYear(iso: String, months: List<String>): String {
    val month = iso.substring(5, 7).toIntOrNull() ?: return iso.take(7)
    return "${months.getOrElse(month - 1) { "" }} ${iso.take(4)}".trim()
}

/** « 2026-11-06T… » → « 6 nov. 2026 ». */
fun dayMonthYear(iso: String, months: List<String>): String {
    val day = iso.substring(8, 10).toIntOrNull() ?: return iso.take(10)
    return "$day ${monthYear(iso, months)}"
}
