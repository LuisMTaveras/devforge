/**
 * ⚡ DEVFORGE Pagination Engine — la matemática del pie de un listado paginado.
 * Framework-agnostic: la usan ListPager.vue (y cualquier pie en React).
 *
 * El total de páginas se DERIVA del total y del tamaño de página: recibirlo por
 * separado permitía que el "2 / 7" y el botón de avanzar se contradijeran.
 * Si el backend envía `hasMore`, manda él: es quien sabe si queda algo.
 */

export interface PageMeta {
  /** Página actual (1-based). */
  page: number;
  /** Tamaño de página de la consulta. */
  pageSize: number;
  /** Filas de la consulta completa, no las cargadas. */
  total: number;
  /** Lo dice el servidor; si falta, se deduce de `page < pages`. */
  hasMore?: boolean;
}

export interface PageState {
  page: number;
  pages: number;
  hasPrev: boolean;
  hasNext: boolean;
  /** Primera y última fila visibles (1-based). `0` si no hay filas. */
  from: number;
  to: number;
}

export function totalPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(Math.max(0, total) / Math.max(1, pageSize)));
}

export function pageState(meta: PageMeta): PageState {
  const pages = totalPages(meta.total, meta.pageSize);
  const page = Math.min(Math.max(1, meta.page), pages);
  const from = meta.total > 0 ? (page - 1) * meta.pageSize + 1 : 0;
  const to = Math.min(meta.total, page * meta.pageSize);
  return {
    page,
    pages,
    hasPrev: page > 1,
    hasNext: meta.hasMore ?? page < pages,
    from,
    to,
  };
}

/**
 * `Mostrando 11–20 de 57 facturas`. Pasa `format` (p. ej. `formatNumber`) para que
 * los números salgan con los separadores del país: `de 1,250 facturas`.
 */
export function pageSummary(
  meta: PageMeta,
  labels: { singular?: string; plural?: string; format?: (n: number) => string } = {},
): string {
  const { singular = 'registro', plural = 'registros', format = String } = labels;
  const { from, to } = pageState(meta);
  if (!to) return `Sin ${plural}`;
  return `Mostrando ${format(from)}–${format(to)} de ${format(meta.total)} ${meta.total === 1 ? singular : plural}`;
}
