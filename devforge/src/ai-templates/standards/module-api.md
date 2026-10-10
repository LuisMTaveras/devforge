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
| formatters   | `devforge add formatters` | `src/core/formatters/formatters.ts`, `src/core/formatters/input-masks.ts` |
| theme        | `devforge add theme`      | `src/core/theme/theme.ts`, `src/shared/styles/tokens.css`, `src/shared/composables/useTheme.ts` (Vue), `src/shared/hooks/useTheme.ts` (React) |
| auth         | `devforge add auth`       | `src/core/auth/auth-token.ts`, `src/core/auth/silent-refresh-queue.ts`, `src/modules/auth/stores/auth.store.ts` |
| errors       | `devforge add errors`     | `src/core/errors/api-error.ts` |
| export       | `devforge add export`     | `src/core/export/export-engine.ts` |
| rbac         | `devforge add rbac`       | `src/core/permissions/ability.ts`, `src/shared/components/Can.tsx` (React), `src/shared/directives/v-can.ts` (Vue) |
| url-sync     | `devforge add url-sync`   | `src/core/url-sync/url-state.ts` |
| flickerless  | `devforge add flickerless` | `src/shared/flickerless/core/*`, `src/shared/flickerless/vue/*`, `src/shared/flickerless/react/*`, `src/shared/flickerless/flickerless.css` |
| select       | `devforge add select`     | `src/shared/components/SelectField.vue` (Vue) · `SelectField.tsx`, `usePopover.ts`, `icons.tsx` (React) |
| dates        | `devforge add dates`      | `src/core/dates/date-range.ts`, `src/shared/components/DatePicker.vue`, `src/shared/components/DateRangeFilter.vue` (Vue) · `DatePicker.tsx`, `DateRangeFilter.tsx` (React) |
| feedback     | `devforge add feedback`   | `src/core/feedback/dialog.ts`, `src/core/feedback/toast.ts`, `src/core/overlay/escape-layer.ts`, `src/core/overlay/scroll-lock.ts`, `ConfirmDialog` + `ToastHost` (`.vue` / `.tsx`), `useOverlay` |
| overlays     | `devforge add overlays`   | `src/core/overlay/*.ts`, `ModalShell`, `DrawerShell`, `RowMenu` (`.vue` / `.tsx`), `useOverlay` |
| list-states  | `devforge add list-states` | `EmptyState`, `ListStaleNotice` (`.vue` / `.tsx`) |
| inputs       | `devforge add inputs`     | `MoneyInput`, `MaskedInput` (`.vue` / `.tsx`) |
| batch        | `devforge add batch`      | `src/core/batch/batch-progress.ts`, `BatchProgressModal` (`.vue` / `.tsx`) |
| pagination   | `devforge add pagination` | `src/core/pagination/pagination.ts`, `src/shared/components/ListPager.vue` (Vue) · `ListPager.tsx`, `icons.tsx` (React) |

> Every UI module installs both the Vue and the React adapter. Pass `--vue` or `--react` to install only one.
> Modules install their dependencies: `dates` ➔ `theme`, `select` · `pagination` ➔ `theme`, `formatters`, `flickerless` · `inputs` ➔ `formatters` · `batch` ➔ `overlays`, `formatters`.
> Components go to `src/shared/components/` (with their helpers `DfIcon.ts` (Vue) / `icons.tsx` + `usePopover.ts` (React) and `icon-paths.ts`); `useOverlay` goes to `src/shared/composables/` (Vue) or `src/shared/hooks/` (React).
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

## 8. `flickerless` — `@/shared/flickerless/vue` · `@/shared/flickerless/react`

Copy of [github.com/LuisMTaveras/flickerless](https://github.com/LuisMTaveras/flickerless) (MIT). Replaces skeletons. CSS: `@import '../flickerless/flickerless.css'` once (bridged to the theme tokens).

- Vue: `FlickerlessSurface` (props `loading`, `empty`, `error`, `settled?`, `delayMs` = 180, `minDurationMs` = 250, `keepPreviousData` = true, `preserveHeight`, `query` (TanStack/Vue Query-like), `announceText`; slots `default({ settled })`, `empty`, `error({ error })`, `skeleton` — do not use `skeleton`), `FlickerlessValue` (props `value`, `placeholder` = `'—'`, `unknownLabel`; default slot `({ value })`), `FlickerlessTableShell` (props `cols` (required), `rows` = 4, `rowClass`, `cellClass`), directive `vFlickerlessSaving` (register as `v-flickerless-saving`), `useFlickerless(options)` ➔ `{ isVisibleLoading, status, surfaceProps, bodyProps }`, `useFlickerlessQuery(query)`, `FLICKERLESS_SETTLED`.
- React: `FlickerlessSurface` (props: `FlickerlessOptions` + `settled?`, `children` (node or `({ settled }) => node`), `emptyState`, `errorState`, `announceText`, `className`, `style`), `FlickerlessValue` (`value`, `children?: (value) => node`, `placeholder`, `unknownLabel`), `FlickerlessTableShell` (`cols`, `rows?`, `rowClassName?`, `cellClassName?`), `useFlickerless(options)`, `useSettled()`.
- Core `@/shared/flickerless/core`: `FlickerlessController`, types `FlickerlessOptions`, `FlickerlessStatus` (`'idle' | 'loading' | 'error' | 'empty'`).

## 9. `select` — `@/shared/components/SelectField.vue` · `@/shared/components/SelectField` (React)

- Props: `modelValue: string | number | null`, `options: (SelectOption | string | number)[]`, `label?`, `placeholder?` (= `'Seleccionar…'`), `compact?`, `disabled?`. Extra attributes (`id`, `aria-*`, `class`) go to the trigger.
- Emits: `update:modelValue`, `change`. Exposes `focus()`.
- Types (exported from the SFC): `SelectOption = { value, label, disabled?, group?, hint? }`, `SelectValue`.
- React (named export `SelectField`): props `value`, `onChange(value)`, `options`, `label?`, `placeholder?`, `compact?`, `disabled?`, plus any `<button>` attribute (`id`, `aria-*`, `className`). Exports `SelectOption`, `SelectValue`, `SelectFieldProps`. Internal helpers `usePopover`, `cx` (`usePopover.ts`) and `Icon` (`icons.tsx`, names `chevronDown | chevronLeft | chevronRight | check | close | calendar`).
- There is **no** search/filter-as-you-type, multi-select or async loading. Ask before adding them.

## 10. `dates` — `@/core/dates/date-range` + `DatePicker.vue` + `DateRangeFilter.vue`

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

## 17. `devforge audit`

- Rules: hardcoded data, neon palette, Spanglish, single-theme colors, unformatted phone / currency, skeletons, native `<select>` / date inputs, `window.alert/confirm/prompt`, hardcoded currency (`currency: 'DOP'`, `=== 'DOP'`), `@ts-nocheck`, `toLocaleDateString` / `toLocaleTimeString` / `timeZone: 'UTC'`, backdrop-click closing (`@click.self`).
- Exit code `1` when there are (new) violations, so CI can block them.
- `devforge audit --baseline` writes `.devforge-audit-baseline.json` (known debt per file and rule). Later runs fail only on NEW violations and lower the baseline automatically when something is fixed. It can only shrink; never edit it upwards.
