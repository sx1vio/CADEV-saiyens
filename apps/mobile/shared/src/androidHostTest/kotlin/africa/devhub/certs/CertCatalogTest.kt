package africa.devhub.certs

import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/**
 * Le catalogue embarqué doit rester la copie exacte de packages/core/src/certs/catalog.ts (lui-même
 * vérifié contre la banque de l'API) : identifiants, durée, seuil, tirage et nombre de thèmes.
 */
class CertCatalogTest {
    private val source = File("../../../packages/core/src/certs/catalog.ts")

    @Test
    fun matchesTheSharedCatalogue() {
        assertTrue(source.exists(), "catalogue introuvable : ${source.absolutePath}")
        val text = source.readText()
        val blocks = text.split(Regex("""\n  \{\n""")).drop(1)
        assertEquals(blocks.size, CERT_CATALOG.size, "nombre de certifications")
        fun field(block: String, name: String) = Regex("""\b$name: (?:'([^']*)'|(\d+))""").find(block)?.let { it.groupValues[1].ifEmpty { it.groupValues[2] } }
        blocks.zip(CERT_CATALOG).forEach { (block, meta) ->
            assertEquals(field(block, "id"), meta.id)
            assertEquals(field(block, "minutes")?.toInt(), meta.minutes, meta.id)
            assertEquals(field(block, "passScore")?.toInt(), meta.passScore, meta.id)
            assertEquals(field(block, "draw")?.toInt(), meta.draw, meta.id)
            val syllabus = Regex("""syllabus: \[([\s\S]*?)\]""").find(block)!!.groupValues[1]
            assertEquals(Regex("""\n\s+'""").findAll(syllabus).count(), meta.syllabus.size, "${meta.id} : thèmes")
        }
    }
}
