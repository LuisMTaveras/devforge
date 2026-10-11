/** Lo que una query de TanStack Query / SWR / Apollo expone, ya sin refs. */
export interface QuerySnapshot<T = unknown> {
  data?: T;
  isPending?: boolean;
  isLoading?: boolean;
  isFetching?: boolean;
  isPlaceholderData?: boolean;
  error?: unknown;
  status?: string;
}

export interface QueryState {
  /** Hay una petición en vuelo (la primera o una recarga). */
  loading: boolean;
  /** Primera carga sin nada que conservar. */
  isInitialLoading: boolean;
  isRefetching: boolean;
  isEmpty: boolean;
  /** La query respondió al menos una vez (hay `data` o `status === 'success'`). */
  settled: boolean;
  error: unknown;
}

const LIST_KEYS = ['items', 'edges', 'nodes', 'data', 'results', 'rows'] as const;

/**
 * Vacío de verdad: `null`, `[]`, `{}` o una página `{ items | edges | nodes | data | results | rows: [] }`.
 * Una página con su total (`{ items: [], totalCount: 0 }`) está vacía aunque tenga claves.
 */
export function isEmptyValue(val: unknown): boolean {
  if (val === null || val === undefined) return true;
  if (Array.isArray(val)) return val.length === 0;
  if (typeof val === 'object') {
    const rec = val as Record<string, unknown>;
    for (const key of LIST_KEYS) {
      const list = rec[key];
      if (Array.isArray(list)) return list.length === 0;
    }
    return Object.keys(rec).length === 0;
  }
  return false;
}

/** Normaliza una query para alimentar a la superficie (React, React Native o cualquier vista sin refs). */
export function readQueryState(query: QuerySnapshot | null | undefined): QueryState {
  const q = query ?? {};
  const isPending = Boolean(q.isPending ?? q.isLoading ?? false);
  const isFetching = Boolean(q.isFetching ?? false);
  const isEmpty = isEmptyValue(q.data);
  const isInitialLoading = isPending && !q.isPlaceholderData && isEmpty;
  return {
    loading: isFetching || isPending,
    isInitialLoading,
    isRefetching: isFetching && !isInitialLoading,
    isEmpty,
    settled: q.data !== undefined || q.status === 'success',
    error: q.error ?? null,
  };
}
