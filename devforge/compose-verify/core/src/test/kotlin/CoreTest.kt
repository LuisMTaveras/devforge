import devforge.core.batch.BatchItemInput
import devforge.core.batch.BatchItemStatus
import devforge.core.batch.BatchResult
import devforge.core.batch.BatchRunState
import devforge.core.batch.BatchTracker
import devforge.core.batch.batchSummary
import devforge.core.dates.DateConfig
import devforge.core.dates.DateRange
import devforge.core.dates.RangePreset
import devforge.core.dates.buildCalendar
import devforge.core.dates.formatDayKey
import devforge.core.dates.isSingleDay
import devforge.core.dates.makeRange
import devforge.core.dates.normalizeRange
import devforge.core.dates.rangeLabel
import devforge.core.dates.resolveRange
import devforge.core.dates.stepRangeDay
import devforge.core.dates.toDayKey
import devforge.core.dates.todayKey
import devforge.core.errors.ApiHttpException
import devforge.core.errors.normalizeApiError
import devforge.core.feedback.DialogCenter
import devforge.core.feedback.DialogTone
import devforge.core.feedback.ToastCenter
import devforge.core.feedback.ToastType
import devforge.core.feedback.confirmDialog
import devforge.core.feedback.notify
import devforge.core.feedback.promptDialog
import devforge.core.listcache.DocumentChanges
import devforge.core.listcache.TabCache
import devforge.core.listcache.patchRows
import devforge.core.pagination.PageMeta
import devforge.core.pagination.pageState
import devforge.core.pagination.pageSummary
import devforge.core.permissions.Ability
import devforge.core.permissions.Action
import devforge.core.permissions.Rule
import devforge.core.search.RecordPage
import devforge.core.search.RecordSearch
import devforge.core.security.safeLinkUrl
import devforge.core.theme.InMemoryThemeStore
import devforge.core.theme.ThemeEngine
import devforge.core.theme.ThemePreference
import java.io.IOException
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import kotlin.test.AfterTest
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.async
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest

@OptIn(ExperimentalCoroutinesApi::class)
class CoreTest {
    @BeforeTest
    fun fixToday() {
        // 02:00 UTC del 25 = 10:00 p. m. del 24 en Santo Domingo: "hoy" es el 24.
        DateConfig.clock = Clock.fixed(Instant.parse("2026-10-25T02:00:00Z"), ZoneOffset.UTC)
    }

    @AfterTest
    fun reset() {
        DateConfig.clock = Clock.systemUTC()
        ToastCenter.clear()
        DocumentChanges.reset()
    }

    @Test
    fun `pagination derives pages and never says 0 de 0`() {
        val s = pageState(PageMeta(page = 2, pageSize = 10, total = 57))
        assertEquals(6, s.pages)
        assertEquals(11, s.from)
        assertEquals(20, s.to)
        assertTrue(s.hasNext)
        assertFalse(pageState(PageMeta(page = 2, pageSize = 10, total = 57, hasMore = false)).hasNext)
        assertEquals("Mostrando 11–20 de 57 facturas", pageSummary(PageMeta(2, 10, 57), "factura", "facturas"))
        assertEquals("Sin facturas", pageSummary(PageMeta(1, 10, 0), "factura", "facturas"))
        assertEquals(1, pageState(PageMeta(9, 10, 5)).page)
    }

    @Test
    fun `today is the business day, not the UTC one`() {
        assertEquals("2026-10-24", todayKey())
        assertEquals("2026-10-24", toDayKey("2026-10-25T02:00:00Z"))
        assertEquals("", toDayKey("basura"))
        assertEquals("24/10/2026", formatDayKey("2026-10-24"))
        assertEquals("—", formatDayKey(""))
    }

    @Test
    fun `range presets`() {
        assertEquals(DateRange(RangePreset.WEEK, "2026-10-18", "2026-10-24"), makeRange(RangePreset.WEEK))
        assertEquals(DateRange(RangePreset.MONTH, "2026-10-01", "2026-10-24"), makeRange(RangePreset.MONTH))
        assertEquals("2026-10-01", makeRange(RangePreset.QUARTER).from)
        assertEquals("2026-01-01", makeRange(RangePreset.YEAR).from)
        assertNull(resolveRange(makeRange(RangePreset.ALL)).from)
        assertEquals(RangePreset.YESTERDAY, stepRangeDay(makeRange(RangePreset.TODAY), -1).preset)
        assertEquals(DateRange(RangePreset.CUSTOM, "2026-10-22", "2026-10-22"), stepRangeDay(makeRange(RangePreset.YESTERDAY), -1))
        assertTrue(isSingleDay(makeRange(RangePreset.TODAY)))
        assertFalse(isSingleDay(makeRange(RangePreset.MONTH)))
        assertEquals("2026-10-01", normalizeRange(DateRange(RangePreset.CUSTOM, "2026-10-09", "2026-10-01")).from)
        assertEquals("Hoy · 24/10/2026", rangeLabel(makeRange(RangePreset.TODAY)))
        assertEquals("01/10/2026 — 09/10/2026", rangeLabel(DateRange(RangePreset.CUSTOM, "2026-10-01", "2026-10-09")))
    }

    @Test
    fun `calendar grid starts on Sunday and marks today and limits`() {
        val cells = buildCalendar(2026, 9, min = "2026-10-10") // octubre 2026 empieza en jueves
        assertEquals(35, cells.size)
        assertEquals("2026-09-27", cells.first().dateKey)
        assertFalse(cells.first().isCurrentMonth)
        assertTrue(cells.first { it.dateKey == "2026-10-24" }.isToday)
        assertTrue(cells.first { it.dateKey == "2026-10-09" }.isDisabled)
        assertFalse(cells.first { it.dateKey == "2026-10-10" }.isDisabled)
        assertEquals(42, buildCalendar(2026, 7).size) // agosto 2026: empieza en sábado y tiene 31 días
    }

    @Test
    fun `api errors - Laravel, FastAPI, code and network`() {
        val laravel = normalizeApiError(422, """{"message":"Datos inválidos","errors":{"email":["El correo ya existe"]}}""")
        assertEquals("Datos inválidos", laravel.message)
        assertEquals("El correo ya existe", laravel.fieldErrors["email"])
        val fastapi = normalizeApiError(422, """{"detail":[{"loc":["body","rnc"],"msg":"RNC inválido"}]}""")
        assertEquals("RNC inválido", fastapi.fieldErrors["rnc"])
        val auth = normalizeApiError(
            ApiHttpException(403, """{"message":"Requiere autorización","code":"AUTHORIZATION_REQUIRED","details":{"action":"descuento"}}"""),
        )
        assertEquals("AUTHORIZATION_REQUIRED", auth.code)
        assertEquals(403, auth.status)
        assertNotNull(auth.details)
        assertEquals("No tienes permisos suficientes para realizar esta acción.", normalizeApiError(403, "<html>proxy</html>").message)
        assertEquals("Error de conexión. Verifica tu acceso a internet o el estado del servidor.", normalizeApiError(IOException("reset")).message)
        // Un fallo técnico nunca llega crudo al usuario.
        assertEquals("Ocurrió un error inesperado al procesar la solicitud.", normalizeApiError(IllegalStateException("NPE en línea 42")).message)
    }

    @Test
    fun `confirm, prompt and a dialog replaced by another`() = runTest {
        val first = async { confirmDialog("Eliminar", tone = DialogTone.DANGER) }
        runCurrent()
        assertTrue(DialogCenter.state.value.open)
        val second = async { promptDialog("Motivo", required = true) }
        runCurrent()
        assertFalse(first.await()) // el nuevo canceló al anterior
        DialogCenter.accept()
        assertEquals("Este campo es obligatorio.", DialogCenter.state.value.inputError)
        DialogCenter.setInput("Cliente desistió")
        DialogCenter.accept()
        assertEquals("Cliente desistió", second.await())
        assertFalse(DialogCenter.state.value.open)

        val third = async { confirmDialog("Guardar") }
        runCurrent()
        DialogCenter.accept()
        assertTrue(third.await())
        val fourth = async { promptDialog("Nota") }
        runCurrent()
        DialogCenter.cancel()
        assertNull(fourth.await())
    }

    @Test
    fun `toasts stack up to four and errors last longer`() {
        repeat(6) { notify("Aviso $it", ToastType.INFO) }
        assertEquals(listOf("Aviso 2", "Aviso 3", "Aviso 4", "Aviso 5"), ToastCenter.toasts.value.map { it.message })
        notify("No se pudo guardar", ToastType.ERROR)
        assertEquals(6_000, ToastCenter.toasts.value.last().durationMs)
        assertEquals(4, ToastCenter.toasts.value.size)
    }

    @Test
    fun `batch - a failing row does not stop the batch`() = runTest {
        val tracker = BatchTracker()
        val result = tracker.run(
            "Enviando facturas",
            listOf(BatchItemInput("1", "F-1"), BatchItemInput("2", "F-2"), BatchItemInput("3", "F-3")),
        ) { item, _ ->
            when (item.id) {
                "2" -> throw ApiHttpException(422, """{"message":"Sin correo del cliente"}""")
                "3" -> BatchResult.skipped("Ya enviada")
                else -> null
            }
        }
        assertEquals(BatchRunState.FINISHED, result.state)
        assertEquals(listOf(BatchItemStatus.DONE, BatchItemStatus.FAILED, BatchItemStatus.SKIPPED), result.items.map { it.status })
        assertEquals("Sin correo del cliente", result.items[1].detail)
        assertEquals("1 completado, 1 omitido y 1 con error.", batchSummary(result))
    }

    @Test
    fun `document changes patch only what the row shows`() {
        data class Fila(val id: String, val estado: String, val total: Int)
        data class Detalle(val id: String, val estado: String, val total: Int, val lineas: List<String>)
        DocumentChanges.record("factura", "2", Detalle("2", "ANULADA", 0, listOf("a")))
        val filas = listOf(Fila("1", "ACTIVA", 10), Fila("2", "ACTIVA", 20))
        val parcheadas = filas.patchRows(DocumentChanges.drain<Detalle>("factura"), id = { it.id }) { f, d -> f.copy(estado = d.estado) }
        assertEquals(listOf("ACTIVA", "ANULADA"), parcheadas.map { it.estado })
        assertTrue(DocumentChanges.drain<Detalle>("factura").isEmpty()) // se consumió
        DocumentChanges.markListShifted("factura")
        assertTrue(DocumentChanges.takeListShifted("factura"))
        assertFalse(DocumentChanges.takeListShifted("factura"))
    }

    @Test
    fun `tab cache key ignores empties and order`() {
        val cache = TabCache<String>()
        cache.add(mapOf("estado" to "pendientes", "q" to "", "page" to 1), "A")
        assertEquals("A", cache.recall(mapOf("page" to 1, "estado" to "pendientes", "desde" to null)))
        cache.remember(mapOf("estado" to "todos"), "B")
        assertEquals(1, cache.size)
        assertNull(cache.recall(mapOf("estado" to "pendientes", "page" to 1)))
    }

    @Test
    fun `record search debounces and keeps stale results`() = runTest {
        val calls = mutableListOf<String>()
        val search = RecordSearch<String>(this, fetch = { q, page, _ ->
            calls += "$q:$page"
            RecordPage(listOf("$q-1", "$q-2"), total = 4)
        }, pageSize = 2, debounceMs = 200)
        search.setQuery("f")
        search.setQuery("fe")
        search.setQuery("fer")
        advanceTimeBy(250)
        runCurrent()
        assertEquals(listOf("fer:1"), calls)
        assertTrue(search.state.value.hasMore)
        search.setQuery("ferre")
        assertTrue(search.state.value.stale) // los de «fer» se quedan mientras llega «ferre»
        advanceUntilIdle()
        search.loadMore()
        advanceUntilIdle()
        assertEquals(listOf("ferre-1", "ferre-2", "ferre-1", "ferre-2"), search.state.value.items)
        assertFalse(search.state.value.hasMore)
        search.reset()
    }

    @Test
    fun `record search reports the error instead of an empty list`() = runTest {
        val gate = CompletableDeferred<Unit>()
        val search = RecordSearch<String>(this, fetch = { _, _, _ -> gate.await(); throw IOException("x") })
        search.flush()
        runCurrent()
        assertTrue(search.state.value.loading)
        gate.complete(Unit)
        advanceUntilIdle()
        assertEquals("Error de conexión. Verifica tu acceso a internet o el estado del servidor.", search.state.value.error)
        assertTrue(search.state.value.settled)
    }

    @Test
    fun `safe links`() {
        assertEquals("https://cdn.ejemplo.com/a.pdf", safeLinkUrl("https://cdn.ejemplo.com/a.pdf"))
        assertNull(safeLinkUrl("javascript:alert(1)"))
        assertNull(safeLinkUrl("intent://scan#Intent;scheme=zxing;end"))
        assertNull(safeLinkUrl("//evil.com/uploads/a.pdf"))
        assertNull(safeLinkUrl("/api/admin"))
        assertEquals("https://api.ejemplo.com/uploads/a.pdf", safeLinkUrl("/uploads/a.pdf", baseUrl = "https://api.ejemplo.com"))
        assertEquals("http://10.0.2.2:3000/uploads/a.pdf", safeLinkUrl("http://10.0.2.2:3000/uploads/a.pdf", baseUrl = "http://10.0.2.2:3000"))
        assertNull(safeLinkUrl("http://otro.com/uploads/a.pdf", baseUrl = "http://10.0.2.2:3000"))
    }

    @Test
    fun `ability with conditions`() {
        data class Usuario(val id: String)
        data class Factura(val vendedorId: String)
        val ability = Ability(
            Usuario("u1"),
            listOf(
                Rule<Usuario, Any>(setOf(Action.READ), "factura"),
                Rule<Usuario, Factura>(setOf(Action.UPDATE), "factura") { f, u -> f.vendedorId == u.id },
            ),
        )
        assertTrue(ability.can(Action.READ, "factura"))
        assertTrue(ability.can(Action.UPDATE, "factura", Factura("u1")))
        assertFalse(ability.can(Action.UPDATE, "factura", Factura("u2")))
        assertTrue(ability.cannot(Action.DELETE, "factura"))
    }

    @Test
    fun `theme preference persists and cycles`() {
        val store = InMemoryThemeStore("dark")
        ThemeEngine.init(store)
        assertEquals(ThemePreference.DARK, ThemeEngine.preference.value)
        assertEquals(ThemePreference.SYSTEM, ThemeEngine.cycle())
        assertEquals("system", store.read())
        ThemeEngine.init(InMemoryThemeStore("basura"))
        assertEquals(ThemePreference.SYSTEM, ThemeEngine.preference.value)
    }
}
