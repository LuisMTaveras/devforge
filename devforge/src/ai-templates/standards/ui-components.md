# ⚡ DEVFORGE Standard UI Components (Loading, Combo, Dates, Pagination)

<!-- Mandatory components for every DEVFORGE project. Born in Snowlr, proven in production. Exact API: module-api.md §8–§11. -->

Every listing, form and filter bar uses the same four building blocks. They are installed, not rewritten:

```bash
devforge add flickerless --vue    # carga sin skeleton           (o --react)
devforge add select --vue         # SelectField: el combo
devforge add dates --vue          # DatePicker + DateRangeFilter
devforge add pagination --vue     # ListPager: el pie del listado
```

`dates` installs `select`; `pagination` installs `flickerless` and `formatters`; all of them install `theme`.
Import the CSS once in the global stylesheet, after `tokens.css`:

```css
/* src/shared/styles/main.css */
@import './tokens.css';
@import '../flickerless/flickerless.css';
```

> Every component exists in **Vue 3** (`.vue`, `v-model`) and **React** (`.tsx`, `value` + `onChange`). Same props,
> same look, same rules. Use `--vue` / `--react` to install only your framework's files.

---

## 1. Loading: Flickerless, never skeletons

**Banned**: skeleton components (`<Skeleton>`, `<TableSkeleton>`), the `skeleton` / `animate-pulse` classes, and a
spinner that covers the screen. `devforge audit` rejects them.

**Why**: a skeleton throws away the data the user was reading on every refetch, and on fast responses it flashes for a
few frames. A `0` or "Sin resultados" before the first response is a **false number**, not a placeholder.

**Rules**:
1. **What was there stays**, dimmed, with a 2 px bar on top: wrap the list in `<FlickerlessSurface :loading>`.
   A response faster than 180 ms shows no indicator at all.
2. **What is not known yet is `—`**: `<FlickerlessValue :value>` renders `—` until the surrounding surface has a
   response (or while the value is `null`). Never render `RD$0.00` while loading.
3. **Cold load paints the real shell**: `<FlickerlessTableShell :cols>` puts real rows with `—` inside the real
   `<tbody>`, so nothing jumps when data arrives.
4. **"Empty" only with a response in hand**: use the surface's `#empty` slot; it never shows during a load.
5. Inline saves dim just the row/button: `v-flickerless-saving="savingId === row.id"` (Vue).
6. A small spinner **inside a button** that is saving is allowed.

```vue
<FlickerlessSurface :loading="loading" :empty="!rows.length">
  <table class="w-full text-body">
    <thead>…7 <th>…</thead>
    <tbody>
      <FlickerlessTableShell v-if="loading && !rows.length" :cols="7" cell-class="px-3.5 py-2.5" />
      <tr v-for="row in rows" v-else :key="row.id">
        <td class="px-3.5 py-2.5 text-right tabular-nums">
          <FlickerlessValue :value="row?.monto">{{ formatCurrency(row.monto) }}</FlickerlessValue>
        </td>
      </tr>
    </tbody>
  </table>
  <template #empty><!-- empty state per ui-ux-principles.md §7 --></template>
  <ListPager v-model:page="page" :page-size="pageSize" :total="meta?.total" :has-more="meta?.hasMore"
             singular="factura" plural="facturas" />
</FlickerlessSurface>
```

React: `<FlickerlessSurface loading={…} empty={…} emptyState={…}>`, `<FlickerlessValue value={x}>{v => formatCurrency(v)}</FlickerlessValue>`, `<FlickerlessTableShell cols={7} />` from `@/shared/flickerless/react`.

---

## 2. Combo: `SelectField`, never the native `<select>`

The native `<select>` is drawn by the browser: it ignores Claro/Oscuro and gets clipped inside a modal with `overflow`.
`SelectField` teleports its menu to `body`, uses the theme tokens, and is keyboard accessible.

```vue
<SelectField v-model="filters.estado" label="Estado" :options="estadoOptions" compact />
```

- Options are `{ value, label, disabled?, group?, hint? }` (or plain strings/numbers). Options come from props or a
  service, never a hardcoded array in the component (checklist §1). Spanish labels only.
- A disabled option is **shown dimmed, not hidden**. `group` replaces `<optgroup>`.
- For a filter's "Todos", add an option `{ value: '', label: 'Todos' }`.
- React: `<SelectField value={estado} onChange={setEstado} label="Estado" options={estadoOptions} compact />`.
- ⚠️ The trigger is a `<button>`: the native `required` no longer blocks submit. Validate the field in `submit()`
  (Zod schema per `typescript-rules.md`).

---

## 3. Dates: `DatePicker` and `DateRangeFilter`, never `<input type="date">`

- The v-model is a **day key** `YYYY-MM-DD` (or `[desde, hasta]` with `range`), never a `Date`. "Hoy" is computed in the
  business time zone (`America/Santo_Domingo` by default; `setDateTimeZone()` to change it), not the browser's.
- The picker shows `dd/mm/aaaa`; a range shows two months side by side; the header opens a month/year view.

```vue
<DatePicker v-model="form.vencimiento" label="Vencimiento" :min="todayKey()" />
<DatePicker v-model="rango" range />
```

```tsx
<DatePicker value={vencimiento} onChange={setVencimiento} label="Vencimiento" min={todayKey()} />
<DatePicker range value={rango} onChange={setRango} />
<DateRangeFilter value={periodo} onChange={setPeriodo} onCommit={cargar} />   {/* onCommit = Vue's @change */}
```

**Listing filters use `DateRangeFilter`** (atajos Hoy · Ayer · Últimos 7 días · Este mes · Este trimestre · Este año ·
Rango personalizado · Historial completo, plus day arrows when the range is one day):

```ts
const periodo = ref(defaultRange('month'));      // the screen picks its resting range
// service call — always together with pagination:
api.facturas.list({ page, pageSize, ...resolveRange(periodo.value) });   // -> ?from=2026-10-01&to=2026-10-08
```

- The range **never empties by accident**: "Limpiar filtros" goes back to `defaultRange()`, not to "Historial
  completo". Only that preset, chosen on purpose, removes the limit (`resolveRange` then omits `from`/`to`).
  Hide it with `:allow-all="false"` on heavy listings.
- `@change` fires only when the range is usable (a half-picked custom range does not trigger a query).
- Sync `preset`/`from`/`to` with the URL (`url-sync`, blueprint 03).

---

## 4. Pagination: `ListPager`

Every paginated list ends with `ListPager`: **"Mostrando 11–20 de 57 facturas"** on the left, **‹ 2 / 6 ›** on the right.

- Pass `total` from the server (the query total, not the loaded rows). Until it arrives the summary is `—`, never
  "0 de 0".
- Total pages are **derived** from `total` and `pageSize`; never pass them separately. If the backend returns
  `hasMore`, pass it: the server knows whether there is a next page.
- Numbers use the project country's separators (`formatNumber`).
- React: `<ListPager page={page} onPageChange={setPage} pageSize={pageSize} total={data?.meta.total} hasMore={data?.meta.hasMore} singular="factura" plural="facturas" />` (`note` prop instead of the slot).
- Changing a filter resets `page` to 1.
