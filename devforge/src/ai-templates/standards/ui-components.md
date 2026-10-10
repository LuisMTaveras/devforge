# ⚡ DEVFORGE Standard UI Components

<!-- Mandatory components for every DEVFORGE project. Born in Snowlr, proven in production. Exact API: module-api.md §8–§16. -->

Every listing, form, modal and filter bar uses the same building blocks. They are installed, not rewritten:

```bash
devforge add flickerless --vue    # carga sin skeleton           (o --react)
devforge add select --vue         # SelectField: el combo
devforge add dates --vue          # DatePicker + DateRangeFilter
devforge add pagination --vue     # ListPager: el pie del listado
devforge add feedback --vue       # ConfirmDialog + ToastHost: diálogos del sistema y avisos
devforge add overlays --vue       # ModalShell, DrawerShell, RowMenu
devforge add list-states --vue    # EmptyState, ListStaleNotice
devforge add inputs --vue         # MoneyInput, MaskedInput (cédula, RNC, teléfono)
devforge add batch --vue          # BatchProgressModal: avance de un lote
```

`dates` installs `select`; `pagination` installs `flickerless` and `formatters`; `inputs` installs `formatters`; `batch` installs `overlays` and `formatters`; all of them install `theme`.
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

---

## 5. Dialogs and toasts: never `window.alert / confirm / prompt`

The browser dialogs ignore the theme, announce the domain («miapp.com dice»), block the thread, look the same for
«Guardar» and «Eliminar», and on mobile offer «impedir que esta página abra más diálogos», after which nothing can be
confirmed. `devforge audit` rejects them.

- **What interrupts is a dialog**: `alertDialog`, `confirmDialog`, `promptDialog` from `@/core/feedback/dialog`.
  `<ConfirmDialog />` goes **once** in `App.vue` / `App.tsx`.
- **What does not interrupt is a toast**: `notify(message, type?)` from `@/core/feedback/toast`. `<ToastHost />` goes
  once in the root. Errors stay longer than successes.
- `tone: 'danger'` for whatever cannot be undone: the button turns red and the focus starts on «Cancelar».
- The button text names the action («Eliminar», «Anular factura»), never «Sí» / «Aceptar» for a destructive question.
- A required prompt (`required: true`) does not accept an empty answer. `multiline: true` for reasons and notes
  (Enter writes a new line; Ctrl/Cmd+Enter confirms).

```ts
if (!(await confirmDialog('Eliminar cliente', 'No se puede deshacer.', 'Eliminar', { tone: 'danger' }))) return;
await api.clientes.eliminar(id);
notify('Cliente eliminado');
```

---

## 6. Modals and side panels: `ModalShell` / `DrawerShell`

Never hand-write the backdrop. The shells give every modal the same rules:

- **The backdrop does NOT close** (no `@click.self`, no `e.target === e.currentTarget`): a half-filled form is not
  lost to a click beside it. You leave by the ✕, «Cancelar», saving, or Escape. `devforge audit` rejects backdrop closing.
- **Escape closes only the top layer**: with a record open and a confirmation on top, one Escape closes the
  confirmation only (`@/core/overlay/escape-layer`).
- **The page behind does not scroll** while any layer is open, and closing a secondary one does not unlock it
  (`@/core/overlay/scroll-lock`, with a counter).
- On phones the modal slides up from the bottom; from `sm` it is centered.
- `DrawerShell` is for what you **consult** beside the list (a log, a record's detail) without hiding it.

```vue
<ModalShell :open="abierto" title="Nuevo cliente" @close="abierto = false">
  <form id="cliente" @submit.prevent="guardar">…</form>
  <template #footer><button form="cliente">Guardar</button></template>
</ModalShell>
```

React: `<ModalShell open={abierto} title="Nuevo cliente" onClose={…} footer={…}>`. For a custom layer, call
`useOverlay(open, onClose)` (Vue composable / React hook) instead of listening to Escape yourself.

---

## 7. Row actions: `RowMenu`

The «⋮» menu of a table row. It lives in `body` (the table's `overflow-x-auto` no longer cuts it), opens upwards
near the bottom edge, closes on outside click / Escape / scroll, and only one is open at a time.

- An unavailable action is **shown dimmed with its reason**, not hidden: `disabled: 'Ya está anulada'`.
- Destructive actions use `tone: 'danger'`, go last, after `separatorBefore: true`, and confirm with `confirmDialog`.

---

## 8. Empty and stale lists: `EmptyState` / `ListStaleNotice`

- `EmptyState` = icon + headline + one-line explanation + direct action. Only **after** a response (the surface's
  `#empty` slot / `emptyState` prop). With filters on, say so: «Ninguna factura coincide con los filtros» + «Limpiar filtros».
- `ListStaleNotice` = «Hay cambios nuevos en esta lista · Actualizar lista». When records change elsewhere (another
  screen, another user, a socket event), **do not reload the list by itself**: it would move the row the user was
  reading. Show the notice and let them decide.

---

## 9. Money and identifiers while typing: `MoneyInput` / `MaskedInput`

- `MoneyInput`: the model is a **number or `null`** (empty is not zero). Without focus it shows `1,500.00` with the
  country's separators and the currency symbol; with focus, the plain number to edit. The currency comes from the
  document (`:currency="factura?.moneda"`), otherwise the project's.
- `MaskedInput mask="cedula" | "rnc" | "taxId" | "phone"`: masks **while typing** (`001-1234567-8`, `1-01-23456-7`,
  `(809) 578-1234`), accepts pasted or already formatted text, and normalizes raw DB values when a form opens for
  editing. It emits the formatted text: store `onlyDigits(value)`.
- Mask the cédula only when the document type is cédula; a passport is a plain input. `taxId` auto-detects RNC vs. cédula.
- `formatPhoneNumber()` is for **displaying** a stored phone; `MaskedInput` / `formatPhoneInput()` is for **typing** one.

---

## 10. Batches: `BatchProgressModal`

Any action that processes N records one by one (send invoices, import rows, bill a route) shows its progress live:
«Procesando 3 de 10…», a bar, and each row with its outcome (listo / omitido / error and why).

```ts
const lote = createBatchTracker();               // Vue: in setup · React: useMemo(() => createBatchTracker(), [])
await lote.run({
  title: 'Enviando facturas',
  items: seleccion.map(f => ({ id: f.id, label: f.numero, sublabel: f.cliente?.nombre })),
  worker: f => api.facturas.enviar(f.id),          // throw = error · return { status: 'SKIPPED', detail } = omitido
});
```

- One failed row does **not** stop the batch. Closing the modal while it runs only hides it («Seguir en segundo plano»).
- If the **server** processes the batch, use `lote.track({ request: key => api.lote({ progressKey: key }), settle })`
  and feed socket / SSE events to `lote.apply(event)`.
