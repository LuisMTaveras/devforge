package devforge.ui.components

/**
 * ⚡ DEVFORGE SearchInput (Compose) — la búsqueda de un listado o de un selector.
 *
 *   SearchInput(ui.q, vm::setQ, placeholder = "Buscar por número, cliente o RNC", onSearch = { vm.load(page = 1) })
 */

import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import devforge.ui.theme.DevforgeTheme
import kotlinx.coroutines.delay

/**
 * La búsqueda de un listado. `onValueChange` sigue cada tecla; `onSearch` sale cuando el usuario
 * hace una pausa (`debounceMs`), al pulsar «Buscar» del teclado o al limpiar. La búsqueda la hace
 * el SERVIDOR (con la página reiniciada a 1): nunca se filtran en el cliente filas ya traídas.
 */
@Composable
fun SearchInput(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    onSearch: (String) -> Unit = {},
    placeholder: String = "Buscar…",
    clearLabel: String = "Limpiar búsqueda",
    debounceMs: Long = 300,
    focusRequester: FocusRequester? = null,
) {
    val colors = DevforgeTheme.colors
    val type = DevforgeTheme.type
    val interaction = remember { MutableInteractionSource() }
    val search by rememberUpdatedState(onSearch)
    var last by remember { mutableStateOf(value.trim()) }
    fun fire(text: String) {
        val q = text.trim()
        if (q == last) return
        last = q
        search(q)
    }
    LaunchedEffect(value) {
        if (debounceMs > 0) delay(debounceMs)
        fire(value)
    }

    FieldFrame(modifier, interactionSource = interaction, compact = false) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            DfIcon(DfIconName.SEARCH, size = 16.dp, tint = colors.dimForeground)
            Box(Modifier.weight(1f), contentAlignment = Alignment.CenterStart) {
                if (value.isEmpty()) Text(placeholder, style = type.small, color = colors.dimForeground)
                BasicTextField(
                    value = value,
                    onValueChange = onValueChange,
                    singleLine = true,
                    textStyle = type.small.copy(color = colors.foreground),
                    cursorBrush = SolidColor(colors.foreground),
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                    keyboardActions = KeyboardActions(onSearch = { fire(value) }),
                    interactionSource = interaction,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 10.dp)
                        .then(if (focusRequester != null) Modifier.focusRequester(focusRequester) else Modifier)
                        .semantics { contentDescription = placeholder },
                )
            }
            if (value.isNotEmpty()) {
                DfIconButton(
                    DfIconName.CLOSE,
                    label = clearLabel,
                    onClick = {
                        onValueChange("")
                        fire("")
                    },
                    size = 28.dp,
                )
            }
        }
    }
}
