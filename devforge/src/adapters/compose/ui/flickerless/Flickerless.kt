package devforge.ui.flickerless

/**
 * ⚡ DEVFORGE Flickerless (Compose) — así carga DEVFORGE. Gemelo de `vendor/flickerless`.
 *
 *  - Lo que ya está en pantalla se QUEDA mientras recarga (atenuado) y arriba corre una barra de 2 dp.
 *  - Una carga más rápida que `delayMs` (180 ms) no enseña ningún indicador: cero parpadeo.
 *  - Una vez visible, el indicador dura al menos `minDurationMs` (250 ms).
 *  - Lo que aún no se sabe se pinta «—» ([FlickerlessValue]), nunca `0` ni «Sin resultados».
 *
 *   FlickerlessSurface(loading = ui.loading, empty = ui.rows.isEmpty(), error = ui.error, onRetry = vm::load,
 *       modifier = Modifier.fillMaxSize(), emptyContent = { EmptyState("Aún no hay facturas") }) {
 *       LazyColumn(Modifier.weight(1f)) { … }
 *       ListPager(…)
 *   }
 *
 * Prohibidos: `Shimmer`, `placeholder()`, cajas grises que imitan texto y el
 * `CircularProgressIndicator` que tapa la pantalla entera.
 */

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import devforge.ui.components.DfIcon
import devforge.ui.components.DfIconName
import devforge.ui.theme.DevforgeTheme
import kotlin.time.TimeSource
import kotlinx.coroutines.delay

/** `false` = la superficie que envuelve aún no tiene respuesta; `null` = no hay superficie. */
val LocalFlickerlessSettled = compositionLocalOf<Boolean?> { null }

/**
 * ¿Se ENSEÑA el indicador? Sigue a `loading` con la regla anti-parpadeo: espera `delayMs` antes de
 * aparecer y, una vez visible, se queda al menos `minDurationMs`.
 */
@Composable
fun rememberFlickerlessLoading(loading: Boolean, delayMs: Long = 180, minDurationMs: Long = 250): Boolean {
    var visible by remember { mutableStateOf(false) }
    var shownAt by remember { mutableStateOf(TimeSource.Monotonic.markNow()) }
    LaunchedEffect(loading) {
        if (loading) {
            if (!visible) {
                if (delayMs > 0) delay(delayMs)
                shownAt = TimeSource.Monotonic.markNow()
                visible = true
            }
        } else if (visible) {
            val remaining = minDurationMs - shownAt.elapsedNow().inWholeMilliseconds
            if (remaining > 0) delay(remaining)
            visible = false
        }
    }
    return visible
}

/** La barra de 2 dp que corre arriba mientras recarga. Reserva su alto siempre: nada salta. */
@Composable
fun FlickerlessStream(visible: Boolean, modifier: Modifier = Modifier) {
    val colors = DevforgeTheme.colors
    Box(modifier.fillMaxWidth().height(2.dp)) {
        if (visible) {
            LinearProgressIndicator(
                modifier = Modifier.fillMaxWidth().height(2.dp),
                color = colors.primary,
                trackColor = colors.primarySubtle,
                strokeCap = StrokeCap.Round,
            )
        }
    }
}

/**
 * Un dato que puede no existir todavía. Sin respuesta pinta «—» atenuado en vez de un cero:
 * «RD$0.00» antes de cargar es una cifra falsa, no un hueco.
 */
@Composable
fun FlickerlessValue(
    value: String?,
    modifier: Modifier = Modifier,
    style: TextStyle = DevforgeTheme.type.body,
    placeholder: String = "—",
    unknownLabel: String = "Sin dato todavía",
) {
    val unknown = value == null || LocalFlickerlessSettled.current == false
    if (unknown) {
        Text(
            text = placeholder,
            style = style,
            color = DevforgeTheme.colors.dimForeground,
            modifier = modifier.clearAndSetSemantics { contentDescription = unknownLabel },
        )
    } else {
        Text(text = value!!, style = style, modifier = modifier)
    }
}

/** Igual, con el contenido propio cuando el valor sí existe. */
@Composable
fun <T : Any> FlickerlessValue(
    value: T?,
    modifier: Modifier = Modifier,
    style: TextStyle = DevforgeTheme.type.body,
    content: @Composable (T) -> Unit,
) {
    if (value == null || LocalFlickerlessSettled.current == false) {
        FlickerlessValue(value = null, modifier = modifier, style = style)
    } else {
        content(value)
    }
}

/**
 * La superficie de una carga. Conserva lo que había (atenuado) mientras recarga; «vacío» solo con
 * una respuesta en la mano; un error NUNCA se traga (sin `errorContent`, avisa y conserva).
 *
 * @param settled si ya hubo respuesta. Sin él se deduce: queda resuelta cuando una carga termina.
 * @param errorText aviso cuando falla con datos en pantalla; `""` si la pantalla ya lo avisa.
 */
@Composable
fun FlickerlessSurface(
    loading: Boolean,
    modifier: Modifier = Modifier,
    empty: Boolean = false,
    error: String? = null,
    settled: Boolean? = null,
    onRetry: (() -> Unit)? = null,
    delayMs: Long = 180,
    minDurationMs: Long = 250,
    keepPreviousData: Boolean = true,
    announceText: String = "Actualizando…",
    errorText: String = "No se pudo cargar la información.",
    emptyContent: (@Composable () -> Unit)? = null,
    errorContent: (@Composable (String) -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    val visibleLoading = rememberFlickerlessLoading(loading, delayMs, minDurationMs)
    // Resuelta = hubo una respuesta. Montar sin cargar y con la lista vacía NO lo es (la petición
    // aún no salió): seguir así sería pintar «vacío» y «0» falsos.
    var sawLoading by remember { mutableStateOf(loading) }
    var loadFinished by remember { mutableStateOf(!loading && !empty) }
    LaunchedEffect(loading, error, empty) {
        if (loading) sawLoading = true
        else if (!empty || (error == null && sawLoading)) loadFinished = true
    }
    val isSettled = settled ?: loadFinished
    val alpha by animateFloatAsState(if (visibleLoading && keepPreviousData && !empty) 0.55f else 1f, tween(150), label = "flickerless")

    CompositionLocalProvider(LocalFlickerlessSettled provides isSettled) {
        Column(
            modifier.semantics {
                liveRegion = LiveRegionMode.Polite
                if (visibleLoading) stateDescription = announceText
            },
        ) {
            FlickerlessStream(visibleLoading)
            when {
                error != null && errorContent != null -> errorContent(error)
                error != null && empty -> FlickerlessError(message = error, onRetry = onRetry)
                error != null -> {
                    if (errorText.isNotEmpty()) FlickerlessInlineError(errorText, onRetry)
                    Column(Modifier.weight(1f, fill = false).alpha(alpha), content = content)
                }
                isSettled && !loading && empty && emptyContent != null -> emptyContent()
                // La lista y su ListPager van uno debajo del otro: `LazyColumn(Modifier.weight(1f))`.
                else -> Column(Modifier.weight(1f, fill = false).alpha(alpha), content = content)
            }
        }
    }
}

/** Un fallo de carga NO es una lista vacía: se enseña el motivo y se ofrece reintentar. */
@Composable
fun FlickerlessError(
    message: String,
    onRetry: (() -> Unit)?,
    modifier: Modifier = Modifier,
    title: String = "No se pudo cargar la consulta",
    retryText: String = "Reintentar",
) {
    val colors = DevforgeTheme.colors
    val type = DevforgeTheme.type
    Column(
        modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 40.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(Modifier.size(40.dp).background(colors.danger.copy(alpha = 0.1f), DevforgeTheme.shapes.pill), contentAlignment = Alignment.Center) {
            DfIcon(DfIconName.ERROR, tint = colors.danger)
        }
        Text(title, style = type.small.copy(fontWeight = FontWeight.Bold), color = colors.foreground, modifier = Modifier.padding(top = 8.dp))
        Text(message, style = type.caption, color = colors.mutedForeground, modifier = Modifier.padding(top = 2.dp))
        if (onRetry != null) {
            devforge.ui.components.DfButton(
                text = retryText,
                onClick = onRetry,
                variant = devforge.ui.components.DfButtonVariant.SECONDARY,
                icon = DfIconName.REFRESH,
                modifier = Modifier.padding(top = 12.dp),
            )
        }
    }
}

@Composable
private fun FlickerlessInlineError(text: String, onRetry: (() -> Unit)?) {
    val colors = DevforgeTheme.colors
    Row(
        Modifier
            .fillMaxWidth()
            .background(colors.danger.copy(alpha = 0.1f))
            .padding(horizontal = 16.dp, vertical = 8.dp)
            .semantics { liveRegion = LiveRegionMode.Assertive },
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        DfIcon(DfIconName.ERROR, size = 16.dp, tint = colors.danger)
        Text(text, style = DevforgeTheme.type.small, color = colors.danger, modifier = Modifier.weight(1f))
        if (onRetry != null) {
            devforge.ui.components.DfButton("Reintentar", onClick = onRetry, variant = devforge.ui.components.DfButtonVariant.SECONDARY, compact = true)
        }
    }
}

/**
 * Flickerless en frío: la lista REAL antes de la primera respuesta, con «—» en cada dato.
 * Va solo cuando no hay filas que conservar.
 */
@Composable
fun FlickerlessListShell(rows: Int = 4, cells: Int = 2, modifier: Modifier = Modifier) {
    val colors = DevforgeTheme.colors
    Column(modifier.fillMaxWidth().clearAndSetSemantics { }) {
        repeat(rows) {
            Row(
                Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                repeat(cells) { i ->
                    Box(if (i == 0) Modifier.weight(1f) else Modifier.width(72.dp)) {
                        FlickerlessValue(value = null, style = DevforgeTheme.type.small)
                    }
                }
            }
            Box(Modifier.fillMaxWidth().height(1.dp).background(colors.border))
        }
    }
}

/** Recuadro de medios (icono, miniatura) de una carcasa: solo el borde, sin gris que imite nada. */
@Composable
internal fun ShellMedia(modifier: Modifier = Modifier) {
    val colors = DevforgeTheme.colors
    Box(modifier.size(40.dp).border(1.dp, colors.border, DevforgeTheme.shapes.control).background(colors.surface, DevforgeTheme.shapes.control))
}
