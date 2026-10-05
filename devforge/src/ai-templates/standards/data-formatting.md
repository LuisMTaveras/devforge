# ⚡ DEVFORGE Data Formatting & Localization Standards

<!-- Mandatory data formatting rules for currency, dates, phone numbers, and null values -->

## 1. Core Formatting Directives

Every user-facing data point must pass through localized, standardized formatters. Raw database representations and ad-hoc string concatenations are **strictly forbidden**.

---

## 2. Currency & Monetary Values

- **Banned**: Writing raw numbers (`17870000`) or manual concatenation (`"$" + amount`).
- **Required**: Use `Intl.NumberFormat` or the core `formatCurrency()` utility.
- **Rules**:
  - Respect the project's configured currency (e.g., `USD`, `COP`, `MXN`, `EUR`).
  - Always render two decimal places for financial precision (`$ 17.870.000,00`).
  - Align numbers to the right in data tables (`text-right font-mono tabular-nums`).

```typescript
import { formatCurrency } from '@/core/formatters/formatters';

// Usage:
formatCurrency(17870000); // "$ 17.870.000,00" (or "$17,870,000.00")
```

---

## 3. Dates & Timestamps

- **Banned**: Displaying raw ISO strings (`"2026-10-05T15:50:00Z"`) or naive slicing (`date.split('T')[0]`).
- **Required**: Use `Intl.DateTimeFormat` or `formatDate()` / `formatRelativeTime()`.
- **Rules**:
  - Tables / Lists: Short or medium date (`"11 sept 2026"` or `"11 sept 07:51"`).
  - Activity Feeds / Logs: Relative time (`"hace 5 minutos"`, `"hace 2 horas"`).
  - Detail Drawers: Full localized timestamp (`"11 de septiembre de 2026, 15:30"`).

```typescript
import { formatDate, formatRelativeTime } from '@/core/formatters/formatters';

// Usage:
formatDate('2026-09-11T07:51:00Z', 'datetime'); // "11 sept 2026, 07:51"
formatRelativeTime('2026-10-05T15:45:00Z');     // "hace 5 minutos"
```

---

## 4. Phone Numbers & National Identifiers

- **Banned**: Unformatted digit strings (`"3001234567"` or `"5512345678"`).
- **Required**: Format with international prefix and visual grouping according to target country:
  - Colombia (`CO`): `+57 (300) 123-4567`
  - México (`MX`): `+52 (55) 1234-5678`
  - Estados Unidos (`US`): `+1 (555) 123-4567`
  - España (`ES`): `+34 612 34 56 78`

```typescript
import { formatPhoneNumber } from '@/core/formatters/formatters';

// Usage:
formatPhoneNumber('3001234567', 'CO'); // "+57 (300) 123-4567"
```

---

## 5. Nullable & Empty Values

- **Banned**: Showing `"null"`, `"undefined"`, `"NaN"`, or leaving an empty whitespace in table cells.
- **Required**: Display a subtle, consistent em-dash (`—`) with muted text color (`text-zinc-500`).

```typescript
import { formatFallback } from '@/core/formatters/formatters';

// Usage:
formatFallback(record.telefono); // Returns "+57 (300)..." or "—"
```
