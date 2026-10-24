# ⚡ DEVFORGE Module API Reference (Source of Truth)

<!-- Exact public API of every module installed with `devforge add <module>`. If a function is not listed here, it does NOT exist. -->

## 0. How to Use This File (Read First)

- This is the **complete** list of what DEVFORGE modules export. **Do not call, import or document any function, prop or option that is not listed here.**
- Before importing a module, **check that the file exists** in the project (e.g. `src/core/formatters/formatters.ts`). If it does not, tell the user to run the install command shown below — never recreate the module from memory.
- If the installed file in `src/` differs from this reference, **the installed file wins**: read it and follow it.
- All imports use the `@/` alias (`@/core/...`, `@/shared/...`). `devforge add` already rewrites imports to that alias.
- **Android (Kotlin / Jetpack Compose)**: `devforge add <module> --compose` installs the Kotlin version under the app package. Its exact API is §27; rules in `.ai/standards/compose.md`.
- The CLI is the globally linked `devforge` binary (`pnpm link --global` from the DEVFORGE repo). **Never run `npx devforge` / `pnpm dlx devforge`**: the npm package named `devforge` is an unrelated project.

| Module       | Install command          | Files created in the project |
| ------------ | ------------------------ | ---------------------------- |
| formatters   | `devforge add formatters` | `src/core/formatters/formatters.ts`, `src/core/formatters/input-masks.ts` |
| theme        | `devforge add theme`      | `src/core/theme/theme.ts`, `src/shared/styles/tokens.css`, `src/shared/composables/useTheme.ts` (Vue), `src/shared/hooks/useTheme.ts` (React) |
| auth         | `devforge add auth`       | `src/core/auth/auth-token.ts`, `src/core/auth/silent-refresh-queue.ts`, `src/modules/auth/stores/auth.store.ts` |
| errors       | `devforge add errors`     | `src/core/errors/api-error.ts` |
| export       | `devforge add export`     | `src/core/export/export-engine.ts` |
| rbac         | `devforge add rbac`       | `src/core/permissions/ability.ts`, `src/shared/components/Can.tsx` (React), `src/shared/directives/v-can.ts` (Vue) |
| url-sync     | `devforge add url-sync`   | `src/core/url-sync/url-state.ts` |
| flickerless  | `devforge add flickerless` | `src/shared/flickerless/core/*`, `src/shared/flickerless/vue/*`, `src/shared/flickerless/react/*`, `src/shared/flickerless/flickerless.css` |
| select       | `devforge add select`     | `src/shared/components/SelectField.vue` (Vue) · `SelectField.tsx`, `usePopover.ts`, `icons.tsx` (React) |
| dates        | `devforge add dates`      | `src/core/dates/date-range.ts`, `DateField`, `DateRangeFilter`, `DatePicker` (`.vue` / `.tsx`) |
| feedback     | `devforge add feedback`   | `src/core/feedback/dialog.ts`, `src/core/feedback/toast.ts`, `src/core/overlay/escape-layer.ts`, `src/core/overlay/scroll-lock.ts`, `ConfirmDialog` + `ToastHost` (`.vue` / `.tsx`), `useOverlay` |
| overlays     | `devforge add overlays`   | `src/core/overlay/*.ts`, `ModalShell`, `DrawerShell`, `RowMenu` (`.vue` / `.tsx`), `useOverlay` |
| list-states  | `devforge add list-states` | `EmptyState`, `ListStaleNotice` (`.vue` / `.tsx`) |
| inputs       | `devforge add inputs`     | `MoneyInput`, `MaskedInput` (`.vue` / `.tsx`) |
| batch        | `devforge add batch`      | `src/core/batch/batch-progress.ts`, `BatchProgressModal` (`.vue` / `.tsx`) |
| authorizations | `devforge add authorizations` | `src/core/authorizations/authorization.ts`, `AuthorizationDialog`, `AuthorizationAlerts` (`.vue` / `.tsx`). Backend: blueprint 08 |
| notifications | `devforge add notifications` | `src/core/notifications/notifications.ts`, `NotificationCenter` (`.vue` / `.tsx`). Backend: blueprint 09 |
| pagination   | `devforge add pagination` | `src/core/pagination/pagination.ts`, `src/shared/components/ListPager.vue` (Vue) · `ListPager.tsx`, `icons.tsx` (React) |
| shells       | `devforge add shells`     | `CardShell`, `DetailShell`, `TableStates` (`.vue` / `.tsx`) |
| list-toolbar | `devforge add list-toolbar` | `ListToolbar`, `ListTabs`, `SearchInput`, `HistoryPeriodFilter` (`.vue` / `.tsx`) |
| list-cache   | `devforge add list-cache` | `src/core/list-cache/document-changes.ts`, `src/core/list-cache/tab-cache.ts`, `useCachedList` (composable / hook) |
| excel        | `devforge add excel`      | `src/core/export/download.ts`, `src/core/export/excel-report.ts`. Backend: blueprint 10 |
| pickers      | `devforge add pickers`    | `src/core/search/record-search.ts`, `useRecordSearch`, `SearchInput`, `RecordPickerModal` (`.vue` / `.tsx`) |
| command-palette | `devforge add command-palette` | `src/core/search/nav-search.ts`, `src/core/search/record-search.ts`, `useRecordSearch`, `SearchInput`, `CommandPalette` (`.vue` / `.tsx`) |
| documents    | `devforge add documents`  | `src/core/documents/print.ts`, `src/core/export/download.ts`, `DocumentPreviewModal` (`.vue` / `.tsx`) |
| app-update   | `devforge add app-update` | `src/core/app-update/app-update.ts` |
| field-help   | `devforge add field-help` | `FieldHelp` (`.vue` / `.tsx`) |
| security     | `devforge add security`   | `src/core/security/escape-html.ts`, `safe-url.ts`, `sanitize-css.ts` |

> Every UI module installs both the Vue and the React adapter. Pass `--vue` or `--react` to install only one.
> Modules install their dependencies: `dates` ➔ `theme`, `select` · `pagination` ➔ `theme`, `formatters`, `flickerless` · `inputs` ➔ `formatters` · `batch` ➔ `overlays`, `formatters` · `authorizations` ➔ `theme`, `formatters`, `errors`, `feedback` · `notifications` ➔ `theme`, `formatters`, `flickerless`, `feedback` · `shells` ➔ `theme`, `flickerless` · `list-toolbar` ➔ `theme`, `formatters`, `flickerless`, `dates` · `list-cache` ➔ `list-states` · `pickers` ➔ `theme`, `overlays`, `list-states`, `errors`, `flickerless` · `command-palette` ➔ `theme`, `overlays`, `list-states`, `errors` · `documents` ➔ `theme`, `overlays`, `feedback`, `errors` · `field-help` ➔ `theme`.
> Components go to `src/shared/components/` (with their helpers `DfIcon.ts` (Vue) / `icons.tsx` + `usePopover.ts` (React) and `icon-paths.ts`); `useOverlay`, `useCachedList` and `useRecordSearch` go to `src/shared/composables/` (Vue) or `src/shared/hooks/` (React).
> Usage rules for the four UI modules: `.ai/standards/ui-components.md`.

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
| `formatDate` | `(date, style?: 'short' \| 'medium' \| 'long' \| 'datetime', locale?) => string` — in `formatConfig.timeZone` | `formatDate(iso, 'medium')` |
| `formatTime` | `(date, locale?) => string` — in `formatConfig.timeZone` | `'2026-10-06T01:00:00Z'` ➔ `9:00 p. m.` |
| `formatRelativeTime` | `(date, locale?) => string` | `hace 5 minutos` |
| `formatPhoneNumber` | `(phone, country?: string, display?: 'national' \| 'international') => string` | `8095781234` ➔ `(809) 578-1234` |
| `formatFallback` | `<T>(value: T, fallback?: string) => T \| string` | `null` ➔ `—` |
| `COUNTRY_PRESETS` | `Record<CountryCode, { name, locale, currency, dialCode, timeZone }>` | `COUNTRY_PRESETS.DO.currency` ➔ `'DOP'` |
| `formatConfig` | `{ defaultLocale, defaultCurrency, defaultCountry, phoneDisplay, fallbackString, timeZone }` | read-only in components; `timeZone` default `America/Santo_Domingo`, set by `setFormatCountry` |
| types | `CountryCode` (`'DO' \| 'US' \| 'PR' \| 'CO' \| 'MX' \| 'ES' \| 'CL' \| 'PE' \| 'AR'`), `PhoneDisplay`, `CountryPreset`, `FormatOptions` | |

- Phone masks exist for `DO`, `US`, `PR`, `CO`, `MX`, `ES`, `CL`, `PE`. `AR` has locale/currency but **no phone mask** (falls back to `+<digits>`).
- **Input masks** `@/core/formatters/input-masks` (for TYPING; `formatters.ts` is for DISPLAYING): `onlyDigits(value)`, `formatCedula` (`001-1234567-8`), `formatRnc` (`1-01-23456-7`), `formatTaxId` (RNC or cédula by length; letters ➔ untouched), `formatPhoneInput` (NANP `(809) 578-1234`), `INPUT_MASKS` / type `InputMask` (`'cedula' | 'rnc' | 'taxId' | 'phone'`), `parseAmount(text, locale?)` ➔ `number | null`, `sanitizeAmountInput(text, locale?, decimals = 2)`, `amountToEditable(value, locale?)`, `decimalSeparator(locale?)`.
- There is **no** `formatCompact`, passport validator or phone mask for typing outside NANP. If one is needed, ask the user.

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

**`tokens.css`** (Tailwind CSS **v4** syntax: `@import 'tailwindcss'`, `@custom-variant`, `@theme inline`). Defines these colors and nothing else: `background`, `foreground`, `surface`, `surface-raised`, `surface-hover`, `muted-foreground`, `dim-foreground`, `border`, `input`, `ring`, `primary`, `primary-hover`, `primary-foreground`, `primary-subtle`, `primary-border`, `success`, `warning`, `danger` (usable as `bg-*`, `text-*`, `border-*`, `ring-*`). Also: `shadow-popover`, radii `rounded-control` / `rounded-card` / `rounded-panel`, and the text scale `text-caption` (11px) / `text-small` (12px) / `text-body` (13px) / `text-title` (16px) / `text-display` (24px). For Tailwind v3 see `.ai/standards/theming.md` §7.

---

## 3. `auth` — `@/core/auth/auth-token`, `@/core/auth/silent-refresh-queue`

- `tokenStorage`: `getAccessToken()`, `setAccessToken(token)`, `getRefreshToken()`, `setRefreshToken(token)`, `setSession(accessToken, refreshToken?)`, `clearSession()`, `isTokenExpired(token?)`. Keys: `devforge_access_token`, `devforge_refresh_token` (localStorage).
- `refreshQueue` (instance of `SilentRefreshQueue`): `enqueue(): Promise<string>`, `getIsRefreshing()`, `setIsRefreshing(value)`, `resolveQueue(newToken)`, `rejectQueue(error)`.
- Vue store `@/modules/auth/stores/auth.store`: `createAuthStoreDefinition()` returns `{ user, isLoading, isAuthenticated, userRole, setUser, setSession, logout }`. Wrap it with Pinia: `defineStore('auth', createAuthStoreDefinition)`. Type: `UserProfile`.
- There is no React auth store; in React use `tokenStorage` + your state library (Zustand per the stack).

## 4. `errors` — `@/core/errors/api-error`

- `normalizeApiError(error: unknown, fallbackMessage?) => NormalizedError`
- `NormalizedError`: `{ message: string; status: number; fieldErrors: Record<string, string>; code?: string; details?: unknown; original: unknown }` — `details` is only kept when the response has a `code` (it carries e.g. the authorization challenge).

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

## 8. `flickerless` — `@/shared/flickerless/vue` · `@/shared/flickerless/react`

Copy of [github.com/LuisMTaveras/flickerless](https://github.com/LuisMTaveras/flickerless) (MIT). Replaces skeletons. CSS: `@import '../flickerless/flickerless.css'` once (bridged to the theme tokens).

- Vue: `FlickerlessSurface` (props `loading`, `empty`, `error`, `settled?`, `delayMs` = 180, `minDurationMs` = 250, `keepPreviousData` = true, `preserveHeight`, `query` (TanStack/Vue Query-like), `announceText`, `errorText` (= `'No se pudo cargar la información.'`, shown when there is no `error` slot; `''` turns it off); slots `default({ settled })`, `empty`, `error({ error })`, `skeleton` — do not use `skeleton`), `FlickerlessValue` (props `value`, `placeholder` = `'—'`, `unknownLabel`; default slot `({ value })`), `FlickerlessTableShell` (props `cols` (required), `rows` = 4, `rowClass`, `cellClass`), directive `vFlickerlessSaving` (register as `v-flickerless-saving`), `useFlickerless(options)` ➔ `{ isVisibleLoading, status, surfaceProps, bodyProps }`, `useFlickerlessQuery(query | () => query)` ➔ `{ loading, isEmpty, settled, error, … }`, `FLICKERLESS_SETTLED`.
- React: `FlickerlessSurface` (props: `FlickerlessOptions` + `query?` (TanStack Query / SWR result; explicit props win), `preserveHeight?`, `settled?`, `children` (node or `({ settled }) => node`), `emptyState`, `errorState`, `announceText`, `errorText`, `className`, `style`), `FlickerlessValue` (`value`, `children?: (value) => node`, `placeholder`, `unknownLabel`), `FlickerlessTableShell` (`cols`, `rows?`, `rowClassName?`, `cellClassName?`), `useFlickerless(options)`, `useFlickerlessQuery(query)` ➔ `{ loading, isInitialLoading, isRefetching, isEmpty, settled, error }`, `useSettled()`.
- Core (`@/shared/flickerless/core`): `isEmptyValue(data)` (a page `{ items | edges | nodes: [] }` is empty) and `readQueryState(query)`, the shared rule behind both adapters.
- Core `@/shared/flickerless/core`: `FlickerlessController`, types `FlickerlessOptions`, `FlickerlessStatus` (`'idle' | 'loading' | 'error' | 'empty'`).

## 9. `select` — `@/shared/components/SelectField.vue` · `@/shared/components/SelectField` (React)

- Props: `modelValue: string | number | null`, `options: (SelectOption | string | number)[]`, `label?`, `placeholder?` (= `'Seleccionar…'`), `compact?`, `disabled?`. Extra attributes (`id`, `aria-*`, `class`) go to the trigger.
- Emits: `update:modelValue`, `change`. Exposes `focus()`.
- Types (exported from the SFC): `SelectOption = { value, label, disabled?, group?, hint? }`, `SelectValue`.
- React (named export `SelectField`): props `value`, `onChange(value)`, `options`, `label?`, `placeholder?`, `compact?`, `disabled?`, plus any `<button>` attribute (`id`, `aria-*`, `className`). Exports `SelectOption`, `SelectValue`, `SelectFieldProps`. Internal helpers `usePopover`, `cx` (`usePopover.ts`) and `Icon` (`icons.tsx`, names `chevronDown | chevronLeft | chevronRight | check | close | calendar`).
- There is **no** search/filter-as-you-type, multi-select or async loading. Ask before adding them.

## 10. `dates` — `@/core/dates/date-range` + `DateField` + `DateRangeFilter` + `DatePicker`

- **Which one**: form field ➔ `DateField`; listing period filter ➔ `DateRangeFilter`; free range ➔ `DatePicker range`. Usage guide: `ui-components.md` §3.
- `DateField`: single date. Same props as `DatePicker` without `range` (`modelValue`/`value`, `label?`, `placeholder?`, `min?`, `max?`, `compact?`, `disabled?`, `clearable?` = true). Emits / returns a day key or `''`. Vue default export; React named export `DateField`.

- `DatePicker`: props `modelValue` (`'YYYY-MM-DD'`, `Date`, or `[from, to]` with `range`), `range?`, `label?`, `placeholder?`, `min?`, `max?` (day keys), `compact?`, `disabled?`, `clearable?` (= true). Emits `update:modelValue` / `change` with a day key or `string[]` (0, 1 or 2 keys). Exposes `focus()`.
- `DateRangeFilter`: props `modelValue: DateRange`, `allowAll?` (= true). Emits `update:modelValue` and `change` (only when usable).
- React (named exports `DatePicker`, `DateRangeFilter`): `DatePicker` takes `value` + `onChange` (`string` single, `string[]` with `range`) and the same other props; `DateRangeFilter` takes `value`, `onChange`, `onCommit?` (fires only when usable, like Vue's `change`), `allowAll?`.
- Core exports: `DayKey`, `RangePreset` (`'today' | 'yesterday' | 'week' | 'month' | 'quarter' | 'year' | 'custom' | 'all'`), `DateRange` (`{ preset, from, to }`), `CalendarCell`, `dateConfig`, `setDateTimeZone(tz)`, `todayKey(tz?)`, `dayKeyOf(date, tz?)`, `toDayKey(value)`, `isDayKey(value)`, `shiftDayKey(key, days)`, `formatDayKey(key, fallback = '—')` (➔ `05/10/2026`), `parseYearMonth(key)`, `buildCalendar(year, month0, { min?, max? })`, `makeRange(preset, current?)`, `defaultRange(preset = 'today')`, `resolveRange(range)` (➔ `{ from?, to? }`), `isSingleDay`, `stepRangeDay(range, delta)`, `normalizeRange`, `rangeLabel`, `RANGE_OPTIONS`, `MONTH_NAMES`, `MONTH_NAMES_SHORT`, `WEEK_DAYS`.
- Default time zone: `America/Santo_Domingo`. There is no time picker.

## 11. `pagination` — `@/core/pagination/pagination` + `ListPager.vue`

- `ListPager`: props `page`, `pageSize`, `total?` (`undefined` until the first response ➔ `—`), `hasMore?`, `singular?` (= `'registro'`), `plural?` (= `'registros'`); emits `update:page` (use `v-model:page`); slot `note`.
- React (named export `ListPager`): `page`, `onPageChange(page)`, `pageSize`, `total?`, `hasMore?`, `singular?`, `plural?`, `note?: ReactNode`.
- Core: `PageMeta` (`{ page, pageSize, total, hasMore? }`), `PageState`, `totalPages(total, pageSize)`, `pageState(meta)` ➔ `{ page, pages, hasPrev, hasNext, from, to }`, `pageSummary(meta, { singular?, plural?, format? })` ➔ `'Mostrando 11–20 de 57 facturas'`.
- There is no page-size selector and no numbered page list.

## 12. `feedback` — `@/core/feedback/dialog` · `@/core/feedback/toast`

- Dialog: `alertDialog(title, message?, type? = 'info')` ➔ `Promise<void>`; `confirmDialog(title, message?, confirmText? = 'Confirmar', { cancelText?, tone? })` ➔ `Promise<boolean>`; `promptDialog(title, message?, defaultValue?, { placeholder?, confirmText? = 'Enviar', cancelText?, required?, multiline?, tone? })` ➔ `Promise<string | null>`. Types `DialogType` (`'info' | 'success' | 'warning' | 'error' | 'confirm' | 'prompt'`), `DialogTone` (`'neutral' | 'danger'`), `DialogState`. Internals used by the component: `getDialogState`, `subscribeDialog`, `acceptDialog`, `cancelDialog`, `setDialogInput`, `isLongDialogMessage`.
- Opening a dialog while another is open cancels the previous one (its promise resolves `false` / `null`).
- Toast: `notify(message, type? = 'success', durationMs?)` ➔ id; `dismissToast(id)`; `getToasts`, `subscribeToasts`. Types `ToastType` (`'success' | 'error' | 'info' | 'warning'`), `Toast`. Max 4 visible.
- Components (no props): `<ConfirmDialog />`, `<ToastHost />` — once in the app root. Vue: default export of the `.vue`; React: named exports `ConfirmDialog`, `ToastHost`.

## 13. `overlays` — `@/core/overlay/*` + `ModalShell` · `DrawerShell` · `RowMenu`

- Core: `pushEscapeLayer(onEscape)` ➔ release fn; `escapeLayerCount()`; `lockScroll()` ➔ release fn; `scrollLockCount()`; `menuPosition(anchorRect, { width?, entries?, entryHeight?, viewport? })` ➔ `{ left, top, width, opensAbove }`.
- `useOverlay(active, onEscape, { lockScroll? = true })` — Vue (`active`: ref/getter/boolean) and React (`active`: boolean).
- `ModalShell`: Vue props `open`, `title`, `subtitle?`, `size?` (`'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl'`, default `'lg'`), `bodyClass?`; emits `close`; slots `default`, `subtitle`, `footer`. React: `open`, `title`, `subtitle?`, `onClose`, `size?`, `bodyClassName?`, `footer?`, `children`.
- `DrawerShell`: same as ModalShell with `size?` (`'md' | 'lg' | 'xl' | '2xl' | '3xl'`, default `'2xl'`); Vue slots also `title`, `actions`; React `actions?`.
- `RowMenu`: props `actions: RowAction[]`, `label?` (= `'Acciones'`); Vue emits `select(id)`, React `onSelect(id)`. `RowAction = { id, label, icon?: IconName, tone?: 'neutral' | 'danger', disabled?: boolean | string, separatorBefore? }`.
- `IconName` (from `icon-paths.ts`): `chevronDown | chevronLeft | chevronRight | check | close | calendar | info | success | warning | error | help | edit | refresh | ellipsis | inbox | clock | minus`. There are no other icons.

## 14. `list-states` — `EmptyState` · `ListStaleNotice`

- `EmptyState`: props `title`, `text?`, `icon?: IconName` (= `'inbox'`); default slot / `children` = actions. Vue also slot `icon`; React `icon` may be a node.
- `ListStaleNotice`: props `message?` (= `'Hay cambios nuevos en esta lista.'`), `actionText?` (= `'Actualizar lista'`); Vue emits `refresh`, React `onRefresh`.

## 15. `inputs` — `MoneyInput` · `MaskedInput`

- `MoneyInput`: Vue `v-model` / React `value` + `onChange` with `number | null`; props `currency?` (default `formatConfig.defaultCurrency`), `label?`, `placeholder?`, `decimals?` (= 2), `disabled?`, `invalid?`, `compact?`.
- `MaskedInput`: `v-model` / `value` + `onChange` with the **formatted** `string`; props `mask: InputMask` (required), `label?`, `placeholder?`, `disabled?`, `invalid?`, `compact?`. Extra attributes go to the `<input>`.

## 16. `batch` — `@/core/batch/batch-progress` + `BatchProgressModal`

- `createBatchTracker()` ➔ `{ getState, subscribe, run, track, apply, close, reopen }`.
  - `run({ title, items: { id, label, sublabel? }[], worker(item, index) })` ➔ `Promise<BatchState>`; worker throws ➔ `FAILED` (detail = error message), returns `{ status: 'SKIPPED' | 'FAILED' | 'DONE', detail? }` ➔ that outcome, anything else ➔ `DONE`.
  - `track({ title, items, request(progressKey), settle?(result) ➔ BatchOutcome[] })` ➔ `Promise<result | null>`; `apply(event: BatchEvent)` for server progress events.
- Types: `BatchState`, `BatchItem`, `BatchItemStatus` (`'PENDING' | 'RUNNING' | 'DONE' | 'SKIPPED' | 'FAILED'`), `BatchOutcome`, `BatchEvent`, `BatchTracker`. Helpers `recountBatch`, `batchSummary(state, format?)`, `batchCountLabel(n, 'done' | 'skipped', format?)`.
- `BatchProgressModal`: prop `tracker: BatchTracker`.

## 17. `authorizations` — `@/core/authorizations/authorization`

- Setup: `configureAuthorizations({ transport?, currentUserEmail?, pollMs? = 15000 })`; `createFetchTransport({ baseUrl? = '/api/authorizations', headers?, credentials? = 'include' })` ➔ `AuthorizationTransport` (`challenge`, `requestRemote`, `collectGrant`, `cancelRequest`, `cancelAttempt`, `decide(id, 'APPROVED' | 'REJECTED', note?)`); `AuthorizationTransportError` (`message`, `status`, `code?`).
- Interceptor: `installAuthorizationInterceptor(axiosLikeInstance, { onInvalid? })` ➔ interceptor id; `withAuthorization(send: (headers) => Promise<T>)` ➔ `Promise<T>` (retries once); `isAuthorizationChallenge(error)`, `readApiError(error)` ➔ `{ status?, code?, details?, message? }`.
- Constants: `AUTHORIZATION_GRANT_HEADER` (`'X-Authorization-Grant'`), `AUTHORIZATION_REQUIRED`, `AUTHORIZATION_INVALID`.
- Challenge store (used by the dialog): `requestAuthorization(challenge)` ➔ `Promise<AuthorizationOutcome>` (one at a time), `grantAuthorization(grant)`, `cancelAuthorization()`, `getAuthorizationState()`, `subscribeAuthorization(fn)`.
- Remote decision: `notifyAuthorizationResolved({ requestId, status, decidedBy? })` (feed it the socket), `onAuthorizationResolved(fn)`.
- Live cards: `pushAuthorizationAlert(alert, { currentUserId? })`, `closeAuthorizationAlert(id)`, `dismissAuthorizationAlert(id)` (remembered for the session), `pruneAuthorizationAlerts()`, `getAuthorizationAlerts()`, `subscribeAuthorizationAlerts(fn)`, `timeLeftLabel(expiresAt, now?)` ➔ `'4:12'` | `null`, `AUTHORIZATION_ALERTS_VISIBLE` (3).
- Types: `AuthorizationChallenge` (shape in blueprint 08 §6), `AuthorizationOutcome`, `AuthorizationAlert` (`{ requestId, actionName, requestedBy, amount?, currency?, note?, expiresAt, requestedById? }`), `AuthorizationResolvedEvent`, `AuthorizationSeverity`, `RequestStatus`.
- Components (no props, once in the root): `<AuthorizationDialog />`, `<AuthorizationAlerts />`. Vue default export; React named exports.
- There are **no** inbox, policy or authorizer screens: build them from blueprint 08 §7 when the backend exists.

## 18. `notifications` — `@/core/notifications/notifications`

- Setup: `configureNotifications({ transport?, pageSize? = 20, rootPrefix? = '' })`; `createNotificationFetchTransport({ baseUrl? = '/api/notifications', headers?, credentials? })` ➔ `NotificationTransport` (`list`, `summary`, `markRead`, `markUnread`, `markAllRead(type?)`, `remove`, `clearRead`).
- Store: `loadNotifications({ more? })`, `refreshNotificationSummary()`, `setNotificationFilter({ status?, type? })`, `toggleNotificationRead(id)`, `markNotificationRead(id)`, `markAllNotificationsRead()`, `removeNotification(id)`, `clearReadNotifications()`, `receiveNotification(raw)` (socket), `resetNotifications()` (logout), `getNotificationState()`, `subscribeNotifications(fn)`.
- Helpers: `toNotification(raw)`, `notificationKind(type)` ➔ `{ type, label, tone, icon }` (unknown ➔ generic), `registerNotificationKinds(kinds)`, `notificationKindOrder()`, `groupNotificationsByDay(items, now?)` ➔ `{ key, label, items }[]`, `resolveNotificationLink(link, rootPrefix?)`.
- Desktop: `desktopNotificationPermission()` ➔ `'unsupported' | 'default' | 'granted' | 'denied'`, `enableDesktopNotifications()` (from a click only), `showDesktopNotification(n, { onClick? })` (only when the tab is hidden).
- Types: `AppNotification` (`{ id, title, body, type, link, createdAt, isRead }`), `NotificationSummary`, `NotificationState`, `NotificationKind`, `NotificationTone` (`'neutral' | 'accent' | 'success' | 'warning' | 'danger'`), `NotificationStatusFilter`, `DesktopPermission`.
- Component: `<NotificationCenter />` — Vue emits `navigate(link)`; React prop `onNavigate(link)`.
- Default categories: `INFO`, `SYSTEM`, `AUTHORIZATION`, `PAYMENT`, `DUE`, `TASK`.

## 19. `shells` — `CardShell` · `DetailShell` · `TableStates`

- `CardShell`: props `count?` (= 6), `lines?` (= 2), `media?`, `footer?`, `cardClass?` (React `cardClassName?`). Renders the REAL cards with `—`; place it inside the grid only when there is nothing to keep.
- `DetailShell`: props `cols?` (= 5), `rows?` (= 6), `cards?` (= 3, `0` = none), `announceText?`. First load of a detail screen only.
- `TableStates`: inside `<tbody>`, before the rows. Props `cols` (required), `loading?`, `error?` (message for the user; empty = no error), `empty?`, `settled?` (default: read from the surrounding `FlickerlessSurface`), `icon?: IconName` (= `'inbox'`), `emptyTitle?` (= `'Sin resultados'`), `emptyHint?`, `errorTitle?`, `retryText?` (= `'Reintentar'`), `shellRows?` (= 4), `cellClass?` (React `cellClassName?`). Vue emits `retry`; React `onRetry`. Default slot / `children` = action of the empty state. Order: cold load ➔ shell; error ➔ message + retry; empty without an answer ➔ shell; empty ➔ empty state.

## 20. `list-toolbar` — `ListToolbar` · `ListTabs` · `SearchInput` · `HistoryPeriodFilter`

- `ListToolbar`: Vue slots `tabs`, `actions`, `search`, `period`, `scope`, `more`, `trailing`; React props with the same names (`ReactNode`).
- `ListTabs`: Vue `v-model` (tab id) + emits `change`; React `value`, `onChange(id)`. Props `tabs: ListTab[]` (`{ id, label, count?: number | null }` — `null` = `—`, absent = no badge), `label?` (= `'Estados'`). ←/→ move.
- `SearchInput`: Vue `v-model` + emits `search(q)` (after `debounceMs`, Enter or clear); React `value`, `onChange`, `onSearch?`. Props `placeholder?` (= `'Buscar…'`), `ariaLabel?`, `clearLabel?`, `debounceMs?` (= 300). Exposes `focus()` (Vue `defineExpose`, React `ref`).
- `HistoryPeriodFilter`: Vue `v-model: DateRange` + `change`; React `value`, `onChange`, `onCommit?`. Props `pending?` (no range; says why), `pendingLabel?`, `allowAll?`.

## 21. `list-cache` — `@/core/list-cache/*` + `useCachedList`

- `document-changes`: `recordDocumentChange(resource, id, snapshot)` (detail screen, after reloading), `markListShifted(resource)` (created / deleted), `drainDocumentChanges(resource)` ➔ `{ id, snapshot }[]` (consumes), `takeListShifted(resource)` ➔ `boolean` (consumes), `patchRows(rows, changes)` ➔ patched count (copies only keys the row already has), type `DocumentSnapshot`.
- `tab-cache`: `createTabCache<T>({ max? = 12 })` ➔ `{ recall(params), remember(params, data) (clears), add(params, data), clear(), size }`; `tabCacheKey(params)`.
- Vue `useCachedList({ resource, rows: Ref<T[]>, reload, bind?, unbind?, onChange? })` ➔ `{ listStale: Ref<boolean>, refresh() }` — runs on `onActivated` (`<KeepAlive>`, match by component NAME).
- React `useCachedList({ resource, setRows(update), reload, onChange? })` ➔ `{ listStale, refresh }` — runs when the list mounts again.

## 22. `excel` — `@/core/export/excel-report` · `@/core/export/download`

- `downloadExcelReport(req)` ➔ `Promise<void>` (downloads `<fileName>.xlsx`; errors bubble up for `normalizeApiError`). `req`: `{ title, fileName (no extension), sheetName?, filters?: [label, value | null][], columns: ExcelReportColumn<T>[], rows: T[] }`.
- `ExcelReportColumn<T>`: `{ header, value(row), type?: 'text' | 'integer' | 'number' | 'money' | 'percent' | 'date' | 'datetime', width?, total?, currency?(row) }`.
- `configureExcelReports({ endpoint? = '/api/reports/excel', transport?: { post(url, payload) ➔ Promise<Blob> } })` — pass your HTTP client so the session travels.
- Pure helpers: `buildExcelReportPayload(req)` ➔ `ExcelReportPayload` (the server contract, blueprint 10), `toExcelCell(value, type)`.
- `downloadBlob(blob, fileName)`, `readBlobError(data)` ➔ server message of an error that arrived as a Blob.

## 23. `pickers` and `command-palette` — `@/core/search/*`

- `createRecordSearch<T>({ fetch(q, { page, pageSize, signal }) ➔ Promise<{ items, total?, hasMore? }>, pageSize? = 20, debounceMs? = 200, minChars? = 0, toMessage?(error) })` ➔ `{ getState, subscribe, setQuery, flush, loadMore, reset, destroy }`. State: `{ query, items, total, hasMore, page, loading, stale, settled, error }`.
- `useRecordSearch(options)` ➔ Vue `{ state: Ref<RecordSearchState>, setQuery, flush, loadMore, reset }`; React `{ state, … }`.
- `RecordPickerModal`: props `open`, `title`, `subtitle?`, `placeholder?`, `fetch`, `getKey(item)`, `getLabel?(item)`, `getHint?(item)`, `selectedKey?`, `emptyTitle?`, `emptyText?`, `pageSize?`. Vue emits `select(item)`, `close`; slots `row({ item, active })`, `empty`, `footer`. React `onSelect`, `onClose`, `renderRow?`, `emptyAction?`, `footer?`.
- `nav-search`: `scoreEntry(entry, query)` ➔ `{ score, ranges } | null`, `rankEntries(entries, query)`, `fold(s)`, `queryRanges(text, query)`, `highlightSegments(label, ranges)` ➔ `{ text, hit }[]`, `isPaletteShortcut(keyboardEvent)` (⌘K / Ctrl+K). Type `SearchableEntry` (`{ label, trail: string[], keywords? }`).
- `CommandPalette`: props `open`, `screens: PaletteScreen[]` (`SearchableEntry & { to }`), `fetchRecords?(q, ctx)` ➔ `{ items: PaletteRecord[] }` (`{ id, label, hint?, group, to }`), `placeholder?`, `minChars?` (= 2), `maxScreens?` (= 8). Vue emits `navigate(to)`, `close`; React `onNavigate`, `onClose`.

## 24. `documents` — `@/core/documents/print`

- `openPdfInNewTab(load: () ➔ Promise<Blob>, loadingText?)` ➔ `{ ok, reason?: 'POPUP_BLOCKED' | 'REQUEST_FAILED', message? }` (opens the tab BEFORE awaiting).
- `printFrame(iframe)` ➔ `boolean`; type `PreviewDocument` = `{ kind: 'html', html } | { kind: 'pdf', blob }`.
- `DocumentPreviewModal`: props `open`, `title`, `subtitle?`, `fileName?` (= `'documento'`), `loadingText?`, `load: () ➔ Promise<PreviewDocument>`. Vue emits `close`; React `onClose`. HTML renders in a sandboxed iframe without scripts.

## 25. `app-update`, `field-help`, `security`

- `installAppUpdates({ notify?(message), registerServiceWorker?(hooks) })` (once), `reloadIfUpdateReady(href)` ➔ `boolean` (router `beforeEach`), `recoverFromStaleChunk(href)` (router error / lazy route error), `isChunkLoadError(err)`, `markUpdateReady()`.
- `FieldHelp`: props `label`, `text?`; default slot / `children` for rich content.
- `escapeHtml(value)` ➔ `string`; `safeLinkUrl(raw, { allowedPaths? = ['/uploads/'], ownOrigins? })` ➔ `string | null`; `sanitizeTenantCss(raw)` ➔ `string`.

## 26. `devforge audit`

- Rules: hardcoded data, neon palette, Spanglish, single-theme colors, unformatted phone / currency, skeletons, native `<select>` / date inputs, `window|globalThis|self.alert/confirm/prompt`, hardcoded currency (`currency: 'DOP'`, `=== 'DOP'`), `@ts-nocheck`, `toLocaleDateString` / `toLocaleTimeString` / `timeZone: 'UTC'`, backdrop-click closing (`@click.self`), **exception permissions** (`'x:override_*'`, `canOverride*`, `bypassLimit`…), **hand-made supervisor passwords**, **flattened errors** (`sendError(res, err.message)`, `.json({ error: err.message })`), **browser notifications** (`new Notification`, `Notification.requestPermission`, `showNotification` outside the service worker), **hand-rolled exports** (`XLSX.writeFile`, `json_to_sheet`, a `text/csv` Blob outside `core/export`), **raw HTML** (`v-html`, `dangerouslySetInnerHTML`, `.innerHTML =` without `// safe-html: <reason>`), `@ts-ignore` and explicit `any` (without `// any: <reason>`).
- Kotlin (`.kt`): hardcoded colors (`Color(0xFF…)`, `Color.White`…), skeletons / `shimmer` / `CircularProgressIndicator`, `AlertDialog` / `Dialog` / `ModalBottomSheet` / `Toast.makeText` / `SnackbarHost` in a screen, Material / Android `DatePicker`, `ExposedDropdownMenuBox`, `Spinner`, `dismissOnClickOutside = true`, hand formatting (`SimpleDateFormat`, `DateTimeFormatter.ofPattern`, `NumberFormat.get…Instance`, `"%.2f"`), phone time zone (`ZoneId.systemDefault()`, `TimeZone.getDefault()`, `ZoneOffset.UTC`, `LocalDate.now()`), `currency = "DOP"`, English UI strings (`Text("Save")`), raw `e.message`, `openUri` / `ACTION_VIEW` without `safeLinkUrl`, `listOf(Cliente("…"))` records in code, plus exception permissions and supervisor passwords. The files installed by `--compose` are the single gate and are exempt.
- Exit code `1` when there are (new) violations, so CI can block them.
- `devforge audit --baseline` writes `.devforge-audit-baseline.json` (known debt per file and rule). Later runs fail only on NEW violations and lower the baseline automatically when something is fixed. It can only shrink; never edit it upwards.

## 27. Kotlin / Jetpack Compose (Android) — `devforge add <module…> --compose`

The same modules for an Android app in Kotlin + Jetpack Compose (Material 3). Rules of use: `.ai/standards/compose.md`.

- Install: `devforge add formatters theme errors feedback overlays flickerless list-states --compose`. The package is the Android module's `namespace` (`app/build.gradle.kts`) or `--package com.empresa.app`; files land in `app/src/main/java/<package>/…` (or `app/src/main/kotlin` if it exists; `--module`, `--source-dir` to change it). Imports use the app package: `import com.empresa.app.core.formatters.formatCurrency`.
- Modules with a Compose version: `formatters`, `theme`, `errors`, `rbac`, `flickerless`, `select`, `overlays`, `dates`, `pagination`, `feedback`, `list-states`, `shells`, `inputs`, `batch`, `list-toolbar`, `list-cache`, `pickers`, `field-help`, `security`. **Not ported** (the CLI refuses with exit code 1): `auth`, `export`, `url-sync`, `authorizations`, `notifications`, `excel`, `command-palette`, `documents`, `app-update`. Do not write them from memory: tell the user.
- Requires: `minSdk 26` (or core library desugaring) for `java.time`; `kotlinx-coroutines-core` (`theme`, `feedback`, `batch`, `pickers`) and `kotlinx-serialization-json` (`errors`, runtime only, no plugin). Use the versions of the project's `libs.versions.toml`.

| Module | Files (under `<package>/`) | Public API |
| --- | --- | --- |
| formatters | `core/formatters/Formatters.kt`, `InputMasks.kt` | see below |
| theme | `core/theme/ThemeEngine.kt`, `SharedPreferencesThemeStore.kt`, `ui/theme/DevforgeTheme.kt`, `ui/components/DfIcon.kt`, `Controls.kt`, `ThemeSelector.kt` | see below |
| errors | `core/errors/ApiError.kt` | `normalizeApiError(status: Int, body: String?, fallbackMessage?, original?)`, `normalizeApiError(error: Throwable?, fallbackMessage?)` ➔ `NormalizedError(message, status, fieldErrors: Map<String, String>, code: String?, details: JsonElement?, original)`; `ApiHttpException(status, body, message?)`; `DEFAULT_ERROR_MESSAGE` |
| rbac | `core/permissions/Ability.kt`, `ui/components/Can.kt` | `enum Action { CREATE, READ, UPDATE, DELETE, MANAGE }`, `Rule<U, D>(actions: Set<Action>, subject, conditions?: (D, U) -> Boolean)`, `Ability<U>(user?, rules)` with `.can(action, subject, data?)`, `.cannot(…)`, `.updateRules(rules)`, `.user`; `@Composable Can(ability, action, subject, data?, otherwise?) { … }` |
| flickerless | `ui/flickerless/Flickerless.kt` | `FlickerlessSurface(loading, modifier?, empty?, error: String?, settled?, onRetry?, delayMs? = 180, minDurationMs? = 250, keepPreviousData? = true, announceText?, errorText?, emptyContent?, errorContent?) { … }`, `FlickerlessValue(value: String?, modifier?, style?, placeholder? = "—", unknownLabel?)`, `FlickerlessValue(value: T?) { v -> … }`, `FlickerlessListShell(rows? = 4, cells? = 2)`, `FlickerlessStream(visible)`, `FlickerlessError(message, onRetry?, modifier?, title?, retryText?)`, `rememberFlickerlessLoading(loading, delayMs?, minDurationMs?)` ➔ `Boolean`, `LocalFlickerlessSettled` |
| select | `ui/components/SelectField.kt` | `SelectField(value: T?, onValueChange: (T) -> Unit, options: List<SelectOption<T>>, modifier?, label?, placeholder? = "Seleccionar…", compact?, enabled?, borderless?)`; `SelectOption(value, label, disabled? = false, group?, hint?)` |
| overlays | `ui/components/Overlays.kt` | `ModalShell(open, title, onClose, modifier?, subtitle?, size: ModalSize = LG, scrollable? = true, padded? = true, footer?: RowScope.() -> Unit) { … }` (`ModalSize`: `SM`, `MD`, `LG`, `XL`, `XXL`, `X4L`, `X6L`); `DrawerShell(open, title, onClose, modifier?, subtitle?, size: DrawerSize = XXL, scrollable?, padded?, actions?, footer?) { … }`; `RowMenu(actions: List<RowAction>, onSelect: (id) -> Unit, modifier?, label? = "Acciones")`, `RowAction(id, label, icon?: DfIconName, danger? = false, disabledReason?: String, disabled? = disabledReason != null, separatorBefore? = false)`; `DfDivider()` |
| dates | `core/dates/DateRange.kt`, `ui/components/Dates.kt` | see below |
| pagination | `core/pagination/Pagination.kt`, `ui/components/ListPager.kt` | `PageMeta(page, pageSize, total, hasMore?)`, `pageState(meta)` ➔ `PageState(page, pages, hasPrev, hasNext, from, to)`, `totalPages(total, pageSize)`, `pageSummary(meta, singular?, plural?, format?)`; `ListPager(page, pageSize, total: Int?, onPageChange, modifier?, hasMore?, singular? = "registro", plural? = "registros")` |
| feedback | `core/feedback/Dialog.kt`, `Toast.kt`, `ui/components/Feedback.kt` (+ `Overlays.kt`) | `suspend alertDialog(title, message?, type: DialogType = INFO)`, `suspend confirmDialog(title, message?, confirmText? = "Confirmar", cancelText? = "Cancelar", tone: DialogTone = NEUTRAL)` ➔ `Boolean`, `suspend promptDialog(title, message?, defaultValue?, placeholder?, confirmText? = "Enviar", cancelText?, required?, multiline?, tone?)` ➔ `String?`; `DialogCenter` (`state`, `accept()`, `cancel()`, `setInput(v)`), `isLongDialogMessage(m)`; `notify(message, type: ToastType = SUCCESS, durationMs? = type.defaultDurationMs)` ➔ id, `dismissToast(id)`, `ToastCenter.toasts`; `@Composable ConfirmDialogHost()`, `@Composable BoxScope.ToastHost(modifier?)` (once, in the root `Box`) |
| list-states | `ui/components/ListStates.kt` | `EmptyState(title, text?, modifier?, icon? = INBOX, actions?)`, `ListStaleNotice(onRefresh, modifier?, message?, actionText?)`, `ListStates(loading, error: String?, empty, modifier?, onRetry?, settled?, icon?, emptyTitle? = "Sin resultados", emptyHint?, errorTitle?, retryText?, shellRows?, shellCells?, emptyActions?)` |
| shells | `ui/components/ListStates.kt` | `CardShell(modifier?, count? = 6, lines? = 2, media?, footer?, cardModifier?)`, `DetailShell(modifier?, cards? = 3, rows? = 6, cells? = 3, announceText?)` |
| inputs | `ui/components/Inputs.kt` | `MoneyInput(value: BigDecimal?, onValueChange: (BigDecimal?) -> Unit, modifier?, currency?, label?, placeholder? = "0.00", decimals? = 2, enabled?, invalid?, compact?, supportingText?)`, `MaskedInput(value: String, onValueChange: (String) -> Unit, mask: InputMask, modifier?, label?, placeholder? = mask.placeholder, enabled?, invalid?, compact?, supportingText?)` |
| batch | `core/batch/BatchProgress.kt`, `ui/components/BatchProgressModal.kt` | `BatchTracker(toMessage?)` with `state: StateFlow<BatchState>`, `suspend run(title, items: List<BatchItemInput>, worker: suspend (item, index) -> BatchResult?)` (null = done, throw = failed, `BatchResult.skipped("…")`), `suspend track(title, items, request: suspend (progressKey) -> T, settle?: (T) -> List<BatchOutcome>)` ➔ `T?`, `apply(event: BatchEvent)`, `close()`, `reopen()`; `batchSummary(state, format?)`, `batchCountLabel(n, skipped, format?)`; `@Composable BatchProgressModal(tracker)` |
| list-toolbar | `ui/components/ListToolbar.kt`, `SearchInput.kt` (+ `Dates.kt`) | `ListToolbar(modifier?, tabs?, actions?, search?, period?, scope?, more?, trailing?)`, `ListTabs(selected, tabs: List<ListTab>, onSelect, modifier?, label? = "Estados")`, `ListTab(id, label, count: Int? = null, hasCount? = true)`, `SearchInput(value, onValueChange, modifier?, onSearch?, placeholder? = "Buscar…", clearLabel?, debounceMs? = 300, focusRequester?)`, `HistoryPeriodFilter` (in `dates`) |
| list-cache | `core/listcache/DocumentChanges.kt`, `TabCache.kt` | `DocumentChanges.record(resource, id, snapshot)`, `.markListShifted(resource)`, `.drain<S>(resource)` ➔ `List<DocumentChange<S>>`, `.takeListShifted(resource)` ➔ `Boolean`; `List<T>.patchRows(changes, id = { … }) { row, snapshot -> row.copy(…) }`; `TabCache<T>(max? = 12)` with `recall(params)`, `remember(params, data)`, `add(params, data)`, `clear()`, `size`; `tabCacheKey(params)` |
| pickers | `core/search/RecordSearch.kt`, `ui/components/SearchInput.kt`, `RecordPickerModal.kt` | `RecordSearch<T>(scope, fetch: suspend (query, page, pageSize) -> RecordPage<T>, pageSize? = 20, debounceMs? = 200, minChars? = 0, toMessage?)` with `state: StateFlow<RecordSearchState<T>>` (`query, items, total, hasMore, page, loading, stale, settled, error`), `setQuery(q)`, `flush()`, `loadMore()`, `reset()`; `RecordPage(items, total?, hasMore?)`; `@Composable rememberRecordSearch(fetch, pageSize?, debounceMs?, minChars?)`; `RecordPickerModal(open, title, fetch, key: (T) -> String, onSelect, onClose, modifier?, subtitle?, placeholder?, label?, hint?, selectedKey?, emptyTitle?, emptyText?, pageSize?, row?, footer?)` |
| field-help | `ui/components/FieldHelp.kt` | `FieldHelp(text, modifier?, title?, label? = "Ayuda")` |
| security | `core/security/SafeUrl.kt` | `safeLinkUrl(raw: String?, baseUrl?, allowedPaths? = listOf("/uploads/"), ownOrigins?)` ➔ `String?` (`escapeHtml` / `sanitizeTenantCss` are web-only) |

**formatters (Kotlin)**: `setFormatCountry(CountryCode.DO, overrides?: FormatConfig.() -> FormatConfig)` (once, in `Application.onCreate()`), `setFormatDefaults(FormatConfig)`, `formatConfig`, `COUNTRY_PRESETS`; `formatNumber(value: Number?, locale?, minimumFractionDigits? = 0, maximumFractionDigits? = 2)`, `formatPercent(value: Number?, locale?, fractionDigits? = 1, isRatio? = true)`, `formatCurrency(amount: Number?, currency?, locale?, minimumFractionDigits? = 2)`, `currencySymbol(currency?, locale?)`, `formatDate(value: TemporalAccessor? | String?, style: DateStyle = MEDIUM, locale?)` (`DateStyle`: `SHORT`, `MEDIUM`, `LONG`, `DATETIME`), `formatTime(value: TemporalAccessor? | String?, locale?)`, `formatRelativeTime(value: TemporalAccessor? | String?, now? = Instant.now(), locale?)`, `formatPhoneNumber(phone: String?, country: CountryCode = default, display: PhoneDisplay = NATIONAL)`, `formatFallback(value: Any?, fallback? = "—")`, `parseIsoDateTime(value)`, `toBusinessDateTime(value)`. Input masks: `onlyDigits(v)`, `formatCedula(v)`, `formatRnc(v)`, `formatTaxId(v)`, `formatPhoneInput(v)`, `enum InputMask { CEDULA, RNC, TAX_ID, PHONE }` (`.format(v)`, `.placeholder`), `parseAmount(text, locale?)` ➔ `BigDecimal?`, `sanitizeAmountInput(text, locale?, decimals? = 2)`, `amountToEditable(value: BigDecimal?, locale?)`, `decimalSeparator(locale?)`. Money is `BigDecimal`, never `Double`.

**theme (Kotlin)**: `ThemeEngine.init(store)` (once, in `Application.onCreate()`, with `SharedPreferencesThemeStore(context)`), `ThemeEngine.preference: StateFlow<ThemePreference>`, `ThemeEngine.setPreference(p)`, `ThemeEngine.cycle()`; `enum ThemePreference { LIGHT("Claro"), DARK("Oscuro"), SYSTEM("Sistema") }` (`.label`); `resolveTheme(preference, systemDark)`; `InMemoryThemeStore` (previews/tests). Compose: `DevforgeTheme(preference? = null) { … }` (root), tokens `DevforgeTheme.colors.{background, foreground, surface, surfaceRaised, surfaceHover, mutedForeground, dimForeground, border, input, ring, primary, primaryHover, primaryForeground, primarySubtle, primaryBorder, success, warning, danger, dangerForeground, overlay, isDark}`, `DevforgeTheme.type.{caption, small, body, title, display, label}`, `DevforgeTheme.shapes.{control, card, panel, pill}`; `ThemeSelector()` (Claro / Oscuro / Sistema); `DfIcon(name: DfIconName, modifier?, size? = 20.dp, tint?, contentDescription?)`; `DfButton(text, onClick, modifier?, variant: DfButtonVariant = PRIMARY, icon?, enabled?, pending?, pendingText?, compact?)` (`PRIMARY`, `SECONDARY`, `GHOST`, `DANGER`); `DfIconButton(icon, label, onClick, modifier?, enabled?, size?, tint?, selected?)`; `DfBadge(text, tone: DfTone = NEUTRAL)` (`NEUTRAL`, `SUCCESS`, `WARNING`, `DANGER`); `toneColors(tone)`; `FieldLabel(text)`; `FieldFrame(…)`.

**dates (Kotlin)**: `typealias DayKey = String` (`yyyy-MM-dd`, `""` empty); `enum RangePreset { TODAY, YESTERDAY, WEEK, MONTH, QUARTER, YEAR, CUSTOM, ALL }` (`.label`); `DateRange(preset, from, to)`; `setDateTimeZone("America/Santo_Domingo")`, `DateConfig.{timeZone, clock}`; `todayKey()`, `dayKeyOf(instant | LocalDate)`, `toDayKey(value)`, `isDayKey(v)`, `shiftDayKey(key, days)`, `formatDayKey(key, fallback? = "—")` (`05/10/2026`), `parseYearMonth(key)`, `buildCalendar(year, month0, min?, max?)` ➔ `List<CalendarCell>`, `makeRange(preset, current?)`, `defaultRange(preset? = TODAY)`, `resolveRange(range)` ➔ `RangeParams(from?, to?)`, `isSingleDay(range)`, `stepRangeDay(range, delta)`, `normalizeRange(range)`, `rangeLabel(range)`, `MONTH_NAMES`, `MONTH_NAMES_SHORT`, `WEEK_DAYS`. Compose: `DateField(value: DayKey, onValueChange, modifier?, label?, placeholder? = "dd/mm/aaaa", min?, max?, compact?, enabled?, clearable? = true)`, `DateRangeField(from, to, onRangeChange: (from, to) -> Unit, modifier?, label?, placeholder?, min?, max?, compact?, enabled?)`, `DatePickerPanel(selection: Pair<DayKey, DayKey>, onPick, modifier?, range?, min?, max?)`, `DateRangeFilter(value: DateRange, onValueChange, modifier?, onChange?, allowAll? = true)`, `HistoryPeriodFilter(value, onValueChange, pending, modifier?, onChange?, pendingLabel?, allowAll?)`, `DateRangeSaver` (for `rememberSaveable`).
