package devforge.ui.components

/**
 * ⚡ DEVFORGE Can (Compose) — pinta su contenido solo si la regla lo permite. Esconde lo que no
 * aplica; quien niega de verdad es el servidor.
 *
 *   Can(ability, Action.UPDATE, "factura", factura) { DfButton("Editar", vm::editar) }
 */

import androidx.compose.runtime.Composable
import devforge.core.permissions.Ability
import devforge.core.permissions.Action

@Composable
fun <U> Can(
    ability: Ability<U>,
    action: Action,
    subject: String,
    data: Any? = null,
    otherwise: (@Composable () -> Unit)? = null,
    content: @Composable () -> Unit,
) {
    if (ability.can(action, subject, data)) content() else otherwise?.invoke()
}
