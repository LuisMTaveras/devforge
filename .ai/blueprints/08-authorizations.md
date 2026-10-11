# ⚡ BLUEPRINT 08: Authorizations (Sign-off at the Moment of Truth)

## 🎯 Goal

A **permission** says what screens and routes a person can touch, and is checked when they **enter**. An
**authorization** says whether THIS act, for THIS amount, on THIS customer, can be **consummated**, and is checked when
it is consummated — the only moment you know how much is at stake. The person who issues credit notes needs the
permission every day; that does not mean the company wants them to give away RD$100,000 without anyone signing off.

**A risky act is never solved by inventing an exception permission** (`discounts:override_cap`,
`invoices:override_credit`, `canOverrideFloor`): each one is a permanent «yes», with no amount and no trail of who
approved what. `devforge audit` rejects them. The act goes into the **catalog** and the server asks for sign-off where the
act is consummated.

> Frontend: `devforge add authorizations` (interceptor, `<AuthorizationDialog />`, `<AuthorizationAlerts />`,
> `ui-components.md` §11). This blueprint is the **backend** half: a reference pattern proven in production (Snowlr,
> 41 acts). Adapt names to your stack (Express/Nest/Laravel/FastAPI…); the invariants are not optional.

---

## 1. The cycle, end to end

```
  Cashier                       Server                          Authorizer
     │ POST /credit-notes ─────────►│ assertAuthorized('creditnotes:issue', total, customer…)
     │◄─ 403 AUTHORIZATION_REQUIRED ─│   (server stores ITS reading of the act → pendingKey)
     │                               │
     ├─ A) credentials typed HERE ──►│ POST /authorizations/challenge  → { grant }
     ├─ B) remote request ──────────►│ POST /authorizations/requests   → bell + push + socket ──► Authorizer
     │                               │◄──────────────────────────────── POST /authorizations/:id/decide
     │◄─ socket authorization:resolved ─ GET /authorizations/requests/:id/grant → { grant }
     │                               │
     │ POST /credit-notes            │
     │   X-Authorization-Grant: … ──►│ assertAuthorized(...) → spends the grant
     │◄──────────── 201 Created ─────│
```

**The server decides both times.** At no point does the client say «this needs authorization» or «this is worth 50,000».

---

## 2. Data model (minimum)

| Table | Holds |
| --- | --- |
| `authorizable_action` | **Global** catalog of acts, seeded at boot from code (like permissions). |
| `authorization_policy` | What THIS company decided about an act. No row = catalog default (off). |
| `authorization_authorizer` | Who can sign off, and **up to how much** (`max_amount`, `null` = no limit). By role or person; `action_id null` = any act. |
| `authorization_delegation` | Temporary loan of that capacity (never wider than the delegator's). |
| `authorization_request` | The act awaiting sign-off: `fingerprint`, `amount_base` (ceiling), `context` (snapshot to show), status `PENDING → APPROVED → CONSUMED` / `REJECTED` / `CANCELLED` / `EXPIRED`. |
| `authorization_approval` | One row per approver, so a quorum is real. |

Policy fields: `enabled`, `threshold_amount` (below it, the act passes; `null` = always ask), `required_approvals`,
`allow_self_authorization`, `allow_inline_credentials`, `allow_remote_request`, `require_mfa`, `requires_reason`,
`request_ttl_seconds`, `grant_ttl_seconds`. Two layers only (catalog default + company row): fine-grained control
already lives in each authorizer's limit.

---

## 3. The catalog

```ts
// authorization.catalog.ts — the single list of acts
export const AUTHORIZATION_CATALOG = [
  {
    code: 'creditnotes:issue',
    name: 'Emitir nota de crédito',
    // Not decorative: it is what the approver reads. Nobody should sign an act whose reach they don't understand.
    description: 'Devuelve dinero o saldo al cliente. Toca la cuenta por cobrar y, si es fiscal, la numeración.',
    module: 'VENTAS',
    hasAmount: true,
    severity: 'HIGH',          // LOW | MEDIUM | HIGH | CRITICAL — the dialog's color
    defaultEnabled: false,     // EVERYTHING is born off. The company decides.
    defaultRequiresReason: true,
  },
] as const;
```

Criteria that repeat (use them for act number N+1):

1. **Ask when CONSUMING, not when capturing.** A draft gives no money to anyone. Always **before** touching fiscal
   numbering: a number assigned to a document that then lacks sign-off is a gap in the sequence.
2. **After the blocking rules.** Don't wake a manager to approve a void that will be rejected anyway.
3. **Measure the risk, not the big number.** Raising a credit limit from 100,000 to 110,000 risks 10,000.
4. **Direction matters.** Lowering a limit or rejecting a purchase asks for nothing: only what LOOSENS is signed.
5. **Only if it really changes.** Re-saving the same values asks for nothing.
6. **No person behind it, no gate.** Unattended jobs pass and are logged.

An act with no operation behind it does not go in the catalog: it would be a dead switch.

---

## 4. Wiring an act: two steps

```ts
// In the route/service, with the document ALREADY built (amount computed by the server):
const grant = await assertAuthorized(companyId, actor, {
  actionCode: 'creditnotes:issue',
  subjectType: 'CUSTOMER',
  subjectId: invoice.customerId,
  subjectLabel: invoice.customer?.name,
  amount: note.total,
  currency: note.currency,
  exchangeRate: note.exchangeRate,       // the document's FROZEN rate, never today's
  facts: { invoiceId: invoice.id },       // identity of the act → goes into the fingerprint
  context: { number: invoice.number },    // readable snapshot for the approver (NOT in the fingerprint)
  tx,                                     // spend the grant INSIDE the document's transaction
});
// … create the credit note …
if (grant.requestId) await attachSubject(grant.requestId, companyId, 'CREDIT_NOTE', note.id);
```

- The grant travels in the `X-Authorization-Grant` header (or `authorizationGrant` in a multipart body). Put it on the
  `actor` object your services already receive (`actor.authorizationGrant`), like the IP and the branch.
- **Not a route middleware on purpose**: a middleware runs before the amount is known; you'd compute the total twice and
  the gate would not be what gets saved.

### An exception to a wall that already existed: `liftsBlock`

When the sign-off is an EXCEPTION to an existing wall (credit limit, price floor), use `liftsBlock`, **never**
`assertAuthorized` alone: with the act switched off it returns `required: false`, and reading that as «may pass»
silently disables the credit limit for every company that configured nothing.

```ts
if (!credit.allowed) {
  const signOff = await liftsBlock(companyId, actor, { actionCode: 'invoices:over_credit_limit', amount: excess, … });
  if (!signOff.authorized) throw creditBlockedError(); // the usual wall
}
```

For a company that configured nothing, behavior is identical to before; there is now a one-off way out instead of a
permanent permission.

---

## 5. The four invariants (if one loosens, the module becomes a pretty modal that protects nothing)

1. **The client never describes the act.** On a 403 the server stores its own reading (amount, customer, document,
   fingerprint) and returns only an opaque `pendingKey` bound to user + company. If it expires it is **not** rebuilt from
   what the client sends: the client saves again and the server recalculates.
2. **The grant is bound to ONE act.** `fingerprint = sha256(actionCode + subject + canonical(facts))`.
3. **The amount is a ceiling, not an equality.** Approved «up to X» (`amount_base`, outside the fingerprint); at
   consumption `real <= X` passes, `real > X` asks again. Adjusting a line by a cent must not wake the manager again.
4. **Single use.** Consumption is a conditional update (`UPDATE … SET status='CONSUMED' WHERE id=? AND status='APPROVED'`):
   two concurrent requests with the same grant → one writes a row, the other zero and is rejected.

Plus:

- **Currency**: threshold and limits are in the company's BOOK currency, converted with the document's frozen rate.
  Foreign currency without a rate is «not measurable», and the not measurable **always** asks.
- **A control nobody can satisfy is a deadlock.** Refuse to enable an act nobody can sign; refuse a quorum larger than
  the people available; and **the company owner and the ADMIN role can always sign, with no limit** (they still see the
  dialog and type their password: the trail is half the value). Quorum > 1 requires the remote path.
- **Who can sign**: owner/ADMIN, person row, role row (current role), active delegation — the MOST permissive wins
  (`null` limit = unlimited; a bare `Math.max` turns it into 0: write `mostPermissive` and test it).

---

## 6. The 403 contract (what the frontend module expects)

```jsonc
// 403 — the challenge MUST arrive whole: message + code + details
{
  "message": "«Emitir nota de crédito» por RD$29,519.77 necesita autorización. Pídesela a Ana Reyes o Luis Taveras.",
  "code": "AUTHORIZATION_REQUIRED",
  "details": {
    "actionCode": "creditnotes:issue", "actionName": "Emitir nota de crédito",
    "message": "…same message…", "reason": "OVER_THRESHOLD", "severity": "HIGH",
    "amount": 29519.77, "currency": "DOP", "baseCurrency": "DOP", "thresholdAmount": 10000,
    "canSelfAuthorize": false, "allowInlineCredentials": true, "allowRemoteRequest": true,
    "requiresReason": true, "requiredApprovals": 1, "requireMfa": false,
    "authorizers": [{ "id": "u1", "name": "Ana Reyes", "roleName": "Gerente" }],
    "pendingKey": "opaque…", "pendingRequestId": null
  }
}
// 403 when the grant existed but is no longer valid (expired, used, amount went up):
{ "message": "La autorización caducó. Vuelve a guardar para pedirla de nuevo.", "code": "AUTHORIZATION_INVALID" }
```

**Never flatten the error on its way out.** `catch (err) { return sendError(res, err.message, 400) }` keeps the text and
throws away `code` and `details`: the user sees a red toast «necesita autorización» and the dialog never opens — a wall
without a door, silent on both sides. Respond with `{ message, code, details }` (a `sendErrorFrom(res, err, status)`
helper), and send `details` **only together with a `code`**. `devforge audit` rejects the flattening patterns.

**The message is the fact AND the way out** (built by the server):

| Situation | Second sentence |
| --- | --- |
| Can grant it themselves | «Puedes concederla tú mismo: teclea tu contraseña para continuar.» |
| Someone can | «Pídesela a Ana Reyes o Luis Taveras.» (two names + «y N más») |
| Only credentials on this device | «Un autorizador tiene que teclear sus credenciales en este equipo: …» |
| Nobody has a high enough limit | «Nadie tiene hoy un tope que cubra este importe: hay que subírselo a un autorizador, o bajar el importe.» |
| Quorum > 1 | add «Hacen falta N firmas distintas.» |

---

## 7. Endpoints (`/api/authorizations`)

| Method | Path | Who |
| --- | --- | --- |
| `POST` | `/challenge` `{ pendingKey, email, password, mfaToken?, note? }` → `{ grant }` | Any staff user (credentials typed here) |
| `POST` | `/requests` `{ pendingKey, note? }` → `{ requestId }` | Any staff user (remote) |
| `GET` | `/requests/:id/grant` → `{ grant?, status }` | Its owner |
| `DELETE` | `/requests/:id` | Its owner (withdraws) |
| `POST` | `/attempts/cancel` `{ pendingKey, channel, note? }` | Its owner — history of «tried and abandoned» |
| `GET` | `/inbox` · `POST /:id/decide` `{ decision: 'APPROVED' \| 'REJECTED', note? }` | `authorizations:view` |
| `GET/PATCH` | `/policies…` · `/authorizers…` · `/delegations…` | `authorizations:manage` (delegations always first person) |

Socket events: `authorization:requested` (to each eligible authorizer — the server filters, so receiving it IS the
permission to see it), `authorization:resolved` (to the requester), `authorization:closed` (to the company, removes the
card from everyone else). Not behind a plan/feature flag: a control you can switch off by buying another plan isn't one.

**The credential endpoint is a password oracle**: same defenses as login — sentinel hash when the email doesn't exist,
per-ACCOUNT failure counter with lockout, rate limit by identity, and **one message** for bad credential / unknown
account / no capacity. Only three things are told apart (they aren't secrets): self-authorization not allowed, limit too
low, MFA required. Password comparison lives in ONE function.

---

## 8. Ratchets (tests that keep it from becoming decorative)

1. Every `assertAuthorized` / `liftsBlock` code exists in the catalog (a typo is a silently open door: unknown acts pass).
2. Every catalog act is checked somewhere (no dead switches).
3. No password comparison outside the single gate.
4. No flattened error on the way to the client (`devforge audit` covers the common patterns).
5. `defaultEnabled: false` in every catalog entry; descriptions are non-empty.
6. Contract tests: `assertAuthorized` **throws**; `liftsBlock` returns **false** with the act off; `mostPermissive(null, 500) === null`.

---

## 🤖 Instructions for AI Agents

- **Never** add a permission like `x:override_*`, `canOverride*`, `bypass*`, nor a hand-made «contraseña del
  supervisor» prompt. Add the act to the catalog and call `assertAuthorized` / `liftsBlock` where it is consummated.
- **Never** compute the amount on the client for the authorization, nor send it to the challenge endpoint.
- The frontend needs nothing per screen: install the interceptor once (`installAuthorizationInterceptor(api)` or
  `withAuthorization`), mount `<AuthorizationDialog />` and `<AuthorizationAlerts />` once.
- If the project has no backend for this yet, say so and ask before inventing endpoints; mocking them in MSW requires
  the user's approval (CLAUDE.md §8).
