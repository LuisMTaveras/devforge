package devforge.core.permissions

/**
 * ⚡ DEVFORGE Ability & Permission Evaluator (Kotlin) — gemelo de `core/permissions/ability.ts`.
 * RBAC / ABAC declarativo. Las reglas vienen del SERVIDOR (no se escriben en la app): la app solo
 * esconde lo que no aplica; quien niega de verdad es el API.
 *
 *   val ability = Ability(user, listOf(
 *       Rule(setOf(Action.READ), "factura"),
 *       Rule<Usuario, Factura>(setOf(Action.UPDATE), "factura") { factura, u -> factura.vendedorId == u.id },
 *   ))
 *   Can(ability, Action.UPDATE, "factura", factura) { Button(…) { Text("Editar") } }
 */

enum class Action { CREATE, READ, UPDATE, DELETE, MANAGE }

class Rule<U, D>(
    val actions: Set<Action>,
    /** Nombre del recurso, o `"all"`. */
    val subject: String,
    val conditions: ((data: D, user: U) -> Boolean)? = null,
)

class Ability<U>(
    @Volatile var user: U? = null,
    rules: List<Rule<U, *>> = emptyList(),
) {
    @Volatile
    var rules: List<Rule<U, *>> = rules
        private set

    fun updateRules(rules: List<Rule<U, *>>) {
        this.rules = rules.toList()
    }

    fun can(action: Action, subject: String, data: Any? = null): Boolean {
        for (rule in rules) {
            val actionMatches = action in rule.actions || Action.MANAGE in rule.actions
            val subjectMatches = rule.subject == subject || rule.subject == "all"
            if (!actionMatches || !subjectMatches) continue
            @Suppress("UNCHECKED_CAST")
            val conditions = rule.conditions as ((Any, U) -> Boolean)? ?: return true
            val u = user
            if (data != null && u != null && runCatching { conditions(data, u) }.getOrDefault(false)) return true
        }
        return false
    }

    fun cannot(action: Action, subject: String, data: Any? = null): Boolean = !can(action, subject, data)
}
