# ⚡ BLUEPRINT 09: Notifications (The Bell, Its Inbox and Desktop Alerts)

## 🎯 Goal

A **notification** is a RECORD: it survives a refresh, is counted on the server and leads to a document. It is read
when the person wants. That makes it different from the other three ways of telling the user something:

| Need | Piece | Lifetime |
| --- | --- | --- |
| Interrupt and ask for a decision | `confirmDialog()` / `alertDialog()` (`feedback`) | until answered |
| Tell that something just happened | `notify()` toast (`feedback`) | seconds |
| Something persistent and actionable («factura por vencer», «pedido nuevo») | **the bell** (`notifications`) | until read / cleared |
| Someone is WAITING for your signature right now | `<AuthorizationAlerts />` (`authorizations`) | until decided / expired |

`window.alert/confirm/prompt` and a hand-made `new Notification(...)` are banned (`devforge audit`).

> Frontend: `devforge add notifications` (`<NotificationCenter />`, `ui-components.md` §12). This blueprint is the backend
> contract and the emission rules. Reference implementation: Snowlr.

---

## 1. Data model and API

`notification(id, company_id, user_id, type, title, body, link, data, is_read, created_at)` with indexes
`(user_id, company_id, is_read)` and `(user_id, company_id, created_at)` — the only two questions the bell asks.

`/api/notifications` behind plain authentication: **the token decides the audience**, not the route.

| Method | Path | Does |
| --- | --- | --- |
| `GET` | `/?status=all\|unread&type=&page=&pageSize=` → `{ items, meta: { total, hasMore } }` | Paginated inbox |
| `GET` | `/summary` → `{ unread, total, types: [{ type, total, unread }] }` | The REAL counter (never count the first page) |
| `PATCH` | `/:id/read` · `/:id/unread` | Reversible ack |
| `POST` | `/read-all` `{ type? }` | Mark all (or one category) read |
| `DELETE` | `/:id` | Delete one |
| `POST` | `/clear` `{ includeUnread? }` | Deletes what was READ; emptying unread is a separate, explicit action |

**Isolation**: every query filters by `user_id` **and** `company_id` — knowing a notification's id must not let you
touch it from another company. Write a test that fails if a query loosens.

---

## 2. Emitting one

```ts
await notifyPermissionHolders(companyId, 'invoices:manage', {   // to whoever CAN ACT
  type: 'DUE',                                    // a domain CATEGORY, not a severity
  title: 'Factura B0100000012 por vencer',        // sentence case, no emoji (the category brings the icon)
  body: 'Vence mañana: Distribuidora del Caribe, RD$45,000.00.',
  link: '/facturas/12',                           // WITHOUT portal prefix; the client prepends its root
}, { excludeUserId: actor.id }).catch(logError);  // a failed notice never breaks the operation
```

Rules:

1. Is it persistent and actionable? If not, it's a toast, not a notification.
2. The category comes from the catalog; a new one is added in both the server type and `registerNotificationKinds()`
   on the client. An unknown category is shown generically, never an error.
3. The link has no portal prefix and points to a route that EXISTS for that audience. Without a link it only informs.
4. Recipients: those with the permission to act (`notifyPermissionHolders`), never «all staff».
5. Machine noise («Sync iniciado») does not go to the inbox: it inflates the unread counter with work nobody has to do.
6. Each creation also emits `notification` over the socket to `user_{id}` with the persisted row (real id, category,
   link, `isRead`). The client calls `receiveNotification(row)`; it is inserted on top without reloading.

---

## 3. The client (what `devforge add notifications` gives you)

- `<NotificationCenter @navigate="router.push" />` in the top bar; `socket.on('notification', receiveNotification)`.
- `configureNotifications({ transport: createNotificationFetchTransport({ headers }), rootPrefix: '/admin' })` in `main.ts`.
- Grouped Hoy / Ayer / date with the day cut in the **business** time zone (`formatConfig.timeZone`), relative time in
  each row and the absolute date on hover.
- Filters «Todas / Sin leer» + only the categories that exist in this inbox; three different empty states; the panel
  never says «Sin notificaciones» before the first answer.
- `resetNotifications()` on logout.

---

## 4. Desktop notifications (tab in the background)

`showDesktopNotification()` (called by `receiveNotification`) shows the OS notification only if permission was granted
and the tab is **hidden** — with the app in front, the bell is enough. Everything on the desktop is also in the inbox.

**Permission is asked with a click, never on page load** («Activar avisos de escritorio» in the panel): Firefox and
Safari silently reject a request without a user gesture and Chrome hides it and ends up blocking the site.

---

## 5. Web push (tab closed) — optional backend work

1. VAPID keys in the server env (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`), generated ONCE; rotating
   them invalidates every subscription. Without keys, push is off and the web does not ask for permission.
2. One subscription per BROWSER, bound to user + company, sent at each login and removed at logout.
3. Push leaves from the SAME function that writes the notification row: no push without a notification.
4. The server only POSTs over HTTPS to the browsers' push services (Google, Mozilla, Microsoft, Apple) — never to an
   arbitrary `endpoint` (SSRF). Delete subscriptions on 404/410 and after repeated failures.
5. The service worker (`sw.js` / `push-sw.js`) is the only other place allowed to call `showNotification`.

---

## 🤖 Instructions for AI Agents

- Decide the channel with the table at the top before writing any message to the user.
- Never call `new Notification()`, `Notification.requestPermission()` or `alert()`; never ask permission on load.
- Never derive the destination by reading the title; use `link`. Never count unread on the client from one page.
- If the backend has no `/api/notifications` yet, say so and ask before inventing it (CLAUDE.md §8).
