/**
 * ⚡ DEVFORGE URL State Engine
 * Pure TypeScript URL search params parser, serializer, and synchronizer.
 */

export interface TableParams {
  page: number;
  pageSize: number;
  search: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, string>;
}

export function parseSearchParams(searchString: string): TableParams {
  const clean = searchString.startsWith('?') ? searchString.slice(1) : searchString;
  const params = new URLSearchParams(clean);

  const filters: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    if (!['page', 'pageSize', 'search', 'sortBy', 'sortOrder'].includes(key)) {
      filters[key] = value;
    }
  }

  return {
    page: Math.max(1, parseInt(params.get('page') || '1', 10)),
    pageSize: Math.max(5, parseInt(params.get('pageSize') || '10', 10)),
    search: params.get('search') || '',
    sortBy: params.get('sortBy') || undefined,
    sortOrder: (params.get('sortOrder') as 'asc' | 'desc') || undefined,
    filters: Object.keys(filters).length > 0 ? filters : undefined,
  };
}

export function serializeSearchParams(params: Partial<TableParams>): string {
  const searchParams = new URLSearchParams();

  if (params.page && params.page > 1) {
    searchParams.set('page', String(params.page));
  }
  if (params.pageSize && params.pageSize !== 10) {
    searchParams.set('pageSize', String(params.pageSize));
  }
  if (params.search && params.search.trim().length > 0) {
    searchParams.set('search', params.search.trim());
  }
  if (params.sortBy) {
    searchParams.set('sortBy', params.sortBy);
  }
  if (params.sortOrder) {
    searchParams.set('sortOrder', params.sortOrder);
  }

  if (params.filters) {
    for (const [k, v] of Object.entries(params.filters)) {
      if (v) searchParams.set(k, v);
    }
  }

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}
