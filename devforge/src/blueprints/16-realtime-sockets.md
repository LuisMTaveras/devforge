# ⚡ BLUEPRINT 16: Realtime with Sockets (Tenant-Safe Rooms)

## 🎯 Goal

A socket is a second door into the API, and it is the one people forget to lock. A `join` that accepts any
`customerId` lets a buyer read another company's chat live. The rules: **the server authenticates the handshake with
the same token as REST, the server chooses the rooms, the server emits after commit, and an event is a HINT — the REST
API is the truth.**

> Reference pattern proven in production (Snowlr: `lib/socket.ts`, `composables/useSocket.ts`, `socket.io` 4).
> Adapt to your stack (`ws`, SSE, Pusher…); the invariants are not optional.

---

## 1. Invariants

1. **Handshake = `authenticate`.** Same JWT, same checks (user active, company active, session not revoked — blueprint
   15). No token, no socket.
2. **Rooms are assigned by the server from the token**: `user_<id>`, `session_<sid>`, `company_<id>`,
   `customer_<id>`. A client never names the room it joins.
3. Optional rooms (`chat:join`, `inbox:join`) **verify access against the DB** with the tenant from the token and log
   rejections.
4. **Emit after the transaction commits**, never inside it: a rolled-back write must not have been announced.
5. **Events are hints.** The payload is small (id, type, status); the client refetches or patches from REST. A missed
   event must never leave the screen wrong forever.
6. **Reconnect = resync.** On `connect` after a drop, every feature refetches what it shows (summary, open lists).
7. **One socket per tab**, a module singleton shared by every feature. Handlers are re-attached on reconnect.
8. Emitting never breaks the request: wrap in `try/catch` and log.

---

## 2. Server

```ts
// lib/socket.ts
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token ?? readCookie(socket.handshake.headers.cookie, ACCESS_COOKIE);
    socket.data.user = await resolveRealtimeSession(token);   // SAME checks as the REST authenticate middleware
    next();
  } catch { next(new Error('UNAUTHORIZED')); }
});

io.on('connection', socket => {
  const u = socket.data.user as JwtPayload;
  socket.join(`user_${u.userId}`);
  if (u.sid) socket.join(`session_${u.sid}`);                  // lets revokeSessions() disconnect exactly this session
  if (u.companyId) socket.join(`company_${u.companyId}`);
  if (u.customerId) socket.join(`customer_${u.customerId}`);
  presence.add(u.companyId, u.userId);                         // «En línea» (blueprint 15)

  socket.on('chat:join', async ({ customerId }: { customerId?: string }) => {
    if (!(await canAccessConversation(u, customerId))) return logger.warn('chat:join rechazado', { userId: u.userId });
    socket.join(`conversation_${u.companyId}_${customerId}`);  // tenant comes from the token, not the payload
  });
  socket.on('disconnect', () => presence.remove(u.companyId, u.userId));
});

export const SocketService = {
  toUser: (userId: string, event: string, data: unknown) => safeEmit(`user_${userId}`, event, data),
  toCompany: (companyId: string, event: string, data: unknown) => safeEmit(`company_${companyId}`, event, data),
  disconnectSessions: (sids: string[]) => sids.forEach(sid => io.in(`session_${sid}`).disconnectSockets(true)),
};
```

After commit:

```ts
const invoice = await db.$transaction(tx => issueInvoice(tx, input));
SocketService.toCompany(companyId, 'document:changed', { resource: 'invoices', id: invoice.id, kind: 'created' });
```

Never `io.emit(...)` (every tenant). With more than one instance, use the socket.io Redis adapter (check
`package.json`; adapt to your stack).

---

## 3. Client singleton

```ts
// composables/useSocket.ts — one per tab
let socket: Socket | null = null;
const handlers = new Map<string, Set<(p: any) => void>>();

export function connectSocket(token: string) {
  if (socket) return socket;
  socket = io(API_ORIGIN, { auth: { token }, withCredentials: true, reconnectionDelayMax: 10_000 });
  socket.on('connect', () => resyncAll());                      // missed events: refetch, don't trust the gap
  socket.on('connect_error', e => { if (e.message === 'UNAUTHORIZED') disconnectSocket(); });
  handlers.forEach((set, event) => set.forEach(h => socket!.on(event, h)));
  return socket;
}
export function onSocket(event: string, h: (p: any) => void) {
  (handlers.get(event) ?? handlers.set(event, new Set()).get(event)!).add(h);
  socket?.on(event, h);
  return () => { handlers.get(event)?.delete(h); socket?.off(event, h); };
}
export function disconnectSocket() { socket?.disconnect(); socket = null; }   // on logout and on token change
```

---

## 4. Wiring DEVFORGE modules

> The event names below are a **suggested convention** (only `batch:progress` and `team:presence` come from a
> production backend). Use the names YOUR server actually emits; if it emits none yet, agree them with the backend.

| Event | Module | Consumer |
| --- | --- | --- |
| `notification:new` | notifications (blueprint 09) | `onSocket('notification:new', receiveNotification)` |
| `authorization:requested` | authorizations (blueprint 08) | `onSocket('authorization:requested', a => pushAuthorizationAlert(a, { currentUserId }))` |
| `authorization:resolved` | authorizations | `onSocket('authorization:resolved', notifyAuthorizationResolved)` |
| `batch:progress` | batch | `onSocket('batch:progress', batch.apply)` with `const batch = createBatchTracker()` and `batch.track({ title, items, request: key => api.lote({ progressKey: key }), settle })` |
| `document:changed` | list-cache | created / deleted → `markListShifted(resource)`; updated → `recordDocumentChange(resource, id, snapshot)` |

```ts
onSocket('document:changed', (e: { resource: string; id: string; kind: 'created' | 'updated' | 'deleted'; snapshot?: DocumentSnapshot }) => {
  if (e.kind === 'updated' && e.snapshot) recordDocumentChange(e.resource, e.id, e.snapshot);
  else markListShifted(e.resource);   // the list shows <ListStaleNotice>; user refreshes the page from REST
});
onSocket('connect', () => { refreshNotificationSummary(); });
```

The list screen consumes them with `drainDocumentChanges(resource)` (patch rows in place) and
`takeListShifted(resource)` (rows were added/removed: offer a refresh, never splice a paginated list by hand).

Batch progress goes to `user_<id>` only (whoever launched it); the tracker falls back to `GET /batch-progress/:key` if
the socket is silent, and `settle` from the HTTP response is the final truth.

---

## 5. Payload rules

- No secrets, no full documents, no other tenant's data. `{ resource, id, kind }` plus what the badge needs.
- User-facing text inside an event (a notification title) is Spanish and built by the server.
- Version-tolerant: unknown events and extra fields are ignored by the client.

---

## 🤖 Instructions for AI Agents

1. Never add a `socket.on('join', room => socket.join(room))`. Rooms come from the token; optional rooms check the DB.
2. Never emit inside a transaction or to `io` globally; use `SocketService.toUser` / `toCompany` after commit.
3. Every screen updated by a socket must also be correct after a reload: the event is a hint.
4. Reuse the tab singleton; never `io()` inside a component.
5. Use only the DEVFORGE functions cited here (`receiveNotification`, `pushAuthorizationAlert`,
   `notifyAuthorizationResolved`, `createBatchTracker`, `markListShifted`, `recordDocumentChange`,
   `drainDocumentChanges`, `takeListShifted`, `refreshNotificationSummary`); check they exist in `src/` first.
6. If the backend emits no such event yet, say so and ask; do not invent event names in the frontend.
