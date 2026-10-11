# ⚡ DEVFORGE AGENTS SPECIFICATION (Universal AI Protocol)

<!-- Compatible with: Antigravity, OpenAI Codex, Google Gemini, and autonomous AI agents -->

## 🚨 MANDATORY PRE-FLIGHT CHECKLIST (DO NOT SKIP)

Before generating ANY component, file, or view, you MUST enforce these 11 checkpoints, and close every task with checkpoint 11:

1. **[ ] ZERO HARDCODED DATA**:
   - Banned: business records written in a component or composable (`const clientes = [{ … }]`, fake totals like `'RD$17.8M'`, demo rows «para que se vea algo»). A screen that shows data gets it from a service (`modules/<feature>/services/`) through a hook / composable, typed end to end.
   - Allowed: UI configuration that is not data (column definitions, tab lists, the options of a closed enum the backend also fixes). If a list could change without a deploy, it is data: ask the backend for it.
   - No backend yet: mocks live ONLY in MSW (`src/mocks/`), with async delay and real pagination, and you say so. The component code is identical to production.
2. **[ ] MANDATORY PAGINATION & ZERO OVER-FETCHING**:
   - Banned: a list request without `page` + `pageSize` (or `first` + `after`); loading everything and paginating in the client; selecting fields the screen does not render.
   - Required: the server returns the page AND the total (`totalCount` / `hasNextPage`); the list ends with `<ListPager :total :has-more>`; GraphQL uses fragment colocation, REST uses sparse fieldsets (`?fields=…`) when the backend supports them. Contract: `.ai/blueprints/07-graphql-pagination.md`.
3. **[ ] AUTOMATIC LOCALIZED FORMATTING**:
   - Banned: raw money (`17870000`, `"$ " + amount`, `toFixed(2)`), raw numbers (`1234567.891`), raw ISO dates, `toLocaleDateString()` / `toLocaleString()` / `new Intl.NumberFormat()` written in a component, `timeZone: 'UTC'`, raw phones (`8095781234`), and `"null"` / `"undefined"` / `0` shown for a missing value.
   - Required: ONLY the formatters from `@/core/formatters/formatters` (`formatCurrency`, `formatNumber`, `formatPercent`, `formatDate`, `formatTime`, `formatRelativeTime`, `formatPhoneNumber`); `setFormatCountry('<CODE>')` once in the entrypoint (default `DO`: `1,234,567.89`, `RD$1,500.00`, `(809) 578-1234`); `—` for null / undefined / empty.
   - Money: the currency comes from the document (`formatCurrency(f?.total, { currency: f?.moneda })`), never `currency: 'DOP'` in code. Amounts are right-aligned with `tabular-nums`.
4. **[ ] ZERO SPANGLISH / 100% SPANISH UI**:
   - The UI language is the one agreed at kickoff (default: Spanish). EVERY visible string is in that language: labels, placeholders, buttons, table headers, badges, toasts, dialogs, empty states, validation and backend error messages shown to the user, `aria-label` and `title`.
   - `Close` ➔ `Cerrar`, `Save` ➔ `Guardar`, `Status` ➔ `Estado`, `Amount` ➔ `Monto`, `Actions` ➔ `Acciones`, `Flagged` ➔ `Observado`, `Settled` ➔ `Completado`, `Pending` ➔ `Pendiente`, `Loading…` ➔ `Cargando…`, `No results` ➔ `Sin resultados`.
   - Code identifiers, commits and comments may stay in English; what the user reads may not.
5. **[ ] ZERO CYBERPUNK / ZERO NEON — TOKENS ONLY**:
   - Banned: `cyan-*`, `teal-*`, `neon-*`, glows, radioactive greens (`#00ff9d`), purple/indigo gradients, blur orbs, emoji in titles or buttons, and raw Tailwind palette classes for meaning (`bg-blue-600`, `text-red-500`, `bg-emerald-500/10`).
   - Required: the «Warm Slate» semantic tokens of `tokens.css` — surfaces `bg-background` / `bg-surface` / `bg-surface-raised`, text `text-foreground` / `text-muted-foreground` / `text-dim-foreground`, `border-border`, actions `bg-primary text-primary-foreground`, states `success` / `warning` / `danger`. Soft-tint badge: `rounded-full border border-success/20 bg-success/10 text-success` (same pattern with `warning`, `danger`; neutral: `border-border bg-surface text-muted-foreground`). The single action color is `primary` (graphite / ivory): no second «brand blue».
6. **[ ] VUE 3 / REACT LOGIC SAFETY**:
   - Null safety where the TYPE says it can be null (API payloads, optional props, `find()` results): `record?.cliente?.nombre ?? '—'`. Do not sprinkle `?.` on values that cannot be null: it hides bugs.
   - Never mutate props: Vue emits (`emit('update:modelValue', v)`), React lifts state (`onChange(v)`).
   - Every async action handles its three outcomes: pending (button disabled with its own text, no double submit), success (visible feedback), error (`normalizeApiError(err)` ➔ message to the user, never a raw `err.message` or a silent `catch {}`).
7. **[ ] DUAL THEME: LIGHT + DARK (MANDATORY)**:
   - Every project ships **Claro** and **Oscuro** themes plus **Sistema** (OS preference) from the first commit (`devforge add theme`).
   - Banned: Dark-only or light-only UIs, a color class without its other-theme pair (`bg-white` alone, `text-zinc-100` alone), hex colors inside components.
   - Required: Semantic tokens from `tokens.css`, `initTheme()` in the entrypoint, no-flash script in `index.html`, and a Claro / Oscuro / Sistema selector. Rules: `.ai/standards/theming.md`.
8. **[ ] ZERO HALLUCINATION (VERIFY, NEVER GUESS)**:
   - DEVFORGE functions: use only what `.ai/standards/module-api.md` lists. Check the file exists in `src/` before importing it; if it is missing, tell the user to run `devforge add <module>` — never rewrite a module from memory.
   - Never invent npm packages, versions, API endpoints, GraphQL fields, DB columns or env vars. Read `package.json`, `src/core/api/v1.d.ts` (or the GraphQL schema) and `.env.example` first. If it is not there, ASK the user (or, with their approval, mock it in MSW and say so explicitly).
   - Only run scripts that exist in `package.json`. The DEVFORGE CLI is the globally linked `devforge` command — **never `npx devforge`** (that npm package is an unrelated project).
   - Blueprint code is a reference pattern: adapt names to the real code. If a blueprint and an installed module disagree, the installed module wins.
   - If you are not sure, say so and ask. A short question is always better than plausible-looking invented code.
9. **[ ] STANDARD UI COMPONENTS (NEVER HAND-ROLLED)**:
   - Banned: Skeletons (`<Skeleton>`, `skeleton`, `animate-pulse`), full-screen spinners, native `<select>`, `<input type="date">`, `window.alert/confirm/prompt`, hand-written modal backdrops or closing on backdrop click (`@click.self`), ad-hoc pagination footers, and `0` / "Sin resultados" before the first response.
   - Required: Flickerless (`devforge add flickerless`), `<SelectField>` (`select`), `<DateField>` / `<DateRangeFilter>` (`dates`), `<ListPager>` (`pagination`), `confirmDialog()` / `notify()` (`feedback`), `<ModalShell>` / `<DrawerShell>` / `<RowMenu>` (`overlays`), `<EmptyState>` / `<ListStaleNotice>` (`list-states`), `<MoneyInput>` / `<MaskedInput>` (`inputs`), `<BatchProgressModal>` (`batch`). Rules: `.ai/standards/ui-components.md`.
10. **[ ] AUTHORIZATIONS & NOTIFICATIONS (SINGLE GATES)**:
   - Banned: exception permissions (`'descuentos:override_tope'`, `canOverrideCredit`, `bypassLimit`), hand-made «contraseña del supervisor» prompts, backend errors flattened to their message (`sendError(res, err.message)`, `.json({ error: err.message })`), `new Notification()` / `Notification.requestPermission()` on load, and `alert()` for notices.
   - Required: risky acts go to the authorization catalog and are checked when CONSUMED (`assertAuthorized` / `liftsBlock`, blueprint 08); the frontend installs the interceptor once and mounts `<AuthorizationDialog />` + `<AuthorizationAlerts />` (`devforge add authorizations`). Persistent notices go to the bell (`<NotificationCenter />`, `receiveNotification`, blueprint 09); ephemeral ones are `notify()`; decisions are `confirmDialog()`.
11. **[ ] DEFINITION OF DONE (RUN IT, DON'T ASSUME IT)**:
   - Typecheck passes (`npx tsc --noEmit` / `vue-tsc --noEmit`, or the project's script), the build passes, and the tests of what you touched pass. Report the real output; never claim a check you did not run.
   - `devforge audit` shows no NEW violation (existing project: compare against `.devforge-audit-baseline.json`).
   - The screen works in Claro AND Oscuro, at 375 px width, with keyboard only (Tab / Enter / Escape), and in its four data states: first load (`—`, no fake zeros), with data, empty (`EmptyState`) and error (message + retry).
   - Every new visible string is in the UI language and every number, date, phone and amount goes through a formatter.
   - If something could not be verified (no backend, no browser), say exactly what and why.

## Order of Truth (When Sources Disagree)

1. The user's explicit instruction in the current conversation.
2. The code actually installed in the project (`src/`, `package.json`).
3. `.ai/standards/module-api.md` (exact API of DEVFORGE modules).
4. `.ai/standards/*.md` (rules).
5. `.ai/blueprints/*.md` (reference patterns, adapt them — never paste blindly).

---

## 1. Project Philosophy & Core Directives

You are operating in a **DEVFORGE** enabled repository. Code generated or modified here MUST follow enterprise-grade architecture, strict type safety, zero hallucinated packages, and clean boundaries.

### Golden Rules

1. **Zero Guesswork / Single Source of Truth**: Look at `.ai/blueprints/` before inventing architectural solutions. If a blueprint exists for forms, API calls, tables, or permissions, FOLLOW IT STRICTLY.
2. **Interactive Greenfield Scaffolding & Calibration**:
   - When the user asks to start a new project from 0, **DO NOT** immediately dump code.
   - Execute the discovery protocol in `.ai/standards/project-kickoff.md`.
   - First, calibrate developer experience (Junior/Intermediate/Senior), recommend the optimal stack (giving the user final decision), and configure localization (Country/Currency). Then scope the MVP.
3. **Anti-AI Design Excellence (Enterprise SaaS Vibe)**:
   - All UI code must strictly adhere to `.ai/standards/ui-ux-principles.md`.
   - Follow Linear, Stripe, and Vercel aesthetics: quiet, clean, high-density, and highly legible.
   - Every project ships **light and dark themes** from day one. Follow `.ai/standards/theming.md`.
4. **Zero Hardcoded Data Directive**:
   - All data must flow asynchronously through the Service Layer (`modules/[domain]/services/`) and hooks/composables (`useQuery`, `useTransactions`).
   - If backend endpoints are pending, use **MSW (Mock Service Worker)** or a dedicated mock service adapter simulating async delay and pagination. The UI component code must be identical to production.
5. **Mandatory Pagination & Query Optimization**:
   - All listings must be paginated. Follow `.ai/blueprints/07-graphql-pagination.md`.
6. **Strict TypeScript**: No `any`, no implicit types. Always export contracts, interfaces, and Zod schemas.
7. **Resilience & Edge Cases**: Always handle loading, error, empty, and offline states. Never leave unhandled promise rejections.

---

## 2. Standards & Protocols (Read Before Coding)

Consult the standards under `.ai/standards/`:

- **Module API Reference (Source of Truth)**: `.ai/standards/module-api.md` (Exact exports of every `devforge add` module — nothing else exists)
- **Interactive Kickoff & Discovery**: `.ai/standards/project-kickoff.md` (Developer calibration & stack advisory)
- **Data Formatting & Localization**: `.ai/standards/data-formatting.md` (Currency, numbers, dates, phone numbers, null fallbacks)
- **Theming (Light + Dark)**: `.ai/standards/theming.md` (Semantic tokens, theme engine, Claro / Oscuro / Sistema selector)
- **UI/UX Design System**: `.ai/standards/ui-ux-principles.md` (Anti-AI rules, Zero-Spanglish, Soft-tint badges)
- **Complete Project Structure**: `.ai/standards/project-structure.md` (Domain-driven folder hierarchy)
- **Architecture Standards**: `.ai/standards/architecture-standards.md` (Zero hardcoded data, pagination, service layers)
- **TypeScript Rules**: `.ai/standards/typescript-rules.md` (no `any`, no `@ts-ignore`, Zod at the boundaries)
- **Standard UI Components**: `.ai/standards/ui-components.md` (Flickerless, SelectField, DateField, ListPager, dialogs, overlays, EmptyState, inputs, batch, authorizations, notifications)

---

## 3. Blueprints Directory (Read Before Coding)

- **API Clients & SDKs**: `.ai/blueprints/01-openapi-sdk.md`
- **Dynamic / Schema-Driven Forms**: `.ai/blueprints/02-schema-forms.md`
- **Data-Grids & URL Query Synchronization**: `.ai/blueprints/03-datagrid-url-sync.md`
- **Role-Based Access Control (RBAC/ABAC)**: `.ai/blueprints/04-rbac-matrix.md`
- **In-App DevTools & Scenario Simulator**: `.ai/blueprints/05-in-app-devtools.md`
- **Enterprise Auth & Silent Refresh Queue**: `.ai/blueprints/06-auth-session.md`
- **Strict Pagination & GraphQL Query Optimization**: `.ai/blueprints/07-graphql-pagination.md`
- **Authorizations (sign-off when consummated)**: `.ai/blueprints/08-authorizations.md`
- **Notifications (bell)**: `.ai/blueprints/09-notifications.md`

---

## 4. Code Standards & File Structure

```text
src/
├── app/               # Router, providers, app shell
├── core/              # Agnostic utilities, formatters, permission engines, HTTP clients
│   ├── auth/          # Silent refresh queue & token storage
│   ├── authorizations/ # Sign-off challenge, interceptor, live alerts
│   ├── batch/         # Batch progress state
│   ├── dates/         # Day keys, ranges and calendar in the business time zone
│   ├── errors/        # normalizeApiError
│   ├── export/        # exportToCSV
│   ├── feedback/      # confirmDialog / promptDialog / notify
│   ├── formatters/    # Localized currency, number, date, phone formatters + input masks
│   ├── notifications/ # Bell store (REST + socket)
│   ├── overlay/       # Escape layers & scroll lock
│   ├── pagination/    # Page state & summary
│   ├── permissions/   # RBAC ability engine
│   ├── theme/         # Light/Dark theme engine (initTheme, setThemePreference)
│   └── url-sync/      # URL query param synchronizer
├── modules/           # Business feature domains (self-contained)
│   └── [feature]/
│       ├── components/
│       ├── composables/ (or hooks/)
│       ├── services/
│       ├── types/
│       └── index.ts
└── shared/            # Design-system primitives (Button, Modal, Input, DataTable)
    └── styles/        # tokens.css (light + dark semantic tokens)
```
