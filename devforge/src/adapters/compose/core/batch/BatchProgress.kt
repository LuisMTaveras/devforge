package devforge.core.batch

/**
 * ⚡ DEVFORGE Batch Progress (Kotlin) — el avance EN VIVO de un lote que se procesa uno a uno
 * («3 de 10 · Distribuidora del Caribe»). Gemelo de `core/batch/batch-progress.ts`; lo pinta
 * `BatchProgressModal`.
 *
 *  1. Lote en el CLIENTE (una petición por documento):
 *       val lote = BatchTracker()
 *       lote.run(
 *         title = "Enviando facturas",
 *         items = facturas.map { BatchItemInput(it.id, it.numero, it.cliente?.nombre) },
 *       ) { item, _ -> api.enviar(item.id); null }   // throw = FAILED; BatchResult.skipped("…") para omitir
 *
 *  2. Lote en el SERVIDOR (una petición; el servidor avisa por socket/SSE):
 *       lote.track(title, items, request = { key -> api.lote(progressKey = key) }, settle = { it.resultados })
 *       socket.on("batch:progress") { lote.apply(it) }
 *
 * Cerrar el modal mientras corre solo lo esconde: el lote sigue.
 */

import devforge.core.errors.normalizeApiError
import java.util.UUID
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

enum class BatchItemStatus { PENDING, RUNNING, DONE, SKIPPED, FAILED }

enum class BatchRunState { IDLE, RUNNING, FINISHED }

data class BatchItemInput(val id: String, val label: String, val sublabel: String? = null)

data class BatchItem(
    val id: String,
    val label: String,
    val sublabel: String? = null,
    val status: BatchItemStatus = BatchItemStatus.PENDING,
    /** Por qué falló o se omitió. */
    val detail: String? = null,
)

/** Desenlace de una fila. Solo `DONE`, `SKIPPED` o `FAILED`. */
data class BatchOutcome(val id: String, val status: BatchItemStatus, val detail: String? = null)

/** Lo que devuelve el `worker` de [BatchTracker.run]: `null` = completado. */
data class BatchResult(val status: BatchItemStatus, val detail: String? = null) {
    companion object {
        fun skipped(detail: String) = BatchResult(BatchItemStatus.SKIPPED, detail)
        fun failed(detail: String) = BatchResult(BatchItemStatus.FAILED, detail)
    }
}

data class BatchCounts(val done: Int = 0, val skipped: Int = 0, val failed: Int = 0)

data class BatchState(
    val open: Boolean = false,
    val key: String = "",
    val title: String = "",
    val state: BatchRunState = BatchRunState.IDLE,
    val total: Int = 0,
    val processed: Int = 0,
    val counts: BatchCounts = BatchCounts(),
    val currentId: String? = null,
    val items: List<BatchItem> = emptyList(),
    /** Error que cortó el lote entero (no el de una fila). */
    val error: String = "",
)

/** Lo que manda el servidor en cada evento: la foto completa (`items`) o una fila (`item`). */
data class BatchEvent(
    val key: String,
    val title: String? = null,
    val total: Int? = null,
    val currentId: String? = null,
    val items: List<BatchItem>? = null,
    val item: BatchItem? = null,
)

fun recountBatch(items: List<BatchItem>): Pair<BatchCounts, Int> {
    val counts = BatchCounts(
        done = items.count { it.status == BatchItemStatus.DONE },
        skipped = items.count { it.status == BatchItemStatus.SKIPPED },
        failed = items.count { it.status == BatchItemStatus.FAILED },
    )
    return counts to counts.done + counts.skipped + counts.failed
}

class BatchTracker(
    /** Mensaje del usuario para un fallo. Por defecto, el normalizado (nunca el técnico). */
    private val toMessage: (Throwable, String) -> String = { e, fallback -> normalizeApiError(e, fallback).message },
) {
    private val _state = MutableStateFlow(BatchState())
    val state: StateFlow<BatchState> = _state.asStateFlow()

    private fun set(next: BatchState) {
        _state.value = next
    }

    private fun withItems(items: List<BatchItem>, base: BatchState = _state.value): BatchState {
        val (counts, processed) = recountBatch(items)
        return base.copy(items = items, counts = counts, processed = processed)
    }

    private fun start(title: String, items: List<BatchItemInput>): String {
        val key = UUID.randomUUID().toString()
        set(
            BatchState(
                open = true,
                key = key,
                title = title,
                state = BatchRunState.RUNNING,
                total = items.size,
                items = items.map { BatchItem(it.id, it.label, it.sublabel) },
            ),
        )
        return key
    }

    private fun updateItem(id: String, transform: (BatchItem) -> BatchItem) {
        set(withItems(_state.value.items.map { if (it.id == id) transform(it) else it }))
    }

    /** Procesa en el cliente, de uno en uno y en orden. Un fallo de una fila NO corta el lote. */
    suspend fun run(
        title: String,
        items: List<BatchItemInput>,
        worker: suspend (item: BatchItemInput, index: Int) -> BatchResult?,
    ): BatchState {
        val key = start(title, items)
        for ((index, item) in items.withIndex()) {
            if (_state.value.key != key) break // otro lote reemplazó a este
            set(_state.value.copy(currentId = item.id))
            updateItem(item.id) { it.copy(status = BatchItemStatus.RUNNING) }
            try {
                val result = worker(item, index)
                updateItem(item.id) { it.copy(status = result?.status ?: BatchItemStatus.DONE, detail = result?.detail) }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Throwable) {
                updateItem(item.id) { it.copy(status = BatchItemStatus.FAILED, detail = toMessage(e, "No se pudo procesar.")) }
            }
        }
        if (_state.value.key == key) set(_state.value.copy(state = BatchRunState.FINISHED, currentId = null))
        return _state.value
    }

    /** Lote del servidor: `request` recibe la llave; `settle` traduce la respuesta al desenlace de cada fila. */
    suspend fun <T> track(
        title: String,
        items: List<BatchItemInput>,
        request: suspend (progressKey: String) -> T,
        settle: (T) -> List<BatchOutcome> = { emptyList() },
    ): T? {
        val key = start(title, items)
        return try {
            val result = request(key)
            if (_state.value.key == key) {
                val outcome = settle(result).associateBy { it.id }
                val next = _state.value.items.map { i ->
                    outcome[i.id]?.let { o -> i.copy(status = o.status, detail = o.detail ?: i.detail) } ?: i
                }
                set(withItems(next).copy(state = BatchRunState.FINISHED, currentId = null))
            }
            result
        } catch (e: CancellationException) {
            throw e
        } catch (e: Throwable) {
            if (_state.value.key == key) {
                set(_state.value.copy(state = BatchRunState.FINISHED, currentId = null, error = toMessage(e, "No se pudo completar el lote.")))
            }
            null
        }
    }

    /** Evento de avance del servidor (socket / SSE). Uno atrasado no deshace lo ya cerrado. */
    fun apply(event: BatchEvent) {
        val current = _state.value
        if (current.key.isEmpty() || event.key != current.key || current.state == BatchRunState.FINISHED) return
        val items = event.items ?: current.items.map { i -> if (event.item != null && i.id == event.item.id) event.item else i }
        set(
            withItems(
                items,
                current.copy(
                    title = event.title ?: current.title,
                    total = event.total ?: current.total,
                    currentId = event.currentId ?: current.currentId,
                    state = BatchRunState.RUNNING,
                ),
            ),
        )
    }

    /** Esconde el modal. Si el lote corre, sigue corriendo. */
    fun close() = set(_state.value.copy(open = false))

    fun reopen() {
        if (_state.value.key.isNotEmpty()) set(_state.value.copy(open = true))
    }
}

/** «1 omitido» / «3 omitidos»: los números del lote concuerdan con su sustantivo. */
fun batchSummary(state: BatchState, format: (Int) -> String = { it.toString() }): String {
    val c = state.counts
    fun word(n: Int, one: String, many: String) = "${format(n)} ${if (n == 1) one else many}"
    if (state.error.isNotEmpty()) return "El lote se interrumpió."
    if (c.failed == 0 && c.skipped == 0) {
        return "${format(c.done)} de ${format(state.total)} ${if (state.total == 1) "completado" else "completados"}."
    }
    return "${word(c.done, "completado", "completados")}, ${word(c.skipped, "omitido", "omitidos")} y ${format(c.failed)} con error."
}

fun batchCountLabel(n: Int, skipped: Boolean, format: (Int) -> String = { it.toString() }): String =
    "${format(n)} ${if (!skipped) (if (n == 1) "completado" else "completados") else (if (n == 1) "omitido" else "omitidos")}"
