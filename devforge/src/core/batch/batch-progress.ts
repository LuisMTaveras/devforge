/**
 * ⚡ DEVFORGE Batch Progress — el avance EN VIVO de un lote que se procesa uno a uno
 * («3 de 10 · Distribuidora del Caribe»). Framework-agnostic; lo pinta <BatchProgressModal />.
 *
 * Dos formas de alimentarlo:
 *
 *  1. Lote en el CLIENTE (una petición por documento):
 *       const batch = createBatchTracker()
 *       await batch.run({
 *         title: 'Enviando facturas',
 *         items: facturas.map(f => ({ id: f.id, label: f.numero, sublabel: f.cliente?.nombre })),
 *         worker: item => api.facturas.enviar(item.id),   // throw = FAILED; return { status: 'SKIPPED', detail } para omitir
 *       })
 *
 *  2. Lote en el SERVIDOR (una petición, el servidor avisa por socket/SSE):
 *       await batch.track({ title, items, request: key => api.lote({ progressKey: key }), settle: res => res.resultados })
 *       socket.on('batch:progress', batch.apply)
 *
 * Cerrar el modal mientras corre solo lo esconde: el lote sigue.
 */

export type BatchItemStatus = 'PENDING' | 'RUNNING' | 'DONE' | 'SKIPPED' | 'FAILED';
export type BatchOutcomeStatus = Exclude<BatchItemStatus, 'PENDING' | 'RUNNING'>;

export interface BatchItem {
  id: string;
  label: string;
  sublabel?: string | null;
  status: BatchItemStatus;
  /** Por qué falló o se omitió. */
  detail?: string | null;
}

export interface BatchOutcome {
  id: string;
  status: BatchOutcomeStatus;
  detail?: string | null;
}

export interface BatchState {
  open: boolean;
  key: string;
  title: string;
  state: 'IDLE' | 'RUNNING' | 'FINISHED';
  total: number;
  processed: number;
  counts: { done: number; skipped: number; failed: number };
  currentId: string | null;
  items: BatchItem[];
  /** Error que cortó el lote entero (no el de una fila). */
  error: string;
}

/** Lo que manda el servidor en cada evento: la foto completa o una fila. */
export type BatchEvent = Partial<Omit<BatchState, 'open' | 'items'>> & { key: string; items?: BatchItem[]; item?: BatchItem };

type ItemInput = { id: string; label: string; sublabel?: string | null };

const EMPTY: BatchState = {
  open: false,
  key: '',
  title: '',
  state: 'IDLE',
  total: 0,
  processed: 0,
  counts: { done: 0, skipped: 0, failed: 0 },
  currentId: null,
  items: [],
  error: '',
};

function newKey(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function recountBatch(items: BatchItem[]) {
  const counts = { done: 0, skipped: 0, failed: 0 };
  for (const i of items) {
    if (i.status === 'DONE') counts.done += 1;
    else if (i.status === 'SKIPPED') counts.skipped += 1;
    else if (i.status === 'FAILED') counts.failed += 1;
  }
  return { counts, processed: counts.done + counts.skipped + counts.failed };
}

function errorMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string; error?: string } }; message?: string };
  return e?.response?.data?.message || e?.response?.data?.error || e?.message || fallback;
}

export function createBatchTracker() {
  let state: BatchState = { ...EMPTY };
  const listeners = new Set<(state: BatchState) => void>();

  function set(patch: Partial<BatchState>) {
    state = { ...state, ...patch };
    listeners.forEach(l => l(state));
  }

  function start(title: string, items: ItemInput[]): string {
    const key = newKey();
    set({
      ...EMPTY,
      open: true,
      key,
      title,
      state: 'RUNNING',
      total: items.length,
      items: items.map(i => ({ ...i, status: 'PENDING' as const })),
    });
    return key;
  }

  function updateItem(id: string, patch: Partial<BatchItem>) {
    const items = state.items.map(i => (i.id === id ? { ...i, ...patch } : i));
    set({ items, ...recountBatch(items) });
  }

  /** Procesa en el cliente, de uno en uno y en orden. Un fallo de una fila NO corta el lote. */
  async function run<T>(opts: {
    title: string;
    items: ItemInput[];
    worker: (item: ItemInput, index: number) => Promise<T | { status: BatchOutcomeStatus; detail?: string }>;
  }): Promise<BatchState> {
    const key = start(opts.title, opts.items);
    for (const [index, item] of opts.items.entries()) {
      if (state.key !== key) break; // otro lote reemplazó a este
      set({ currentId: item.id });
      updateItem(item.id, { status: 'RUNNING' });
      try {
        const result = await opts.worker(item, index);
        const outcome = result && typeof result === 'object' && 'status' in result ? (result as BatchOutcome) : null;
        updateItem(item.id, { status: outcome?.status ?? 'DONE', detail: outcome?.detail ?? null });
      } catch (err) {
        updateItem(item.id, { status: 'FAILED', detail: errorMessage(err, 'No se pudo procesar.') });
      }
    }
    if (state.key === key) set({ state: 'FINISHED', currentId: null });
    return state;
  }

  /** Lote del servidor: `request` recibe la llave; `settle` traduce la respuesta al desenlace de cada fila. */
  async function track<T>(opts: {
    title: string;
    items: ItemInput[];
    request: (progressKey: string) => Promise<T>;
    settle?: (result: T) => BatchOutcome[];
  }): Promise<T | null> {
    const key = start(opts.title, opts.items);
    try {
      const result = await opts.request(key);
      if (state.key === key) {
        const outcome = new Map((opts.settle?.(result) ?? []).map(o => [o.id, o]));
        const items = state.items.map(i => {
          const o = outcome.get(i.id);
          return o ? { ...i, status: o.status, detail: o.detail ?? i.detail ?? null } : i;
        });
        set({ items, ...recountBatch(items), state: 'FINISHED', currentId: null });
      }
      return result;
    } catch (err) {
      if (state.key === key) set({ state: 'FINISHED', currentId: null, error: errorMessage(err, 'No se pudo completar el lote.') });
      return null;
    }
  }

  /** Evento de avance del servidor (socket / SSE). Uno atrasado no deshace lo ya cerrado. */
  function apply(event: BatchEvent): void {
    if (!state.key || event.key !== state.key || state.state === 'FINISHED') return;
    const items = event.items
      ? event.items.map(i => ({ ...i }))
      : state.items.map(i => (event.item && i.id === event.item.id ? { ...i, ...event.item } : i));
    const { item: _item, items: _items, ...rest } = event;
    set({ ...rest, items, ...recountBatch(items), state: 'RUNNING' });
  }

  return {
    getState: () => state,
    subscribe(listener: (state: BatchState) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    run,
    track,
    apply,
    /** Esconde el modal. Si el lote corre, sigue corriendo. */
    close: () => set({ open: false }),
    reopen: () => state.key && set({ open: true }),
  };
}

export type BatchTracker = ReturnType<typeof createBatchTracker>;

/** «1 omitido» / «3 omitidos»: los números del lote concuerdan con su sustantivo. */
export function batchSummary(state: Pick<BatchState, 'counts' | 'total' | 'error'>, format: (n: number) => string = String): string {
  const { counts, total } = state;
  const word = (n: number, one: string, many: string) => `${format(n)} ${n === 1 ? one : many}`;
  if (state.error) return 'El lote se interrumpió.';
  if (!counts.failed && !counts.skipped) return `${format(counts.done)} de ${format(total)} ${total === 1 ? 'completado' : 'completados'}.`;
  return `${word(counts.done, 'completado', 'completados')}, ${word(counts.skipped, 'omitido', 'omitidos')} y ${format(counts.failed)} con error.`;
}

export const batchCountLabel = (n: number, kind: 'done' | 'skipped', format: (n: number) => string = String): string =>
  `${format(n)} ${kind === 'done' ? (n === 1 ? 'completado' : 'completados') : n === 1 ? 'omitido' : 'omitidos'}`;
