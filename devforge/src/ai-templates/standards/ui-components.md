# ⚡ DEVFORGE Standard UI Components

<!-- Mandatory components for every DEVFORGE project. Born in Snowlr, proven in production. Exact API: module-api.md §8–§19. -->

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
devforge add authorizations --vue # AuthorizationDialog + AuthorizationAlerts + interceptor del 403
devforge add notifications --vue  # NotificationCenter: la campana
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
4. **"Empty" only with a response in hand**: use the surface's `#empty` slot; it never shows during a load nor
   on mount before the request leaves (mounted with `loading=false` and an empty list = still unknown). If your
   loading flag can't express that, pass `:settled` explicitly (`settled` = "the server answered at least once").
5. **Errors are never swallowed**: give the surface an `#error` slot (`errorState` in React) with the message
   from `normalizeApiError` and a «Reintentar» button. Without it the surface shows `errorText`
   («No se pudo cargar la información.») above what was there, so the user always knows.
6. **With TanStack / Vue Query** (Vue) pass the query itself: `<FlickerlessSurface :query="clientesQuery">`. It
   follows `isFetching`, `error` and `data`; a page `{ items: [] }` / `{ edges: [] }` counts as empty.
7. Inline saves dim just the row/button: `v-flickerless-saving="savingId === row.id"` (Vue).
8. A small spinner **inside a button** that is saving is allowed.

```vue
<FlickerlessSurface :loading="loading" :empty="!rows.length">
  <table class="w-full text-body">
    <thead>…7 <th>…</thead>
    <tbody>
      <FlickerlessTableShell v-if="loading && !rows.length" :cols="7" cell-class="px-3.5 py-2.5" />
      <tr v-for="row in rows" v-else :key="row.id">
        <td class="px-3.5 py-2.5 text-right tabular-nums">
          <FlickerlessValue :value="row.monto">{{ formatCurrency(row.monto) }}</FlickerlessValue>
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

## 3. Dates: `DateField`, `DateRangeFilter` and `DatePicker`, never `<input type="date">`

Install once: `devforge add dates --vue` (or `--react`). It installs `select` and `theme` too.

### 3.1 Which one do I use?

| Situation | Component | Value |
| --- | --- | --- |
| A date **field in a form or modal** (vencimiento, fecha de nacimiento, próxima acción) | `<DateField>` | `'2026-10-15'` or `''` |
| The **period filter of a listing** (facturas, pedidos, cobros, reportes) | `<DateRangeFilter>` | `{ preset: 'month', from: '2026-10-01', to: '2026-10-11' }` |
| A **free range** outside a listing (rare: e.g. "período a exportar" inside a modal) | `<DatePicker range>` | `['2026-10-01', '2026-10-31']` |
| **Showing** a date in a table, card or detail | none — `formatDate(row?.fecha)` | text `11 oct 2026` |

Never use `DatePicker` alone for a single form date (that is `DateField`), and never build a period filter from two
`DateField`s (that is `DateRangeFilter`: it brings the shortcuts, the day arrows and the rule that the range never
empties by accident).

### 3.2 The value is a day key, not a `Date`

- Every component works with **day keys** `YYYY-MM-DD`. Send them to the API **as they are** (`"2026-10-15"`); do not
  convert to `Date` or `toISOString()` (that shifts the day: 8:00 p. m. in Santo Domingo is already tomorrow in UTC).
- When a form opens for editing, pass what the API returned: `toDayKey()` accepts `'2026-10-15'`, a full ISO
  (`'2026-10-15T04:00:00Z'`) or a `Date`, and turns it into the business day. The components call it for you.
- "Hoy" and the shortcuts are computed in the business time zone (`America/Santo_Domingo` by default;
  `setDateTimeZone('America/Bogota')` once in `main.ts` to change it), never in the browser's.
- The field shows `dd/mm/aaaa`. Empty shows the `placeholder` (`Seleccionar fecha` by default).
- `min` / `max` are day keys too (`:min="todayKey()"` blocks past dates; the days are shown dimmed, not hidden).

### 3.3 Form field: `DateField`

```vue
<script setup lang="ts">
import DateField from '@/shared/components/DateField.vue';
import { todayKey } from '@/core/dates/date-range';

const form = reactive({ vencimiento: '', proximaAccion: '' });
// Editing: form.vencimiento = factura?.vencimiento ?? ''   (ISO or key, both work)

async function guardar() {
  if (!form.vencimiento) return (errors.vencimiento = 'Indica el vencimiento.'); // required: validate by hand
  await api.facturas.update(id, { vencimiento: form.vencimiento });               // "2026-10-15"
}
</script>

<template>
  <!-- required: no ✕ to clear it -->
  <DateField v-model="form.vencimiento" label="Vencimiento" :min="todayKey()" :clearable="false" />
  <!-- optional: ✕ clears it to '' -->
  <DateField v-model="form.proximaAccion" label="Próxima acción" placeholder="Sin fecha" />
</template>
```

```tsx
import { DateField } from '@/shared/components/DateField';
import { todayKey } from '@/core/dates/date-range';

<DateField value={form.vencimiento} onChange={v => setForm(f => ({ ...f, vencimiento: v }))}
           label="Vencimiento" min={todayKey()} clearable={false} />
```

- Props: `label` (shown inside the field, uppercase), `placeholder`, `min`, `max`, `clearable` (default `true`),
  `compact` (36 px high, for toolbars), `disabled`. Vue: `v-model` + `@change`; React: `value` + `onChange`.
- The trigger is a `<button>`: the native `required` does nothing. Validate in `guardar()` / the Zod schema.
- Inside a `ModalShell` it just works: the calendar floats over the modal, and Escape closes the calendar first,
  then the modal.

### 3.4 Listing filter: `DateRangeFilter`

It is **one control**: «Período: [Este mes ▾]», the ‹ › day arrows when the range is a single day, a «Hoy» button,
and, when «Rango personalizado» is chosen, a two-month range picker next to it.
Shortcuts: Hoy · Ayer · Últimos 7 días · Este mes · Este trimestre · Este año · Rango personalizado · Historial completo.

```vue
<script setup lang="ts">
import DateRangeFilter from '@/shared/components/DateRangeFilter.vue';
import { defaultRange, resolveRange, type DateRange } from '@/core/dates/date-range';

const periodo = ref<DateRange>(defaultRange('month')); // the resting range of THIS screen
const page = ref(1);

async function cargar() {
  const { data } = await api.facturas.list({ page: page.value, pageSize: 20, ...resolveRange(periodo.value) });
  // GET /facturas?page=1&pageSize=20&from=2026-10-01&to=2026-10-11
}
function onPeriodo() { page.value = 1; cargar(); }        // a new period always goes back to page 1
function limpiarFiltros() { periodo.value = defaultRange('month'); onPeriodo(); } // never to «Historial completo»
</script>

<template>
  <DateRangeFilter v-model="periodo" @change="onPeriodo" />
</template>
```

```tsx
import { DateRangeFilter } from '@/shared/components/DateRangeFilter';
import { defaultRange, resolveRange, type DateRange } from '@/core/dates/date-range';

const [periodo, setPeriodo] = useState<DateRange>(() => defaultRange('month'));
<DateRangeFilter value={periodo} onChange={setPeriodo} onCommit={() => { setPage(1); cargar(); }} />
// React: onChange = every change (keep it in state) · onCommit = Vue's @change (load data)
```

- `@change` / `onCommit` fires **only when the range is usable**: a custom range with only the start picked does not
  query. Load data there, not in a `watch` on the model.
- Pick the resting range per screen: `defaultRange()` = Hoy (cash, daily sales), `defaultRange('month')` (invoices,
  purchases), `defaultRange('week')`…
- `resolveRange(periodo)` gives `{ from, to }` (both inclusive day keys) or `{}` for «Historial completo».
  **Backend contract**: `to` is inclusive — filter `fecha < (to + 1 day)` at 00:00 in the business time zone, never
  `fecha <= new Date(to)` (that is the START of that day in UTC and drops the whole last day).
- Heavy listings that must never load everything: `:allow-all="false"` / `allowAll={false}` hides «Historial completo».
- Keep `preset` / `from` / `to` in the URL with `url-sync` (blueprint 03) so a reload or a shared link keeps the period.
- For the status bar of the listing, `rangeLabel(periodo)` ➔ «Este mes · 01/10/2026».

### 3.5 Free range: `DatePicker range`

```vue
<DatePicker v-model="rango" range label="Período a exportar" />   <!-- rango: string[] -->
```

The value grows `[]` ➔ `['2026-10-01']` (start picked, the hover previews the range) ➔ `['2026-10-01', '2026-10-31']`.
It is complete only with **two** keys; a reversed pick is ordered for you. «Hoy» starts the range on today.

### 3.6 Don't

- `<input type="date">`, `<input type="datetime-local">` or a third-party date picker (`devforge audit` rejects the native ones).
- `new Date(value).toISOString()` before sending, or `toLocaleDateString()` to display (use `formatDate()`).
- Two `DateField`s «Desde» / «Hasta» as a listing filter.
- A time picker: there is none. Ask the user before adding one.

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

---

## 11. Authorizations: sign-off at the moment of truth, never an exception permission

A permission is checked when entering a screen; an **authorization** is checked when the act is **consummated**, with
the amount the server computed (blueprint 08). `devforge audit` rejects the shortcuts: exception permissions
(`'descuentos:override_tope'`, `canOverrideCredit`, `bypassLimit`), a hand-made «contraseña del supervisor» prompt, and
backend errors flattened to their message (they lose the challenge).

**Wiring it in the frontend is done ONCE, never per screen:**

```ts
// main.ts
import { configureAuthorizations, createFetchTransport, installAuthorizationInterceptor } from '@/core/authorizations/authorization';
import { notify } from '@/core/feedback/toast';

configureAuthorizations({
  transport: createFetchTransport({ headers: () => ({ Authorization: `Bearer ${tokenStorage.getAccessToken()}` }) }),
  currentUserEmail: () => auth.user?.email ?? null,
});
installAuthorizationInterceptor(api, { onInvalid: msg => notify(msg, 'warning') }); // axios-like instance
// with fetch / another client: await withAuthorization(headers => myClient.post(url, body, { headers }))

socket.on('authorization:resolved', notifyAuthorizationResolved);                   // the waiting dialog continues
socket.on('authorization:requested', a => pushAuthorizationAlert(a, { currentUserId: auth.user?.id }));
socket.on('authorization:closed', e => closeAuthorizationAlert(e.requestId));
```

```vue
<!-- App.vue, once, next to ConfirmDialog -->
<AuthorizationDialog />
<AuthorizationAlerts />
```

After that, the screen that saves does **nothing special**: its `await api.post('/notas-credito', body)` takes a bit
longer and returns 201. When the server answers `403 AUTHORIZATION_REQUIRED`, the interceptor opens the dialog, waits,
and retries the SAME request with `X-Authorization-Grant`. If the user cancels, the original error reaches the screen.

The dialog (port of Snowlr's):

- Opens on the path with least friction: **«Mi contraseña»** if the person can self-authorize, someone else's
  **credentials** typed here if the company allows it, or **«Solicitar»** (remote: the bell, push and a live card reach
  the authorizers; the screen waits and continues by itself when someone approves).
- Shows the act, the amount (in the document's currency), «Supera el límite libre de …», the quorum, and the server's
  message with the way out («Pídesela a Ana Reyes o Luis Taveras»).
- Asks for the **reason** when the policy requires it. Never sends the amount or describes the act: only the `pendingKey`.
- One at a time: a second challenge while one is open is cancelled. It sits above every modal; Escape closes only it.

`<AuthorizationAlerts />` is for whoever SIGNS: a card that arrives by socket with who is waiting, the amount and a live
countdown («Caduca en 4:12», red under two minutes), resolved right there with Autorizar / Rechazar. Unlike a toast it
does not go away by itself; it leaves when decided, expired, dismissed, or when someone else already signed.

---

## 12. Notifications: the bell

Choose the channel before writing any message:

| Need | Use |
| --- | --- |
| Interrupt and decide | `confirmDialog()` / `alertDialog()` |
| «Guardado», «No se pudo cargar» | `notify()` |
| Persistent and actionable (por vencer, pedido nuevo, respuesta de soporte) | the bell — emitted by the server (blueprint 09) |
| Someone waits for your signature now | `<AuthorizationAlerts />` |

**Never** `new Notification()`, `Notification.requestPermission()` on load, or `alert()`; `devforge audit` rejects them.

```ts
// main.ts
configureNotifications({ transport: createNotificationFetchTransport({ headers }), rootPrefix: '/admin' });
registerNotificationKinds([{ type: 'ORDER_STATUS', label: 'Pedidos', tone: 'accent', icon: 'inbox' }]);
socket.on('notification', receiveNotification);
// on logout: resetNotifications()
```

```vue
<NotificationCenter @navigate="link => router.push(link)" />          <!-- React: onNavigate={navigate} -->
```

- The badge is the server's real counter. Grouped Hoy / Ayer / date in the business time zone; «Todas / Sin leer» plus
  only the categories present; reversible ack (under «Sin leer» the row leaves when marked); a click marks it read and
  opens its `link`; «Limpiar leídas» never deletes unread ones; three different empty states; nothing claims «Sin
  notificaciones» before the first answer.
- Desktop alerts: the panel offers «Activar avisos de escritorio» (permission asked **on that click**, never on load).
  With permission, a notification that arrives while the tab is hidden also goes to the OS; everything there is also in
  the inbox. Tab-closed web push is backend work (blueprint 09 §5).
