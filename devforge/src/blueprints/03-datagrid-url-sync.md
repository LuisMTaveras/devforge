# ⚡ BLUEPRINT 03: Data-Grid & URL-State Synchronization Engine

## 🎯 Goal

Keep data tables completely synchronized with the browser URL (`?page=2&search=acme&sort=-created_at&status=active`).

- Refreshing the page preserves the exact view.
- Back and Forward buttons navigate through filter history.
- Shareable URLs work out-of-the-box for colleagues and bookmarks.

---

## 🛠️ Core Architecture

1. **URL State Synchronizer**: A reactive hook/composable that reads from `URLSearchParams` on mount, debounces updates, and pushes or replaces history state.
2. **TanStack Table Integration**: Passes pagination, sorting, and column filters directly to/from the URL state.

---

## 📋 Step-by-Step Implementation

### 1. The Agnostic URL State Logic (`src/core/url-sync/url-state.ts`)

```typescript
export interface TableParams {
  page: number;
  pageSize: number;
  search: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  [key: string]: unknown;
}

export function parseSearchParams(searchString: string): TableParams {
  const params = new URLSearchParams(searchString);
  return {
    page: Math.max(1, parseInt(params.get('page') || '1', 10)),
    pageSize: Math.max(10, parseInt(params.get('pageSize') || '10', 10)),
    search: params.get('search') || '',
    sortBy: params.get('sortBy') || undefined,
    sortOrder: (params.get('sortOrder') as 'asc' | 'desc') || undefined,
  };
}

export function serializeSearchParams(params: Partial<TableParams>): string {
  const searchParams = new URLSearchParams();
  if (params.page && params.page > 1) searchParams.set('page', String(params.page));
  if (params.pageSize && params.pageSize !== 10) searchParams.set('pageSize', String(params.pageSize));
  if (params.search) searchParams.set('search', params.search);
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
  
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}
```

---

### 2. React Hook (`src/shared/hooks/useURLTableState.ts`)

```tsx
import { useSearchParams } from 'react-router-dom';
import { useCallback, useMemo } from 'react';
import { parseSearchParams, serializeSearchParams, TableParams } from '@/core/url-sync/url-state';

export function useURLTableState() {
  const [searchParams, setSearchParams] = useSearchParams();

  const state = useMemo(() => {
    return parseSearchParams(searchParams.toString());
  }, [searchParams]);

  const updateState = useCallback((newParams: Partial<TableParams>) => {
    const merged = { ...state, ...newParams };
    // If search term changed, reset page to 1
    if (newParams.search !== undefined && newParams.search !== state.search) {
      merged.page = 1;
    }
    const query = serializeSearchParams(merged);
    setSearchParams(new URLSearchParams(query), { replace: true });
  }, [state, setSearchParams]);

  return { state, updateState };
}
```

---

### 3. Vue 3 Composable (`src/shared/composables/useURLTableState.ts`)

```typescript
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { parseSearchParams, serializeSearchParams, TableParams } from '@/core/url-sync/url-state';

export function useURLTableState() {
  const route = useRoute();
  const router = useRouter();

  const state = computed<TableParams>(() => {
    return parseSearchParams(window.location.search);
  });

  const updateState = (newParams: Partial<TableParams>) => {
    const merged = { ...state.value, ...newParams };
    if (newParams.search !== undefined && newParams.search !== state.value.search) {
      merged.page = 1;
    }
    const query = serializeSearchParams(merged);
    router.replace({ path: route.path, query: Object.fromEntries(new URLSearchParams(query)) });
  };

  return { state, updateState };
}
```

---

### 4. Integration with TanStack Table

Whenever instantiating a TanStack Table instance:

1. Bind `pageIndex` to `state.page - 1` and `pageSize` to `state.pageSize`.
2. Connect `onPaginationChange` to update URL params via `updateState({ page: nextPageIndex + 1 })`.
3. Connect search input `onChange` through a 300ms debounce to `updateState({ search: val })`.

---

## 🤖 Instructions for AI Agents

- When creating any data listing or admin table, NEVER store pagination or filters solely in component `useState` or `ref()`.
- Always implement the URL synchronization pattern so the user can refresh and share the page without losing state.
