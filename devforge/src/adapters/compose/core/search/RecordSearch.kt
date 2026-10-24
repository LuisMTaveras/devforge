package devforge.core.search

/**
 * ⚡ DEVFORGE record-search (Kotlin) — búsqueda de REGISTROS en el servidor mientras se teclea
 * (selector de cliente / artículo). Gemelo de `core/search/record-search.ts`:
 *
 *  - Se pide cuando el usuario hace una pausa (`debounceMs`), no en cada tecla.
 *  - Cada consulta nueva CANCELA la anterior (cancelación de corrutina) y descarta su respuesta:
 *    una respuesta lenta de «fer» no pisa la de «ferre».
 *  - Mientras llega, se CONSERVAN los resultados anteriores (`stale = true`) en vez de vaciar la
 *    lista: vaciarla hace saltar el diálogo a cada tecla.
 *  - Paginado de verdad: `loadMore()` pide la página siguiente con la misma consulta.
 *  - Un fallo no se traga: `error` lleva el mensaje para el usuario.
 *
 *   val search = RecordSearch(viewModelScope, fetch = { q, page, size -> api.clientes(q, page, size, fields = "id,nombre,rnc") })
 *   search.setQuery("ferre")
 */

import devforge.core.errors.normalizeApiError
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class RecordPage<T>(
    val items: List<T>,
    /** Total de coincidencias, si el servidor lo da. */
    val total: Int? = null,
    val hasMore: Boolean? = null,
)

data class RecordSearchState<T>(
    val query: String = "",
    val items: List<T> = emptyList(),
    val total: Int? = null,
    val hasMore: Boolean = false,
    val page: Int = 1,
    /** Hay una petición en vuelo o esperando la pausa. */
    val loading: Boolean = false,
    /** Los resultados en pantalla son de una consulta anterior a la actual. */
    val stale: Boolean = false,
    /** Ya hubo al menos una respuesta para la consulta actual. */
    val settled: Boolean = false,
    val error: String? = null,
)

class RecordSearch<T>(
    private val scope: CoroutineScope,
    private val fetch: suspend (query: String, page: Int, pageSize: Int) -> RecordPage<T>,
    val pageSize: Int = 20,
    private val debounceMs: Long = 200,
    /** Menos letras que esto no busca en el servidor (0 = busca también sin texto: «recientes»). */
    private val minChars: Int = 0,
    private val toMessage: (Throwable) -> String = { normalizeApiError(it, "No se pudo completar la búsqueda.").message },
) {
    private val _state = MutableStateFlow(RecordSearchState<T>())
    val state: StateFlow<RecordSearchState<T>> = _state.asStateFlow()

    private var job: Job? = null

    private fun launchRun(page: Int, waitMs: Long) {
        job?.cancel()
        job = scope.launch {
            if (waitMs > 0) delay(waitMs)
            run(page)
        }
    }

    private suspend fun run(page: Int) {
        val q = _state.value.query.trim()
        if (q.length < minChars) {
            _state.update { it.copy(items = emptyList(), total = null, hasMore = false, page = 1, loading = false, stale = false, settled = false, error = null) }
            return
        }
        try {
            val res = fetch(q, page, pageSize)
            _state.update { s ->
                val items = if (page > 1) s.items + res.items else res.items
                val hasMore = res.hasMore ?: res.total?.let { items.size < it } ?: (res.items.size == pageSize)
                s.copy(items = items, total = res.total, hasMore = hasMore, page = page, loading = false, stale = false, settled = true, error = null)
            }
        } catch (e: CancellationException) {
            throw e // llegó otra consulta: esta respuesta ya no importa
        } catch (e: Throwable) {
            _state.update { it.copy(loading = false, stale = false, settled = true, error = toMessage(e)) }
        }
    }

    fun setQuery(query: String) {
        if (query == _state.value.query) return
        _state.update { it.copy(query = query, loading = true, stale = it.items.isNotEmpty(), error = null, settled = false) }
        launchRun(1, debounceMs)
    }

    /** Busca ya, sin esperar la pausa (botón de buscar del teclado, o al abrir el selector). */
    fun flush() {
        _state.update { it.copy(loading = true, stale = it.items.isNotEmpty(), error = null) }
        launchRun(1, 0)
    }

    fun loadMore() {
        val s = _state.value
        if (!s.hasMore || s.loading) return
        _state.update { it.copy(loading = true) }
        launchRun(s.page + 1, 0)
    }

    /** Cancela lo pendiente y vuelve al estado inicial. */
    fun reset() {
        job?.cancel()
        job = null
        _state.value = RecordSearchState()
    }
}
