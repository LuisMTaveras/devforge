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

Install it with `devforge add url-sync` — **do not rewrite it**. Its exact API (see `.ai/standards/module-api.md` §7):

```typescript
export interface TableParams {
  page: number;               // default 1
  pageSize: number;           // default 10
  search: string;             // default ''
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, string>; // any other query key, e.g. ?estado=activo
}

export function parseSearchParams(searchString: string): TableParams;
export function serializeSearchParams(params: Partial<TableParams>): string; // '' or '?page=2&...'
```

---

### 2. React Hook (`src/shared/hooks/useURLTableState.ts`)

```tsx
import { useSearchParams } from 'react-router-dom';
import { useCallback, useMemo } from 'react';
import { parseSearchParams, serializeSearchParams, type TableParams } from '@/core/url-sync/url-state';

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
import { parseSearchParams, serializeSearchParams, type TableParams } from '@/core/url-sync/url-state';

export function useURLTableState() {
  const route = useRoute();
  const router = useRouter();

  // Derived from route.query (reactive). Never read window.location here: it does not re-render.
  const state = computed<TableParams>(() => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(route.query)) {
      if (typeof value === 'string') query.set(key, value);
    }
    return parseSearchParams(query.toString());
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
- `useURLTableState()` is **not** shipped by `devforge add`: create it in `src/shared/hooks/` (React, needs `react-router-dom`) or `src/shared/composables/` (Vue, needs `vue-router`) from the code above. If the project uses another router (e.g. Next.js), adapt it and tell the user.
- Send `state.page` and `state.pageSize` to the service on every request (`.ai/blueprints/07-graphql-pagination.md`).
- Format every cell with `@/core/formatters/formatters` (money right-aligned with `text-right tabular-nums`, `—` for empty values).
