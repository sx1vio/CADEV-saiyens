package africa.devhub.sos

import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/** Mêmes cas que isReproUrl de @devhub/contracts (packages/contracts/src/contracts.spec.ts). */
class ReproTest {
    @Test
    fun acceptsEditorPagesOnly() {
        assertTrue(isReproUrl("https://stackblitz.com/edit/abc"))
        assertTrue(isReproUrl("https://www.codesandbox.io/s/x"))
        assertTrue(isReproUrl("https://gist.github.com/u/1"))
        assertTrue(isReproUrl("https://github.com"))
    }

    @Test
    fun rejectsEverythingElse() {
        assertFalse(isReproUrl("http://stackblitz.com/edit/abc"))
        assertFalse(isReproUrl("https://abc.csb.app"))
        assertFalse(isReproUrl("https://user@github.com/x"))
        assertFalse(isReproUrl("https://github.com:8443/x"))
        assertFalse(isReproUrl("https://evil.github.com/x"))
        assertFalse(isReproUrl("https://github.com.evil.io/x"))
        assertFalse(isReproUrl("https://github.com/a b"))
    }
}
