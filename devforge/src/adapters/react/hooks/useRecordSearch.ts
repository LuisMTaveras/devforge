import { useEffect, useRef, useSyncExternalStore } from 'react';
import { createRecordSearch, type RecordSearch, type RecordSearchOptions } from '../../../core/search/record-search.js';

/**
 * ⚡ DEVFORGE useRecordSearch (React) — `createRecordSearch` como hook. `options.fetch` se lee de la
 * última render (no hace falta memorizarla).
 *
 *   const search = useRecordSearch({ fetch: (q, ctx) => clientesService.buscar(q, ctx), toMessage: e => normalizeApiError(e).message });
 *   search.state.items · search.setQuery(q) · search.loadMore()
 */
export function useRecordSearch<T>(options: RecordSearchOptions<T>) {
  const latest = useRef(options);
  latest.current = options;
  const engine = useRef<RecordSearch<T> | null>(null);
  if (!engine.current) {
    engine.current = createRecordSearch<T>({ ...options, fetch: (q, ctx) => latest.current.fetch(q, ctx), toMessage: e => (latest.current.toMessage ?? (() => 'No se pudo completar la búsqueda.'))(e) });
  }
  const e = engine.current;
  const state = useSyncExternalStore(e.subscribe, e.getState, e.getState);
  useEffect(() => () => e.destroy(), [e]);
  return { state, setQuery: e.setQuery, flush: e.flush, loadMore: e.loadMore, reset: e.reset };
}
