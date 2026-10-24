package devforge.ui.components

/**
 * ⚡ DEVFORGE EmptyState + ListStaleNotice + ListStates + CardShell + DetailShell (Compose).
 *
 * EmptyState: lo que se ve cuando una lista RESPONDIÓ vacía (icono + titular + explicación +
 * acción). Solo con una respuesta en la mano: va en el `emptyContent` de `FlickerlessSurface`.
 *   EmptyState("Aún no hay facturas", "Las facturas que emitas aparecerán aquí.") { DfButton("Nueva factura", vm::nueva) }
 *
 * ListStaleNotice: «hay cambios nuevos», sin recargar la lista sola (le movería la fila que leía).
 *   if (ui.hayCambios) ListStaleNotice(onRefresh = vm::recargar)
 *
 * ListStates: los tres estados que no son filas —cargando, error y vacío— con el mismo texto y
 * tamaño en todas las listas. Va como primer `item` de la `LazyColumn` cuando no hay filas o falló:
 *   LazyColumn {
 *       if (ui.rows.isEmpty() || ui.error != null) item {
 *           ListStates(loading = ui.loading, error = ui.error, empty = ui.rows.isEmpty(), onRetry = vm::load,
 *                      emptyTitle = "Aún no hay facturas")
 *       }
 *       if (ui.error == null) items(ui.rows, key = { it.id }) { FacturaRow(it) }
 *   }
 *
 * CardShell / DetailShell: Flickerless en frío — la forma REAL (tarjetas, detalle) con «—» antes de la primera respuesta.
 */

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import devforge.ui.flickerless.FlickerlessError
import devforge.ui.flickerless.FlickerlessListShell
import devforge.ui.flickerless.FlickerlessValue
import devforge.ui.flickerless.LocalFlickerlessSettled
import devforge.ui.flickerless.ShellMedia
import devforge.ui.theme.DevforgeTheme

@Composable
fun EmptyState(
    title: String,
    text: String? = null,
    modifier: Modifier = Modifier,
    icon: DfIconName = DfIconName.INBOX,
    actions: (@Composable () -> Unit)? = null,
) {
    val colors = DevforgeTheme.colors
    Column(
        modifier.fillMaxWidth().heightIn(min = 192.dp).padding(horizontal = 24.dp, vertical = 40.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Box(Modifier.size(56.dp).background(colors.surface, DevforgeTheme.shapes.card), contentAlignment = Alignment.Center) {
            DfIcon(icon, size = 28.dp, tint = colors.mutedForeground)
        }
        Text(title, style = DevforgeTheme.type.body.copy(fontWeight = FontWeight.Bold), color = colors.foreground, textAlign = TextAlign.Center, modifier = Modifier.padding(top = 16.dp))
        if (text != null) {
            Text(text, style = DevforgeTheme.type.small, color = colors.mutedForeground, textAlign = TextAlign.Center, modifier = Modifier.widthIn(max = 384.dp).padding(top = 4.dp))
        }
        if (actions != null) {
            Row(Modifier.padding(top = 20.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) { actions() }
        }
    }
}

@Composable
fun ListStaleNotice(
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier,
    message: String = "Hay cambios nuevos en esta lista.",
    actionText: String = "Actualizar lista",
) {
    val colors = DevforgeTheme.colors
    Column(modifier) {
        Row(
            Modifier
                .fillMaxWidth()
                .background(colors.warning.copy(alpha = 0.1f))
                .padding(horizontal = 16.dp, vertical = 8.dp)
                .semantics { liveRegion = LiveRegionMode.Polite },
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            DfIcon(DfIconName.REFRESH, size = 16.dp, tint = colors.warning)
            Text(message, style = DevforgeTheme.type.small.copy(fontWeight = FontWeight.SemiBold), color = colors.foreground, modifier = Modifier.weight(1f))
            DfButton(actionText, onClick = onRefresh, variant = DfButtonVariant.SECONDARY, compact = true)
        }
        Box(Modifier.fillMaxWidth().height(1.dp).background(colors.warning.copy(alpha = 0.2f)))
    }
}

/**
 * @param error el mensaje ya normalizado (`normalizeApiError(e).message`). `null` = no hubo fallo.
 * @param settled ya hubo respuesta; sin él se lee de la `FlickerlessSurface` que envuelve la lista.
 */
@Composable
fun ListStates(
    loading: Boolean,
    error: String?,
    empty: Boolean,
    modifier: Modifier = Modifier,
    onRetry: (() -> Unit)? = null,
    settled: Boolean? = null,
    icon: DfIconName = DfIconName.INBOX,
    emptyTitle: String = "Sin resultados",
    emptyHint: String? = null,
    errorTitle: String = "No se pudo cargar la consulta",
    retryText: String = "Reintentar",
    shellRows: Int = 4,
    shellCells: Int = 2,
    emptyActions: (@Composable () -> Unit)? = null,
) {
    // «Vacío» solo con una respuesta en la mano: antes de la primera, la lista real con «—».
    val answered = settled ?: LocalFlickerlessSettled.current ?: true
    when {
        empty && (loading || (!answered && error == null)) -> FlickerlessListShell(shellRows, shellCells, modifier)
        // Un fallo de carga NO es una lista vacía: se enseña el motivo y se ofrece reintentar.
        error != null -> FlickerlessError(error, onRetry, modifier, errorTitle, retryText)
        empty -> EmptyState(emptyTitle, emptyHint, modifier, icon, emptyActions)
    }
}

/**
 * Flickerless en frío para tarjetas: las tarjetas REALES con «—» donde va cada dato, antes de la
 * primera respuesta. Usa el mismo `cardModifier` de las tarjetas de verdad: nada salta al llegar.
 */
@Composable
fun CardShell(
    modifier: Modifier = Modifier,
    count: Int = 6,
    lines: Int = 2,
    media: Boolean = false,
    footer: Boolean = false,
    cardModifier: @Composable () -> Modifier = {
        Modifier
            .fillMaxWidth()
            .background(DevforgeTheme.colors.surfaceRaised, DevforgeTheme.shapes.card)
            .border(1.dp, DevforgeTheme.colors.border, DevforgeTheme.shapes.card)
            .padding(16.dp)
    },
) {
    Column(modifier.clearAndSetSemantics { }, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        repeat(count) {
            Column(cardModifier()) {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    if (media) ShellMedia()
                    Column(Modifier.weight(1f)) {
                        FlickerlessValue(null, style = DevforgeTheme.type.body.copy(fontWeight = FontWeight.Bold))
                        repeat(lines) { FlickerlessValue(null, style = DevforgeTheme.type.caption) }
                    }
                }
                if (footer) {
                    Box(Modifier.padding(top = 16.dp).fillMaxWidth().height(8.dp).background(DevforgeTheme.colors.surface, DevforgeTheme.shapes.pill))
                }
            }
        }
    }
}

/**
 * La pantalla de detalle (factura, pedido, ficha) antes de la PRIMERA respuesta: cabecera, fichas
 * de resumen y líneas, con «—». Una recarga del mismo documento lo deja en pantalla, atenuado.
 *
 *   if (ui.loading && ui.factura == null) DetailShell() else FlickerlessSurface(loading = ui.loading) { … }
 */
@Composable
fun DetailShell(
    modifier: Modifier = Modifier,
    cards: Int = 3,
    rows: Int = 6,
    cells: Int = 3,
    announceText: String = "Cargando el documento…",
) {
    val colors = DevforgeTheme.colors
    Column(
        modifier.semantics { contentDescription = announceText },
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
            ShellMedia()
            Column(Modifier.weight(1f)) {
                FlickerlessValue(null, style = DevforgeTheme.type.title)
                FlickerlessValue(null, style = DevforgeTheme.type.caption)
            }
        }
        if (cards > 0) {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                repeat(cards) {
                    Column(
                        Modifier
                            .weight(1f)
                            .background(colors.surfaceRaised, DevforgeTheme.shapes.card)
                            .border(1.dp, colors.border, DevforgeTheme.shapes.card)
                            .padding(16.dp),
                    ) {
                        FlickerlessValue(null, style = DevforgeTheme.type.caption)
                        FlickerlessValue(null, style = DevforgeTheme.type.title, modifier = Modifier.padding(top = 4.dp))
                    }
                }
            }
        }
        Column(
            Modifier
                .fillMaxWidth()
                .background(colors.surfaceRaised, DevforgeTheme.shapes.card)
                .border(1.dp, colors.border, DevforgeTheme.shapes.card),
        ) {
            Box(Modifier.fillMaxWidth().background(colors.surface).padding(horizontal = 20.dp, vertical = 12.dp)) {
                FlickerlessValue(null, style = DevforgeTheme.type.caption)
            }
            FlickerlessListShell(rows, cells)
        }
    }
}
