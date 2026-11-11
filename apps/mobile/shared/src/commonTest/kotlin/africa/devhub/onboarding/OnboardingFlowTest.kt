package africa.devhub.onboarding

import africa.devhub.platform.formatUtc
import kotlin.test.Test
import kotlin.test.assertEquals

class OnboardingFlowTest {
    @Test
    fun beginnerPicksACourseThenInterests() {
        assertEquals(listOf(Step.Level, Step.Goals, Step.Course, Step.Domains, Step.Where, Step.Plan), flowFor(Level.Beginner))
    }

    @Test
    fun experiencedDevsSayHowTheyHelp() {
        val expected = listOf(Step.Level, Step.Goals, Step.Domains, Step.Help, Step.Where, Step.Plan)
        assertEquals(expected, flowFor(Level.Junior))
        assertEquals(expected, flowFor(Level.Senior))
        assertEquals(expected, flowFor(null))
    }

    @Test
    fun unsetLevelSkipsCourseAndAvailability() {
        assertEquals(listOf(Step.Level, Step.Goals, Step.Domains, Step.Where, Step.Plan), flowFor(Level.Unset))
    }

    @Test
    fun startPageFollowsTheFirstGoalInWebOrder() {
        assertEquals(StartTarget.Certifications, startFor(setOf(Goal.Job), learnerWithCourse = true))
        assertEquals(StartTarget.Sos, startFor(setOf(Goal.Job, Goal.GetHelp)))
        assertEquals(StartTarget.Jobs, startFor(setOf(Goal.Job, Goal.News)))
        assertEquals(StartTarget.Certifications, startFor(setOf(Goal.Certify)))
        assertEquals(StartTarget.Projects, startFor(setOf(Goal.Project)))
        assertEquals(StartTarget.Preflight, startFor(setOf(Goal.Ship)))
        assertEquals(StartTarget.Home, startFor(setOf(Goal.News)))
        assertEquals(StartTarget.Home, startFor(emptySet()))
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
