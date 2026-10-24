package devforge.core.formatters

/**
 * ⚡ DEVFORGE Input Masks (Kotlin) — identificadores y montos enmascarados MIENTRAS se escribe.
 * Gemelo de `core/formatters/input-masks.ts`.
 *
 * `Formatters.kt` formatea para MOSTRAR un dato guardado; esto formatea lo que el usuario está
 * tecleando. Son idempotentes y tolerantes: solo miran los dígitos, así que aceptan texto ya
 * formateado o pegado. Lo que se GUARDA es el valor limpio: `onlyDigits(cedula)`, `parseAmount(texto)`.
 *
 *   formatCedula("00112345678")     -> "001-1234567-8"
 *   formatRnc("101234567")          -> "1-01-23456-7"
 *   formatPhoneInput("8095781234")  -> "(809) 578-1234"
 *   parseAmount("RD$1,500.50")      -> 1500.50
 */

import java.math.BigDecimal
import java.text.DecimalFormatSymbols

/** Deja solo los dígitos. */
fun onlyDigits(value: CharSequence?): String = value?.filter { it.isDigit() }?.toString().orEmpty()

/** Cédula dominicana -> `000-0000000-0` (11 dígitos, 3-7-1). Progresiva. */
fun formatCedula(value: String?): String {
    val d = onlyDigits(value).take(11)
    return when {
        d.length <= 3 -> d
        d.length <= 10 -> "${d.substring(0, 3)}-${d.substring(3)}"
        else -> "${d.substring(0, 3)}-${d.substring(3, 10)}-${d.substring(10)}"
    }
}

/** RNC dominicano -> `0-00-00000-0` (9 dígitos, 1-2-5-1, formato DGII). Progresiva. */
fun formatRnc(value: String?): String {
    val d = onlyDigits(value).take(9)
    return when {
        d.length <= 1 -> d
        d.length <= 3 -> "${d.substring(0, 1)}-${d.substring(1)}"
        d.length <= 8 -> "${d.substring(0, 1)}-${d.substring(1, 3)}-${d.substring(3)}"
        else -> "${d.substring(0, 1)}-${d.substring(1, 3)}-${d.substring(3, 8)}-${d.substring(8)}"
    }
}

/**
 * Campo combinado «RNC / Cédula»: hasta 9 dígitos -> RNC; 10-11 -> cédula.
 * Con letras (un pasaporte) se deja tal cual.
 */
fun formatTaxId(value: String?): String {
    val raw = value.orEmpty()
    if (raw.any { it in 'a'..'z' || it in 'A'..'Z' }) return raw
    return if (onlyDigits(raw).length > 9) formatCedula(raw) else formatRnc(raw)
}

/** Teléfono NANP (RD, EE. UU., PR) -> `(000) 000-0000`. Tolera el `1` del país al pegar. */
fun formatPhoneInput(value: String?): String {
    var digits = onlyDigits(value)
    if (digits.length == 11 && digits.startsWith("1")) digits = digits.substring(1)
    val d = digits.take(10)
    return when {
        d.isEmpty() -> ""
        d.length <= 3 -> "($d"
        d.length <= 6 -> "(${d.substring(0, 3)}) ${d.substring(3)}"
        else -> "(${d.substring(0, 3)}) ${d.substring(3, 6)}-${d.substring(6)}"
    }
}

enum class InputMask(val placeholder: String, private val formatter: (String?) -> String) {
    CEDULA("000-0000000-0", ::formatCedula),
    RNC("0-00-00000-0", ::formatRnc),
    TAX_ID("RNC o cédula", ::formatTaxId),
    PHONE("(000) 000-0000", ::formatPhoneInput);

    fun format(value: String?): String = formatter(value)
}

/** Separador decimal del locale del proyecto (`.` en es-DO, `,` en es-CO). */
fun decimalSeparator(locale: String? = null): Char = DecimalFormatSymbols.getInstance(localeOf(locale)).decimalSeparator

/**
 * Texto de monto -> número, con el separador decimal del país. Ignora símbolo y miles.
 * `""` o basura -> `null` (nunca `0`: un monto vacío no es cero).
 */
fun parseAmount(text: String?, locale: String? = null): BigDecimal? {
    val decimal = decimalSeparator(locale)
    val cleaned = text.orEmpty()
        .filter { it.isDigit() || it == decimal || it == '-' }
        .replaceFirst(decimal, '.')
    if (cleaned.isEmpty() || cleaned == "-" || cleaned == ".") return null
    return cleaned.toBigDecimalOrNull()
}

/** Lo que se ve en el campo de monto MIENTRAS se escribe: solo dígitos y un separador decimal. */
fun sanitizeAmountInput(text: String, locale: String? = null, decimals: Int = 2): String {
    val decimal = decimalSeparator(locale)
    val parts = text.filter { it.isDigit() || it == decimal }.split(decimal)
    val int = parts.first()
    if (parts.size == 1) return int
    return "$int$decimal${parts.drop(1).joinToString("").take(decimals)}"
}

/** Valor del campo de monto al ENFOCARLO: el número sin miles, con el separador del país. */
fun amountToEditable(value: BigDecimal?, locale: String? = null): String {
    if (value == null) return ""
    val plain = if (value.signum() == 0) "0" else value.stripTrailingZeros().toPlainString()
    return plain.replace('.', decimalSeparator(locale))
}
