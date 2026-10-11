import type { ReactNode } from 'react';
import { FlickerlessTableShell, useFlickerless, useSettled } from '../../../vendor/flickerless/react/index.js';
import { Icon, type IconName } from './icons';

/**
 * ⚡ DEVFORGE TableStates (React) — cargando, error y vacío dentro del `<tbody>`, iguales en todas
 * las tablas. Va antes de las filas:
 *
 *   <tbody>
 *     <TableStates cols={7} loading={loading} error={loadError} empty={!rows.length}
 *                  emptyTitle="Aún no hay facturas" onRetry={load} />
 *     {(loadError ? [] : rows).map(row => <tr key={row.id}>…</tr>)}
 *   </tbody>
 *
 * Mientras recarga, las filas se quedan; la carcasa con «—» solo sale si no hay ninguna.
 * `error` es el mensaje ya normalizado (`normalizeApiError(e).message`).
 */
export interface TableStatesProps {
  cols: number;
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  icon?: IconName;
  emptyTitle?: string;
  emptyHint?: string;
  errorTitle?: string;
  retryText?: string;
  shellRows?: number;
  cellClassName?: string;
  /** Ya hubo respuesta. Sin la prop se lee de la `<FlickerlessSurface>` que envuelve la tabla. */
  settled?: boolean;
  onRetry?: () => void;
  /** Acción del estado vacío («Nueva factura»). */
  children?: ReactNode;
}

export function TableStates({
  cols,
  loading = false,
  error = '',
  empty = false,
  icon = 'inbox',
  emptyTitle = 'Sin resultados',
  emptyHint = '',
  errorTitle = 'No se pudo cargar la consulta',
  retryText = 'Reintentar',
  shellRows = 4,
  cellClassName = 'px-3.5 py-2.5',
  settled,
  onRetry,
  children,
}: TableStatesProps) {
  const { isVisibleLoading } = useFlickerless({ loading: loading && !empty, delayMs: 180 });
  const reloading = isVisibleLoading && !empty;
  // «Vacío» solo con una respuesta en la mano: antes de la primera, la tabla real con «—».
  const surfaceSettled = useSettled();
  const answered = settled ?? surfaceSettled ?? true;

  return (
    <>
      {reloading && (
        <tr aria-hidden="true">
          <td colSpan={cols} style={{ position: 'relative', height: 0, padding: 0, border: 0 }}>
            <div className="flickerless-progress-bar" style={{ position: 'absolute', top: 0, left: 0, right: 0 }} />
          </td>
        </tr>
      )}
      {empty && (loading || (!answered && !error)) ? (
        <FlickerlessTableShell cols={cols} rows={shellRows} cellClassName={cellClassName} />
      ) : error ? (
        <tr>
          <td colSpan={cols} className="px-5 py-12 text-center">
            <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-danger/10 text-danger">
              <Icon name="error" className="size-5" />
            </span>
            <p className="mt-2 text-small font-bold text-foreground">{errorTitle}</p>
            <p className="mx-auto mt-0.5 max-w-md text-caption text-muted-foreground">{error}</p>
            <button
              type="button"
              className="mt-3 inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-control border border-border bg-surface-raised px-3.5 text-small font-bold text-foreground transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={onRetry}
            >
              <Icon name="refresh" className="size-4" /> {retryText}
            </button>
          </td>
        </tr>
      ) : empty ? (
        <tr>
          <td colSpan={cols} className="px-5 py-12 text-center">
            <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-surface text-muted-foreground">
              <Icon name={icon} className="size-5" />
            </span>
            <p className="mt-2 text-small font-bold text-foreground">{emptyTitle}</p>
            {emptyHint && <p className="mt-0.5 text-caption text-muted-foreground">{emptyHint}</p>}
            {children && <div className="mt-3 flex justify-center gap-2">{children}</div>}
          </td>
        </tr>
      ) : null}
    </>
  );
}
