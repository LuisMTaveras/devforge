# ⚡ BLUEPRINT 01: OpenAPI/Swagger to Type-Safe SDK & Hooks

## 🎯 Goal

Eliminate manual TypeScript interfaces and hand-written API endpoints. Automatically generate 100% typed API clients and TanStack Query hooks / Vue composables directly from an OpenAPI/Swagger JSON or URL.

---

## 🛠️ Recommended Tooling

- `openapi-typescript`: Blazing fast CLI that converts Swagger/OpenAPI 3.0/3.1 to pure TypeScript interfaces without heavy runtime overhead.
- `openapi-fetch`: Ultra-lightweight (1.5kb) native fetch wrapper that uses the generated types for compile-time autocomplete on paths, query params, headers, and responses.

---

## 📋 Step-by-Step Implementation

### 1. Package Installation

```bash
npm install -D openapi-typescript
npm install openapi-fetch
```

### 2. Add Generation Script in `package.json`

```json
{
  "scripts": {
    "api:generate": "openapi-typescript https://api.yourdomain.com/swagger.json -o ./src/core/api/v1.d.ts",
    "api:generate:local": "openapi-typescript ./swagger.json -o ./src/core/api/v1.d.ts"
  }
}
```

### 3. Create the Type-Safe Client (`src/core/api/client.ts`)

```typescript
import createClient from 'openapi-fetch';
import type { paths } from './v1';

export const apiClient = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_URL || 'https://api.yourdomain.com',
});

// Middleware for Auth tokens:
apiClient.use({
  async onRequest({ request }) {
    const token = localStorage.getItem('access_token');
    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`);
    }
    return request;
  },
  async onResponse({ response }) {
    if (response.status === 401) {
      // Trigger refresh token flow or redirect to login
    }
    return response;
  }
});
```

### 4. Framework Integration

#### React (with TanStack Query v5)

```typescript
// src/modules/users/hooks/useUsersQuery.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';

export function useUsersQuery(page: number, limit = 10) {
  return useQuery({
    queryKey: ['users', { page, limit }],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/v1/users', {
        params: {
          query: { page, limit }
        }
      });
      if (error) throw error;
      return data;
    }
  });
}
```

#### Vue 3 (with VueUse / Composable)

```typescript
// src/modules/users/composables/useUsers.ts
import { ref, watchEffect, type Ref } from 'vue';
import { apiClient } from '@/core/api/client';
import type { paths } from '@/core/api/v1';

type UsersResponse = paths['/api/v1/users']['get']['responses']['200']['content']['application/json'];

export function useUsers(pageRef: Ref<number>) {
  const users = ref<UsersResponse | null>(null);
  const loading = ref(false);
  const error = ref<unknown>(null);

  const fetchUsers = async () => {
    loading.value = true;
    error.value = null;
    try {
      const { data, error: apiError } = await apiClient.GET('/api/v1/users', {
        params: { query: { page: pageRef.value } }
      });
      if (apiError) throw apiError;
      users.value = data;
    } catch (err) {
      error.value = err;
    } finally {
      loading.value = false;
    }
  };

  watchEffect(() => {
    fetchUsers();
  });

  return { users, loading, error, refetch: fetchUsers };
}
```

---

## 🤖 Instructions for AI Agents

When prompted to integrate a new endpoint:

1. Check `src/core/api/v1.d.ts` for path definitions.
2. Use `apiClient.GET()`, `apiClient.POST()`, `apiClient.PUT()`, or `apiClient.DELETE()`.
3. Wrap it in a reusable hook/composable under `src/modules/[module]/`.
4. Never manually type responses; let TypeScript infer from `apiClient`.
