package devforge.core.formatters

/**
 * ⚡ DEVFORGE Localized Formatters (Kotlin / Android) — gemelo de `core/formatters/formatters.ts`.
 * Sin dependencias: `java.text` + `java.time` (minSdk 26, o desugaring de la librería estándar).
 *
 *   setFormatCountry(CountryCode.DO)            // una vez, en Application.onCreate()
 *   formatCurrency(factura?.total, currency = factura?.moneda)   // RD$17,870,000.00
 *   formatDate(factura?.fecha)                  // 11 sept 2026 (zona del negocio, no la del teléfono)
 *   formatPhoneNumber(cliente?.telefono)        // (809) 578-1234
 *
 * Todo lo que falta (`null`, vacío, basura) sale como «—», nunca como `0`, "null" o "NaN".
 */

import java.math.BigDecimal
import java.math.BigInteger
import java.math.RoundingMode
import java.text.NumberFormat
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle
import java.time.temporal.TemporalAccessor
import java.util.Currency
import java.util.Locale
import kotlin.math.abs
import kotlin.math.roundToLong

enum class CountryCode { DO, US, PR, CO, MX, ES, CL, PE, AR }

enum class PhoneDisplay { NATIONAL, INTERNATIONAL }

enum class DateStyle { SHORT, MEDIUM, LONG, DATETIME }

data class CountryPreset(
    val name: String,
    val locale: String,
    val currency: String,
    val dialCode: String,
    /** Zona IANA del día hábil del país (la de la capital). */
    val timeZone: String,
)

/** Un llamado a [setFormatCountry] configura separadores, nombres de fecha, moneda y teléfono. */
val COUNTRY_PRESETS: Map<CountryCode, CountryPreset> = mapOf(
    CountryCode.DO to CountryPreset("República Dominicana", "es-DO", "DOP", "1", "America/Santo_Domingo"),
    CountryCode.US to CountryPreset("Estados Unidos", "en-US", "USD", "1", "America/New_York"),
    CountryCode.PR to CountryPreset("Puerto Rico", "es-PR", "USD", "1", "America/Puerto_Rico"),
    CountryCode.CO to CountryPreset("Colombia", "es-CO", "COP", "57", "America/Bogota"),
    CountryCode.MX to CountryPreset("México", "es-MX", "MXN", "52", "America/Mexico_City"),
    CountryCode.ES to CountryPreset("España", "es-ES", "EUR", "34", "Europe/Madrid"),
    CountryCode.CL to CountryPreset("Chile", "es-CL", "CLP", "56", "America/Santiago"),
    CountryCode.PE to CountryPreset("Perú", "es-PE", "PEN", "51", "America/Lima"),
    CountryCode.AR to CountryPreset("Argentina", "es-AR", "ARS", "54", "America/Argentina/Buenos_Aires"),
)

data class FormatConfig(
    val defaultLocale: String = "es-DO",
    val defaultCurrency: String = "DOP",
    val defaultCountry: CountryCode = CountryCode.DO,
    val phoneDisplay: PhoneDisplay = PhoneDisplay.NATIONAL,
    val fallbackString: String = "—",
    /**
     * Fechas y horas se muestran en la zona del NEGOCIO, nunca en la del teléfono: un vendedor
     * de viaje (o un emulador en UTC) vería las 9:00 p. m. de Santo Domingo como el día siguiente.
     */
    val timeZone: String = "America/Santo_Domingo",
)

/** Valores del proyecto. Por defecto República Dominicana (es-DO, DOP, (809) 578-1234). */
@Volatile
var formatConfig: FormatConfig = FormatConfig()
    private set

fun setFormatDefaults(config: FormatConfig) {
    formatConfig = config
}

/**
 * Aplica el preset de un país en un llamado. Va una vez en `Application.onCreate()`.
 *   setFormatCountry(CountryCode.DO)  // es-DO, DOP, teléfonos (809) 578-1234
 */
fun setFormatCountry(country: CountryCode, overrides: FormatConfig.() -> FormatConfig = { this }) {
    val preset = COUNTRY_PRESETS.getValue(country)
    formatConfig = formatConfig.copy(
        defaultLocale = preset.locale,
        defaultCurrency = preset.currency,
        defaultCountry = country,
        timeZone = preset.timeZone,
    ).overrides()
}

internal fun localeOf(tag: String?): Locale = Locale.forLanguageTag(tag ?: formatConfig.defaultLocale)

private fun toDecimal(value: Number?): BigDecimal? = when (value) {
    null -> null
    is BigDecimal -> value
    is BigInteger -> value.toBigDecimal()
    is Double -> if (value.isFinite()) BigDecimal.valueOf(value) else null
    is Float -> if (value.isFinite()) BigDecimal(value.toString()) else null
    else -> BigDecimal.valueOf(value.toLong())
}

/**
 * Número con los separadores del país.
 * (es-DO) 1234567.891 -> "1,234,567.89" | (es-CO) "1.234.567,89"
 */
fun formatNumber(
    value: Number?,
    locale: String? = null,
    minimumFractionDigits: Int = 0,
    maximumFractionDigits: Int = 2,
): String {
    val num = toDecimal(value) ?: return formatConfig.fallbackString
    return NumberFormat.getNumberInstance(localeOf(locale)).apply {
        this.minimumFractionDigits = minimumFractionDigits
        this.maximumFractionDigits = maximumFractionDigits
        roundingMode = RoundingMode.HALF_UP
    }.format(num)
}

/**
 * Proporción como porcentaje. (es-DO) 0.125 -> "12.5%" | (es-CO) "12,5%".
 * `isRatio = false` cuando el valor ya viene en 0–100 (12.5).
 */
fun formatPercent(
    value: Number?,
    locale: String? = null,
    fractionDigits: Int = 1,
    isRatio: Boolean = true,
): String {
    val num = toDecimal(value) ?: return formatConfig.fallbackString
    val percent = if (isRatio) num.movePointRight(2) else num
    val loc = localeOf(locale)
    // Como `Intl`: pegado en Latinoamérica y EE. UU. («12.5%»), con espacio duro en España («12,5 %»).
    // El patrón del JDK / ICU varía entre versiones; este no.
    val suffix = if (loc.language == "es" && loc.country == "ES") "\u00a0%" else "%"
    return formatNumber(percent, locale, 0, fractionDigits) + suffix
}

/**
 * Monto con su moneda. La moneda la trae el DOCUMENTO: `formatCurrency(f?.total, currency = f?.moneda)`.
 * 17870000 -> "RD$17,870,000.00" (es-DO, DOP)
 */
fun formatCurrency(
    amount: Number?,
    currency: String? = null,
    locale: String? = null,
    minimumFractionDigits: Int = 2,
): String {
    val num = toDecimal(amount) ?: return formatConfig.fallbackString
    val code = currency?.takeIf { it.isNotBlank() } ?: formatConfig.defaultCurrency
    return NumberFormat.getCurrencyInstance(localeOf(locale)).apply {
        runCatching { this.currency = Currency.getInstance(code.uppercase()) }
        this.minimumFractionDigits = minimumFractionDigits
        maximumFractionDigits = 2
        roundingMode = RoundingMode.HALF_UP
    }.format(num)
}

/** Símbolo de la moneda como se escribe en el país (`RD$`, `US$`, `€`). */
fun currencySymbol(currency: String? = null, locale: String? = null): String {
    val code = currency?.takeIf { it.isNotBlank() } ?: formatConfig.defaultCurrency
    return runCatching { Currency.getInstance(code.uppercase()).getSymbol(localeOf(locale)) }.getOrDefault(code)
}

internal fun businessZone(): ZoneId = ZoneId.of(formatConfig.timeZone)

/** Un instante (o una fecha de calendario) visto en la zona del negocio. `null` si no se entiende. */
fun toBusinessDateTime(value: TemporalAccessor?): ZonedDateTime? {
    val zone = businessZone()
    return when (value) {
        null -> null
        is Instant -> value.atZone(zone)
        is ZonedDateTime -> value.withZoneSameInstant(zone)
        is OffsetDateTime -> value.atZoneSameInstant(zone)
        is LocalDateTime -> value.atZone(zone)
        is LocalDate -> value.atStartOfDay(zone)
        else -> runCatching { Instant.from(value).atZone(zone) }.getOrNull()
    }
}

/**
 * Texto ISO de la API -> instante. `2026-10-05` es una FECHA de calendario (no medianoche UTC:
 * eso la mostraría como el día 4 en RD); `2026-10-05T10:00` sin zona se lee en la del negocio.
 */
fun parseIsoDateTime(value: String?): TemporalAccessor? {
    val text = value?.trim()?.takeIf { it.isNotEmpty() } ?: return null
    return runCatching<TemporalAccessor> { Instant.parse(text) }
        .recoverCatching { OffsetDateTime.parse(text) }
        .recoverCatching { ZonedDateTime.parse(text) }
        .recoverCatching { LocalDateTime.parse(text) }
        .recoverCatching { LocalDate.parse(text) }
        .getOrNull()
}

private fun isSpanish(locale: Locale) = locale.language == "es"

private fun dateFormatter(style: DateStyle, locale: Locale): DateTimeFormatter {
    // Los patrones en español son los que pinta `Intl` en la web: 11/09/2026 · 11 sept 2026.
    val formatter = if (isSpanish(locale)) {
        DateTimeFormatter.ofPattern(
            when (style) {
                DateStyle.SHORT -> "dd/MM/yyyy"
                DateStyle.MEDIUM -> "d MMM yyyy"
                DateStyle.LONG -> "d 'de' MMMM 'de' yyyy"
                DateStyle.DATETIME -> "d MMM yyyy" // + la hora, en spanishTime()
            },
        )
    } else {
        when (style) {
            DateStyle.SHORT -> DateTimeFormatter.ofLocalizedDate(FormatStyle.SHORT)
            DateStyle.MEDIUM -> DateTimeFormatter.ofLocalizedDate(FormatStyle.MEDIUM)
            DateStyle.LONG -> DateTimeFormatter.ofLocalizedDate(FormatStyle.LONG)
            DateStyle.DATETIME -> DateTimeFormatter.ofLocalizedDateTime(FormatStyle.MEDIUM, FormatStyle.SHORT)
        }
    }
    return formatter.withLocale(locale)
}

/** Fecha localizada en la zona del negocio: "11 sept 2026" (es-DO, MEDIUM). */
fun formatDate(value: TemporalAccessor?, style: DateStyle = DateStyle.MEDIUM, locale: String? = null): String {
    val date = toBusinessDateTime(value) ?: return formatConfig.fallbackString
    val loc = localeOf(locale)
    if (style == DateStyle.DATETIME && isSpanish(loc)) {
        return "${dateFormatter(DateStyle.MEDIUM, loc).format(date)}, ${spanishTime(date, twoDigitHour = true)}"
    }
    return dateFormatter(style, loc).format(date)
}

/** Igual, desde el texto ISO de la API. */
fun formatDate(value: String?, style: DateStyle = DateStyle.MEDIUM, locale: String? = null): String =
    formatDate(parseIsoDateTime(value), style, locale)

/** Hora del día en la zona del negocio: "9:05 p. m." (es-DO). */
fun formatTime(value: TemporalAccessor?, locale: String? = null): String {
    val date = toBusinessDateTime(value) ?: return formatConfig.fallbackString
    val loc = localeOf(locale)
    if (isSpanish(loc)) return spanishTime(date, twoDigitHour = false)
    return DateTimeFormatter.ofLocalizedTime(FormatStyle.SHORT).withLocale(loc).format(date)
}

/** «9:05 p. m.» con espacios duros (no se parte en dos líneas). El marcador de ICU cambia entre versiones de Android. */
private fun spanishTime(date: ZonedDateTime, twoDigitHour: Boolean): String {
    val hour12 = (date.hour % 12).let { if (it == 0) 12 else it }
    val hour = if (twoDigitHour) hour12.toString().padStart(2, '0') else hour12.toString()
    val marker = if (date.hour < 12) "a.\u00a0m." else "p.\u00a0m."
    return "$hour:${date.minute.toString().padStart(2, '0')}\u00a0$marker"
}

fun formatTime(value: String?, locale: String? = null): String = formatTime(parseIsoDateTime(value), locale)

private enum class RelUnit(val seconds: Long, val es: Pair<String, String>, val en: String) {
    SECOND(1, "segundo" to "segundos", "second"),
    MINUTE(60, "minuto" to "minutos", "minute"),
    HOUR(3600, "hora" to "horas", "hour"),
    DAY(86_400, "día" to "días", "day"),
    WEEK(86_400 * 7, "semana" to "semanas", "week"),
    MONTH(86_400 * 30, "mes" to "meses", "month"),
    YEAR(86_400 * 365, "año" to "años", "year"),
}

private fun relativeAuto(unit: RelUnit, count: Long, spanish: Boolean): String? = when {
    unit == RelUnit.SECOND && count == 0L -> if (spanish) "ahora" else "now"
    unit == RelUnit.DAY && count == -1L -> if (spanish) "ayer" else "yesterday"
    unit == RelUnit.DAY && count == 1L -> if (spanish) "mañana" else "tomorrow"
    unit == RelUnit.DAY && count == -2L && spanish -> "anteayer"
    unit == RelUnit.DAY && count == 2L && spanish -> "pasado mañana"
    unit == RelUnit.WEEK && abs(count) == 1L ->
        if (spanish) (if (count < 0) "la semana pasada" else "la próxima semana") else (if (count < 0) "last week" else "next week")
    unit == RelUnit.MONTH && abs(count) == 1L ->
        if (spanish) (if (count < 0) "el mes pasado" else "el próximo mes") else (if (count < 0) "last month" else "next month")
    unit == RelUnit.YEAR && abs(count) == 1L ->
        if (spanish) (if (count < 0) "el año pasado" else "el próximo año") else (if (count < 0) "last year" else "next year")
    else -> null
}

/**
 * Tiempo relativo: "hace 5 minutos", "ayer", "dentro de 2 días". Español e inglés
 * (`java.text` no trae un `RelativeTimeFormat` y el de ICU solo existe en Android 24+).
 */
fun formatRelativeTime(value: TemporalAccessor?, now: Instant = Instant.now(), locale: String? = null): String {
    val date = toBusinessDateTime(value) ?: return formatConfig.fallbackString
    val diff = date.toInstant().epochSecond - now.epochSecond
    val unit = RelUnit.entries.lastOrNull { abs(diff) >= it.seconds } ?: RelUnit.SECOND
    val count = (diff.toDouble() / unit.seconds).roundToLong()
    val spanish = isSpanish(localeOf(locale))
    relativeAuto(unit, count, spanish)?.let { return it }
    val n = abs(count)
    val number = formatNumber(n, locale)
    return if (spanish) {
        val word = if (n == 1L) unit.es.first else unit.es.second
        if (count < 0) "hace $number $word" else "dentro de $number $word"
    } else {
        val word = if (n == 1L) unit.en else "${unit.en}s"
        if (count < 0) "$number $word ago" else "in $number $word"
    }
}

fun formatRelativeTime(value: String?, now: Instant = Instant.now(), locale: String? = null): String =
    formatRelativeTime(parseIsoDateTime(value), now, locale)

private class PhoneMask(val length: Int, val national: (String) -> String)

// NANP: República Dominicana (809/829/849), Estados Unidos, Puerto Rico
private val NANP_MASK = PhoneMask(10) { d -> "(${d.substring(0, 3)}) ${d.substring(3, 6)}-${d.substring(6)}" }

private val PHONE_MASKS: Map<CountryCode, PhoneMask> = mapOf(
    CountryCode.DO to NANP_MASK,
    CountryCode.US to NANP_MASK,
    CountryCode.PR to NANP_MASK,
    // 3001234567 -> (300) 123-4567
    CountryCode.CO to PhoneMask(10) { d -> "(${d.substring(0, 3)}) ${d.substring(3, 6)}-${d.substring(6)}" },
    // 5512345678 -> (55) 1234-5678
    CountryCode.MX to PhoneMask(10) { d -> "(${d.substring(0, 2)}) ${d.substring(2, 6)}-${d.substring(6)}" },
    // 612345678 -> 612 34 56 78
    CountryCode.ES to PhoneMask(9) { d -> "${d.substring(0, 3)} ${d.substring(3, 5)} ${d.substring(5, 7)} ${d.substring(7)}" },
    // 912345678 -> 9 1234 5678
    CountryCode.CL to PhoneMask(9) { d -> "${d.substring(0, 1)} ${d.substring(1, 5)} ${d.substring(5)}" },
    // 912345678 -> 912 345 678
    CountryCode.PE to PhoneMask(9) { d -> "${d.substring(0, 3)} ${d.substring(3, 6)} ${d.substring(6)}" },
)

/**
 * Teléfono con la máscara del país.
 *   formatPhoneNumber("8095781234")                                   -> "(809) 578-1234"
 *   formatPhoneNumber("18095781234", display = PhoneDisplay.INTERNATIONAL) -> "+1 (809) 578-1234"
 */
fun formatPhoneNumber(
    phone: String?,
    country: CountryCode = formatConfig.defaultCountry,
    display: PhoneDisplay = formatConfig.phoneDisplay,
): String {
    val digits = phone?.filter { it.isDigit() }.orEmpty()
    if (digits.isEmpty()) return formatConfig.fallbackString

    val mask = PHONE_MASKS[country]
    val dialCode = COUNTRY_PRESETS[country]?.dialCode
    if (mask != null && dialCode != null) {
        val national = when {
            digits.length == mask.length -> digits
            digits.length == dialCode.length + mask.length && digits.startsWith(dialCode) -> digits.substring(dialCode.length)
            else -> null
        }
        if (national != null) {
            val formatted = mask.national(national)
            return if (display == PhoneDisplay.INTERNATIONAL) "+$dialCode $formatted" else formatted
        }
    }
    // País o largo desconocido: los dígitos con un prefijo limpio.
    return "+$digits"
}

/** El valor, o «—» si es `null` o vacío. */
fun formatFallback(value: Any?, fallback: String = formatConfig.fallbackString): String =
    if (value == null || (value is CharSequence && value.isEmpty())) fallback else value.toString()
