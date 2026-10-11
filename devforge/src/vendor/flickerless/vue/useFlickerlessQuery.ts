import { computed, unref, type Ref, type ComputedRef } from 'vue';
import { isEmptyValue } from '@flickerless/core';

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
