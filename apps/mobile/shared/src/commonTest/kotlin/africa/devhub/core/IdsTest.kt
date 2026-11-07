package africa.devhub.core

import kotlin.test.Test
import kotlin.test.assertNotEquals
import kotlin.test.assertTrue

class IdsTest {
    // Même expression que IdempotencyKey côté API.
    private val uuid = Regex("^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$")

    @Test
    fun producesUuidsTheApiAccepts() {
        repeat(200) { assertTrue(uuid.matches(newUuid())) }
        assertTrue(newUuid()[14] == '4')
        assertNotEquals(newUuid(), newUuid())
    }
}
