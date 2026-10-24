package devforge.ui.components

/**
 * ⚡ DEVFORGE SelectField — el combo estándar. Reemplaza al `ExposedDropdownMenuBox` armado a mano
 * y al `Spinner`: el rótulo va DENTRO del campo, el menú sigue el tema (Claro / Oscuro), no se
 * recorta dentro de un diálogo (es un popup) y una opción no disponible se ve apagada, no se esconde.
 *
 *   SelectField(value = filtros.estado, onValueChange = vm::setEstado, label = "Estado", options = estados)
 *
 * Opciones: `SelectOption(value, label, disabled?, group?, hint?)`. Para catálogos que no caben en
 * memoria (clientes, artículos) NO es este: es `RecordPickerModal`, que busca en el servidor.
 */

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
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
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.disabled
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import devforge.ui.theme.DevforgeTheme

data class SelectOption<T>(
    val value: T,
    val label: String,
    /** Se muestra apagada (no se esconde): el usuario ve que existe y que no aplica. */
    val disabled: Boolean = false,
    /** Encabezado bajo el que se agrupa. */
    val group: String? = null,
    /** Línea de ayuda debajo del nombre, solo en el menú. */
    val hint: String? = null,
)

@Composable
fun <T> SelectField(
    value: T?,
    onValueChange: (T) -> Unit,
    options: List<SelectOption<T>>,
    modifier: Modifier = Modifier,
    label: String? = null,
    placeholder: String = "Seleccionar…",
    compact: Boolean = false,
    enabled: Boolean = true,
    /** Sin borde ni fondo: dentro de otra barra (el filtro de período). */
    borderless: Boolean = false,
) {
    val colors = DevforgeTheme.colors
    val type = DevforgeTheme.type
    val shape = DevforgeTheme.shapes.control
    var open by remember { mutableStateOf(false) }
    val selected = options.firstOrNull { it.value == value }
    val chevron by animateFloatAsState(if (open) 180f else 0f, label = "chevron")

    Box(modifier) {
        Row(
            Modifier
                .fillMaxWidth()
                .heightIn(min = if (compact) 36.dp else 44.dp)
                .alpha(if (enabled) 1f else 0.6f)
                .then(
                    if (borderless) Modifier
                    else Modifier
                        .then(if (open) Modifier.border(4.dp, colors.ring, shape) else Modifier)
                        .background(colors.surface, shape)
                        .border(1.dp, if (open) colors.primaryBorder else colors.border, shape),
                )
                .clickable(enabled = enabled, role = Role.DropdownList) { open = !open }
                .semantics {
                    contentDescription = label ?: selected?.label ?: placeholder
                    stateDescription = selected?.label ?: placeholder
                }
                .padding(horizontal = if (compact) 12.dp else 16.dp, vertical = if (compact) 6.dp else 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Column(Modifier.weight(1f)) {
                if (label != null) FieldLabel(label, Modifier.padding(bottom = 4.dp))
                Text(
                    text = selected?.label ?: placeholder,
                    style = (if (compact) type.small else type.body).copy(fontWeight = FontWeight.SemiBold),
                    color = if (selected != null) colors.foreground else colors.dimForeground,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            DfIcon(DfIconName.CHEVRON_DOWN, Modifier.rotate(chevron), tint = if (open) colors.foreground else colors.mutedForeground)
        }

        DropdownMenu(
            expanded = open,
            onDismissRequest = { open = false },
            modifier = Modifier.widthIn(min = 200.dp).padding(horizontal = 6.dp),
            shape = DevforgeTheme.shapes.card,
            containerColor = colors.surfaceRaised,
            tonalElevation = 0.dp,
            shadowElevation = 12.dp,
            border = BorderStroke(1.dp, colors.border),
        ) {
            if (options.isEmpty()) {
                Text(
                    "Sin opciones disponibles",
                    style = type.caption,
                    color = colors.dimForeground,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                )
            }
            var lastGroup: String? = null
            options.forEach { option ->
                if (option.group != null && option.group != lastGroup) {
                    Text(
                        option.group.uppercase(),
                        style = type.label,
                        color = colors.dimForeground,
                        modifier = Modifier.padding(start = 14.dp, end = 14.dp, top = 8.dp, bottom = 4.dp),
                    )
                }
                lastGroup = option.group
                SelectOptionRow(option, isSelected = option.value == value) {
                    open = false
                    if (option.value != value) onValueChange(option.value)
                }
            }
        }
    }
}

@Composable
private fun <T> SelectOptionRow(option: SelectOption<T>, isSelected: Boolean, onClick: () -> Unit) {
    val colors = DevforgeTheme.colors
    val type = DevforgeTheme.type
    Row(
        Modifier
            .fillMaxWidth()
            .background(if (isSelected) colors.primarySubtle else Color.Transparent, DevforgeTheme.shapes.control)
            .then(if (isSelected) Modifier.border(1.dp, colors.primaryBorder, DevforgeTheme.shapes.control) else Modifier)
            .clickable(enabled = !option.disabled, role = Role.RadioButton, onClick = onClick)
            .semantics {
                selected = isSelected
                if (option.disabled) disabled()
            }
            .alpha(if (option.disabled) 0.5f else 1f)
            .padding(horizontal = 14.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Column(Modifier.weight(1f)) {
            Text(
                option.label,
                style = type.body.copy(fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal),
                color = colors.foreground,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            if (option.hint != null) {
                Text(option.hint, style = type.caption, color = colors.dimForeground, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
        }
        if (isSelected) DfIcon(DfIconName.CHECK, size = 16.dp, tint = colors.foreground)
    }
}
