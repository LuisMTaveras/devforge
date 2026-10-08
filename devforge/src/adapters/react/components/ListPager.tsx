import type { ReactNode } from 'react';
import { pageState, pageSummary } from '../../../core/pagination/pagination.js';
import { formatNumber } from '../../../core/formatters/formatters.js';
import { FlickerlessValue } from '../../../vendor/flickerless/react/index.js';
import { Icon } from './icons';

/**
 * ⚡ DEVFORGE ListPager (React) — el pie estándar de un listado paginado.
 *
 *   <FlickerlessSurface loading={isFetching}>
 *     <table>…</table>
 *     <ListPager page={page} onPageChange={setPage} pageSize={pageSize}
 *                total={data?.meta.total} hasMore={data?.meta.hasMore} singular="factura" plural="facturas" />
 *   </FlickerlessSurface>
 *
 * "Mostrando 11–20 de 57 facturas" + ‹ 2 / 6 ›. Hasta la primera respuesta muestra «—».
 */
export interface ListPagerProps {
  page: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  /** Filas de la consulta completa (no las cargadas). `undefined` mientras no hay respuesta. */
  total?: number | null;
  /** Lo dice el servidor (`meta.hasMore`). */
  hasMore?: boolean;
  singular?: string;
  plural?: string;
  note?: ReactNode;
}

const navBtn = 'flex size-8.5 cursor-pointer items-center justify-center rounded-control border border-border bg-surface-raised text-foreground transition hover:bg-surface-hover disabled:cursor-default disabled:opacity-40';
const fmt = (n: number) => formatNumber(n, { maximumFractionDigits: 0 });

export function ListPager({ page, onPageChange, pageSize, total, hasMore, singular = 'registro', plural = 'registros', note }: ListPagerProps) {
  const settled = total !== undefined && total !== null;
  const meta = { page, pageSize, total: total ?? 0, hasMore };
  const state = pageState(meta);
  const go = (next: number) => {
    if (next >= 1 && next !== page) onPageChange(next);
  };

  return (
    <footer className="flex flex-col gap-2.5 border-t border-border px-4 py-3 text-caption text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <p>
        <FlickerlessValue value={settled ? pageSummary(meta, { singular, plural, format: fmt }) : undefined} />
        {note}
      </p>
      <div className="flex items-center gap-1.5">
        <button type="button" className={navBtn} disabled={!state.hasPrev} aria-label="Página anterior" onClick={() => go(state.page - 1)}>
          <Icon name="chevronLeft" className="size-4" />
        </button>
        {/* El total de páginas se ENSEÑA: sin él, el «2» no dice si queda algo detrás. */}
        <span
          className="flex h-8.5 items-center justify-center rounded-control border border-border bg-surface-raised px-3 font-bold tabular-nums text-foreground"
          aria-live="polite"
        >
          {fmt(state.page)}
          {state.pages > 1 && <span className="text-dim-foreground">&nbsp;/&nbsp;{fmt(state.pages)}</span>}
        </span>
        <button type="button" className={navBtn} disabled={!state.hasNext} aria-label="Página siguiente" onClick={() => go(state.page + 1)}>
          <Icon name="chevronRight" className="size-4" />
        </button>
      </div>
    </footer>
  );
}
