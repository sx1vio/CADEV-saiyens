package africa.devhub.onboarding

/** Pays d'Afrique proposés à l'accueil ; l'API stocke le code ISO à deux lettres. */
data class Country(val code: String, val fr: String, val en: String) {
    fun name(lang: String) = if (lang == "en") en else fr
}

val AfricanCountries: List<Country> = listOf(
    Country("DZ", "Algérie", "Algeria"),
    Country("AO", "Angola", "Angola"),
    Country("BJ", "Bénin", "Benin"),
    Country("BW", "Botswana", "Botswana"),
    Country("BF", "Burkina Faso", "Burkina Faso"),
    Country("BI", "Burundi", "Burundi"),
    Country("CM", "Cameroun", "Cameroon"),
    Country("CV", "Cap-Vert", "Cape Verde"),
    Country("CF", "République centrafricaine", "Central African Republic"),
    Country("TD", "Tchad", "Chad"),
    Country("KM", "Comores", "Comoros"),
    Country("CG", "Congo", "Congo"),
    Country("CD", "RD Congo", "DR Congo"),
    Country("CI", "Côte d’Ivoire", "Côte d’Ivoire"),
    Country("DJ", "Djibouti", "Djibouti"),
    Country("EG", "Égypte", "Egypt"),
    Country("GQ", "Guinée équatoriale", "Equatorial Guinea"),
    Country("ER", "Érythrée", "Eritrea"),
    Country("SZ", "Eswatini", "Eswatini"),
    Country("ET", "Éthiopie", "Ethiopia"),
    Country("GA", "Gabon", "Gabon"),
    Country("GM", "Gambie", "Gambia"),
    Country("GH", "Ghana", "Ghana"),
    Country("GN", "Guinée", "Guinea"),
    Country("GW", "Guinée-Bissau", "Guinea-Bissau"),
    Country("KE", "Kenya", "Kenya"),
    Country("LS", "Lesotho", "Lesotho"),
    Country("LR", "Liberia", "Liberia"),
    Country("LY", "Libye", "Libya"),
    Country("MG", "Madagascar", "Madagascar"),
    Country("MW", "Malawi", "Malawi"),
    Country("ML", "Mali", "Mali"),
    Country("MR", "Mauritanie", "Mauritania"),
    Country("MU", "Maurice", "Mauritius"),
    Country("MA", "Maroc", "Morocco"),
    Country("MZ", "Mozambique", "Mozambique"),
    Country("NA", "Namibie", "Namibia"),
    Country("NE", "Niger", "Niger"),
    Country("NG", "Nigeria", "Nigeria"),
    Country("RW", "Rwanda", "Rwanda"),
    Country("ST", "Sao Tomé-et-Principe", "São Tomé and Príncipe"),
    Country("SN", "Sénégal", "Senegal"),
    Country("SC", "Seychelles", "Seychelles"),
    Country("SL", "Sierra Leone", "Sierra Leone"),
    Country("SO", "Somalie", "Somalia"),
    Country("ZA", "Afrique du Sud", "South Africa"),
    Country("SS", "Soudan du Sud", "South Sudan"),
    Country("SD", "Soudan", "Sudan"),
    Country("TZ", "Tanzanie", "Tanzania"),
    Country("TG", "Togo", "Togo"),
    Country("TN", "Tunisie", "Tunisia"),
    Country("UG", "Ouganda", "Uganda"),
    Country("ZM", "Zambie", "Zambia"),
    Country("ZW", "Zimbabwe", "Zimbabwe"),
)

/** Pays dont le nom contient [query], sans tenir compte des accents ni de la casse, les plus proches d'abord. */
fun searchCountries(query: String, lang: String): List<Country> {
    val q = query.trim().fold()
    if (q.isEmpty()) return AfricanCountries
    return AfricanCountries
        .filter { it.name(lang).fold().contains(q) || it.code.equals(q, ignoreCase = true) }
        .sortedBy { if (it.name(lang).fold().startsWith(q)) 0 else 1 }
}

private fun String.fold(): String =
    lowercase().map {
        when (it) {
            'é', 'è', 'ê', 'ë' -> 'e'
            'à', 'â', 'ä' -> 'a'
            'î', 'ï' -> 'i'
            'ô', 'ö' -> 'o'
            'û', 'ù', 'ü' -> 'u'
            'ç' -> 'c'
            '’' -> '\''
            else -> it
        }
    }.joinToString("")
