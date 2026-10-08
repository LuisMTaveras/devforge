# ⚡ BLUEPRINT 07: Strict Pagination & GraphQL Query Optimization

## 🎯 Goal

Eliminate backend performance bottlenecks and frontend memory bloat.
1. **Always Paginated**: Strictly prohibit loading unrestricted datasets (`SELECT *` or unrestricted `GET /items`).
2. **Zero Over-Fetching (GraphQL / Projections)**: Only query the specific fields that the UI component actually renders on screen.

---

## 🛠️ 1. Mandatory Pagination Standards

Every list, table, or collection MUST implement server-side pagination with a sensible default page size (`10`, `15`, or `25` items).

### Standard Offset Pagination Contract (TypeScript)

Create this file yourself at `src/core/types/pagination.ts` (no `devforge add` module ships it). If the backend returns other field names, map them in the service layer to this contract:

```typescript
export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
```

### Standard Cursor Pagination Contract (Relay Specification)

```typescript
export interface CursorPageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string;
  endCursor?: string;
}

export interface CursorConnection<T> {
  edges: Array<{ cursor: string; node: T }>;
  pageInfo: CursorPageInfo;
  totalCount?: number;
}
```

---

## 🛠️ 2. GraphQL Optimization & Fragment Colocation

### The Golden Rule: Only Request Fields Used in the Template

Never write wildcard or bloated queries. Use **GraphQL Fragment Colocation**: each component declares the exact fields it needs.

### Example: Component Fragment (`ClienteRow.vue` / `ClienteRow.tsx`)

```graphql
# src/modules/clientes/graphql/cliente.fragments.graphql
fragment ClienteRowFields on Cliente {
  id
  nombre
  empresa
  montoTotal
  estado
  fechaCreacion
  # Notice: we DO NOT query internal notes, audit history, or heavy relationships here!
}
```

### Composed Paginated Query

```graphql
# src/modules/clientes/graphql/getClientes.query.graphql
query GetClientesPaginated($page: Int!, $pageSize: Int!, $filtro: ClienteFiltroInput) {
  clientes(page: $page, pageSize: $pageSize, filtro: $filtro) {
    items {
      ...ClienteRowFields
    }
    totalCount
    totalPages
    hasNextPage
  }
}
```

---

## 📋 Implementation in Vue 3 (with TanStack Query + GraphQL Client)

```typescript
// src/modules/clientes/composables/useClientesQuery.ts
import { computed, type Ref } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { request, gql } from 'graphql-request';
import type { PaginatedResult } from '@/core/types/pagination';
import { tokenStorage } from '@/core/auth/auth-token'; // devforge add auth

const GRAPHQL_ENDPOINT = import.meta.env.VITE_GRAPHQL_URL || '/graphql';

const GET_CLIENTES = gql`
  query GetClientes($page: Int!, $pageSize: Int!, $search: String) {
    clientes(page: $page, pageSize: $pageSize, search: $search) {
      items {
        id
        nombre
        montoTotal
        estado
        fechaCreacion
      }
      totalCount
      totalPages
      hasNextPage
    }
  }
`;

interface ClienteListItem {
  id: string;
  nombre: string;
  montoTotal: number;
  estado: string;
  fechaCreacion: string;
}

export function useClientesQuery(
  page: Ref<number>,
  pageSize: Ref<number>,
  search: Ref<string>
) {
  return useQuery({
    queryKey: ['clientes', { page, pageSize, search }],
    queryFn: async () => {
      const response = await request<{ clientes: PaginatedResult<ClienteListItem> }>(
        GRAPHQL_ENDPOINT,
        GET_CLIENTES,
        {
          page: page.value,
          pageSize: pageSize.value,
          search: search.value || undefined,
        },
        {
          Authorization: `Bearer ${tokenStorage.getAccessToken() ?? ''}`,
        }
      );
      return response.clientes;
    },
    placeholderData: (previousData) => previousData, // Smooth pagination transition without flickering
  });
}
```

---

## 📋 REST Alternative: Sparse Fieldsets

If the backend uses REST instead of GraphQL, always pass explicit field projections via query parameters:

```typescript
// Request ONLY required columns from REST backend:
apiClient.GET('/api/v1/clientes', {
  params: {
    query: {
      page: 1,
      pageSize: 10, // use the param names defined by YOUR backend (see v1.d.ts)
      fields: 'id,nombre,montoTotal,estado,fechaCreacion', // Sparse fieldset
    }
  }
});
```

---

## 🤖 Instructions for AI Agents

1. **Never generate un-paginated queries**: Every collection endpoint must accept `page` & `pageSize` (or `first` & `after`).
2. **Never query unused fields**: In GraphQL queries, only write the specific fields displayed in the component. Never add heavy sub-resources (`logs`, `auditTrails`, `documents`) to listing queries.
3. **Smooth Transitions**: Always use `placeholderData: (prev) => prev` (TanStack Query) to maintain previous data while loading the next page without layout jumps.
4. **Do not invent the schema**: the `clientes` query, its arguments and its fields above are examples. Use only types and fields that exist in the GraphQL schema or `v1.d.ts`. If you cannot see the schema, ask the user for it.
