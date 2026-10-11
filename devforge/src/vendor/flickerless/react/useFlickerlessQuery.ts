'use client';
import { useMemo } from 'react';
import { readQueryState, type QuerySnapshot, type QueryState } from '@flickerless/core';

/**
 * Normaliza el resultado de TanStack Query / SWR / Apollo para la superficie:
 * `{ loading, isInitialLoading, isRefetching, isEmpty, settled, error }`.
 * Normalmente basta con `<FlickerlessSurface query={q}>`; el hook es para pintar
 * algo fuera de ella con el mismo criterio.
 */
export function useFlickerlessQuery(query: QuerySnapshot | null | undefined): QueryState {
  return useMemo(
    () => readQueryState(query),
    [query?.data, query?.isPending, query?.isLoading, query?.isFetching, query?.isPlaceholderData, query?.error, query?.status],
  );
}
