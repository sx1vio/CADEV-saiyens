package africa.devhub.onboarding

import africa.devhub.platform.formatUtc
import kotlin.test.Test
import kotlin.test.assertEquals

class OnboardingFlowTest {
    @Test
    fun learnerPicksACourseAndARhythm() {
        val expected = listOf(Step.Level, Step.Goals, Step.Course, Step.Rhythm, Step.Where, Step.Plan)
        assertEquals(expected, flowFor(Level.Curious))
        assertEquals(expected, flowFor(Level.Beginner))
    }

    @Test
    fun juniorPicksDomainsAndARhythm() {
        assertEquals(listOf(Step.Level, Step.Goals, Step.Domains, Step.Rhythm, Step.Where, Step.Plan), flowFor(Level.Junior))
        assertEquals(flowFor(Level.Junior), flowFor(null))
    }

    @Test
    fun seniorSaysHowToHelpInsteadOfARhythm() {
        assertEquals(listOf(Step.Level, Step.Goals, Step.Domains, Step.Help, Step.Where, Step.Plan), flowFor(Level.Senior))
    }

    @Test
    fun startPageFollowsTheWebOrder() {
        assertEquals(StartTarget.Certifications, startFor(setOf(Goal.Job), learner = true))
        assertEquals(StartTarget.Certifications, startFor(setOf(Goal.Learn, Goal.Job), hasDomains = true))
        assertEquals(StartTarget.Jobs, startFor(setOf(Goal.Job)))
        assertEquals(StartTarget.Sos, startFor(setOf(Goal.Help)))
        assertEquals(StartTarget.Home, startFor(setOf(Goal.News)))
    }

    @Test
    fun everyCountryHasATimeZone() {
        assertEquals(AfricanCountries.map { it.code }.toSet(), AfricanCountries.filter { timezoneOf(it.code) != null }.map { it.code }.toSet())
    }

    @Test
    fun utcOffsetIsFormattedLikeTheWeb() {
        assertEquals("UTC+0", formatUtc(0))
        assertEquals("UTC+3", formatUtc(180))
        assertEquals("UTC-5", formatUtc(-300))
        assertEquals("UTC+5:30", formatUtc(330))
    }
}
