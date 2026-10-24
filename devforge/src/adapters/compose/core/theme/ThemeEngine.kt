package devforge.core.theme

/**
 * ⚡ DEVFORGE Theme Engine (Kotlin) — Claro / Oscuro / Sistema. Gemelo de `core/theme/theme.ts`.
 * Todo proyecto DEVFORGE sale con LOS DOS temas.
 *
 * - Guarda la elección del usuario ([ThemePreferenceStore]; en Android, `SharedPreferencesThemeStore`).
 * - Mientras la elección es `SYSTEM`, sigue al sistema (`isSystemInDarkTheme()` en `DevforgeTheme`).
 *
 *   // Application.onCreate()
 *   ThemeEngine.init(SharedPreferencesThemeStore(this))
 *   // setContent { DevforgeTheme { … } }  (lee ThemeEngine.preference)
 */

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

enum class ThemePreference(
    /** Rótulo del selector (cero Spanglish). */
    val label: String,
    /** Valor guardado: el mismo que la web (`devforge-theme`). */
    val storageValue: String,
) {
    LIGHT("Claro", "light"),
    DARK("Oscuro", "dark"),
    SYSTEM("Sistema", "system");

    companion object {
        fun fromStorage(value: String?): ThemePreference = entries.firstOrNull { it.storageValue == value } ?: SYSTEM
    }
}

enum class ResolvedTheme { LIGHT, DARK }

const val THEME_STORAGE_KEY = "devforge-theme"

/** Dónde se guarda la elección. Un almacén que falla no impide aplicar el tema en la sesión. */
interface ThemePreferenceStore {
    fun read(): String?
    fun write(value: String)
}

/** Sin persistencia (tests, previews). */
class InMemoryThemeStore(private var value: String? = null) : ThemePreferenceStore {
    override fun read(): String? = value
    override fun write(value: String) {
        this.value = value
    }
}

fun resolveTheme(preference: ThemePreference, systemDark: Boolean): ResolvedTheme = when (preference) {
    ThemePreference.LIGHT -> ResolvedTheme.LIGHT
    ThemePreference.DARK -> ResolvedTheme.DARK
    ThemePreference.SYSTEM -> if (systemDark) ResolvedTheme.DARK else ResolvedTheme.LIGHT
}

object ThemeEngine {
    private var store: ThemePreferenceStore = InMemoryThemeStore()
    private val _preference = MutableStateFlow(ThemePreference.SYSTEM)
    val preference: StateFlow<ThemePreference> = _preference.asStateFlow()

    /** Una vez, en `Application.onCreate()`, antes del primer `setContent`. */
    fun init(store: ThemePreferenceStore) {
        this.store = store
        _preference.value = ThemePreference.fromStorage(runCatching { store.read() }.getOrNull())
    }

    fun setPreference(preference: ThemePreference) {
        runCatching { store.write(preference.storageValue) }
        _preference.value = preference
    }

    /** Claro -> Oscuro -> Sistema. Para un único botón. */
    fun cycle(): ThemePreference {
        val order = ThemePreference.entries
        val next = order[(order.indexOf(_preference.value) + 1) % order.size]
        setPreference(next)
        return next
    }
}
