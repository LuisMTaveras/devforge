package devforge.ui.components

/**
 * ⚡ DEVFORGE BatchProgressModal (Compose) — «Procesando 3 de 10…» mientras corre un lote.
 *
 *   val lote = remember { BatchTracker() }           // o en el ViewModel
 *   BatchProgressModal(lote)
 *   scope.launch { lote.run("Enviando facturas", items) { item, _ -> api.enviar(item.id); null } }
 *
 * Cerrarlo mientras corre solo lo esconde (`lote.reopen()` lo vuelve a mostrar). El único icono
 * que gira es el de la fila en curso: un indicador pequeño, no un spinner que tape.
 */

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.ProgressBarRangeInfo
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.progressBarRangeInfo
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import devforge.core.batch.BatchItemStatus
import devforge.core.batch.BatchRunState
import devforge.core.batch.BatchTracker
import devforge.core.batch.batchCountLabel
import devforge.core.batch.batchSummary
import devforge.core.formatters.formatNumber
import devforge.ui.theme.DevforgeTheme

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun BatchProgressModal(tracker: BatchTracker) {
    val state by tracker.state.collectAsState()
    val colors = DevforgeTheme.colors
    val fmt: (Int) -> String = { formatNumber(it, maximumFractionDigits = 0) }
    val running = state.state == BatchRunState.RUNNING
    val fraction = if (state.total > 0) state.processed.toFloat() / state.total else 0f
    val animated by animateFloatAsState(fraction, tween(300), label = "batch")
    val listState = rememberLazyListState()
    LaunchedEffect(state.currentId) {
        val index = state.items.indexOfFirst { it.id == state.currentId }
        if (index >= 0) listState.animateScrollToItem(index)
    }

    ModalShell(
        open = state.open,
        title = state.title,
        subtitle = if (running) "Procesando ${fmt(minOf(state.processed + 1, state.total))} de ${fmt(state.total)}…" else batchSummary(state, fmt),
        onClose = tracker::close,
        size = ModalSize.MD,
        scrollable = false,
        padded = false,
        footer = {
            DfButton(
                if (running) "Seguir en segundo plano" else "Cerrar",
                onClick = tracker::close,
                variant = if (running) DfButtonVariant.SECONDARY else DfButtonVariant.PRIMARY,
            )
        },
    ) {
        Column(Modifier.padding(horizontal = 20.dp, vertical = 16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(8.dp)
                    .background(colors.primarySubtle, DevforgeTheme.shapes.pill)
                    .semantics {
                        contentDescription = "Avance del lote"
                        progressBarRangeInfo = ProgressBarRangeInfo(state.processed.toFloat(), 0f..state.total.coerceAtLeast(1).toFloat())
                    },
            ) {
                Box(Modifier.fillMaxWidth(animated).fillMaxHeight().background(colors.primary, DevforgeTheme.shapes.pill))
            }
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                DfBadge(batchCountLabel(state.counts.done, skipped = false, format = fmt), DfTone.SUCCESS)
                if (state.counts.skipped > 0) DfBadge(batchCountLabel(state.counts.skipped, skipped = true, format = fmt), DfTone.WARNING)
                if (state.counts.failed > 0) DfBadge("${fmt(state.counts.failed)} con error", DfTone.DANGER)
            }
            if (state.error.isNotEmpty()) {
                Text(
                    state.error,
                    style = DevforgeTheme.type.small,
                    color = colors.danger,
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(colors.danger.copy(alpha = 0.1f), DevforgeTheme.shapes.control)
                        .border(1.dp, colors.danger.copy(alpha = 0.2f), DevforgeTheme.shapes.control)
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                )
            }
        }
        DfDivider()
        LazyColumn(Modifier.fillMaxWidth().heightIn(max = 420.dp), state = listState) {
            items(state.items, key = { it.id }) { item ->
                val look = statusLook(item.status)
                Row(
                    Modifier
                        .fillMaxWidth()
                        .background(if (item.id == state.currentId) colors.primarySubtle else Color.Transparent)
                        .padding(horizontal = 20.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.Top,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    StatusIcon(item.status, look.icon, look.tint)
                    Column(Modifier.weight(1f)) {
                        Text(item.label, style = DevforgeTheme.type.small.copy(fontWeight = FontWeight.SemiBold), color = colors.foreground, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        val sub = item.detail ?: item.sublabel
                        if (!sub.isNullOrEmpty()) {
                            Text(sub, style = DevforgeTheme.type.caption, color = if (item.detail != null) look.tint else colors.mutedForeground, maxLines = 2, overflow = TextOverflow.Ellipsis)
                        }
                    }
                    Text(look.label, style = DevforgeTheme.type.caption, color = colors.mutedForeground)
                }
                DfDivider()
            }
        }
    }
}

private data class StatusLook(val icon: DfIconName, val tint: Color, val label: String)

@Composable
private fun statusLook(status: BatchItemStatus): StatusLook {
    val colors = DevforgeTheme.colors
    return when (status) {
        BatchItemStatus.PENDING -> StatusLook(DfIconName.CLOCK, colors.dimForeground, "En cola")
        BatchItemStatus.RUNNING -> StatusLook(DfIconName.REFRESH, colors.foreground, "Procesando")
        BatchItemStatus.DONE -> StatusLook(DfIconName.SUCCESS, colors.success, "Listo")
        BatchItemStatus.SKIPPED -> StatusLook(DfIconName.MINUS, colors.warning, "Omitido")
        BatchItemStatus.FAILED -> StatusLook(DfIconName.ERROR, colors.danger, "Error")
    }
}

@Composable
private fun StatusIcon(status: BatchItemStatus, icon: DfIconName, tint: Color) {
    if (status != BatchItemStatus.RUNNING) {
        DfIcon(icon, size = 16.dp, tint = tint, modifier = Modifier.padding(top = 2.dp))
        return
    }
    val spin = rememberInfiniteTransition(label = "batch-row")
    val angle by spin.animateFloat(0f, 360f, infiniteRepeatable(tween(1000, easing = LinearEasing)), label = "batch-row-angle")
    DfIcon(icon, size = 16.dp, tint = tint, modifier = Modifier.padding(top = 2.dp).rotate(angle))
}
