# ⚡ BLUEPRINT 12: Document Delivery (Email & WhatsApp Through One Gate)

## 🎯 Goal

**One document, one format, one gate.** Everything that leaves toward a customer — order, invoice, credit note,
receipt, account statement — travels through a single server module (`lib/document-delivery.ts`). The module that owns
the document only supplies **what** (its PDF and summary data). **To whom**, **how it looks** and **what gets
recorded** are decided by the gate.

Without it, each module resolves delivery its own way, and the customer notices: the invoice goes to the billing
contact while the credit note goes to the account email; every email has its own layout; WhatsApp numbers leave without
a country code; some sends are audited and others only logged; and nobody can answer «¿a quién se le mandó esta
factura y cuándo?».

> Frontend: `ModalShell`, `confirmDialog()` / `notify()` (`feedback`), `DocumentPreviewModal` (`devforge add documents`).
> Proven in production (Snowlr). Providers (email API, WhatsApp Business API) and ORM calls are illustrative.

---

## 1. The gate

```ts
export interface DeliverableDocument {
  companyId: string; customerId: string; customerName: string;
  type: 'INVOICE' | 'CREDIT_NOTE' | 'ORDER' | 'RECEIPT' | 'STATEMENT';
  id: string; kind: string;                      // 'Factura'
  label: string;                                  // number shown to the customer
  role: 'BILLING' | 'SHIPPING' | 'COLLECTIONS';   // who should receive it (§2)
  amount?: { value: number; currency: string };   // currency from the document
  details?: Array<{ label: string; value: string }>;
  attachments: Array<{ filename: string; content: Buffer; contentType: string }>;  // generated HERE (§3)
}

export const DocumentDelivery = {
  async send(doc: DeliverableDocument, channel: 'EMAIL' | 'WHATSAPP', input: { recipientIds: string[] }, actor: Actor,
             idempotencyKey: string) {
    const recipients = await resolveRecipients(doc, channel, input.recipientIds);         // §2
    if (!recipients.length) throw new AppError(422, 'NO_RECIPIENT', 'El cliente no tiene un contacto que acepte este canal.');
    await assertDeliveryQuota(doc.companyId, actor, doc, channel);                         // §5
    const results = [];
    for (const r of recipients) {
      const existing = await db.documentDispatch.findUnique({ where: { idempotencyKey_recipient: { idempotencyKey, recipient: r.address } } });
      if (existing) { results.push(existing); continue; }                                  // §4: retry ≠ resend
      const row = await db.documentDispatch.create({ data: { companyId: doc.companyId, documentType: doc.type,
        documentId: doc.id, channel, recipient: r.address, recipientName: r.name, status: 'QUEUED',
        idempotencyKey, actorId: actor.userId } });
      try {
        const providerId = channel === 'EMAIL'
          ? await emailProvider.send({ to: r.address, ...renderDocumentEmail(doc, r) })
          : await whatsappProvider.sendDocument({ to: toE164(r.address), ...renderDocumentWhatsApp(doc, r) });
        results.push(await db.documentDispatch.update({ where: { id: row.id }, data: { status: 'SENT', providerId } }));
      } catch (err) {
        results.push(await db.documentDispatch.update({ where: { id: row.id }, data: { status: 'FAILED', error: safeProviderError(err) } }));
      }
    }
    await logAction({ ...actor, action: `${doc.type}_${channel === 'EMAIL' ? 'EMAILED' : 'WHATSAPP_SENT'}`,
      resource: modelOf(doc.type), resourceId: doc.id,
      details: { channel, recipients: recipients.map(r => r.name), number: doc.label } });   // blueprint 11, once, HERE
    return results;
  },
};
```

Routes stay thin: authenticate, check the document's permission, load it **filtered by tenant**, build the
`DeliverableDocument`, call the gate. A route never audits on its own (it would double the entry) and never talks to a
provider directly.

---

## 2. Recipients: resolved on the server, by role, with consent

| Document | Role | Fallback chain |
| --- | --- | --- |
| Order | `SHIPPING` | contacts with role → primary contact → account email/phone |
| Invoice · Credit/Debit note · Receipt | `BILLING` | same |
| Account statement | `COLLECTIONS` | → `BILLING` → primary → account |

- The server **offers** the candidates (`GET /documents/:type/:id/recipients?channel=`) and the client **selects among
  them** by id. A `recipientId` that is not one of this customer's contacts is rejected (`422`), never sent.
- Contacts with the channel's opt-in turned off are excluded, always.
- A free-typed address, if your product allows it, is an explicit permission (`documents:send_external`), validated
  (email syntax / phone digits), and recorded as such in the log. Never a default from the portal user's login email.
- Phones are normalized to E.164 at the exit point (`8095551234` → `18095551234`, country from config, default `DO`);
  normalization is idempotent.

---

## 3. Attachments and templates

- **The PDF is generated on the server** from the document in the database (your PDF renderer, blueprint for
  documents). The client never uploads «the PDF to send», and the gate never attaches a file fetched from a third-party
  URL — a fiscal or commercial document must not depend on, or be swappable by, someone else's server. Logos and images
  in the template are embedded, not remote `<img src>`.
- If the document has a legally required companion (e.g. a signed electronic invoice XML), the gate attaches it too.
- One email layout for every document: company branding from theme tokens, document summary, **amount in the body**
  (`formatCurrency(doc.amount.value, { currency: doc.amount.currency })` — many people decide by the preview), named
  attachments, company footer. No module builds its own email.
- WhatsApp: the PDF goes as a **document**, never a link; caption on one line — type, number, amount. Outside the
  provider's free-messaging window, use an approved template whose purpose is document delivery; if none is
  registered, **fail with an actionable message** instead of pretending it was sent.
- Every template is in the UI language (Spanish): subject «Factura FAC-000123 de Empresa S.R.L.», body, buttons.

---

## 4. Delivery log and idempotency

`document_dispatch`: one row **per recipient per attempt** — `document_type`, `document_id`, `channel`, `recipient`,
`status`, `provider_id`, `error`, `actor_id`, `idempotency_key`, timestamps. Unique on `(idempotency_key, recipient)`.

| Status | Meaning |
| --- | --- |
| `QUEUED` | Row written, provider not called yet. |
| `SENT` | Provider accepted it. |
| `DELIVERED` | Reached the mailbox / phone. |
| `READ` | Opened / read (a hint, not proof). |
| `BOUNCED` · `COMPLAINED` | Bad address · marked as spam. |
| `FAILED` | Provider rejected it, or it was never attempted. |

- The client sends `Idempotency-Key` (a UUID created when the modal opens). A double click or network retry returns the
  same rows instead of mailing the customer twice. A **deliberate** resend opens the modal again → new key.
- Provider webhooks move the status, **verified by signature** (reject everything if the secret is not configured) and
  **never backwards**: a late `DELIVERED` does not erase a `BOUNCED`.
- `GET /document-dispatches?documentType=&documentId=&page=&pageSize=` — tenant-filtered, paginated, shown in the modal.

---

## 5. Abuse limits

- Rate limit per **identity and company** (not per IP), from the single rate-limit module: e.g. 30 sends/min per user,
  a daily cap per company per channel.
- Per document: at most N sends per hour to the same recipient (`429` «Este documento ya se envió hace un momento a
  este contacto.»).
- Recipients per send capped (e.g. 10). Bulk sending is a batch (`<BatchProgressModal>`), not a loop in the browser.
- Provider errors reach the user normalized (`NO_RECIPIENT`, `TEMPLATE_MISSING`, `PROVIDER_REJECTED`), never raw.

---

## 6. Frontend: the send modal

```vue
<!-- ModalShell never closes on the backdrop (no prop needed). RecipientChecklist and DispatchHistory are YOUR
     components, not DEVFORGE modules. -->
<ModalShell :open="open" title="Enviar al cliente" @close="open = false">
  <SelectField v-model="channel" label="Canal" :options="channelOptions" />           <!-- Correo · WhatsApp -->
  <RecipientChecklist v-model="recipientIds" :options="recipients" />                  <!-- offered by the server -->
  <p class="text-muted-foreground">Se adjunta: {{ attachmentName }}</p>
  <button class="..." @click="previewOpen = true">Vista previa</button>
  <DispatchHistory :document-type="type" :document-id="id" />                          <!-- last attempts + status badges -->
  <template #footer>
    <button @click="open = false">Cancelar</button>
    <button class="bg-primary text-primary-foreground" :disabled="sending || !recipientIds.length" @click="send">
      {{ sending ? 'Enviando…' : 'Enviar' }}
    </button>
  </template>
</ModalShell>
<DocumentPreviewModal :open="previewOpen" :title="`Factura ${numero}`" :file-name="`factura-${numero}`"
  :load="() => api.get(`/facturas/${id}/pdf`, { responseType: 'blob' }).then(r => ({ kind: 'pdf', blob: r.data }))"
  @close="previewOpen = false" />
```

```ts
async function send() {
  sending.value = true;
  try {
    await deliveryService.send(type, id, { channel: channel.value, recipientIds: recipientIds.value }, idempotencyKey);
    notify('Documento enviado.', 'success');
    open.value = false;
  } catch (err) {
    notify(normalizeApiError(err).message, 'error');
  } finally { sending.value = false; }
}
```

- Who (checklist of offered contacts, opt-out shown disabled with its reason), what (attachment names + preview of the
  server-rendered PDF), history (status badges with soft-tint tokens: `success` delivered, `danger` bounced/failed).
- `confirmDialog()` only when it matters (e.g. resending to a contact that already received it today).

---

## 🤖 Instructions for AI Agents

1. Every customer-facing send goes through the delivery gate. No route calls an email or WhatsApp provider directly.
2. Recipients are resolved on the server by role and consent; the client only selects among offered ids.
3. Attachments are generated server-side from the stored document. Never attach a file from a third-party URL.
4. One `document_dispatch` row per recipient; `Idempotency-Key` makes retries safe; webhooks are signed and never move status backwards.
5. Rate-limit by identity and company; cap recipients per send; bulk is a batch.
6. Templates and errors are in the UI language; amounts through `formatCurrency` with the document's currency.
7. The modal uses `ModalShell`, `SelectField`, `DocumentPreviewModal`, `notify()` / `confirmDialog()`.
8. If the project has no email/WhatsApp provider configured, say so and ask; never invent env vars or endpoints.
