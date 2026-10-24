package devforge.ui.components

/**
 * ⚡ DEVFORGE ListPager (Compose) — el pie estándar de un listado paginado.
 *
 *   ListPager(page = ui.page, pageSize = ui.pageSize, total = ui.meta?.total, hasMore = ui.meta?.hasMore,
 *             onPageChange = vm::goTo, singular = "factura", plural = "facturas")
 *
 * «Mostrando 11–20 de 57 facturas» + ‹ 2 / 6 ›. El total de páginas se deriva del total y del
 * tamaño de página. Hasta la primera respuesta (`total = null`) muestra «—», nunca «0 de 0».
 * El servidor pagina: la lista pide `page` + `pageSize` y recibe la página Y el total.
 */

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.unit.dp
import devforge.core.formatters.formatNumber
import devforge.core.pagination.PageMeta
import devforge.core.pagination.pageState
import devforge.core.pagination.pageSummary
import devforge.ui.flickerless.FlickerlessValue
import devforge.ui.theme.DevforgeTheme

@Composable
fun ListPager(
    page: Int,
    pageSize: Int,
    total: Int?,
    onPageChange: (Int) -> Unit,
    modifier: Modifier = Modifier,
    hasMore: Boolean? = null,
    singular: String = "registro",
    plural: String = "registros",
) {
    val colors = DevforgeTheme.colors
    val fmt: (Int) -> String = { formatNumber(it, maximumFractionDigits = 0) }
    val meta = PageMeta(page, pageSize, total ?: 0, hasMore)
    val state = pageState(meta)
    fun go(target: Int) {
        if (target >= 1 && target != page) onPageChange(target)
    }

    Column(modifier) {
        DfDivider()
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Box(Modifier.weight(1f)) {
                FlickerlessValue(
                    value = if (total != null) pageSummary(meta, singular, plural, fmt) else null,
                    style = DevforgeTheme.type.caption.copy(color = colors.mutedForeground),
                )
            }
            DfIconButton(DfIconName.CHEVRON_LEFT, label = "Página anterior", onClick = { go(state.page - 1) }, enabled = state.hasPrev, size = 34.dp, tint = colors.foreground)
            // El total de páginas se ENSEÑA: sin él, el «2» no dice si queda algo detrás.
            Box(
                Modifier
                    .height(34.dp)
                    .border(1.dp, colors.border, DevforgeTheme.shapes.control)
                    .background(colors.surfaceRaised, DevforgeTheme.shapes.control)
                    .padding(horizontal = 12.dp)
                    .semantics { liveRegion = LiveRegionMode.Polite },
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    buildAnnotatedString {
                        append(fmt(state.page))
                        if (state.pages > 1) withStyle(SpanStyle(color = colors.dimForeground)) { append(" / ${fmt(state.pages)}") }
                    },
                    style = DevforgeTheme.type.small.copy(fontWeight = FontWeight.Bold, fontFeatureSettings = "tnum"),
                    color = colors.foreground,
                )
            }
            DfIconButton(DfIconName.CHEVRON_RIGHT, label = "Página siguiente", onClick = { go(state.page + 1) }, enabled = state.hasNext, size = 34.dp, tint = colors.foreground)
        }
    }
}
