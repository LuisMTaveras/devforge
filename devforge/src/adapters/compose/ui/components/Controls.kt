package devforge.ui.components

/**
 * ⚡ DEVFORGE controles base (Compose): botón, insignia de estado y el marco de los campos.
 * En la web son clases de Tailwind; en Compose viven aquí para que ninguna pantalla repita
 * colores, alturas ni radios.
 *
 *   DfButton("Guardar", onClick = vm::guardar, pending = ui.guardando, pendingText = "Guardando…")
 *   DfButton("Eliminar", onClick = …, variant = DfButtonVariant.DANGER)
 *   DfBadge("Pendiente", DfTone.WARNING)
 *
 * Una acción asíncrona deshabilita su botón con SU texto («Guardando…»): sin doble envío.
 */

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import devforge.ui.theme.DevforgeTheme

enum class DfButtonVariant { PRIMARY, SECONDARY, GHOST, DANGER }

/** Tono semántico: el único lenguaje de color para estados. */
enum class DfTone { NEUTRAL, SUCCESS, WARNING, DANGER }

@Composable
fun DfButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    variant: DfButtonVariant = DfButtonVariant.PRIMARY,
    icon: DfIconName? = null,
    enabled: Boolean = true,
    /** En curso: deshabilitado y con [pendingText]. */
    pending: Boolean = false,
    pendingText: String? = null,
    compact: Boolean = false,
) {
    val colors = DevforgeTheme.colors
    val shape = DevforgeTheme.shapes.control
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val focused by interaction.collectIsFocusedAsState()
    val active = enabled && !pending
    val (bg, fg, borderColor) = when (variant) {
        DfButtonVariant.PRIMARY -> Triple(if (pressed) colors.primaryHover else colors.primary, colors.primaryForeground, Color.Transparent)
        DfButtonVariant.DANGER -> Triple(if (pressed) colors.danger.copy(alpha = 0.88f) else colors.danger, colors.dangerForeground, Color.Transparent)
        DfButtonVariant.SECONDARY -> Triple(if (pressed) colors.surfaceHover else colors.surfaceRaised, colors.foreground, colors.border)
        DfButtonVariant.GHOST -> Triple(if (pressed) colors.surfaceHover else Color.Transparent, colors.mutedForeground, Color.Transparent)
    }
    Row(
        modifier
            .defaultMinSize(minHeight = if (compact) 32.dp else 40.dp)
            .alpha(if (active) 1f else 0.5f)
            .then(if (focused) Modifier.border(4.dp, colors.ring, shape) else Modifier)
            .background(bg, shape)
            .border(1.dp, borderColor, shape)
            .clickable(enabled = active, role = Role.Button, interactionSource = interaction, indication = null, onClick = onClick)
            .padding(horizontal = if (compact) 12.dp else 16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp, Alignment.CenterHorizontally),
    ) {
        if (icon != null) DfIcon(icon, size = 16.dp, tint = fg)
        Text(
            text = if (pending) pendingText ?: text else text,
            style = DevforgeTheme.type.small.copy(fontWeight = FontWeight.SemiBold),
            color = fg,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

/** Botón de solo icono (cerrar, ⋮, flechas). `label` es obligatorio: lo lee TalkBack. */
@Composable
fun DfIconButton(
    icon: DfIconName,
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    size: Dp = 36.dp,
    tint: Color = DevforgeTheme.colors.mutedForeground,
    selected: Boolean = false,
) {
    val colors = DevforgeTheme.colors
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    Box(
        modifier
            .heightIn(min = size)
            .defaultMinSize(minWidth = size, minHeight = size)
            .alpha(if (enabled) 1f else 0.4f)
            .background(if (pressed || selected) colors.surfaceHover else Color.Transparent, DevforgeTheme.shapes.control)
            .clickable(enabled = enabled, role = Role.Button, onClickLabel = label, interactionSource = interaction, indication = null, onClick = onClick)
            .semantics { contentDescription = label },
        contentAlignment = Alignment.Center,
    ) {
        DfIcon(icon, tint = if (pressed || selected) colors.foreground else tint)
    }
}

/** Insignia de estado con tinte suave: borde 20 %, fondo 10 %, texto del tono. */
@Composable
fun DfBadge(text: String, tone: DfTone = DfTone.NEUTRAL, modifier: Modifier = Modifier) {
    val colors = DevforgeTheme.colors
    val (fg, bg, border) = toneColors(tone)
    Text(
        text = text,
        style = DevforgeTheme.type.caption.copy(fontWeight = FontWeight.SemiBold),
        color = fg,
        maxLines = 1,
        modifier = modifier
            .background(bg, DevforgeTheme.shapes.pill)
            .border(1.dp, border, DevforgeTheme.shapes.pill)
            .padding(horizontal = 10.dp, vertical = 2.dp),
    )
}

/** (texto, fondo, borde) de un tono. Neutral: `border-border bg-surface text-muted-foreground`. */
@Composable
fun toneColors(tone: DfTone): Triple<Color, Color, Color> {
    val colors = DevforgeTheme.colors
    return when (tone) {
        DfTone.NEUTRAL -> Triple(colors.mutedForeground, colors.surface, colors.border)
        DfTone.SUCCESS -> Triple(colors.success, colors.success.copy(alpha = 0.1f), colors.success.copy(alpha = 0.2f))
        DfTone.WARNING -> Triple(colors.warning, colors.warning.copy(alpha = 0.1f), colors.warning.copy(alpha = 0.2f))
        DfTone.DANGER -> Triple(colors.danger, colors.danger.copy(alpha = 0.1f), colors.danger.copy(alpha = 0.2f))
    }
}

/** Rótulo de un campo: MAYÚSCULAS espaciadas, atenuado. */
@Composable
fun FieldLabel(text: String, modifier: Modifier = Modifier) {
    Text(
        text = text.uppercase(),
        style = DevforgeTheme.type.label,
        color = DevforgeTheme.colors.mutedForeground,
        modifier = modifier,
    )
}

/**
 * El marco de un campo (monto, cédula, búsqueda): borde `input`, anillo de foco, `danger` si es
 * inválido. Lo usan MoneyInput, MaskedInput y SearchInput.
 */
@Composable
fun FieldFrame(
    modifier: Modifier = Modifier,
    label: String? = null,
    invalid: Boolean = false,
    enabled: Boolean = true,
    compact: Boolean = false,
    interactionSource: MutableInteractionSource,
    supportingText: String? = null,
    content: @Composable () -> Unit,
) {
    val colors = DevforgeTheme.colors
    val shape = DevforgeTheme.shapes.control
    val focused by interactionSource.collectIsFocusedAsState()
    Column(modifier.fillMaxWidth()) {
        if (label != null) FieldLabel(label, Modifier.padding(bottom = 6.dp))
        Box(
            Modifier
                .fillMaxWidth()
                .heightIn(min = if (compact) 36.dp else 44.dp)
                .alpha(if (enabled) 1f else 0.6f)
                .then(if (focused) Modifier.border(4.dp, colors.ring, shape) else Modifier)
                .background(colors.surface, shape)
                .border(1.dp, if (invalid) colors.danger else if (focused) colors.primaryBorder else colors.input, shape)
                .padding(horizontal = 14.dp),
            contentAlignment = Alignment.CenterStart,
        ) { content() }
        if (supportingText != null) {
            Text(
                supportingText,
                style = DevforgeTheme.type.caption.copy(fontWeight = FontWeight.SemiBold),
                color = if (invalid) colors.danger else colors.mutedForeground,
                modifier = Modifier.padding(top = 4.dp),
            )
        }
    }
}
