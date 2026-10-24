package devforge.ui.components

/**
 * ⚡ DEVFORGE ThemeSelector — Claro / Oscuro / Sistema, obligatorio en todo proyecto (Ajustes,
 * menú de usuario). Guarda la elección con `ThemeEngine` y la app cambia al instante.
 *
 *   ThemeSelector()
 */

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import devforge.core.theme.ThemeEngine
import devforge.core.theme.ThemePreference
import devforge.ui.theme.DevforgeTheme

@Composable
fun ThemeSelector(modifier: Modifier = Modifier) {
    val colors = DevforgeTheme.colors
    val current by ThemeEngine.preference.collectAsState()
    Row(
        modifier
            .border(1.dp, colors.border, DevforgeTheme.shapes.control)
            .background(colors.surface, DevforgeTheme.shapes.control)
            .padding(3.dp)
            .selectableGroup(),
        horizontalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        ThemePreference.entries.forEach { option ->
            val selected = option == current
            Box(
                Modifier
                    .height(32.dp)
                    .background(if (selected) colors.surfaceRaised else Color.Transparent, DevforgeTheme.shapes.control)
                    .then(if (selected) Modifier.border(1.dp, colors.border, DevforgeTheme.shapes.control) else Modifier)
                    .clickable(role = Role.RadioButton) { ThemeEngine.setPreference(option) }
                    .semantics { this.selected = selected }
                    .padding(horizontal = 12.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    option.label,
                    style = DevforgeTheme.type.small.copy(fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium),
                    color = if (selected) colors.foreground else colors.mutedForeground,
                )
            }
        }
    }
}
