# ⚡ BLUEPRINT 14: Idempotency & Unreliable Networks

## 🎯 Goal

Double-click is solved by a disabled button. The case that really duplicates money is another: **the signal drops
after the server committed**. The app sees an error that is not one, the person taps «Confirmar» again, and a second
order is born with its own number, stock reservation and commission. Only the server can stop that, and only if the
client tells it «this is the same act».

> Reference pattern proven in production (Snowlr: `middleware/idempotency.ts`, `@snowlr/shared-mobile`
> `useIdempotencyKey` / `createOfflineQueue`). Adapt to your stack (Prisma/Knex/TypeORM…).

---

## 1. Invariants

1. **Every act that creates money or a document accepts an `Idempotency-Key`**: orders, invoices, payments, receipts,
   credit notes, deliveries, supplier payments.
2. **The key identifies the ACT, not the request.** Generated once when the person decides («confirmar este pedido»),
   reused by every retry of that act, renewed only after the act succeeds. A key built with `Date.now()` per attempt
   disarms the whole defense.
3. **The record is scoped** `(tenant, key, route)`, stores the actor and a **hash of the body**, and the final response.
4. **Same key + different body = `422 IDEMPOTENCY_KEY_REUSED`.** It is a bug or an attack, never a replay.
5. **Concurrency is decided by the database** (unique constraint on insert), not by a read-then-write.
6. **A server failure (5xx) releases the key**: a rejection must be truly retryable. A 4xx answer is stored and replayed.
7. **TTL** (24 h): after it, the same key is a new act.
8. **The safety net never blocks the sale**: if the idempotency table fails, log and continue.
9. **Balance-changing operations also take a row lock** (§5). Idempotency stops duplicate requests; locks stop two
   *different* requests from spending the same balance.

---

## 2. Server middleware

```ts
// middleware/idempotency.ts
export function idempotent(scope: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = String(req.headers['idempotency-key'] ?? '').trim();
    const companyId = req.companyId;
    if (key.length < 8 || key.length > 200 || !companyId) return next();   // opt-in by the client
    const bodyHash = sha256(stableStringify(req.body));

    try {
      await db.idempotentRequest.create({ data: { companyId, key, scope, bodyHash, userId: req.user?.userId } });
    } catch (err) {
      if (!isUniqueViolation(err)) { logger.warn('[idempotency] store failed', { scope }); return next(); }
      const prev = await db.idempotentRequest.findUnique({ where: { companyId_key_scope: { companyId, key, scope } } });
      if (!prev) return next();
      if (prev.bodyHash !== bodyHash)
        return res.status(422).json({ success: false, code: 'IDEMPOTENCY_KEY_REUSED',
          error: 'Esta operación ya se registró con otros datos. Recarga la pantalla antes de continuar.' });
      if (prev.statusCode == null)
        return res.status(409).json({ success: false, code: 'IDEMPOTENCY_IN_FLIGHT',
          error: 'La operación se está procesando.', meta: { idempotencyInFlight: true } });
      return res.status(prev.statusCode).json({ ...prev.responseBody, meta: { ...prev.responseBody?.meta, idempotentReplay: true } });
    }

    const json = res.json.bind(res);
    res.json = (body: any) => {
      const where = { companyId_key_scope: { companyId, key, scope } };
      (res.statusCode >= 500
        ? db.idempotentRequest.delete({ where })                                   // release: retry for real
        : db.idempotentRequest.update({ where, data: { statusCode: res.statusCode, responseBody: body } })
      ).catch(e => logger.warn('[idempotency] finalize failed', { scope, e }));
      return json(body);
    };
    next();
  };
}

router.post('/orders', authenticate, requirePermission('orders:create'), idempotent('orders:create'), createOrder);
```

Table: `idempotent_request(company_id, key, scope, body_hash, user_id, status_code NULL, response_body JSONB,
created_at)`, `UNIQUE (company_id, key, scope)`; a daily job deletes rows older than the TTL.

---

## 3. Client: one key per intent, wait on 409

```ts
// useIdempotencyKey — the key lives as long as the intent
export function useIdempotencyKey() {
  let key = crypto.randomUUID();
  return { get: () => key, renew: () => { key = crypto.randomUUID(); } };
}

const RETRY_WAITS = [1500, 3000, 6000, 10000];
export async function postIdempotent<T>(url: string, body: unknown, key: string): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await http.post<T>(url, body, { headers: { 'Idempotency-Key': key } });
    } catch (err) {
      const e = normalizeApiError(err);
      const retryable = e.code === 'IDEMPOTENCY_IN_FLIGHT' || e.status === 0 || e.status >= 500; // 0 = no response (adapt)
      if (!retryable || i >= RETRY_WAITS.length) throw err;
      await sleep(RETRY_WAITS[i]);                                  // SAME key, backoff
    }
  }
}
```

- **Retries with backoff only for idempotent requests** (GET, or POST with a key). Never auto-retry a keyless POST.
- The button stays disabled («Guardando…») until there is a **verdict**: the document exists, or a real error.
- If the server is still busy after the waits, the message does **not** say «vuelve a intentar»: it says where the truth
  is — «El pedido se está procesando. Revísalo en Mis pedidos antes de repetirlo.» Charging twice is worse than waiting.
- Double-click protection on the UI is **necessary but not sufficient**: it does nothing for a dropped response.

---

## 4. Offline queue (mobile)

```ts
type QueuedJob = { id: string; url: string; method: 'POST'; body: unknown;
  idempotencyKey: string;        // the SAME key as the live attempt
  ownerUserId: string; ownerCompanyId: string; label: string /* «Pedido de Ferretería Peña» */ };
```

1. **Only what got no answer enters the queue.** A 400 is a rejection; replaying it a thousand times will not make it
   valid.
2. **Each job carries its idempotency key**, because it is replayed precisely when the first attempt may have landed.
3. **A job belongs to the session that queued it** (`userId` + `companyId` read from the token). It is replayed only
   with that session; otherwise an order taken offline leaves under the next user's name, or another tenant's.
4. **409 in-flight = wait, not failure.** A replay that receives `idempotentReplay` is a success.
5. **Nothing is lost silently**: a rejected replay is shown with its label and kept for the user to resolve.

---

## 5. Row locks and «effects once»

```ts
await db.$transaction(async tx => {
  // lock the balance row: two receipts against the same invoice serialize here
  const [inv] = await tx.$queryRaw<Invoice[]>`SELECT * FROM invoice WHERE id = ${id} AND company_id = ${companyId} FOR UPDATE`;
  if (amount > inv.balance) throw new AppError(422, 'AMOUNT_EXCEEDS_BALANCE', 'El monto supera el saldo pendiente.');
  await tx.invoice.update({ where: { id }, data: { balance: { decrement: amount } } });

  // side effects claimed exactly once, inside the SAME transaction (Snowlr: Invoice.issueEffectsAt)
  const claimed = await tx.$executeRaw`UPDATE invoice SET issue_effects_at = now() WHERE id = ${id} AND issue_effects_at IS NULL`;
  if (claimed === 1) await applyStockAndLedger(tx, inv);
});
```

A conditional `UPDATE … WHERE marker IS NULL` makes a retried issuance safe even without a header: the second run finds
the marker set and skips the stock, ledger and commission effects.

---

## 🤖 Instructions for AI Agents

1. Any new route that creates money or a document mounts `idempotent('<scope>')`; any new client call to it uses
   `postIdempotent` with a key born at the user's decision.
2. Never generate the key inside the retry loop or from `Date.now()`.
3. Compare the body hash; a mismatch is `422`, never a replay.
4. Balance changes: `SELECT … FOR UPDATE` (or your ORM's equivalent) inside the transaction; side effects behind a
   conditional marker.
5. Offline queues store key + owner session; they never replay 4xx.
6. If the project has no idempotency table yet, say so and propose the migration; do not fake it in memory.
