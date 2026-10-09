# ⚡ DEVFORGE AGENTS SPECIFICATION (Universal AI Protocol)

<!-- Compatible with: Antigravity, OpenAI Codex, Google Gemini, and autonomous AI agents -->

## 🚨 MANDATORY PRE-FLIGHT CHECKLIST (DO NOT SKIP)

Before generating ANY component, file, or view, you MUST mentally verify and strictly enforce these 8 checkpoints:

1. **[ ] ZERO HARDCODED DATA**:
   - Strictly banned: `const items = [ ... ]`, `const records = [ ... ]` or dummy metrics written statically inside `.vue` or `.tsx`.
   - Every piece of data MUST come from typed `props`, a service (`services/`), or a reactive composable/hook.
2. **[ ] MANDATORY PAGINATION & ZERO OVER-FETCHING**:
   - Strictly banned: Querying lists without pagination parameters (`page` & `pageSize`, or `first` & `after`). Never load all rows in a single batch.
   - Strictly banned: Requesting database fields not displayed on screen. In GraphQL, use strict field queries/fragments. In REST, request sparse fieldsets (`?fields=...`).
3. **[ ] AUTOMATIC LOCALIZED FORMATTING**:
   - Never render raw numbers as currency (`17870000` or `"$ " + amount`). Use `formatCurrency(amount)` from `@/core/formatters/formatters` or `Intl.NumberFormat`.
   - Never render raw quantities or percentages (`1234567.891`, `toFixed(2)`, `value + "%"`). Use `formatNumber(value)` and `formatPercent(value)`; commas and dots follow the country locale (`es-DO` -> `1,234,567.89`, `es-CO` -> `1.234.567,89`).
   - Never display raw ISO date strings (`"2026-10-05T15:50:00Z"`). Use `formatDate(date)` or `formatRelativeTime(date)`.
   - Never display unformatted phone digits (`8095781234`). Use `formatPhoneNumber(phone, country)` -> `(809) 578-1234` (national) or `+1 (809) 578-1234` (international).
   - Configure the country once with `setFormatCountry('<CODE>')` in the entrypoint.
   - Fallback for null/undefined/empty: always render `—` (em-dash), never `"null"`, `"undefined"` or blank spaces.
   - Dates in the business time zone: never `toLocaleDateString()` / `timeZone: 'UTC'` by hand. Currency comes from the document, never `currency: 'DOP'` written in code.
4. **[ ] ZERO SPANGLISH / 100% SPANISH**:
   - If the user/app is in Spanish, NOT A SINGLE English word is permitted in UI text, table headers, buttons, or statuses.
   - Banned: `Close`, `Save`, `Status`, `Amount`, `Actions`, `Flagged`, `Settled`, `Pending`.
   - Required: `Cerrar`, `Guardar`, `Estado`, `Monto`, `Acciones`, `Observado`, `Completado`, `Pendiente`.
5. **[ ] ZERO CYBERPUNK / ZERO NEON GAMER**:
   - Strictly banned Tailwind classes: `cyan-*`, `teal-*`, `neon-*`, glowing borders, radioactive greens (`#00ff9d`), or deep cyan backgrounds.
   - Required palette: Neutral zinc in both themes via semantic tokens (`bg-background`, `bg-surface`, `text-foreground`, `text-muted-foreground`, `border-border`) and soft-tint badges (`bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20`).
6. **[ ] VUE 3 / REACT LOGIC SAFETY**:
   - Protect all nullables: Always use optional chaining `record?.cliente?.nombre` to prevent `Cannot read properties of null` crashes.
   - Never mutate props directly: Emit events `emit('close')` or `emit('update:modelValue', val)`.
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
   - Required: Flickerless (`devforge add flickerless`), `<SelectField>` (`select`), `<DatePicker>` / `<DateRangeFilter>` (`dates`), `<ListPager>` (`pagination`), `confirmDialog()` / `notify()` (`feedback`), `<ModalShell>` / `<DrawerShell>` / `<RowMenu>` (`overlays`), `<EmptyState>` / `<ListStaleNotice>` (`list-states`), `<MoneyInput>` / `<MaskedInput>` (`inputs`), `<BatchProgressModal>` (`batch`). Rules: `.ai/standards/ui-components.md`.

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
- **TypeScript Rules**: `.ai/standards/typescript-rules.md`

---

## 3. Blueprints Directory (Read Before Coding)

- **API Clients & SDKs**: `.ai/blueprints/01-openapi-sdk.md`
- **Dynamic / Schema-Driven Forms**: `.ai/blueprints/02-schema-forms.md`
- **Data-Grids & URL Query Synchronization**: `.ai/blueprints/03-datagrid-url-sync.md`
- **Role-Based Access Control (RBAC/ABAC)**: `.ai/blueprints/04-rbac-matrix.md`
- **In-App DevTools & Scenario Simulator**: `.ai/blueprints/05-in-app-devtools.md`
- **Enterprise Auth & Silent Refresh Queue**: `.ai/blueprints/06-auth-session.md`
- **Strict Pagination & GraphQL Query Optimization**: `.ai/blueprints/07-graphql-pagination.md`

---

## 4. Code Standards & File Structure

```text
src/
├── app/               # Router, providers, app shell
├── core/              # Agnostic utilities, formatters, permission engines, HTTP clients
│   ├── auth/          # Silent refresh queue & token storage
│   ├── errors/        # normalizeApiError
│   ├── export/        # exportToCSV
│   ├── formatters/    # Localized currency, number, date, phone formatters
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
