package africa.devhub.ui.components

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class SafeLinksTest {
    @Test
    fun keepsWebLinks() {
        assertEquals("https://remotive.com/x?a=1", safeExternalUrl(" https://remotive.com/x?a=1 "))
        assertEquals("HTTP://localhost:3001/p", safeExternalUrl("HTTP://localhost:3001/p"))
        assertEquals("https://devhub.africa", safeExternalUrl("https://devhub.africa"))
    }

    @Test
    fun rejectsEverythingElse() {
        listOf(
            "javascript:alert(1)",
            "intent://scan/#Intent;scheme=zxing;end",
            "market://details?id=x",
            "file:///etc/passwd",
            "https://",
            "https:///x",
            "https://user:pw@evil.example/",
            "//evil.example",
            "",
        ).forEach { assertNull(safeExternalUrl(it), it) }
    }

    @Test
    fun mailOnlyWhereAllowed() {
        assertNull(safeExternalUrl("mailto:rh@entreprise.com"))
        assertEquals("mailto:rh@entreprise.com", safeExternalUrlOrMail("mailto:rh@entreprise.com"))
        assertEquals("https://x.io/apply", safeExternalUrlOrMail("https://x.io/apply"))
        assertNull(safeExternalUrlOrMail("mailto:a@b.c?cc=evil@x.io&body=x y"))
        assertNull(safeExternalUrlOrMail("javascript:alert(1)"))
    }
}
