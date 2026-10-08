# ⚡ DEVFORGE

> **The Universal Architecture & AI Orchestration Toolkit for Modern Developers**  
> Compatible with **Claude Code**, **Cursor**, **Codex**, **Antigravity**, **GitHub Copilot**, and any AI coding assistant. Works seamlessly across **Vue 3**, **React**, and fullstack repositories.

---

## 🚀 The Philosophy: Why DEVFORGE?

AI models are only as good as the context, constraints, and blueprints you give them. Instead of constantly re-explaining your architecture, folder structures, design rules, and data contracts every time you switch repositories or open a new chat:

1. **One Command Initialization**: `devforge init` deploys the Universal AI Context Layer into any repository in seconds.
2. **Deterministic CLI Auditor**: `devforge audit` scans code in 1 second to catch hardcoded arrays, neon cyberpunk colors, and Spanglish automatically.
3. **Interactive Discovery First**: Forces AI agents to calibrate developer level (Junior/Intermediate/Senior) and recommend the ideal stack before writing code.
4. **Anti-AI Design Excellence**: Injects UI/UX Pro Max principles (60-30-10 palette, 4px/8px grid, soft-tint badges, no generic purple gradients, zero Spanglish).
5. **Zero Hardcoded Data & Mandatory Pagination**: Mandates that 100% of data flow through typed services and reactive composables/hooks, always paginated, with zero over-fetching.
6. **Automatic Localized Formatting**: Built-in formatters for currency, numbers, percentages, dates, relative time, and phone numbers, configured per country (`setFormatCountry('DO')`).
7. **Light + Dark Themes by Default**: Every project ships Claro / Oscuro / Sistema themes with semantic design tokens (`devforge add theme`).
8. **Standard UI Components**: Flickerless loading instead of skeletons, `SelectField` combo, `DatePicker` / `DateRangeFilter` and `ListPager` pagination — the same in every project (`.ai/standards/ui-components.md`).
9. **Battle-Tested Blueprints**: High-leverage architectural patterns (OpenAPI SDK, Zod Schema forms, URL-synced tables, RBAC permissions, In-app devtools, Silent Refresh Auth, and GraphQL Pagination).

---

## 📦 What's Inside?

```text
your-project/
├── .ai/                      # 🧠 Universal AI Brain
│   ├── AGENTS.md             # For Antigravity, Gemini, OpenAI Codex
│   ├── CLAUDE.md             # For Claude Code / Anthropic
│   ├── .cursorrules          # For Cursor IDE
│   ├── copilot-instructions  # For GitHub Copilot
│   ├── blueprints/           # 📐 Production Architecture Recipes
│   │   ├── 01-openapi-sdk.md
│   │   ├── 02-schema-forms.md
│   │   ├── 03-datagrid-url-sync.md
│   │   ├── 04-rbac-matrix.md
│   │   ├── 05-in-app-devtools.md
│   │   ├── 06-auth-session.md
│   │   └── 07-graphql-pagination.md
│   └── standards/            # Governance & Design System
│       ├── project-kickoff.md     # Discovery interview & stack advisory
│       ├── data-formatting.md     # Currency, numbers, dates, phone rules
│       ├── theming.md             # Mandatory light + dark themes
│       ├── module-api.md          # Exact module API (anti-hallucination)
│       ├── ui-ux-principles.md    # Anti-AI design & UI UX Pro Max rules
│       ├── project-structure.md   # Greenfield folder & file hierarchy
│       ├── architecture-standards # Domain-driven feature layout & pagination
│       └── typescript-rules.md    # Strict types & Zod schemas
├── .claude/commands/         # ⚡ Native Slash Commands (/kickoff, /devforge)
└── .agents/skills/devforge/  # ⚡ Antigravity Native Skill
```

---

## 📐 The 7 Architectural Blueprints

| # | Blueprint | What It Solves | Canonical Recipe |
| :-: | :--- | :--- | :--- |
| **01** | **OpenAPI / Swagger to SDK** | 100% type-safe API clients and hooks without manual interfaces. | `01-openapi-sdk.md` |
| **02** | **Schema-Driven Forms (Zod)** | Reactive forms dynamically rendered and validated from a single schema. | `02-schema-forms.md` |
| **03** | **Data-Grid + URL-State Sync** | TanStack tables bidirectional sync with URL query params (`?page=2&search=foo`). | `03-datagrid-url-sync.md` |
| **04** | **Declarative RBAC / ABAC** | Clean CASL-style permissions (`<Can I="update" an="Invoice">`, `v-can`). | `04-rbac-matrix.md` |
| **05** | **In-App DevTools Cockpit** | Floating dev bar to switch roles, simulate 3G latency, and inject 500/401 errors. | `05-in-app-devtools.md` |
| **06** | **Enterprise Auth & Refresh Queue** | Silent token refresh queue preventing race conditions on parallel 401s. | `06-auth-session.md` |
| **07** | **Strict Pagination & GraphQL Query Optimization** | Always paginated queries, fragment colocation, and zero over-fetching from DB. | `07-graphql-pagination.md` |

---

## 🛠️ CLI Commands & Quickstart

### 1. Global Installation (Link once on your machine)

From inside the `devforge` directory:

```bash
npm link
```

Now `devforge` is globally available anywhere in your terminal!

### 2. Initialize in ANY Repository

Navigate to any existing or new project (React, Vue, Node, Python, etc.):

```bash
devforge init
```

### 3. Audit Your Code for AI Rule Compliance

Runs an automated scan for hardcoded arrays, neon colors, and Spanglish:

```bash
devforge audit
```

Example audit output:

```text
ℹ Auditing repository for DEVFORGE compliance in: C:\DEV\MiProyecto

Archivos escaneados: 24
Problemas encontrados: 2 en 1 archivo(s)

  [1] src\modules\clientes\ClientesTable.vue:14 (Zero Hardcoded Data)
      Detalle: Arreglo estático de datos incrustado en el componente.
  [2] src\modules\clientes\ClientesTable.vue:42 (Zero-Spanglish)
      Detalle: Palabra en inglés detectada en UI: 'Status'. Traducir al español.

Puntuación de Salud Arquitectónica: 95%
```

### 4. List All Available Blueprints and Modules

```bash
devforge list
```

### 5. Inject Ready-to-Use Code Modules

```bash
# Injects authentication engine + silent refresh queue + auth.store.ts
devforge add auth

# Injects universal API error normalizer (Laravel/Express/FastAPI/NestJS)
devforge add errors

# Injects UTF-8 BOM CSV & Excel data export utility
devforge add export

# Injects localized currency, number, date, and phone formatters
devforge add formatters

# Injects light/dark theme engine, tokens.css and useTheme() (Vue & React)
devforge add theme

# Injects pure TypeScript RBAC engine + <Can /> (React) + v-can (Vue)
devforge add rbac

# Injects bidirectional URL query param synchronizer
devforge add url-sync

# Injects Flickerless (skeleton replacement): FlickerlessSurface, FlickerlessValue, FlickerlessTableShell (Vue & React)
devforge add flickerless

# Injects the standard combo, SelectField.vue (replaces the native <select>)
devforge add select --vue

# Injects DatePicker (Vue & React) (single date / range) + DateRangeFilter.vue (Hoy, Ayer, Este mes… + rango)
devforge add dates --vue

# Injects ListPager (Vue & React): «Mostrando 11–20 de 57 facturas» + ‹ 2 / 6 ›
devforge add pagination --vue
```

Modules install their dependencies (`dates` -> `theme` + `select`, `pagination` -> `theme` + `formatters` + `flickerless`). `--vue` / `--react` installs only that framework's adapter files.

---

## 🎨 UI/UX Pro Max & Governance Standards

### 1. The Anti-AI Aesthetic Protocol

- **Strictly Banned**: Saturated neon cyan/green accents (`cyan-*`, `teal-*`, `#00ff9d`), dark-teal sci-fi backgrounds, purple/indigo gradients, floating blur orbs, and emoji spam in headers.
- **Light + Dark Themes (Mandatory)**: Every project ships both themes. Components use semantic tokens (`bg-background`, `bg-surface`, `text-foreground`, `border-border`) defined in `tokens.css`.
- **The 60-30-10 Palette**: 60% pure neutral surfaces (white / zinc-50 on light, `zinc-950` / `zinc-900` on dark), 30% crisp typography hierarchy, and 10% functional accent for actions.
- **Soft-Tint Badges**: Translucent 10% backgrounds (`bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20`), never eye-straining radioactive pills.

### 2. Zero-Spanglish Rule

If the project is in Spanish, 100% of UI text, headers, and statuses must be in natural Spanish:
- `Close` ➔ `Cerrar`
- `Save` ➔ `Guardar`
- `Status` ➔ `Estado`
- `Amount` ➔ `Monto`
- `Flagged` ➔ `Observado`
- `Settled` ➔ `Completado`
- `Pending` ➔ `Pendiente`
- `Reversed` ➔ `Revertido`

### 3. Localized Data Formatters

- **Country Preset**: República Dominicana by default (`es-DO`, `DOP`, `(809) 578-1234`); switch with `setFormatCountry('CO')`.
- **Currency**: `formatCurrency(17870000)` ➔ `"RD$17,870,000.00"` (es-DO) or `"$ 17.870.000,00"` (es-CO).
- **Numbers & Percentages**: `formatNumber(1234567.891)` ➔ `"1,234,567.89"` (es-DO) / `"1.234.567,89"` (es-CO); `formatPercent(0.125)` ➔ `"12.5%"`.
- **Dates**: `formatDate(date, 'medium')` ➔ `"11 sept 2026, 07:51"` or `formatRelativeTime(date)` ➔ `"hace 5 minutos"`.
- **Phone Numbers**: `formatPhoneNumber('8095781234', 'DO')` ➔ `"(809) 578-1234"`; with `'international'` ➔ `"+1 (809) 578-1234"`.
- **Null Fallbacks**: Always render an em-dash `—` for empty data, never `"null"` or `"undefined"`.

### 4. Mandatory Pagination & Zero Over-Fetching

- **Banned**: Loading unpaginated collections (`SELECT *` or unrestricted `GET /items`).
- **Required**: Pass server pagination parameters (`page`, `pageSize` or cursor `first`, `after`).
- **GraphQL Field Selection**: Only query fields rendered in the template using fragment colocation.
- **Smooth Page Transitions**: Use `placeholderData: (prev) => prev` to prevent layout flashing during page changes.

---

## ⚡ Native Slash Commands

Once `devforge init` is run in your repository, you can use native `/` commands across different AI tools:

- **`/kickoff`**: Starts the discovery interview (developer experience calibration, stack advisory, country localization, and MVP scoping).
- **`/devforge`**: Opens the architectural blueprint and UI/UX standard assistant.

---

## 📄 License

MIT © DEVFORGE Team. Built for elite developers.
