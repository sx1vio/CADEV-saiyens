package africa.devhub.passport

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class HeatmapTest {
    @Test
    fun epochDayMatchesKnownDates() {
        assertEquals(0L, epochDayOf("1970-01-01"))
        assertEquals(19_723L, epochDayOf("2024-01-01"))
        assertEquals(19_782L, epochDayOf("2024-02-29T23:59:59.000Z")) // l'heure est ignorée, 2024 est bissextile
        assertEquals(epochDayOf("2026-03-01")!! - 1, epochDayOf("2026-02-28"))
    }

    @Test
    fun unreadableDatesAreIgnored() {
        assertNull(epochDayOf("hier"))
        assertNull(epochDayOf("2026-13-01"))
    }

    private fun event(at: String, reverted: String? = null) =
        ProofEvent(id = at, kind = "answer_accepted", points = 10, createdAt = at, revertedAt = reverted)

    @Test
    fun proofsAreCountedPerDayAndRevertedOnesDropped() {
        val perDay = proofsPerDay(
            listOf(
                event("2026-11-08T08:00:00.000Z"),
                event("2026-11-08T21:00:00.000Z"),
                event("2026-11-07T09:00:00.000Z", reverted = "2026-11-07T10:00:00.000Z"),
            ),
        )
        assertEquals(mapOf(epochDayOf("2026-11-08")!! to 2), perDay)
    }

    @Test
    fun lastDaysEndsToday() {
        val today = epochDayOf("2026-11-09")!!
        val days = lastDays(mapOf(today to 3, today - 2 to 1, today - 9 to 5), today, 5)
        assertEquals(listOf(0, 0, 1, 0, 3), days) // le jour -9 est hors fenêtre
    }

    @Test
    fun levelsStayInRange() {
        assertEquals(listOf(0, 1, 2, 3, 4), listOf(0, 1, 2, 4, 9).map(::githubLevel))
        assertEquals(listOf(0, 1, 2, 3, 4), listOf(0, 1, 2, 4, 7).map(::coverLevel))
    }
}
