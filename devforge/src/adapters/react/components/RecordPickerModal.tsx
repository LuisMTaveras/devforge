import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { RecordPage } from '../../../core/search/record-search.js';
import { normalizeApiError } from '../../../core/errors/api-error.js';
import { FlickerlessValue } from '../../../vendor/flickerless/react/index.js';
import { useRecordSearch } from '../hooks/useRecordSearch.js';
import { EmptyState } from './EmptyState';
import { ModalShell } from './ModalShell';
import { SearchInput } from './SearchInput';
import { Icon } from './icons';

/**
 * ⚡ DEVFORGE RecordPickerModal (React) — elegir UN registro buscando EN EL SERVIDOR. Resultados al
 * abrir, búsqueda desde la primera letra, «Mostrar más», ↑/↓ + Enter, Escape cierra, el telón NO.
 *
 *   <RecordPickerModal open={eligiendo} title="Seleccionar cliente" placeholder="Buscar por nombre o RNC"
 *     fetch={(q, ctx) => clientesService.buscar({ q, ...ctx, fields: 'id,nombre,rnc' })}
 *     getKey={c => c.id} getLabel={c => c.nombre} getHint={c => formatTaxId(c.rnc)}
 *     selectedKey={factura.clienteId} onSelect={c => setCliente(c)} onClose={() => setEligiendo(false)} />
 */
export interface RecordPickerModalProps<T> {
  open: boolean;
  title: string;
  subtitle?: ReactNode;
  placeholder?: string;
  fetch: (query: string, ctx: { page: number; pageSize: number; signal: AbortSignal }) => Promise<RecordPage<T>>;
  getKey: (item: T) => string;
  getLabel?: (item: T) => string;
  getHint?: (item: T) => string | null | undefined;
  renderRow?: (item: T, active: boolean) => ReactNode;
  selectedKey?: string | null;
  emptyTitle?: string;
  emptyText?: string;
  emptyAction?: ReactNode;
  footer?: ReactNode;
  pageSize?: number;
  onSelect: (item: T) => void;
  onClose: () => void;
}

export function RecordPickerModal<T>({
  open,
  title,
  subtitle,
  placeholder = 'Buscar…',
  fetch,
  getKey,
  getLabel = item => String(item),
  getHint,
  renderRow,
  selectedKey = null,
  emptyTitle = 'Sin resultados',
  emptyText = 'Todavía no hay registros.',
  emptyAction,
  footer,
  pageSize = 20,
  onSelect,
  onClose,
}: RecordPickerModalProps<T>) {
  const search = useRecordSearch<T>({ fetch, pageSize, toMessage: e => normalizeApiError(e).message });
  const { state } = search;
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const rows = useRef<(HTMLLIElement | null)[]>([]);
  const box = useRef<{ focus: () => void }>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(0);
    search.reset();
    search.flush();
    setTimeout(() => box.current?.focus(), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const pick = (item: T) => {
    onSelect(item);
    onClose();
  };

  const move = (delta: number) => {
    const n = state.items.length;
    if (!n) return;
    const next = (active + delta + n) % n;
    setActive(next);
    rows.current[next]?.scrollIntoView({ block: 'nearest' });
  };

  return (
    <ModalShell open={open} title={title} subtitle={subtitle} size="2xl" bodyClassName="flex min-h-0 flex-1 flex-col" onClose={onClose} footer={footer}>
      <div
        className="border-b border-border p-4"
        onKeyDown={e => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            move(1);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            move(-1);
          } else if (e.key === 'Enter') {
            e.preventDefault();
            const item = state.items[active];
            if (item !== undefined) pick(item);
          }
        }}
      >
        <SearchInput
          ref={box}
          value={query}
          placeholder={placeholder}
          debounceMs={0}
          onChange={v => {
            setQuery(v);
            setActive(0);
            search.setQuery(v);
          }}
        />
      </div>

      <div className="min-h-72 flex-1 overflow-y-auto" role="listbox" aria-label={title} aria-busy={state.loading}>
        <div className={`h-0.5 ${state.loading ? 'flickerless-progress-bar' : ''}`} aria-hidden="true" />
        {state.error ? (
          <div className="px-5 py-10 text-center" role="alert">
            <p className="text-small font-bold text-foreground">No se pudo buscar</p>
            <p className="mt-0.5 text-caption text-muted-foreground">{state.error}</p>
            <button type="button" className="mt-3 inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-control border border-border bg-surface-raised px-3.5 text-small font-bold text-foreground hover:bg-surface-hover" onClick={() => search.flush()}>
              <Icon name="refresh" className="size-4" /> Reintentar
            </button>
          </div>
        ) : !state.settled && !state.items.length ? (
          <ul aria-hidden="true">
            {Array.from({ length: 5 }, (_, n) => (
              <li key={n} className="flex items-center gap-3 border-b border-border px-5 py-3 text-small">
                <span className="size-9 rounded-full bg-surface" />
                <FlickerlessValue />
              </li>
            ))}
          </ul>
        ) : !state.items.length ? (
          <EmptyState title={emptyTitle} text={query ? `Nada coincide con «${query}».` : emptyText} icon="search">
            {emptyAction}
          </EmptyState>
        ) : (
          <ul className={state.stale ? 'opacity-60 transition-opacity' : ''}>
            {state.items.map((item, i) => {
              const key = getKey(item);
              return (
                <li
                  key={key}
                  ref={el => {
                    rows.current[i] = el;
                  }}
                  role="option"
                  aria-selected={key === selectedKey}
                  className={`flex cursor-pointer items-center gap-3 border-b border-border px-5 py-3 transition-colors ${i === active ? 'bg-surface-hover' : 'hover:bg-surface'}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(item)}
                >
                  <div className="min-w-0 flex-1">
                    {renderRow ? (
                      renderRow(item, i === active)
                    ) : (
                      <>
                        <p className="truncate text-small font-semibold text-foreground">{getLabel(item)}</p>
                        {getHint && <p className="truncate text-caption text-muted-foreground">{getHint(item) || '—'}</p>}
                      </>
                    )}
                  </div>
                  {key === selectedKey && <Icon name="check" className="size-4 shrink-0 text-foreground" />}
                </li>
              );
            })}
            {state.hasMore && (
              <li className="p-3 text-center">
                <button type="button" className="h-9 cursor-pointer rounded-control border border-border px-4 text-small font-bold text-foreground hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50" disabled={state.loading} onClick={() => search.loadMore()}>
                  {state.loading ? 'Cargando…' : 'Mostrar más'}
                </button>
              </li>
            )}
          </ul>
        )}
      </div>
    </ModalShell>
  );
}
