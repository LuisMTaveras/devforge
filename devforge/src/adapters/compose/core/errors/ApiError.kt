package devforge.core.errors

/**
 * ⚡ DEVFORGE API Error Normalizer (Kotlin) — gemelo de `core/errors/api-error.ts`.
 * Saca un mensaje para el usuario, los errores por campo y el `code` de la respuesta de
 * Laravel, Express, NestJS, FastAPI o Django, y de los fallos de red.
 *
 * Requiere `org.jetbrains.kotlinx:kotlinx-serialization-json` (solo el runtime: el JSON del error
 * se lee como `JsonElement`, sin plugin ni clases @Serializable).
 *
 *   // Retrofit:  catch (e: HttpException) -> normalizeApiError(e.code(), e.response()?.errorBody()?.string())
 *   // Ktor:      catch (e: ResponseException) -> normalizeApiError(e.response.status.value, e.response.bodyAsText())
 *   // Cualquier otro fallo:                   -> normalizeApiError(e)
 *   uiState = uiState.copy(error = normalizeApiError(e).message)
 *
 * El `CancellationException` de una corrutina NO es un error del usuario: vuelve a lanzarlo.
 */

import java.io.IOException
import java.net.SocketTimeoutException
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull

const val DEFAULT_ERROR_MESSAGE = "Ocurrió un error inesperado al procesar la solicitud."

data class NormalizedError(
    val message: String,
    val status: Int,
    val fieldErrors: Map<String, String> = emptyMap(),
    /**
     * Código de máquina del backend (`AUTHORIZATION_REQUIRED`, `MFA_REQUIRED`…). El servidor lo
     * envía CON `details` (nunca aplanar el error a su mensaje): así el cliente reconoce un reto
     * y abre el flujo correcto.
     */
    val code: String? = null,
    /** Lo estructurado que viaja con `code` (p. ej. el reto de autorización). */
    val details: JsonElement? = null,
    val original: Throwable? = null,
)

/**
 * Respuesta HTTP fallida que la capa de red convierte en excepción. Úsala si tu cliente no trae
 * la suya: `if (!response.isSuccessful) throw ApiHttpException(response.code, response.body?.string())`.
 */
class ApiHttpException(val status: Int, val body: String?, message: String? = null) :
    Exception(message ?: "HTTP $status")

private val lenientJson = Json { isLenient = true; ignoreUnknownKeys = true }

private fun statusMessage(status: Int, fallback: String): String = when (status) {
    401 -> "Sesión expirada o credenciales inválidas. Por favor, inicia sesión nuevamente."
    403 -> "No tienes permisos suficientes para realizar esta acción."
    404 -> "El recurso solicitado no fue encontrado o no está disponible."
    500 -> "Error interno en el servidor. Por favor, intenta más tarde o contacta al administrador."
    else -> fallback
}

private fun JsonElement?.text(): String? = (this as? JsonPrimitive)?.takeIf { it.isString }?.contentOrNull?.takeIf { it.isNotBlank() }

/** Respuesta HTTP (código + cuerpo tal cual llegó) -> error normalizado. */
fun normalizeApiError(
    status: Int,
    body: String?,
    fallbackMessage: String = DEFAULT_ERROR_MESSAGE,
    original: Throwable? = null,
): NormalizedError {
    var message = statusMessage(status, fallbackMessage)
    val fieldErrors = linkedMapOf<String, String>()
    var code: String? = null
    var details: JsonElement? = null

    val data: JsonElement? = body?.takeIf { it.isNotBlank() }?.let { runCatching { lenientJson.parseToJsonElement(it) }.getOrNull() }
    when {
        data is JsonObject -> {
            // Laravel / NestJS: { message } · Express: { error } · FastAPI / Django: { detail }
            (data["message"].text() ?: data["error"].text() ?: data["detail"].text())?.let { message = it }

            // Laravel: { errors: { email: ["El correo ya existe"] } }
            (data["errors"] as? JsonObject)?.forEach { (field, value) ->
                val first = when (value) {
                    is JsonArray -> value.firstOrNull().text()
                    else -> value.text()
                }
                if (first != null) fieldErrors[field] = first
            }
            // FastAPI: { detail: [{ loc: ["body", "email"], msg: "..." }] }
            (data["detail"] as? JsonArray)?.forEach { item ->
                val obj = item as? JsonObject ?: return@forEach
                val loc = obj["loc"] as? JsonArray ?: return@forEach
                val msg = obj["msg"].text() ?: return@forEach
                val field = (loc.lastOrNull() as? JsonPrimitive)?.contentOrNull ?: return@forEach
                fieldErrors[field] = msg
            }
            code = data["code"].text()
            if (code != null) details = data["details"]
        }
        // Un cuerpo de texto plano (no HTML de un proxy) es el mensaje.
        data == null && body != null && body.isNotBlank() && !body.trimStart().startsWith("<") && body.length <= 300 ->
            message = body.trim()
    }

    return NormalizedError(message, status, fieldErrors, code, details, original)
}

/** Cualquier fallo -> error normalizado. Un fallo de red da un mensaje de conexión, no el técnico. */
fun normalizeApiError(error: Throwable?, fallbackMessage: String = DEFAULT_ERROR_MESSAGE): NormalizedError = when (error) {
    null -> NormalizedError(fallbackMessage, 500)
    is ApiHttpException -> normalizeApiError(error.status, error.body, fallbackMessage, error)
    is SocketTimeoutException -> NormalizedError("La solicitud tardó demasiado. Verifica tu conexión e inténtalo de nuevo.", 0, original = error)
    is IOException -> NormalizedError("Error de conexión. Verifica tu acceso a internet o el estado del servidor.", 0, original = error)
    else -> NormalizedError(fallbackMessage, 500, original = error)
}
