package devforge.core.security

/**
 * ⚡ DEVFORGE safeLinkUrl (Kotlin) — enlaces a archivos que subió OTRA persona (adjunto de un chat,
 * comprobante de pago). Gemelo de `core/security/safe-url.ts`.
 *
 * El servidor guarda esa URL tal cual llegó: abrir un `intent:`, `javascript:`, `file:` o `content:`
 * con `LocalUriHandler` / `Intent.ACTION_VIEW` lanza lo que el atacante quiera en el teléfono del
 * staff. Solo se abre:
 *   - una URL `https:`;
 *   - una ruta relativa bajo uno de `allowedPaths` (por defecto `/uploads/`), resuelta contra `baseUrl`;
 *   - un `http:` de un origen propio (`ownOrigins`, p. ej. el API en desarrollo) bajo esas rutas.
 * Lo demás devuelve `null` y la pantalla NO pinta el enlace.
 *
 *   safeLinkUrl(pago.voucherUrl, baseUrl = BuildConfig.API_URL)?.let { url ->
 *       TextButton(onClick = { uriHandler.openUri(url) }) { Text("Ver comprobante") }
 *   }
 */

import java.net.URI

fun safeLinkUrl(
    raw: String?,
    baseUrl: String? = null,
    allowedPaths: List<String> = listOf("/uploads/"),
    ownOrigins: List<String> = listOfNotNull(baseUrl?.let(::originOf)),
): String? {
    val value = raw?.trim()?.takeIf { it.isNotEmpty() } ?: return null
    fun underAllowed(path: String) = allowedPaths.any { path.startsWith(it) }
    if (value.startsWith("/")) {
        // `//host` y `/\host` son otro dominio.
        if (value.length > 1 && (value[1] == '/' || value[1] == '\\')) return null
        if (!underAllowed(value)) return null
        val base = baseUrl?.let { runCatching { URI(it) }.getOrNull() } ?: return value
        return base.resolve(value).toString()
    }
    val uri = runCatching { URI(value) }.getOrNull() ?: return null
    if (uri.host.isNullOrEmpty()) return null
    return when (uri.scheme?.lowercase()) {
        "https" -> uri.toString()
        "http" -> if (originOf(value) in ownOrigins && underAllowed(uri.rawPath.orEmpty())) uri.toString() else null
        else -> null
    }
}

private fun originOf(url: String): String? = runCatching {
    val u = URI(url)
    if (u.scheme == null || u.host == null) null else "${u.scheme.lowercase()}://${u.host.lowercase()}${if (u.port >= 0) ":${u.port}" else ""}"
}.getOrNull()
