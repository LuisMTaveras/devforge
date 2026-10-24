# ⚡ DEVFORGE Android: Kotlin + Jetpack Compose

<!-- Las mismas reglas de la web, en una app Android. API exacta: module-api.md §27. -->

Una app Android de DEVFORGE se ve, se lee y se comporta como la web: la misma paleta «Warm Slate» en Claro y Oscuro, los mismos textos en español, los mismos formatos de RD y los mismos componentes. Lo que cambia es la tecnología: Kotlin, Jetpack Compose y Material 3 como base (nunca como apariencia).

## 1. Instalación

```bash
devforge add formatters theme errors feedback overlays flickerless list-states --compose   # base, antes de la primera pantalla
devforge add select dates pagination inputs list-toolbar pickers --compose               # según la pantalla
```

- El paquete sale del `namespace` de `app/build.gradle.kts` (o `--package com.empresa.app`). Los archivos van a `app/src/main/java/<paquete>/core/…` y `…/ui/…` (o `app/src/main/kotlin` si existe).
- Un archivo que modificaste no se pisa (`--force` para sobrescribir). Un módulo sin versión Compose (`excel`, `documents`, `authorizations`, `notifications`, `auth`, `command-palette`, `app-update`, `url-sync`, `export`) lo rechaza la CLI: **no lo reescribas de memoria**, dilo.
- Gradle: Compose + Material 3 (el BOM del proyecto), `kotlinx-coroutines-core`, y `kotlinx-serialization-json` para `errors` (solo el runtime). `minSdk 26` o desugaring de la librería estándar (`java.time`). **No inventes versiones**: usa las del `libs.versions.toml` del proyecto; si falta una, pregunta.

## 2. Punto de entrada (obligatorio)

```kotlin
class App : Application() {
    override fun onCreate() {
        super.onCreate()
        setFormatCountry(CountryCode.DO)                 // es-DO, RD$, (809) 578-1234, zona America/Santo_Domingo
        ThemeEngine.init(SharedPreferencesThemeStore(this))
    }
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            DevforgeTheme {                              // Claro / Oscuro / Sistema según ThemeEngine
                Box(Modifier.fillMaxSize().background(DevforgeTheme.colors.background)) {
                    AppNavHost()
                    ToastHost()                          // notify(…)
                    ConfirmDialogHost()                  // confirmDialog / promptDialog / alertDialog
                }
            }
        }
    }
}
```

- `ThemeSelector()` (Claro / Oscuro / Sistema) va en Ajustes o en el menú de usuario. Es obligatorio.
- Sin parpadeo blanco al abrir en oscuro: el tema de la ventana en `themes.xml` hereda de un `DayNight` (`Theme.Material3.DayNight.NoActionBar` o `android:Theme.Material.NoActionBar` con `values-night`) y su `android:windowBackground` es el `background` del token.
- Si cambias el país de la app, `setDateTimeZone(…)` lleva la misma zona que `setFormatCountry(…)`.

## 3. Lo prohibido y su reemplazo

| Prohibido en una pantalla | Se usa | Módulo |
| --- | --- | --- |
| `Color(0xFF…)`, `Color.White`, `MaterialTheme.colorScheme.primary` para dar significado | `DevforgeTheme.colors.surface / foreground / mutedForeground / border / primary / success / warning / danger` | `theme` |
| `Shimmer`, `placeholder()`, cajas grises, `CircularProgressIndicator` que tapa la pantalla | `FlickerlessSurface` + `FlickerlessValue` («—») + `FlickerlessListShell` / `CardShell` / `DetailShell` | `flickerless`, `shells` |
| `AlertDialog` armado, `Toast.makeText`, un `SnackbarHost` por pantalla | `confirmDialog()` / `promptDialog()` / `alertDialog()`; `notify()` | `feedback` |
| `Dialog` / `ModalBottomSheet` a mano, `dismissOnClickOutside = true` en algo que se llena | `ModalShell` / `DrawerShell` (el telón no cierra; atrás sí) | `overlays` |
| Menú `⋮` a mano, acciones que desaparecen | `RowMenu` (apagada CON su motivo: `disabledReason = "Ya está anulada"`) | `overlays` |
| `ExposedDropdownMenuBox`, `Spinner` | `SelectField` | `select` |
| `DatePicker` / `DatePickerDialog` / `DateRangePicker` (zona e idioma del teléfono) | `DateField`, `DateRangeFilter`, `HistoryPeriodFilter` (clave `yyyy-MM-dd`, «Hoy» de RD) | `dates`, `list-toolbar` |
| `OutlinedTextField` + `toDouble()` para montos, cédulas o teléfonos | `MoneyInput` (`BigDecimal?`), `MaskedInput` (`InputMask.CEDULA / RNC / TAX_ID / PHONE`) | `inputs` |
| `String.format("%.2f")`, `NumberFormat`, `SimpleDateFormat`, `DateTimeFormatter.ofPattern`, `ZoneId.systemDefault()`, `LocalDate.now()` | `formatCurrency` / `formatNumber` / `formatPercent` / `formatDate` / `formatTime` / `formatRelativeTime` / `formatPhoneNumber`; `todayKey()` | `formatters`, `dates` |
| `Text(e.message)`, `catch (e: Exception) {}` | `normalizeApiError(e).message` en el estado de la pantalla | `errors` |
| Pie de página «Página 2» a mano, cargar todo y paginar en la app | `ListPager` con `total` y `hasMore` del servidor | `pagination` |
| Buscar clientes en una lista en memoria, un `SelectField` con el catálogo entero | `RecordPickerModal` (busca en el servidor, pagina) | `pickers` |
| `uriHandler.openUri(url)` / `Intent.ACTION_VIEW` con una URL guardada por otra persona | `safeLinkUrl(url, baseUrl)?.let { uriHandler.openUri(it) }` | `security` |
| `Text("Save")`, `contentDescription = "Close"` | Todo texto visible y todo `contentDescription` en español | — |

`devforge audit` revisa también los `.kt` con estas reglas. Los archivos instalados por `--compose` son la puerta única y no se revisan.

## 4. La pantalla: ViewModel con los cuatro estados

Los datos llegan de un repositorio (`data/<feature>/…Repository`) a un `ViewModel`, nunca escritos en el código. El estado distingue **no sé todavía** de **vacío**:

```kotlin
data class FacturasUi(
    val rows: List<FacturaFila> = emptyList(),
    val meta: PageMeta? = null,         // null = aún no hay respuesta («—», nunca «0»)
    val loading: Boolean = false,
    val error: String? = null,          // normalizeApiError(e).message
    val page: Int = 1,
)

fun load(page: Int = ui.value.page) = viewModelScope.launch {
    _ui.update { it.copy(loading = true, error = null, page = page) }
    try {
        val res = repo.listar(page = page, pageSize = 20, rango = resolveRange(rango))   // el servidor pagina
        _ui.update { it.copy(rows = res.items, meta = PageMeta(page, 20, res.total, res.hasMore), loading = false) }
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        _ui.update { it.copy(loading = false, error = normalizeApiError(e).message) }
    }
}
```

```kotlin
FlickerlessSurface(
    loading = ui.loading, empty = ui.rows.isEmpty(), error = ui.error, settled = ui.meta != null, onRetry = vm::load,
    modifier = Modifier.fillMaxSize(),
) {
    LazyColumn(Modifier.weight(1f)) {
        if (ui.rows.isEmpty() || ui.error != null) item {
            ListStates(loading = ui.loading, error = ui.error, empty = ui.rows.isEmpty(), onRetry = vm::load, emptyTitle = "Aún no hay facturas")
        }
        if (ui.error == null) items(ui.rows, key = { it.id }) { fila ->
            Row { Text(fila.numero); Text(formatCurrency(fila.total, currency = fila.moneda), style = DevforgeTheme.type.body.copy(fontFeatureSettings = "tnum")) }
        }
    }
    ListPager(page = ui.page, pageSize = 20, total = ui.meta?.total, hasMore = ui.meta?.hasMore, onPageChange = vm::load, singular = "factura", plural = "facturas")
}
```

- Toda acción asíncrona maneja sus tres salidas: en curso (`DfButton(pending = …, pendingText = "Guardando…")`, sin doble envío), éxito (`notify("Factura guardada")`), error (`notify(normalizeApiError(e).message, ToastType.ERROR)` o el error en el estado).
- Montos alineados a la derecha con `fontFeatureSettings = "tnum"`. La moneda viene del documento (`currency = factura?.moneda`), nunca `currency = "DOP"`.
- La lista guardada en el ViewModel no vuelve al servidor sola: el detalle deja `DocumentChanges.record(…)` y la lista parchea con `patchRows`; si nacen o mueren filas, `ListStaleNotice` ofrece actualizar (`list-cache`).

## 5. Definición de hecho (Android)

- Compila (`./gradlew :app:compileDebugKotlin` o la tarea del proyecto) y pasan las pruebas de lo que tocaste (`./gradlew :app:testDebugUnitTest`). Reporta la salida real.
- `devforge audit` sin violaciones nuevas.
- La pantalla funciona en Claro y en Oscuro, a 360 dp de ancho, con TalkBack (todo icono-botón tiene su `label`) y en sus cuatro estados: primera carga («—»), con datos, vacía (`EmptyState`) y error (mensaje + «Reintentar»).
- Si algo no se pudo verificar (sin emulador, sin backend), di exactamente qué y por qué.
