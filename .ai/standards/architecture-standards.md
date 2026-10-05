# ⚡ DEVFORGE Architectural Standards

## 1. Domain-Driven / Feature-First Directory Structure

Do not organize by tech layers (e.g. all components in one folder, all services in another). Organize by business domains:

```text
src/
├── app/               # App shell, routing, layout, providers
├── core/              # Agnostic core utilities, HTTP clients, auth tokens, permission engine
├── modules/           # Business feature domains (self-contained)
│   ├── auth/
│   │   ├── components/
│   │   ├── hooks/     # (or composables/ in Vue)
│   │   ├── services/
│   │   ├── types/
│   │   └── index.ts   # Public barrel file
│   ├── billing/
│   └── users/
└── shared/            # Cross-cutting UI components (Button, Modal, Input, DataTable)
```

## 2. Unidirectional Data Flow & State Segregation

- **Server State**: Managed strictly with TanStack Query (React) or TanStack Query / Pinia cache (Vue).
- **Client UI State**: Modals, drawer visibility, selected tabs -> Local component state or lightweight store (Zustand / Pinia).
- **URL State**: Pagination, search filters, sorting -> Sourced directly from URL search params.

## 3. Dependency Inversion

- Never hardcode `fetch` or `axios` directly inside UI components.
- UI components must call hooks/composables, which in turn call typed service layers.

## 4. Zero Hardcoded Data Directive (Real Dynamic Data Only)

Hardcoding static arrays or dummy metrics directly inside UI components is **strictly forbidden**:

- **No Static Array Fixtures in Components**: Never declare `const transactions = [...]` or static metric strings inside `.vue` or `.tsx` view files.
- **Service & Hook Layer Mandatory**: Every piece of data displayed on screen must be requested through a service (`modules/[domain]/services/`) and consumed via a reactive hook or composable (`useQuery` / `useTransactions`).
- **Dynamic Response Handling**: Components must always account for dynamic variations:
  - Real pagination (`page`, `pageSize`, `totalCount`, `totalPages`).
  - True empty states when arrays return `[]`.
  - Realistic numeric formatting using `Intl.NumberFormat` instead of raw hardcoded strings like `"$17.87M"`.
- **Decoupled Mocking (If Backend is Offline/WIP)**:
  - If a backend endpoint is not yet available, mock data must live exclusively in an interceptor layer (e.g. **MSW - Mock Service Worker** in `src/mocks/` or a dedicated mock service adapter).
  - The UI component must still make a real asynchronous network request as if communicating with production.

## 5. Mandatory Server-Side Pagination & Zero Over-Fetching

Loading datasets without pagination or requesting unused database columns is **strictly forbidden**:

- **Always Paginated**: Every list, data-grid, or collection MUST accept pagination parameters (`page` & `pageSize`, or cursor `first` & `after`). Never load all rows in a single batch.
- **Zero Over-Fetching (GraphQL Preferred)**:
  - When GraphQL is used, only select the specific fields displayed in the view. Use **Fragment Colocation** so child components declare their own data requirements.
  - When REST is used, use sparse fieldsets (`?fields=id,nombre,monto`) to prevent the backend from running heavy multi-table joins for unused data.
- **Smooth Page Transitions**: Always configure TanStack Query / composables with `placeholderData: (previousData) => previousData` to eliminate white screen flashes and layout shifts during page changes.
