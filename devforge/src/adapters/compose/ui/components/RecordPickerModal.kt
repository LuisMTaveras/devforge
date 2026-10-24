package devforge.ui.components

/**
 * ⚡ DEVFORGE RecordPickerModal (Compose) — elegir UN registro (cliente, proveedor, artículo)
 * buscando EN EL SERVIDOR: hay catálogos que no caben en memoria, y lo que un usuario puede ver lo
 * decide el servidor, no la app. Muestra resultados al abrir, busca desde la primera letra, pagina
 * con «Mostrar más», atrás cierra y el telón NO cierra.
 *
 *   RecordPickerModal(
 *       open = ui.eligiendoCliente, title = "Seleccionar cliente", placeholder = "Buscar por nombre, RNC o teléfono",
 *       fetch = { q, page, size -> clientes.buscar(q, page, size, fields = "id,nombre,rnc") },
 *       key = { it.id }, label = { it.nombre }, hint = { formatTaxId(it.rnc) },
 *       selectedKey = form.clienteId, onSelect = vm::setCliente, onClose = vm::cerrarSelector,
 *       footer = { DfButton("Nuevo cliente", vm::crearCliente, variant = DfButtonVariant.SECONDARY) },
 *   )
 */

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import devforge.core.search.RecordPage
import devforge.core.search.RecordSearch
import devforge.ui.flickerless.FlickerlessError
import devforge.ui.flickerless.FlickerlessStream
import devforge.ui.flickerless.FlickerlessValue
import devforge.ui.theme.DevforgeTheme

/** Un `RecordSearch` atado a la composición: se cancela al salir de pantalla. */
@Composable
fun <T> rememberRecordSearch(
    fetch: suspend (query: String, page: Int, pageSize: Int) -> RecordPage<T>,
    pageSize: Int = 20,
    debounceMs: Long = 200,
    minChars: Int = 0,
): RecordSearch<T> {
    val scope = rememberCoroutineScope()
    val latest by rememberUpdatedState(fetch)
    val search = remember(scope, pageSize, debounceMs, minChars) {
        RecordSearch<T>(scope, fetch = { q, page, size -> latest(q, page, size) }, pageSize = pageSize, debounceMs = debounceMs, minChars = minChars)
    }
    DisposableEffect(search) { onDispose { search.reset() } }
    return search
}

@Composable
fun <T> RecordPickerModal(
    open: Boolean,
    title: String,
    fetch: suspend (query: String, page: Int, pageSize: Int) -> RecordPage<T>,
    key: (T) -> String,
    onSelect: (T) -> Unit,
    onClose: () -> Unit,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    placeholder: String = "Buscar…",
    label: (T) -> String = { it.toString() },
    hint: ((T) -> String?)? = null,
    selectedKey: String? = null,
    emptyTitle: String = "Sin resultados",
    emptyText: String = "Todavía no hay registros.",
    pageSize: Int = 20,
    row: (@Composable (T) -> Unit)? = null,
    footer: (@Composable RowScope.() -> Unit)? = null,
) {
    if (!open) return
    val search = rememberRecordSearch(fetch, pageSize, debounceMs = 200)
    val state by search.state.collectAsState()
    var query by remember { mutableStateOf("") }
    val focus = remember { FocusRequester() }
    val colors = DevforgeTheme.colors
    LaunchedEffect(Unit) {
        search.flush()
        runCatching { focus.requestFocus() }
    }

    ModalShell(
        open = true,
        title = title,
        subtitle = subtitle,
        onClose = onClose,
        modifier = modifier,
        size = ModalSize.XXL,
        scrollable = false,
        padded = false,
        footer = footer,
    ) {
        Box(Modifier.padding(16.dp)) {
            SearchInput(
                value = query,
                onValueChange = {
                    query = it
                    search.setQuery(it)
                },
                placeholder = placeholder,
                debounceMs = 0,
                focusRequester = focus,
                onSearch = { search.flush() },
            )
        }
        DfDivider()
        FlickerlessStream(state.loading)
        Box(Modifier.fillMaxWidth().heightIn(min = 288.dp)) {
            when {
                state.error != null -> FlickerlessError(state.error!!, onRetry = search::flush, title = "No se pudo buscar")
                // Sin respuesta todavía: «—», nunca «no hay resultados».
                !state.settled && state.items.isEmpty() -> Column {
                    repeat(5) {
                        Row(Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Box(Modifier.size(36.dp).background(colors.surface, DevforgeTheme.shapes.pill))
                            FlickerlessValue(null, style = DevforgeTheme.type.small)
                        }
                        DfDivider()
                    }
                }
                state.items.isEmpty() -> EmptyState(
                    title = emptyTitle,
                    text = if (query.isNotBlank()) "Nada coincide con «${query.trim()}»." else emptyText,
                    icon = DfIconName.SEARCH,
                )
                else -> LazyColumn(Modifier.fillMaxWidth().heightIn(max = 480.dp).alpha(if (state.stale) 0.6f else 1f)) {
                    items(state.items, key = { key(it) }) { item ->
                        val isSelected = key(item) == selectedKey
                        Row(
                            Modifier
                                .fillMaxWidth()
                                .clickable(role = Role.Button) {
                                    onSelect(item)
                                    onClose()
                                }
                                .semantics { selected = isSelected }
                                .padding(horizontal = 20.dp, vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            Column(Modifier.weight(1f)) {
                                if (row != null) {
                                    row(item)
                                } else {
                                    Text(label(item), style = DevforgeTheme.type.small.copy(fontWeight = FontWeight.SemiBold), color = colors.foreground, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                    if (hint != null) {
                                        FlickerlessValue(hint(item)?.ifEmpty { null }, style = DevforgeTheme.type.caption.copy(color = colors.mutedForeground))
                                    }
                                }
                            }
                            if (isSelected) DfIcon(DfIconName.CHECK, size = 16.dp, tint = colors.foreground)
                        }
                        DfDivider()
                    }
                    if (state.hasMore) {
                        item {
                            Box(Modifier.fillMaxWidth().padding(12.dp), contentAlignment = Alignment.Center) {
                                DfButton(
                                    "Mostrar más",
                                    onClick = search::loadMore,
                                    variant = DfButtonVariant.SECONDARY,
                                    pending = state.loading,
                                    pendingText = "Cargando…",
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
