package devforge.core.pagination

/**
 * ⚡ DEVFORGE Pagination Engine (Kotlin) — la matemática del pie de un listado paginado.
 * Gemelo de `core/pagination/pagination.ts`; la usa `ListPager`.
 *
 * El total de páginas se DERIVA del total y del tamaño de página: recibirlo por separado
 * permitía que el "2 / 7" y el botón de avanzar se contradijeran. Si el backend envía
 * `hasMore`, manda él: es quien sabe si queda algo.
 */

data class PageMeta(
    /** Página actual (1-based). */
    val page: Int,
    /** Tamaño de página de la consulta. */
    val pageSize: Int,
    /** Filas de la consulta completa, no las cargadas. */
    val total: Int,
    /** Lo dice el servidor; si falta, se deduce de `page < pages`. */
    val hasMore: Boolean? = null,
)

data class PageState(
    val page: Int,
    val pages: Int,
    val hasPrev: Boolean,
    val hasNext: Boolean,
    /** Primera y última fila visibles (1-based). `0` si no hay filas. */
    val from: Int,
    val to: Int,
)

fun totalPages(total: Int, pageSize: Int): Int {
    val size = pageSize.coerceAtLeast(1)
    return ((total.coerceAtLeast(0) + size - 1) / size).coerceAtLeast(1)
}

fun pageState(meta: PageMeta): PageState {
    val pages = totalPages(meta.total, meta.pageSize)
    val page = meta.page.coerceIn(1, pages)
    val from = if (meta.total > 0) (page - 1) * meta.pageSize + 1 else 0
    val to = minOf(meta.total, page * meta.pageSize)
    return PageState(
        page = page,
        pages = pages,
        hasPrev = page > 1,
        hasNext = meta.hasMore ?: (page < pages),
        from = from,
        to = to,
    )
}

/**
 * `Mostrando 11–20 de 57 facturas`. Pasa `format` (p. ej. `{ formatNumber(it) }`) para que los
 * números salgan con los separadores del país: `de 1,250 facturas`.
 */
fun pageSummary(
    meta: PageMeta,
    singular: String = "registro",
    plural: String = "registros",
    format: (Int) -> String = { it.toString() },
): String {
    val state = pageState(meta)
    if (state.to == 0) return "Sin $plural"
    return "Mostrando ${format(state.from)}–${format(state.to)} de ${format(meta.total)} ${if (meta.total == 1) singular else plural}"
}
