package africa.devhub.ui

import africa.devhub.ui.components.dayMonthYear
import africa.devhub.ui.components.monthYear
import kotlin.test.Test
import kotlin.test.assertEquals

class FormatTest {
    private val months = listOf("janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc.")

    @Test
    fun formatsIsoDates() {
        assertEquals("oct. 2026", monthYear("2026-10-01T00:00:00.000Z", months))
        assertEquals("6 nov. 2026", dayMonthYear("2026-11-06T10:00:00.000Z", months))
    }
}
