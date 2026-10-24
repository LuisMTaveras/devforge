package devforge.ui.components

/**
 * ⚡ DEVFORGE DateField + DateRangeField + DateRangeFilter (Compose) — gemelos de los de la web.
 *
 * El `DatePicker` de Material y el `DatePickerDialog` de Android están prohibidos: toman el idioma
 * y la zona del TELÉFONO (un emulador en UTC marca «hoy» al día siguiente a las 8 p. m. de RD),
 * ignoran los tokens y devuelven milisegundos. Aquí el valor es la CLAVE `yyyy-MM-dd` (`""` vacía)
 * que viaja tal cual a la API, «Hoy» es el de la zona del negocio y el calendario es el mismo de la web.
 *
 *   DateField(value = form.vencimiento, onValueChange = vm::setVencimiento, label = "Vencimiento", min = todayKey())
 *   DateField(value = form.proximaAccion, onValueChange = …, placeholder = "Sin fecha")      // opcional, con «Limpiar»
 *
 *   var periodo by rememberSaveable(stateSaver = DateRangeSaver) { mutableStateOf(defaultRange(RangePreset.MONTH)) }
 *   DateRangeFilter(value = periodo, onValueChange = { periodo = it }, onChange = { vm.load(resolveRange(it)) })
 */

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.Saver
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.disabled
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import devforge.core.dates.DateRange
import devforge.core.dates.DayKey
import devforge.core.dates.MONTH_NAMES
import devforge.core.dates.RangePreset
import devforge.core.dates.WEEK_DAYS
import devforge.core.dates.buildCalendar
import devforge.core.dates.formatDayKey
import devforge.core.dates.isSingleDay
import devforge.core.dates.makeRange
import devforge.core.dates.normalizeRange
import devforge.core.dates.parseYearMonth
import devforge.core.dates.stepRangeDay
import devforge.core.dates.todayKey
import devforge.ui.theme.DevforgeTheme

/** Para `rememberSaveable`: el período sobrevive a la rotación y a la muerte del proceso. */
val DateRangeSaver: Saver<DateRange, List<String>> = Saver(
    save = { listOf(it.preset.name, it.from, it.to) },
    restore = { DateRange(RangePreset.valueOf(it[0]), it[1], it[2]) },
)

/** Campo de UNA fecha de formulario. `value` es la clave `yyyy-MM-dd` o `""`. */
@Composable
fun DateField(
    value: DayKey,
    onValueChange: (DayKey) -> Unit,
    modifier: Modifier = Modifier,
    label: String? = null,
    placeholder: String = "dd/mm/aaaa",
    min: DayKey? = null,
    max: DayKey? = null,
    compact: Boolean = false,
    enabled: Boolean = true,
    /** `false` en una fecha obligatoria: sin «Limpiar». */
    clearable: Boolean = true,
) {
    var open by remember { mutableStateOf(false) }
    DateTrigger(
        text = if (value.isEmpty()) null else formatDayKey(value),
        placeholder = placeholder,
        label = label,
        compact = compact,
        enabled = enabled,
        open = open,
        modifier = modifier,
        onClick = { open = true },
    )
    if (open) {
        CalendarDialog(
            selection = value to value,
            range = false,
            min = min,
            max = max,
            clearable = clearable && value.isNotEmpty(),
            onDismiss = { open = false },
            onPick = { from, _ ->
                open = false
                if (from != value) onValueChange(from)
            },
            onClear = {
                open = false
                onValueChange("")
            },
        )
    }
}

/** Rango desde–hasta suelto (el «Rango personalizado» del filtro). Dos toques: desde y hasta. */
@Composable
fun DateRangeField(
    from: DayKey,
    to: DayKey,
    onRangeChange: (from: DayKey, to: DayKey) -> Unit,
    modifier: Modifier = Modifier,
    label: String? = null,
    placeholder: String = "Seleccionar rango",
    min: DayKey? = null,
    max: DayKey? = null,
    compact: Boolean = false,
    enabled: Boolean = true,
) {
    var open by remember { mutableStateOf(false) }
    val text = when {
        from.isEmpty() -> null
        to.isEmpty() || to == from -> formatDayKey(from)
        else -> "${formatDayKey(from)} — ${formatDayKey(to)}"
    }
    DateTrigger(text, placeholder, label, compact, enabled, open, modifier) { open = true }
    if (open) {
        CalendarDialog(
            selection = from to to,
            range = true,
            min = min,
            max = max,
            clearable = false,
            onDismiss = { open = false },
            onPick = { a, b ->
                open = false
                onRangeChange(a, b)
            },
            onClear = {},
        )
    }
}

@Composable
private fun DateTrigger(
    text: String?,
    placeholder: String,
    label: String?,
    compact: Boolean,
    enabled: Boolean,
    open: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    val colors = DevforgeTheme.colors
    val shape = DevforgeTheme.shapes.control
    Row(
        modifier
            .fillMaxWidth()
            .heightIn(min = if (compact) 36.dp else 44.dp)
            .alpha(if (enabled) 1f else 0.6f)
            .then(if (open) Modifier.border(4.dp, colors.ring, shape) else Modifier)
            .background(colors.surface, shape)
            .border(1.dp, if (open) colors.primaryBorder else colors.border, shape)
            .clickable(enabled = enabled, role = Role.Button, onClick = onClick)
            .semantics {
                contentDescription = label ?: placeholder
                stateDescription = text ?: placeholder
            }
            .padding(horizontal = if (compact) 12.dp else 16.dp, vertical = if (compact) 6.dp else 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Column(Modifier.weight(1f)) {
            if (label != null) FieldLabel(label, Modifier.padding(bottom = 4.dp))
            Text(
                text ?: placeholder,
                style = (if (compact) DevforgeTheme.type.small else DevforgeTheme.type.body).copy(fontWeight = FontWeight.SemiBold),
                color = if (text != null) colors.foreground else colors.dimForeground,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        DfIcon(DfIconName.CALENDAR, tint = colors.mutedForeground)
    }
}

@Composable
private fun CalendarDialog(
    selection: Pair<DayKey, DayKey>,
    range: Boolean,
    min: DayKey?,
    max: DayKey?,
    clearable: Boolean,
    onDismiss: () -> Unit,
    onPick: (DayKey, DayKey) -> Unit,
    onClear: () -> Unit,
) {
    val colors = DevforgeTheme.colors
    Dialog(onDismissRequest = onDismiss, properties = ShellDialogProperties) {
        Box(Modifier.fillMaxSize().padding(16.dp), contentAlignment = Alignment.Center) {
            Column(
                Modifier
                    .widthIn(max = 360.dp)
                    .fillMaxWidth()
                    .background(colors.surfaceRaised, DevforgeTheme.shapes.card)
                    .border(BorderStroke(1.dp, colors.border), DevforgeTheme.shapes.card),
            ) {
                DatePickerPanel(
                    selection = selection,
                    range = range,
                    min = min,
                    max = max,
                    onPick = onPick,
                    modifier = Modifier.padding(16.dp),
                )
                DfDivider()
                Row(
                    Modifier.fillMaxWidth().background(colors.surface).padding(horizontal = 16.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    if (clearable) DfButton("Limpiar", onClick = onClear, variant = DfButtonVariant.GHOST, compact = true)
                    Box(Modifier.weight(1f))
                    DfButton("Cancelar", onClick = onDismiss, variant = DfButtonVariant.SECONDARY, compact = true)
                }
            }
        }
    }
}

/**
 * El calendario: mes con flechas, semana de domingo a sábado, «Hoy» en la zona del negocio, días
 * fuera de `min` / `max` apagados. En `range`, el primer toque fija «desde» y el segundo «hasta»
 * (si el segundo es anterior, se invierten).
 */
@Composable
fun DatePickerPanel(
    selection: Pair<DayKey, DayKey>,
    onPick: (from: DayKey, to: DayKey) -> Unit,
    modifier: Modifier = Modifier,
    range: Boolean = false,
    min: DayKey? = null,
    max: DayKey? = null,
) {
    val colors = DevforgeTheme.colors
    val type = DevforgeTheme.type
    val start = parseYearMonth(selection.first.ifEmpty { null })
    var year by remember { mutableStateOf(start.first) }
    var month by remember { mutableStateOf(start.second) }
    var anchor by remember { mutableStateOf<DayKey?>(null) }
    val today = todayKey()
    val cells = remember(year, month, min, max, today) { buildCalendar(year, month, min, max) }
    val (selFrom, selTo) = if (range && anchor != null) anchor!! to anchor!! else selection

    fun shiftMonth(delta: Int) {
        val total = year * 12 + month + delta
        year = Math.floorDiv(total, 12)
        month = Math.floorMod(total, 12)
    }

    Column(modifier, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            DfIconButton(DfIconName.CHEVRON_LEFT, label = "Mes anterior", onClick = { shiftMonth(-1) })
            Text(
                "${MONTH_NAMES[month]} $year",
                style = type.body.copy(fontWeight = FontWeight.Bold),
                color = colors.foreground,
                modifier = Modifier.weight(1f),
                textAlign = TextAlign.Center,
            )
            DfIconButton(DfIconName.CHEVRON_RIGHT, label = "Mes siguiente", onClick = { shiftMonth(1) })
        }
        Row(Modifier.fillMaxWidth()) {
            WEEK_DAYS.forEach { d ->
                Text(
                    d,
                    style = type.caption.copy(fontWeight = FontWeight.Bold),
                    color = colors.dimForeground,
                    modifier = Modifier.weight(1f),
                    textAlign = TextAlign.Center,
                )
            }
        }
        cells.chunked(7).forEach { week ->
            Row(Modifier.fillMaxWidth()) {
                week.forEach { cell ->
                    val isEdge = cell.dateKey == selFrom || cell.dateKey == selTo
                    val inRange = range && selFrom.isNotEmpty() && selTo.isNotEmpty() && cell.dateKey > selFrom && cell.dateKey < selTo
                    Box(
                        Modifier
                            .weight(1f)
                            .aspectRatio(1f)
                            .padding(2.dp)
                            .background(
                                when {
                                    isEdge -> colors.primary
                                    inRange -> colors.primarySubtle
                                    else -> Color.Transparent
                                },
                                DevforgeTheme.shapes.control,
                            )
                            .then(if (cell.isToday && !isEdge) Modifier.border(1.dp, colors.primaryBorder, DevforgeTheme.shapes.control) else Modifier)
                            .clickable(enabled = !cell.isDisabled, role = Role.Button) {
                                if (!range) {
                                    onPick(cell.dateKey, cell.dateKey)
                                } else {
                                    val a = anchor
                                    if (a == null) {
                                        anchor = cell.dateKey
                                    } else {
                                        anchor = null
                                        if (cell.dateKey < a) onPick(cell.dateKey, a) else onPick(a, cell.dateKey)
                                    }
                                }
                            }
                            .semantics {
                                contentDescription = formatDayKey(cell.dateKey)
                                selected = isEdge
                                if (cell.isDisabled) disabled()
                            },
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            cell.day.toString(),
                            style = type.small.copy(fontWeight = if (isEdge || cell.isToday) FontWeight.Bold else FontWeight.Medium),
                            color = when {
                                isEdge -> colors.primaryForeground
                                cell.isDisabled || !cell.isCurrentMonth -> colors.dimForeground
                                else -> colors.foreground
                            },
                            modifier = Modifier.alpha(if (cell.isDisabled) 0.45f else 1f),
                        )
                    }
                }
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
            DfButton(
                "Hoy",
                onClick = {
                    val (y, m) = parseYearMonth(today)
                    year = y
                    month = m
                    if (!range) onPick(today, today)
                },
                variant = DfButtonVariant.SECONDARY,
                compact = true,
                enabled = (min.isNullOrEmpty() || today >= min) && (max.isNullOrEmpty() || today <= max),
            )
            if (range) {
                Text(
                    if (anchor == null) "Toca el primer día" else "Toca el último día",
                    style = type.caption,
                    color = colors.mutedForeground,
                )
            }
        }
    }
}

/**
 * El filtro de período de los listados: atajos (Hoy, Ayer, Este mes…), flechas de día anterior /
 * siguiente con un solo día, «Hoy» para volver y el rango personalizado. `onChange` solo sale
 * cuando el rango es utilizable: un personalizado a medio elegir no dispara la consulta.
 */
@Composable
fun DateRangeFilter(
    value: DateRange,
    onValueChange: (DateRange) -> Unit,
    modifier: Modifier = Modifier,
    onChange: (DateRange) -> Unit = {},
    /** `false` oculta "Historial completo" en listados que nunca deben traerlo todo. */
    allowAll: Boolean = true,
) {
    val colors = DevforgeTheme.colors
    val options = remember(allowAll) {
        RangePreset.entries.filter { allowAll || it != RangePreset.ALL }.map { SelectOption(it, it.label) }
    }
    fun apply(next: DateRange) {
        val normalized = normalizeRange(next)
        onValueChange(normalized)
        if (normalized.preset != RangePreset.CUSTOM || (normalized.from.isNotEmpty() && normalized.to.isNotEmpty())) onChange(normalized)
    }
    val single = isSingleDay(value)

    Column(modifier, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        // A 375 dp con flechas y «Hoy» no cabe todo: la barra rueda de lado en vez de desbordar.
        Row(
            Modifier
                .horizontalScroll(rememberScrollState())
                .heightIn(min = 40.dp)
                .background(colors.surfaceRaised, DevforgeTheme.shapes.control)
                .border(1.dp, colors.border, DevforgeTheme.shapes.control)
                .padding(horizontal = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            // Flechas solo con un día: mover «este mes» un día no significa nada.
            if (single) DfIconButton(DfIconName.CHEVRON_LEFT, label = "Día anterior", onClick = { apply(stepRangeDay(value, -1)) }, size = 32.dp)
            Text("Período:", style = DevforgeTheme.type.small, color = colors.mutedForeground, modifier = Modifier.padding(start = 6.dp))
            SelectField(
                value = value.preset,
                onValueChange = { apply(makeRange(it, value)) },
                options = options,
                compact = true,
                borderless = true,
                modifier = Modifier.width(176.dp),
            )
            if (single) DfIconButton(DfIconName.CHEVRON_RIGHT, label = "Día siguiente", onClick = { apply(stepRangeDay(value, 1)) }, size = 32.dp)
            if (value.preset != RangePreset.TODAY) {
                DfButton("Hoy", onClick = { apply(makeRange(RangePreset.TODAY)) }, variant = DfButtonVariant.GHOST, compact = true)
            }
        }
        if (value.preset == RangePreset.CUSTOM) {
            DateRangeField(
                from = value.from,
                to = value.to,
                onRangeChange = { a, b -> apply(DateRange(RangePreset.CUSTOM, a, b)) },
                compact = true,
                modifier = Modifier.widthIn(max = 280.dp),
            )
        }
    }
}

/**
 * El filtro de fecha de una BANDEJA de documentos. Lo PENDIENTE es trabajo y se enseña entero:
 * en esa pestaña no hay rango, y se dice por qué en vez de esconder el control. Lo RESUELTO es
 * historial y se acota con el `DateRangeFilter` de siempre.
 */
@Composable
fun HistoryPeriodFilter(
    value: DateRange,
    onValueChange: (DateRange) -> Unit,
    pending: Boolean,
    modifier: Modifier = Modifier,
    onChange: (DateRange) -> Unit = {},
    pendingLabel: String = "Todos los pendientes, de cualquier fecha",
    allowAll: Boolean = true,
) {
    if (!pending) {
        DateRangeFilter(value, onValueChange, modifier, onChange, allowAll)
    } else {
        Row(
            modifier.height(40.dp).padding(horizontal = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            DfIcon(DfIconName.INBOX, size = 16.dp, tint = DevforgeTheme.colors.mutedForeground)
            Text(pendingLabel, style = DevforgeTheme.type.caption, color = DevforgeTheme.colors.mutedForeground)
        }
    }
}
