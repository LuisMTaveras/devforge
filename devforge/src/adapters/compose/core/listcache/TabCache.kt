package devforge.core.listcache

/**
 * ⚡ DEVFORGE tab cache (Kotlin) — volver a una pestaña ya vista («Pendientes» → «Todos» →
 * «Pendientes») con los mismos filtros la pinta al instante, sin petición ni parpadeo.
 * Gemelo de `core/list-cache/tab-cache.ts`; vive en el ViewModel del listado.
 *
 * La llave es la consulta ENTERA (pestaña + búsqueda + rango + página), en orden estable y sin
 * vacíos. Solo el CAMBIO DE PESTAÑA lee de aquí. Cualquier otra carga —un filtro, una acción sobre
 * un documento, «Actualizar»— va al servidor y VACÍA el caché: anular un pedido lo saca de
 * «Pendientes» y lo mete en «Cancelados», así que lo guardado de todas las pestañas deja de ser verdad.
 *
 *   private val tabs = TabCache<Pagina<Factura>>()
 *   fun cambiarPestana(id: String) {
 *       filtros = filtros.copy(estado = id)
 *       tabs.recall(filtros.params())?.let(::aplicar) ?: cargar(tab = true)
 *   }
 *   // en cargar(): if (tab) tabs.add(params, pagina) else tabs.remember(params, pagina)
 */

fun tabCacheKey(params: Map<String, Any?>): String =
    params.entries
        .filter { (_, v) -> v != null && !(v is CharSequence && v.isEmpty()) }
        .sortedBy { it.key }
        .joinToString("&") { (k, v) -> "$k=$v" }

class TabCache<T>(private val max: Int = 12) {
    private val entries = LinkedHashMap<String, T>()

    val size: Int get() = entries.size

    /** Lo que ya se trajo para esta consulta, o `null`. */
    fun recall(params: Map<String, Any?>): T? = entries[tabCacheKey(params)]

    /** Una carga que fue al servidor: vacía lo anterior y guarda solo esta respuesta. */
    fun remember(params: Map<String, Any?>, data: T) {
        entries.clear()
        entries[tabCacheKey(params)] = data
    }

    /** Guarda sin vaciar: la respuesta de una pestaña pedida porque no estaba. */
    fun add(params: Map<String, Any?>, data: T) {
        val key = tabCacheKey(params)
        entries.remove(key)
        entries[key] = data
        while (entries.size > max) entries.remove(entries.keys.first())
    }

    fun clear() = entries.clear()
}
