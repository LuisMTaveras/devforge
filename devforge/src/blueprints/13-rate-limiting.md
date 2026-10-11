# ⚡ BLUEPRINT 13: Rate Limiting & Brute Force

## 🎯 Goal

A limit only works if it measures the right dimension. «1,000 requests per minute **per IP**» is at once too little
(fifty people behind one office NAT share one budget) and too much (an attacker can try 1,000 passwords or queue 1,000
PDFs). The right dimensions are **who asks** and **what the request costs**, not which address the packet came from.

And brute force is not a rate-limit problem at all: a per-IP limit cannot see a distributed attack against one account.
That is a separate, per-**account** guard with progressive wait and lock.

> Reference pattern proven in production (Snowlr: `middleware/rate-limit.ts`, `modules/auth/login-guard.service.ts`).
> Snowlr uses `express-rate-limit` + `ioredis` with a hand-written store; adapt to your stack. The invariants are not
> optional.

---

## 1. Invariants

1. **One file declares every limit** (`middleware/rate-limit.ts`). Routes import a profile; they never call
   `rateLimit({...})` themselves. A guard test enforces it (§7).
2. **The counter lives in a shared store** (Redis), never only in process memory: a restart (PM2 memory cap) resets an
   attacker's counter, cluster mode multiplies every limit by the instance count, and two environments on one host step
   on each other. Prefix keys with the environment: `rl:production:`, `rl:demo:`.
3. **If Redis is down, count in memory — never fail open.** A limit an attacker can switch off by knocking over the cache
   is not a limit. (The opposite of a distributed lock for a sync job, where failing open only costs a duplicate run.)
4. **`trust proxy` is the real number of trusted hops. NEVER `true`.** (§2)
5. **The key is identity when there is a session, IP only otherwise.** (§3)
6. **Expensive work is charged to the tenant**, not the user. (§4)
7. **Every 429 carries a machine `code`, a Spanish message and `Retry-After`.** (§5)
8. **Brute force is per account**, with progressive delay and lock. (§6)
9. Limits are **data**: read the numbers from env vars so a large office can get more air without a deploy.

---

## 2. `trust proxy`: the setting that silently disables every limit

`app.set('trust proxy', true)` does not mean «I am behind a proxy». It means **«believe any `X-Forwarded-For`»**, and
Express derives `req.ip` from it. `req.ip` becomes a value **the client writes**:

- An attacker sends a new `X-Forwarded-For` on each request and gets a fresh bucket every time. Every IP limit —login
  included— is decorative.
- The audit log stores whatever IP the attacker typed, so the incident trail is useless too.

```ts
// app.ts — one hop: Caddy / Nginx on the same host. Cloudflare in front → 2. Count real hops, never guess high.
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS ?? 1));
```

Both extremes (`true`, or a number larger than the real hops) hand you an IP the client controls.

---

## 3. Who pays: identity first

A tiny middleware runs **before** any limiter and picks the bucket. It verifies only the JWT **signature** (HMAC,
microseconds); whether the user is still active is `authenticate`'s job, later.

```ts
export function identifyRateSubject(req: Request, _res: Response, next: NextFunction) {
  const payload = verifySignatureOnly(readToken(req));          // null on missing / expired / bad signature
  if (payload && !payload.partial) {                             // MFA-pending / profile-select tokens are NOT identity
    req.rateSubject = { user: `user:${payload.userId}`, company: payload.companyId ? `company:${payload.companyId}` : null };
  } else {
    req.rateSubject = { user: `ip:${normalizeIp(req.ip)}`, company: null };
  }
  next();
}

// ::ffff:1.2.3.4 → 1.2.3.4 ; IPv6 collapsed to its /64 (a home /64 is billions of addresses: counting each = not counting)
function normalizeIp(ip = ''): string { /* … */ }
```

A broken token never buys a better budget: it falls to the narrowest bucket (IP).

---

## 4. Profiles

| Profile | Window | Max | Key | Protects |
| --- | --- | --- | --- | --- |
| `floodLimit` | 1 min | 3000 | IP | Anonymous flood. Mounted first, before host/CORS checks. |
| `generalLimit` | 1 min | 600 | identity | Ceiling for every authenticated request (scraping with a valid login). |
| `writeLimit` | 1 min | 120 | identity | Write loops (half-written data). **Stacks** on `generalLimit`. |
| `documentLimit` | 5 min | 300 | **company** | PDF, ticket, statement and their delivery. |
| `reportLimit` | 5 min | 60 | **company** | Reports, exports, backups. |
| `loginLimit` | 15 min | 15 | IP + account | Brute force from one place. Counts failures only. |
| `secretGuessLimit` | 15 min | 10 | IP | Reset token, invitation token, TOTP code, password confirmation. |
| `emailBlastLimit` | 1 h | 5 | IP + account | «Forgot password» bombing and sender reputation. |
| `probeLimit` | 1 min | 20 | IP | Enumeration of emails / slugs. |
| `webhookLimit(name)` | 1 min | 30–300 | IP + route + tenant | Provider deliveries (they share a few IPs). |

Two expensive budgets, not one: a cashier prints a receipt every 20 s, nobody exports the ledger twice in a row. Charge
them **per company** — per user, five users of the same company multiply the budget by five. Recognize expensive routes
by **URL shape** (`/pdf`, `/export`, `/reports`), not by tagging each route: the next report someone adds will otherwise
slip through. A cheap false positive costs nothing; a missed Chromium costs the server.

---

## 5. The 429 the frontend can read

```ts
function buildHandler(profile: string, message: string) {
  return (req: Request, res: Response, _next: NextFunction, opts: Options) => {
    const retryAfterSeconds = Math.ceil(((req as any).rateLimit?.resetTime?.getTime() - Date.now()) / 1000) || 60;
    logger.warn('[rate-limit]', { profile, subject: req.rateSubject?.user });
    res.setHeader('Retry-After', String(retryAfterSeconds));
    res.status(opts.statusCode).json({
      success: false,
      code: 'RATE_LIMITED',                  // the client branches on this, never on the text
      error: message,                        // Spanish, shown as-is by normalizeApiError()
      details: { profile, retryAfterSeconds },
    });
  };
}

export const reportLimit = makeLimiter({
  name: 'report', windowMs: 5 * 60_000, max: Number(process.env.RATE_LIMIT_REPORT_PER_5MIN ?? 60),
  key: req => req.rateSubject?.company ?? req.rateSubject!.user,
  message: 'Hay demasiados reportes o exportaciones en proceso. Espera unos minutos e intenta de nuevo.',
});
```

Never an English default (`Too many requests`) reaching the user.

---

## 6. Brute force: per account, progressive

```ts
// login-guard.service.ts — called by the login route, around the password check
const WINDOW = 15 * 60, PAIR_THRESHOLD = 5, ACCOUNT_THRESHOLD = 20;
const BASE_BLOCK = 15 * 60, MAX_BLOCK = 2 * 60 * 60, ESCALATION = 24 * 60 * 60;

export async function assertLoginAllowed(email: string, ip: string) {
  const worst = Math.max(await blockTtl(`login:block:pair:${email}:${ip}`), await blockTtl(`login:block:acct:${email}`));
  if (worst > 0) throw new AppError(429, 'LOGIN_BLOCKED', 'Cuenta bloqueada temporalmente por intentos fallidos.', { retryAfterSeconds: worst });
}

export async function recordLoginFailure(email: string, ip: string) {
  const [pair, acct] = await Promise.all([bump(`login:pair:${email}:${ip}`, WINDOW), bump(`login:acct:${email}`, WINDOW)]);
  await sleep(Math.min(250 * 2 ** (pair - 3), 3000) * Number(pair >= 3));   // progressive wait from attempt 3
  if (pair >= PAIR_THRESHOLD || acct >= ACCOUNT_THRESHOLD) {
    const level = await bump(`login:lvl:${email}`, ESCALATION);            // each block doubles, capped
    await setBlock(acct >= ACCOUNT_THRESHOLD ? `login:block:acct:${email}` : `login:block:pair:${email}:${ip}`,
      Math.min(BASE_BLOCK * 2 ** (level - 1), MAX_BLOCK));
    await notifyAccountOwner(email);                                         // email + audit, throttled per window
  }
}
export async function recordLoginSuccess(email: string, ip: string) { await clear(`login:pair:${email}:${ip}`); }
```

- The **pair** (account + IP) locks fast; the **account** counter catches the distributed attack across many IPs.
- Same response and timing whether the account exists or not (no enumeration).
- Success clears the pair, not the escalation level.

---

## 7. Guard test (zero debt)

```ts
// rate-limit.guard.test.ts
it('no route declares its own limiter', () => {
  const offenders = globSync('src/**/*.ts')
    .filter(f => !f.endsWith('middleware/rate-limit.ts') && !f.endsWith('.test.ts'))
    .filter(f => /\brateLimit\s*\(/.test(readFileSync(f, 'utf8')));
  expect(offenders).toEqual([]);
});
it('trust proxy is never true', () => {
  expect(readFileSync('src/app.ts', 'utf8')).not.toMatch(/trust proxy['"],\s*true/);
});
```

---

## 🤖 Instructions for AI Agents

1. Need a new limit? Add a profile to `middleware/rate-limit.ts` and import it. Never `rateLimit()` in a route.
2. Never write `app.set('trust proxy', true)`. Ask the user how many proxies sit in front if you do not know.
3. Key by identity (`user:`) or company (`company:`); IP only for anonymous routes.
4. Every limiter message is Spanish and the response carries `code`, `Retry-After` and `details.retryAfterSeconds`.
5. Login, reset tokens, TOTP and invitations go through the per-account guard, not just a per-IP limit.
6. Do not invent a Redis store package (`rate-limit-redis` etc.): check `package.json` first; if missing, ask or write
   the store against the Redis client the project already has.
