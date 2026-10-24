package devforge.ui.theme

/**
 * ⚡ DEVFORGE Design Tokens (Compose) — paleta «Warm Slate»: grafito en claro, marfil en oscuro.
 * Gemelo de `core/theme/tokens.css`: mismos nombres y los mismos colores (OKLCH convertidos a sRGB;
 * `devforge/test/compose-tokens.test.ts` falla si se separan).
 *
 * Los componentes leen SOLO los tokens semánticos:
 *   DevforgeTheme.colors.surface / .foreground / .mutedForeground / .border / .primary / .danger …
 *   DevforgeTheme.type.body / .caption …   DevforgeTheme.shapes.control / .card / .panel
 * Nada de `Color(0xFF…)`, `Color.White` ni la paleta de Material en una pantalla.
 *
 *   setContent {
 *       DevforgeTheme {            // Claro / Oscuro / Sistema según ThemeEngine
 *           Box { AppNavHost(); ToastHost(); ConfirmDialogHost() }
 *       }
 *   }
 *
 * Mapea los tokens a `MaterialTheme.colorScheme` para que lo de Material que se use (cursor, ripple,
 * menús) no traiga el morado por defecto.
 */

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import devforge.core.theme.ResolvedTheme
import devforge.core.theme.ThemeEngine
import devforge.core.theme.ThemePreference
import devforge.core.theme.resolveTheme

@Immutable
data class DevforgeColors(
    val isDark: Boolean,
    /** Lienzo de la app. */
    val background: Color,
    /** Texto principal. */
    val foreground: Color,
    /** Tarjetas, listas, campos. */
    val surface: Color,
    /** Menús, diálogos, hojas. */
    val surfaceRaised: Color,
    val surfaceHover: Color,
    /** Texto secundario. */
    val mutedForeground: Color,
    /** Placeholders, días fuera del mes. */
    val dimForeground: Color,
    val border: Color,
    val input: Color,
    /** Anillo de foco. */
    val ring: Color,
    /** La ÚNICA acción principal: grafito / marfil. No hay un segundo «azul de marca». */
    val primary: Color,
    val primaryHover: Color,
    val primaryForeground: Color,
    /** Opción elegida, rango del calendario. */
    val primarySubtle: Color,
    val primaryBorder: Color,
    val success: Color,
    val warning: Color,
    val danger: Color,
    /** Texto sobre botón destructivo. */
    val dangerForeground: Color,
    /** Telón de diálogos. */
    val overlay: Color,
)

// tokens:light:start
val LightDevforgeColors = DevforgeColors(
    isDark = false,
    background = Color(0xFFF4F2EE),
    foreground = Color(0xFF191815),
    surface = Color(0xFFFCFCFA),
    surfaceRaised = Color(0xFFFFFFFF),
    surfaceHover = Color(0xFFE9E8E3),
    mutedForeground = Color(0xFF56544F),
    dimForeground = Color(0xFF75726C),
    border = Color(0x1F191815),
    input = Color(0x29191815),
    ring = Color(0x3D191815),
    primary = Color(0xFF191815),
    primaryHover = Color(0xFF080706),
    primaryForeground = Color(0xFFFAFAF8),
    primarySubtle = Color(0x12191815),
    primaryBorder = Color(0x29191815),
    success = Color(0xFF009966),
    warning = Color(0xFFE17100),
    danger = Color(0xFFEC0040),
    dangerForeground = Color(0xFFFFFFFF),
    overlay = Color(0x73080706),
)
// tokens:light:end

// tokens:dark:start
val DarkDevforgeColors = DevforgeColors(
    isDark = true,
    background = Color(0xFF0D0C0A),
    foreground = Color(0xFFF4F3EE),
    surface = Color(0xFF11100F),
    surfaceRaised = Color(0xFF1A1917),
    surfaceHover = Color(0x0DFFFFFF),
    mutedForeground = Color(0xFFA7A59F),
    dimForeground = Color(0xFF787570),
    border = Color(0x17FFFFFF),
    input = Color(0x29FFFFFF),
    ring = Color(0x47FFFFFF),
    primary = Color(0xFFF4F3EE),
    primaryHover = Color(0xFFFFFFFF),
    primaryForeground = Color(0xFF080706),
    primarySubtle = Color(0x17FFFFFF),
    primaryBorder = Color(0x29FFFFFF),
    success = Color(0xFF00D492),
    warning = Color(0xFFFE9A00),
    danger = Color(0xFFFF637E),
    dangerForeground = Color(0xFF0A0907),
    overlay = Color(0x99000000),
)
// tokens:dark:end

/** Escala cerrada de tipografía (la de la web; el cuerpo sube a 14 sp, el mínimo legible en un teléfono). */
@Immutable
data class DevforgeType(
    val caption: TextStyle = TextStyle(fontSize = 11.sp, lineHeight = 14.sp),
    val small: TextStyle = TextStyle(fontSize = 12.sp, lineHeight = 16.sp),
    val body: TextStyle = TextStyle(fontSize = 14.sp, lineHeight = 20.sp),
    val title: TextStyle = TextStyle(fontSize = 16.sp, lineHeight = 22.sp, fontWeight = FontWeight.Bold),
    val display: TextStyle = TextStyle(fontSize = 24.sp, lineHeight = 30.sp, fontWeight = FontWeight.Bold),
    /** Rótulo de campo: MAYÚSCULAS espaciadas, como `text-caption uppercase tracking-wider`. */
    val label: TextStyle = TextStyle(fontSize = 11.sp, lineHeight = 12.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.6.sp),
)

/** Escala cerrada de forma: rounded-control / rounded-card / rounded-panel. */
@Immutable
data class DevforgeShapes(
    val control: RoundedCornerShape = RoundedCornerShape(12.dp),
    val card: RoundedCornerShape = RoundedCornerShape(16.dp),
    val panel: RoundedCornerShape = RoundedCornerShape(24.dp),
    val pill: RoundedCornerShape = RoundedCornerShape(percent = 50),
)

val LocalDevforgeColors = staticCompositionLocalOf { LightDevforgeColors }
val LocalDevforgeType = staticCompositionLocalOf { DevforgeType() }
val LocalDevforgeShapes = staticCompositionLocalOf { DevforgeShapes() }

object DevforgeTheme {
    val colors: DevforgeColors
        @Composable @ReadOnlyComposable get() = LocalDevforgeColors.current
    val type: DevforgeType
        @Composable @ReadOnlyComposable get() = LocalDevforgeType.current
    val shapes: DevforgeShapes
        @Composable @ReadOnlyComposable get() = LocalDevforgeShapes.current
}

/** Los tokens llevados al esquema de Material 3: ningún rol queda con el color por defecto. */
fun DevforgeColors.toMaterialColorScheme(): ColorScheme {
    val base = if (isDark) darkColorScheme() else lightColorScheme()
    return base.copy(
        primary = primary,
        onPrimary = primaryForeground,
        primaryContainer = primarySubtle,
        onPrimaryContainer = foreground,
        inversePrimary = primaryForeground,
        secondary = primary,
        onSecondary = primaryForeground,
        secondaryContainer = primarySubtle,
        onSecondaryContainer = foreground,
        tertiary = primary,
        onTertiary = primaryForeground,
        tertiaryContainer = primarySubtle,
        onTertiaryContainer = foreground,
        background = background,
        onBackground = foreground,
        surface = surfaceRaised,
        onSurface = foreground,
        surfaceVariant = surface,
        onSurfaceVariant = mutedForeground,
        surfaceTint = Color.Transparent,
        inverseSurface = foreground,
        inverseOnSurface = background,
        error = danger,
        onError = dangerForeground,
        errorContainer = danger.copy(alpha = 0.1f),
        onErrorContainer = danger,
        outline = input,
        outlineVariant = border,
        scrim = overlay,
        surfaceBright = surfaceRaised,
        surfaceDim = background,
        surfaceContainerLowest = surfaceRaised,
        surfaceContainerLow = surfaceRaised,
        surfaceContainer = surfaceRaised,
        surfaceContainerHigh = surfaceRaised,
        surfaceContainerHighest = surface,
    )
}

/**
 * La raíz de la app. Sin `preference`, sigue a [ThemeEngine] (Claro / Oscuro / Sistema).
 * `preference` explícita solo para previews y tests.
 */
@Composable
fun DevforgeTheme(
    preference: ThemePreference? = null,
    content: @Composable () -> Unit,
) {
    val stored by ThemeEngine.preference.collectAsState()
    val dark = resolveTheme(preference ?: stored, isSystemInDarkTheme()) == ResolvedTheme.DARK
    val colors = if (dark) DarkDevforgeColors else LightDevforgeColors
    val type = DevforgeType()
    CompositionLocalProvider(
        LocalDevforgeColors provides colors,
        LocalDevforgeType provides type,
        LocalDevforgeShapes provides DevforgeShapes(),
    ) {
        MaterialTheme(
            colorScheme = colors.toMaterialColorScheme(),
            typography = Typography(bodyLarge = type.body, bodyMedium = type.body, bodySmall = type.small, labelSmall = type.caption),
        ) {
            CompositionLocalProvider(LocalContentColor provides colors.foreground, content = content)
        }
    }
}
