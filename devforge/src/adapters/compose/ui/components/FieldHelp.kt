package devforge.ui.components

/**
 * ⚡ DEVFORGE FieldHelp (Compose) — la ayuda «?» de un campo. En un teléfono no hay «pasar el
 * cursor por encima»: se TOCA y se abre una burbuja junto al icono; se cierra tocando fuera o atrás.
 *
 *   Row(verticalAlignment = Alignment.CenterVertically) {
 *       FieldLabel("Tope de descuento")
 *       FieldHelp("Lo máximo que un vendedor puede rebajar sin pedir autorización.")
 *   }
 */

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import devforge.ui.theme.DevforgeTheme

@Composable
fun FieldHelp(
    text: String,
    modifier: Modifier = Modifier,
    title: String? = null,
    label: String = "Ayuda",
) {
    val colors = DevforgeTheme.colors
    var open by remember { mutableStateOf(false) }
    Box(modifier) {
        DfIconButton(DfIconName.HELP, label = title?.let { "$label: $it" } ?: label, onClick = { open = !open }, size = 28.dp, tint = colors.dimForeground, selected = open)
        DropdownMenu(
            expanded = open,
            onDismissRequest = { open = false },
            modifier = Modifier.widthIn(max = 288.dp).padding(horizontal = 14.dp, vertical = 4.dp),
            shape = DevforgeTheme.shapes.card,
            containerColor = colors.surfaceRaised,
            tonalElevation = 0.dp,
            shadowElevation = 12.dp,
            border = BorderStroke(1.dp, colors.border),
        ) {
            if (title != null) {
                Text(title, style = DevforgeTheme.type.small.copy(fontWeight = FontWeight.Bold), color = colors.foreground, modifier = Modifier.padding(bottom = 4.dp))
            }
            Text(text, style = DevforgeTheme.type.small, color = colors.mutedForeground)
        }
    }
}
