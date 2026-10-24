package devforge.ui.components

/**
 * ⚡ DEVFORGE MoneyInput + MaskedInput (Compose) — gemelos de los de la web.
 *
 * MoneyInput: el valor es un NÚMERO (`BigDecimal?`; `null` si está vacío, nunca `0`: un monto vacío
 * no es cero). Sin foco muestra el monto con los separadores del país; con foco, el número limpio
 * para editar. La moneda la trae el documento: `currency = factura?.moneda`.
 *   MoneyInput(value = form.monto, onValueChange = vm::setMonto, label = "Monto")          // RD$ 1,500.00
 *
 * MaskedInput: cédula, RNC, «RNC / Cédula» y teléfono enmascarados MIENTRAS se escribe. Recibe y
 * devuelve el texto FORMATEADO; para guardar, `onlyDigits(form.cedula)`.
 *   MaskedInput(value = form.cedula, onValueChange = vm::setCedula, mask = InputMask.CEDULA, label = "Cédula")
 *
 * Prohibido un `OutlinedTextField` con `KeyboardType.Number` y `toDouble()` para montos o cédulas.
 */

import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.error
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import devforge.core.formatters.InputMask
import devforge.core.formatters.amountToEditable
import devforge.core.formatters.currencySymbol
import devforge.core.formatters.formatNumber
import devforge.core.formatters.parseAmount
import devforge.core.formatters.sanitizeAmountInput
import devforge.ui.theme.DevforgeTheme
import java.math.BigDecimal
import java.math.RoundingMode

@Composable
fun MoneyInput(
    value: BigDecimal?,
    onValueChange: (BigDecimal?) -> Unit,
    modifier: Modifier = Modifier,
    currency: String? = null,
    label: String? = null,
    placeholder: String = "0.00",
    decimals: Int = 2,
    enabled: Boolean = true,
    invalid: Boolean = false,
    compact: Boolean = false,
    /** Error de validación o ayuda debajo del campo. */
    supportingText: String? = null,
) {
    val colors = DevforgeTheme.colors
    val type = DevforgeTheme.type
    val interaction = remember { MutableInteractionSource() }
    var focused by remember { mutableStateOf(false) }
    var draft by remember { mutableStateOf(TextFieldValue("")) }
    val display = if (value == null) "" else formatNumber(value, minimumFractionDigits = decimals, maximumFractionDigits = decimals)
    val symbol = currencySymbol(currency)
    val textStyle = type.body.copy(fontWeight = FontWeight.SemiBold, fontFeatureSettings = "tnum", textAlign = TextAlign.End, color = colors.foreground)

    FieldFrame(modifier, label, invalid, enabled, compact, interaction, supportingText) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(symbol, style = type.small.copy(fontWeight = FontWeight.SemiBold), color = colors.dimForeground)
            Box(Modifier.weight(1f), contentAlignment = Alignment.CenterEnd) {
                val shown = if (focused) draft.text else display
                if (shown.isEmpty()) Text(placeholder, style = textStyle.copy(color = colors.dimForeground), modifier = Modifier.fillMaxWidth())
                BasicTextField(
                    value = if (focused) draft else TextFieldValue(display, TextRange(display.length)),
                    onValueChange = { next ->
                        val clean = sanitizeAmountInput(next.text, decimals = decimals)
                        draft = TextFieldValue(clean, TextRange(clean.length))
                        onValueChange(parseAmount(clean))
                    },
                    enabled = enabled,
                    singleLine = true,
                    textStyle = textStyle,
                    cursorBrush = SolidColor(colors.foreground),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    interactionSource = interaction,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 10.dp)
                        .semantics {
                            contentDescription = label ?: "Monto"
                            if (invalid) error(supportingText ?: "Monto inválido")
                        }
                        .onFocusChanged { state ->
                            if (state.isFocused && !focused) {
                                val editable = amountToEditable(value)
                                draft = TextFieldValue(editable, TextRange(editable.length))
                            }
                            if (!state.isFocused && focused) {
                                onValueChange(parseAmount(draft.text)?.setScale(decimals, RoundingMode.HALF_UP))
                            }
                            focused = state.isFocused
                        },
                )
            }
        }
    }
}

@Composable
fun MaskedInput(
    value: String,
    onValueChange: (String) -> Unit,
    mask: InputMask,
    modifier: Modifier = Modifier,
    label: String? = null,
    placeholder: String = mask.placeholder,
    enabled: Boolean = true,
    invalid: Boolean = false,
    compact: Boolean = false,
    supportingText: String? = null,
) {
    val colors = DevforgeTheme.colors
    val type = DevforgeTheme.type
    val interaction = remember { MutableInteractionSource() }
    // El valor crudo de la BD (8095781234) se normaliza solo al abrir el formulario.
    val formatted = mask.format(value)
    var field by remember { mutableStateOf(TextFieldValue(formatted, TextRange(formatted.length))) }
    // Controlado por el padre: si no aceptó el cambio (o lo cambió él), manda su valor.
    val shown = if (field.text == formatted) field else TextFieldValue(formatted, TextRange(formatted.length))
    val textStyle = type.body.copy(fontFeatureSettings = "tnum", color = colors.foreground)

    FieldFrame(modifier, label, invalid, enabled, compact, interaction, supportingText) {
        Box(contentAlignment = Alignment.CenterStart) {
            if (formatted.isEmpty()) Text(placeholder, style = textStyle.copy(color = colors.dimForeground))
            BasicTextField(
                value = shown,
                onValueChange = { next ->
                    // Se reescribe aunque el valor no cambie: una letra en una cédula no entra.
                    val masked = mask.format(next.text)
                    field = TextFieldValue(masked, TextRange(masked.length))
                    if (masked != formatted) onValueChange(masked)
                },
                enabled = enabled,
                singleLine = true,
                textStyle = textStyle,
                cursorBrush = SolidColor(colors.foreground),
                keyboardOptions = KeyboardOptions(
                    keyboardType = when (mask) {
                        InputMask.TAX_ID -> KeyboardType.Text // un pasaporte lleva letras
                        InputMask.PHONE -> KeyboardType.Phone
                        else -> KeyboardType.Number
                    },
                ),
                interactionSource = interaction,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 10.dp)
                    .semantics {
                        contentDescription = label ?: placeholder
                        if (invalid) error(supportingText ?: "Valor inválido")
                    },
            )
        }
    }
}
