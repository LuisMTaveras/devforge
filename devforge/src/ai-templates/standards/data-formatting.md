# ⚡ DEVFORGE Data Formatting & Localization Standards

<!-- Mandatory data formatting rules for currency, numbers, dates, phone numbers, and null values -->

## 1. Core Formatting Directives

Every user-facing data point must pass through localized, standardized formatters. Raw database representations and ad-hoc string concatenations are **strictly forbidden**.

### 1.1 Country Preset (Configured Once at Scaffold Time)

**Default country: República Dominicana** (`es-DO`, `DOP`, `(809) 578-1234`). The country chosen during the kickoff (`.ai/standards/project-kickoff.md`) sets locale, currency, number separators and phone mask **for the whole project** in a single call. Always write the call explicitly, even for República Dominicana, so the choice is visible in the code:

```typescript
// main.ts / main.tsx (scaffolded with `devforge add formatters`)
import { setFormatCountry } from '@/core/formatters/formatters';

setFormatCountry('DO'); // es-DO · DOP · (809) 578-1234
```

| Country                   | Code | Locale  | Currency | Number         | Phone (national)    |
| ------------------------- | ---- | ------- | -------- | -------------- | ------------------- |
| República Dominicana      | `DO` | `es-DO` | `DOP`    | `1,234,567.89` | `(809) 578-1234`    |
| Estados Unidos            | `US` | `en-US` | `USD`    | `1,234,567.89` | `(555) 123-4567`    |
| Puerto Rico               | `PR` | `es-PR` | `USD`    | `1,234,567.89` | `(787) 123-4567`    |
| México                    | `MX` | `es-MX` | `MXN`    | `1,234,567.89` | `(55) 1234-5678`    |
| Perú                      | `PE` | `es-PE` | `PEN`    | `1,234,567.89` | `912 345 678`       |
| Colombia                  | `CO` | `es-CO` | `COP`    | `1.234.567,89` | `(300) 123-4567`    |
| España                    | `ES` | `es-ES` | `EUR`    | `1.234.567,89` | `612 34 56 78`      |
| Chile                     | `CL` | `es-CL` | `CLP`    | `1.234.567,89` | `9 1234 5678`       |
| Argentina                 | `AR` | `es-AR` | `ARS`    | `1.234.567,89` | —                   |

- **Banned**: Choosing separators by hand (`toFixed(2)`, `.replace('.', ',')`, regex thousands separators).
- **Required**: Separators (comma vs. dot) always come from the locale via `Intl.NumberFormat`.
- **Never** pass `locale` / `currency` in each call "just in case": rely on the project default. Pass them only when one specific value must differ (e.g. a USD amount in a DOP app: `formatCurrency(amount, { currency: 'USD' })`).
- The exact signatures are in `.ai/standards/module-api.md` §1. Do not use functions that are not listed there.

---

## 2. Currency & Monetary Values

- **Banned**: Writing raw numbers (`17870000`) or manual concatenation (`"$" + amount`).
- **Required**: Use `Intl.NumberFormat` or the core `formatCurrency()` utility.
- **Rules**:
  - Respect the project's configured currency (e.g., `USD`, `COP`, `MXN`, `EUR`).
  - Always render two decimal places for financial precision (`RD$17,870,000.00` in `es-DO`, `$ 17.870.000,00` in `es-CO`).
  - Align numbers to the right in data tables (`text-right font-mono tabular-nums`).

```typescript
import { formatCurrency } from '@/core/formatters/formatters';

// Usage:
formatCurrency(17870000); // "RD$17,870,000.00" (es-DO) | "$ 17.870.000,00" (es-CO)
```

---

## 2.1 Numbers, Quantities & Percentages

- **Banned**: Rendering raw numbers (`1234567.891`), `toFixed()` for display, or `value + "%"`.
- **Required**: Use `formatNumber()` and `formatPercent()`; thousands and decimal separators follow the country.
- **Rules**:
  - Quantities, counters and KPIs: `formatNumber()` (up to 2 decimals by default).
  - Ratios (`0.125`): `formatPercent(value)`. Already 0-100 values (`12.5`): `formatPercent(value, { isRatio: false })`.
  - Align numbers to the right in tables (`text-right font-mono tabular-nums`).

```typescript
import { formatNumber, formatPercent } from '@/core/formatters/formatters';

formatNumber(1234567.891);                // "1,234,567.89" (es-DO) | "1.234.567,89" (es-CO)
formatPercent(0.125);                     // "12.5%" (es-DO)        | "12,5%" (es-CO)
formatPercent(12.5, { isRatio: false });  // "12.5%"
```

---

## 3. Dates & Timestamps

- **Banned**: Displaying raw ISO strings (`"2026-10-05T15:50:00Z"`) or naive slicing (`date.split('T')[0]`).
- **Banned**: `toLocaleDateString()` / `toLocaleTimeString()` and `timeZone: 'UTC'` written by hand: they format in the
  time zone of the PROCESS. A server pinned to UTC shows 9:00 p. m. in Santo Domingo as the next day. `devforge audit` rejects them.
- **Required**: `formatDate()` / `formatTime()` / `formatRelativeTime()`. They use `formatConfig.timeZone`, the business
  time zone (`America/Santo_Domingo` by default; `setFormatCountry()` sets the country's).
- **Filters**: a calendar day is a day key (`YYYY-MM-DD`), not a `Date`. Build ranges with `@/core/dates/date-range`
  (`todayKey()`, `resolveRange()`), never with `new Date('2026-09-03')` as an upper bound (that is the START of the day in UTC).
- **Rules**:
  - Tables / Lists: Short or medium date (`"11 sept 2026"` or `"11 sept 07:51"`).
  - Activity Feeds / Logs: Relative time (`"hace 5 minutos"`, `"hace 2 horas"`).
  - Detail Drawers: Full localized timestamp (`"11 de septiembre de 2026, 15:30"`).

```typescript
import { formatDate, formatRelativeTime } from '@/core/formatters/formatters';

// Usage:
formatDate('2026-09-11T07:51:00Z', 'datetime'); // "11 sept de 2026, 03:51 a. m." (RD, UTC-4)
formatTime('2026-10-06T01:00:00Z');             // "9:00 p. m." (still Oct 5 in RD)
formatRelativeTime('2026-10-05T15:45:00Z');     // "hace 5 minutos"
```

---

## 4. Phone Numbers & National Identifiers

- **Banned**: Unformatted digit strings (`"8095781234"`, `"3001234567"` or `"5512345678"`).
- **Required**: Use `formatPhoneNumber()` with the visual grouping of the target country.
  - **National** (default, for users inside the country): `(809) 578-1234`
  - **International** (multi-country apps, exports, contact cards): `+1 (809) 578-1234`
- Masks per country:
  - República Dominicana (`DO`, area codes 809 / 829 / 849): `(809) 578-1234` ➔ `+1 (809) 578-1234`
  - Estados Unidos / Puerto Rico (`US`, `PR`): `(555) 123-4567` ➔ `+1 (555) 123-4567`
  - Colombia (`CO`): `(300) 123-4567` ➔ `+57 (300) 123-4567`
  - México (`MX`): `(55) 1234-5678` ➔ `+52 (55) 1234-5678`
  - España (`ES`): `612 34 56 78` ➔ `+34 612 34 56 78`
  - Chile (`CL`): `9 1234 5678` ➔ `+56 9 1234 5678`
  - Perú (`PE`): `912 345 678` ➔ `+51 912 345 678`
- Input with or without country code, dashes or spaces is accepted (`809-578-1234`, `+1 809 578 1234`).
- Store phones as digits in the database; format only at render time.
- **While typing** (forms), mask live with `<MaskedInput mask="phone">` / `formatPhoneInput()`, and the cédula / RNC
  with `mask="cedula"` (`001-1234567-8`), `mask="rnc"` (`1-01-23456-7`) or `mask="taxId"` (auto). Save `onlyDigits(value)`.
  When a form opens for editing, the raw DB value is normalized by the same mask (`devforge add inputs`).
- **Money fields** use `<MoneyInput>`: the model is a number or `null`, never a formatted string.

```typescript
import { formatPhoneNumber, setFormatDefaults } from '@/core/formatters/formatters';

// Usage:
formatPhoneNumber('8095781234', 'DO');                  // "(809) 578-1234"
formatPhoneNumber('18295781234', 'DO');                 // "(829) 578-1234"
formatPhoneNumber('8095781234', 'DO', 'international'); // "+1 (809) 578-1234"

// Project-wide international display:
setFormatDefaults({ phoneDisplay: 'international' });
```

---

## 5. Nullable & Empty Values

- **Banned**: Showing `"null"`, `"undefined"`, `"NaN"`, or leaving an empty whitespace in table cells.
- **Required**: Display a subtle, consistent em-dash (`—`) with muted text color (`text-muted-foreground`, readable in light and dark themes).

```typescript
import { formatFallback } from '@/core/formatters/formatters';

// Usage:
formatFallback(record.notas); // Returns the value or "—"
```
