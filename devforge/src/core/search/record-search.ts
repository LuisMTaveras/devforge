/**
 * ⚡ DEVFORGE record-search — búsqueda de REGISTROS en el servidor mientras se teclea (selector de
 * cliente / artículo, command palette). La mecánica es siempre la misma y vive aquí:
 *
 *  - Se pide cuando el usuario hace una pausa (`debounceMs`), no en cada tecla.
 *  - Cada consulta nueva CANCELA la anterior (AbortController) y descarta su respuesta: una
 *    respuesta lenta de «fer» no pisa la de «ferre».
 *  - Mientras llega, se CONSERVAN los resultados anteriores (`stale: true`) en vez de vaciar la
 *    lista: vaciarla hace saltar el modal a cada tecla.
 *  - Paginado de verdad: `loadMore()` pide la página siguiente con la misma consulta.
 *  - Un fallo no se traga: `error` lleva el mensaje para el usuario.
 *
 *   const search = createRecordSearch({
 *     fetch: (q, { page, pageSize, signal }) => api.clientes({ q, page, pageSize, fields: 'id,nombre,rnc' }, { signal }),
 *   });
 *   search.subscribe(render); search.setQuery('ferre');
 */

export interface RecordPage<T> {
  items: T[];
  /** Total de coincidencias, si el servidor lo da. */
  total?: number;
  hasMore?: boolean;
}

export interface RecordSearchState<T> {
  query: string;
  items: T[];
  total: number | undefined;
  hasMore: boolean;
  page: number;
  /** Hay una petición en vuelo o esperando la pausa. */
  loading: boolean;
  /** Los resultados en pantalla son de una consulta anterior a la actual. */
  stale: boolean;
  /** Ya hubo al menos una respuesta para la consulta actual. */
  settled: boolean;
  error: string | null;
}

export interface RecordSearchOptions<T> {
  fetch: (query: string, ctx: { page: number; pageSize: number; signal: AbortSignal }) => Promise<RecordPage<T>>;
  pageSize?: number;
  debounceMs?: number;
  /** Menos letras que esto no busca en el servidor (0 = busca también sin texto: «recientes»). */
  minChars?: number;
  /** Convierte el error en el mensaje del usuario (p. ej. `e => normalizeApiError(e).message`). */
  toMessage?: (error: unknown) => string;
}

export interface RecordSearch<T> {
  getState(): RecordSearchState<T>;
  subscribe(fn: (s: RecordSearchState<T>) => void): () => void;
  setQuery(query: string): void;
  /** Busca ya, sin esperar la pausa (Enter, o al abrir el selector). */
  flush(): void;
  loadMore(): void;
  /** Cancela lo pendiente y vuelve al estado inicial. */
  reset(): void;
  destroy(): void;
}

const isAbort = (e: unknown) => (e as { name?: string } | null)?.name === 'AbortError' || (e as { code?: string } | null)?.code === 'ERR_CANCELED';

export function createRecordSearch<T>(options: RecordSearchOptions<T>): RecordSearch<T> {
  const pageSize = options.pageSize ?? 20;
  const debounceMs = options.debounceMs ?? 200;
  const minChars = options.minChars ?? 0;
  const toMessage = options.toMessage ?? (() => 'No se pudo completar la búsqueda.');
  const initial = (): RecordSearchState<T> => ({ query: '', items: [], total: undefined, hasMore: false, page: 1, loading: false, stale: false, settled: false, error: null });

  let state = initial();
  const listeners = new Set<(s: RecordSearchState<T>) => void>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let controller: AbortController | null = null;

  const set = (patch: Partial<RecordSearchState<T>>) => {
    state = { ...state, ...patch };
    listeners.forEach(fn => fn(state));
  };

  const cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    controller?.abort();
    controller = null;
  };

  async function run(page: number) {
    cancel();
    const q = state.query.trim();
    if (q.length < minChars) {
      set({ items: [], total: undefined, hasMore: false, page: 1, loading: false, stale: false, settled: false, error: null });
      return;
    }
    const ctrl = new AbortController();
    controller = ctrl;
    try {
      const res = await options.fetch(q, { page, pageSize, signal: ctrl.signal });
      if (controller !== ctrl) return; // llegó tarde: ya hay otra consulta
      const items = page > 1 ? [...state.items, ...res.items] : res.items;
      const hasMore = res.hasMore ?? (res.total !== undefined ? items.length < res.total : res.items.length === pageSize);
      set({ items, total: res.total, hasMore, page, loading: false, stale: false, settled: true, error: null });
    } catch (e) {
      if (isAbort(e) || controller !== ctrl) return;
      set({ loading: false, stale: false, settled: true, error: toMessage(e) });
    } finally {
      if (controller === ctrl) controller = null;
    }
  }

  return {
    getState: () => state,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    setQuery(query) {
      if (query === state.query) return;
      cancel();
      set({ query, loading: true, stale: state.items.length > 0, error: null, settled: false });
      timer = setTimeout(() => void run(1), debounceMs);
    },
    flush() {
      set({ loading: true, stale: state.items.length > 0, error: null });
      void run(1);
    },
    loadMore() {
      if (!state.hasMore || state.loading) return;
      set({ loading: true });
      void run(state.page + 1);
    },
    reset() {
      cancel();
      state = initial();
      listeners.forEach(fn => fn(state));
    },
    destroy() {
      cancel();
      listeners.clear();
    },
  };
}
