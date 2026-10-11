import { computed, unref, type Ref, type ComputedRef } from 'vue';

export interface QueryLike<T = unknown> {
  data?: Ref<T | undefined> | T | undefined;
  isPending?: Ref<boolean> | boolean;
  isLoading?: Ref<boolean> | boolean;
  isFetching?: Ref<boolean> | boolean;
  isPlaceholderData?: Ref<boolean> | boolean;
  error?: Ref<unknown> | unknown;
  status?: Ref<string> | string;
}

export interface FlickerlessQueryState {
  loading: ComputedRef<boolean>;
  isInitialLoading: ComputedRef<boolean>;
  isRefetching: ComputedRef<boolean>;
  isEmpty: ComputedRef<boolean>;
  /** La query respondió al menos una vez (hay `data` o `status === 'success'`). */
  settled: ComputedRef<boolean>;
  error: ComputedRef<unknown>;
}

/** Una página `{ items }`, `{ edges }` o `{ nodes }` está vacía si su lista lo está, no por tener claves. */
function isEmptyValue(val: unknown): boolean {
  if (val === null || val === undefined) return true;
  if (Array.isArray(val)) return val.length === 0;
  if (typeof val === 'object') {
    const rec = val as Record<string, unknown>;
    for (const key of ['items', 'edges', 'nodes', 'data', 'results', 'rows']) {
      if (Array.isArray(rec[key])) return (rec[key] as unknown[]).length === 0;
    }
    return Object.keys(rec).length === 0;
  }
  return false;
}

/**
 * Normaliza cualquier query de TanStack Query / Vue Query / Pinia Colada / SWR
 * para alimentar directamente a <FlickerlessSurface>. Acepta la query o un getter
 * (`() => props.query`) para seguirla si se reemplaza.
 */
export function useFlickerlessQuery<T = unknown>(
  query: QueryLike<T> | (() => QueryLike<T> | null | undefined),
): FlickerlessQueryState {
  const q = (): QueryLike<T> => (typeof query === 'function' ? query() : query) ?? {};
  const data = computed(() => unref(q().data));
  const isPending = computed(() => Boolean(unref(q().isPending) ?? unref(q().isLoading) ?? false));
  const isFetching = computed(() => Boolean(unref(q().isFetching) ?? false));
  const isPlaceholderData = computed(() => Boolean(unref(q().isPlaceholderData) ?? false));
  const error = computed(() => unref(q().error) ?? null);

  const isEmpty = computed(() => isEmptyValue(data.value));
  const settled = computed(() => data.value !== undefined || unref(q().status) === 'success');

  const isInitialLoading = computed(() => isPending.value && !isPlaceholderData.value && isEmpty.value);
  const isRefetching = computed(() => isFetching.value && !isInitialLoading.value);
  const loading = computed(() => isFetching.value || isPending.value);

  return { loading, isInitialLoading, isRefetching, isEmpty, settled, error };
}
