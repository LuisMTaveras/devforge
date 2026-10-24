import devforge.core.formatters.CountryCode
import devforge.core.formatters.DateStyle
import devforge.core.formatters.InputMask
import devforge.core.formatters.PhoneDisplay
import devforge.core.formatters.amountToEditable
import devforge.core.formatters.currencySymbol
import devforge.core.formatters.formatCedula
import devforge.core.formatters.formatCurrency
import devforge.core.formatters.formatDate
import devforge.core.formatters.formatFallback
import devforge.core.formatters.formatNumber
import devforge.core.formatters.formatPercent
import devforge.core.formatters.formatPhoneInput
import devforge.core.formatters.formatPhoneNumber
import devforge.core.formatters.formatRelativeTime
import devforge.core.formatters.formatRnc
import devforge.core.formatters.formatTaxId
import devforge.core.formatters.formatTime
import devforge.core.formatters.onlyDigits
import devforge.core.formatters.parseAmount
import devforge.core.formatters.sanitizeAmountInput
import devforge.core.formatters.setFormatCountry
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import kotlin.test.AfterTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

// Los mismos casos que devforge/test/formatters.test.ts: la app Android y la web formatean igual.
class FormattersTest {
    @AfterTest
    fun restore() = setFormatCountry(CountryCode.DO)

    @Test
    fun `phone - Republica Dominicana national and international`() {
        assertEquals("(809) 578-1234", formatPhoneNumber("8095781234", CountryCode.DO))
        assertEquals("(829) 578-1234", formatPhoneNumber("829-578-1234", CountryCode.DO))
        assertEquals("(849) 578-1234", formatPhoneNumber("+1 849 578 1234", CountryCode.DO))
        assertEquals("+1 (809) 578-1234", formatPhoneNumber("8095781234", CountryCode.DO, PhoneDisplay.INTERNATIONAL))
    }

    @Test
    fun `phone - other countries`() {
        assertEquals("(300) 123-4567", formatPhoneNumber("3001234567", CountryCode.CO))
        assertEquals("+57 (300) 123-4567", formatPhoneNumber("573001234567", CountryCode.CO, PhoneDisplay.INTERNATIONAL))
        assertEquals("+52 (55) 1234-5678", formatPhoneNumber("5512345678", CountryCode.MX, PhoneDisplay.INTERNATIONAL))
        assertEquals("+34 612 34 56 78", formatPhoneNumber("612345678", CountryCode.ES, PhoneDisplay.INTERNATIONAL))
        assertEquals("9 1234 5678", formatPhoneNumber("912345678", CountryCode.CL))
        assertEquals("912 345 678", formatPhoneNumber("912345678", CountryCode.PE))
    }

    @Test
    fun `phone - null fallback`() {
        assertEquals("—", formatPhoneNumber(null))
        assertEquals("—", formatPhoneNumber(""))
    }

    @Test
    fun `numbers use the country separators`() {
        assertEquals("1,234,567.89", formatNumber(1234567.891, locale = "es-DO"))
        assertEquals("1.234.567,89", formatNumber(1234567.891, locale = "es-CO"))
        assertEquals("12.5%", formatPercent(0.125, locale = "es-DO"))
        assertEquals("12,5%", formatPercent(12.5, locale = "es-CO", isRatio = false))
        assertEquals("12,5\u00a0%", formatPercent(0.125, locale = "es-ES"))
        assertEquals("—", formatNumber(null))
    }

    @Test
    fun `defaults to Republica Dominicana`() {
        assertEquals("RD$17,870,000.00", formatCurrency(17870000))
        assertEquals("RD$1,500.50", formatCurrency(BigDecimal("1500.5")))
        assertEquals("US$250.00", formatCurrency(250, currency = "USD"))
        assertEquals("1,500.5", formatNumber(1500.5))
        assertEquals("(809) 578-1234", formatPhoneNumber("8095781234"))
        assertEquals("RD$", currencySymbol())
        assertEquals("—", formatCurrency(Double.NaN))
    }

    @Test
    fun `setFormatCountry switches the whole project`() {
        setFormatCountry(CountryCode.CO)
        // es-CO separa el símbolo con un espacio duro (U+00A0)
        assertEquals("$ 17.870.000,00", formatCurrency(17870000))
        assertEquals("1.500,5", formatNumber(1500.5))
        assertEquals("(300) 123-4567", formatPhoneNumber("3001234567"))
        setFormatCountry(CountryCode.DO)
        assertEquals("RD$17,870,000.00", formatCurrency(17870000))
    }

    @Test
    fun `dates are shown in the business time zone`() {
        // 01:30 UTC del 12 = 9:30 p. m. del 11 en Santo Domingo.
        val late = Instant.parse("2026-09-12T01:30:00Z")
        assertEquals("11/09/2026", formatDate(late, DateStyle.SHORT))
        assertEquals("11 de septiembre de 2026", formatDate(late, DateStyle.LONG))
        assertEquals("9:30\u00a0p.\u00a0m.", formatTime(late))
        assertEquals("11 sept 2026, 09:30\u00a0p.\u00a0m.", formatDate(late, DateStyle.DATETIME))
        assertEquals("11 sept 2026", formatDate(late))
        // Una fecha de calendario no se corre al día anterior.
        assertEquals("05/10/2026", formatDate("2026-10-05", DateStyle.SHORT))
        assertEquals("05/10/2026", formatDate(LocalDate.of(2026, 10, 5), DateStyle.SHORT))
        assertEquals("—", formatDate(null as String?))
        assertEquals("—", formatDate("no es fecha"))
    }

    @Test
    fun `relative time in Spanish`() {
        val now = Instant.parse("2026-10-24T15:00:00Z")
        assertEquals("hace 5 minutos", formatRelativeTime(now.minusSeconds(300), now))
        assertEquals("ayer", formatRelativeTime(now.minusSeconds(86_400), now))
        assertEquals("dentro de 3 horas", formatRelativeTime(now.plusSeconds(3 * 3600), now))
        assertEquals("ahora", formatRelativeTime(now, now))
        assertEquals("—", formatRelativeTime(null as String?, now))
    }

    @Test
    fun `fallback for missing values`() {
        assertEquals("—", formatFallback(null))
        assertEquals("—", formatFallback(""))
        assertEquals("Ana", formatFallback("Ana"))
    }

    @Test
    fun `input masks are progressive and idempotent`() {
        assertEquals("001-1234567-8", formatCedula("00112345678"))
        assertEquals("001-1234567-8", formatCedula("001-1234567-8"))
        assertEquals("001-12", formatCedula("00112"))
        assertEquals("1-01-23456-7", formatRnc("101234567"))
        assertEquals("1-01", formatRnc("101"))
        assertEquals("001-1234567-8", formatTaxId("00112345678"))
        assertEquals("1-01-23456-7", formatTaxId("101234567"))
        assertEquals("AB123456", formatTaxId("AB123456"))
        assertEquals("(809) 578-1234", formatPhoneInput("18095781234"))
        assertEquals("(809", formatPhoneInput("809"))
        assertEquals("", formatPhoneInput("abc"))
        assertEquals("00112345678", onlyDigits("001-1234567-8"))
        assertEquals("(809) 578", InputMask.PHONE.format("809578"))
    }

    @Test
    fun `amounts parse with the country decimal separator`() {
        assertEquals(BigDecimal("1500.50"), parseAmount("RD$1,500.50"))
        assertEquals(BigDecimal("1500.50"), parseAmount("$ 1.500,50", "es-CO"))
        assertNull(parseAmount(""))
        assertNull(parseAmount("-"))
        assertNull(parseAmount("abc"))
        assertEquals("1500.5", sanitizeAmountInput("1,500.555", decimals = 1))
        assertEquals("1500.55", sanitizeAmountInput("1500.5.5"))
        assertEquals("1500,5", amountToEditable(BigDecimal("1500.50"), "es-CO"))
        assertEquals("1500", amountToEditable(BigDecimal("1500.00")))
        assertEquals("", amountToEditable(null))
    }
}
