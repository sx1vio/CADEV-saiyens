package africa.devhub.offline

import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class ReachabilityRecoveryTest {
    @Test
    fun comesBackOnlineOnceTheApiAnswers() = runTest {
        val connectivity = Connectivity(null)
        var up = false
        var calls = 0
        ReachabilityRecovery(connectivity, backgroundScope, ping = { calls++; up })
        connectivity.reportUnreachable()
        runCurrent()
        assertFalse(connectivity.online.value)

        advanceTimeBy(3_001); runCurrent()
        assertEquals(1, calls)
        assertFalse(connectivity.online.value)

        up = true
        advanceTimeBy(6_001); runCurrent()
        assertTrue(connectivity.online.value)
    }

    @Test
    fun backsOffUpToTheCap() = runTest {
        val connectivity = Connectivity(null)
        var calls = 0
        ReachabilityRecovery(connectivity, backgroundScope, ping = { calls++; false })
        connectivity.reportUnreachable()
        runCurrent()
        // 3 s, 6 s, 12 s, 24 s, puis 30 s : 5 essais en 3+6+12+24+30 = 75 s
        advanceTimeBy(75_001); runCurrent()
        assertEquals(5, calls)
    }

    @Test
    fun aThrowingPingIsAFailureNotACrash() = runTest {
        val connectivity = Connectivity(null)
        ReachabilityRecovery(connectivity, backgroundScope, ping = { error("réseau coupé") })
        connectivity.reportUnreachable()
        runCurrent()
        advanceTimeBy(10_000); runCurrent()
        assertFalse(connectivity.online.value)
    }

    @Test
    fun staysIdleWhileOnline() = runTest {
        val connectivity = Connectivity(null)
        var calls = 0
        ReachabilityRecovery(connectivity, backgroundScope, ping = { calls++; true })
        advanceTimeBy(60_000); runCurrent()
        assertEquals(0, calls)
    }

    @Test
    fun neverProbesWhenTheSystemHasNoNetwork() = runTest {
        var notify: (Boolean) -> Unit = {}
        val connectivity = Connectivity(object : ConnectivityProbe {
            override fun start(onChange: (Boolean) -> Unit) { notify = onChange }
        })
        var calls = 0
        ReachabilityRecovery(connectivity, backgroundScope, ping = { calls++; true })
        notify(false)
        runCurrent()
        advanceTimeBy(60_000); runCurrent()
        assertEquals(0, calls)
        assertFalse(connectivity.online.value)
    }
}
