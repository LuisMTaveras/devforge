package devforge.core.feedback

/**
 * ⚡ DEVFORGE Toast Engine (Kotlin) — avisos que NO interrumpen («Guardado», «No se pudo cargar»).
 * Gemelo de `core/feedback/toast.ts`. Lo pinta una sola vez `ToastHost()` en la raíz.
 *
 *   notify("Cliente guardado")
 *   notify("No se pudo guardar el cliente", ToastType.ERROR)
 *
 * `Toast.makeText` y un `SnackbarHost` por pantalla están prohibidos: ignoran el tema, no se apilan
 * y cada pantalla decide su duración. Lo que obliga a decidir algo es un diálogo (Dialog.kt).
 * Se apilan (máximo 4) y se van solos (el host cuenta el tiempo); los errores duran más.
 */

import java.util.concurrent.atomic.AtomicLong
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

enum class ToastType(val defaultDurationMs: Long) {
    SUCCESS(3_000),
    INFO(3_500),
    WARNING(5_000),
    ERROR(6_000),
}

data class Toast(
    val id: Long,
    val message: String,
    val type: ToastType,
    /** `0` = se queda hasta que lo cierren. */
    val durationMs: Long,
)

object ToastCenter {
    const val MAX_VISIBLE = 4

    private val nextId = AtomicLong(0)
    private val _toasts = MutableStateFlow<List<Toast>>(emptyList())
    val toasts: StateFlow<List<Toast>> = _toasts.asStateFlow()

    fun show(message: String, type: ToastType, durationMs: Long): Long {
        val id = nextId.incrementAndGet()
        // El más viejo sale primero si hay demasiados.
        _toasts.update { (it + Toast(id, message, type, durationMs)).takeLast(MAX_VISIBLE) }
        return id
    }

    fun dismiss(id: Long) {
        _toasts.update { list -> list.filterNot { it.id == id } }
    }

    /** Solo para tests. */
    fun clear() {
        _toasts.value = emptyList()
    }
}

/** Muestra un aviso. `durationMs = 0` lo deja hasta que se cierre a mano. Devuelve su id. */
fun notify(message: String, type: ToastType = ToastType.SUCCESS, durationMs: Long = type.defaultDurationMs): Long =
    ToastCenter.show(message, type, durationMs)

fun dismissToast(id: Long) = ToastCenter.dismiss(id)
