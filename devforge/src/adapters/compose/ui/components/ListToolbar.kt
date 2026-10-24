package devforge.ui.components

/**
 * ⚡ DEVFORGE ListToolbar + ListTabs (Compose) — la barra estándar de un listado.
 * Siempre el mismo orden, así cada pantalla se lee igual:
 *
 *   ┌ pestañas con conteo ──────────────────────────── acciones (Exportar · Nuevo) ┐
 *   └ búsqueda · período · alcance ─────────────── · más filtros · cola (conteo) ──┘
 *
 *   ListToolbar(
 *       tabs = { ListTabs(selected = ui.estado, tabs = tabs, onSelect = vm::setEstado) },
 *       actions = { DfButton("Nueva factura", vm::nueva) },
 *       search = { SearchInput(ui.q, vm::setQ, placeholder = "Buscar por número o cliente", onSearch = { vm.load(page = 1) }) },
 *       period = { HistoryPeriodFilter(ui.rango, vm::setRango, pending = ui.estado == "pendientes", onChange = { vm.load(page = 1) }) },
 *   )
 *
 * Los filtros viajan al SERVIDOR (con `page` y `pageSize`); la barra no filtra filas en el cliente.
 */

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import devforge.core.formatters.formatNumber
import devforge.ui.flickerless.FlickerlessValue
import devforge.ui.theme.DevforgeTheme

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ListToolbar(
    modifier: Modifier = Modifier,
    tabs: (@Composable () -> Unit)? = null,
    actions: (@Composable RowScope.() -> Unit)? = null,
    search: (@Composable () -> Unit)? = null,
    period: (@Composable () -> Unit)? = null,
    scope: (@Composable () -> Unit)? = null,
    more: (@Composable RowScope.() -> Unit)? = null,
    trailing: (@Composable RowScope.() -> Unit)? = null,
) {
    Column(modifier.fillMaxWidth()) {
        if (tabs != null || actions != null) {
            Row(
                Modifier.fillMaxWidth().padding(start = 12.dp, end = 12.dp, top = 8.dp, bottom = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Box(Modifier.weight(1f)) { tabs?.invoke() }
                if (actions != null) Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically, content = actions)
            }
            DfDivider()
        }
        // Nada de esta fila pasa del ancho de la pantalla: en el teléfono la búsqueda ocupa la fila entera.
        FlowRow(
            Modifier.fillMaxWidth().padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            if (search != null) Box(Modifier.fillMaxWidth()) { search() }
            period?.invoke()
            scope?.invoke()
            if (more != null || trailing != null) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    more?.invoke(this)
                    trailing?.invoke(this)
                }
            }
        }
        DfDivider()
    }
}

data class ListTab(
    val id: String,
    val label: String,
    /** Conteo del servidor. `null` = aún no se sabe («—»); sin conteo, `hasCount = false`. */
    val count: Int? = null,
    val hasCount: Boolean = true,
)

/**
 * Pestañas de estado («Todos», «Pendientes»…) con su conteo. El conteo lo da el servidor para TODAS
 * las pestañas a la vez, sobre los mismos filtros SIN el estado (así «Pendientes 12» no cambia al
 * pasar a «Todos»). Ruedan de lado si no caben.
 */
@Composable
fun ListTabs(
    selected: String,
    tabs: List<ListTab>,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
    label: String = "Estados",
) {
    val colors = DevforgeTheme.colors
    Row(
        modifier
            .horizontalScroll(rememberScrollState())
            .selectableGroup()
            .semantics { contentDescription = label },
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        tabs.forEach { tab ->
            val active = tab.id == selected
            Row(
                Modifier
                    .height(32.dp)
                    .background(if (active) colors.primary else Color.Transparent, DevforgeTheme.shapes.control)
                    .clickable(role = Role.Tab) { if (!active) onSelect(tab.id) }
                    .semantics { this.selected = active }
                    .padding(horizontal = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Text(
                    tab.label,
                    style = DevforgeTheme.type.small.copy(fontWeight = FontWeight.Bold),
                    color = if (active) colors.primaryForeground else colors.mutedForeground,
                )
                if (tab.hasCount) {
                    Box(
                        Modifier
                            .defaultMinSize(minWidth = 20.dp)
                            .background(if (active) colors.primaryForeground.copy(alpha = 0.15f) else colors.surface, DevforgeTheme.shapes.pill)
                            .padding(horizontal = 6.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        FlickerlessValue(tab.count) { n ->
                            Text(
                                formatNumber(n),
                                style = DevforgeTheme.type.caption.copy(fontFeatureSettings = "tnum"),
                                color = if (active) colors.primaryForeground else colors.mutedForeground,
                            )
                        }
                    }
                }
            }
        }
    }
}
