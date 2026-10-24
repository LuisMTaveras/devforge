package devforge.core.feedback

/**
 * ⚡ DEVFORGE Dialog Engine (Kotlin) — la única puerta a un mensaje que INTERRUMPE.
 * Gemelo de `core/feedback/dialog.ts`. Lo pinta una sola vez `ConfirmDialogHost()` en la raíz.
 *
 * `AlertDialog` armado en cada pantalla está prohibido: cada uno decide sus textos, colores y si
 * el telón cierra, y «Guardar» acaba pintado igual que «Eliminar». Lo que NO interrumpe es un
 * aviso (`notify`, Toast.kt). Llama desde una corrutina del hilo principal (viewModelScope,
 * rememberCoroutineScope):
 *
 *   if (confirmDialog("Eliminar cliente", "No se puede deshacer.", "Eliminar", tone = DialogTone.DANGER)) …
 *   val motivo = promptDialog("Anular factura", "Indica el motivo.", required = true, multiline = true)
 *
 * Si la corrutina que espera se cancela (la pantalla se va), el diálogo se cierra con ella.
 */

import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

/** Qué clase de mensaje es. Decide icono, color y si hay botón de cancelar. */
enum class DialogType { INFO, SUCCESS, WARNING, ERROR, CONFIRM, PROMPT }

/** Carga de la acción que se confirma. `DANGER` = no se puede deshacer. */
enum class DialogTone { NEUTRAL, DANGER }

data class DialogState(
    val open: Boolean = false,
    val title: String = "",
    val message: String = "",
    val type: DialogType = DialogType.INFO,
    val tone: DialogTone = DialogTone.NEUTRAL,
    val confirmText: String = "Aceptar",
    val cancelText: String = "Cancelar",
    val inputValue: String = "",
    val inputPlaceholder: String = "",
    val inputRequired: Boolean = false,
    val inputMultiline: Boolean = false,
    /** Error de validación del campo (solo `PROMPT` obligatorio). */
    val inputError: String = "",
) {
    val hasCancel: Boolean get() = type == DialogType.CONFIRM || type == DialogType.PROMPT
}

object DialogCenter {
    private val _state = MutableStateFlow(DialogState())
    val state: StateFlow<DialogState> = _state.asStateFlow()

    private var pending: CompletableDeferred<Any?>? = null

    /** Valor con el que se resuelve un diálogo que se cancela (o que otro reemplaza). */
    private fun cancelValue(): Any? = when (_state.value.type) {
        DialogType.CONFIRM -> false
        else -> null
    }

    private fun settle(value: Any?) {
        val deferred = pending
        pending = null
        deferred?.complete(value)
    }

    internal suspend fun open(next: DialogState): Any? {
        // Un diálogo nuevo cancela al anterior: si no, quien lo esperaba queda colgado para siempre.
        if (_state.value.open) settle(cancelValue())
        val deferred = CompletableDeferred<Any?>()
        pending = deferred
        _state.value = next.copy(open = true)
        try {
            return deferred.await()
        } catch (e: CancellationException) {
            if (pending === deferred) {
                pending = null
                _state.update { it.copy(open = false) }
            }
            throw e
        }
    }

    fun setInput(value: String) {
        _state.update { it.copy(inputValue = value, inputError = "") }
    }

    /** Botón principal / Enter. Un `PROMPT` obligatorio vacío no se acepta. */
    fun accept() {
        val current = _state.value
        if (!current.open) return
        if (current.type == DialogType.PROMPT && current.inputRequired && current.inputValue.isBlank()) {
            _state.update { it.copy(inputError = "Este campo es obligatorio.") }
            return
        }
        val value: Any? = when (current.type) {
            DialogType.PROMPT -> current.inputValue
            DialogType.CONFIRM -> true
            else -> Unit
        }
        _state.update { it.copy(open = false) }
        settle(value)
    }

    /** Botón cancelar / atrás. */
    fun cancel() {
        if (!_state.value.open) return
        val value = cancelValue()
        _state.update { it.copy(open = false) }
        settle(value)
    }
}

/** Aviso de una sola salida. Vuelve cuando se acepta. */
suspend fun alertDialog(title: String, message: String = "", type: DialogType = DialogType.INFO) {
    require(type in setOf(DialogType.INFO, DialogType.SUCCESS, DialogType.WARNING, DialogType.ERROR)) { "alertDialog: usa confirmDialog / promptDialog" }
    DialogCenter.open(DialogState(title = title, message = message, type = type))
}

/** Pregunta de sí/no. `tone = DialogTone.DANGER` para lo que no se puede deshacer. */
suspend fun confirmDialog(
    title: String,
    message: String = "",
    confirmText: String = "Confirmar",
    cancelText: String = "Cancelar",
    tone: DialogTone = DialogTone.NEUTRAL,
): Boolean = DialogCenter.open(
    DialogState(title = title, message = message, type = DialogType.CONFIRM, confirmText = confirmText, cancelText = cancelText, tone = tone),
) == true

/** Pide un texto. `null` si se cancela; la cadena escrita si se acepta. */
suspend fun promptDialog(
    title: String,
    message: String = "",
    defaultValue: String = "",
    placeholder: String = "",
    confirmText: String = "Enviar",
    cancelText: String = "Cancelar",
    required: Boolean = false,
    multiline: Boolean = false,
    tone: DialogTone = DialogTone.NEUTRAL,
): String? = DialogCenter.open(
    DialogState(
        title = title,
        message = message,
        type = DialogType.PROMPT,
        confirmText = confirmText,
        cancelText = cancelText,
        inputValue = defaultValue,
        inputPlaceholder = placeholder,
        inputRequired = required,
        inputMultiline = multiline,
        tone = tone,
    ),
) as? String

/** El mensaje largo o con párrafos pide más caja y lectura a la izquierda. */
fun isLongDialogMessage(message: String): Boolean = message.length > 170 || '\n' in message
