# ⚡ BLUEPRINT 11: Document History (Who Did What, From the ⋮ Menu)

## 🎯 Goal

Whoever opens an invoice six months later can answer, **from the document itself**: who created it, who changed what,
who signed off, who sent it, who voided it and why. The history is **part of the document**, not a report: it opens from
the row menu (⋮) with the same permission that opens the document, without the company having an «Audit» module.

```
- Pepe Pérez emitió la nota de crédito · 12/09/2026 2:01 p. m.
    └ Fulano Gómez lo autorizó con su contraseña
- Pepe Pérez modificó la nota de crédito · 12/09/2026 3:10 p. m.
    Monto: RD$1,500.00 → RD$1,200.00
- Fulano Gómez anuló la nota de crédito · 12/09/2026 4:00 p. m.
    Motivo: «cliente desistió»
```

It is not a new table: it reads, together and in order, what the platform already writes — the audit log and, if you
have blueprint 08, the authorization requests consumed on that document.

> Proven in production (Snowlr). ORM calls are illustrative (Prisma-like): adapt to your stack.

---

## 1. Every relevant mutation writes an audit entry

| Column | Holds |
| --- | --- |
| `company_id` | Tenant. **Required**; an entry without it is not written (and warns). |
| `user_id`, `user_email` | The actor, from the session — never from the body. |
| `action` | Stable code, `<NOUN>_<VERB>`: `INVOICE_CREATED`, `INVOICE_UPDATED`, `INVOICE_EMAILED`, `INVOICE_VOIDED`. |
| `resource`, `resource_id` | The document: model name (`Invoice`) + id. Without them it cannot appear in any history. |
| `details` (JSON) | What a person needs to understand the act (§2). |
| `ip`, `user_agent`, `created_at` | `ip` = `req.ip` with `app.set('trust proxy', <real hop count>)` — never `true`, which trusts any `X-Forwarded-For` and lets the client write its own IP into the audit. |

```ts
export async function logAction(e: AuditEntry, opts: { critical?: boolean; tx?: Tx } = {}) {
  if (!e.companyId) { logger.warn(`audit skipped (no companyId) for ${e.action}`); return; }
  const write = (opts.tx ?? db).auditLog.create({ data: { ...e, details: redact(e.details) } });
  if (opts.critical) return write;                       // §5: the caller's transaction fails with it
  try { await write; } catch (err) { logger.error('audit write failed', { action: e.action, err }); }
}

export const actorFrom = (req: Request) => ({
  companyId: req.companyId, userId: req.user.id, userEmail: req.user.email,
  ip: req.ip, userAgent: req.get('user-agent') ?? null,
});
```

Every `POST` / `PATCH` / `DELETE` that changes a document, its status, its money or its recipients calls it, **after**
the act succeeded (or inside its transaction). Reads, autosaves of drafts and list filters do not.

---

## 2. What goes into `details`

The log stores what a programmer needs to debug; the history shows what a person needs to understand. Write details
that can be turned into Spanish without guessing:

```ts
await logAction({
  ...actorFrom(req), action: 'INVOICE_UPDATED', resource: 'Invoice', resourceId: inv.id,
  details: {
    number: inv.number,
    currency: inv.currency,                                       // money in the history uses THIS currency
    changes: diffFields(before, after, { dueDate: 'Vencimiento', total: 'Monto', notes: 'Notas' }),
    // → { total: { label: 'Monto', from: 1500, to: 1200 }, dueDate: { label: 'Vencimiento', from: '2026-09-30', to: '2026-10-15' } }
    reason: body.reason ?? undefined,
    authorizationRequestId: authorization?.requestId,             // blueprint 08: hangs the sign-off under this act
  },
});
```

- **`changes: { field: { label, from, to } }`** — only the fields that actually changed, with a human label. This is the
  contract that gives every edited document a readable before/after.
- **`reason`** — the user's stated reason (void, discount, return), shown as a quote.
- **Money** as a number plus the document's `currency`; never a preformatted `"RD$1,500"` (the reader formats it).
- **Enums** as their code (`RETURN`); the reader maps them to Spanish (`Devolución`).
- **Never** passwords, tokens, grants, API keys, full card numbers, signed URLs or file contents. `redact()` strips
  known keys (`password`, `token`, `secret`, `grant`, `authorization`, `apiKey`) as a last line of defense — it is not
  a license to pass them.

---

## 3. The read side: one service, one route per document

```ts
// modules/audit/document-history.service.ts
const DOCUMENTS: Record<string, { permission: string; noun: string; subjects?: string[] }> = {
  Invoice:    { permission: 'invoices:read',    noun: 'la factura' },
  CreditNote: { permission: 'creditnotes:read', noun: 'la nota de crédito' },
  Order:      { permission: 'orders:read',      noun: 'el pedido' },
};

router.get('/document-history/:resource/:id', authenticate, async (req, res) => {
  const doc = DOCUMENTS[req.params.resource];
  if (!doc) return res.status(404).json({ code: 'NOT_FOUND', message: 'Documento no encontrado.' });
  if (!req.user.can(doc.permission)) return res.status(403).json({ code: 'FORBIDDEN', message: 'No tienes acceso a este documento.' });
  await assertDocumentInTenant(req.params.resource, req.params.id, req.companyId);   // 404 if not this company's
  const { page, pageSize } = pageQuery.parse(req.query);                              // blueprint 07, pageSize ≤ 50
  const where = { companyId: req.companyId, resource: req.params.resource, resourceId: req.params.id };
  const [rows, totalCount] = await Promise.all([
    db.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    db.auditLog.count({ where }),
  ]);
  res.json({ items: rows.map(e => present(e, doc)), totalCount, hasNextPage: page * pageSize < totalCount });
});
```

- **Tenant isolation twice**: the document must belong to `req.companyId`, and the log query filters by it too.
- The permission is **the one that opens the document**, not an audit permission. A seller-scoped document keeps its
  seller scope.
- `present()` composes the sentence **on the server**, in past tense and Spanish: verb from the action suffix
  (`_CREATED` → creó · `_UPDATED` → modificó · `_VOIDED` / `_CANCELLED` → anuló · `_EMAILED` / `_SENT` → envió), noun
  from `DOCUMENTS`. An unknown code is shown legibly, never dropped. It returns `{ at, actorName, sentence, reason,
  changes, facts, authorization? }`: ids and anything that looks like an id never leave; an object it cannot read is
  omitted rather than dumped as JSON; money without a currency is shown without a symbol, never with another one's.
- Sign-offs (blueprint 08) hang **under the act they authorized** via `details.authorizationRequestId`; one that matches
  no act is shown on its own, at its date — never hidden.

### Registering a new document type

1. Each mutation calls `logAction` with `resource` + `resourceId` (and `changes` when it edits fields).
2. Add it to `DOCUMENTS` with the permission that opens it and its Spanish noun.
3. Add «Histórico» to its row menu (§4).

---

## 4. Frontend: from the ⋮ menu

```vue
<RowMenu :items="actions" :aria-label="`Más acciones de ${row.numero}`" />
<DrawerShell :open="historyOpen" :title="`Histórico · Factura ${row.numero}`" @close="historyOpen = false">
  <!-- DocumentHistory is YOUR component (not a DEVFORGE module): build it with the pieces below. -->
  <DocumentHistory resource="Invoice" :resource-id="row.id" />
</DrawerShell>
```

```ts
const actions = computed(() => [
  { key: 'history', label: 'Histórico', icon: 'clock', onSelect: () => (historyOpen.value = true) },
  canVoid.value && { key: 'void', label: 'Anular', tone: 'danger', onSelect: openVoid },
].filter(Boolean));
```

- `DocumentHistory` fetches through a service in `modules/<feature>/services/`, with `page` + `pageSize`, and ends with
  `<ListPager :total :has-more>`. It is Flickerless: `—` before the first response, `<EmptyState>` («Sin movimientos
  registrados»), error with message + «Reintentar».
- Each entry: sentence, `formatDate(at, 'datetime')` with `formatRelativeTime(at)` as its `title`; reason as a
  quote; `changes` as a two-column table (`Antes` / `Después`) with money through `formatCurrency(v, { currency })`.
- The client never composes sentences from codes: it paints what the server returned.

---

## 5. Audit must not break the request — except when it must

- **Ordinary business audit** (`INVOICE_EMAILED`, `REPORT_EXPORTED`, a background sync step): wrapped in
  `try/catch`, logged as an error, never fails the request. A background task wraps its whole body too: a failed audit
  write must not stop a batch halfway.
- **Security-relevant audit** (void, permission/role change, sign-off consumed, credential reset, data export of
  personal data): write it **inside the same transaction** as the act (`logAction(e, { critical: true, tx })`). If the
  audit cannot be written, the act does not happen. «Voided, but nobody knows who» is exactly what an audit exists to
  prevent.
- A swallowed failure is never silent: it goes to the error logger with the action code, so monitoring can alert.

---

## 🤖 Instructions for AI Agents

1. Every POST/PATCH/DELETE on a document calls `logAction` with `resource`, `resourceId`, the session actor and `req.ip`.
2. `details` carries `changes {label, from, to}`, `reason`, money + `currency`, enum codes. Never secrets or tokens.
3. Read through ONE history service and a paginated route, filtered by tenant and gated by the document's permission.
4. Sentences are composed on the server in Spanish; the frontend paints them, with dates via `formatDate` / `formatRelativeTime`.
5. Open the history from `<RowMenu>` into `<DrawerShell>` / `<ModalShell>`; never a hand-rolled menu or backdrop.
6. Ordinary audit is try/catch; security-relevant audit is transactional with the act.
7. Never set `trust proxy` to `true`. If the project has no audit table yet, say so and ask before inventing columns.
