package devforge.core.theme

/**
 * ⚡ DEVFORGE: la elección de tema guardada en `SharedPreferences` (Android).
 * `commit` no: `apply` escribe en segundo plano y no frena el hilo principal.
 */

import android.content.Context

class SharedPreferencesThemeStore(context: Context, name: String = "devforge") : ThemePreferenceStore {
    private val prefs = context.applicationContext.getSharedPreferences(name, Context.MODE_PRIVATE)

    override fun read(): String? = prefs.getString(THEME_STORAGE_KEY, null)

    override fun write(value: String) {
        prefs.edit().putString(THEME_STORAGE_KEY, value).apply()
    }
}
