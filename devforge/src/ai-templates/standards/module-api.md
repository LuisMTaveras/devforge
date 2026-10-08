# ⚡ DEVFORGE Module API Reference (Source of Truth)

<!-- Exact public API of every module installed with `devforge add <module>`. If a function is not listed here, it does NOT exist. -->

## 0. How to Use This File (Read First)

- This is the **complete** list of what DEVFORGE modules export. **Do not call, import or document any function, prop or option that is not listed here.**
- Before importing a module, **check that the file exists** in the project (e.g. `src/core/formatters/formatters.ts`). If it does not, tell the user to run the install command shown below — never recreate the module from memory.
- If the installed file in `src/` differs from this reference, **the installed file wins**: read it and follow it.
- All imports use the `@/` alias (`@/core/...`, `@/shared/...`). `devforge add` already rewrites imports to that alias.
- The CLI is the globally linked `devforge` binary (`npm link` from the DEVFORGE repo). **Never run `npx devforge`**: the npm package named `devforge` is an unrelated project.

| Module       | Install command          | Files created in the project |
| ------------ | ------------------------ | ---------------------------- |
| formatters   | `devforge add formatters` | `src/core/formatters/formatters.ts` |
| theme        | `devforge add theme`      | `src/core/theme/theme.ts`, `src/shared/styles/tokens.css`, `src/shared/composables/useTheme.ts` (Vue), `src/shared/hooks/useTheme.ts` (React) |
| auth         | `devforge add auth`       | `src/core/auth/auth-token.ts`, `src/core/auth/silent-refresh-queue.ts`, `src/modules/auth/stores/auth.store.ts` |
| errors       | `devforge add errors`     | `src/core/errors/api-error.ts` |
| export       | `devforge add export`     | `src/core/export/export-engine.ts` |
| rbac         | `devforge add rbac`       | `src/core/permissions/ability.ts`, `src/shared/components/Can.tsx` (React), `src/shared/directives/v-can.ts` (Vue) |
| url-sync     | `devforge add url-sync`   | `src/core/url-sync/url-state.ts` |

> `theme` and `rbac` install both the Vue and the React adapter. Delete the one your framework does not use.

---

## 1. `formatters` — `@/core/formatters/formatters`

Default country: **República Dominicana** (`es-DO`, `DOP`, phones `(809) 578-1234`). Every function returns `—` for `null`, `undefined`, `''` or invalid input.

| Export | Signature | Example (defaults: DO) |
| ------ | --------- | ---------------------- |
| `setFormatCountry` | `(country: CountryCode, overrides?: Partial<typeof formatConfig>) => void` | `setFormatCountry('CO')` |
| `setFormatDefaults` | `(config: Partial<typeof formatConfig>) => void` | `setFormatDefaults({ phoneDisplay: 'international' })` |
| `formatCurrency` | `(amount, options?: { currency?, locale?, minimumFractionDigits? }) => string` | `17870000` ➔ `RD$17,870,000.00` |
| `formatNumber` | `(value, options?: { locale?, minimumFractionDigits?, maximumFractionDigits? }) => string` | `1234567.891` ➔ `1,234,567.89` |
| `formatPercent` | `(value, options?: { locale?, fractionDigits?, isRatio? }) => string` | `0.125` ➔ `12.5%`; `(12.5, { isRatio: false })` ➔ `12.5%` |
| `formatDate` | `(date, style?: 'short' \| 'medium' \| 'long' \| 'datetime', locale?) => string` | `formatDate(iso, 'medium')` |
| `formatRelativeTime` | `(date, locale?) => string` | `hace 5 minutos` |
| `formatPhoneNumber` | `(phone, country?: string, display?: 'national' \| 'international') => string` | `8095781234` ➔ `(809) 578-1234` |
| `formatFallback` | `<T>(value: T, fallback?: string) => T \| string` | `null` ➔ `—` |
| `COUNTRY_PRESETS` | `Record<CountryCode, { name, locale, currency, dialCode }>` | `COUNTRY_PRESETS.DO.currency` ➔ `'DOP'` |
| `formatConfig` | `{ defaultLocale, defaultCurrency, defaultCountry, phoneDisplay, fallbackString }` | read-only in components |
| types | `CountryCode` (`'DO' \| 'US' \| 'PR' \| 'CO' \| 'MX' \| 'ES' \| 'CL' \| 'PE' \| 'AR'`), `PhoneDisplay`, `CountryPreset`, `FormatOptions` | |

- Phone masks exist for `DO`, `US`, `PR`, `CO`, `MX`, `ES`, `CL`, `PE`. `AR` has locale/currency but **no phone mask** (falls back to `+<digits>`).
- There is **no** `formatCompact`, `parseCurrency`, `formatDocument`/cédula/RNC formatter or input mask. If one is needed, ask the user before adding it to `formatters.ts`.

---

## 2. `theme` — `@/core/theme/theme`

| Export | Signature / value |
| ------ | ----------------- |
| `initTheme` | `() => void` — call once in `main.ts` / `main.tsx` before mounting |
| `setThemePreference` | `(preference: 'light' \| 'dark' \| 'system') => void` |
| `getThemePreference` | `() => ThemePreference` (default `'system'`) |
| `resolveTheme` | `(preference?) => 'light' \| 'dark'` |
| `cycleThemePreference` | `() => ThemePreference` (light ➔ dark ➔ system) |
| `subscribeTheme` | `(listener: (theme, preference) => void) => () => void` (returns unsubscribe) |
| `THEME_LABELS` | `{ light: 'Claro', dark: 'Oscuro', system: 'Sistema' }` |
| `THEME_STORAGE_KEY` | `'devforge-theme'` |
| `THEME_INIT_SCRIPT` | string to inline in `<head>` of `index.html` |
| types | `ThemePreference`, `ResolvedTheme` |

**`useTheme()`** — Vue: `@/shared/composables/useTheme` · React: `@/shared/hooks/useTheme`
Returns `{ theme, preference, labels, setPreference, toggle }` (in Vue, `theme` and `preference` are readonly refs).

**`tokens.css`** (Tailwind CSS **v4** syntax: `@import 'tailwindcss'`, `@custom-variant`, `@theme inline`). Defines these classes and nothing else: `background`, `foreground`, `surface`, `surface-hover`, `muted-foreground`, `border`, `input`, `ring`, `primary`, `primary-foreground`, `success`, `warning`, `danger` (usable as `bg-*`, `text-*`, `border-*`, `ring-*`). For Tailwind v3 see `.ai/standards/theming.md` §7.

---

## 3. `auth` — `@/core/auth/auth-token`, `@/core/auth/silent-refresh-queue`

- `tokenStorage`: `getAccessToken()`, `setAccessToken(token)`, `getRefreshToken()`, `setRefreshToken(token)`, `setSession(accessToken, refreshToken?)`, `clearSession()`, `isTokenExpired(token?)`. Keys: `devforge_access_token`, `devforge_refresh_token` (localStorage).
- `refreshQueue` (instance of `SilentRefreshQueue`): `enqueue(): Promise<string>`, `getIsRefreshing()`, `setIsRefreshing(value)`, `resolveQueue(newToken)`, `rejectQueue(error)`.
- Vue store `@/modules/auth/stores/auth.store`: `createAuthStoreDefinition()` returns `{ user, isLoading, isAuthenticated, userRole, setUser, setSession, logout }`. Wrap it with Pinia: `defineStore('auth', createAuthStoreDefinition)`. Type: `UserProfile`.
- There is no React auth store; in React use `tokenStorage` + your state library (Zustand per the stack).

## 4. `errors` — `@/core/errors/api-error`

- `normalizeApiError(error: unknown, fallbackMessage?) => NormalizedError`
- `NormalizedError`: `{ message: string; status: number; fieldErrors: Record<string, string>; original: unknown }`

## 5. `export` — `@/core/export/export-engine`

- `exportToCSV<T>(data: T[], columns: ExportColumn<T>[], filename = 'reporte-exportado.csv') => void` (UTF-8 BOM for Excel)
- `ExportColumn<T>`: `{ header: string; key: keyof T | string; formatter?: (value, item) => string | number }` — use the formatters inside `formatter`.
- Only CSV. There is **no** `.xlsx` or PDF exporter.

## 6. `rbac` — `@/core/permissions/ability`

- Types: `Action` (`'create' | 'read' | 'update' | 'delete' | 'manage'`), `Subject`, `Rule`.
- `Ability` class: `setUser()`, `getUser()`, `updateRules(rules)`, `getRules()`, `can(action, subject, data?)`, `cannot(action, subject, data?)`.
- `globalAbility`: shared `Ability` instance.
- React `@/shared/components/Can`: `<Can I="update" a="Invoice" fallback={...}>` (props: `I`, `a` | `an` | `this`, `data?`, `fallback?`).
- Vue `@/shared/directives/v-can`: `installPermissions(app)` registers `v-can`; usage `v-can:update="'Invoice'"`. There is **no** Vue `<Can>` component.

## 7. `url-sync` — `@/core/url-sync/url-state`

- `TableParams`: `{ page; pageSize; search; sortBy?; sortOrder?: 'asc' | 'desc'; filters?: Record<string, string> }`
- `parseSearchParams(search: string) => TableParams` (defaults `page=1`, `pageSize=10`; unknown keys go to `filters`)
- `serializeSearchParams(params: Partial<TableParams>) => string` (returns `''` or `?page=2&...`)
- The router-bound `useURLTableState()` hook/composable is **not** shipped: build it from `.ai/blueprints/03-datagrid-url-sync.md`.
