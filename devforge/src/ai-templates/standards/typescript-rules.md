# ⚡ DEVFORGE TypeScript Rules

## 1. Strict Configuration

All projects must run with `strict: true` (which includes `noImplicitAny` and `strictNullChecks`) and `noUncheckedIndexedAccess: true`. Never relax `tsconfig.json` to make an error go away.

## 1-bis. Banned Escape Hatches

- `any` (explicit or `as any`). Unknown input is `unknown` and gets narrowed (Zod or a type guard). The only exception is a typed boundary to an untyped library, with a one-line comment saying why.
- `// @ts-ignore`, `// @ts-nocheck`. If a line really needs it, use `// @ts-expect-error <reason>` so it fails when the cause is fixed.
- Non-null assertions (`user!.id`) on data that comes from the network, storage or `find()`. Handle the `undefined`.
- Double casts (`x as unknown as T`) outside tests.
- `devforge audit` reports `TS_NOCHECK`, `TS_IGNORE` and `EXPLICIT_ANY`; a new one fails the audit.

## 2. Type Inference vs Explicit Typing

- Explicitly type public interfaces, function parameters, component props, and API return values.
- Let TypeScript infer obvious local variables (e.g. `const name = "John"` instead of `const name: string = "John"`).

## 3. Zod as Single Source of Truth

Whenever runtime data enters the application (API responses, user inputs, query params, local storage), validate it with **Zod** and infer the TypeScript type using `z.infer<typeof Schema>`:

```typescript
import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['admin', 'member', 'guest']),
  createdAt: z.string().datetime(),
});

export type User = z.infer<typeof UserSchema>;
```

## 4. Discriminated Unions for State

Avoid multiple boolean flags (`isLoading`, `isError`, `isSuccess`). Prefer discriminated unions for complex state transitions:

```typescript
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };
```
