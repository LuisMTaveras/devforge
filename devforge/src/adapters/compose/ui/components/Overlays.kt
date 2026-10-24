package devforge.ui.components

/**
 * ⚡ DEVFORGE ModalShell + DrawerShell + RowMenu (Compose) — gemelos de los de la web.
 *
 * ModalShell: el armazón de TODO diálogo con contenido propio (formulario, detalle): panel,
 * encabezado con «Cerrar», cuerpo que rueda y pie. Lo demás es siempre igual y vive aquí:
 *  - El TELÓN NO CIERRA: un formulario a medias no se pierde por un toque al lado.
 *  - Atrás (gesto o botón) cierra solo la capa de arriba (`onClose`).
 *  - En el teléfono la hoja sube desde abajo (donde está el pulgar); en tableta, centrada.
 *
 *   ModalShell(open = ui.creando, title = "Nuevo cliente", onClose = vm::cerrar,
 *       footer = { DfButton("Guardar", onClick = vm::guardar, pending = ui.guardando, pendingText = "Guardando…") }) {
 *       MaskedInput(…)
 *   }
 *
 * DrawerShell: el gemelo lateral, para CONSULTAR de lado (bitácora, detalle de un registro).
 * RowMenu: el menú ⋮ de una fila; una acción no disponible se ve apagada CON su motivo.
 *
 * Prohibidos en pantallas: `AlertDialog` / `Dialog` / `ModalBottomSheet` armados a mano y
 * `dismissOnClickOutside = true` en algo que se llena.
 */

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import devforge.ui.theme.DevforgeTheme

enum class ModalSize(val maxWidth: Dp) { SM(384.dp), MD(448.dp), LG(512.dp), XL(576.dp), XXL(672.dp), X4L(896.dp), X6L(1152.dp) }

enum class DrawerSize(val maxWidth: Dp) { MD(448.dp), LG(512.dp), XL(576.dp), XXL(672.dp), X3L(768.dp) }

/** El telón no cierra; atrás sí. Ancho libre: el panel decide el suyo. */
internal val ShellDialogProperties = DialogProperties(
    dismissOnBackPress = true,
    dismissOnClickOutside = false,
    usePlatformDefaultWidth = false,
)

@Composable
private fun ShellHeader(
    title: String,
    subtitle: String?,
    onClose: () -> Unit,
    actions: (@Composable RowScope.() -> Unit)? = null,
) {
    val colors = DevforgeTheme.colors
    Row(
        Modifier.fillMaxWidth().background(colors.surface).padding(start = 20.dp, end = 12.dp, top = 14.dp, bottom = 14.dp),
        verticalAlignment = Alignment.Top,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Column(Modifier.weight(1f).padding(top = 6.dp)) {
            Text(
                title,
                style = DevforgeTheme.type.body.copy(fontWeight = FontWeight.Bold),
                color = colors.foreground,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.semantics { heading() },
            )
            if (!subtitle.isNullOrEmpty()) {
                Text(subtitle, style = DevforgeTheme.type.caption, color = colors.mutedForeground, modifier = Modifier.padding(top = 2.dp))
            }
        }
        if (actions != null) Row(horizontalArrangement = Arrangement.spacedBy(6.dp), content = actions)
        DfIconButton(DfIconName.CLOSE, label = "Cerrar", onClick = onClose)
    }
    DfDivider()
}

@Composable
private fun ShellFooter(footer: @Composable RowScope.() -> Unit) {
    DfDivider()
    Row(
        Modifier.fillMaxWidth().background(DevforgeTheme.colors.surface).padding(horizontal = 20.dp, vertical = 14.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.End),
        verticalAlignment = Alignment.CenterVertically,
        content = footer,
    )
}

/** La línea de 1 dp con el token `border`. */
@Composable
fun DfDivider(modifier: Modifier = Modifier) {
    Box(modifier.fillMaxWidth().height(1.dp).background(DevforgeTheme.colors.border))
}

@Composable
fun ModalShell(
    open: Boolean,
    title: String,
    onClose: () -> Unit,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    size: ModalSize = ModalSize.LG,
    /** `false` cuando el cuerpo trae su propia lista que rueda (LazyColumn). */
    scrollable: Boolean = true,
    /** `false` quita el relleno del cuerpo (listas a todo el ancho). */
    padded: Boolean = true,
    footer: (@Composable RowScope.() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    if (!open) return
    val colors = DevforgeTheme.colors
    Dialog(onDismissRequest = onClose, properties = ShellDialogProperties) {
        BoxWithConstraints(Modifier.fillMaxSize().imePadding()) {
            val phone = maxWidth < 600.dp
            val panelMaxHeight = maxHeight * 0.92f
            val shape = if (phone) RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp) else DevforgeTheme.shapes.panel
            Box(
                Modifier.fillMaxSize().padding(if (phone) 0.dp else 16.dp),
                contentAlignment = if (phone) Alignment.BottomCenter else Alignment.Center,
            ) {
                Column(
                    modifier
                        .widthIn(max = size.maxWidth)
                        .fillMaxWidth()
                        .heightIn(max = panelMaxHeight)
                        .clip(shape)
                        .background(colors.surfaceRaised)
                        .border(BorderStroke(1.dp, colors.border), shape),
                ) {
                    ShellHeader(title, subtitle, onClose)
                    Column(
                        Modifier
                            .weight(1f, fill = false)
                            .then(if (scrollable) Modifier.verticalScroll(rememberScrollState()) else Modifier)
                            .then(if (padded) Modifier.padding(20.dp) else Modifier),
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                        content = content,
                    )
                    if (footer != null) ShellFooter(footer)
                }
            }
        }
    }
}

@Composable
fun DrawerShell(
    open: Boolean,
    title: String,
    onClose: () -> Unit,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    size: DrawerSize = DrawerSize.XXL,
    scrollable: Boolean = true,
    padded: Boolean = true,
    actions: (@Composable RowScope.() -> Unit)? = null,
    footer: (@Composable RowScope.() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    if (!open) return
    val colors = DevforgeTheme.colors
    Dialog(onDismissRequest = onClose, properties = ShellDialogProperties) {
        BoxWithConstraints(Modifier.fillMaxSize().imePadding(), contentAlignment = Alignment.CenterEnd) {
            Column(
                modifier
                    .fillMaxHeight()
                    .width(minOf(maxWidth, size.maxWidth))
                    .background(colors.surfaceRaised)
                    .border(BorderStroke(1.dp, colors.border)),
            ) {
                ShellHeader(title, subtitle, onClose, actions)
                Column(
                    Modifier
                        .weight(1f)
                        .then(if (scrollable) Modifier.verticalScroll(rememberScrollState()) else Modifier)
                        .then(if (padded) Modifier.padding(20.dp) else Modifier),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                    content = content,
                )
                if (footer != null) ShellFooter(footer)
            }
        }
    }
}

data class RowAction(
    val id: String,
    val label: String,
    val icon: DfIconName? = null,
    val danger: Boolean = false,
    /** Por qué está apagada («Ya está anulada»): una opción que desaparece no explica nada. */
    val disabledReason: String? = null,
    val disabled: Boolean = disabledReason != null,
    val separatorBefore: Boolean = false,
)

/**
 *   RowMenu(listOf(
 *       RowAction("ver", "Ver detalle", DfIconName.INFO),
 *       RowAction("anular", "Anular", danger = true, separatorBefore = true,
 *                 disabledReason = if (fila.anulable) null else "Ya está anulada"),
 *   )) { id -> vm.accion(id, fila) }
 */
@Composable
fun RowMenu(
    actions: List<RowAction>,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
    label: String = "Acciones",
) {
    val colors = DevforgeTheme.colors
    var open by remember { mutableStateOf(false) }
    Box(modifier) {
        DfIconButton(DfIconName.ELLIPSIS, label = label, onClick = { open = !open }, size = 32.dp, selected = open)
        DropdownMenu(
            expanded = open,
            onDismissRequest = { open = false },
            modifier = Modifier.width(224.dp).padding(horizontal = 6.dp),
            shape = DevforgeTheme.shapes.card,
            containerColor = colors.surfaceRaised,
            tonalElevation = 0.dp,
            shadowElevation = 12.dp,
            border = BorderStroke(1.dp, colors.border),
        ) {
            actions.forEach { action ->
                if (action.separatorBefore) DfDivider(Modifier.padding(vertical = 4.dp))
                val tint = when {
                    action.disabled -> colors.dimForeground
                    action.danger -> colors.danger
                    else -> colors.foreground
                }
                Row(
                    Modifier
                        .fillMaxWidth()
                        .clip(DevforgeTheme.shapes.control)
                        .clickable(enabled = !action.disabled, role = Role.Button) {
                            open = false
                            onSelect(action.id)
                        }
                        .alpha(if (action.disabled) 0.6f else 1f)
                        .padding(horizontal = 12.dp, vertical = 9.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    if (action.icon != null) DfIcon(action.icon, size = 16.dp, tint = tint)
                    Column(Modifier.weight(1f)) {
                        Text(action.label, style = DevforgeTheme.type.small, color = tint, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        if (action.disabledReason != null) {
                            Text(action.disabledReason, style = DevforgeTheme.type.caption, color = colors.dimForeground, maxLines = 2)
                        }
                    }
                }
            }
        }
    }
}
