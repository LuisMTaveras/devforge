# ⚡ DEVFORGE CLAUDE INSTRUCTIONS (Claude Code & Anthropic AI)

This repository is powered by **DEVFORGE**. You are expected to operate as a Principal Architect / Senior Software Engineer.

## 🚨 MANDATORY PRE-FLIGHT CHECKLIST (VERIFY BEFORE GENERATING CODE)

1. **[ ] ZERO HARDCODED DATA**:
   - Banned: `const items = [ ... ]`, `const records = [ ... ]` inside components.
   - All data must flow via typed props, service calls (`services/`), or composables/hooks.
2. **[ ] MANDATORY PAGINATION & ZERO OVER-FETCHING**:
   - Banned: Unpaginated list calls. Always pass `page` + `pageSize` (or `first` + `after`).
   - Banned: Querying unused fields. In GraphQL use fragment colocation; in REST use sparse fieldsets (`?fields=...`).
3. **[ ] AUTOMATIC LOCALIZED FORMATTING**:
   - Banned: Raw currency numbers (`17870000` or `"$ " + amount`), raw numbers (`1234567.891`, `toFixed()`), raw ISO dates (`2026-10-05T...`), or raw phone numbers (`8095781234`).
   - Required: Use `formatCurrency()`, `formatNumber()`, `formatPercent()`, `formatDate()`, `formatRelativeTime()`, and `formatPhoneNumber()` from `@/core/formatters/formatters`.
   - Country format: thousands/decimal separators and phone masks follow the project country (`setFormatCountry('DO')` -> `1,234,567.89`, `RD$1,500.00`, `(809) 578-1234`).
   - Null fallback: Always render `—` for null/undefined/empty data points.
4. **[ ] ZERO SPANGLISH / 100% SPANISH**:
   - If the project is in Spanish, 0% English allowed in UI text, table columns, badges, buttons:
     - `Close` ➔ `Cerrar`, `Save` ➔ `Guardar`, `Status` ➔ `Estado`, `Amount` ➔ `Monto`
     - `Flagged` ➔ `Observado`, `Settled` ➔ `Completado`, `Pending` ➔ `Pendiente`
5. **[ ] ZERO CYBERPUNK / ZERO NEON GAMER**:
   - Banned Tailwind classes: `cyan-*`, `teal-*`, `neon-*`, glowing borders, radioactive greens (`#00ff9d`), or deep cyan backgrounds.
   - Required palette: Neutral zinc in both themes via semantic tokens (`bg-background`, `bg-surface`, `text-foreground`, `text-muted-foreground`, `border-border`) and soft-tint badges (`bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20`).
6. **[ ] VUE 3 / REACT LOGIC SAFETY**:
   - Null safety: Use optional chaining `record?.cliente?.nombre` everywhere.
   - No direct prop mutations: Always emit events `emit('close')` or `emit('update:modelValue', val)`.
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

## Order of Truth (When Sources Disagree)

1. The user's explicit instruction in the current conversation.
2. The code actually installed in the project (`src/`, `package.json`).
3. `.ai/standards/module-api.md` (exact API of DEVFORGE modules).
4. `.ai/standards/*.md` (rules).
5. `.ai/blueprints/*.md` (reference patterns, adapt them — never paste blindly).

## Primary Principles

- **Zero Hardcoded Data & Strict Pagination**: Follow `.ai/blueprints/07-graphql-pagination.md`. Never load full datasets into memory.
- **Developer Calibration & Stack Advisory**: Execute `.ai/standards/project-kickoff.md` (Junior/Intermediate/Senior calibration).
- **Anti-AI Design Excellence**: Follow `.ai/standards/ui-ux-principles.md` (Linear/Stripe aesthetic).
- **Light + Dark Themes**: Follow `.ai/standards/theming.md`. Every screen must work in both themes.
- **Localized Formatting**: Follow `.ai/standards/data-formatting.md` (currency, numbers, dates, phones per country). Default country: República Dominicana.
- **Module API**: `.ai/standards/module-api.md` is the exact list of DEVFORGE functions. Nothing else exists.
- **Strict Adherence to Blueprints**: Check `.ai/blueprints/` before coding.

## Common Commands

> Run a script only if it exists in the project's `package.json`. If it does not, tell the user instead of inventing an alternative.

- Build: `npm run build`
- Dev server: `npm run dev`
- Tests: `npm run test` or `npx vitest run`
- Typecheck: `npx tsc --noEmit`
- Lint: `npm run lint`
- Audit: `devforge audit` (globally linked CLI; never `npx devforge`)
