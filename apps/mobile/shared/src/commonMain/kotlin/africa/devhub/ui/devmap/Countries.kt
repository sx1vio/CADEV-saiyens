package africa.devhub.ui.devmap

import androidx.compose.runtime.Composable
import androidx.compose.ui.text.intl.Locale

private val NAMES = mapOf(
    "DZ" to ("Algérie" to "Algeria"), "AO" to ("Angola" to "Angola"), "BJ" to ("Bénin" to "Benin"),
    "BW" to ("Botswana" to "Botswana"), "BF" to ("Burkina Faso" to "Burkina Faso"), "BI" to ("Burundi" to "Burundi"),
    "CM" to ("Cameroun" to "Cameroon"), "CV" to ("Cap-Vert" to "Cape Verde"), "CF" to ("Centrafrique" to "Central African Republic"),
    "TD" to ("Tchad" to "Chad"), "KM" to ("Comores" to "Comoros"), "CG" to ("Congo" to "Congo"),
    "CD" to ("RD Congo" to "DR Congo"), "CI" to ("Côte d’Ivoire" to "Côte d’Ivoire"), "DJ" to ("Djibouti" to "Djibouti"),
    "EG" to ("Égypte" to "Egypt"), "GQ" to ("Guinée équatoriale" to "Equatorial Guinea"), "ER" to ("Érythrée" to "Eritrea"),
    "SZ" to ("Eswatini" to "Eswatini"), "ET" to ("Éthiopie" to "Ethiopia"), "GA" to ("Gabon" to "Gabon"),
    "GM" to ("Gambie" to "Gambia"), "GH" to ("Ghana" to "Ghana"), "GN" to ("Guinée" to "Guinea"),
    "GW" to ("Guinée-Bissau" to "Guinea-Bissau"), "KE" to ("Kenya" to "Kenya"), "LS" to ("Lesotho" to "Lesotho"),
    "LR" to ("Liberia" to "Liberia"), "LY" to ("Libye" to "Libya"), "MG" to ("Madagascar" to "Madagascar"),
    "MW" to ("Malawi" to "Malawi"), "ML" to ("Mali" to "Mali"), "MR" to ("Mauritanie" to "Mauritania"),
    "MU" to ("Maurice" to "Mauritius"), "MA" to ("Maroc" to "Morocco"), "MZ" to ("Mozambique" to "Mozambique"),
    "NA" to ("Namibie" to "Namibia"), "NE" to ("Niger" to "Niger"), "NG" to ("Nigeria" to "Nigeria"),
    "RW" to ("Rwanda" to "Rwanda"), "ST" to ("São Tomé-et-Príncipe" to "São Tomé and Príncipe"), "SN" to ("Sénégal" to "Senegal"),
    "SC" to ("Seychelles" to "Seychelles"), "SL" to ("Sierra Leone" to "Sierra Leone"), "SO" to ("Somalie" to "Somalia"),
    "ZA" to ("Afrique du Sud" to "South Africa"), "SS" to ("Soudan du Sud" to "South Sudan"), "SD" to ("Soudan" to "Sudan"),
    "TZ" to ("Tanzanie" to "Tanzania"), "TG" to ("Togo" to "Togo"), "TN" to ("Tunisie" to "Tunisia"),
    "UG" to ("Ouganda" to "Uganda"), "ZM" to ("Zambie" to "Zambia"), "ZW" to ("Zimbabwe" to "Zimbabwe"),
    "FR" to ("France" to "France"), "BE" to ("Belgique" to "Belgium"), "CA" to ("Canada" to "Canada"),
    "GB" to ("Royaume-Uni" to "United Kingdom"), "US" to ("États-Unis" to "United States"),
)

/** Nom du pays dans la langue de l'appareil ; le code ISO si le pays n'est pas connu. */
@Composable
fun countryName(code: String): String {
    val pair = NAMES[code.uppercase()] ?: return code
    return if (Locale.current.language == "fr") pair.first else pair.second
}
