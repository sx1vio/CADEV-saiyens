package africa.devhub.offline

import okio.FileSystem
import okio.Path
import okio.Path.Companion.toPath

/**
 * Petits fichiers texte de l'application (cache, file d'actions), sous un dossier privé :
 * `filesDir` sur Android, Application Support sur iOS. Les écritures sont atomiques (fichier
 * temporaire puis renommage) : une coupure ne laisse jamais un fichier à moitié écrit.
 */
class LocalFiles(private val fs: FileSystem, val root: Path) {
    constructor(fs: FileSystem, root: String) : this(fs, root.toPath())

    fun child(name: String): LocalFiles = LocalFiles(fs, root / name)

    fun read(name: String): String? {
        val path = root / name
        return if (fs.exists(path)) runCatching { fs.read(path) { readUtf8() } }.getOrNull() else null
    }

    fun write(name: String, text: String) {
        fs.createDirectories(root)
        val target = root / name
        val tmp = root / "$name.tmp"
        fs.write(tmp) { writeUtf8(text) }
        fs.atomicMove(tmp, target)
    }

    fun delete(name: String) {
        fs.delete(root / name, mustExist = false)
    }

    /** Efface tout le dossier (déconnexion, O9). */
    fun deleteAll() {
        fs.deleteRecursively(root, mustExist = false)
    }
}
