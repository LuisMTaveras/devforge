package devforge.core.dates

/**
 * ⚡ DEVFORGE Date Engine (Kotlin) — fuente única del campo de fecha y del filtro de período.
 * Gemelo de `core/dates/date-range.ts`; lo usan `DateField`, `DatePickerPanel` y `DateRangeFilter`.
 *
 * Una fecha de calendario es una CLAVE `yyyy-MM-dd` ([DayKey]), no un instante: "hoy" depende de
 * la zona, y se calcula en la del NEGOCIO (por defecto República Dominicana, UTC-4), no en la del
 * teléfono. La clave viaja tal cual a la API.
 *
 * Regla de negocio: el rango nunca se vacía por accidente. "Limpiar filtros" vuelve a HOY; solo
 * el atajo "Historial completo", elegido a propósito, quita el límite.
 */

import java.time.Clock
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeParseException

/** `yyyy-MM-dd`. Vacía (`""`) = sin fecha. */
typealias DayKey = String

enum class RangePreset(val label: String) {
    TODAY("Hoy"),
    YESTERDAY("Ayer"),
    WEEK("Últimos 7 días"),
    MONTH("Este mes"),
    QUARTER("Este trimestre"),
    YEAR("Este año"),
    CUSTOM("Rango personalizado"),
    ALL("Historial completo"),
}

data class DateRange(
    val preset: RangePreset,
    /** Clave `yyyy-MM-dd`. Vacía solo en el preset [RangePreset.ALL]. */
    val from: DayKey,
    val to: DayKey,
)

data class CalendarCell(
    val day: Int,
    val dateKey: DayKey,
    val isCurrentMonth: Boolean,
    val isToday: Boolean,
    val isDisabled: Boolean,
)

/** Parámetros de la petición (`?from=&to=`). En [RangePreset.ALL] ambos son `null`. */
data class RangeParams(val from: DayKey?, val to: DayKey?)

object DateConfig {
    /** Zona del negocio (IANA). Cámbiala con [setDateTimeZone]. */
    @Volatile
    var timeZone: ZoneId = ZoneId.of("America/Santo_Domingo")

    /** Reloj de "hoy". Solo los tests lo fijan. */
    @Volatile
    var clock: Clock = Clock.systemUTC()
}

/** Cambia la zona horaria del negocio, p. ej. `setDateTimeZone("America/Bogota")`. */
fun setDateTimeZone(timeZone: String) {
    DateConfig.timeZone = ZoneId.of(timeZone)
}

val MONTH_NAMES = listOf(
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
)

val MONTH_NAMES_SHORT = listOf("Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic")

/** De domingo a sábado, como el calendario de la web. */
val WEEK_DAYS = listOf("Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá")

private val DAY_KEY_RE = Regex("""^(\d{4})-(\d{2})-(\d{2})$""")

fun isDayKey(value: String?): Boolean =
    value != null && DAY_KEY_RE.matches(value) && runCatching { LocalDate.parse(value) }.isSuccess

private fun parse(key: DayKey): LocalDate? = try {
    LocalDate.parse(key)
} catch (_: DateTimeParseException) {
    null
}

/** La clave del día de un instante, vista en la zona del negocio. */
fun dayKeyOf(instant: Instant, timeZone: ZoneId = DateConfig.timeZone): DayKey = instant.atZone(timeZone).toLocalDate().toString()

fun dayKeyOf(date: LocalDate): DayKey = date.toString()

fun todayKey(timeZone: ZoneId = DateConfig.timeZone): DayKey = LocalDate.now(DateConfig.clock.withZone(timeZone)).toString()

/** Normaliza lo que llegue (clave o ISO completo) a una clave. Basura -> `""`. */
fun toDayKey(value: String?): DayKey {
    if (value.isNullOrBlank()) return ""
    if (isDayKey(value)) return value
    return runCatching { dayKeyOf(Instant.parse(value)) }.getOrDefault("")
}

/** Suma días a una clave (sin husos de por medio: es aritmética de calendario). */
fun shiftDayKey(key: DayKey, days: Int): DayKey = parse(key)?.plusDays(days.toLong())?.toString() ?: key

/** `2026-10-05` ➔ `05/10/2026` (día/mes/año, como se lee en RD y Latinoamérica). */
fun formatDayKey(key: DayKey?, fallback: String = "—"): String {
    val match = key?.let { DAY_KEY_RE.matchEntire(it) } ?: return fallback
    val (y, m, d) = match.destructured
    return "$d/$m/$y"
}

/** Año y mes (0-11) de una clave; sin clave válida, los de hoy. */
fun parseYearMonth(key: DayKey?): Pair<Int, Int> {
    val date = key?.let(::parse) ?: LocalDate.parse(todayKey())
    return date.year to date.monthValue - 1
}

/** Rejilla de 5 o 6 semanas (domingo a sábado) del mes `month` (0-11). */
fun buildCalendar(year: Int, month: Int, min: DayKey? = null, max: DayKey? = null): List<CalendarCell> {
    val today = todayKey()
    val first = LocalDate.of(year, month + 1, 1)
    val firstWeekday = first.dayOfWeek.value % 7 // domingo = 0
    val total = if (firstWeekday + first.lengthOfMonth() > 35) 42 else 35
    val start = first.minusDays(firstWeekday.toLong())
    return List(total) { i ->
        val date = start.plusDays(i.toLong())
        val key = date.toString()
        CalendarCell(
            day = date.dayOfMonth,
            dateKey = key,
            isCurrentMonth = date.month == first.month,
            isToday = key == today,
            isDisabled = (!min.isNullOrEmpty() && key < min) || (!max.isNullOrEmpty() && key > max),
        )
    }
}

/** Rango concreto de un atajo. [RangePreset.CUSTOM] conserva lo que ya hubiera elegido. */
fun makeRange(preset: RangePreset, current: DateRange? = null): DateRange {
    val today = todayKey()
    return when (preset) {
        RangePreset.TODAY -> DateRange(preset, today, today)
        RangePreset.YESTERDAY -> shiftDayKey(today, -1).let { DateRange(preset, it, it) }
        RangePreset.WEEK -> DateRange(preset, shiftDayKey(today, -6), today)
        RangePreset.MONTH -> DateRange(preset, "${today.substring(0, 7)}-01", today)
        RangePreset.QUARTER -> {
            // Trimestre civil: ene–mar, abr–jun, jul–sep, oct–dic.
            val firstMonth = (today.substring(5, 7).toInt() - 1) / 3 * 3 + 1
            DateRange(preset, "${today.substring(0, 4)}-${firstMonth.toString().padStart(2, '0')}-01", today)
        }
        RangePreset.YEAR -> DateRange(preset, "${today.substring(0, 4)}-01-01", today)
        RangePreset.ALL -> DateRange(preset, "", "")
        RangePreset.CUSTOM -> {
            val from = current?.from?.takeIf { it.isNotEmpty() } ?: today
            DateRange(preset, from, current?.to?.takeIf { it.isNotEmpty() } ?: from)
        }
    }
}

/** Rango con el que nace una consulta y al que vuelve "Limpiar filtros". */
fun defaultRange(preset: RangePreset = RangePreset.TODAY): DateRange = makeRange(preset)

/** Parámetros de la petición. [RangePreset.ALL] los omite para no acotar la consulta. */
fun resolveRange(range: DateRange): RangeParams {
    if (range.preset == RangePreset.ALL) return RangeParams(null, null)
    val from = range.from.ifEmpty { null }
    return RangeParams(from, range.to.ifEmpty { null } ?: from)
}

/** Un solo día: es cuando tienen sentido las flechas de día anterior/siguiente. */
fun isSingleDay(range: DateRange): Boolean =
    range.preset != RangePreset.ALL && range.from.isNotEmpty() && range.to.ifEmpty { range.from } == range.from

/** Mueve un rango de un día. Si cae en hoy o ayer recupera ese atajo. */
fun stepRangeDay(range: DateRange, delta: Int): DateRange {
    val today = todayKey()
    val day = shiftDayKey(range.from.ifEmpty { today }, delta)
    return when (day) {
        today -> makeRange(RangePreset.TODAY)
        shiftDayKey(today, -1) -> makeRange(RangePreset.YESTERDAY)
        else -> DateRange(RangePreset.CUSTOM, day, day)
    }
}

/** Normaliza un rango personalizado escrito al revés (hasta antes que desde). */
fun normalizeRange(range: DateRange): DateRange {
    if (range.preset != RangePreset.CUSTOM || range.from.isEmpty() || range.to.isEmpty()) return range
    return if (range.to < range.from) range.copy(from = range.to, to = range.from) else range
}

/** Etiqueta corta para la barra de estado del listado. */
fun rangeLabel(range: DateRange): String {
    if (range.preset == RangePreset.ALL) return RangePreset.ALL.label
    if (range.preset != RangePreset.CUSTOM) return "${range.preset.label} · ${formatDayKey(range.from)}"
    return if (range.from == range.to) formatDayKey(range.from) else "${formatDayKey(range.from)} — ${formatDayKey(range.to)}"
}
