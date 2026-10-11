# ⚡ BLUEPRINT 15: Sessions You Can See and Revoke

## 🎯 Goal

**A session is a row, not just a token.** Every login leaves a row; both tokens carry its id (`sid`). Closing the row
closes the session on the next request — without changing the password and without waiting for the token to expire.
Stateless tokens cannot answer «where is my account open?» or «close the one on the lost phone», and a refresh that
does not invalidate the previous token is a stolen token that lives forever.

> This is the **server half** of [06-auth-session.md](./06-auth-session.md). Blueprint 06 owns the frontend refresh
> queue (one refresh in flight, 401 → retry); this blueprint owns what that refresh hits. Reference pattern proven in
> production (Snowlr: `modules/auth/auth-sessions.service.ts`, `AuthSessionList.vue`). Snowlr signs with `jsonwebtoken`
> and hashes with `bcryptjs`; adapt to your stack.

---

## 1. Invariants

1. **One `auth_session` row per completed login** (password, MFA, profile pick, QR). One function signs sessions
   (`issueSession`): it opens the row on login and rotates it on refresh. Nothing else calls `jwt.sign` for a session.
2. **`sid` is inside the access AND the refresh token.** `authenticate` checks that the row is open on every request
   (cached ~60 s in Redis; a revocation overwrites the cache immediately).
3. **Tokens are never stored.** Only the SHA-256 of the current (and previous) refresh token.
4. **Refresh rotates, with reuse detection.** A rotated token that comes back = someone has a copy → revoke the session.
5. **Password change and recovery revoke** via `password_changed_at`: any token issued before it is dead.
6. **«Forgot password» answers the same** whether the account exists or not.
7. Every revocation writes the audit log with who, whose and why.

---

## 2. Data model

| Column | Holds |
| --- | --- |
| `id` | The `sid`. |
| `identity_id`, `company_id`, `profile_id` | Whose session, in which tenant. |
| `device` | «Chrome en Windows», «App móvil (Android)» (from UA or an `x-device-platform` header). |
| `ip`, `place` | Last IP (from a correct `trust proxy`, blueprint 13) and an optional coarse place. |
| `created_at`, `last_seen_at` | `last_seen_at` written at most once a minute (`touchSession`). |
| `refresh_hash`, `previous_refresh_hash`, `refresh_expires_at` | Rotation state. |
| `revoked_at`, `revoked_by`, `revoked_reason` | `USER` · `OTHERS` · `PASSWORD_CHANGE` · `PASSWORD_RESET` · `ADMIN` · `REUSE`. |

A daily job purges rows expired or revoked more than 30 days ago.

---

## 3. Rotation with reuse detection

```ts
export async function refresh(presented: string) {
  const payload = verifyRefresh(presented);                         // signature + exp; carries sid
  const s = await db.authSession.findUnique({ where: { id: payload.sid } });
  if (!s || s.revokedAt) throw unauthorized('SESSION_REVOKED', 'Tu sesión fue cerrada. Inicia sesión de nuevo.');
  const h = sha256(presented);

  if (h === s.refreshHash || h === s.previousRefreshHash) {
    // current: normal rotation. previous: the last response never reached the phone — issue again, keep previous.
    const next = signRefresh({ sid: s.id });
    const won = await db.authSession.updateMany({                    // compare-and-swap: two parallel refreshes, one wins
      where: { id: s.id, refreshHash: s.refreshHash, revokedAt: null },
      data: { previousRefreshHash: h === s.refreshHash ? s.refreshHash : s.previousRefreshHash, refreshHash: sha256(next) },
    });
    if (won.count !== 1) throw conflict('REFRESH_RACE', 'Reintenta.');
    return { accessToken: signAccess({ sub: s.identityId, sid: s.id, companyId: s.companyId }), refreshToken: next };
  }

  // any OTHER token of this session: a rotated copy reappeared. We cannot tell owner from thief → close it.
  await revokeSessions({ ids: [s.id], reason: 'REUSE', by: null });
  throw unauthorized('SESSION_REUSED', 'Detectamos un uso inusual de tu sesión. Inicia sesión de nuevo.');
}
```

`revokeSessions` marks the rows, overwrites the cache and disconnects their live sockets (room `session_<sid>`,
blueprint 16).

---

## 4. Routes

| Route | Guard | Does |
| --- | --- | --- |
| `GET /auth/sessions` | own session | My sessions, `current: true` on this one. |
| `DELETE /auth/sessions/:id` | own session | Close one of mine (if current, clear cookies too). |
| `POST /auth/sessions/revoke-others` | own session | Close all mine except this one. |
| `PUT /auth/password` | own session | Change password; `revokeOtherSessions` (UI default: checked). |
| `GET /team/:userId/sessions` | `team:manage` + can-manage-that-user | A member's sessions **in this company**. |
| `POST /team/:userId/sessions/revoke` | same | Close one (`sessionId`) or all. |
| `POST /team/:userId/reset-password` | same | Sends a link to the user's email and closes their sessions. |

Always filter by identity **and** `companyId`: an ORM reads `identityId: undefined` as «no filter».

**Online ≠ valid session.** «En línea» means a live socket (the app is open), from the socket server's presence map,
pushed as `team:presence` to the company room. With more than one server instance, keep presence in Redis.

---

## 5. Password recovery

```ts
// POST /auth/forgot-password — rate limited (emailBlastLimit, blueprint 13)
export async function forgotPassword(req: Request, res: Response) {
  const { email } = forgotSchema.parse(req.body);
  const identity = await db.identity.findUnique({ where: { email: email.toLowerCase() } });
  if (identity?.active) await issuePasswordResetLink(identity);   // the ONE gate, also used by the admin reset
  res.json({ success: true, message: 'Si el correo está registrado, te enviamos un enlace para restablecer la contraseña.' });
}
```

- Same message, status and (roughly) timing for existing and unknown emails: no account enumeration.
- `issuePasswordResetLink`: random token, stored **hashed**, short life (≤ 1 h), deletes previous tokens. One function;
  two copies drift.
- Nobody but the owner chooses the password: an admin can only send the link.
- Using the link sets `password_changed_at = now()` and marks every session `PASSWORD_RESET`. `authenticate` rejects any
  token whose `iat` < `password_changed_at` (1 s grace) — this also covers tokens without `sid`.

---

## 6. Frontend list

```vue
<li v-for="s in sessions" :key="s.id" class="flex items-center justify-between gap-3 border-b border-border py-3">
  <div class="min-w-0">
    <p class="text-foreground">{{ s.device ?? 'Dispositivo desconocido' }}
      <span v-if="s.current" class="rounded-full border border-success/20 bg-success/10 px-2 text-success">Este dispositivo</span>
    </p>
    <p class="text-sm text-muted-foreground">{{ s.place ?? '—' }} · Última actividad {{ formatRelativeTime(s.lastSeenAt) }}</p>
  </div>
  <button class="text-danger" :disabled="busyId === s.id" @click="revoke(s)">
    {{ busyId === s.id ? 'Cerrando…' : 'Cerrar sesión' }}
  </button>
</li>
```

```ts
async function revoke(s: SessionRow) {
  const ok = await confirmDialog('Cerrar sesión', `Se cerrará la sesión en «${s.device ?? 'este dispositivo'}».`, 'Cerrar sesión', { tone: 'danger' });
  if (!ok) return;
  busyId.value = s.id;
  try { await api.sessions.revoke(s.id); notify('Sesión cerrada'); await reload(); }
  catch (err) { notify(normalizeApiError(err).message, 'error'); }
  finally { busyId.value = null; }
}
```

Also: «Cerrar las demás» on the profile, «Sesiones abiertas» in the team row menu (`<RowMenu>`), and the four list
states (`—` first load, data, `<EmptyState>`, error + retry).

---

## 🤖 Instructions for AI Agents

1. Never sign a session token outside `issueSession`; always include `sid`.
2. Never store raw refresh or reset tokens; hash them.
3. A refresh token that is neither current nor previous revokes the session (`REUSE`). Do not «just reject» it.
4. Password change / reset updates `password_changed_at`; `authenticate` compares it with `iat`.
5. «Forgot password» returns the uniform message; never «correo no encontrado».
6. Session UI: `formatRelativeTime`, «Este dispositivo» badge, `confirmDialog(…, { tone: 'danger' })`, `notify()`.
7. Frontend refresh mechanics are blueprint 06 — do not duplicate them here.
