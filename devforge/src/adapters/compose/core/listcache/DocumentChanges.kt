package devforge.core.listcache

/**
 * ⚡ DEVFORGE document changes (Kotlin) — lo que el usuario cambió mientras su lista estaba guardada.
 * Gemelo de `core/list-cache/document-changes.ts`.
 *
 * Regla del producto: una lista conservada al navegar (el ViewModel de la pantalla de atrás) NO
 * vuelve al servidor sola. El único borde es lo que cambiaste TÚ: entras a una factura, la anulas,
 * vuelves — y la lista la seguiría pintando activa. Se resuelve sin una petición:
 *
 *  1. El DETALLE, después de mutar y recargar lo suyo, deja el documento ya confirmado por el
 *     servidor: `DocumentChanges.record("factura", f.id, f)`.
 *  2. La LISTA, al volver, recoge los cambios y parchea SOLO lo que pinta:
 *       filas = filas.patchRows(DocumentChanges.drain<FacturaDetalle>("factura"), id = { it.id }) { fila, f ->
 *           fila.copy(estado = f.estado, total = f.total)
 *       }
 *  3. Crear o eliminar cambia QUÉ filas hay, y eso no se parchea: `DocumentChanges.markListShifted("factura")`
 *     hace que la lista OFREZCA actualizar (`ListStaleNotice`) en vez de recargar sola.
 */

data class DocumentChange<S>(val id: String, val snapshot: S)

object DocumentChanges {
    private val patches = mutableMapOf<String, LinkedHashMap<String, Any>>()
    private val shifted = mutableSetOf<String>()

    /** «Este documento cambió, y así quedó.» Llamar DESPUÉS de recargar el detalle (el último gana). */
    @Synchronized
    fun record(resource: String, id: String, snapshot: Any) {
        if (resource.isEmpty() || id.isEmpty()) return
        patches.getOrPut(resource) { LinkedHashMap() }[id] = snapshot
    }

    /** «La lista de este recurso ya no tiene las mismas filas» (nació o desapareció un documento). */
    @Synchronized
    fun markListShifted(resource: String) {
        if (resource.isNotEmpty()) shifted += resource
    }

    /**
     * Recoge los cambios de un recurso y los CONSUME: un parche aplicado no vuelve a aplicarse.
     * Los que no son del tipo `S` se descartan (el detalle guardó otra forma del documento).
     */
    inline fun <reified S : Any> drain(resource: String): List<DocumentChange<S>> =
        drainRaw(resource).mapNotNull { (id, snapshot) -> (snapshot as? S)?.let { DocumentChange(id, it) } }

    @PublishedApi
    @Synchronized
    internal fun drainRaw(resource: String): List<Pair<String, Any>> =
        patches.remove(resource)?.map { (id, snapshot) -> id to snapshot }.orEmpty()

    /** ¿Le faltan o le sobran filas a la lista de este recurso? Consume el aviso. */
    @Synchronized
    fun takeListShifted(resource: String): Boolean = shifted.remove(resource)

    /** Solo para tests. */
    @Synchronized
    fun reset() {
        patches.clear()
        shifted.clear()
    }
}

/**
 * Aplica los cambios a las filas que están en pantalla, con `merge` copiando solo lo que la fila
 * pinta (la fila no engorda con `lineas` o `pagos`). Las que no están se ignoran.
 */
inline fun <T, S> List<T>.patchRows(
    changes: List<DocumentChange<S>>,
    id: (T) -> String,
    merge: (row: T, snapshot: S) -> T,
): List<T> {
    if (changes.isEmpty()) return this
    val byId = changes.associate { it.id to it.snapshot }
    return map { row -> byId[id(row)]?.let { merge(row, it) } ?: row }
}
