import { computed, unref, type Ref, type ComputedRef } from 'vue';

export interface QueryLike<T = any> {
  data?: Ref<T | undefined> | T | undefined;
  isPending?: Ref<boolean> | boolean;
  isLoading?: Ref<boolean> | boolean;
  isFetching?: Ref<boolean> | boolean;
  isPlaceholderData?: Ref<boolean> | boolean;
  error?: Ref<any> | any;
  status?: Ref<string> | string;
}

export interface FlickerlessQueryState {
  loading: ComputedRef<boolean>;
  isInitialLoading: ComputedRef<boolean>;
  isRefetching: ComputedRef<boolean>;
  isEmpty: ComputedRef<boolean>;
  error: ComputedRef<any>;
}

/**
 * Normaliza cualquier query de TanStack Query / Vue Query / Pinia Colada / SWR
 * para alimentar directamente a <FlickerlessSurface>.
 */
export function useFlickerlessQuery<T = any>(query: QueryLike<T>): FlickerlessQueryState {
  const data = computed(() => unref(query.data));
  const isPending = computed(() => Boolean(unref(query.isPending) ?? unref(query.isLoading) ?? false));
  const isFetching = computed(() => Boolean(unref(query.isFetching) ?? false));
  const isPlaceholderData = computed(() => Boolean(unref(query.isPlaceholderData) ?? false));
  const error = computed(() => unref(query.error) ?? null);

  const isEmpty = computed(() => {
    const val = data.value;
    if (val === null || val === undefined) return true;
    if (Array.isArray(val)) return val.length === 0;
    if (typeof val === 'object' && Object.keys(val).length === 0) return true;
    return false;
  });

  const isInitialLoading = computed(() => {
    return isPending.value && !isPlaceholderData.value && isEmpty.value;
  });

  const isRefetching = computed(() => {
    return isFetching.value && !isInitialLoading.value;
  });

  const loading = computed(() => isFetching.value || isPending.value);

  return {
    loading,
    isInitialLoading,
    isRefetching,
    isEmpty,
    error,
  };
}
